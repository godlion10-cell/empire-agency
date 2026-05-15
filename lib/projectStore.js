/**
 * Project Store — 프로젝트 상태 관리 + 영구 저장
 * 
 * MVP: localStorage 기반 (클라이언트 전용)
 * 향후: Supabase/Prisma로 교체 시 이 파일만 수정
 * 
 * Pipeline Stages:
 *   IDLE → GEN_SCRIPT → REVIEW_SCRIPT → GEN_VISUALS → REVIEW_VISUALS → COMPLETE
 */

const STORE_KEY = 'empire_projects';

// ── Pipeline Stage 정의 ──
export const STAGES = {
  IDLE: { key: 'IDLE', idx: 0, label: '대기', icon: '⏸️', color: 'gray' },
  GEN_SCRIPT: { key: 'GEN_SCRIPT', idx: 1, label: '대본 생성 중', icon: '🧠', color: 'blue' },
  REVIEW_SCRIPT: { key: 'REVIEW_SCRIPT', idx: 2, label: '대본 검토', icon: '✏️', color: 'yellow' },
  GEN_VISUALS: { key: 'GEN_VISUALS', idx: 3, label: '비주얼 생성 중', icon: '🎨', color: 'purple' },
  REVIEW_VISUALS: { key: 'REVIEW_VISUALS', idx: 4, label: '비주얼 검토', icon: '👁️', color: 'amber' },
  COMPLETE: { key: 'COMPLETE', idx: 5, label: '완료', icon: '✅', color: 'green' },
};

export const STAGE_ORDER = ['IDLE', 'GEN_SCRIPT', 'REVIEW_SCRIPT', 'GEN_VISUALS', 'REVIEW_VISUALS', 'COMPLETE'];

// ── 빈 프로젝트 템플릿 ──
export function createEmptyProject(name = '새 프로젝트') {
  return {
    id: crypto.randomUUID(),
    name,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    pipelineStatus: 'IDLE',
    isAuto: false,          // 기본: 단계별 개입 모드
    autoStages: {           // 단계별 Auto-Proceed 개별 토글
      GEN_SCRIPT: false,
      REVIEW_SCRIPT: false,
      GEN_VISUALS: false,
      REVIEW_VISUALS: false,
    },
    // ── 입력 ──
    input: {
      type: 'URL',          // URL | FILE | KEYWORD
      url: '',
      keyword: '',
      region: 'US',
      videoTitle: '',
      channelName: '',
    },
    // ── 단계별 데이터 ──
    stageData: {
      script: {
        raw: null,          // API 응답 원본
        edited: null,       // 사용자 수정 버전
        committed: false,   // 확정 여부
      },
      visuals: {
        prompt: '',         // Gemini가 생성한 기본 프롬프트
        editedPrompt: '',   // 사용자 수정 프롬프트
        imageUrl: '',       // 생성된 이미지 URL
        generationId: '',
        committed: false,
      },
    },
    // ── 히스토리 ──
    history: [],            // { stage, timestamp, action, snapshot }
  };
}

// ── CRUD 함수 ──
function getAll() {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
  } catch { return []; }
}

function saveAll(projects) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORE_KEY, JSON.stringify(projects));
}

export function listProjects() {
  return getAll().sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

export function getProject(id) {
  return getAll().find(p => p.id === id) || null;
}

export function createProject(name) {
  const project = createEmptyProject(name);
  const all = getAll();
  all.push(project);
  saveAll(all);
  return project;
}

export function updateProject(id, updates) {
  const all = getAll();
  const idx = all.findIndex(p => p.id === id);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], ...updates, updatedAt: new Date().toISOString() };
  saveAll(all);
  return all[idx];
}

export function deleteProject(id) {
  const all = getAll().filter(p => p.id !== id);
  saveAll(all);
}

// ── 히스토리 기록 ──
export function addHistory(id, stage, action, snapshot = null) {
  const all = getAll();
  const idx = all.findIndex(p => p.id === id);
  if (idx === -1) return;
  all[idx].history.push({
    stage,
    action,
    timestamp: new Date().toISOString(),
    snapshot: snapshot ? JSON.stringify(snapshot).substring(0, 500) : null,
  });
  // 최대 50개 히스토리 유지
  if (all[idx].history.length > 50) {
    all[idx].history = all[idx].history.slice(-50);
  }
  saveAll(all);
}
