import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * GET /api/file?name=xxx
 * 
 * Vercel 서버리스에서 /tmp/renders 파일을 서빙
 */
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get('name');

  if (!name) {
    return NextResponse.json({ error: 'name 파라미터 필요' }, { status: 400 });
  }

  // 경로 이탈 방지
  const safeName = path.basename(name);
  const filePath = path.join(os.tmpdir(), 'renders', safeName);

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: '파일을 찾을 수 없습니다.' }, { status: 404 });
  }

  const ext = path.extname(safeName).toLowerCase();
  const mimeMap = {
    '.mp4': 'video/mp4',
    '.mp3': 'audio/mpeg',
    '.srt': 'text/plain; charset=utf-8',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.webp': 'image/webp',
    '.txt': 'text/plain; charset=utf-8',
  };

  const contentType = mimeMap[ext] || 'application/octet-stream';
  const fileBuffer = fs.readFileSync(filePath);

  return new NextResponse(fileBuffer, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `inline; filename="${safeName}"`,
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
