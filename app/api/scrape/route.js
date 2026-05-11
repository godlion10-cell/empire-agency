import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import { getRenderDir, getPublicUrl, renderFileName } from '@/lib/render-path';

const execAsync = promisify(exec);

/**
 * POST /api/scrape
 * 
 * YouTube URL → 자막 텍스트 추출 → AI 분석용 데이터 반환
 * 
 * Body: { url: string, includeMeta?: boolean }
 */
export async function POST(req) {
  try {
    const { url, includeMeta = false } = await req.json();

    if (!url) {
      return NextResponse.json({ success: false, error: 'URL을 입력해주세요.' }, { status: 400 });
    }

    const renderDir = getRenderDir();
    const scriptPath = path.join(process.cwd(), 'scripts', 'scrape_transcript.py');
    const outputPath = path.join(renderDir, renderFileName('transcript', '.json'));
    const srtPath = path.join(renderDir, renderFileName('caption', '.srt'));

    let cmd = `python "${scriptPath}" --url "${url}" --output "${outputPath}" --srt "${srtPath}"`;
    if (includeMeta) cmd += ' --meta';

    console.log(`🔍 [SCRAPE] 자막 스캔 시작: ${url}`);

    await execAsync(cmd, { timeout: 60000 });

    let result = {};
    if (fs.existsSync(outputPath)) {
      result = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
    }

    console.log(`✅ [SCRAPE] 자막 추출 완료: ${result.segment_count || 0}개 세그먼트`);

    return NextResponse.json({
      success: true,
      data: {
        videoId: result.video_id,
        fullText: result.full_text,
        duration: result.duration_sec,
        wordCount: result.word_count,
        segmentCount: result.segment_count,
        srtPath: getPublicUrl(srtPath),
        metadata: result.metadata || null,
      }
    });
  } catch (error) {
    console.error('❌ [SCRAPE] 에러:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
