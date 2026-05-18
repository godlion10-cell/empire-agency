import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { generateVoiceAsDataUrl } from '@/lib/audio-engine';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ============================================================
// 1. ?Œì„± ?ì„± ?”ì§„ (Edge TTS ??ElevenLabs ??OpenAI TTS Fallback)
// ============================================================
async function generateVoice(text) {
  // [1ì°? Edge TTS ??100% ë¬´ë£Œ]
  try {
    console.log(`?”Š [VOICE] Edge TTS ?œë„ (ZERO COST)...`);
    const result = await generateVoiceAsDataUrl(text, 'ko-KR-SunHiNeural');
    return result;
  } catch (edgeErr) {
    console.log(`? ï¸ Edge TTS ?¤íŒ¨ (${edgeErr.message}), ElevenLabsë¡??„í™˜`);
  }

  // [2ì°? ElevenLabs ??? ë£Œ ë°±ì—…]
  try {
    if (!process.env.ELEVENLABS_API_KEY) throw new Error('ElevenLabs API Key ë¯¸ì„¤??);

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID}`, {
      method: 'POST',
      headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    });
    if (!response.ok) throw new Error(`ElevenLabs ${response.status}`);

    const audioBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(audioBuffer).toString('base64');
    return { source: 'ElevenLabs', dataUrl: `data:audio/mpeg;base64,${base64}` };
  } catch (error) {
    // [3ì°? OpenAI TTS ??ìµœì¢… ë°±ì—…]
    console.log(`? ï¸ ElevenLabs ?¤íŒ¨ (${error.message}), OpenAI TTSë¡??„í™˜`);
    const mp3 = await openai.audio.speech.create({
      model: 'tts-1-hd',
      voice: 'onyx', // ë¶€?™ì‚°???´ìš¸ë¦¬ëŠ” ì¤‘í›„????      input: text,
    });
    const audioBuffer = await mp3.arrayBuffer();
    const base64 = Buffer.from(audioBuffer).toString('base64');
    return { source: 'OpenAI-TTS', dataUrl: `data:audio/mpeg;base64,${base64}` };
  }
}

// ============================================================
// 2. ë¹„ë””???ì„± ?”ì§„ (??ë¬?ëª¨ë“œ ë¶„ê¸°)
// ============================================================
async function triggerVideoGeneration(prompt, mode, imageUrl = null) {
  if (!process.env.RUNWAY_API_KEY) {
    // Mock ?‘ë‹µ
    return {
      status: 'mock',
      message: 'Runway API Key ë¯¸ì„¤????Mock ëª¨ë“œ',
      mode,
      prompt: prompt.substring(0, 80) + '...',
    };
  }

  const apiEndpoint = mode === 'U'
    ? 'https://api.runwayml.com/v1/image_to_video'
    : 'https://api.runwayml.com/v1/gen3a/text_to_video';

  const body = { promptText: prompt, duration: 10, watermark: false };
  if (mode === 'U' && imageUrl) body.input_image = imageUrl;

  const response = await fetch(apiEndpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RUNWAY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  return await response.json();
}

// ============================================================
// 3. ë©”ì¸ ?¸ë“¤??// ============================================================
export async function POST(req) {
  try {
    const { mode, script, videoPrompts, clientImage } = await req.json();

    if (!script) {
      return NextResponse.json({ success: false, error: '?¤í¬ë¦½íŠ¸ê°€ ë¹„ì–´?ˆìŠµ?ˆë‹¤.' }, { status: 400 });
    }

    // [Step 1] ?Œì„± ?ì„± (ë¹„ë™ê¸?
    const audioPromise = generateVoice(script);

    // [Step 2] 3-Cut ?ìƒ ?ì„± ?”ì²­ (ë³‘ë ¬ ì²˜ë¦¬)
    const prompts = videoPrompts || [script];
    const videoPromises = prompts.map(prompt =>
      triggerVideoGeneration(prompt, mode || 'M', clientImage)
    );

    const [audioResult, ...videoResults] = await Promise.all([audioPromise, ...videoPromises]);

    // [Step 3] ?ë§‰ ?°ì´???ì„±
    const subtitles = {
      content: script,
      style: 'Luxury Gold',
      animation: 'FadeIn',
      lines: script.split(/[.!???+/).filter(Boolean).map((s, i) => ({
        index: i + 1,
        text: s.trim(),
      })),
    };

    // [ìµœì¢… ê²°ê³¼ ë°˜í™˜]
    return NextResponse.json({
      success: true,
      data: {
        audio: audioResult,
        videos: videoResults,
        subtitles,
        renderStatus: videoResults.some(v => v.status === 'mock')
          ? 'MOCK_COMPLETE'
          : 'PROCESSING',
      },
    });
  } catch (error) {
    console.error('?”´ Render Engine Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
