/**
 * 🏛️ Empire YouTube Transcript — Pure Node.js
 * 
 * 자동 생성 자막(ASR) + 수동 자막 모두 강제 스캔.
 * Python 의존성 제로. Vercel 서버리스 완전 호환.
 */

const RE_YOUTUBE = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.83 Safari/537.36,gzip(gfe)';
const RE_XML_TRANSCRIPT = /<text start="([^"]*)" dur="([^"]*)">([^<]*)<\/text>/g;
const INNERTUBE_API_URL = 'https://www.youtube.com/youtubei/v1/player?prettyPrint=false';
const INNERTUBE_CLIENT_VERSION = '20.10.38';
const INNERTUBE_CONTEXT = {
  client: { clientName: 'ANDROID', clientVersion: INNERTUBE_CLIENT_VERSION },
};
const INNERTUBE_USER_AGENT = `com.google.android.youtube/${INNERTUBE_CLIENT_VERSION} (Linux; U; Android 14)`;

/**
 * YouTube URL에서 Video ID 추출
 */
export function extractVideoId(url) {
  if (url.length === 11) return url;
  const match = url.match(RE_YOUTUBE);
  return match ? match[1] : null;
}

/**
 * YouTube 자막 추출 — 자동 생성 자막(ASR) 포함 강제 스캔
 * 
 * 우선순위:
 * 1. 한국어 수동 자막 (ko)
 * 2. 한국어 자동 생성 자막 (ko, kind=asr)
 * 3. 영어 수동 자막 (en)
 * 4. 영어 자동 생성 자막 (en, kind=asr)
 * 5. 아무 자막이나 첫 번째 트랙
 */
export async function fetchTranscript(urlOrId) {
  const videoId = extractVideoId(urlOrId);
  if (!videoId) throw new Error(`유효한 YouTube URL이 아닙니다: ${urlOrId}`);

  // Step 1: InnerTube API로 전체 캡션 트랙 목록 가져오기
  let captionTracks = await getCaptionTracks(videoId);

  if (!captionTracks || captionTracks.length === 0) {
    // Step 2: 웹페이지 폴백
    captionTracks = await getCaptionTracksFromPage(videoId);
  }

  if (!captionTracks || captionTracks.length === 0) {
    throw new Error('이 영상에는 자막이 없습니다.');
  }

  console.log(`📋 [TRANSCRIPT] 사용 가능 자막 ${captionTracks.length}개:`, 
    captionTracks.map(t => `${t.languageCode}${t.kind === 'asr' ? '(자동)' : '(수동)'}`).join(', '));

  // Step 3: 우선순위 기반 트랙 선택
  const track = selectBestTrack(captionTracks);

  console.log(`✅ [TRANSCRIPT] 선택된 트랙: ${track.languageCode}${track.kind === 'asr' ? '(자동생성)' : '(수동)'}`);

  // Step 4: 선택된 트랙의 자막 XML 가져와서 파싱
  const segments = await fetchAndParseTrack(track);

  if (!segments || segments.length === 0) {
    throw new Error('자막 데이터 파싱 실패');
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
 * InnerTube API로 캡션 트랙 목록 가져오기
 */
async function getCaptionTracks(videoId) {
  try {
    const resp = await fetch(INNERTUBE_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': INNERTUBE_USER_AGENT },
      body: JSON.stringify({ context: INNERTUBE_CONTEXT, videoId }),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return data?.captions?.playerCaptionsTracklistRenderer?.captionTracks || null;
  } catch {
    return null;
  }
}

/**
 * 웹페이지에서 캡션 트랙 목록 가져오기 (폴백)
 */
async function getCaptionTracksFromPage(videoId) {
  try {
    const resp = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: { 'User-Agent': USER_AGENT },
    });
    const html = await resp.text();
    
    const startToken = 'var ytInitialPlayerResponse = ';
    const startIdx = html.indexOf(startToken);
    if (startIdx === -1) return null;

    const jsonStart = startIdx + startToken.length;
    let depth = 0;
    for (let i = jsonStart; i < html.length; i++) {
      if (html[i] === '{') depth++;
      else if (html[i] === '}') {
        depth--;
        if (depth === 0) {
          const playerResponse = JSON.parse(html.slice(jsonStart, i + 1));
          return playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks || null;
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * 우선순위 기반 최적 트랙 선택
 * 수동 자막 우선, 자동 생성 자막도 반드시 포함
 */
function selectBestTrack(tracks) {
  const priority = [
    // 1. 한국어 수동 자막
    t => t.languageCode === 'ko' && t.kind !== 'asr',
    // 2. 한국어 자동 생성 자막
    t => t.languageCode === 'ko' && t.kind === 'asr',
    // 3. 한국어 코드 변형 (ko-KR 등)
    t => t.languageCode.startsWith('ko') && t.kind !== 'asr',
    t => t.languageCode.startsWith('ko'),
    // 4. 영어 수동
    t => t.languageCode === 'en' && t.kind !== 'asr',
    // 5. 영어 자동 생성
    t => t.languageCode === 'en' && t.kind === 'asr',
    t => t.languageCode.startsWith('en'),
    // 6. 일본어
    t => t.languageCode === 'ja',
    // 7. 아무거나 수동
    t => t.kind !== 'asr',
    // 8. 아무거나 자동
    () => true,
  ];

  for (const predicate of priority) {
    const found = tracks.find(predicate);
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
  if (!resp.ok) throw new Error(`자막 데이터 요청 실패: ${resp.status}`);
  
  const xml = await resp.text();
  return parseTranscriptXml(xml);
}

/**
 * 자막 XML 파싱 (srv3 + classic 둘 다 지원)
 */
function parseTranscriptXml(xml) {
  const results = [];

  // srv3 형식: <p t="ms" d="ms"><s>word</s>...</p>
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

  // classic 형식: <text start="s" dur="s">content</text>
  const classicResults = [...xml.matchAll(RE_XML_TRANSCRIPT)];
  return classicResults.map(r => ({
    start: Math.round(parseFloat(r[1]) * 100) / 100,
    end: Math.round((parseFloat(r[1]) + parseFloat(r[2])) * 100) / 100,
    text: decodeEntities(r[3]).trim(),
  }));
}

function decodeEntities(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)));
}

/**
 * 자막 segments → SRT 문자열 변환
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
