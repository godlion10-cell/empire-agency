import { NextResponse } from 'next/server';
import { notifyStageComplete, notifyVideoComplete } from '@/lib/telegram-notify';

/**
 * POST /api/video-generate
 * 
 * 이미지 → 영상 변환 (Runway/Luma Image-to-Video)
 * 이미지 없이 텍스트만 → Text-to-Video
 * 
 * Body: { prompt, imageUrl?, provider?: 'runway'|'luma', duration?: 5|10 }
 */
export async function POST(req) {
  try {
    const { prompt, imageUrl, provider = 'runway', duration = 5 } = await req.json();

    if (!prompt) {
      return NextResponse.json({ success: false, error: '프롬프트가 필요합니다.' }, { status: 400 });
    }

    const mode = imageUrl ? 'image-to-video' : 'text-to-video';
    console.log(`🎬 [VIDEO-GEN] ${provider.toUpperCase()} ${mode} | Duration: ${duration}s`);
    console.log(`   Prompt: ${prompt.substring(0, 80)}...`);
    if (imageUrl) console.log(`   Image: ${imageUrl.substring(0, 60)}...`);

    // === Runway API ===
    if (provider === 'runway') {
      const apiKey = process.env.RUNWAY_API_KEY;
      if (!apiKey) {
        console.log('⚠️ RUNWAY_API_KEY 미설정');
        return mockResponse(provider, mode, prompt, imageUrl, duration, 'RUNWAY_API_KEY가 .env.local에 설정되지 않았습니다.');
      }

      try {
        const runwayBody = {
          model: 'gen4_turbo',
          promptText: prompt,
          duration,
          ratio: '720:1280', // 숏폼 세로 비율
        };
        // promptImage는 실제 URL이 있을 때만 포함 (undefined 전송 방지)
        if (imageUrl && imageUrl.startsWith('http')) {
          runwayBody.promptImage = imageUrl;
        }

        const runwayRes = await fetch('https://api.dev.runwayml.com/v1/image_to_video', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'X-Runway-Version': '2024-11-06',
          },
          body: JSON.stringify(runwayBody),
        });

        const resText = await runwayRes.text();
        console.log(`🎬 [RUNWAY] Status: ${runwayRes.status} | Response: ${resText.substring(0, 300)}`);

        if (runwayRes.ok) {
          const data = JSON.parse(resText);
          // 📬 렌더링 시작 알림
          notifyStageComplete(prompt.substring(0, 30), 'VIDEO', `Runway ${mode} 시작 — ID: ${data.id}`).catch(() => {});
          return NextResponse.json({
            success: true,
            data: {
              id: data.id,
              status: 'processing',
              provider: 'runway',
              mode,
              message: `✅ Runway ${mode} 작업이 시작되었습니다. 약 30-90초 소요됩니다.`,
            }
          });
        } else {
          // API 호출은 됐지만 에러 반환
          let errorDetail;
          try { errorDetail = JSON.parse(resText); } catch { errorDetail = { message: resText }; }
          console.error('❌ [RUNWAY] API 에러:', errorDetail);
          return NextResponse.json({
            success: false,
            error: `Runway API 에러 (${runwayRes.status}): ${errorDetail.error || errorDetail.message || resText.substring(0, 200)}`,
            detail: errorDetail,
          }, { status: runwayRes.status });
        }
      } catch (e) {
        console.error('❌ [RUNWAY] 연결 실패:', e.message);
        return NextResponse.json({
          success: false,
          error: `Runway 연결 실패: ${e.message}`,
        }, { status: 502 });
      }
    }

    // === Luma API ===
    if (provider === 'luma') {
      const apiKey = process.env.LUMA_API_KEY;
      if (!apiKey) {
        console.log('⚠️ LUMA_API_KEY 미설정');
        return mockResponse(provider, mode, prompt, imageUrl, duration, 'LUMA_API_KEY가 .env.local에 설정되지 않았습니다.');
      }

      try {
        const lumaBody = {
          prompt,
          model: 'ray-2',
          resolution: '720p',
          duration: `${duration}s`,
        };
        if (imageUrl) {
          lumaBody.keyframes = {
            frame0: { type: 'image', url: imageUrl }
          };
        }

        const lumaRes = await fetch('https://api.lumalabs.ai/dream-machine/v1/generations', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(lumaBody),
        });

        const resText = await lumaRes.text();
        console.log(`🎬 [LUMA] Status: ${lumaRes.status} | Response: ${resText.substring(0, 300)}`);

        if (lumaRes.ok) {
          const data = JSON.parse(resText);
          // 📬 렌더링 시작 알림
          notifyStageComplete(prompt.substring(0, 30), 'VIDEO', `Luma ${mode} 시작 — ID: ${data.id}`).catch(() => {});
          return NextResponse.json({
            success: true,
            data: {
              id: data.id,
              status: 'processing',
              provider: 'luma',
              mode,
              message: `✅ Luma ${mode} 작업이 시작되었습니다.`,
            }
          });
        } else {
          let errorDetail;
          try { errorDetail = JSON.parse(resText); } catch { errorDetail = { message: resText }; }
          console.error('❌ [LUMA] API 에러:', errorDetail);
          return NextResponse.json({
            success: false,
            error: `Luma API 에러 (${lumaRes.status}): ${errorDetail.error || errorDetail.message || resText.substring(0, 200)}`,
            detail: errorDetail,
          }, { status: lumaRes.status });
        }
      } catch (e) {
        console.error('❌ [LUMA] 연결 실패:', e.message);
        return NextResponse.json({
          success: false,
          error: `Luma 연결 실패: ${e.message}`,
        }, { status: 502 });
      }
    }

    // Unknown provider
    return mockResponse(provider, mode, prompt, imageUrl, duration, `알 수 없는 provider: ${provider}`);

  } catch (error) {
    console.error('❌ [VIDEO-GEN] 에러:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/** Mock 응답 헬퍼 */
function mockResponse(provider, mode, prompt, imageUrl, duration, reason) {
  return NextResponse.json({
    success: true,
    data: {
      id: `mock_${Date.now()}`,
      status: 'complete',
      provider: 'mock',
      mode,
      videoUrl: null,
      message: `[MOCK] ${reason}`,
      prompt,
      imageUrl: imageUrl || null,
      duration,
      mockPreview: {
        thumbnail: imageUrl || null,
        estimatedTime: `${duration * 6}초`,
      }
    }
  });
}
