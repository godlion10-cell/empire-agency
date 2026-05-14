import { NextResponse } from 'next/server';

/**
 * GET /api/engine/global-radar
 * 
 * Global Radar — YouTube Data API v3 검색
 * 키워드 + 지역코드로 트렌딩 영상 50개를 스캔합니다.
 * 자막 추출은 하지 않음 — 프리뷰 전용.
 * 
 * Query: ?keyword=AI+marketing&regionCode=US
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

  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=50&q=${encodeURIComponent(keyword)}&regionCode=${regionCode}&type=video&relevanceLanguage=${regionCode === 'CN' ? 'zh' : regionCode === 'JP' ? 'ja' : regionCode === 'KR' ? 'ko' : 'en'}&key=${apiKey}`;

  try {
    console.log(`📡 [RADAR] 스캔 시작: "${keyword}" in ${regionCode}`);
    const response = await fetch(url);

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`YouTube API ${response.status}: ${err.error?.message || response.statusText}`);
    }

    const data = await response.json();

    const videos = (data.items || []).map(item => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      description: item.snippet.description?.substring(0, 120) || '',
      thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url || '',
      channel: item.snippet.channelTitle,
      publishedAt: item.snippet.publishedAt,
    }));

    console.log(`✅ [RADAR] ${videos.length}개 영상 발견 (${regionCode})`);

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
