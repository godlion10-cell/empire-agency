/**
 * 🏛️ Empire Analyzer Utilities — Adaptive Time-Chunking Engine
 * 
 * 중앙 분석 유틸리티: 모든 모듈(DNA, Planning, Visual)이 공유
 * 영상 길이에 따라 분석 해상도를 자동 조절합니다.
 * 
 * 30s 숏폼 → 5초 단위 초정밀 분석 (ULTRA_HIGH)
 * 10분 영상 → 30초 단위 균형 분석 (HIGH)
 * 30분 영상 → 120초 단위 전략 분석 (BALANCED)
 * 60분+ → 300초 단위 핵심 추출 (STRATEGIC)
 */

/**
 * 영상 길이 기반 분석 설정 반환
 * @param {number} durationSec - 영상 길이 (초)
 * @returns {{ interval: number, resolution: string, label: string, maxSegments: number }}
 */
export function getAnalysisConfig(durationSec) {
  if (durationSec <= 60) {
    return { interval: 5, resolution: 'ULTRA_HIGH', label: '숏폼 초정밀', maxSegments: 12 };
  }
  if (durationSec <= 300) {
    return { interval: 15, resolution: 'HIGH', label: '숏폼 정밀', maxSegments: 20 };
  }
  if (durationSec <= 600) {
    return { interval: 30, resolution: 'HIGH', label: '중편 정밀', maxSegments: 20 };
  }
  if (durationSec <= 1800) {
    return { interval: 120, resolution: 'BALANCED', label: '중편 균형', maxSegments: 15 };
  }
  if (durationSec <= 3600) {
    return { interval: 300, resolution: 'STRATEGIC', label: '장편 전략', maxSegments: 12 };
  }
  return { interval: 600, resolution: 'STRATEGIC', label: '초장편 핵심', maxSegments: 10 };
}

/**
 * 자막 세그먼트를 시간 구간별로 청크 분할
 * @param {Array<{start: number, end: number, text: string}>} segments - 원본 자막
 * @param {number} durationSec - 영상 총 길이 (초)
 * @returns {Array<{index: number, timestamp: number, timeLabel: string, endTime: number, content: string, wordCount: number, resolution: string}>}
 */
export function segmentTranscript(segments, durationSec) {
  const config = getAnalysisConfig(durationSec);
  const { interval, resolution } = config;
  const chunks = [];
  const effectiveDuration = durationSec || (segments.length > 0 ? segments[segments.length - 1].end : 0);

  for (let i = 0; i < effectiveDuration; i += interval) {
    const chunkEnd = Math.min(i + interval, effectiveDuration);

    // 이 시간 구간에 속하는 모든 자막 수집
    const chunkSegments = segments.filter(s => {
      const segStart = s.start || 0;
      return segStart >= i && segStart < chunkEnd;
    });

    const content = chunkSegments.map(s => s.text).join(' ').trim();

    if (content) {
      chunks.push({
        index: chunks.length,
        timestamp: i,
        timeLabel: formatTimeLabel(i),
        endTime: chunkEnd,
        endLabel: formatTimeLabel(chunkEnd),
        content,
        wordCount: content.split(/\s+/).length,
        resolution,
        originalSegments: chunkSegments.length,
      });
    }
  }

  return chunks;
}

/**
 * 초를 M:SS 형식으로 변환
 * @param {number} seconds
 * @returns {string}
 */
function formatTimeLabel(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * 적응형 분석 결과 생성 (통합 JSON 구조)
 * 모든 다운스트림 모듈이 이 구조를 사용합니다.
 * 
 * @param {Object} transcriptResult - fetchTranscript() 반환값
 * @returns {{ config, segments, meta }}
 */
export function buildAnalysisPayload(transcriptResult) {
  const { segments: rawSegments, duration_sec, video_id, source, full_text } = transcriptResult;
  const config = getAnalysisConfig(duration_sec);
  const adaptiveSegments = segmentTranscript(rawSegments, duration_sec);

  return {
    config: {
      interval: config.interval,
      resolution: config.resolution,
      label: config.label,
      maxSegments: config.maxSegments,
    },
    segments: adaptiveSegments,
    meta: {
      videoId: video_id,
      durationSec: duration_sec,
      totalChunks: adaptiveSegments.length,
      totalWords: adaptiveSegments.reduce((sum, s) => sum + s.wordCount, 0),
      source,
      rawSegmentCount: rawSegments.length,
      fullTextLength: full_text?.length || 0,
    },
  };
}

/**
 * 세그먼트 배열을 LLM 프롬프트용 텍스트로 변환
 * Planning/Visual 모듈에서 사용
 * 
 * @param {Array} adaptiveSegments - segmentTranscript 반환값
 * @returns {string} 타임스탬프 포함 텍스트
 */
export function segmentsToPromptText(adaptiveSegments) {
  return adaptiveSegments
    .map(s => `[${s.timeLabel}~${s.endLabel}] ${s.content}`)
    .join('\n');
}

/**
 * 세그먼트에서 핵심 구간 자동 추출 (Hook, Climax, CTA)
 * Visual 모듈에서 어떤 시점의 비주얼을 생성할지 결정
 * 
 * @param {Array} adaptiveSegments
 * @returns {{ hook: Object, body: Array, climax: Object }}
 */
export function extractKeyMoments(adaptiveSegments) {
  if (!adaptiveSegments || adaptiveSegments.length === 0) {
    return { hook: null, body: [], climax: null };
  }

  return {
    hook: adaptiveSegments[0], // 첫 청크 = 후크
    body: adaptiveSegments.slice(1, -1), // 중간 = 본문
    climax: adaptiveSegments.length > 1 ? adaptiveSegments[adaptiveSegments.length - 1] : null, // 마지막 = 클라이맥스/CTA
  };
}
