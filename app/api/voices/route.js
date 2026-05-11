import { NextResponse } from 'next/server';

/**
 * GET /api/voices
 * 
 * ElevenLabs GET /v1/voices → 계정의 보이스 목록 반환
 * 대시보드 드롭다운에 자동 바인딩용
 */
export async function GET() {
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    return NextResponse.json({
      success: false,
      error: 'ELEVENLABS_API_KEY 미설정',
      voices: [],
    }, { status: 400 });
  }

  try {
    const res = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: { 'xi-api-key': apiKey },
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`ElevenLabs API ${res.status}: ${errText}`);
    }

    const data = await res.json();

    // 필요한 정보만 추출
    const voices = (data.voices || []).map((v) => ({
      id: v.voice_id,
      name: v.name,
      category: v.category || 'unknown',
      labels: v.labels || {},
      previewUrl: v.preview_url || null,
      description: v.labels?.description || v.labels?.accent || '',
    }));

    return NextResponse.json({
      success: true,
      count: voices.length,
      voices,
    });
  } catch (error) {
    console.error('❌ [VOICES] 에러:', error.message);
    return NextResponse.json({
      success: false,
      error: error.message,
      voices: [],
    }, { status: 500 });
  }
}
