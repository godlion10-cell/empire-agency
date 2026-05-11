/**
 * 🏛️ Banseok Empire Context — Central Data Bus
 * 
 * 모든 파이프라인 스테이지가 이 버스를 통해 데이터를 주고받는다.
 * Vision → Arsenal → Estimation → Storyboard 전체를 관통하는 단일 상태 객체.
 */

// ============================================================
// 📊 실시간 견적 엔진 — Tactic Premium Calculator
// ============================================================
const TACTIC_COST_MAP = {
  // Phase 1-3: 클래식 — 기본 프리미엄
  'A-001': 50,  'A-002': 50,  'A-003': 60,  'A-004': 80,  'A-005': 55,
  'A-006': 45,  'A-007': 70,  'A-008': 90,  'A-009': 65,  'A-010': 70,
  'A-011': 60,  'A-012': 75,  'A-013': 70,  'A-014': 55,  'A-015': 80,
  'A-016': 50,  'A-017': 60,  'A-018': 85,  'A-019': 55,  'A-020': 50,
  'A-021': 75,  'A-022': 65,  'A-023': 70,  'A-024': 90,  'A-025': 55,
  'A-026': 95,  'A-027': 40,  'A-028': 50,  'A-029': 60,  'A-030': 65,
  // Phase 4-5: 디지털 — 중급 프리미엄
  'A-031': 85,  'A-032': 50,  'A-033': 70,  'A-034': 75,  'A-035': 60,
  'A-036': 90,  'A-037': 80,  'A-038': 65,  'A-039': 55,  'A-040': 85,
  'A-041': 95,  'A-042': 80,  'A-043': 70,  'A-044': 65,  'A-045': 90,
  'A-046': 60,  'A-047': 55,  'A-048': 75,  'A-049': 85,  'A-050': 70,
  // Phase 6-7: 미래 — 고급 프리미엄
  'A-051': 100, 'A-052': 95,  'A-053': 110, 'A-054': 105, 'A-055': 100,
  'A-056': 90,  'A-057': 95,  'A-058': 110, 'A-059': 85,  'A-060': 100,
  'A-061': 120, 'A-062': 130, 'A-063': 115, 'A-064': 110, 'A-065': 105,
  'A-066': 100, 'A-067': 95,  'A-068': 110, 'A-069': 120, 'A-070': 100,
  // Phase 8-9: 초월/심리전 — 최고급 프리미엄
  'A-071': 115, 'A-072': 105, 'A-073': 95,  'A-074': 90,  'A-075': 100,
  'A-076': 110, 'A-077': 100, 'A-078': 120, 'A-079': 85,  'A-080': 115,
  'A-081': 130, 'A-082': 125, 'A-083': 120, 'A-084': 115, 'A-085': 110,
  'A-086': 105, 'A-087': 100, 'A-088': 110, 'A-089': 120, 'A-090': 95,
  // Phase 10: 피날레 — 전설급
  'A-091': 140, 'A-092': 130, 'A-093': 135, 'A-094': 150, 'A-095': 125,
  'A-096': 110, 'A-097': 100, 'A-098': 145, 'A-099': 135, 'A-100': 200,
};

// 비율별 기본 단가 (만원 단위)
const BASE_COST_BY_RATIO = {
  '9:16':  300,   // 숏폼 60초
  '16:9':  800,   // 유튜브 3-5분
  '21:9':  1500,  // 시네마틱
};

// 트렌드 시즌 보정 (월별 수요 계수)
function getSeasonMultiplier() {
  const month = new Date().getMonth() + 1;
  // 광고 성수기: 11-12월(연말), 2월(발렌타인), 5월(가정의달)
  const SEASON = { 1:1.0, 2:1.2, 3:1.0, 4:1.0, 5:1.3, 6:1.0, 7:0.9, 8:0.9, 9:1.1, 10:1.1, 11:1.4, 12:1.5 };
  return SEASON[month] || 1.0;
}

// ============================================================
// 🏗️ Context Builder — 파이프라인의 모든 결과를 하나로 조립
// ============================================================

/**
 * 빈 Empire Context 생성
 */
