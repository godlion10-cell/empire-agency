import { NextResponse } from 'next/server';
import { notifyStageComplete, notifyVideoComplete } from '@/lib/telegram-notify';
import { evaluateVideoResponse } from '@/lib/qa-engine';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

/**
 * POST /api/video-generate
 * 
 * ?´ë?ì§€ ???ìƒ ë³€??(Runway/Luma Image-to-Video)
 * ?´ë?ì§€ ?†ì´ ?ìŠ¤?¸ë§Œ ??Text-to-Video
 * 
 * Body: { prompt, imageUrl?, provider?: 'runway'|'luma', duration?: 5|10 }
 */
export async function POST(req) {
  try {
    const { prompt, imageUrl, provider = 'runway', duration = 5 } = await req.json();

    if (!prompt) {
      return NextResponse.json({ success: false, error: '?„ë¡¬?„íŠ¸ê°€ ?„ìš”?©ë‹ˆ??' }, { status: 400 });
    }

    const mode = imageUrl ? 'image-to-video' : 'text-to-video';
    console.log(`?¬ [VIDEO-GEN] ${provider.toUpperCase()} ${mode} | Duration: ${duration}s`);
    console.log(`   Prompt: ${prompt.substring(0, 80)}...`);
    if (imageUrl) console.log(`   Image: ${imageUrl.substring(0, 60)}...`);

    // === Runway API ===
    if (provider === 'runway') {
      const apiKey = process.env.RUNWAY_API_KEY;
      if (!apiKey) {
        console.log('? ï¸ RUNWAY_API_KEY ë¯¸ì„¤??);
        return mockResponse(provider, mode, prompt, imageUrl, duration, 'RUNWAY_API_KEYê°€ .env.local???¤ì •?˜ì? ?Šì•˜?µë‹ˆ??');
      }

      try {
        const runwayBody = {
          model: 'gen4_turbo',
          promptText: prompt,
          duration,
          ratio: '720:1280', // ?í¼ ?¸ë¡œ ë¹„ìœ¨
        };
        // promptImage???¤ì œ URL???ˆì„ ?Œë§Œ ?¬í•¨ (undefined ?„ì†¡ ë°©ì?)
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
        console.log(`?¬ [RUNWAY] Status: ${runwayRes.status} | Response: ${resText.substring(0, 300)}`);

        if (runwayRes.ok) {
          const data = JSON.parse(resText);
          const responsePayload = {
            success: true,
            data: {
              id: data.id,
              status: 'processing',
              provider: 'runway',
              mode,
              message: `??Runway ${mode} ?‘ì—…???œì‘?˜ì—ˆ?µë‹ˆ?? ??30-90ì´??Œìš”?©ë‹ˆ??`,
            }
          };
          // ?›¡ï¸?Gate 3: Video Response QC
          const g3 = evaluateVideoResponse(responsePayload);
          console.log(`?›¡ï¸?[G3-VIDEO] Runway: ${g3.pass ? '??PASS' : '??' + g3.reason}`);
          // ?“¬ ?Œë”ë§??œì‘ ?Œë¦¼
          notifyStageComplete(prompt.substring(0, 30), 'VIDEO', `Runway ${mode} ?œì‘ ??ID: ${data.id}`).catch(() => {});
          return NextResponse.json(responsePayload);
        } else {
          // API ?¸ì¶œ?€ ?ì?ë§??ëŸ¬ ë°˜í™˜
          let errorDetail;
          try { errorDetail = JSON.parse(resText); } catch { errorDetail = { message: resText }; }
          console.error('??[RUNWAY] API ?ëŸ¬:', errorDetail);
          return NextResponse.json({
            success: false,
            error: `Runway API ?ëŸ¬ (${runwayRes.status}): ${errorDetail.error || errorDetail.message || resText.substring(0, 200)}`,
            detail: errorDetail,
          }, { status: runwayRes.status });
        }
      } catch (e) {
        console.error('??[RUNWAY] ?°ê²° ?¤íŒ¨:', e.message);
        return NextResponse.json({
          success: false,
          error: `Runway ?°ê²° ?¤íŒ¨: ${e.message}`,
        }, { status: 502 });
      }
    }

    // === Luma API ===
    if (provider === 'luma') {
      const apiKey = process.env.LUMA_API_KEY;
      if (!apiKey) {
        console.log('? ï¸ LUMA_API_KEY ë¯¸ì„¤??);
        return mockResponse(provider, mode, prompt, imageUrl, duration, 'LUMA_API_KEYê°€ .env.local???¤ì •?˜ì? ?Šì•˜?µë‹ˆ??');
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
        console.log(`?¬ [LUMA] Status: ${lumaRes.status} | Response: ${resText.substring(0, 300)}`);

        if (lumaRes.ok) {
          const data = JSON.parse(resText);
          // ?“¬ ?Œë”ë§??œì‘ ?Œë¦¼
          notifyStageComplete(prompt.substring(0, 30), 'VIDEO', `Luma ${mode} ?œì‘ ??ID: ${data.id}`).catch(() => {});
          return NextResponse.json({
            success: true,
            data: {
              id: data.id,
              status: 'processing',
              provider: 'luma',
              mode,
              message: `??Luma ${mode} ?‘ì—…???œì‘?˜ì—ˆ?µë‹ˆ??`,
            }
          });
        } else {
          let errorDetail;
          try { errorDetail = JSON.parse(resText); } catch { errorDetail = { message: resText }; }
          console.error('??[LUMA] API ?ëŸ¬:', errorDetail);
          return NextResponse.json({
            success: false,
            error: `Luma API ?ëŸ¬ (${lumaRes.status}): ${errorDetail.error || errorDetail.message || resText.substring(0, 200)}`,
            detail: errorDetail,
          }, { status: lumaRes.status });
        }
      } catch (e) {
        console.error('??[LUMA] ?°ê²° ?¤íŒ¨:', e.message);
        return NextResponse.json({
          success: false,
          error: `Luma ?°ê²° ?¤íŒ¨: ${e.message}`,
        }, { status: 502 });
      }
    }

    // Unknown provider
    return mockResponse(provider, mode, prompt, imageUrl, duration, `?????†ëŠ” provider: ${provider}`);

  } catch (error) {
    console.error('??[VIDEO-GEN] ?ëŸ¬:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/** Mock ?‘ë‹µ ?¬í¼ */
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
        estimatedTime: `${duration * 6}ì´?,
      }
    }
  });
}
