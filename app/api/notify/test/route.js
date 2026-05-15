import { NextResponse } from 'next/server';
import { notifyStageComplete } from '@/lib/telegram-notify';

/**
 * POST /api/notify/test
 * 
 * 텔레그램 알림 테스트 엔드포인트
 * Body: { title?: string, stage?: string, detail?: string }
 */
export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const title = body.title || 'Empire Test';
    const stage = body.stage || 'COMPLETE';
    const detail = body.detail || '테스트 알림입니다.';

    const success = await notifyStageComplete(title, stage, detail);

    return NextResponse.json({
      success,
      message: success ? '텔레그램 알림 전송 완료' : '텔레그램 설정 확인 필요 (TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID)',
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
