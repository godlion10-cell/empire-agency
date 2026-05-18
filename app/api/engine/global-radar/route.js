import { NextResponse } from 'next/server';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

/**
 * GET /api/engine/global-radar
 * 
 * Global Radar ??YouTube Data API v3 (2?®Í≥Ñ ?§Ï∫î)
 * 1?®Í≥Ñ: search.list ??50Í∞??ÅÏÉÅ ID ?òÏßë
 * 2?®Í≥Ñ: videos.list ??Ï°∞Ìöå??+ ?†Ïßú ?µÍ≥Ñ ?°Ïàò
 */
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const keyword = searchParams.get('keyword');
  const regionCode = searchParams.get('regionCode') || 'US';
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!keyword) {
    return NextResponse.json({ success: false, error: 'Í≤Ä???§Ïõå?úÍ? ?ÑÏöî?©Îãà??' }, { status: 400 });
  }

  if (!apiKey) {
    return NextResponse.json({ success: false, error: 'YOUTUBE_API_KEY ?òÍ≤ΩÎ≥Ä?òÍ? ?§Ï†ï?òÏ? ?äÏïò?µÎãà??' }, { status: 500 });
  }

  try {
    console.log(`?ì° [RADAR] 1?®Í≥Ñ ?§Ï∫î: "${keyword}" in ${regionCode}`);

    // ?ê‚ïê??1?®Í≥Ñ: ?§Ïõå?úÎ°ú ?ÅÏúÑ 50Í∞??ÅÏÉÅ ID ?§Ï∫î ?ê‚ïê??    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=50&q=${encodeURIComponent(keyword)}&regionCode=${regionCode}&type=video&relevanceLanguage=${regionCode === 'CN' ? 'zh' : regionCode === 'JP' ? 'ja' : regionCode === 'KR' ? 'ko' : 'en'}&key=${apiKey}`;
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

    // ?ÅÏÉÅ ID???ºÌëú ?∞Í≤∞
    const videoIds = items.map(item => item.id.videoId).join(',');

    console.log(`?ì° [RADAR] 2?®Í≥Ñ ?µÍ≥Ñ ?°Ïàò: ${items.length}Í∞??ÅÏÉÅ`);

    // ?ê‚ïê??2?®Í≥Ñ: 50Í∞??ÅÏÉÅ??Ï°∞Ìöå??+ ?†Ïßú ?µÍ≥Ñ ??Î≤àÏóê ?°Ïàò ?ê‚ïê??    const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoIds}&key=${apiKey}`;
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

    console.log(`??[RADAR] ${videos.length}Í∞??ÅÏÉÅ + ?µÍ≥Ñ ?ÑÎ£å (${regionCode})`);

    return NextResponse.json({
      success: true,
      keyword,
      regionCode,
      count: videos.length,
      videos,
    });
  } catch (error) {
    console.error('??[RADAR] ?§Ï∫î ?§Ìå®:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
