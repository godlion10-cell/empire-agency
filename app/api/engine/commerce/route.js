import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { buildSystemPrompt } from '@/lib/engine-prompts';

/**
 * POST /api/engine/commerce
 * 
 * 엔진 3: 커머스 맞춤 광고 — 하이브리드 멀티인풋
 * 
 * 3가지 시나리오:
 * A. 이미지 기반 감성 모드 (image only)
 * B. 데이터 기반 논리 모드 (url only)
 * C. 하이브리드 최고급 모드 (image + url)
 * 
 * Body: { url?: string, image?: string (base64 dataURL), productName?: string }
 */
export async function POST(req) {
  try {
    const { url, image, productName } = await req.json();

    if (!url && !image) {
      return NextResponse.json({
        success: false,
        error: '상품 URL 또는 제품 이미지를 입력해주세요.',
      }, { status: 400 });
    }

    // 시나리오 판별
    const scenario = (image && url) ? 'C' : image ? 'A' : 'B';
    const scenarioLabel = scenario === 'C' ? '하이브리드 (이미지+URL)' : scenario === 'A' ? '이미지 감성 분석' : '데이터 논리 분석';

    console.log(`🛍️ [COMMERCE] 엔진 가동: 시나리오 ${scenario} (${scenarioLabel})`);

    // 시스템 프롬프트 조합
    const systemPrompt = buildSystemPrompt('commerce', {
      clientName: productName || url || '제품',
      usps: [scenarioLabel],
    });

    // 시나리오별 유저 프롬프트 생성
    let userPrompt;
    if (scenario === 'C') {
      userPrompt = `[하이브리드 모드] 이 제품 사진의 비주얼 톤과 상세페이지(${url})의 핵심 정보를 융합하여,
시각적으로 화려하면서도 신뢰감 있는 15초 광고를 기획하라.

제품명: ${productName || '분석 중'}
상세페이지: ${url}
제품 이미지: [첨부됨]

다음을 JSON으로 출력하라:
{
  "scenario": "C",
  "product_analysis": { "name": "", "category": "", "price_tier": "luxury|value", "usp": [], "visual_mood": "" },
  "ad_variants": [
    { "angle": "감성", "headline": "", "body": "", "cta": "" },
    { "angle": "신뢰", "headline": "", "body": "", "cta": "" },
    { "angle": "긴급", "headline": "", "body": "", "cta": "" }
  ],
  "visual_cuts": [{ "cut": 1, "description": "", "mj_prompt": "", "duration_sec": 3 }],
  "subtitles": [{ "start": 0.0, "end": 3.5, "text": "" }]
}`;
    } else if (scenario === 'A') {
      userPrompt = `[이미지 감성 모드] 이 사진에서 느껴지는 제품의 질감, 색감, 분위기를 분석하여
감각적인 15초 숏폼 광고를 기획하라.

제품명: ${productName || '사진 분석'}
제품 이미지: [첨부됨]

다음을 JSON으로 출력하라:
{
  "scenario": "A",
  "product_analysis": { "name": "", "category": "", "price_tier": "luxury|value", "usp": [], "visual_mood": "" },
  "ad_variants": [
    { "angle": "감성", "headline": "", "body": "", "cta": "" },
    { "angle": "라이프스타일", "headline": "", "body": "", "cta": "" }
  ],
  "visual_cuts": [{ "cut": 1, "description": "", "mj_prompt": "", "duration_sec": 3 }],
  "subtitles": [{ "start": 0.0, "end": 3.5, "text": "" }]
}`;
    } else {
      userPrompt = `[데이터 논리 모드] 상세페이지(${url})의 제품 특징을 바탕으로
구매 전환율이 높은 15초 광고를 기획하라.

제품명: ${productName || url}
상세페이지 URL: ${url}

다음을 JSON으로 출력하라:
{
  "scenario": "B",
  "product_analysis": { "name": "", "category": "", "price_tier": "luxury|value", "usp": [] },
  "ad_variants": [
    { "angle": "논리", "headline": "", "body": "", "cta": "" },
    { "angle": "비교", "headline": "", "body": "", "cta": "" },
    { "angle": "긴급", "headline": "", "body": "", "cta": "" }
  ],
  "visual_cuts": [{ "cut": 1, "description": "", "mj_prompt": "", "duration_sec": 3 }],
  "subtitles": [{ "start": 0.0, "end": 3.5, "text": "" }]
}`;
    }

    let result;

    // Gemini Multimodal 사용 (이미지 있을 때)
    if (image && process.env.GEMINI_API_KEY) {
      const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

      // base64 dataURL에서 데이터 추출
      const base64Match = image.match(/^data:(.+);base64,(.+)$/);
      const parts = [{ text: `${systemPrompt}\n\n${userPrompt}` }];

      if (base64Match) {
        parts.push({
          inlineData: {
            mimeType: base64Match[1],
            data: base64Match[2],
          },
        });
      }

      const response = await genai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [{ role: 'user', parts }],
      });

      const text = response.text || '';
      // JSON 추출
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: text };

    } else {
      // OpenAI fallback (URL only)
      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      });

      result = JSON.parse(response.choices[0].message.content);
    }

    console.log(`✅ [COMMERCE] 시나리오 ${scenario} 완료`);

    return NextResponse.json({
      success: true,
      engine: 'commerce',
      scenario,
      scenarioLabel,
      data: result,
    });

  } catch (error) {
    console.error('❌ [COMMERCE] 에러:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
