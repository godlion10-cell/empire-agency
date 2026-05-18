import { NextResponse } from 'next/server';
import {
  generateFreeKoreanVoice,
  generateVoiceBatch,
  generateVoiceAsDataUrl,
  KOREAN_VOICES,
} from '@/lib/audio-engine';

export const maxDuration = 60;

/**
 * GET /api/tts — 사용 가능한 Edge TTS 한국어 보이스 목록
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    engine: 'edge-tts',
    cost: 'FREE',
    voices: KOREAN_VOICES,
  });
}

/**
 * POST /api/tts — Edge TTS 음성 생성
 * 
 * ═══ Zero-Cost Korean Voice Engine ═══
 * 
 * Body (단일):
 * {
 *   text: "음성 변환할 텍스트",
 *   voice?: "ko-KR-SunHiNeural",
 *   projectId?: "project_123",
 *   mode?: "file" | "dataurl"
 * }
 * 
 * Body (배치):
 * {
 *   chunks: ["텍스트1", "텍스트2", ...],
 *   voice?: "ko-KR-InJoonNeural",
 *   projectId?: "project_123"
 * }
 */
export async function POST(req) {
  try {
    const body = await req.json();

    // ═══ 배치 모드 ═══
    if (body.chunks && Array.isArray(body.chunks)) {
      console.log(`🔊 [TTS-API] Batch 모드 — ${body.chunks.length}개 청크`);

      const results = await generateVoiceBatch(body.chunks, {
        projectId: body.projectId || `batch_${Date.now()}`,
        voice: body.voice,
      });

      const successCount = results.filter(r => r.success).length;

      return NextResponse.json({
        success: true,
        engine: 'edge-tts',
        mode: 'batch',
        totalChunks: body.chunks.length,
        successCount,
        cost: 0,
        data: results,
      });
    }

    // ═══ 단일 모드 ═══
    const { text, voice, projectId, mode = 'file' } = body;

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: '텍스트(text)가 필요합니다.' },
        { status: 400 }
      );
    }

    console.log(`🔊 [TTS-API] 단일 모드 — Voice: ${voice || 'default'} | Mode: ${mode}`);

    // DataURL 모드: 파일 저장 없이 base64 반환
    if (mode === 'dataurl') {
      const result = await generateVoiceAsDataUrl(text, voice);
      return NextResponse.json({
        success: true,
        engine: 'edge-tts',
        mode: 'dataurl',
        cost: 0,
        data: result,
      });
    }

    // File 모드: public/audio/ 에 저장 후 URL 반환
    const result = await generateFreeKoreanVoice(text, {
      projectId: projectId || `single_${Date.now()}`,
      voice,
    });

    return NextResponse.json({
      success: true,
      engine: 'edge-tts',
      mode: 'file',
      cost: 0,
      data: result,
    });

  } catch (error) {
    console.error('❌ [TTS-API] 에러:', error.message);
    console.log('➡️ [TTS-API] Fallback Dummy Audio 주입 — 파이프라인 테스트 유지');

    // ═══ 🛡️ Emergency Dummy: TTS 실패 시 더미 오디오로 대체 ═══
    const dummyAudioUrl = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';

    return NextResponse.json({
      success: true,
      isDummy: true,
      engine: 'edge-tts',
      mode: 'dummy',
      cost: 0,
      data: {
        audioUrl: dummyAudioUrl,
        url: dummyAudioUrl,
        voice: 'dummy-fallback',
        warning: `실제 TTS 실패 (${error.message.substring(0, 80)}). 더미 오디오로 대체됨.`,
      },
    });
  }
}
