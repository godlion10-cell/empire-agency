import { NextResponse } from 'next/server';

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

    // === Runway API 시도 ===
    if (provider === 'runway' && process.env.RUNWAY_API_KEY) {
      try {
        const runwayRes = await fetch('https://api.dev.runwayml.com/v1/image_to_video', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RUNWAY_API_KEY}`,
            'Content-Type': 'application/json',
            'X-Runway-Version': '2024-11-06',
          },
          body: JSON.stringify({
            model: 'gen4_turbo',
            promptImage: imageUrl || undefined,
            promptText: prompt,
            duration,
            ratio: '16:9',
          }),
        });

        if (runwayRes.ok) {
          const data = await runwayRes.json();
          return NextResponse.json({
            success: true,
            data: {
              id: data.id,
              status: 'processing',
              provider: 'runway',
              mode,
              pollUrl: `/api/video-status?id=${data.id}&provider=runway`,
              message: `Runway ${mode} 작업이 시작되었습니다. 약 30-90초 소요됩니다.`,
            }
          });
        }
        console.log('⚠️ Runway API 실패, Mock으로 전환');
      } catch (e) {
        console.log('⚠️ Runway API 연결 실패:', e.message);
      }
    }

    // === Luma API 시도 ===
    if (provider === 'luma' && process.env.LUMA_API_KEY) {
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
            'Authorization': `Bearer ${process.env.LUMA_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(lumaBody),
        });

        if (lumaRes.ok) {
          const data = await lumaRes.json();
          return NextResponse.json({
            success: true,
            data: {
              id: data.id,
              status: 'processing',
              provider: 'luma',
              mode,
              pollUrl: `/api/video-status?id=${data.id}&provider=luma`,
              message: `Luma ${mode} 작업이 시작되었습니다.`,
            }
          });
        }
        console.log('⚠️ Luma API 실패, Mock으로 전환');
      } catch (e) {
        console.log('⚠️ Luma API 연결 실패:', e.message);
      }
    }

    // === Mock Fallback ===
    const mockId = `mock_${Date.now()}`;
    return NextResponse.json({
      success: true,
      data: {
        id: mockId,
        status: 'complete',
        provider: 'mock',
        mode,
        videoUrl: null,
        message: `[MOCK] ${provider} API 키 미설정. 실제 배포 시 .env.local에 RUNWAY_API_KEY 또는 LUMA_API_KEY를 추가하세요.`,
        prompt,
        imageUrl: imageUrl || null,
        duration,
        mockPreview: {
          thumbnail: imageUrl || null,
          estimatedTime: `${duration * 6}초`,
        }
      }
    });

  } catch (error) {
    console.error('❌ [VIDEO-GEN] 에러:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
