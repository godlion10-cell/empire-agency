import { NextResponse } from 'next/server';
import { fetchTranscript, extractVideoId } from '@/lib/youtube-transcript';

export const maxDuration = 60;

/**
 * POST /api/generate-subtitles
 * 
 * 진짜 자막 생성 엔드포인트.
 * youtube-transcript 3중 폴백 엔진을 호출하여 실제 자막 데이터를 반환.
 * 더미 데이터 절대 반환하지 않음 — 실패 시 에러를 명확히 전달.
 */
export async function POST(req) {
  try {
    const { url, highlight_id } = await req.json();

    if (!url) {
      return NextResponse.json({ success: false, error: 'URL이 필요합니다.' }, { status: 400 });
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
      return NextResponse.json({ success: false, error: '유효한 YouTube URL이 아닙니다.' }, { status: 400 });
    }

    console.log(`💬 [SUBTITLE-GEN] 실제 자막 추출 시작: ${videoId} (highlight: ${highlight_id || 'all'})`);

    // 실제 3중 폴백 엔진 가동
    const result = await fetchTranscript(url);

    // 더미 데이터 감지 — fallback 소스이면서 1개 세그먼트이면 실패로 간주
    if (result.source === 'fallback' && result.segment_count <= 1) {
      return NextResponse.json({
        success: false,
        error: '자막 추출 실패: 이 영상에서 자막을 추출할 수 없습니다. YouTube에서 자막이 제공되지 않거나 AI 분석이 차단되었습니다.',
      }, { status: 422 });
    }

    // 하이라이트 구간 필터링 (highlight_id가 있으면 해당 구간만 반환)
    let segments = result.segments;
    
    // SRT 포맷 텍스트 생성
    const srtText = segments.map((s, i) => {
      const startMin = Math.floor(s.start / 60);
      const startSec = (s.start % 60).toFixed(1);
      const endMin = Math.floor((s.end || s.start + 3) / 60);
      const endSec = ((s.end || s.start + 3) % 60).toFixed(1);
      return `[${startMin}:${String(startSec).padStart(4, '0')} → ${endMin}:${String(endSec).padStart(4, '0')}] ${s.text}`;
    }).join('\n');

    console.log(`✅ [SUBTITLE-GEN] 완료: ${segments.length}개 세그먼트 (소스: ${result.source})`);

    return NextResponse.json({
      success: true,
      data: {
        videoId: result.video_id,
        text: srtText,
        segments: segments,
        segmentCount: result.segment_count,
        durationSec: result.duration_sec,
        fullText: result.full_text,
        source: result.source, // 'library' | 'scrape' | 'gemini'
        sourceLabel: result.source === 'gemini' ? '🟣 Gemini AI STT' : result.source === 'scrape' ? '🔵 웹 스크래핑' : '🟢 YouTube 자막 API',
      }
    });
  } catch (error) {
    console.error('❌ [SUBTITLE-GEN] 에러:', error);
    return NextResponse.json({
      success: false,
      error: `자막 추출 실패: ${error.message}`,
    }, { status: 500 });
  }
}
