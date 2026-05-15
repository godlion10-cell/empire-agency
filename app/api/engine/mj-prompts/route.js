import { NextResponse } from 'next/server';
import { validateVisualPrompts } from '@/lib/qa-validator';

/**
 * POST /api/engine/mj-prompts
 * LLM 기반 동적 Midjourney 프롬프트 4종 생성
 * 
 * Body: { keyword: string, context?: string, mood?: string }
 * Response: { success: true, prompts: { poster, logo, sns, card } }
 */
export async function POST(req) {
  try {
    const { keyword, context, mood } = await req.json();
    if (!keyword) {
      return NextResponse.json({ success: false, error: 'keyword is required' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'GEMINI_API_KEY not set' }, { status: 500 });
    }

    const systemPrompt = `You are a master Midjourney prompt engineer with expertise in cinematic photography, branding design, and visual storytelling.

CRITICAL RULES:
1. DO NOT use "luxury apartment", "real estate", or "apartment complex" unless the user's keyword is EXPLICITLY about real estate or apartments.
2. ALWAYS match the visual concept to the ACTUAL MEANING of the user's keyword.
3. Generate prompts in ENGLISH only, even if the keyword is in Korean/Japanese/other languages.
4. Each prompt must be highly detailed with specific camera angles, lighting, textures, and atmosphere.
5. Include Midjourney parameters (--ar, --v 6.0) at the end of each prompt.

EXAMPLES OF CORRECT BEHAVIOR:
- Keyword "치킨집" → prompts about fried chicken restaurant, crispy golden chicken, cozy Korean restaurant atmosphere
- Keyword "피트니스" → prompts about gym, fitness lifestyle, athletic bodies, workout equipment
- Keyword "카페" → prompts about coffee shop, barista, latte art, cozy interior
- Keyword "심리학" → prompts about human psychology, brain visualization, emotional portraits

Return ONLY a valid JSON object with this exact structure:
{
  "prompts": {
    "poster": "[Detailed cinematic 9:16 vertical poster prompt matching the keyword's actual concept] --ar 9:16 --v 6.0",
    "logo": "[Minimalist vector logo/emblem prompt related to the keyword's concept, clean white background, geometric, premium brand identity] --no text, typography, letters --v 6.0",
    "sns": "[1:1 Instagram lifestyle shot matching the keyword's concept, warm lighting, premium feel, photorealistic] --ar 1:1 --v 6.0",
    "card": "[16:9 cinematic wide shot or mockup matching the keyword's concept, dramatic lighting, 8k] --ar 16:9 --v 6.0"
  }
}`;

    const userPrompt = `Generate 4 Midjourney prompts for this concept:
Keyword: "${keyword}"
${context ? `Additional context: ${context}` : ''}
${mood ? `Desired mood/tone: ${mood}` : 'Desired mood/tone: premium, cinematic, high-end'}

Remember: Match the prompts to what "${keyword}" ACTUALLY means. Do NOT default to apartments or real estate.`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { role: 'user', parts: [{ text: systemPrompt + '\n\n' + userPrompt }] }
        ],
        generationConfig: {
          temperature: 0.9,
          maxOutputTokens: 2048,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      throw new Error(`Gemini API error: ${geminiRes.status} ${errText.substring(0, 200)}`);
    }

    const geminiData = await geminiRes.json();
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Parse JSON from response
    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[1].trim());
      } else {
        throw new Error('Failed to parse Gemini response as JSON');
      }
    }

    const prompts = parsed.prompts || parsed;

    // Validate all 4 keys exist
    const requiredKeys = ['poster', 'logo', 'sns', 'card'];
    for (const key of requiredKeys) {
      if (!prompts[key]) {
        prompts[key] = `${keyword} concept, cinematic, photorealistic, 8k --v 6.0`;
      }
    }

    // ═══ QA Gate 2: Visual Prompt Validation ═══
    const qaCheck = validateVisualPrompts(prompts);
    console.log(`🛡️ [MJ-QA] ${qaCheck.pass ? '✅ PASS' : '⚠️ ISSUES: ' + qaCheck.issues.join(', ')}`);

    return NextResponse.json({ success: true, prompts, qa: qaCheck });

  } catch (error) {
    console.error('[MJ-PROMPTS] Error:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
