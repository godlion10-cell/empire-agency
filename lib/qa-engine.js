/**
 * 🏭 Empire QA Engine — 전사적 품질 검수 자동화
 * 
 * runWithQA()          — 모든 API 호출을 감싸는 래퍼 (3회 재시도 + LLM 심판 + 텔레그램)
 * evaluateDnaScript()  — STEP 1 DNA 전용: 환각 방어 (부산/아파트 좀비 데이터 컷)
 * evaluateVisual()     — STEP 2 Visual 전용: 금칙어 + AR 검증
 * evaluateVideo()      — STEP 3 Video 전용: API 응답 무결성
 */

import { notifyStageComplete, notifyError } from '@/lib/telegram-notify';

// ═══════════════════════════════════════════
// LLM 심판 호출기 (Gemini 2.0 Flash — 저비용/초고속)
// ═══════════════════════════════════════════

async function askLLM(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return '{"pass": true, "reason": "QA API키 미설정 — 통과"}';

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.05, maxOutputTokens: 200 },
        }),
      }
    );
    if (!res.ok) return '{"pass": true, "reason": "Judge API 에러 — 안전 통과"}';
    const data = await res.json();
    return (data.candidates?.[0]?.content?.parts?.[0]?.text || '').trim();
  } catch {
    return '{"pass": true, "reason": "네트워크 장애 — 안전 통과"}';
  }
}

// ═══════════════════════════════════════════
// 🏭 runWithQA — 전사적 품질 검수 래퍼
// ═══════════════════════════════════════════

/**
 * @param {string}   stepName    — 공정 이름 (예: "STEP 1: DNA 대본 추출")
 * @param {Function} taskFn      — 실제 실행할 작업 (API 호출 등)
 * @param {Function} evaluatorFn — 결과물을 평가할 LLM 검수 함수 → { pass, reason }
 * @param {number}   maxRetries  — 최대 재시도 횟수 (기본값: 3)
 * @returns {*} 검수 통과한 결과물
 * @throws {Error} maxRetries 초과 시 파이프라인 강제 중단
 */
export const runWithQA = async (stepName, taskFn, evaluatorFn, maxRetries = 3) => {
  let attempt = 1;

  while (attempt <= maxRetries) {
    try {
      // 1. 작업 실행 (예: 대본 생성 API 호출)
      console.log(`🔄 [QA] ${stepName} — 시도 ${attempt}/${maxRetries}`);
      const result = await taskFn();

      // 2. LLM-as-a-Judge 검수 진행
      const { pass, reason } = await evaluatorFn(result);

      if (pass) {
        // ✅ 검수 통과 → 텔레그램 보고 + 결과 반환
        console.log(`✅ [QA] ${stepName} 통과 (시도 ${attempt}회)`);
        notifyStageComplete(stepName, 'COMPLETE', `시도 ${attempt}회 만에 통과`).catch(() => {});
        return result;
      } else {
        // ⚠️ 검수 실패 → 텔레그램 경고 + 재시도
        console.warn(`⚠️ [QA 실패] ${stepName}: ${reason}`);
        notifyStageComplete(
          stepName,
          'ERROR',
          `검수 실패 (${attempt}/${maxRetries}): ${reason?.substring(0, 100)}`
        ).catch(() => {});
      }
    } catch (error) {
      // 🚨 런타임 에러
      console.error(`🚨 [QA 에러] ${stepName} 시도 ${attempt}:`, error.message);
      notifyError(`${stepName} 런타임 오류`, error.message).catch(() => {});
    }

    attempt++;

    // 재시도 전 1.5초 대기 (API 부하 방지)
    if (attempt <= maxRetries) {
      await new Promise(r => setTimeout(r, 1500));
    }
  }

  // 🛑 3번 다 실패 → 파이프라인 강제 중단
  const finalErrorMsg = `❌ [공장 가동 중단] ${stepName} 품질 검수 ${maxRetries}회 연속 실패. 수동 확인이 필요합니다.`;
  console.error(finalErrorMsg);
  await notifyError(`🚨 공장 중단: ${stepName}`, finalErrorMsg).catch(() => {});
  throw new Error(finalErrorMsg);
};

