/**
 * 🎨 Empire Visual Provider — Multi-Model Image Generation Gateway
 * 
 * 지원 엔진:
 * - Ideogram 3.0: 한글/영문 타이포그래피 최강 (render_text)
 * - FLUX.1 [pro]: 초고해상도 포토리얼리즘 + 선명한 텍스트
 * - Leonardo Kino XL: 시네마틱 비주얼 (기존 Arsenal Injector)
 * 
 * 각 엔진은 비동기 polling 방식으로 결과를 반환합니다.
 */

/** 하이브리드 아스널 태그 (공통 퀄리티 부스터) */
const ARSENAL_TAGS = [
  'shot on 35mm lens', 'f/1.8 aperture', 'cinematic lighting',
  'hyper-detailed texture', 'photorealistic', '8k resolution',
  'professional composition', 'depth of field bokeh',
].join(', ');

/** Aspect Ratio → 픽셀 매핑 */
const AR_MAP = {
  '9:16': { width: 720, height: 1280, ideogram: 'ASPECT_9_16', flux: 'portrait_4_5' },
  '16:9': { width: 1280, height: 720, ideogram: 'ASPECT_16_9', flux: 'landscape_16_9' },
  '1:1':  { width: 1024, height: 1024, ideogram: 'ASPECT_1_1', flux: 'square' },
  '4:5':  { width: 832, height: 1024, ideogram: 'ASPECT_4_5', flux: 'portrait_4_5' },
};

// ═══════════════════════════════════════════
// Ideogram 3.0 — 타이포그래피 전문
// ═══════════════════════════════════════════

export async function generateWithIdeogram(prompt, options = {}) {
  const apiKey = process.env.IDEOGRAM_API_KEY;
  if (!apiKey) throw new Error('IDEOGRAM_API_KEY가 설정되지 않았습니다.');

  const {
    aspectRatio = '9:16',
    style = 'DESIGN',
    renderText = true,
    overlayText = '',
  } = options;

  const ar = AR_MAP[aspectRatio] || AR_MAP['9:16'];

  // 타이포그래피 최적화: 텍스트가 포함된 경우 프롬프트 강화
  let enhancedPrompt = prompt;
  if (overlayText) {
    enhancedPrompt = `${prompt}. The image prominently features the text "${overlayText}" in bold, clean, perfectly readable Korean typography. Sharp text rendering, no distortion, no misspelling.`;
  }

  console.log(`🎨 [IDEOGRAM] 생성 시작 — Style: ${style}, AR: ${aspectRatio}, Text: ${renderText}`);

  const response = await fetch('https://api.ideogram.ai/generate', {
    method: 'POST',
    headers: {
      'Api-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image_request: {
        prompt: enhancedPrompt,
        aspect_ratio: ar.ideogram,
        model: 'V_2',  // Ideogram 3.0 (V_2 = latest)
        style_type: style, // DESIGN, REALISTIC, RENDER_3D, ANIME
        magic_prompt_option: 'AUTO',
      },
    }),
  });

  const resText = await response.text();
  console.log(`🎨 [IDEOGRAM] Status: ${response.status}`);

  if (!response.ok) {
    throw new Error(`Ideogram API ${response.status}: ${resText.substring(0, 200)}`);
  }

  const data = JSON.parse(resText);
  const imageUrl = data.data?.[0]?.url || null;

  if (!imageUrl) {
    throw new Error('Ideogram이 이미지 URL을 반환하지 않았습니다.');
  }

  return {
    provider: 'ideogram',
    imageUrl,
    prompt: enhancedPrompt,
    metadata: {
      style,
      aspectRatio,
      renderText,
      seed: data.data?.[0]?.seed,
    },
  };
}

// ═══════════════════════════════════════════
// FLUX.1 [pro] via Fal.ai — 포토리얼리즘
// ═══════════════════════════════════════════

export async function generateWithFlux(prompt, options = {}) {
  const apiKey = process.env.FAL_API_KEY;
  if (!apiKey) throw new Error('FAL_API_KEY가 설정되지 않았습니다.');

  const {
    aspectRatio = '9:16',
    steps = 28,
    guidanceScale = 3.5,
    overlayText = '',
  } = options;

  const ar = AR_MAP[aspectRatio] || AR_MAP['9:16'];

  // FLUX 타이포그래피 강화
  let enhancedPrompt = `${prompt}, ${ARSENAL_TAGS}`;
  if (overlayText) {
    enhancedPrompt += `, with bold clean typography reading "${overlayText}", sharp text details, no artifacts`;
  }

  console.log(`⚡ [FLUX] 생성 시작 — Steps: ${steps}, AR: ${aspectRatio}`);

  // Fal.ai 비동기 제출
  const submitRes = await fetch('https://queue.fal.run/fal-ai/flux-pro/v1.1', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: enhancedPrompt,
      image_size: {
        width: ar.width,
        height: ar.height,
      },
      num_inference_steps: steps,
      guidance_scale: guidanceScale,
      num_images: 1,
      safety_tolerance: '2',
    }),
  });

  const submitText = await submitRes.text();
  console.log(`⚡ [FLUX] Submit Status: ${submitRes.status}`);

  if (!submitRes.ok) {
    throw new Error(`Fal.ai FLUX API ${submitRes.status}: ${submitText.substring(0, 200)}`);
  }

  const submitData = JSON.parse(submitText);

  // 동기 응답인 경우 바로 반환
  if (submitData.images?.[0]?.url) {
    return {
      provider: 'flux',
      imageUrl: submitData.images[0].url,
      prompt: enhancedPrompt,
      metadata: { steps, guidanceScale, aspectRatio },
    };
  }

  // 비동기 응답: polling
  const requestId = submitData.request_id;
  if (!requestId) throw new Error('FLUX request_id를 받지 못했습니다.');

  console.log(`⏳ [FLUX] Polling 시작: ${requestId}`);
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 3000));

    const pollRes = await fetch(`https://queue.fal.run/fal-ai/flux-pro/v1.1/requests/${requestId}/status`, {
      headers: { 'Authorization': `Key ${apiKey}` },
    });

    if (!pollRes.ok) continue;
    const pollData = await pollRes.json();

    if (pollData.status === 'COMPLETED') {
      // 결과 가져오기
      const resultRes = await fetch(`https://queue.fal.run/fal-ai/flux-pro/v1.1/requests/${requestId}`, {
        headers: { 'Authorization': `Key ${apiKey}` },
      });
      const resultData = await resultRes.json();
      const imageUrl = resultData.images?.[0]?.url;

      if (imageUrl) {
        console.log(`✅ [FLUX] 생성 완료`);
        return {
          provider: 'flux',
          imageUrl,
          prompt: enhancedPrompt,
          metadata: { steps, guidanceScale, aspectRatio, requestId },
        };
      }
    }

    if (pollData.status === 'FAILED') {
      throw new Error(`FLUX 생성 실패: ${pollData.error || 'Unknown'}`);
    }
  }

  throw new Error('FLUX 생성 시간 초과 (60초)');
}

