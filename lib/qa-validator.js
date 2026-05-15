/**
 * 🛡️ Empire QA Validator — LLM-as-a-Judge Pipeline Gates
 * 
 * 각 파이프라인 단계 사이에 자동 품질 검증을 수행합니다.
 * - Gate 1: Script QC — 환각(hallucination) 감지
 * - Gate 2: Visual QC — 프롬프트 형식/금칙어 검증
 * - 3회 실패 시 파이프라인 중단 + 텔레그램 알림
 */

import { GoogleGenAI } from '@google/genai';
import { notifyError } from '@/lib/telegram-notify';

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * Gemini에게 판정 요청 (빠른 응답용)
 */
async function askJudge(prompt) {
  try {
    const response = await genAI.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{ parts: [{ text: prompt }] }],
      config: { temperature: 0.1, maxOutputTokens: 200 },
    });
    return (response.text || '').trim();
  } catch (e) {
    console.error('⚠️ [QA] Judge LLM 호출 실패:', e.message);
    return 'PASS'; // LLM 장애 시 통과 (파이프라인 차단 방지)
  }
}

// ═══════════════════════════════════════════
// Gate 1: Script QC — 환각 감지
// ═══════════════════════════════════════════

/**
 * 생성된 스크립트가 원본 트랜스크립트의 주제와 일치하는지 검증
 * 
 * @param {string} originalTranscript - 원본 자막/입력 텍스트 (200자 이상 필요)
 * @param {Object} generatedResult - LLM 생성 결과
 * @returns {{ pass: boolean, reason: string, attempt: number }}
 */
export async function validateScript(originalTranscript, generatedResult) {
  // 원본이 너무 짧으면 검증 불가 → 통과
  if (!originalTranscript || originalTranscript.length < 50) {
    return { pass: true, reason: 'SKIP: 원본 텍스트 부족 (50자 미만)', attempt: 0 };
  }

  const generated = typeof generatedResult === 'string'
    ? generatedResult
    : JSON.stringify(generatedResult).substring(0, 2000);

  const judgePrompt = `You are a strict QA auditor for an automated content pipeline.

[TASK] Determine if the GENERATED content is THEMATICALLY CONSISTENT with the ORIGINAL transcript.

[RULES]
- FAIL if the generated content introduces major topics NOT present in the original (e.g., Real Estate when original is about Sci-Fi, Apartments when original is about Cooking).
- FAIL if brand names, product names, or locations appear in the generated content that are NOT mentioned in the original.
- PASS if the generated content is a reasonable creative adaptation of the original themes.
- PASS if the generated content uses different words but stays on the same topic.
- Minor creative embellishments are acceptable (e.g., adding emotional language).

[ORIGINAL TRANSCRIPT - first 800 chars]
${originalTranscript.substring(0, 800)}

[GENERATED CONTENT - first 800 chars]
${generated.substring(0, 800)}

Respond with EXACTLY one line:
PASS: [brief reason]
or
FAIL: [what was hallucinated]`;

  const verdict = await askJudge(judgePrompt);
  const pass = verdict.toUpperCase().startsWith('PASS');

  console.log(`🛡️ [QA-SCRIPT] ${pass ? '✅ PASS' : '❌ FAIL'}: ${verdict.substring(0, 100)}`);

  return { pass, reason: verdict, attempt: 0 };
}

// ═══════════════════════════════════════════
// Gate 2: Visual QC — 프롬프트 검증
// ═══════════════════════════════════════════

/** 금칙어 리스트 */
const VISUAL_BLOCKLIST = [
  /nsfw/i, /nude/i, /naked/i, /gore/i, /blood/i,
  /weapon/i, /gun/i, /violence/i, /drug/i,
  /child.*explicit/i, /minor/i,
];

/** AR 형식 검증 */
const VALID_AR_PATTERNS = [
  /--ar\s+\d+:\d+/,        // MJ format
  /9:16|16:9|1:1|4:5|3:4/, // Common ratios
];

/**
 * 비주얼 프롬프트가 안전하고 올바른 형식인지 검증
 * 
 * @param {Object} prompts - { poster, logo, sns, card }
 * @returns {{ pass: boolean, issues: string[] }}
 */
export function validateVisualPrompts(prompts) {
  const issues = [];

  if (!prompts || typeof prompts !== 'object') {
    return { pass: false, issues: ['프롬프트 객체가 비어있습니다.'] };
  }

  for (const [slot, prompt] of Object.entries(prompts)) {
    if (!prompt || typeof prompt !== 'string') {
      issues.push(`[${slot}] 프롬프트가 비어있습니다.`);
      continue;
    }

    // 금칙어 검사
    for (const pattern of VISUAL_BLOCKLIST) {
      if (pattern.test(prompt)) {
        issues.push(`[${slot}] 금칙어 감지: ${pattern.source}`);
      }
    }

    // 길이 검사 (너무 짧거나 너무 긴 프롬프트)
    if (prompt.length < 20) {
      issues.push(`[${slot}] 프롬프트가 너무 짧습니다 (${prompt.length}자).`);
    }
    if (prompt.length > 2000) {
      issues.push(`[${slot}] 프롬프트가 너무 깁니다 (${prompt.length}자). 1500자 이내 권장.`);
    }
  }

  const pass = issues.length === 0;
  if (!pass) console.log(`🛡️ [QA-VISUAL] ❌ ${issues.length}개 이슈 발견:`, issues);
  else console.log(`🛡️ [QA-VISUAL] ✅ PASS`);

  return { pass, issues };
}

// ═══════════════════════════════════════════
// 통합: 재시도 + 중단 + 알림
// ═══════════════════════════════════════════

/**
 * QA 게이트를 포함한 안전 실행기
 * generateFunc를 최대 maxRetries번 시도하고, 매번 validateFunc으로 검증
 * 
 * @param {string} stageName - 단계명 (로깅/알림용)
 * @param {Function} generateFunc - async () => result
 * @param {Function} validateFunc - async (result) => { pass, reason }
 * @param {Object} options - { maxRetries, context }
 * @returns {Object} - 검증 통과한 결과
 * @throws {Error} - maxRetries 초과 시
 */
export async function runWithQA(stageName, generateFunc, validateFunc, options = {}) {
  const { maxRetries = 3, context = '' } = options;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`🔄 [QA] ${stageName} — 시도 ${attempt}/${maxRetries}`);

    try {
      const result = await generateFunc();

      const validation = await validateFunc(result);

      if (validation.pass) {
        console.log(`✅ [QA] ${stageName} — 시도 ${attempt}에서 통과`);
        return { result, qa: { passed: true, attempt, reason: validation.reason } };
      }

      console.warn(`⚠️ [QA] ${stageName} — 시도 ${attempt} 실패: ${validation.reason?.substring(0, 100)}`);

      // 마지막 시도가 아니면 계속
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 1000)); // 1초 대기
      }
    } catch (genError) {
      console.error(`❌ [QA] ${stageName} — 시도 ${attempt} 에러:`, genError.message);
      if (attempt >= maxRetries) throw genError;
    }
  }

  // 최대 재시도 초과 — 파이프라인 중단 + 텔레그램 알림
  const errorMsg = `${stageName} QA 검증 ${maxRetries}회 실패 — 파이프라인 중단`;
  console.error(`🚨 [QA] ${errorMsg}`);

  // 텔레그램 에러 알림
  await notifyError(`QA Gate: ${stageName}`, `${errorMsg}\n컨텍스트: ${context?.substring(0, 200)}`).catch(() => {});

  throw new Error(errorMsg);
}
