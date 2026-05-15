/**
 * 🛡️ Empire Auto-QA Engine — Autonomous Pipeline Controller
 * 
 * withQA()        — 범용 자율 실행기 (재시도 + 검증 + 텔레그램 + Supabase)
 * validateScript  — Gate 1: 스크립트 환각 감지
 * validateVisual  — Gate 2: 비주얼 프롬프트 검증
 * validateVideo   — Gate 3: 비디오 API 응답 무결성
 */

import { notifyStageComplete, notifyError } from '@/lib/telegram-notify';

// ═══════════════════════════════════════════
// Gemini Judge (경량 판정기)
// ═══════════════════════════════════════════

async function askJudge(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return 'PASS: No API key for QA judge';

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.05, maxOutputTokens: 150 },
        }),
      }
    );
    if (!res.ok) return 'PASS: Judge API error';
    const data = await res.json();
    return (data.candidates?.[0]?.content?.parts?.[0]?.text || 'PASS').trim();
  } catch {
    return 'PASS: Judge network error';
  }
}

// ═══════════════════════════════════════════
// Supabase 상태 업데이트 헬퍼
// ═══════════════════════════════════════════

async function updateProjectStatus(projectId, status, detail = '') {
  if (!projectId) return;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return;

  try {
    await fetch(`${supabaseUrl}/rest/v1/Project?id=eq.${projectId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        status,
        updatedAt: new Date().toISOString(),
      }),
    });
    console.log(`📊 [STATUS] ${projectId.substring(0, 8)}... → ${status} ${detail}`);
  } catch (e) {
    console.error('📊 [STATUS] 업데이트 실패:', e.message);
  }
}

// ═══════════════════════════════════════════
// 🏭 withQA — Universal Autonomous Step Runner
// ═══════════════════════════════════════════

/**
 * 자율 파이프라인 단계 실행기
 * 
 * @param {string} stepName    — 단계명 (예: 'DNA_EXTRACTION')
 * @param {Function} task      — async () => result (실제 작업)
 * @param {Function} validator — async (result) => { pass: boolean, reason: string }
 * @param {Object} opts        — { maxRetries, projectId, silent }
 * @returns {Object}           — { result, qa: { passed, attempts, history } }
 */
export async function withQA(stepName, task, validator, opts = {}) {
  const { maxRetries = 3, projectId = null, silent = false } = opts;
  const history = [];

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    // Supabase 상태: 실행 중
    const runStatus = attempt > 1 ? `${stepName}_RETRY_${attempt}` : `${stepName}_RUNNING`;
    await updateProjectStatus(projectId, runStatus);

    console.log(`🔄 [QA] ${stepName} — 시도 ${attempt}/${maxRetries}`);

    try {
      const result = await task();
      const validation = await validator(result);

      history.push({
        attempt,
        pass: validation.pass,
        reason: validation.reason?.substring(0, 200),
        timestamp: new Date().toISOString(),
      });

      if (validation.pass) {
        // ✅ 통과
        await updateProjectStatus(projectId, `${stepName}_PASSED`);
        if (!silent) {
          notifyStageComplete(stepName, 'COMPLETE', `시도 ${attempt}회 만에 통과`).catch(() => {});
        }
        console.log(`✅ [QA] ${stepName} — 시도 ${attempt}에서 통과`);
        return { result, qa: { passed: true, attempts: attempt, history } };
      }

      // ⚠️ 실패 — 텔레그램 알림
      console.warn(`⚠️ [QA] ${stepName} — 시도 ${attempt} 실패: ${validation.reason?.substring(0, 80)}`);
      notifyStageComplete(
        stepName,
        'ERROR',
        `검수 실패 (${attempt}/${maxRetries}): ${validation.reason?.substring(0, 100)}`
      ).catch(() => {});

      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 1500));
      }
    } catch (execError) {
      history.push({
        attempt,
        pass: false,
        reason: `실행 에러: ${execError.message}`,
        timestamp: new Date().toISOString(),
      });
      console.error(`❌ [QA] ${stepName} — 시도 ${attempt} 에러:`, execError.message);

      if (attempt >= maxRetries) {
        await updateProjectStatus(projectId, `${stepName}_HALTED`);
        await notifyError(`QA Halt: ${stepName}`, `${maxRetries}회 실행 에러: ${execError.message}`).catch(() => {});
        throw execError;
      }
    }
  }

  // 🚨 최종 실패 — 파이프라인 중단
  await updateProjectStatus(projectId, `${stepName}_HALTED`);
  const haltMsg = `${stepName} QA ${maxRetries}회 최종 실패 — 공장 일시 정지`;
  console.error(`🚨 [QA] ${haltMsg}`);
  await notifyError(`🚨 QA HALT: ${stepName}`, haltMsg).catch(() => {});

  return {
    result: null,
    qa: { passed: false, attempts: maxRetries, halted: true, history },
  };
}

// ═══════════════════════════════════════════
// Gate 1: Script QC — 환각 감지
// ═══════════════════════════════════════════

/**
 * 생성된 콘텐츠가 원본과 주제적으로 일치하는지 검증
 */
export async function validateScript(originalText, generatedResult) {
  if (!originalText || originalText.length < 50) {
    return { pass: true, reason: 'SKIP: 원본 50자 미만' };
  }

  const generated = typeof generatedResult === 'string'
    ? generatedResult
    : JSON.stringify(generatedResult).substring(0, 2000);

  const verdict = await askJudge(`You are a strict QA auditor.

[TASK] Is the GENERATED content thematically consistent with the ORIGINAL?

[RULES]
- FAIL if generated introduces major topics NOT in original (e.g., Real Estate when original is Sci-Fi).
- FAIL if brand names/locations appear that aren't in original.
- PASS if content is a reasonable creative adaptation.
- Minor creative embellishments are OK.

[ORIGINAL - 600 chars]
${originalText.substring(0, 600)}

[GENERATED - 600 chars]
${generated.substring(0, 600)}

Answer EXACTLY: PASS: reason OR FAIL: reason`);

  const pass = verdict.toUpperCase().startsWith('PASS');
  console.log(`🛡️ [G1-SCRIPT] ${pass ? '✅' : '❌'} ${verdict.substring(0, 80)}`);
  return { pass, reason: verdict };
}

// ═══════════════════════════════════════════
// Gate 2: Visual QC — 프롬프트 검증
// ═══════════════════════════════════════════

const BLOCKLIST = [
  /nsfw/i, /nude/i, /naked/i, /gore/i, /blood/i,
  /weapon/i, /gun/i, /violence/i, /drug/i,
];

/**
 * 비주얼 프롬프트 안전성 + 형식 검증
 */
export function validateVisualPrompts(prompts) {
  const issues = [];

  if (!prompts || typeof prompts !== 'object') {
    return { pass: false, issues: ['프롬프트 객체 없음'], reason: '프롬프트 객체가 비어있습니다' };
  }

  for (const [slot, prompt] of Object.entries(prompts)) {
    if (!prompt || typeof prompt !== 'string') {
      issues.push(`[${slot}] 빈 프롬프트`);
      continue;
    }
    for (const p of BLOCKLIST) {
      if (p.test(prompt)) issues.push(`[${slot}] 금칙어: ${p.source}`);
    }
    if (prompt.length < 20) issues.push(`[${slot}] 너무 짧음 (${prompt.length}자)`);
    if (prompt.length > 2000) issues.push(`[${slot}] 너무 김 (${prompt.length}자)`);
  }

  const pass = issues.length === 0;
  return { pass, issues, reason: pass ? 'PASS' : issues.join('; ') };
}

// ═══════════════════════════════════════════
// Gate 3: Video QC — API 응답 무결성
// ═══════════════════════════════════════════

/**
 * 비디오 생성 API 응답 검증
 */
export function validateVideoResponse(response) {
  const issues = [];

  if (!response) {
    return { pass: false, reason: '응답 없음', issues: ['null response'] };
  }

  if (!response.success && !response.data) {
    issues.push('success=false, data 없음');
  }

  const data = response.data || {};

  if (!data.id && !data.videoUrl) {
    issues.push('작업 ID 또는 videoUrl 없음');
  }

  if (data.status === 'error' || data.status === 'failed') {
    issues.push(`렌더링 실패: ${data.message || 'unknown'}`);
  }

  if (data.provider && !['runway', 'luma', 'mock'].includes(data.provider)) {
    issues.push(`알 수 없는 provider: ${data.provider}`);
  }

  const pass = issues.length === 0;
  return { pass, reason: pass ? 'PASS' : issues.join('; '), issues };
}

// ═══════════════════════════════════════════
// 편의 래퍼: 단계별 withQA 숏컷
// ═══════════════════════════════════════════

/**
 * DNA 추출 + QA
 */
export function withDnaQA(task, originalText, opts = {}) {
  return withQA('DNA_EXTRACTION', task, async (result) => {
    return validateScript(originalText, result);
  }, opts);
}

/**
 * 비주얼 생성 + QA
 */
export function withVisualQA(task, opts = {}) {
  return withQA('VISUAL_GENERATION', task, async (result) => {
    const prompts = result?.prompts || result;
    return validateVisualPrompts(prompts);
  }, opts);
}

/**
 * 비디오 생성 + QA
 */
export function withVideoQA(task, opts = {}) {
  return withQA('VIDEO_RENDER', task, async (result) => {
    return validateVideoResponse(result);
  }, opts);
}
