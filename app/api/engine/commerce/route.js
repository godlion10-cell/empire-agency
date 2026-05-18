import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { buildSystemPrompt } from '@/lib/engine-prompts';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

/**
 * POST /api/engine/commerce
 * 
 * ?”ì§„ 3: ì»¤ë¨¸??ë§ì¶¤ ê´‘ê³  ???˜ì´ë¸Œë¦¬??ë©€?°ì¸?? * 
 * 3ê°€ì§€ ?œë‚˜ë¦¬ì˜¤:
 * A. ?´ë?ì§€ ê¸°ë°˜ ê°ì„± ëª¨ë“œ (image only)
 * B. ?°ì´??ê¸°ë°˜ ?¼ë¦¬ ëª¨ë“œ (url only)
 * C. ?˜ì´ë¸Œë¦¬??ìµœê³ ê¸?ëª¨ë“œ (image + url)
 * 
 * Body: { url?: string, image?: string (base64 dataURL), productName?: string }
 */
export async function POST(req) {
  try {
    const { url, image, productName } = await req.json();

    if (!url && !image) {
      return NextResponse.json({
        success: false,
        error: '?í’ˆ URL ?ëŠ” ?œí’ˆ ?´ë?ì§€ë¥??…ë ¥?´ì£¼?¸ìš”.',
      }, { status: 400 });
    }

    // ?œë‚˜ë¦¬ì˜¤ ?ë³„
    const scenario = (image && url) ? 'C' : image ? 'A' : 'B';
    const scenarioLabel = scenario === 'C' ? '?˜ì´ë¸Œë¦¬??(?´ë?ì§€+URL)' : scenario === 'A' ? '?´ë?ì§€ ê°ì„± ë¶„ì„' : '?°ì´???¼ë¦¬ ë¶„ì„';

    console.log(`?›ï¸?[COMMERCE] ?”ì§„ ê°€?? ?œë‚˜ë¦¬ì˜¤ ${scenario} (${scenarioLabel})`);

    // ?œìŠ¤???„ë¡¬?„íŠ¸ ì¡°í•©
    const systemPrompt = buildSystemPrompt('commerce', {
      clientName: productName || url || '?œí’ˆ',
      usps: [scenarioLabel],
    });

    // ?œë‚˜ë¦¬ì˜¤ë³?? ì? ?„ë¡¬?„íŠ¸ ?ì„±
    let userPrompt;
    if (scenario === 'C') {
      userPrompt = `[?˜ì´ë¸Œë¦¬??ëª¨ë“œ] ???œí’ˆ ?¬ì§„??ë¹„ì£¼???¤ê³¼ ?ì„¸?˜ì´ì§€(${url})???µì‹¬ ?•ë³´ë¥??µí•©?˜ì—¬,
?œê°?ìœ¼ë¡??”ë ¤?˜ë©´?œë„ ? ë¢°ê°??ˆëŠ” 15ì´?ê´‘ê³ ë¥?ê¸°íš?˜ë¼.

?œí’ˆëª? ${productName || 'ë¶„ì„ ì¤?}
?ì„¸?˜ì´ì§€: ${url}
?œí’ˆ ?´ë?ì§€: [ì²¨ë???

?¤ìŒ??JSON?¼ë¡œ ì¶œë ¥?˜ë¼:
{
  "scenario": "C",
  "product_analysis": { "name": "", "category": "", "price_tier": "luxury|value", "usp": [], "visual_mood": "" },
  "ad_variants": [
    { "angle": "ê°ì„±", "headline": "", "body": "", "cta": "" },
    { "angle": "? ë¢°", "headline": "", "body": "", "cta": "" },
    { "angle": "ê¸´ê¸‰", "headline": "", "body": "", "cta": "" }
  ],
  "visual_cuts": [{ "cut": 1, "description": "", "mj_prompt": "", "duration_sec": 3 }],
  "subtitles": [{ "start": 0.0, "end": 3.5, "text": "" }]
}`;
    } else if (scenario === 'A') {
      userPrompt = `[?´ë?ì§€ ê°ì„± ëª¨ë“œ] ???¬ì§„?ì„œ ?ê»´ì§€???œí’ˆ??ì§ˆê°, ?‰ê°, ë¶„ìœ„ê¸°ë? ë¶„ì„?˜ì—¬
ê°ê°?ì¸ 15ì´??í¼ ê´‘ê³ ë¥?ê¸°íš?˜ë¼.

?œí’ˆëª? ${productName || '?¬ì§„ ë¶„ì„'}
?œí’ˆ ?´ë?ì§€: [ì²¨ë???

?¤ìŒ??JSON?¼ë¡œ ì¶œë ¥?˜ë¼:
{
  "scenario": "A",
  "product_analysis": { "name": "", "category": "", "price_tier": "luxury|value", "usp": [], "visual_mood": "" },
  "ad_variants": [
    { "angle": "ê°ì„±", "headline": "", "body": "", "cta": "" },
    { "angle": "?¼ì´?„ìŠ¤?€??, "headline": "", "body": "", "cta": "" }
  ],
  "visual_cuts": [{ "cut": 1, "description": "", "mj_prompt": "", "duration_sec": 3 }],
  "subtitles": [{ "start": 0.0, "end": 3.5, "text": "" }]
}`;
    } else {
      userPrompt = `[?°ì´???¼ë¦¬ ëª¨ë“œ] ?ì„¸?˜ì´ì§€(${url})???œí’ˆ ?¹ì§•??ë°”íƒ•?¼ë¡œ
êµ¬ë§¤ ?„í™˜?¨ì´ ?’ì? 15ì´?ê´‘ê³ ë¥?ê¸°íš?˜ë¼.

?œí’ˆëª? ${productName || url}
?ì„¸?˜ì´ì§€ URL: ${url}

?¤ìŒ??JSON?¼ë¡œ ì¶œë ¥?˜ë¼:
{
  "scenario": "B",
  "product_analysis": { "name": "", "category": "", "price_tier": "luxury|value", "usp": [] },
  "ad_variants": [
    { "angle": "?¼ë¦¬", "headline": "", "body": "", "cta": "" },
    { "angle": "ë¹„êµ", "headline": "", "body": "", "cta": "" },
    { "angle": "ê¸´ê¸‰", "headline": "", "body": "", "cta": "" }
  ],
  "visual_cuts": [{ "cut": 1, "description": "", "mj_prompt": "", "duration_sec": 3 }],
  "subtitles": [{ "start": 0.0, "end": 3.5, "text": "" }]
}`;
    }

    let result;

    // Gemini Multimodal ?¬ìš© (?´ë?ì§€ ?ˆì„ ??
    if (image && process.env.GEMINI_API_KEY) {
      const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

      // base64 dataURL?ì„œ ?°ì´??ì¶”ì¶œ
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
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts }],
      });

      const text = response.text || '';
      // JSON ì¶”ì¶œ
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

    console.log(`??[COMMERCE] ?œë‚˜ë¦¬ì˜¤ ${scenario} ?„ë£Œ`);

    return NextResponse.json({
      success: true,
      engine: 'commerce',
      scenario,
      scenarioLabel,
      data: result,
    });

  } catch (error) {
    console.error('??[COMMERCE] ?ëŸ¬:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
