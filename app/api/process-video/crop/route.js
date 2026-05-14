import { NextResponse } from 'next/server';

export const maxDuration = 60;

/**
 * POST /api/process-video/crop
 * 
 * 실제 FFmpeg 영상 크롭 실행을 외부 워커로 오프로드.
 * Vercel 서버리스는 10-60초 타임아웃 제한이 있어 FFmpeg 직접 실행이 불가능.
 * 
 * 지원 워커:
 * 1. EXTERNAL_VIDEO_API_KEY → Replicate API
 * 2. VIDEO_WORKER_URL → 자체 GPU 서버 (Render, Railway, etc.)
 * 3. 미설정 → FFmpeg 명령어만 반환 (로컬 실행 안내)
 */
export async function POST(request) {
  try {
    const { videoUrl, crops, outputRatio = '9:16' } = await request.json();

    if (!videoUrl) {
      return NextResponse.json({ success: false, error: 'videoUrl이 필요합니다.' }, { status: 400 });
    }
    if (!crops || crops.length === 0) {
      return NextResponse.json({ success: false, error: 'crops 데이터가 필요합니다. /api/process-video 에서 먼저 분석을 실행하세요.' }, { status: 400 });
    }

    // ── 방법 1: Replicate API (GPU 클라우드) ──
    const replicateKey = process.env.EXTERNAL_VIDEO_API_KEY || process.env.REPLICATE_API_TOKEN;
    if (replicateKey) {
      console.log(`🎬 [CROP-OFFLOAD] Replicate 워커로 오프로드: ${crops.length}개 크롭`);
      
      const workerResponse = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${replicateKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          version: process.env.VIDEO_CROP_MODEL_VERSION || 'auto',
          input: {
            video: videoUrl,
            crops: crops,
            target_ratio: outputRatio,
          },
        }),
      });

      if (!workerResponse.ok) {
        const errText = await workerResponse.text().catch(() => 'Unknown error');
        console.error(`❌ [CROP-OFFLOAD] Replicate 실패: ${workerResponse.status}`, errText);
        return NextResponse.json({
          success: false,
          error: `외부 워커 API 실패 (HTTP ${workerResponse.status}): ${errText}`,
        }, { status: 502 });
      }

      const data = await workerResponse.json();
      console.log(`✅ [CROP-OFFLOAD] Replicate 작업 제출 완료:`, data.id);

      return NextResponse.json({
        success: true,
        data: {
          provider: 'replicate',
          predictionId: data.id,
          status: data.status,
          croppedVideoUrl: data.output || null,
          message: data.status === 'succeeded'
            ? '✅ 크롭 완료!'
            : `⏳ 처리 중 (${data.status}). 폴링으로 상태를 확인하세요.`,
        },
      });
    }

    // ── 방법 2: 자체 GPU 워커 서버 ──
    const workerUrl = process.env.VIDEO_WORKER_URL;
    if (workerUrl) {
      console.log(`🎬 [CROP-OFFLOAD] 자체 워커로 오프로드: ${workerUrl}`);
      
      const workerResponse = await fetch(`${workerUrl}/api/crop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl, crops, outputRatio }),
      });

      if (!workerResponse.ok) {
        const errText = await workerResponse.text().catch(() => 'Worker error');
        return NextResponse.json({
          success: false,
          error: `워커 서버 실패 (HTTP ${workerResponse.status}): ${errText}`,
        }, { status: 502 });
      }

      const data = await workerResponse.json();
      return NextResponse.json({ success: true, data });
    }

    // ── 방법 3: 외부 API 미설정 → FFmpeg 명령어만 반환 ──
    console.log(`⚠️ [CROP-OFFLOAD] 외부 워커 미설정. FFmpeg 명령어만 반환합니다.`);
    
    const ffmpegCommands = crops.map((crop, i) => {
      const ss = crop.startSec || 0;
      const duration = (crop.endSec || 30) - ss;
      const x = crop.x || 656;
      const y = crop.y || 0;
      const w = crop.width || 607;
      const h = crop.height || 1080;
      return `ffmpeg -i input.mp4 -vf "crop=${w}:${h}:${x}:${y}" -ss ${ss} -t ${duration} -c:a copy scene${i + 1}_crop.mp4`;
    });

    return NextResponse.json({
      success: true,
      data: {
        provider: 'local',
        message: '⚠️ EXTERNAL_VIDEO_API_KEY 또는 VIDEO_WORKER_URL 환경변수를 설정하면 클라우드 크롭이 자동 실행됩니다. 현재는 FFmpeg 명령어만 생성되었습니다.',
        ffmpegCommands,
        crops,
        instructions: [
          '1. 위 FFmpeg 명령어를 로컬 터미널에서 실행하세요.',
          '2. 또는 Replicate API 키를 EXTERNAL_VIDEO_API_KEY에 설정하세요.',
          '3. 자체 GPU 서버가 있으면 VIDEO_WORKER_URL에 설정하세요.',
        ],
      },
    });

  } catch (error) {
    console.error('❌ [CROP-OFFLOAD] 에러:', error);
    return NextResponse.json({
      success: false,
      error: `영상 크롭 오프로드 실패: ${error.message}`,
    }, { status: 500 });
  }
}
