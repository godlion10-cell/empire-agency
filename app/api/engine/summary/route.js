import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { fetchTranscript } from '@/lib/youtube-transcript';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * POST /api/engine/summary
 * 
 * 엔진 2: 원본 숏폼 요약
 * YouTube URL → Node.js 자막 추출 → AI 하이라이트 추출
 * 
 * Python 의존성 완전 제거. 메모리 내 처리.
 */
export async function POST(req) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ success: false, error: 'YouTube URL을 입력해주세요.' }, { status: 400 });
    }

    console.log(`✂️ [SUMMARY] 엔진 가동: ${url}`);

    // ─── STEP 1: Node.js 자막 추출 (메모리 내) ───
    let transcriptData;
    try {
      transcriptData = await fetchTranscript(url);
    } catch (scrapeErr) {
      return NextResponse.json({
        success: false,
        error: `자막 추출 실패: ${scrapeErr.message}`,
      }, { status: 400 });
    }

    console.log(`📊 자막 추출 완료: ${transcriptData.segment_count}개 세그먼트, ${transcriptData.duration_sec}초`);

    // ─── STEP 2: AI 하이라이트 분석 ───
    const truncatedText = transcriptData.full_text.substring(0, 6000);

    const systemPrompt = `당신은 바이럴 숏폼 편집 전문가입니다.

[미션]
유튜브 원본 영상의 자막 데이터를 분석하여 도파민이 가장 터지는 30~60초 하이라이트 구간을 추출합니다.

[추출 기준]
1. 반전이 있는 구간 (예상을 뒤엎는 정보)
2. 정보가 집약된 구간 (핵심 팩트 집중)
3. 감정이 폭발하는 구간 (놀라움, 감동, 분노)
4. 시청자가 공유하고 싶은 구간 (바이럴 포텐셜)

[출력 규칙]
- 반드시 JSON으로만 응답하라.
- highlights 배열에 3~5개 하이라이트 구간을 포함하라.
- 각 구간에 숏폼용 자막(caption)을 해요체로 작성하라.
- 키워드는 자막에서 강조할 단어를 추출하라.`;

    const userPrompt = `영상 정보:
- 길이: ${Math.round(transcriptData.duration_sec / 60)}분
- 세그먼트: ${transcriptData.segment_count}개

자막 데이터:
${truncatedText}

위 자막을 분석하여 숏폼 하이라이트를 추출하라.

JSON 형식:
{
  "title": "숏폼 제목 (해요체, 궁금증 유발)",
  "summary": "원본 영상 한 줄 요약",
  "highlights": [
    {
      "rank": 1,
      "start_sec": 125,
      "end_sec": 165,
      "reason": "왜 이 구간이 하이라이트인지",
      "caption": "숏폼 자막 텍스트 (해요체)",
      "keywords": ["키워드1", "키워드2"],
      "emotion": "놀라움|감동|유머|분노|긴장",
      "viral_score": 9
    }
  ],
  "subtitles": [
    { "start": 0.0, "end": 3.5, "text": "자막 한 줄" }
  ]
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const result = JSON.parse(response.choices[0].message.content);

    console.log(`✅ [SUMMARY] 하이라이트 ${result.highlights?.length || 0}개 추출 완료`);

    return NextResponse.json({
      success: true,
      engine: 'summary',
      data: {
        ...result,
        source: {
          videoId: transcriptData.video_id,
          duration: transcriptData.duration_sec,
        }
      }
    });

  } catch (error) {
    console.error('❌ [SUMMARY] 에러:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
