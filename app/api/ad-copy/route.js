import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req) {
  try {
    const { clientName, usps, targetAudience } = await req.json();

    if (!clientName || !usps || usps.length === 0) {
      return NextResponse.json({ success: false, error: '클라이언트명과 USP를 입력해주세요.' }, { status: 400 });
    }

    const prompt = `You are a top-tier copywriter at a luxury real estate ad agency in Korea.
Client: ${clientName}
Key Selling Points: ${usps.join(', ')}
Target Audience: ${targetAudience || '30-50대 고소득 전문직'}

Create 3 variations of 15-second short-form ad scripts for this luxury property.
Each variation should have a DIFFERENT angle:
1. Emotional appeal (감성 호소)
2. Status/prestige (지위/명성)
3. Lifestyle benefit (라이프스타일 혜택)

★★★ [긴급] TOV(Tone of Voice) 절대 규칙 ★★★
- 반드시 시청자에게 직접 말을 거는 듯한 자연스러운 경어체/해요체로 작성할 것.
- 예시 톤: "~기회예요", "~어떠세요?", "~확인해 보세요", "~준비되어 있어요", "~누리는"
- 절대 금지 톤: "~한다", "~하십시오", "~이다", "~합니다" 같은 딱딱한 설명문/보고서 문체
- 참고 대본: "부산에 다시없을 기회예요. 18만 평 사상공원을 내 집 앞마당처럼 누리는 진정한 하이엔드 라이프! 전 세대 84타입의 압도적인 공간감에, 단 22세대뿐인 테라스 특화 설계까지 준비되어 있어요. 계약금 5%만 내시면 입주까지 추가 비용은 0원입니다. 5억 대로 만나는 부산의 마지막 프리미엄, 더파크 비스타동원에서 지금 바로 확인해 보세요!"

ALL text MUST be in KOREAN (한국어).
Format as JSON: { "copies": [{ "headline": "한국어 헤드라인 (해요체)", "body": "한국어 본문 2-3문장 (자연스러운 경어체, 15초 분량)", "cta": "한국어 CTA (해요체)" }] }
Return ONLY the JSON.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.8,
    });

    const result = JSON.parse(response.choices[0].message.content);
    return NextResponse.json({ success: true, data: result.copies });
  } catch (error) {
    console.error('🔴 Ad Copy Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