// ═══════════════════════════════════════════
// Leonardo Kino XL — 시네마틱 (기존 Arsenal)
// ═══════════════════════════════════════════

export async function generateWithLeonardo(prompt, options = {}) {
  const apiKey = process.env.LEONARDO_API_KEY;
  if (!apiKey) throw new Error('LEONARDO_API_KEY가 설정되지 않았습니다.');

  const { aspectRatio = '9:16' } = options;
  const isVertical = aspectRatio === '9:16' || aspectRatio === '4:5';

  const vvipPrompt = `${prompt}, ${ARSENAL_TAGS}`;

  console.log(`🎬 [LEONARDO] Arsenal Injector 가동`);

  const genRes = await fetch('https://cloud.leonardo.ai/api/rest/v1/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: vvipPrompt,
      modelId: '6bef9f1b-29cb-40c7-b9df-32b51c1f67d3', // Kino XL
      width: isVertical ? 832 : 1472,
      height: isVertical ? 1472 : 832,
      num_images: 1,
      promptMagic: true,
      presetStyle: 'CINEMATIC',
      alchemy: true,
      photoReal: true,
      photoRealVersion: 'v2',
    }),
  });

  if (!genRes.ok) {
    const errBody = await genRes.text();
    throw new Error(`Leonardo API ${genRes.status}: ${errBody.substring(0, 200)}`);
  }

  const genData = await genRes.json();
  const generationId = genData.sdGenerationJob?.generationId;
  if (!generationId) throw new Error('Leonardo generationId 누락');

  // Polling
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const statusRes = await fetch(`https://cloud.leonardo.ai/api/rest/v1/generations/${generationId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    if (!statusRes.ok) continue;
    const statusData = await statusRes.json();
    const gen = statusData.generations_by_pk;

    if (gen?.status === 'COMPLETE' && gen?.generated_images?.length > 0) {
      return {
        provider: 'leonardo',
        imageUrl: gen.generated_images[0].url,
        prompt: vvipPrompt,
        metadata: { generationId, aspectRatio },
      };
    }
    if (gen?.status === 'FAILED') throw new Error('Leonardo 생성 실패');
  }

  throw new Error('Leonardo 생성 시간 초과 (60초)');
}

// ═══════════════════════════════════════════
// 통합 게이트웨이
// ═══════════════════════════════════════════

/**
 * 통합 비주얼 생성 함수
 * @param {'ideogram'|'flux'|'leonardo'} provider
 * @param {string} prompt
 * @param {Object} options - { aspectRatio, overlayText, style, ... }
 */
export async function generateVisual(provider, prompt, options = {}) {
  switch (provider) {
    case 'ideogram':
      return generateWithIdeogram(prompt, options);
    case 'flux':
      return generateWithFlux(prompt, options);
    case 'leonardo':
    default:
      return generateWithLeonardo(prompt, options);
  }
}

/** 사용 가능한 프로바이더 목록 반환 */
export function getAvailableProviders() {
  return [
    {
      id: 'ideogram',
      name: 'Ideogram 3.0',
      badge: '🔤 Typography',
      description: '한글/영문 타이포그래피 최강 — 텍스트 완벽 렌더링',
      available: !!process.env.IDEOGRAM_API_KEY,
      bestFor: ['poster', 'logo', 'card'],
    },
    {
      id: 'flux',
      name: 'FLUX.1 Pro',
      badge: '📸 Realism',
      description: '초고해상도 포토리얼리즘 + 선명한 디테일',
      available: !!process.env.FAL_API_KEY,
      bestFor: ['sns', 'poster'],
    },
    {
      id: 'leonardo',
      name: 'Leonardo Kino XL',
      badge: '🎬 Cinematic',
      description: '시네마틱 광고 비주얼 — Arsenal 태그 자동 주입',
      available: !!process.env.LEONARDO_API_KEY,
      bestFor: ['poster', 'sns'],
    },
  ];
}
