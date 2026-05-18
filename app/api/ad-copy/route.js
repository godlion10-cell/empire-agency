import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { buildSystemPrompt, EMPIRE_ENGINES } from '@/lib/engine-prompts';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req) {
  try {
    const { clientName, usps, targetAudience, engine = 'recreate', rawText, targetType } = await req.json();

    // ?€?€?€ ë¸Œë¦¿ì§€ ëª¨ë“œ: rawTextê°€ ?ˆìœ¼ë©??€ë³?ê¸°ë°˜ ì¹´í”¼ ?ì„± ?€?€?€
    const isRawMode = !!rawText;
    const effectiveClient = clientName || 'ë¸Œë¦¿ì§€ ?„ë¡œ?íŠ¸';
    const effectiveUsps = usps?.length > 0 ? usps : (isRawMode ? ['(?€ë³?ë¶„ì„ ê¸°ë°˜)'] : []);

    if (!isRawMode && (!clientName || !usps || usps.length === 0)) {
      return NextResponse.json({ success: false, error: '?´ë¼?´ì–¸?¸ëª…ê³?USPë¥??…ë ¥?´ì£¼?¸ìš”.' }, { status: 400 });
    }

    if (isRawMode) {
      console.log(`?”— [AD-COPY] ë¸Œë¦¿ì§€ ëª¨ë“œ ?˜ì‹ : rawText ${rawText.length}?? targetType: ${targetType}`);
    }

    // ?”ì§„ë³??œìŠ¤???„ë¡¬?„íŠ¸ ì¡°í•©
    const systemPrompt = buildSystemPrompt(engine, { clientName: effectiveClient, usps: effectiveUsps, targetAudience });

    // rawTextê°€ ?ˆìœ¼ë©??€ë³?ì»¨í…?¤íŠ¸ë¥??¬í•¨??ê°•í™” ?„ë¡¬?„íŠ¸
    const transcriptContext = isRawMode
      ? `\n\n[?ë³¸ ?ìƒ ?€ë³?(?ë§‰ ?°ì´??]\n${rawText.substring(0, 4000)}\n\n???€ë³¸ì˜ ?µì‹¬ ë©”ì‹œì§€ë¥?ë¶„ì„?˜ì—¬ `
      : '';

    const userPrompt = engine === 'recreate'
      ? `${transcriptContext}Client: ${effectiveClient}
Key Selling Points: ${effectiveUsps.join(', ')}
Target Audience: ${targetAudience || '30-50?€ ê³ ì†Œ???„ë¬¸ì§?}

Create 3 variations of 15-second short-form ad scripts.
Each variation: DIFFERENT angle (ê°ì„± ?¸ì†Œ / ì§€?„Â·ëª…??/ ?¼ì´?„ìŠ¤?€??.
ALL text in KOREAN (?œêµ­??, ?´ìš”ì²?only.
Format: { "copies": [{ "headline": "?¤ë“œ?¼ì¸", "body": "ë³¸ë¬¸ 2-3ë¬¸ì¥ (15ì´?", "cta": "CTA" }] }
Return ONLY JSON.`
      : engine === 'commerce'
      ? `${transcriptContext}Product/URL: ${effectiveClient}
Features: ${effectiveUsps.join(', ')}
Target: ${targetAudience || '20-40?€ ?¨ë¼??êµ¬ë§¤??}

Analyze and create a commerce ad package.
ALL text in KOREAN (?œêµ­??, ?´ìš”ì²?only.
Format: { "copies": [{ "headline": "?¤ë“œ?¼ì¸", "body": "ë³¸ë¬¸", "cta": "CTA" }], "visual_cuts": [{ "cut": 1, "mj_prompt": "" }] }
Return ONLY JSON.`
      : `${transcriptContext}Source: ${effectiveClient}
Analyze and extract highlights for short-form content.
ALL in KOREAN.
Format: { "copies": [{ "headline": "?˜ì´?¼ì´???œëª©", "body": "?”ì•½", "cta": "CTA" }] }
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
    console.error('?”´ Ad Copy Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
