import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { fetchTranscript } from '@/lib/youtube-transcript';
import {
  buildAnalysisPayload,
  segmentsToPromptText,
  extractKeyMoments,
  getAnalysisConfig,
} from '@/lib/analyzer-utils';
import supabase from '@/lib/supabase';

export const maxDuration = 60;

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * POST /api/analyze
 * 
 * ═══ Universal Adaptive Analysis Engine ═══
 * 
 * 모든 파이프라인 모듈이 사용하는 통합 분석 엔드포인트.
 * 영상 길이에 따라 자동으로 해상도를 조절합니다.
 * 
 * Body: {
 *   videoUrl: string,          - YouTube URL (required)
 *   projectId?: string,        - Supabase 프로젝트 ID (있으면 자동 저장)
 *   videoTitle?: string,       - 영상 제목 (메타데이터)
 *   channelName?: string,      - 채널명 (메타데이터)
 *   analysisDepth?: 'fast'|'deep', - 분석 깊이 (기본: deep)
 * }
 * 
 * Returns: {
 *   success: true,
 *   analysis: {
 *     config: { interval, resolution, label },
 *     segments: [ { index, timestamp, timeLabel, content, wordCount } ],
 *     meta: { videoId, durationSec, totalChunks, source },
 *     llm: { hookAnalysis, strategyMap, visualPotential, keyMoments }
 *   }
 * }
 */
export async function POST(req) {
  try {
    const body = await req.json();
    const { videoUrl, projectId, videoTitle, channelName, analysisDepth = 'deep' } = body;

    if (!videoUrl) {
      return NextResponse.json({ success: false, error: 'videoUrl이 필요합니다.' }, { status: 400 });
    }

    console.log(`🔬 [ANALYZE] Adaptive Analysis 시작 — ${videoUrl}`);

    // ════════════════════════════════════
    // Step 1: 자막 추출 (3중 폴백 엔진)
    // ════════════════════════════════════
    const transcript = await fetchTranscript(videoUrl);
    console.log(`📄 [ANALYZE] 추출 완료: ${transcript.segment_count}seg, ${transcript.duration_sec}s, via ${transcript.source}`);

    // ════════════════════════════════════
    // Step 2: 적응형 세그먼트 생성
    // ════════════════════════════════════
    const analysisPayload = buildAnalysisPayload(transcript);
    const { config, segments, meta } = analysisPayload;
    console.log(`📊 [ANALYZE] 청킹: ${config.resolution} (${config.interval}s 간격) → ${segments.length}개 청크`);

    // ════════════════════════════════════
    // Step 3: LLM 심층 분석 (Gemini)
    // ════════════════════════════════════
    let llmAnalysis = null;

    if (analysisDepth === 'deep' && segments.length > 0) {
      const timestampedText = segmentsToPromptText(segments);
      const keyMoments = extractKeyMoments(segments);

      const prompt = `You are an expert content analyst for short-form viral video production.
Analyze the following timestamped transcript segments and return a JSON analysis.

[Analysis Config]
- Video Duration: ${meta.durationSec}s
- Resolution: ${config.resolution} (${config.interval}s interval)
- Total Chunks: ${segments.length}
${videoTitle ? `- Video Title: "${videoTitle}"` : ''}
${channelName ? `- Channel: ${channelName}` : ''}

[Timestamped Transcript]
${timestampedText.substring(0, 6000)}

[Tasks]
1. **hookAnalysis**: Analyze the FIRST segment (Hook). Rate its strength 1-10. Suggest an improved hook.
2. **strategyMap**: For EACH segment, assign a content strategy label: "HOOK", "TENSION", "VALUE", "PROOF", "CTA", "FILLER"
3. **visualPotential**: For each segment, suggest a Midjourney-style visual prompt that matches the content mood.
4. **keyMoments**: Identify the 3 most impactful moments with timestamps.
5. **emotionArc**: Map the emotional journey: segment index → emotion (curiosity, fear, desire, trust, urgency)
6. **adaptedCopy**: Generate 3 Korean short-form ad copies (15s, 30s, 60s) using the best moments.

Return as JSON with these exact keys: hookAnalysis, strategyMap, visualPotential, keyMoments, emotionArc, adaptedCopy`;

      try {
        const response = await genAI.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [{ parts: [{ text: prompt }] }],
          config: {
            responseMimeType: 'application/json',
            temperature: 0.4,
          },
        });

        const text = response.text || response.candidates?.[0]?.content?.parts?.[0]?.text;
        const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        llmAnalysis = JSON.parse(cleaned);
        console.log(`🧠 [ANALYZE] LLM 분석 완료: ${Object.keys(llmAnalysis).length}개 분석 축`);
      } catch (llmErr) {
        console.error(`⚠️ [ANALYZE] LLM 분석 실패:`, llmErr.message);
        llmAnalysis = { error: llmErr.message, partial: true };
      }
    }

    // ════════════════════════════════════
    // Step 4: Supabase 자동 저장 (projectId가 있으면)
    // ════════════════════════════════════
    if (projectId) {
      try {
        // 기존 payload를 가져와서 병합
        const { data: existing } = await supabase
          .from('Project')
          .select('payload')
          .eq('id', projectId)
          .single();

        const mergedPayload = {
          ...(existing?.payload || {}),
          analysis: {
            config,
            segments,
            meta: { ...meta, videoTitle, channelName },
            llm: llmAnalysis,
            analyzedAt: new Date().toISOString(),
          },
        };

        await supabase
          .from('Project')
          .update({ payload: mergedPayload, updatedAt: new Date().toISOString() })
          .eq('id', projectId);

        console.log(`💾 [ANALYZE] Supabase 저장 완료 → Project ${projectId}`);
      } catch (dbErr) {
        console.error(`⚠️ [ANALYZE] DB 저장 실패:`, dbErr.message);
      }
    }

    // ════════════════════════════════════
    // Response
    // ════════════════════════════════════
    return NextResponse.json({
      success: true,
      analysis: {
        config,
        segments,
        meta: { ...meta, videoTitle, channelName },
        llm: llmAnalysis,
      },
    });

  } catch (error) {
    console.error('❌ [ANALYZE] 에러:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
