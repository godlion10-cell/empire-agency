/**
 * 🪜 Creative Ladder Engine — Recursive Synthesis System
 * 
 * 3개의 원형(Archetype)을 사다리 레벨에 따라 블렌딩하여
 * 단순 조합이 아닌 "합성된 전략"을 생성하는 재귀적 엔진.
 * 
 * Archetype A (장인/Craftsman): 클래식 기법, 수공예적 디테일
 * Archetype B (괴짜/Geek): 디지털, 미래, 기술 중심
 * Archetype C (레거시/Legacy): 심리전, 감성, 초월적 기법
 */

// ============================================================
// 🎭 Archetype → Arsenal ID 매핑 (O(1) 조회용)
// ============================================================
const ARCHETYPE_SLOTS = {
  A_CRAFTSMAN: {
    name: '장인 (Craftsman)',
    emoji: '🔨',
    description: '클래식 미학, 전통 기법, 수공예적 디테일의 마스터',
    // Phase 1-2 중심 + 선별된 Phase 8
    arsenalIds: [
      'A-001', 'A-003', 'A-004', 'A-006', 'A-008', // 벽화, 르네상스, 키아로스쿠로, 구텐베르크, 바로크
      'A-009', 'A-011', 'A-013', 'A-014', 'A-015',  // 우키요에, 아르누보, 록웰, 스위스그리드, 오길비
      'A-019', 'A-020', 'A-074', 'A-079', 'A-072',  // 바우하우스, 미드센추리, 와비사비, 젠, 피보나치
    ],
    synthesisRole: 'You are a master craftsman who values timeless beauty, traditional techniques, and meticulous artisanal detail. Your approach emphasizes heritage, texture, and human touch.',
  },

  B_GEEK: {
    name: '괴짜 (Geek)',
    emoji: '🤖',
    description: '디지털 혁신, 미래 기술, 바이럴 엔지니어링의 천재',
    // Phase 4-7 중심
    arsenalIds: [
      'A-031', 'A-033', 'A-036', 'A-041', 'A-043',  // 애플, 밈, 그로스해킹, 틱톡, 다크모드
      'A-044', 'A-045', 'A-049', 'A-051', 'A-054',  // 글래스모피즘, AI서레얼, 도파민, 공간컴퓨팅, 디지털트윈
      'A-061', 'A-062', 'A-067', 'A-068', 'A-097',  // 홀로그램, 뉴럴인터페이스, 반중력, 나노줌, 초저지연
    ],
    synthesisRole: 'You are a tech visionary who pushes boundaries with cutting-edge digital innovation, viral mechanics, and futuristic aesthetics. Your approach emphasizes disruption, speed, and wow-factor.',
  },

  C_LEGACY: {
    name: '레거시 (Legacy)',
    emoji: '👑',
    description: '심리전, 감성 조작, 브랜드 신화 구축의 대가',
    // Phase 3 + Phase 9-10 중심
    arsenalIds: [
      'A-018', 'A-021', 'A-024', 'A-026', 'A-029',  // 번벅, 워홀, 사치, 나이키, 인포머셜
      'A-081', 'A-082', 'A-083', 'A-084', 'A-088',  // 앵커링, 희소성, 사회적증거, 손실회피, 자이가르닉
      'A-089', 'A-091', 'A-093', 'A-095', 'A-099',  // 미러뉴런, 원테이크, 오케스트라, 역순, 타임캡슐
    ],
    synthesisRole: 'You are a brand mythologist who wields psychological warfare, emotional manipulation, and legacy-building strategies. Your approach emphasizes persuasion, narrative power, and empire-scale thinking.',
  },
};

// ============================================================
// 🪜 Creative Ladder 레벨 정의
// ============================================================
const CREATIVE_LADDER = [
  {
    level: 1,
    name: 'Pure Roots',
    nameKo: '순수 뿌리',
    description: '단일 원형의 순수한 힘. 하나의 철학에 집중.',
    emoji: '🌱',
    maxModules: 1,
    synthesisWeight: 0.3,
    priceMultiplier: 1.0,
    synthesisPrompt: 'Apply a single focused creative philosophy. Stay pure to the archetype.',
  },
  {
    level: 2,
    name: 'Hybrid Fusion',
    nameKo: '하이브리드 융합',
    description: '두 원형의 충돌과 융합. 예상치 못한 시너지.',
    emoji: '⚡',
    maxModules: 2,
    synthesisWeight: 0.6,
    priceMultiplier: 2.5,
    synthesisPrompt: 'Fuse two contrasting creative philosophies into unexpected synergy. Find the tension point between them and exploit it for maximum creative impact.',
  },
  {
    level: 3,
    name: 'Empire Synthesis',
    nameKo: '제국 합성',
    description: '세 원형의 완전한 합성. 100억 가치의 마스터피스.',
    emoji: '🏛️',
    maxModules: 3,
    synthesisWeight: 1.0,
    priceMultiplier: 5.0,
    synthesisPrompt: 'Execute TOTAL SYNTHESIS: merge craftsman aesthetics, geek innovation, and legacy psychology into a single transcendent creative strategy. This is the pinnacle — every element must feel inevitable, as if no other combination could exist.',
  },
];

// ============================================================
// 🧬 Weighted Blending Logic — 핵심 합성 엔진
// ============================================================

