import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';
import { fetchTranscript } from '@/lib/youtube-transcript';
import { buildAnalysisPayload, segmentsToPromptText, extractKeyMoments } from '@/lib/analyzer-utils';
import { runWithQA, evaluateDnaScript } from '@/lib/qa-engine';

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
      var videoTitle = formData.get('videoTitle') || '';
      var channelName = formData.get('channelName') || '';
    } else {
      const body = await req.json();
      inputType = body.type || body.inputType || 'URL';
      videoUrl = body.url || body.videoUrl || body.input;
      var videoTitle = body.videoTitle || '';
      var channelName = body.channelName || '';
      // TEXT 모드에서 직접 텍스트가 전달된 경우
      var directText = body.rawText || (inputType === 'TEXT' ? (body.input || body.text || '') : '');
    }

    console.log(`🌍 [GLOBAL] Stage 1: DNA Extraction — 모드: ${inputType}`);

    // ═══════════════════════════════════════════
    // Stage 1: DNA Extraction
    // ═══════════════════════════════════════════
    let rawText = '';
    let sourceInfo = {};

    if (inputType === 'TEXT' && directText) {
      // TEXT 모드: 사용자가 직접 입력한 텍스트
      rawText = directText;
      sourceInfo = {
        mode: 'TEXT',
        inputLength: directText.length,
        extractionEngine: 'direct-input',
      };
      console.log(`📝 [GLOBAL] 텍스트 직접 입력: ${rawText.length}자`);

    } else if ((inputType === 'URL' || inputType === 'TEXT') && videoUrl && videoUrl.startsWith('http')) {
      // URL 모드: 4중 폴백 자막 엔진 (Library → Scrape → oEmbed → Gemini STT)
      const transcript = await fetchTranscript(videoUrl);
      rawText = transcript.full_text;

      // oEmbed 제목 기반 모드일 경우 → videoTitle을 자동 추출
      if (transcript.source === 'oembed-title' && !videoTitle) {
        const titleMatch = rawText.match(/영상 제목:\s*(.+)/);
        if (titleMatch) videoTitle = titleMatch[1].trim();
      }

      sourceInfo = {
        mode: 'URL',
        videoId: transcript.video_id,
        duration: transcript.duration_sec,
        segments: transcript.segment_count,
        extractionEngine: transcript.source,
        videoTitle: videoTitle || '',
        channelName: channelName || '',
      };
      console.log(`📄 [GLOBAL] 자막 추출: ${transcript.segment_count}seg, ${transcript.duration_sec}s, via ${transcript.source}${videoTitle ? `, title: ${videoTitle}` : ''}`);

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
      return NextResponse.json({ success: false, error: `입력 오류: type=${inputType}, URL/파일/텍스트가 필요합니다.` }, { status: 400 });
    }

    if (!rawText || rawText.length < 10) {
      return NextResponse.json({
        success: false,
        error: '텍스트 추출 실패. 유효한 URL/파일을 확인해주세요.',
      }, { status: 422 });
    }

    // ═══════════════════════════════════════════
    // Stage 1.5: Adaptive Time-Chunking
    // ═══════════════════════════════════════════
    let adaptivePayload = null;
    if (inputType === 'URL' && sourceInfo.duration) {
      // URL 모드에서는 자막 세그먼트와 duration 정보를 활용
      const transcriptForChunking = {
        segments: rawText.split('\n').filter(l => l.trim()).map((line, i) => {
          const timeMatch = line.match(/^\[(\d+)초\]\s*(.+)/);
          return timeMatch
            ? { start: parseInt(timeMatch[1]), end: parseInt(timeMatch[1]) + 3, text: timeMatch[2] }
            : { start: i * 3, end: (i + 1) * 3, text: line };
        }),
        duration_sec: sourceInfo.duration || 0,
        video_id: sourceInfo.videoId || '',
        source: sourceInfo.extractionEngine || 'unknown',
        full_text: rawText,
        segment_count: 0,
      };
      transcriptForChunking.segment_count = transcriptForChunking.segments.length;
      adaptivePayload = buildAnalysisPayload(transcriptForChunking);
      console.log(`📊 [GLOBAL] 적응형 청킹: ${adaptivePayload.config.resolution} (${adaptivePayload.config.interval}s) → ${adaptivePayload.segments.length}개 청크`);
    }

    // ═══════════════════════════════════════════
    // Stage 2: Global Adaptation (The Brain)
    // ═══════════════════════════════════════════
    const segmentContext = adaptivePayload
      ? `\n\n[🔬 Adaptive Segments — ${adaptivePayload.config.resolution} Resolution (${adaptivePayload.config.interval}s interval)]\n${segmentsToPromptText(adaptivePayload.segments).substring(0, 3000)}`
      : '';
    console.log(`🧠 [GLOBAL] Stage 2: Psychological Adaptation — ${rawText.length}자 투입`);

    const prompt = `You are a Master Psychological Marketer, Cultural Adaptation Specialist, and Commerce Fusion Strategist.
Analyze the following source text (which could be in English, Chinese, Japanese, or any language).
${videoTitle ? `
[Video Context — USE THIS AS PRIMARY TOPIC INDICATOR]
- Video Title: "${videoTitle}"
${channelName ? `- Channel: ${channelName}` : ''}
⚠️ IMPORTANT: The video title tells you what this video is ACTUALLY about.
If the transcript below is sparse, short, or contains mostly music/sound effects with minimal dialogue,
you MUST use the VIDEO TITLE as your primary source for understanding the main topic.
Generate all content (pureContent, copies, hybridCommerce) based on the topic indicated by the title.
` : ''}
[Source DNA — Transcript]
${rawText.substring(0, 5000)}${segmentContext}
${rawText.length < 200 ? `
🔴 SPARSE TRANSCRIPT ALERT: This transcript is very short (${rawText.length} chars).
This likely means the video is visual-heavy (animals, ASMR, music, travel, etc.) with minimal dialogue.
You MUST rely on the Video Title above to determine the main topic and generate relevant content.
Do NOT generate generic or unrelated content. Base everything on the video title's topic.
` : ''}

[🧬 DUAL-EXTRACTION ENGINE — FUSION MODE]
This transcript likely contains TWO types of content mixed together:
1. **PURE CONTENT** (메인 콘텐츠): The video's actual topic — the story, knowledge, entertainment, or information the creator is sharing
2. **SPONSOR/PPL CONTENT** (광고 콘텐츠): Mid-roll sponsor reads, product placements, affiliate pitches, brand promotions

Your job is to SEPARATE and EXTRACT BOTH, then CREATE a FUSION HYBRID.

[Sponsor Detection Signals]
- "This video is sponsored by...", "Thanks to [Brand] for sponsoring..."
- "Use code [X] for...", "Check the link in description"
- Sudden topic pivots to unrelated products/services
- Common sponsors: NordVPN, BetterHelp, Squarespace, Skillshare, Audible, HelloFresh, AG1, 쿠팡, 닥터바리스타, 뮤직카우, 토스, 리디, 밀리의서재
- Self-promotion: "Subscribe", "Hit the bell", "Join my Patreon"

[Mission — 3-Track Parallel Output]

TRACK 1 — PURE CONTENT (순수 콘텐츠)
- Extract ONLY the main topic DNA, completely free of any sponsor content
- Generate 15초/30초/60초 ad scripts about the PURE main topic
- Create a Midjourney visual prompt matching the PURE topic

TRACK 2 — EXTRACTED SPONSOR (스폰서 추출)
- Identify and extract any sponsor/PPL segments found in the transcript
- Summarize the sponsor's product name, selling points, and CTA
- If no sponsor found, output "광고 없음"

TRACK 3 — HYBRID COMMERCE (트로이 목마 융합)
- Create a "Trojan Horse" script that STARTS with the pure content's viral hook
- Then SMOOTHLY transitions into a commerce ad (using the extracted sponsor's product OR a generic product placeholder)
- The viewer should be hooked by the content BEFORE realizing it's an ad
- This is the most valuable output — a script that feels like content but sells like an ad

[Tone Rules]
- MUST use natural Korean 해요체 (~기회예요, ~만나보세요, ~시작해보세요)
- NEVER use stiff literary Korean (~한다, ~하십시오)
- Match MZ generation communication style (짧고 강렬하게)

[Output Format — RETURN ONLY VALID JSON]
{
  "detected_language": "EN|CN|JP|KR|etc",
  "main_topic": "영상의 실제 핵심 주제 (1줄)",
  "original_summary": "원본 핵심 메시지 1줄 요약 (원어 그대로)",
  "korean_adaptation": {
    "title": "한국형 제목 (궁금증 유발, 15자 이내)",
    "hook": "첫 1초 훅 — 스크롤을 멈추게 하는 한 마디",
    "copies": [
      { "duration": "15초", "headline": "", "body": "", "cta": "" },
      { "duration": "30초", "headline": "", "body": "", "cta": "" },
      { "duration": "60초", "headline": "", "body": "", "cta": "" }
    ],
    "visual_prompt": "Midjourney V6 style prompt for the PURE content thumbnail, 9:16 vertical, cinematic"
  },
  "pureContent": "광고를 완전히 제거한 영상 본연의 바이럴 스토리 대본 (30초 분량, 해요체, 핵심 지식/재미/감동만 담기)",
  "extractedSponsor": {
    "found": true,
    "brandName": "발견된 스폰서 브랜드명",
    "originalCopy": "원본 스폰서 멘트 핵심 요약 (원어)",
    "koreanCopy": "한국어 번역 요약",
    "sellingPoints": ["핵심 셀링포인트1", "포인트2"],
    "cta": "스폰서의 CTA"
  },
  "hybridCommerce": "트로이 목마 스크립트 — [순수 콘텐츠 훅]으로 시작 → 자연스러운 전환 → [커머스 제품 광고]로 착지하는 30초 하이브리드 대본 (해요체)",
  "psychological_triggers": ["사용된 심리 기법 1", "기법 2", "기법 3"],
  "keywords": ["타겟 키워드1", "키워드2", "키워드3"],
  "viral_potential": 8
}`;

    // ═══ LLM 생성 + runWithQA 자동 검수 (최대 3회 재시도) ═══
    const generateOnce = async () => {
      const result = await genAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ parts: [{ text: prompt }] }],
        config: { responseMimeType: 'application/json', temperature: 0.8 },
      });

      const responseText = result.text || '';
      let parsed;
      try {
        parsed = JSON.parse(responseText);
      } catch {
        const match = responseText.match(/\{[\s\S]*\}/);
        if (match) { parsed = JSON.parse(match[0]); }
        else { throw new Error('Gemini 응답을 JSON으로 파싱할 수 없습니다.'); }
      }
      return parsed;
    };

    // runWithQA: 생성 → LLM 심판 검수 → 실패 시 재생성 (최대 3회)
    const parsed = await runWithQA(
      'STEP 1: DNA 대본 추출',
      generateOnce,
      (result) => evaluateDnaScript(rawText, result)
    );

    console.log(`✅ [GLOBAL] 완료: ${parsed.detected_language} → KR, viral: ${parsed.viral_potential}/10`);

    return NextResponse.json({
      success: true,
      engine: 'global',
      data: {
        ...parsed,
        source: sourceInfo,
        originalLength: rawText.length,
        inputType,
        adaptive: adaptivePayload ? {
          config: adaptivePayload.config,
          segments: adaptivePayload.segments,
          meta: adaptivePayload.meta,
          keyMoments: extractKeyMoments(adaptivePayload.segments),
        } : null,
        qa: { scriptCheck: 'PASS', engine: 'runWithQA' },
      },
    });

  } catch (error) {
    console.error('❌ [GLOBAL] 처리 실패:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
