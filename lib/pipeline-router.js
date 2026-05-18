/**
 * 🔀 Empire Pipeline Router — Hybrid Mode Controller
 * 
 * 파이프라인 흐름 제어기:
 * - AUTO: Step 완료 즉시 다음 Step 자동 실행 (무정지)
 * - SEMI_AUTO: Step 완료 후 일시정지, 사용자 검토 대기
 * 
 * 데이터 일관성: 모드와 무관하게 동일한 DB 스키마로 저장
 */

/**
 * 파이프라인 단계 정의
 */
export const PIPELINE_STEPS = {
  STEP_0_INIT: { id: 'STEP_0_INIT', label: '프로젝트 생성', icon: '📦', dbStatus: 'ANALYZING' },
  STEP_1_DNA: { id: 'STEP_1_DNA', label: 'DNA 추출 (대본 분석)', icon: '🧬', dbStatus: 'GEN_SCRIPT' },
  STEP_2_VISUAL: { id: 'STEP_2_VISUAL', label: '비주얼 프롬프트 생성', icon: '🎨', dbStatus: 'GEN_VISUALS' },
  STEP_3_RENDER: { id: 'STEP_3_RENDER', label: '렌더링 (영상/음성)', icon: '🎬', dbStatus: 'RENDERING' },
  COMPLETE: { id: 'COMPLETE', label: '파이프라인 완료', icon: '✅', dbStatus: 'COMPLETE' },
};

/**
 * 다음 단계 반환
 */
export function getNextStep(currentStepId) {
  const order = ['STEP_0_INIT', 'STEP_1_DNA', 'STEP_2_VISUAL', 'STEP_3_RENDER', 'COMPLETE'];
  const idx = order.indexOf(currentStepId);
  if (idx < 0 || idx >= order.length - 1) return null;
  return PIPELINE_STEPS[order[idx + 1]];
}

/**
 * 단계 완료 시 라우팅 결정
 * @param {string} currentStepId - 방금 완료된 단계
 * @param {boolean} isAutoMode - true=전자동, false=반자동
 * @returns {{ action: 'PROCEED'|'PAUSE', nextStep: object|null }}
 */
export function routeAfterStep(currentStepId, isAutoMode) {
  const nextStep = getNextStep(currentStepId);
  
  if (!nextStep) {
    return { action: 'COMPLETE', nextStep: null };
  }

  if (isAutoMode) {
    console.log(`⚡ [AUTO-PILOT] ${currentStepId} 완료 → ${nextStep.id} 자동 진행`);
    return { action: 'PROCEED', nextStep };
  } else {
    console.log(`✍️ [SEMI-AUTO] ${currentStepId} 완료 → 일시정지. 사용자 검토 대기.`);
    return { action: 'PAUSE', nextStep };
  }
}

/**
 * DB 저장용 파이프라인 상태 생성 (모드 무관하게 동일 포맷)
 */
export function buildPipelinePayload(stepId, stepData, projectPayload = {}) {
  const step = PIPELINE_STEPS[stepId];
  return {
    status: step?.dbStatus || 'ANALYZING',
    payload: {
      ...projectPayload,
      pipeline: {
        ...(projectPayload.pipeline || {}),
        currentStep: stepId,
        lastCompletedStep: stepId,
        updatedAt: new Date().toISOString(),
        steps: {
          ...(projectPayload.pipeline?.steps || {}),
          [stepId]: {
            completedAt: new Date().toISOString(),
            data: stepData,
          },
        },
      },
    },
  };
}

/**
 * Wizard 상태 초기값
 */
export const INITIAL_WIZARD_STATE = {
  active: false,           // 위저드 패널 표시 여부
  currentStep: null,       // 현재 정지된 단계
  nextStep: null,          // 다음 실행할 단계
  status: 'IDLE',          // 'IDLE' | 'WAITING_FOR_USER' | 'PROCESSING'
  editableData: null,      // 사용자가 수정할 수 있는 데이터
  stepHistory: [],         // 완료된 단계 이력
};
