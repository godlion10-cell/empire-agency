import { NextResponse } from 'next/server';

export const maxDuration = 60;

/**
 * GET /api/engine/global-radar
 * 
 * Global Radar — YouTube Data API v3 (2단계 스캔)
 * 1단계: search.list → 50개 영상 ID 수집
 * 2단계: videos.list → 조회수 + 날짜 통계 흡수
 */
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const keyword = searchParams.get('keyword');
  const regionCode = searchParams.get('regionCode') || 'US';
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!keyword) {
    return NextResponse.json({ success: false, error: '검색 키워드가 필요합니다.' }, { status: 400 });
  }

  if (!apiKey) {
    return NextResponse.json({ success: false, error: 'YOUTUBE_API_KEY 환경변수가 설정되지 않았습니다.' }, { status: 500 });
  }

  try {
    console.log(`📡 [RADAR] 1단계 스캔: "${keyword}" in ${regionCode}`);

    // ═══ 1단계: 키워드로 상위 50개 영상 ID 스캔 ═══
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=50&q=${encodeURIComponent(keyword)}&regionCode=${regionCode}&type=video&relevanceLanguage=${regionCode === 'CN' ? 'zh' : regionCode === 'JP' ? 'ja' : regionCode === 'KR' ? 'ko' : 'en'}&key=${apiKey}`;
    const searchRes = await fetch(searchUrl);

    if (!searchRes.ok) {
      const err = await searchRes.json().catch(() => ({}));
      throw new Error(`YouTube Search API ${searchRes.status}: ${err.error?.message || searchRes.statusText}`);
    }

    const searchData = await searchRes.json();
    const items = searchData.items || [];

    if (items.length === 0) {
      return NextResponse.json({ success: true, keyword, regionCode, count: 0, videos: [] });
    }

    // 영상 ID들 쉼표 연결
    const videoIds = items.map(item => item.id.videoId).join(',');

    console.log(`📡 [RADAR] 2단계 통계 흡수: ${items.length}개 영상`);

    // ═══ 2단계: 50개 영상의 조회수 + 날짜 통계 한 번에 흡수 ═══
    const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoIds}&key=${apiKey}`;
    const statsRes = await fetch(statsUrl);

    if (!statsRes.ok) {
      const err = await statsRes.json().catch(() => ({}));
      throw new Error(`YouTube Videos API ${statsRes.status}: ${err.error?.message || statsRes.statusText}`);
    }

    const statsData = await statsRes.json();

    const videos = (statsData.items || []).map(item => ({
      videoId: item.id,
      title: item.snippet.title,
      description: item.snippet.description?.substring(0, 120) || '',
      thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url || '',
      channel: item.snippet.channelTitle,
      publishedAt: item.snippet.publishedAt,
      viewCount: item.statistics?.viewCount || '0',
      likeCount: item.statistics?.likeCount || '0',
      commentCount: item.statistics?.commentCount || '0',
    }));

    console.log(`✅ [RADAR] ${videos.length}개 영상 + 통계 완료 (${regionCode})`);

    return NextResponse.json({
      success: true,
      keyword,
      regionCode,
      count: videos.length,
      videos,
    });
  } catch (error) {
    console.error('❌ [RADAR] 스캔 실패:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
