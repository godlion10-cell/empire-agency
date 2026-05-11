/**
 * 🏛️ Empire YouTube Transcript — Pure Node.js
 * 
 * Python 의존성 제거. 메모리 내 처리. Vercel 서버리스 완전 호환.
 */
import { YoutubeTranscript } from 'youtube-transcript';

/**
 * YouTube URL에서 Video ID 추출
 */
export function extractVideoId(url) {
  const patterns = [
    /(?:v=|\/v\/|youtu\.be\/|\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const p of patterns) {
    const match = url.match(p);
    if (match) return match[1];
  }
  return null;
}

/**
 * YouTube 자막 추출 (순수 Node.js — 파일 저장 없이 메모리에서 처리)
 * 
 * @param {string} urlOrId - YouTube URL 또는 Video ID
 * @param {object} options - { lang: 'ko' }
 * @returns {object} { videoId, segments, fullText, duration_sec, word_count, segment_count }
 */
export async function fetchTranscript(urlOrId, options = {}) {
  const videoId = extractVideoId(urlOrId) || urlOrId;
  const lang = options.lang || 'ko';

  let segments;
  try {
    // 한국어 자막 시도
    segments = await YoutubeTranscript.fetchTranscript(videoId, { lang });
  } catch (e) {
    // 한국어 실패 시 영어 시도
    try {
      segments = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'en' });
    } catch (e2) {
      // 언어 지정 없이 기본 자막 시도
      segments = await YoutubeTranscript.fetchTranscript(videoId);
    }
  }

  if (!segments || segments.length === 0) {
    throw new Error('자막을 찾을 수 없습니다. 자막이 있는 영상인지 확인해주세요.');
  }

  // 자막 데이터 정리
  const cleanSegments = segments.map(s => ({
    start: Math.round(s.offset / 1000 * 100) / 100,  // ms → sec
    end: Math.round((s.offset + s.duration) / 1000 * 100) / 100,
    text: s.text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"').trim(),
  }));

  const fullText = cleanSegments.map(s => s.text).join(' ');
  const lastSeg = cleanSegments[cleanSegments.length - 1];
  const duration = lastSeg ? lastSeg.end : 0;

  return {
    video_id: videoId,
    segments: cleanSegments,
    full_text: fullText,
    duration_sec: Math.round(duration),
    word_count: fullText.split(/\s+/).length,
    segment_count: cleanSegments.length,
  };
}

/**
 * 자막 데이터 → SRT 문자열 변환 (메모리 내)
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
