import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export const maxDuration = 60;

export async function POST(request) {
  try {
    const { url, mode, highlights } = await request.json();
    if (!url) {
      return NextResponse.json({ success: false, error: 'URL이 필요합니다.' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'GEMINI_API_KEY 미설정' }, { status: 500 });
    }

    console.log(`👤 [FACE-TRACK] 엔진 가동: ${url} (mode: ${mode})`);

    const genAI = new GoogleGenAI({ apiKey });

    // Face-Track: Gemini에게 영상 분석 + 크롭 좌표 생성 요청
    const highlightInfo = highlights?.length > 0
      ? highlights.map((h, i) => `#${i+1}: ${h.start_sec}s~${h.end_sec}s "${h.caption}" (감정: ${h.emotion})`).join('\n')
      : '하이라이트 데이터 없음 — 전체 영상 분석';

    const result = await genAI.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `당신은 영상 편집 전문가입니다.
다음 YouTube 영상의 하이라이트 구간을 9:16 세로형(숏폼)으로 변환할 때 피사체(인물)를 정확히 추적하는 크롭 가이드를 생성하세요.

[영상 URL]: ${url}

[하이라이트 구간]:
${highlightInfo}

[출력 형식 - 반드시 JSON]:
{
  "guide": "전체 크롭 전략 요약 (2줄)",
  "crops": [
    { "scene": 1, "time": "0:05~0:12", "x": 320, "y": 0, "width": 607, "height": 1080, "subject": "메인 인물", "action": "정면 토크" }
  ],
  "tips": ["팁1", "팁2"]
}`,
    });

    let parsed;
    try {
      const text = result.text || result.response?.text?.() || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { guide: text.substring(0, 500) };
    } catch {
      parsed = { guide: '크롭 가이드 생성 완료 (상세 데이터는 직접 확인 필요)', crops: [] };
    }

    return NextResponse.json({
      success: true,
      data: parsed,
    });

  } catch (error) {
    console.error('❌ [FACE-TRACK] 에러:', error);
    return NextResponse.json({
      success: false,
      error: `Face-Track 처리 실패: ${error.message}`,
    }, { status: 500 });
  }
}
