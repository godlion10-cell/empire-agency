/**
 * 🎬 Empire Prompt Matrix — Cinematic Formula Generator
 * 
 * LLM(Gemini)에게 엘리트 아트 디렉터 역할을 강제하여
 * 모든 비주얼 프롬프트를 구조화된 시네마틱 공식으로 분해합니다:
 * 
 * [Subject/Action] + [Setting/Environment] + [Lighting] + [Camera Lens/Style] + [Typography]
 * 
 * 단순히 "그림 그려줘"가 아닌, 전문 촬영 감독의 시각으로 프롬프트를 작성합니다.
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

/**
 * 시네마틱 포뮬러 시스템 프롬프트
 * LLM이 반드시 5개 축으로 분해하여 프롬프트를 작성하도록 강제합니다.
 */
const CINEMATIC_SYSTEM_PROMPT = `You are an elite Art Director and Cinematographer with 20 years of experience directing visual campaigns for luxury brands like Chanel, Apple, and Mercedes-Benz.

YOUR MISSION: Convert the given script/concept into a highly detailed FLUX.1 / Midjourney image prompt.

═══ CINEMATIC FORMULA (MANDATORY) ═══
You MUST strictly decompose every prompt into these 5 axes:

1. [SUBJECT / ACTION]: The main subject with precise physical details — age, expression, posture, attire, movement. If no human, describe the primary object with material texture, shape, and state.
   Example: "A 30-year-old Korean woman in a tailored ivory cashmere coat, eyes closed, chin slightly raised, standing at the edge of a rooftop"

2. [SETTING / ENVIRONMENT]: The complete background environment with depth layers — foreground elements, mid-ground context, distant backdrop.
   Example: "overlooking a sprawling Seoul cityscape at dusk, glass skyscrapers reflecting amber sky, rooftop garden with minimalist concrete planters in foreground"

3. [LIGHTING]: Specific light source, quality, color temperature, shadows. Never say just "good lighting."
   Example: "golden hour backlighting with volumetric god rays piercing through clouds, warm 3200K rim light on subject's silhouette, deep shadow gradient on left side"

4. [CAMERA / LENS / STYLE]: Exact lens, aperture, angle, film stock. Think like a DP.
   Example: "shot on Arri Alexa with Cooke S4 35mm lens, f/1.4 shallow depth of field, low angle hero shot, slight dutch tilt, subtle film grain ISO 800"

5. [VIBE / TYPOGRAPHY] (if text overlay is needed): Mood keywords + text styling.
   Example: "aspirational, premium, serene confidence. With the text '새로운 시작' boldly rendered in minimalist sans-serif Hangul typography, floating above subject"

═══ OUTPUT RULES ═══
- Combine all 5 axes into ONE flowing English paragraph (no bullet points in the final prompt)
- Total prompt length: 80-150 words (sweet spot for FLUX.1/MJ)
- ALWAYS in English (even if the input script is Korean)
- NEVER use generic phrases like "beautiful", "nice", "good quality"
- NEVER mention AI, render, or generation tools in the prompt
- Include negative prompt suggestions as a separate field
- If the script has multiple scenes, generate one prompt per scene`;

/**
 * 스크립트 세그먼트를 시네마틱 프롬프트로 변환
 * @param {string} scriptSegment - 변환할 스크립트/대본 조각
 * @param {Object} options - 추가 옵션
 * @param {string} options.mood - 무드/톤 (예: 'luxury', 'energetic', 'emotional')
 * @param {string} options.category - 카테고리 (예: 'cosmetics', 'real-estate', 'food')
 * @param {string} options.aspectRatio - 종횡비 (예: '9:16', '16:9')
 * @param {string} options.overlayText - 이미지 위 텍스트
 * @returns {Promise<Object>} 구조화된 시네마틱 프롬프트 결과
 */
