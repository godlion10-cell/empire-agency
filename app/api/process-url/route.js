/**
 * 🔗 Process URL — YouTube URL → DNA 추출 + 재창조 파이프라인
 * 
 * 프론트에서 YouTube URL → 3중 폴백 자막 추출 → 글로벌 프로세서(Gemini)로 DNA 분석
 * → QA Gate → 카피/프롬프트 반환
 */
import { NextResponse } from 'next/server';
import { fetchTranscript } from '@/lib/youtube-transcript';
import { buildAnalysisPayload, segmentsToPromptText } from '@/lib/analyzer-utils';
import { validateScript } from '@/lib/qa-validator';

export const maxDuration = 60;

export async function POST(req) {
  try {
    const { videoUrl } = await req.json();
    if (!videoUrl) {
      return NextResponse.json({ error: 'URL이 필요합니다.' }, { status: 400 });
    }

    console.log(`🔗 [BRIDGE] 프로세스 시작: ${videoUrl}`);

    // ─── Step 1: 유튜브 원본 대본 추출 (3중 폴백) ───
    const result = await fetchTranscript(videoUrl);
    const fullText = result.segments.map(s => `[${Math.round(s.start)}초] ${s.text}`).join('\n');
    const adaptive = buildAnalysisPayload(result);
    console.log(`📄 [BRIDGE] 대본 추출 완료: ${result.segment_count}개 세그먼트, ${result.duration_sec}초 | ${adaptive.config.resolution} (${adaptive.config.interval}s)`);

    // ─── Step 2: 내부 글로벌 프로세서로 DNA 분석 ───
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    console.log(`🧬 [BRIDGE] 글로벌 프로세서 호출...`);

    const gpRes = await fetch(`${baseUrl}/api/engine/global-processor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: videoUrl,
        inputType: 'URL',
        rawText: fullText,
        duration: result.duration_sec,
        segments: result.segments,
      }),
    });

    if (!gpRes.ok) {
      const errBody = await gpRes.json().catch(() => ({}));
      throw new Error(`글로벌 프로세서 오류 (${gpRes.status}): ${errBody.error || gpRes.statusText}`);
    }

    const gpResult = await gpRes.json();

    if (!gpResult.success) {
      throw new Error(`DNA 분석 실패: ${gpResult.error}`);
    }

    console.log(`✅ [BRIDGE] DNA 분석 완료 — QA: ${gpResult.data?.qa?.scriptCheck || 'N/A'}`);

    // ─── Step 3: QA Gate (환각 검증) ───
    const qaResult = await validateScript(fullText, gpResult.data);

    // ─── Step 4: 반환 ───
    return NextResponse.json({
      success: true,
      videoId: result.video_id,
      videoTitle: gpResult.data?.videoTitle || result.video_id,
      originalLength: fullText.length,
      segmentCount: result.segment_count,
      duration: result.duration_sec,
      rewrittenCopy: gpResult.data,
      data: gpResult.data,
      engine: gpResult.engine || 'global',
      adaptive: {
        config: adaptive.config,
        segments: adaptive.segments,
        meta: adaptive.meta,
      },
      qa: {
        scriptCheck: qaResult.pass ? 'PASS' : 'FAIL',
        reason: qaResult.reason?.substring(0, 150),
      },
    });

  } catch (error) {
    console.error('❌ [BRIDGE] 처리 실패:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
