import { NextResponse } from 'next/server';
import { generateCinematicPrompt, generateCinematicPromptBatch } from '@/lib/prompt-matrix';

export const maxDuration = 60;

/**
 * POST /api/engine/visual-prompt
 * 
 * ═══ Cinematic Formula Prompt Generator ═══
 * 
 * LLM(Gemini)을 엘리트 아트 디렉터로 강제하여
 * 스크립트를 [피사체]+[배경]+[조명]+[카메라]+[타이포그래피]로 분해합니다.
 * 
 * Body (단일):
 * {
 *   script: "대본 텍스트",
 *   mood?: "luxury|energetic|emotional",
 *   category?: "cosmetics|real-estate|food|...",
 *   aspectRatio?: "9:16|16:9|1:1",
 *   overlayText?: "이미지 위 텍스트"
 * }
 * 
 * Body (배치):
 * {
 *   segments: [{ text: "CUT1 대본", overlayText: "텍스트" }, ...],
 *   mood?: "luxury",
 *   category?: "real-estate"
 * }
 */
export async function POST(req) {
  try {
    const body = await req.json();

    // ═══ 배치 모드: 여러 CUT 일괄 처리 ═══
    if (body.segments && Array.isArray(body.segments)) {
      console.log(`🎬 [VISUAL-PROMPT] Batch 모드 — ${body.segments.length}개 세그먼트`);

      const results = await generateCinematicPromptBatch(body.segments, {
        mood: body.mood,
        category: body.category,
        aspectRatio: body.aspectRatio,
      });

      return NextResponse.json({
        success: true,
        engine: 'cinematic-formula',
        mode: 'batch',
        count: results.length,
        data: results,
      });
    }

    // ═══ 단일 모드: 하나의 스크립트 변환 ═══
    const { script, mood, category, aspectRatio, overlayText } = body;

    if (!script || script.trim().length < 3) {
      return NextResponse.json(
        { success: false, error: '스크립트(script)가 필요합니다. 최소 3자 이상.' },
        { status: 400 }
      );
    }

    console.log(`🎬 [VISUAL-PROMPT] 단일 모드 — Script: ${script.substring(0, 60)}...`);

    const result = await generateCinematicPrompt(script, {
      mood: mood || 'premium cinematic',
      category: category || 'advertisement',
      aspectRatio: aspectRatio || '9:16',
      overlayText: overlayText || '',
    });

    return NextResponse.json({
      success: true,
      engine: 'cinematic-formula',
      mode: 'single',
      data: result,
    });

  } catch (error) {
    console.error('❌ [VISUAL-PROMPT] 에러:', error.message);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
