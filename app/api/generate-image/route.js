import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export const maxDuration = 60;

export async function POST(request) {
  try {
    const { prompt, style } = await request.json();
    if (!prompt) {
      return NextResponse.json({ success: false, error: '프롬프트가 필요합니다.' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'GEMINI_API_KEY 미설정' }, { status: 500 });
    }

    console.log(`🖼️ [IMAGE-GEN] 생성 요청: ${style || 'default'} — ${prompt.substring(0, 80)}...`);

    const genAI = new GoogleGenAI({ apiKey });

    // Gemini로 MJ 프롬프트를 한국어+영어 하이브리드로 정제
    const result = await genAI.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `당신은 Midjourney 프롬프트 전문가입니다.
다음 프롬프트를 분석하고, 더 강력한 MJ 프롬프트 3종 변형을 생성하세요.

[원본 프롬프트]: ${prompt}
[스타일]: ${style || 'premium advertisement'}

[출력 형식 - 반드시 JSON]:
{
  "refined_prompt": "정제된 최고 퀄리티 프롬프트 (영문)",
  "variations": [
    { "name": "변형1 이름", "prompt": "MJ 프롬프트1" },
    { "name": "변형2 이름", "prompt": "MJ 프롬프트2" },
    { "name": "변형3 이름", "prompt": "MJ 프롬프트3" }
  ],
  "description_ko": "이 배너의 한국어 설명 (1줄)"
}`,
    });

    let parsed;
    try {
      const text = result.text || result.response?.text?.() || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { refined_prompt: prompt, variations: [] };
    } catch {
      parsed = { refined_prompt: prompt, variations: [], description_ko: '프롬프트 정제 완료' };
    }

    return NextResponse.json({
      success: true,
      data: {
        ...parsed,
        originalPrompt: prompt,
        style: style || 'default',
      },
    });

  } catch (error) {
    console.error('❌ [IMAGE-GEN] 에러:', error);
    return NextResponse.json({
      success: false,
      error: `이미지 생성 실패: ${error.message}`,
    }, { status: 500 });
  }
}