export async function generateCinematicPrompt(scriptSegment, options = {}) {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY가 설정되지 않았습니다.');
  }

  const {
    mood = 'premium cinematic',
    category = 'advertisement',
    aspectRatio = '9:16',
    overlayText = '',
  } = options;

  // 카테고리별 비주얼 디렉션 힌트
  const categoryHints = getCategoryHints(category);

  const userPrompt = `Convert this script segment into a cinematic image prompt:

SCRIPT: "${scriptSegment}"

ADDITIONAL DIRECTION:
- Mood/Tone: ${mood}
- Category: ${category} ${categoryHints ? `(${categoryHints})` : ''}
- Aspect Ratio: ${aspectRatio} (compose for this frame)
${overlayText ? `- Text Overlay Required: "${overlayText}"` : '- No text overlay needed'}

Generate the prompt following the CINEMATIC FORMULA strictly.

Return ONLY valid JSON:
{
  "cinematic_prompt": "The complete prompt combining all 5 axes into one paragraph",
  "decomposition": {
    "subject": "Subject/Action description",
    "setting": "Setting/Environment description",
    "lighting": "Lighting description",
    "camera": "Camera/Lens/Style description",
    "vibe": "Vibe and typography description"
  },
  "negative_prompt": "Things to avoid in generation",
  "prompt_strength_score": 85,
  "director_notes_ko": "한국어로 된 아트디렉터 코멘트 (1줄)"
}`;

  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  const response = await fetch(geminiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        { role: 'user', parts: [{ text: CINEMATIC_SYSTEM_PROMPT + '\n\n' + userPrompt }] },
      ],
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 2048,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API ${response.status}: ${errText.substring(0, 200)}`);
  }

  const data = await response.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/) || rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
    } else {
      throw new Error('Gemini 응답을 JSON으로 파싱할 수 없습니다.');
    }
  }

  console.log(`🎬 [PROMPT-MATRIX] 시네마틱 프롬프트 생성 완료 — Score: ${parsed.prompt_strength_score || 'N/A'}`);

  return {
    prompt: parsed.cinematic_prompt,
    decomposition: parsed.decomposition || {},
    negativePrompt: parsed.negative_prompt || '',
    strengthScore: parsed.prompt_strength_score || 0,
    directorNotes: parsed.director_notes_ko || '',
    metadata: {
      scriptSegment: scriptSegment.substring(0, 100),
      mood,
      category,
      aspectRatio,
      overlayText,
    },
  };
}

/**
 * 다중 스크립트 세그먼트를 일괄 변환 (CUT 단위)
 * @param {Array<{text: string, overlayText?: string}>} segments
 * @param {Object} options - 공통 옵션
 * @returns {Promise<Array>} 프롬프트 배열
 */
export async function generateCinematicPromptBatch(segments, options = {}) {
  if (!Array.isArray(segments) || segments.length === 0) {
    throw new Error('스크립트 세그먼트 배열이 필요합니다.');
  }

  console.log(`🎬 [PROMPT-MATRIX] Batch 변환 시작 — ${segments.length}개 세그먼트`);

  const results = [];
  for (let i = 0; i < segments.length; i++) {
    const seg = typeof segments[i] === 'string' ? { text: segments[i] } : segments[i];
    try {
      const result = await generateCinematicPrompt(seg.text, {
        ...options,
        overlayText: seg.overlayText || options.overlayText || '',
      });
      results.push({ cutIndex: i + 1, success: true, ...result });
    } catch (error) {
      console.error(`❌ [PROMPT-MATRIX] CUT ${i + 1} 실패:`, error.message);
      results.push({
        cutIndex: i + 1,
        success: false,
        error: error.message,
        prompt: `${seg.text}, cinematic lighting, photorealistic, 8k, shot on 35mm lens`,
      });
    }
  }

  return results;
}

/**
 * 카테고리별 비주얼 디렉션 힌트 반환
 */
function getCategoryHints(category) {
  const hints = {
    'cosmetics': 'macro close-up, dewy skin texture, light refraction through product, pastel gradients',
    'real-estate': 'aerial golden hour, panoramic city views, architectural lines, lifestyle aspiration',
    'food': 'steam rising, fresh ingredient textures, warm ambient light, appetite appeal, food photography',
    'fitness': 'dynamic action freeze, sweat droplets, dramatic side-lighting, athletic physique',
    'tech': 'futuristic lighting, product floating on dark background, precise edge reflections, holographic accents',
    'fashion': 'editorial composition, runway lighting, fabric drape and texture, high-fashion pose',
    'automotive': 'speed motion blur, reflective body panels, dramatic environment, cinematic wide shot',
    'education': 'warm scholarly ambiance, focused concentration, knowledge symbolism, inspiring atmosphere',
    'healthcare': 'clean clinical environment, trust-building warmth, professional compassion, soft medical lighting',
    'finance': 'corporate sophistication, trust and stability, geometric precision, confident leadership',
  };
  return hints[category] || '';
}

/**
 * 기존 프롬프트를 시네마틱 공식으로 강화 (간단 부스트)
 * LLM 호출 없이 Arsenal 태그 + 구조 힌트를 추가합니다.
 * @param {string} basicPrompt - 기본 프롬프트
 * @param {Object} options
 * @returns {string} 강화된 프롬프트
 */
export function boostPromptWithArsenal(basicPrompt, options = {}) {
  const {
    lighting = 'cinematic volumetric lighting with golden hour warmth',
    camera = 'shot on 35mm Zeiss Master Prime, f/1.4 shallow depth of field',
    quality = '8k resolution, photorealistic, hyper-detailed texture, film grain',
  } = options;

  return `${basicPrompt.trim()}, ${lighting}, ${camera}, ${quality}, professional composition, award-winning photography`;
}
