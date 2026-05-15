import { NextResponse } from 'next/server';
import { notifyVideoComplete } from '@/lib/telegram-notify';

/**
 * GET /api/video-status?id=xxx&provider=runway|luma
 * 
 * 비동기 영상 생성 상태 폴링
 * Runway/Luma는 비동기 처리 → 이 엔드포인트로 상태 확인
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const provider = searchParams.get('provider') || 'runway';

    if (!id) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
    }

    // === Runway Polling ===
    if (provider === 'runway') {
      const apiKey = process.env.RUNWAY_API_KEY;
      if (!apiKey) return NextResponse.json({ success: false, error: 'RUNWAY_API_KEY not set' }, { status: 500 });

      const res = await fetch(`https://api.dev.runwayml.com/v1/tasks/${id}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'X-Runway-Version': '2024-11-06',
        },
      });

      const resText = await res.text();
      console.log(`📡 [RUNWAY POLL] ${id} → Status: ${res.status}`);

      if (!res.ok) {
        return NextResponse.json({ success: false, error: `Runway polling failed: ${res.status}` }, { status: res.status });
      }

      const data = JSON.parse(resText);
      // Runway statuses: PENDING, RUNNING, SUCCEEDED, FAILED
      const statusMap = {
        'PENDING': 'processing',
        'RUNNING': 'processing',
        'SUCCEEDED': 'complete',
        'FAILED': 'error',
      };

      const mappedStatus = statusMap[data.status] || data.status;
      const videoUrl = data.output?.[0] || null;

      // 📨 완료 시 텔레그램 알림
      if (mappedStatus === 'complete' && videoUrl) {
        notifyVideoComplete(
          searchParams.get('title') || 'Runway 영상',
          'runway',
          videoUrl
        ).catch(() => {});
      }

      return NextResponse.json({
        success: true,
        data: {
          id: data.id,
          status: mappedStatus,
          provider: 'runway',
          videoUrl,
          progress: data.progress || 0,
          message: data.status === 'SUCCEEDED'
            ? '✅ 영상 렌더링 완료!'
            : data.status === 'FAILED'
              ? `❌ 렌더링 실패: ${data.failure || 'Unknown error'}`
              : `⏳ 렌더링 중... (${data.status})`,
        }
      });
    }

    // === Luma Polling ===
    if (provider === 'luma') {
      const apiKey = process.env.LUMA_API_KEY;
      if (!apiKey) return NextResponse.json({ success: false, error: 'LUMA_API_KEY not set' }, { status: 500 });

      const res = await fetch(`https://api.lumalabs.ai/dream-machine/v1/generations/${id}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });

      const resText = await res.text();
      console.log(`📡 [LUMA POLL] ${id} → Status: ${res.status}`);

      if (!res.ok) {
        return NextResponse.json({ success: false, error: `Luma polling failed: ${res.status}` }, { status: res.status });
      }

      const data = JSON.parse(resText);
      // Luma statuses: queued, dreaming, completed, failed
      const statusMap = {
        'queued': 'processing',
        'dreaming': 'processing',
        'completed': 'complete',
        'failed': 'error',
      };

      const mappedStatus = statusMap[data.state] || data.state;
      const videoUrl = data.assets?.video || null;

      // 📨 완료 시 텔레그램 알림
      if (mappedStatus === 'complete' && videoUrl) {
        notifyVideoComplete(
          searchParams.get('title') || 'Luma 영상',
          'luma',
          videoUrl
        ).catch(() => {});
      }

      return NextResponse.json({
        success: true,
        data: {
          id: data.id,
          status: mappedStatus,
          provider: 'luma',
          videoUrl,
          progress: data.state === 'completed' ? 100 : data.state === 'dreaming' ? 50 : 10,
          message: data.state === 'completed'
            ? '✅ 영상 렌더링 완료!'
            : data.state === 'failed'
              ? `❌ 렌더링 실패: ${data.failure_reason || 'Unknown error'}`
              : `⏳ 렌더링 중... (${data.state})`,
        }
      });
    }

    return NextResponse.json({ success: false, error: `Unknown provider: ${provider}` }, { status: 400 });

  } catch (error) {
    console.error('❌ [VIDEO-STATUS] 에러:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