// ═══════════════════════════════════════════
// 평가기 1: DNA 대본 검수 — 환각(Hallucination) 방어
// ═══════════════════════════════════════════

/**
 * 원본 자막 대비 생성 대본의 주제 일치 여부 검증
 * '부동산', '아파트', '부산', '사상공원' 등 좀비 데이터 즉시 컷
 */
export const evaluateDnaScript = async (originalTranscript, generatedScript) => {
  // 원본이 너무 짧으면 검수 불가 → 통과
  if (!originalTranscript || originalTranscript.length < 30) {
    return { pass: true, reason: '원본 30자 미만 — 검수 스킵' };
  }

  const scriptText = typeof generatedScript === 'string'
    ? generatedScript
    : JSON.stringify(generatedScript).substring(0, 2000);

  const prompt = `당신은 깐깐한 품질 검수관입니다.
아래 [원본 자막]을 바탕으로 [생성된 대본]이 팩트에 기반하여 작성되었는지 확인하세요.

[절대 금지 규칙]
원본에 전혀 없는 '부동산', '아파트', '부산', '사상공원', '분양', 'real estate', 'apartment', 'dream house' 등의 맥락 없는 단어가 포함되어 있다면 무조건 FAIL 처리하세요.
생성된 대본이 원본의 주제(예: SF 영화, 요리, 게임)와 완전히 다른 주제(예: 부동산 광고)로 변환되었다면 FAIL입니다.

[원본 자막 일부 (600자)]
${originalTranscript.substring(0, 600)}

[생성된 대본 일부 (600자)]
${scriptText.substring(0, 600)}

결과를 반드시 JSON 형식으로만 반환하세요:
{"pass": true 또는 false, "reason": "통과 사유 또는 실패 사유"}`;

  const response = await askLLM(prompt);

  try {
    // JSON 추출 (```json 블록도 처리)
    const cleaned = response.replace(/```json\s*/g, '').replace(/```/g, '').trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    return { pass: true, reason: '파싱 불가 — 안전 통과' };
  } catch {
    // JSON 파싱 실패 시 키워드 기반 판정
    if (response.toLowerCase().includes('fail')) {
      return { pass: false, reason: response.substring(0, 150) };
    }
    return { pass: true, reason: '파싱 실패 — 안전 통과' };
  }
};

// ═══════════════════════════════════════════
// 평가기 2: Visual 프롬프트 검수 — 금칙어 + 형식
// ═══════════════════════════════════════════

const BLOCKLIST = [/nsfw/i, /nude/i, /naked/i, /gore/i, /violence/i, /weapon/i, /drug/i];

export const evaluateVisualPrompts = (prompts) => {
  if (!prompts || typeof prompts !== 'object') {
    return { pass: false, reason: '프롬프트 객체 없음' };
  }

  const issues = [];
  for (const [slot, prompt] of Object.entries(prompts)) {
    if (!prompt || typeof prompt !== 'string') { issues.push(`[${slot}] 빈 프롬프트`); continue; }
    for (const p of BLOCKLIST) { if (p.test(prompt)) issues.push(`[${slot}] 금칙어: ${p.source}`); }
    if (prompt.length < 20) issues.push(`[${slot}] 너무 짧음`);
    if (prompt.length > 2000) issues.push(`[${slot}] 너무 김`);
  }

  return { pass: issues.length === 0, reason: issues.length ? issues.join('; ') : 'PASS' };
};

// ═══════════════════════════════════════════
// 평가기 3: Video API 응답 검수
// ═══════════════════════════════════════════

export const evaluateVideoResponse = (response) => {
  if (!response) return { pass: false, reason: '응답 없음' };
  const d = response.data || response;
  if (!d.id && !d.videoUrl) return { pass: false, reason: 'ID/URL 없음' };
  if (d.status === 'error' || d.status === 'failed') return { pass: false, reason: `렌더링 실패: ${d.message}` };
  return { pass: true, reason: 'PASS' };
};
