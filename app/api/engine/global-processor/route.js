import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';
import { fetchTranscript } from '@/lib/youtube-transcript';

export const maxDuration = 60;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * POST /api/engine/global-processor
 * 
 * Global Finder Core — 해외 콘텐츠를 한국 시장에 심리학적으로 최적화
 * 
 * Stage 1: DNA Extraction (자막/음성 추출)
 *   - URL 모드: 3중 폴백 자막 엔진 (Library → Scrape → Gemini STT)
 *   - FILE 모드: OpenAI Whisper-1 음성 인식
 * 
 * Stage 2: Global Adaptation (Gemini 2.5 Flash — The Brain)
 *   - 언어 감지 + 심리학적 한국화
 *   - Pain Avoidance + Growth Desire 트리거 적용
 *   - 15초/30초/60초 숏폼 카피 + MJ Visual Prompt 생성
 */
export async function POST(req) {
  try {
    const contentType = req.headers.get('content-type') || '';
    let inputType, videoUrl, file;

    // ─── 입력 파싱 ───
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      inputType = formData.get('type') || 'URL';
      videoUrl = formData.get('url');
      file = formData.get('file');
    } else {
      const body = await req.json();
      inputType = body.type || 'URL';
      videoUrl = body.url || body.videoUrl;
    }

    console.log(`🌍 [GLOBAL] Stage 1: DNA Extraction — 모드: ${inputType}`);

    // ═══════════════════════════════════════════
    // Stage 1: DNA Extraction
    // ═══════════════════════════════════════════
    let rawText = '';
    let sourceInfo = {};

    if (inputType === 'URL' && videoUrl) {
      // URL 모드: 3중 폴백 자막 엔진
      const transcript = await fetchTranscript(videoUrl);
      rawText = transcript.full_text;
      sourceInfo = {
        mode: 'URL',
        videoId: transcript.video_id,
        duration: transcript.duration_sec,
        segments: transcript.segment_count,
        extractionEngine: transcript.source,
      };
      console.log(`📄 [GLOBAL] 자막 추출: ${transcript.segment_count}seg, ${transcript.duration_sec}s, via ${transcript.source}`);

    } else if (inputType === 'FILE' && file && file.size > 0) {
      // FILE 모드: OpenAI Whisper-1 음성 인식
      console.log(`🎤 [GLOBAL] Whisper STT 시작: ${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)`);
      
      const transcription = await openai.audio.transcriptions.create({
        file: file,
        model: 'whisper-1',
      });
      rawText = transcription.text;
      sourceInfo = {
        mode: 'FILE',
        fileName: file.name,
        fileSize: `${(file.size / 1024 / 1024).toFixed(1)}MB`,
        extractionEngine: 'whisper-1',
      };
      console.log(`📄 [GLOBAL] Whisper 전사 완료: ${rawText.length}자`);

    } else {
      return NextResponse.json({ success: false, error: 'URL 또는 파일이 필요합니다.' }, { status: 400 });
    }

    if (!rawText || rawText.length < 10) {
      return NextResponse.json({
        success: false,
        error: '텍스트 추출 실패. 유효한 URL/파일을 확인해주세요.',
      }, { status: 422 });
    }

    // ═══════════════════════════════════════════
    // Stage 2: Global Adaptation (The Brain)
    // ═══════════════════════════════════════════
    console.log(`🧠 [GLOBAL] Stage 2: Psychological Adaptation — ${rawText.length}자 투입`);

    const prompt = `You are a Master Psychological Marketer and Cultural Adaptation Specialist.
Analyze the following source text (which could be in English, Chinese, Japanese, or any language).

[Source DNA]
${rawText.substring(0, 5000)}

[Mission]
1. DETECT the original language.
2. EXTRACT the core selling logic, emotional triggers, and key claims.
3. TRANSLATE and LOCALIZE into perfect Korean for the 2030 demographic (MZ세대).
4. Apply psychological triggers:
   - "Pain Avoidance" (공포/손실 회피): 이걸 안 하면 뒤처진다는 느낌
   - "Growth Desire" (성장/기회 욕구): 이걸 하면 더 나은 내가 된다는 확신
   - "Social Proof" (사회적 증거): 다른 사람들도 이미 하고 있다는 안심
5. Generate SHORT-FORM ad scripts in 3 durations (15초/30초/60초).
6. Create a Midjourney visual prompt for the thumbnail/poster.

[Tone Rules]
- MUST use natural Korean 해요체 (~기회예요, ~만나보세요, ~시작해보세요)
- NEVER use stiff literary Korean (~한다, ~하십시오)
- Match MZ generation communication style (짧고 강렬하게)

[Output Format — RETURN ONLY VALID JSON]
{
  "detected_language": "EN|CN|JP|KR|etc",
  "original_summary": "원본 핵심 메시지 1줄 요약 (원어 그대로)",
  "korean_adaptation": {
    "title": "한국형 제목 (궁금증 유발, 15자 이내)",
    "hook": "첫 1초 훅 — 스크롤을 멈추게 하는 한 마디",
    "copies": [
      { "duration": "15초", "headline": "", "body": "", "cta": "" },
      { "duration": "30초", "headline": "", "body": "", "cta": "" },
      { "duration": "60초", "headline": "", "body": "", "cta": "" }
    ],
    "visual_prompt": "Midjourney V6 style prompt for the ad thumbnail, 9:16 vertical, cinematic lighting, Korean aesthetic"
  },
  "psychological_triggers": ["사용된 심리 기법 설명 1", "기법 2", "기법 3"],
  "keywords": ["타겟 키워드1", "키워드2", "키워드3"],
  "viral_potential": 8
}`;

    const result = await genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: 'application/json',
        temperature: 0.8,
      },
    });

    const responseText = result.text || '';
    let parsed;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      // JSON 파싱 실패 시 텍스트에서 JSON 추출 시도
      const match = responseText.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        throw new Error('Gemini 응답을 JSON으로 파싱할 수 없습니다.');
      }
    }

    console.log(`✅ [GLOBAL] 완료: ${parsed.detected_language} → KR, viral: ${parsed.viral_potential}/10`);

    return NextResponse.json({
      success: true,
      engine: 'global',
      data: {
        ...parsed,
        source: sourceInfo,
        originalLength: rawText.length,
        inputType,
      },
    });

  } catch (error) {
    console.error('❌ [GLOBAL] 처리 실패:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
