/**
 * 🏛️ Empire Render Path Utility
 * 
 * Vercel 서버리스 환경: /tmp/renders (읽기/쓰기 가능한 유일한 경로)
 * 로컬 개발 환경: public/renders (브라우저에서 직접 접근 가능)
 */
import fs from 'fs';
import path from 'path';
import os from 'os';

const IS_VERCEL = process.env.VERCEL === '1' || process.env.VERCEL_ENV;

/**
 * 렌더링 결과물 저장 디렉토리 반환
 * - Vercel: /tmp/renders
 * - 로컬: <cwd>/public/renders
 */
export function getRenderDir() {
  const dir = IS_VERCEL
    ? path.join(os.tmpdir(), 'renders')
    : path.join(process.cwd(), 'public', 'renders');

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * 렌더링 파일의 공개 URL 경로 반환
 * - Vercel: /api/file?name=xxx (API를 통한 서빙 필요)
 * - 로컬: /renders/xxx
 */
export function getPublicUrl(filePath) {
  if (IS_VERCEL) {
    const filename = path.basename(filePath);
    return `/api/file?name=${encodeURIComponent(filename)}`;
  }
  return filePath.replace(path.join(process.cwd(), 'public'), '');
}

/**
 * 타임스탬프 기반 파일명 생성
 */
export function renderFileName(prefix, ext) {
  return `${prefix}_${Date.now()}${ext}`;
}
