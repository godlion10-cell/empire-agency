import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { buildSystemPrompt, EMPIRE_ENGINES } from '@/lib/engine-prompts';

export const maxDuration = 60;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req) {
  try {
    const { clientName, usps, targetAudience, engine = 'recreate', rawText, targetType } = await req.json();

    // ─── 브릿지 모드: rawText가 있으면 대본 기반 카피 생성 ───
    const isRawMode = !!rawText;
    const effectiveClient = clientName || '브릿지 프로젝트';
    const effectiveUsps = usps?.length > 0 ? usps : (isRawMode ? ['(대본 분석 기반)'] : []);

    if (!isRawMode && (!clientName || !usps || usps.length === 0)) {
      return NextResponse.json({ success: false, error: '클라이언트명과 USP를 입력해주세요.' }, { status: 400 });
    }

    if (isRawMode) {
      console.log(`🔗 [AD-COPY] 브릿지 모드 수신: rawText ${rawText.length}자, targetType: ${targetType}`);
    }

    // 엔진별 시스템 프롬프트 조합
    const systemPrompt = buildSystemPrompt(engine, { clientName: effectiveClient, usps: effectiveUsps, targetAudience });

    // rawText가 있으면 대본 컨텍스트를 포함한 강화 프롬프트
    const transcriptContext = isRawMode
      ? `\n\n[원본 영상 대본 (자막 데이터)]\n${rawText.substring(0, 4000)}\n\n위 대본의 핵심 메시지를 분석하여 `
      : '';

    const userPrompt = engine === 'recreate'
      ? `${transcriptContext}Client: ${effectiveClient}
Key Selling Points: ${effectiveUsps.join(', ')}
Target Audience: ${targetAudience || '30-50대 고소득 전문직'}

Create 3 variations of 15-second short-form ad scripts.
Each variation: DIFFERENT angle (감성 호소 / 지위·명성 / 라이프스타일).
ALL text in KOREAN (한국어), 해요체 only.
Format: { "copies": [{ "headline": "헤드라인", "body": "본문 2-3문장 (15초)", "cta": "CTA" }] }
Return ONLY JSON.`
      : engine === 'commerce'
      ? `${transcriptContext}Product/URL: ${effectiveClient}
Features: ${effectiveUsps.join(', ')}
Target: ${targetAudience || '20-40대 온라인 구매자'}

Analyze and create a commerce ad package.
ALL text in KOREAN (한국어), 해요체 only.
Format: { "copies": [{ "headline": "헤드라인", "body": "본문", "cta": "CTA" }], "visual_cuts": [{ "cut": 1, "mj_prompt": "" }] }
Return ONLY JSON.`
      : `${transcriptContext}Source: ${effectiveClient}
Analyze and extract highlights for short-form content.
ALL in KOREAN.
Format: { "copies": [{ "headline": "하이라이트 제목", "body": "요약", "cta": "CTA" }] }
Return ONLY JSON.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.8,
    });

    const result = JSON.parse(response.choices[0].message.content);
    return NextResponse.json({
      success: true,
      engine,
      engineName: EMPIRE_ENGINES[engine]?.name || engine,
      data: result.copies || result.highlights || [result],
    });
  } catch (error) {
    console.error('🔴 Ad Copy Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
