import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { password } = await req.json();
    
    // 서버사이드 비번 검증 — 클라이언트에 비번 노출 방지
    const MASTER_PW = process.env.SHADOW_MASTER_PW || "49581";
    
    if (password === MASTER_PW) {
      return NextResponse.json({ 
        success: true, 
        token: Buffer.from(`shadow_${Date.now()}_${MASTER_PW}`).toString('base64'),
        message: '쉐도우 룸 보안 해제 완료'
      });
    } else {
      // 침입 시도 로깅
      console.warn(`⚠️ [SECURITY] 잘못된 쉐도우 룸 접근 시도: ${new Date().toISOString()}`);
      return NextResponse.json({ 
        success: false, 
        error: '잘못된 패스워드입니다. 침입 시도가 기록되었습니다.'
      }, { status: 403 });
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
