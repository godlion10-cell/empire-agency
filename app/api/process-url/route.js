/**
 * 🔗 Process URL — 1호기 ↔ 2호기 브릿지 통합 라우트
 * 
 * 프론트에서 YouTube URL → 대본 추출 → 엠파이어 엔진(2호기)으로 전송
 * → Gemini가 재각색한 카피를 받아서 프론트에 반환
 */
import { NextResponse } from 'next/server';
import { fetchTranscript } from '@/lib/youtube-transcript';
import { buildAnalysisPayload } from '@/lib/analyzer-utils';

export async function POST(req) {
  try {
    const { videoUrl } = await req.json();
    if (!videoUrl) {
      return NextResponse.json({ error: 'URL이 필요합니다.' }, { status: 400 });
    }

    console.log(`🔗 [BRIDGE] 프로세스 시작: ${videoUrl}`);

    // ─── Step 1: 유튜브 원본 대본 추출 (2호기 3중 폴백 엔진) ───
    const result = await fetchTranscript(videoUrl);
    const fullText = result.segments.map(s => `[${Math.round(s.start)}초] ${s.text}`).join('\n');
    const adaptive = buildAnalysisPayload(result);
    console.log(`📄 [BRIDGE] 대본 추출 완료: ${result.segment_count}개 세그먼트, ${result.duration_sec}초 | ${adaptive.config.resolution} (${adaptive.config.interval}s)`);

    // ─── Step 2: 엠파이어 에이전시(본진) 두뇌로 대본 전송 ───
    const empireUrl = process.env.EMPIRE_AGENCY_API_URL;
    if (!empireUrl) {
      throw new Error('EMPIRE_AGENCY_API_URL 환경변수가 설정되지 않았습니다.');
    }

    console.log(`🚀 [BRIDGE] 2호기 카피 엔진 호출: ${empireUrl}`);

    const empireResponse = await fetch(empireUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rawText: fullText,
        targetType: 'ad-copy',
        clientName: `YouTube 영상 (${result.video_id})`,
        usps: fullText.substring(0, 500).split('\n').slice(0, 5).map(l => l.replace(/\[\d+초\]\s*/, '')),
        targetAudience: '20-50대 온라인 시청자',
      }),
    });

    if (!empireResponse.ok) {
      const errBody = await empireResponse.json().catch(() => ({}));
      throw new Error(`엠파이어 에이전시 엔진 응답 오류 (HTTP ${empireResponse.status}): ${errBody.error || empireResponse.statusText}`);
    }

    const finalResult = await empireResponse.json();

    if (!finalResult.success) {
      throw new Error(`엠파이어 카피 생성 실패: ${finalResult.error}`);
    }

    console.log(`✅ [BRIDGE] 카피 ${finalResult.data?.length || 0}종 수신 완료`);

    // ─── Step 3: 재각색된 카피를 프론트엔드로 반환 ───
    return NextResponse.json({
      success: true,
      videoId: result.video_id,
      originalLength: fullText.length,
      segmentCount: result.segment_count,
      duration: result.duration_sec,
      rewrittenCopy: finalResult.data,
      engine: finalResult.engine || 'recreate',
      engineName: finalResult.engineName || '롱폼 재창조',
      adaptive: {
        config: adaptive.config,
        segments: adaptive.segments,
        meta: adaptive.meta,
      },
    });

  } catch (error) {
    console.error('❌ [BRIDGE] 처리 실패:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
