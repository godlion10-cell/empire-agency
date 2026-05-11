import { NextResponse } from 'next/server';
import { fetchTranscript, segmentsToSrt } from '@/lib/youtube-transcript';
import { getRenderDir, getPublicUrl, renderFileName } from '@/lib/render-path';
import fs from 'fs';
import path from 'path';

// Vercel 서버리스 타임아웃 확장 (Gemini Level 3 분석용)
export const maxDuration = 60;

/**
 * POST /api/scrape
 * 
 * YouTube URL → 자막 추출 (순수 Node.js — Python 의존성 제거)
 * 메모리 내 처리, 파일 I/O 최소화
 * 
 * Body: { url: string, saveSrt?: boolean }
 */
export async function POST(req) {
  try {
    const { url, saveSrt = false } = await req.json();

    if (!url) {
      return NextResponse.json({ success: false, error: 'URL을 입력해주세요.' }, { status: 400 });
    }

    console.log(`🔍 [SCRAPE] 자막 스캔 시작: ${url}`);

    const data = await fetchTranscript(url);

    console.log(`✅ [SCRAPE] 자막 추출 완료: ${data.segment_count}개 세그먼트, ${data.duration_sec}초`);

    // SRT 파일 저장 (요청 시에만)
    let srtUrl = null;
    if (saveSrt) {
      const renderDir = getRenderDir();
      const srtPath = path.join(renderDir, renderFileName('caption', '.srt'));
      fs.writeFileSync(srtPath, segmentsToSrt(data.segments), 'utf-8');
      srtUrl = getPublicUrl(srtPath);
    }

    return NextResponse.json({
      success: true,
      data: {
        videoId: data.video_id,
        fullText: data.full_text,
        duration: data.duration_sec,
        wordCount: data.word_count,
        segmentCount: data.segment_count,
        segments: data.segments,
        srtUrl,
      }
    });
  } catch (error) {
    console.error('❌ [SCRAPE] 에러:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
