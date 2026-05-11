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

Create 3 variations of Facebook/Instagram ad copy for this luxury property.
Focus on exclusivity, premium lifestyle, and emotional aspiration.
Each variation should have a DIFFERENT angle:
1. Emotional appeal (감성 호소)
2. Status/prestige (지위/명성)
3. Lifestyle benefit (라이프스타일 혜택)

ALL text MUST be in KOREAN (한국어).
Format as JSON: { "copies": [{ "headline": "한국어 헤드라인", "body": "한국어 본문 2-3문장", "cta": "한국어 CTA 버튼 텍스트" }] }
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
