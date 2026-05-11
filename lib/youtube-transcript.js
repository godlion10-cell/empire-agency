/**
 * 🏛️ Empire YouTube Transcript — Pure Node.js
 * 
 * 자동 생성 자막(ASR) + 수동 자막 모두 강제 스캔.
 * 3중 폴백: InnerTube(ANDROID) → InnerTube(WEB) → 웹페이지 스크래핑
 * Python 의존성 제로. Vercel 서버리스 완전 호환.
 */

const RE_YOUTUBE = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const RE_XML_TRANSCRIPT = /<text start="([^"]*)" dur="([^"]*)">([^<]*)<\/text>/g;
const INNERTUBE_API_URL = 'https://www.youtube.com/youtubei/v1/player?prettyPrint=false';

/**
 * YouTube URL에서 Video ID 추출
 */
export function extractVideoId(url) {
  if (!url) return null;
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;
  const match = url.match(RE_YOUTUBE);
  return match ? match[1] : null;
}

/**
 * YouTube 자막 추출 — 3중 폴백, ASR 강제 포함
 */
export async function fetchTranscript(urlOrId) {
  const videoId = extractVideoId(urlOrId);
  if (!videoId) throw new Error(`유효한 YouTube URL이 아닙니다: ${urlOrId}`);

  console.log(`🔍 [TRANSCRIPT] 영상 ID: ${videoId}`);

  // ── 폴백 1: InnerTube WEB 클라이언트 ──
  let captionTracks = await getTracksViaInnerTube(videoId, 'WEB', {
    clientName: 'WEB',
    clientVersion: '2.20241126.01.00',
    userAgent: USER_AGENT,
  });

  // ── 폴백 2: InnerTube ANDROID 클라이언트 ──
  if (!captionTracks) {
    console.log('⚠️ WEB 클라이언트 실패, ANDROID 시도...');
    captionTracks = await getTracksViaInnerTube(videoId, 'ANDROID', {
      clientName: 'ANDROID',
      clientVersion: '19.29.37',
      userAgent: 'com.google.android.youtube/19.29.37 (Linux; U; Android 14)',
    });
  }

  // ── 폴백 3: 웹페이지 HTML 스크래핑 ──
  if (!captionTracks) {
    console.log('⚠️ InnerTube 실패, 웹페이지 스크래핑 시도...');
    captionTracks = await getTracksFromPage(videoId);
  }

  if (!captionTracks || captionTracks.length === 0) {
    throw new Error('이 영상에는 자막이 없습니다. (3중 폴백 전부 실패)');
  }

  console.log(`📋 [TRANSCRIPT] 자막 트랙 ${captionTracks.length}개 발견:`,
    captionTracks.map(t => `${t.languageCode}${t.kind === 'asr' ? '(자동)' : '(수동)'} [${t.name?.simpleText || ''}]`).join(', '));

  // 우선순위 기반 트랙 선택
  const track = selectBestTrack(captionTracks);
  console.log(`✅ [TRANSCRIPT] 선택: ${track.languageCode}${track.kind === 'asr' ? '(자동생성)' : '(수동)'}`);

  // 자막 XML 파싱
  const segments = await fetchAndParseTrack(track);

  if (!segments || segments.length === 0) {
    throw new Error('자막 XML 파싱 실패');
  }

  const fullText = segments.map(s => s.text).join(' ');
  const lastSeg = segments[segments.length - 1];

  return {
    video_id: videoId,
    segments,
    full_text: fullText,
    duration_sec: Math.round(lastSeg ? lastSeg.end : 0),
    word_count: fullText.split(/\s+/).length,
    segment_count: segments.length,
    track_lang: track.languageCode,
    track_kind: track.kind || 'manual',
  };
}

/**
 * InnerTube API — 클라이언트별 캡션 트랙 가져오기
 */
async function getTracksViaInnerTube(videoId, label, clientConfig) {
  try {
    const body = {
      context: {
        client: {
          clientName: clientConfig.clientName,
          clientVersion: clientConfig.clientVersion,
        },
      },
      videoId,
    };

    const resp = await fetch(INNERTUBE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': clientConfig.userAgent,
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      console.log(`⚠️ InnerTube(${label}) HTTP ${resp.status}`);
      return null;
    }

    const data = await resp.json();
    const tracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

    if (!tracks || tracks.length === 0) {
      console.log(`⚠️ InnerTube(${label}): captionTracks 없음`);
      return null;
    }

    console.log(`✅ InnerTube(${label}): ${tracks.length}개 트랙 발견`);
    return tracks;
  } catch (err) {
    console.log(`⚠️ InnerTube(${label}) 에러: ${err.message}`);
    return null;
  }
}

/**
 * 웹페이지에서 captionTracks 추출 (폴백)
 */
async function getTracksFromPage(videoId) {
  try {
    const resp = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });
    const html = await resp.text();

    // ytInitialPlayerResponse에서 추출
    let tracks = extractTracksFromJson(html, 'var ytInitialPlayerResponse = ');
    if (tracks) return tracks;

    // ytInitialData에서도 시도
    tracks = extractTracksFromJson(html, 'var ytInitialData = ');
    if (tracks) return tracks;

    // 인라인 JSON 패턴 시도 (일부 페이지에서 다른 형태로 나옴)
    const captionMatch = html.match(/"captionTracks":\s*(\[[\s\S]*?\])\s*,/);
    if (captionMatch) {
      try {
        return JSON.parse(captionMatch[1]);
      } catch {}
    }

    console.log('⚠️ 웹페이지: captionTracks 추출 실패');
    return null;
  } catch (err) {
    console.log(`⚠️ 웹페이지 에러: ${err.message}`);
    return null;
  }
}

