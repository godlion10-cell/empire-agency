import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export const maxDuration = 60;

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * POST /api/engine/keyword-scorer
 * 
 * Global Golden Keyword Discovery Engine
 * 
 * Stage 1: YouTube Autocomplete에서 한국어 연관 검색어 수집 (보조 데이터)
 * Stage 2: Gemini 2.5 Flash — 글로벌 심리학적 황금 키워드 확장
 *   - 한국어 씨앗 키워드의 심리 트리거 해석
 *   - US(영어), JP(일본어), CN(중국어) 현지 바이럴 키워드 발굴
 *   - 한국어 연관 키워드 분석 병행
 *   - 수익성, 경쟁률, 심리학적 이유, 치명적 Hook
 */
export async function POST(req) {
  try {
    const { seed } = await req.json();

    if (!seed || seed.trim().length < 1) {
      return NextResponse.json(
        { success: false, error: '씨앗 키워드를 입력해주세요.' },
        { status: 400 }
      );
    }

    console.log(`🔑 [KEYWORD] Stage 1: YouTube Autocomplete — "${seed}"`);

    // ═══════════════════════════════════════════
    // Stage 1: YouTube Autocomplete 연관 검색어 추출 (보조 데이터)
    // ═══════════════════════════════════════════
    let suggestions = [];

    try {
      const suggestUrl = `https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${encodeURIComponent(seed)}&hl=ko`;
      const suggestRes = await fetch(suggestUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });

      if (suggestRes.ok) {
        const suggestData = await suggestRes.json();
        if (Array.isArray(suggestData) && Array.isArray(suggestData[1])) {
          suggestions = suggestData[1]
            .filter((s) => typeof s === 'string' && s.trim() !== seed.trim())
            .slice(0, 10);
        }
      }
    } catch (suggestErr) {
      console.warn('⚠️ [KEYWORD] YouTube Suggest 실패:', suggestErr.message);
    }

    console.log(`📋 [KEYWORD] KR 보조 키워드 ${suggestions.length}개 수집 → Gemini 글로벌 확장 시작`);

    // ═══════════════════════════════════════════
    // Stage 2: Gemini 2.5 Flash — 글로벌 황금 키워드 확장
    // ═══════════════════════════════════════════
    const prompt = `당신은 글로벌 트렌드 분석가이자 마케팅 심리학자입니다.

사용자가 입력한 한국어 씨앗 키워드: "${seed}"
${suggestions.length > 0 ? `\n[참고: YouTube 한국어 연관 검색어]\n${suggestions.join(', ')}` : ''}

[미션]
이 키워드가 내포한 대중의 핵심 심리(예: 결핍, 과시, 성장 욕구, 고통 회피, FOMO)를 깊이 파악하세요.
그 후, 현재 미국(영어/YouTube), 일본(일본어/YouTube), 중국(중국어/TikTok·抖音)에서 가장 바이럴되고 있는 관련 '현지 언어 키워드'를 각 시장별 5개씩 발굴하세요.
추가로, 한국(KR) 시장의 황금 키워드도 5개 포함하세요.

[분석 기준]
1. region: "US" | "JP" | "CN" | "KR" — 해당 키워드가 가장 강력한 시장
2. globalKeyword: 해당 시장의 현지 언어로 된 실제 검색 키워드
   - US: 영어 (예: "Side hustle ideas 2026", "Passive income for beginners")
   - JP: 일본어 (예: "副業 おすすめ 2026", "不労所得 始め方")
   - CN: 중국어 (예: "副业赚钱", "被动收入 方法")
   - KR: 한국어 (예: "부업 추천 2026", "N잡러 현실")
3. koMeaning: 한국어로 번역 + 왜 이 키워드가 뜨는지 한 줄 설명
4. competition: "하" | "중" | "상" — YouTube/TikTok에서의 상위 랭킹 난이도
5. profitability: 1~10 — 광고 단가(CPM), 구매 전환율, 스폰서십 가치 종합
6. psychology: 이 키워드가 타겟(MZ세대 직장인)의 어떤 심리를 자극하는가?
7. targetHook: 이 키워드로 숏폼 영상을 만들 때 스크롤을 멈추게 할 치명적인 첫 문장 (한국어 해요체)

[Output Format — RETURN ONLY VALID JSON ARRAY]
[
  {
    "region": "US",
    "globalKeyword": "Side hustle ideas 2026",
    "koMeaning": "2026 부업 아이디어 — 미국 MZ 사이에서 경제적 자유 트렌드 폭발",
    "competition": "중",
    "profitability": 9,
    "psychology": "경기 불안 속 '플랜 B'를 원하는 생존 본능 자극",
    "targetHook": "미국에서 지금 가장 핫한 부업, 한국에선 아직 아무도 안 해요..."
  }
]

[중요 규칙]
- 각 시장(US, JP, CN)에서 최소 4~5개, KR에서 최소 3~5개를 반드시 포함하세요.
- 총 15~20개 키워드를 반환하세요.
- 수익성 7점 이상인 키워드를 최우선 배치하세요.
- 경쟁률 "하" + 수익성 8점 이상 = ★황금 키워드★ (psychology 앞에 ★ 추가).
- globalKeyword는 반드시 해당 시장의 현지 언어로 작성하세요.
- targetHook은 반드시 한국어 해요체(~해요, ~거예요, ~인가요?)를 사용하세요.
- 단순 번역이 아니라 실제로 해당 플랫폼에서 바이럴되는 현실적인 키워드를 생성하세요.`;

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
      // JSON 파싱 실패 시 배열 추출 시도
      const match = responseText.match(/\[[\s\S]*\]/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        throw new Error('Gemini 응답을 JSON으로 파싱할 수 없습니다.');
      }
    }

    // 수익성 기준 내림차순 정렬
    const scored = Array.isArray(parsed) ? parsed : [];
    scored.sort((a, b) => (b.profitability || 0) - (a.profitability || 0));

    const goldenCount = scored.filter(
      (k) => k.competition === '하' && (k.profitability || 0) >= 8
    ).length;

    // 시장별 카운트
    const regionCounts = {
      US: scored.filter((k) => k.region === 'US').length,
      JP: scored.filter((k) => k.region === 'JP').length,
      CN: scored.filter((k) => k.region === 'CN').length,
      KR: scored.filter((k) => k.region === 'KR').length,
    };

    console.log(
      `✅ [KEYWORD] 글로벌 확장 완료: ${scored.length}개 (US:${regionCounts.US} JP:${regionCounts.JP} CN:${regionCounts.CN} KR:${regionCounts.KR}), 황금 ${goldenCount}개`
    );

    return NextResponse.json({
      success: true,
      engine: 'keyword-scorer',
      data: {
        seed,
        total: scored.length,
        goldenCount,
        regionCounts,
        keywords: scored,
      },
    });
  } catch (error) {
    console.error('❌ [KEYWORD] 처리 실패:', error.message);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
