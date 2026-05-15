import { NextResponse } from 'next/server';
import { generateVisual, getAvailableProviders } from '@/lib/engines/visual-provider';

export const maxDuration = 60;

/**
 * POST /api/engine/visual
 * 
 * ═══ Multi-Model Visual Generation Engine ═══
 * 
 * Body: {
 *   prompt: string,                  - 비주얼 프롬프트
 *   provider: 'ideogram'|'flux'|'leonardo', - 생성 엔진 (기본: leonardo)
 *   slotType: 'poster'|'logo'|'sns'|'card', - 슬롯 타입
 *   aspectRatio?: '9:16'|'16:9'|'1:1',      - AR (기본: 슬롯별 자동)
 *   overlayText?: string,            - 이미지 위 텍스트 (Ideogram/FLUX)
 *   style?: string,                  - Ideogram 스타일
 * }
 * 
 * GET /api/engine/visual — 사용 가능한 프로바이더 목록
 */

// 슬롯별 기본 AR 매핑
const SLOT_AR = {
  poster: '9:16',
  logo: '1:1',
  sns: '1:1',
  card: '16:9',
};

// 슬롯별 추천 프로바이더
const SLOT_PROVIDER = {
  poster: 'ideogram',  // 포스터 = 텍스트 많음 → Ideogram
  logo: 'ideogram',    // 로고 = 깔끔한 텍스트 → Ideogram
  sns: 'flux',         // SNS = 포토리얼 → FLUX
  card: 'ideogram',    // 명함 = 텍스트 중심 → Ideogram
};

export async function GET() {
  const providers = getAvailableProviders();
  return NextResponse.json({ success: true, providers });
}

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      prompt,
      provider: requestedProvider,
      slotType = 'poster',
      aspectRatio,
      overlayText = '',
      style = 'DESIGN',
    } = body;

    if (!prompt || prompt.trim().length < 5) {
      return NextResponse.json(
        { success: false, error: '비주얼 프롬프트가 필요합니다.' },
        { status: 400 }
      );
    }

    // 프로바이더 결정: 요청 > 슬롯별 추천 > 기본값
    const provider = requestedProvider || SLOT_PROVIDER[slotType] || 'leonardo';
    const ar = aspectRatio || SLOT_AR[slotType] || '9:16';

    console.log(`🎨 [VISUAL] 엔진: ${provider.toUpperCase()} | 슬롯: ${slotType} | AR: ${ar}`);

    // 프로바이더 키 확인
    const providerKeys = {
      ideogram: process.env.IDEOGRAM_API_KEY,
      flux: process.env.FAL_API_KEY,
      leonardo: process.env.LEONARDO_API_KEY,
    };

    if (!providerKeys[provider]) {
      // 폴백: 키가 있는 다른 프로바이더로 자동 전환
      const fallback = Object.entries(providerKeys).find(([, key]) => !!key);
      if (fallback) {
        console.log(`⚠️ [VISUAL] ${provider} 키 없음 → ${fallback[0]}로 폴백`);
        const result = await generateVisual(fallback[0], prompt, { aspectRatio: ar, overlayText, style });
        return NextResponse.json({
          success: true,
          engine: 'visual',
          data: {
            ...result,
            slotType,
            fallbackFrom: provider,
            fallbackTo: fallback[0],
          },
        });
      }

      return NextResponse.json({
        success: false,
        error: `${provider.toUpperCase()} API 키 미설정. .env.local에 ${provider === 'ideogram' ? 'IDEOGRAM_API_KEY' : provider === 'flux' ? 'FAL_API_KEY' : 'LEONARDO_API_KEY'}를 추가하세요.`,
        availableProviders: getAvailableProviders(),
      }, { status: 400 });
    }

    // 생성 실행
    const result = await generateVisual(provider, prompt, {
      aspectRatio: ar,
      overlayText,
      style,
    });

    console.log(`✅ [VISUAL] 생성 완료 — ${result.provider} | ${result.imageUrl?.substring(0, 60)}...`);

    return NextResponse.json({
      success: true,
      engine: 'visual',
      data: {
        ...result,
        slotType,
      },
    });

  } catch (error) {
    console.error('❌ [VISUAL] 에러:', error.message);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