function extractTracksFromJson(html, startToken) {
  const startIdx = html.indexOf(startToken);
  if (startIdx === -1) return null;

  const jsonStart = startIdx + startToken.length;
  let depth = 0;
  for (let i = jsonStart; i < Math.min(jsonStart + 500000, html.length); i++) {
    if (html[i] === '{') depth++;
    else if (html[i] === '}') {
      depth--;
      if (depth === 0) {
        try {
          const obj = JSON.parse(html.slice(jsonStart, i + 1));
          const tracks = obj?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
          if (tracks && tracks.length > 0) return tracks;
        } catch {}
        return null;
      }
    }
  }
  return null;
}

/**
 * 우선순위 기반 최적 트랙 선택
 */
function selectBestTrack(tracks) {
  const priority = [
    t => t.languageCode === 'ko' && t.kind !== 'asr',
    t => t.languageCode === 'ko',
    t => t.languageCode?.startsWith('ko'),
    t => t.languageCode === 'en' && t.kind !== 'asr',
    t => t.languageCode === 'en',
    t => t.languageCode?.startsWith('en'),
    t => t.languageCode === 'ja',
    t => t.kind !== 'asr',
    () => true,
  ];

  for (const fn of priority) {
    const found = tracks.find(fn);
    if (found) return found;
  }
  return tracks[0];
}

/**
 * 트랙 URL에서 자막 XML 가져와서 파싱
 */
async function fetchAndParseTrack(track) {
  const resp = await fetch(track.baseUrl, {
    headers: { 'User-Agent': USER_AGENT },
  });
  if (!resp.ok) throw new Error(`자막 XML 요청 실패: HTTP ${resp.status}`);

  const xml = await resp.text();
  return parseTranscriptXml(xml);
}

/**
 * 자막 XML 파싱 (srv3 + classic 둘 다 지원)
 */
function parseTranscriptXml(xml) {
  const results = [];

  // srv3: <p t="ms" d="ms"><s>word</s>...</p>
  const pRegex = /<p\s+t="(\d+)"\s+d="(\d+)"[^>]*>([\s\S]*?)<\/p>/g;
  let match;
  while ((match = pRegex.exec(xml)) !== null) {
    const startMs = parseInt(match[1], 10);
    const durMs = parseInt(match[2], 10);
    const inner = match[3];

    let text = '';
    const sRegex = /<s[^>]*>([^<]*)<\/s>/g;
    let sMatch;
    while ((sMatch = sRegex.exec(inner)) !== null) {
      text += sMatch[1];
    }
    if (!text) text = inner.replace(/<[^>]+>/g, '');
    text = decodeEntities(text).trim();

    if (text) {
      results.push({
        start: Math.round(startMs / 10) / 100,
        end: Math.round((startMs + durMs) / 10) / 100,
        text,
      });
    }
  }
  if (results.length > 0) return results;

  // classic: <text start="s" dur="s">content</text>
  const classicResults = [...xml.matchAll(RE_XML_TRANSCRIPT)];
  return classicResults.map(r => ({
    start: Math.round(parseFloat(r[1]) * 100) / 100,
    end: Math.round((parseFloat(r[1]) + parseFloat(r[2])) * 100) / 100,
    text: decodeEntities(r[3]).trim(),
  }));
}

function decodeEntities(text) {
  return text
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)));
}

/**
 * segments → SRT 문자열 변환
 */
export function segmentsToSrt(segments) {
  return segments.map((seg, i) => {
    const start = formatSrtTime(seg.start);
    const end = formatSrtTime(seg.end);
    return `${i + 1}\n${start} --> ${end}\n${seg.text}\n`;
  }).join('\n');
}

function formatSrtTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}