/**
 * 선택된 원형들에서 Arsenal ID를 가중치 기반으로 추출
 * @param {string[]} archetypes - ['A_CRAFTSMAN', 'B_GEEK'] 등
 * @param {number} ladderLevel - 1, 2, or 3
 * @returns {{ ids: string[], synthesisPrompt: string, roles: string[] }}
 */
export function blendArchetypes(archetypes, ladderLevel) {
  const ladder = CREATIVE_LADDER[ladderLevel - 1] || CREATIVE_LADDER[0];
  const activeArchetypes = archetypes.slice(0, ladder.maxModules);

  // 각 원형에서 가중치에 따라 ID 선택
  const weight = ladder.synthesisWeight;
  const idsPerArchetype = Math.ceil(15 * weight / activeArchetypes.length);
  
  let blendedIds = [];
  let roles = [];

  for (const archKey of activeArchetypes) {
    const arch = ARCHETYPE_SLOTS[archKey];
    if (!arch) continue;
    
    // 가중치에 비례하여 더 많은 전술을 활성화
    const selectedIds = arch.arsenalIds.slice(0, idsPerArchetype);
    blendedIds.push(...selectedIds);
    roles.push(arch.synthesisRole);
  }

  // 중복 제거
  blendedIds = [...new Set(blendedIds)];

  // Level 3: Singularity 자동 추가
  if (ladderLevel >= 3 && !blendedIds.includes('A-100')) {
    blendedIds.push('A-100');
  }

  return {
    ids: blendedIds,
    synthesisPrompt: buildSynthesisPrompt(activeArchetypes, ladder, roles),
    ladderInfo: ladder,
    activeArchetypes: activeArchetypes.map(k => ({
      key: k,
      ...ARCHETYPE_SLOTS[k],
      arsenalIds: undefined, // 클라이언트에 내부 ID 노출 방지
      synthesisRole: undefined,
    })),
  };
}

/**
 * 합성 프롬프트 생성 — GPT에게 블렌딩 방법을 지시
 */
function buildSynthesisPrompt(archetypes, ladder, roles) {
  const archetypeNames = archetypes.map(k => ARCHETYPE_SLOTS[k]?.name || k).join(' × ');
  
  return `
[RECURSIVE SYNTHESIS ENGINE — Level ${ladder.level}: ${ladder.name}]
Active Archetypes: ${archetypeNames}
Synthesis Weight: ${ladder.synthesisWeight} (${Math.round(ladder.synthesisWeight * 100)}% complexity)

${roles.map((r, i) => `[Persona ${i + 1}]: ${r}`).join('\n')}

[SYNTHESIS DIRECTIVE]: ${ladder.synthesisPrompt}

BLENDING RULES:
- Do NOT simply alternate between styles. FUSE them into something new.
- Each scene must feel like ALL active archetypes contributed simultaneously.
- Synthesis weight ${ladder.synthesisWeight}: ${
    ladder.synthesisWeight <= 0.3 ? 'Keep it clean and focused. One voice.' :
    ladder.synthesisWeight <= 0.6 ? 'Create productive tension between the two voices. Let them argue and resolve.' :
    'Full orchestra. Every instrument plays. The result should feel like a new genre that never existed before.'
  }
`;
}

// ============================================================
// 💰 Recursive Pricing — 재귀적 견적 계산
// ============================================================

/**
 * 사다리 레벨에 따른 견적 보정
 * @param {number} baseCost - 기존 Empire Context 기본 단가
 * @param {number} tacticPremium - 전술 프리미엄 합산
 * @param {number} ladderLevel - 1~3
 * @param {number} activeModuleCount - 활성 원형 수
 * @param {number} seasonMultiplier - 시즌 보정
 * @returns {object} 상세 견적
 */
export function calculateLadderPricing(baseCost, tacticPremium, ladderLevel, activeModuleCount, seasonMultiplier) {
  const ladder = CREATIVE_LADDER[ladderLevel - 1] || CREATIVE_LADDER[0];
  
  // 합성 깊이 프리미엄: 원형 수 × 가중치의 제곱 (비선형 증가)
  const synthesisDepthPremium = Math.round(
    tacticPremium * (ladder.synthesisWeight ** 1.5) * activeModuleCount
  );
  
  // 최종 = (기본 + 전술 + 합성깊이) × 사다리배수 × 시즌
  const total = Math.round(
    (baseCost + tacticPremium + synthesisDepthPremium) * ladder.priceMultiplier * seasonMultiplier
  );

  return {
    baseCost,
    tacticPremium,
    synthesisDepthPremium,
    ladderMultiplier: ladder.priceMultiplier,
    seasonMultiplier,
    totalEstimate: total,
    ladderLevel: ladder.level,
    ladderName: ladder.name,
    ladderNameKo: ladder.nameKo,
    currency: 'KRW',
    unit: '만원',
  };
}

// ============================================================
// 📤 Exports for route.js
// ============================================================
export const ARCHETYPES = ARCHETYPE_SLOTS;
export const LADDER_LEVELS = CREATIVE_LADDER;

export function getLadderLevel(level) {
  return CREATIVE_LADDER[level - 1] || CREATIVE_LADDER[0];
}

export function getArchetype(key) {
  return ARCHETYPE_SLOTS[key] || null;
}

export function getAllArchetypeKeys() {
  return Object.keys(ARCHETYPE_SLOTS);
}
