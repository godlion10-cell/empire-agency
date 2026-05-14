import { NextResponse } from 'next/server';

/**
 * 미들웨어: API 요청 디버깅 + 401 원인 추적
 * 
 * Vercel Deployment Protection이 활성화된 경우 401이 발생할 수 있습니다.
 * 이 미들웨어는 모든 API 요청을 로깅하여 401 원인을 추적합니다.
 * 
 * 참고: Vercel 대시보드 → Settings → Deployment Protection → 
 *       "Standard Protection" → "Only Preview Deployments" 로 설정하면
 *       Production에서 401이 사라집니다.
 */
export function middleware(req) {
  const { pathname } = req.nextUrl;

  // API 라우트 디버깅 로그
  if (pathname.startsWith('/api/')) {
    const authHeader = req.headers.get('authorization');
    const cookie = req.headers.get('cookie');
    const vercelProtection = req.headers.get('x-vercel-protection-bypass');

    console.log(`[MW] ${req.method} ${pathname}`, {
      hasAuth: !!authHeader,
      hasCookie: !!cookie,
      hasVercelBypass: !!vercelProtection,
      origin: req.headers.get('origin') || 'none',
      referer: req.headers.get('referer') || 'none',
    });

    // CORS preflight 허용
    if (req.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }
  }

  // 모든 요청 통과 — 인증은 개별 API 라우트에서 처리
  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
