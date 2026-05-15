import { NextResponse } from 'next/server';

export const maxDuration = 60;

/**
 * POST /api/engine/auto-visual
 * 
 * Arsenal Injector — VVIP 비주얼 자동 생성기
 * 
 * Gemini가 뽑아준 기본 상황 프롬프트에 하이브리드 아스널(럭셔리 태그)을
 * 강제 주입한 뒤 Leonardo.ai Kino 모델로 시네마틱 이미지를 생성합니다.
 */
export async function POST(req) {
  try {
    const { baseVisualPrompt, aspectRatio } = await req.json();

    if (!baseVisualPrompt || baseVisualPrompt.trim().length < 5) {
      return NextResponse.json(
        { success: false, error: '비주얼 프롬프트가 필요합니다.' },
        { status: 400 }
      );
    }

    if (!process.env.LEONARDO_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'LEONARDO_API_KEY가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    // ═══════════════════════════════════════════
    // 💎 하이브리드 프롬프트 아스널 (VVIP 퀄리티 강제 주입 태그)
    // ═══════════════════════════════════════════
    const hybridPromptArsenal = [
      'shot on 35mm lens',
      'f/1.8 aperture',
      'cinematic lighting',
      'golden hour glow',
      'volumetric light rays',
      'hyper-detailed texture',
      'photorealistic',
      '8k resolution',
      'Unreal Engine 5 render',
      'award-winning photography',
      'subtle film grain',
      'dramatic color grading',
      'professional composition',
      'depth of field bokeh',
    ].join(', ');

    // 기본 상황 + 럭셔리 태그 결합
    const vvipPrompt = `${baseVisualPrompt.trim()}, ${hybridPromptArsenal}`;

    console.log(`🎨 [VISUAL] Arsenal Injector 가동 — 프롬프트 길이: ${vvipPrompt.length}자`);
    console.log(`📋 [VISUAL] Base: ${baseVisualPrompt.substring(0, 100)}...`);

    // ═══════════════════════════════════════════
    // Leonardo.ai API — 시네마틱 이미지 생성
    // ═══════════════════════════════════════════
    const ar = aspectRatio || '9:16';
    const isVertical = ar === '9:16';

    const leonardoBody = {
      prompt: vvipPrompt,
      modelId: '6bef9f1b-29cb-40c7-b9df-32b51c1f67d3', // Leonardo Kino XL
      width: isVertical ? 832 : 1472,
      height: isVertical ? 1472 : 832,
      num_images: 1,
      promptMagic: true,
      promptMagicVersion: 'v3',
      presetStyle: 'CINEMATIC',
      alchemy: true,
      highContrast: true,
      expandedDomain: true,
      fantasyAvatar: false,
      photoReal: true,
      photoRealVersion: 'v2',
    };

    const genRes = await fetch('https://cloud.leonardo.ai/api/rest/v1/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.LEONARDO_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(leonardoBody),
    });

    if (!genRes.ok) {
      const errBody = await genRes.text();
      console.error(`❌ [VISUAL] Leonardo API 오류: ${genRes.status}`, errBody);
      throw new Error(`Leonardo API ${genRes.status}: ${errBody.substring(0, 200)}`);
    }

    const genData = await genRes.json();
    const generationId = genData.sdGenerationJob?.generationId;

    if (!generationId) {
      throw new Error('Leonardo generationId를 받지 못했습니다.');
    }

    console.log(`⏳ [VISUAL] Generation 시작: ${generationId}`);

    // ═══════════════════════════════════════════
    // Polling — 이미지 생성 완료 대기 (최대 60초)
    // ═══════════════════════════════════════════
    let imageUrl = null;
    const maxAttempts = 20;

    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 3000));

      const statusRes = await fetch(
        `https://cloud.leonardo.ai/api/rest/v1/generations/${generationId}`,
        {
          headers: { 'Authorization': `Bearer ${process.env.LEONARDO_API_KEY}` },
        }
      );

      if (!statusRes.ok) continue;

      const statusData = await statusRes.json();
      const gen = statusData.generations_by_pk;

      if (gen?.status === 'COMPLETE' && gen?.generated_images?.length > 0) {
        imageUrl = gen.generated_images[0].url;
        console.log(`✅ [VISUAL] 생성 완료: ${imageUrl.substring(0, 80)}...`);
        break;
      }

      if (gen?.status === 'FAILED') {
        throw new Error('Leonardo 이미지 생성 실패');
      }

      console.log(`⏳ [VISUAL] 대기 중... (${i + 1}/${maxAttempts})`);
    }

    if (!imageUrl) {
      throw new Error('이미지 생성 시간 초과 (60초)');
    }

    return NextResponse.json({
      success: true,
      engine: 'auto-visual',
      data: {
        imageUrl,
        generationId,
        vvipPrompt,
        arsenalTags: hybridPromptArsenal,
        aspectRatio: ar,
      },
    });
  } catch (error) {
    console.error('❌ [VISUAL] 처리 실패:', error.message);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