export function createEmpireContext(projectId) {
  return {
    projectId,
    timestamp: new Date().toISOString(),
    
    brandDNA: {
      coreValues: [],
      visualIdentity: {
        primaryStyle: null,
        colorMood: null,
        textureProfile: null,
        compositionType: null,
      },
      psychologicalProfile: null,
    },

    liveEstimation: {
      baseCost: 0,
      tacticPremium: 0,
      realtimeMultiplier: 1.0,
      totalEstimate: 0,
      currency: 'KRW',
      unit: '만원',
    },

    creativeAssets: {
      logoUrl: null,
      videoStream: null,
      packageDesign: null,
    },

    // 파이프라인 메타데이터
    pipeline: {
      visionUsed: false,
      visionAnalysis: null,
      arsenalIds: [],
      arsenalNames: [],
      styleApplied: null,
      aspectRatio: null,
      scenesGenerated: 0,
    },
  };
}

/**
 * Stage 1 결과 주입: Vision Analysis → brandDNA
 */
export function injectVisionResult(ctx, analysis) {
  ctx.brandDNA.coreValues = analysis.key_features || [];
  ctx.brandDNA.visualIdentity = {
    primaryStyle: analysis.product_type || 'general',
    colorMood: analysis.mood || 'neutral',
    textureProfile: (analysis.visual_traits || []).join(', '),
    compositionType: analysis.product_type || 'standard',
  };
  ctx.brandDNA.psychologicalProfile = `${analysis.target_audience || 'general'} — ${analysis.mood || 'neutral'} appeal`;
  ctx.pipeline.visionUsed = true;
  ctx.pipeline.visionAnalysis = analysis;
  return ctx;
}

/**
 * Stage 2 결과 주입: Arsenal Matching → pipeline + estimation
 */
export function injectArsenalResult(ctx, arsenalIds, arsenalNames, aspectRatio) {
  ctx.pipeline.arsenalIds = arsenalIds;
  ctx.pipeline.arsenalNames = arsenalNames;
  ctx.pipeline.aspectRatio = aspectRatio;

  // 💰 실시간 견적 계산
  const baseCost = BASE_COST_BY_RATIO[aspectRatio] || 300;
  const tacticPremium = arsenalIds.reduce((sum, id) => sum + (TACTIC_COST_MAP[id] || 50), 0);
  const multiplier = getSeasonMultiplier();
  const total = Math.round((baseCost + tacticPremium) * multiplier);

  ctx.liveEstimation = {
    baseCost,
    tacticPremium,
    realtimeMultiplier: multiplier,
    totalEstimate: total,
    currency: 'KRW',
    unit: '만원',
  };
  return ctx;
}

/**
 * Stage 3 결과 주입: Creative Assets
 */
export function injectCreativeAssets(ctx, assets) {
  if (assets.logoUrl) ctx.creativeAssets.logoUrl = assets.logoUrl;
  if (assets.videoStream) ctx.creativeAssets.videoStream = assets.videoStream;
  if (assets.packageDesign) ctx.creativeAssets.packageDesign = assets.packageDesign;
  return ctx;
}

/**
 * Stage 4 결과 주입: Final Output 메타데이터
 */
export function injectFinalResult(ctx, styleName, sceneCount) {
  ctx.pipeline.styleApplied = styleName;
  ctx.pipeline.scenesGenerated = sceneCount;
  return ctx;
}

/**
 * Context → 클라이언트 전송용 직렬화 (민감 정보 제거)
 */
export function serializeForClient(ctx) {
  return {
    projectId: ctx.projectId,
    timestamp: ctx.timestamp,
    brandDNA: ctx.brandDNA,
    liveEstimation: ctx.liveEstimation,
    pipeline: {
      visionUsed: ctx.pipeline.visionUsed,
      arsenalIds: ctx.pipeline.arsenalIds,
      arsenalNames: ctx.pipeline.arsenalNames,
      styleApplied: ctx.pipeline.styleApplied,
      aspectRatio: ctx.pipeline.aspectRatio,
      scenesGenerated: ctx.pipeline.scenesGenerated,
    },
  };
}
