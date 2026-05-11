'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function EmpireConsole() {
  const [isLocked, setIsLocked] = useState(true);
  const [showShadowRoom, setShowShadowRoom] = useState(false);

  // 마스터 입력 상태
  const [masterInput, setMasterInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [engineResult, setEngineResult] = useState(null);
  const [activeEngine, setActiveEngine] = useState('recreate'); // recreate | summary | commerce

  // Master DNA — 전역 대시보드 상태 (모든 하위 버튼이 참조)
  const [masterDNA, setMasterDNA] = useState({
    brand_name: '',
    main_color: 'gold and dark green',
    mood: 'luxury premium',
    usp: [],
    target: '30-50대 고소득 전문직',
  });

  // 구역별 데이터
  const [copyData, setCopyData] = useState(null);
  const [visualAssets, setVisualAssets] = useState([]);
  const [videoCuts, setVideoCuts] = useState([]);
  const [mjPrompts, setMjPrompts] = useState(null); // MJ 프롬프트 4종
  const [toastMsg, setToastMsg] = useState(null);
  const [uploadedImages, setUploadedImages] = useState([]); // 업로드 썸네일
  const [isDragOver, setIsDragOver] = useState(false);
  const [videoJobs, setVideoJobs] = useState([]); // 영상 생성 작업
  const [videoSourceImg, setVideoSourceImg] = useState(null); // 3구역 소스 이미지
  const [summaryResult, setSummaryResult] = useState(null); // 엔진2 하이라이트 결과
  const [summaryProcessing, setSummaryProcessing] = useState(false);
  const [commerceResult, setCommerceResult] = useState(null); // 엔진3 커머스 결과
  const [commerceProcessing, setCommerceProcessing] = useState(false);
  const [commerceImage, setCommerceImage] = useState(null); // 상품 이미지

  // 쉐도우 룸 에셋 선택
  const [selectedAssets, setSelectedAssets] = useState([]);

  // ElevenLabs 보이스 목록
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState('');
  const [voicesLoading, setVoicesLoading] = useState(false);

  // 대시보드 로드 시 보이스 목록 자동 불러오기
  useEffect(() => {
    const fetchVoices = async () => {
      setVoicesLoading(true);
      try {
        const res = await fetch('/api/voices');
        const data = await res.json();
        if (data.success && data.voices.length > 0) {
          setVoices(data.voices);
          setSelectedVoice(data.voices[0].id);
        }
      } catch (e) {
        console.log('⚠️ 보이스 목록 로드 실패:', e.message);
      }
      setVoicesLoading(false);
    };
    fetchVoices();
  }, []);

  // 드래그 앤 드롭 핸들러
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length === 0) return;
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setUploadedImages(prev => [...prev, { name: file.name, url: ev.target.result, file }]);
      };
      reader.readAsDataURL(file);
    });
    setToastMsg(`✅ ${files.length}개 이미지 업로드 완료`);
    setTimeout(() => setToastMsg(null), 2000);
  };

  const handleFileInput = (e) => {
    const files = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setUploadedImages(prev => [...prev, { name: file.name, url: ev.target.result, file }]);
      };
      reader.readAsDataURL(file);
    });
    if (files.length > 0) {
      setToastMsg(`✅ ${files.length}개 이미지 업로드 완료`);
      setTimeout(() => setToastMsg(null), 2000);
    }
  };

  // 엔진 2: 원본 숏폼 요약
  const handleSummaryEngine = async () => {
    if (!masterInput || summaryProcessing) return;
    setSummaryProcessing(true);
    setSummaryResult(null);
    setToastMsg('✂️ YouTube 자막 스캔 + AI 하이라이트 분석 중...');

    try {
      const res = await fetch('/api/engine/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: masterInput }),
      });
      const data = await res.json();
      if (data.success) {
        setSummaryResult(data.data);
        setToastMsg(`✅ 하이라이트 ${data.data.highlights?.length || 0}개 추출 완료!`);
      } else {
        setToastMsg(`❌ ${data.error}`);
      }
    } catch (err) {
      setToastMsg(`❌ 에러: ${err.message}`);
    }
    setSummaryProcessing(false);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // 엔진 3: 커머스 맞춤 광고
  const handleCommerceEngine = async () => {
    if ((!masterInput && !commerceImage) || commerceProcessing) return;
    setCommerceProcessing(true);
    setCommerceResult(null);
    setToastMsg('🛍️ 상품 분석 + 광고 기획 중...');

    try {
      const res = await fetch('/api/engine/commerce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: masterInput || undefined,
          image: commerceImage || undefined,
          productName: masterInput || '상품',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCommerceResult(data);
        setToastMsg(`✅ 시나리오 ${data.scenario} 광고 기획 완료!`);
      } else {
        setToastMsg(`❌ ${data.error}`);
      }
    } catch (err) {
      setToastMsg(`❌ 에러: ${err.message}`);
    }
    setCommerceProcessing(false);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // 영상 생성 (Image-to-Video)
  const handleVideoGenerate = async (prompt, imageUrl, provider = 'runway') => {
    const jobId = Date.now();
    setVideoJobs(prev => [...prev, { id: jobId, prompt, imageUrl, provider, status: 'processing', progress: 0 }]);
    setToastMsg(`🎬 ${provider.toUpperCase()} 영상 생성 시작...`);
    setTimeout(() => setToastMsg(null), 2000);

    try {
      const res = await fetch('/api/video-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, imageUrl, provider, duration: 5 }),
      });
      const data = await res.json();
      setVideoJobs(prev => prev.map(j => j.id === jobId
        ? { ...j, status: data.success ? (data.data.status || 'complete') : 'error', result: data.data, error: data.error }
        : j
      ));
      if (data.success) {
        setToastMsg(`✅ ${provider.toUpperCase()} 영상 작업 완료`);
      } else {
        setToastMsg(`❌ 영상 생성 실패: ${data.error}`);
      }
      setTimeout(() => setToastMsg(null), 3000);
    } catch (err) {
      setVideoJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: 'error', error: err.message } : j));
      setToastMsg(`❌ 에러: ${err.message}`);
      setTimeout(() => setToastMsg(null), 3000);
    }
  };

  // 쉐도우 룸 모드 활성화 로직 — 서버사이드 검증
  const handleShadowToggle = async () => {
    if (isLocked) {
      const pw = prompt("전속 비번을 입력하십시오:");
      if (!pw) return;
      try {
        const res = await fetch('/api/shadow-auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: pw }),
        });
        const data = await res.json();
        if (data.success) {
          setIsLocked(false);
          setShowShadowRoom(true);
          alert("🔒 쉐도우 룸 보안이 해제되었습니다. 관리자 모드 가동.");
        } else {
          alert("⚠️ 경고: " + data.error);
        }
      } catch (err) {
        alert("인증 서버 오류: " + err.message);
      }
    } else {
      setShowShadowRoom(!showShadowRoom);
    }
  };

  // 제국 엔진 가동
  const handleIgnite = async () => {
    if (!masterInput.trim()) {
      alert("URL 또는 주제를 입력해주세요.");
      return;
    }
    setIsProcessing(true);
    setEngineResult(null);

    try {
      // 카피 생성
      const copyRes = await fetch('/api/ad-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: masterInput,
          usps: [masterInput],
          targetAudience: '30-50대 고소득 전문직',
        })
      });
      const copyResult = await copyRes.json();
      if (copyResult.success) {
        setCopyData(copyResult.data);
      }

      // 렌더링 엔진
      const renderRes = await fetch('/api/render-engine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'M',
          script: masterInput,
          videoPrompts: [
            `Cinematic establishing shot of ${masterInput}, luxury real estate, golden hour, 4K`,
            `Slow motion detail shot of premium interior design, marble and wood, warm lighting`,
            `Aerial drone sweeping shot over urban landscape at sunset, volumetric clouds, epic scale`
          ],
        })
      });
      const renderResult = await renderRes.json();
      if (renderResult.success) {
        setVideoCuts(renderResult.data.videos || []);
        setEngineResult(renderResult.data);
      }

      // MJ 프롬프트 4종 자동 생성 (입력 키워드 기반)
      const kw = masterInput;
      // Master DNA 업데이트
      const usps = copyResult.success && copyResult.data?.[0] ? [copyResult.data[0].headline, copyResult.data[0].body?.substring(0, 50)] : [kw];
      setMasterDNA({
        brand_name: kw,
        main_color: 'gold and dark green',
        mood: 'luxury premium cinematic',
        usp: usps,
        target: '30-50대 고소득 전문직',
      });

      setMjPrompts({
        poster: `A breathtaking wide aerial shot of ${kw} luxury apartment complex surrounded by a massive lush green park at sunrise, modern architecture, cinematic lighting, photorealistic, 8k, architectural photography --ar 9:16 --v 6.0`,
        logo: `A minimalist luxury real estate logo for ${kw}, high-end apartment emblem, geometric, gold and dark green, flat vector design, clean white background, premium brand identity --no text, typography, letters --v 6.0`,
        sns: `A successful young Korean professional relaxing on a luxury ${kw} apartment terrace with a cup of coffee, looking at the park view, warm morning light, premium lifestyle, photorealistic, 8k, advertisement style --ar 1:1 --v 6.0`,
        card: `High-end luxury ${kw} apartment entrance signage mockup, dark marble stone texture with metallic gold accents, minimal, clean, cinematic lighting, photorealistic, 8k --ar 16:9 --v 6.0`,
      });

      setIsProcessing(false);
    } catch (error) {
      setIsProcessing(false);
      alert("엔진 오류: " + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-black text-gray-100 p-4 md:p-6 font-sans">
      {/* HEADER: 통합 컨트롤 바 */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-800 pb-4 mb-8 gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-xl md:text-2xl font-black tracking-tighter text-amber-500">🏛️ EMPIRE INTEGRATED CONSOLE</h1>
          <Link href="/" className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
            ← 관제소
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">
            STATUS: <span className={isProcessing ? 'text-amber-400 animate-pulse' : 'text-emerald-400'}>
              {isProcessing ? 'PROCESSING' : 'ACTIVE'}
            </span>
          </span>
          {/* 쉐도우 룸 스위치 */}
          <button
            onClick={handleShadowToggle}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${
              showShadowRoom
                ? 'bg-amber-600 border-amber-500 text-white shadow-lg shadow-amber-900/30'
                : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
            }`}
          >
            {showShadowRoom ? "🔒 쉐도우 룸 ON" : "🔓 쉐도우 룸 OFF"}
          </button>
        </div>
      </header>

      {/* STEP 1: 마스터 입력 포털 */}
      <section className="mb-10 bg-gray-900/50 p-6 md:p-8 rounded-2xl border border-gray-800 shadow-2xl">
        <h2 className="text-amber-500 font-bold mb-4 text-sm uppercase tracking-widest">🔻 STEP 1: 마스터 입력 포털</h2>

        {/* 3엔진 탭 메뉴 */}
        <div className="flex gap-2 mb-5 border-b border-gray-800 pb-3 overflow-x-auto">
          {[
            { id: 'recreate', icon: '🚀', label: '롱폼 재창조 (시네마틱)', color: 'amber' },
            { id: 'summary', icon: '✂️', label: '원본 숏폼 요약', color: 'cyan' },
            { id: 'commerce', icon: '🛍️', label: '커머스 맞춤 광고', color: 'pink' },
          ].map((engine) => (
            <button
              key={engine.id}
              onClick={() => setActiveEngine(engine.id)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap border ${
                activeEngine === engine.id
                  ? `bg-${engine.color}-600/20 border-${engine.color}-600 text-${engine.color}-400 shadow-lg`
                  : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:border-gray-600'
              }`}
              style={activeEngine === engine.id ? {
                background: engine.id === 'recreate' ? 'rgba(217,119,6,0.15)' : engine.id === 'summary' ? 'rgba(6,182,212,0.15)' : 'rgba(236,72,153,0.15)',
                borderColor: engine.id === 'recreate' ? '#d97706' : engine.id === 'summary' ? '#06b6d4' : '#ec4899',
                color: engine.id === 'recreate' ? '#fbbf24' : engine.id === 'summary' ? '#22d3ee' : '#f472b6',
              } : {}}
            >
              {engine.icon} {engine.label}
            </button>
          ))}
        </div>

        {/* 엔진 A: 롱폼 재창조 (현재 가동 중) */}
        {activeEngine === 'recreate' && (
          <div>
            <p className="text-[10px] text-amber-400 mb-3 font-medium">⚡ 기존 영상을 AI 비주얼로 전면 재창조합니다. 카피 + MJ 프롬프트 + 영상 시퀀스 자동 생성.</p>
            <div className="flex flex-col md:flex-row gap-4">
              <input
                type="text"
                value={masterInput}
                onChange={(e) => setMasterInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleIgnite()}
                placeholder="유튜브 URL, 영상 주소, 또는 프로젝트 키워드를 입력하십시오..."
                className="flex-1 bg-black border border-gray-700 rounded-lg p-3.5 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 outline-none transition-all placeholder-gray-600"
              />
              <button
                onClick={handleIgnite}
                disabled={isProcessing}
                className={`px-8 py-3.5 rounded-lg font-bold transition-all text-sm whitespace-nowrap ${
                  isProcessing
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black shadow-lg shadow-amber-900/30'
                }`}
              >
                {isProcessing ? '⏳ 제국 엔진 가동 중...' : '⚡ 제국 엔진 가동'}
              </button>
            </div>
          </div>
        )}

        {/* 엔진 B: 원본 숏폼 요약 */}
        {activeEngine === 'summary' && (
          <div>
            <p className="text-[10px] text-cyan-400 mb-3 font-medium">✂️ 원본 영상의 하이라이트를 추출하고 세로형(Face-Tracking)으로 변환합니다.</p>
            <div className="flex flex-col md:flex-row gap-4">
              <input
                type="text"
                value={masterInput}
                onChange={(e) => setMasterInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !summaryProcessing && masterInput && handleSummaryEngine()}
                placeholder="YouTube URL을 입력하세요 (예: https://youtube.com/watch?v=...)" 
                className="flex-1 bg-black border border-gray-700 rounded-lg p-3.5 text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 outline-none transition-all placeholder-gray-600"
              />
              <button
                disabled={summaryProcessing || !masterInput}
                onClick={handleSummaryEngine}
                className={`px-8 py-3.5 rounded-lg font-bold text-sm whitespace-nowrap transition-all ${
                  summaryProcessing
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed animate-pulse'
                    : !masterInput
                    ? 'bg-gray-800 border border-cyan-800/30 text-cyan-700 cursor-not-allowed'
                    : 'bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-black shadow-lg shadow-cyan-900/30'
                }`}
              >
                {summaryProcessing ? '⏳ 자막 스캔 + AI 분석 중...' : '✂️ 하이라이트 추출'}
              </button>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="bg-black/40 p-3 rounded-lg border border-gray-800 text-center">
                <p className="text-cyan-400 text-xs font-bold">🎤 Face-Track</p>
                <p className="text-[9px] text-gray-500 mt-1">인물 중심 자동 크롭</p>
              </div>
              <div className="bg-black/40 p-3 rounded-lg border border-gray-800 text-center">
                <p className="text-cyan-400 text-xs font-bold">📊 하이라이트</p>
                <p className="text-[9px] text-gray-500 mt-1">AI 핵심 구간 추출</p>
              </div>
              <div className="bg-black/40 p-3 rounded-lg border border-gray-800 text-center">
                <p className="text-cyan-400 text-xs font-bold">9:16 변환</p>
                <p className="text-[9px] text-gray-500 mt-1">세로형 자동 리프레이밍</p>
              </div>
            </div>

            {/* 하이라이트 결과 */}
            {summaryResult && (
              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-cyan-400 text-xs font-bold">📊 하이라이트 추출 결과</h4>
                  <button
                    onClick={() => { navigator.clipboard.writeText(JSON.stringify(summaryResult, null, 2)); setToastMsg('✅ 하이라이트 JSON 복사 완료'); setTimeout(() => setToastMsg(null), 2000); }}
                    className="text-[9px] text-cyan-500 hover:text-cyan-400"
                  >📋 JSON 복사</button>
                </div>
                {summaryResult.source?.title && (
                  <div className="bg-black/40 p-3 rounded-lg border border-gray-800 text-[10px]">
                    <p className="text-white font-bold">{summaryResult.source.title}</p>
                    <p className="text-gray-500 mt-1">{summaryResult.source.channel} · {Math.round(summaryResult.source.duration / 60)}분</p>
                    {summaryResult.summary && <p className="text-gray-400 mt-1 italic">{summaryResult.summary}</p>}
                  </div>
                )}
                {summaryResult.highlights?.map((h, i) => (
                  <div key={i} className="bg-black/30 p-3 rounded-lg border border-cyan-900/30 text-[10px]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-cyan-400 font-bold">#{h.rank || i + 1} {h.emotion && `${h.emotion === '놀라움' ? '😮' : h.emotion === '감동' ? '🥹' : h.emotion === '유머' ? '😂' : h.emotion === '긴장' ? '😰' : '🔥'}`}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">{Math.floor(h.start_sec / 60)}:{String(h.start_sec % 60).padStart(2, '0')} → {Math.floor(h.end_sec / 60)}:{String(h.end_sec % 60).padStart(2, '0')}</span>
                        {h.viral_score && <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${h.viral_score >= 8 ? 'bg-red-900/50 text-red-300' : h.viral_score >= 6 ? 'bg-amber-900/50 text-amber-300' : 'bg-gray-800 text-gray-400'}`}>🔥 {h.viral_score}/10</span>}
                      </div>
                    </div>
                    <p className="text-white">{h.caption}</p>
                    <p className="text-gray-500 mt-1">{h.reason}</p>
                    {h.keywords && <div className="mt-1 flex gap-1 flex-wrap">{h.keywords.map((kw, ki) => <span key={ki} className="px-1.5 py-0.5 bg-cyan-900/30 text-cyan-300 rounded text-[8px]">{kw}</span>)}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 엔진 C: 커머스 맞춤 광고 */}
        {activeEngine === 'commerce' && (
          <div>
            <p className="text-[10px] text-pink-400 mb-3 font-medium">🛍️ 상품 URL 또는 제품 사진을 분석하여 판매 특화 광고를 렌더링합니다. (두 개 다 넣으면 하이브리드 모드!)</p>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col md:flex-row gap-3">
                <input
                  type="text"
                  value={masterInput}
                  onChange={(e) => setMasterInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCommerceEngine()}
                  placeholder="상품 URL (쿠팡, 네이버 스토어, 자사몰 등)..."
                  className="flex-1 bg-black border border-gray-700 rounded-lg p-3 text-sm focus:border-pink-500 focus:ring-1 focus:ring-pink-500/20 outline-none transition-all placeholder-gray-600"
                />
                <div className="flex gap-2">
                  <label className={`px-4 py-3 rounded-lg text-[10px] font-bold cursor-pointer transition-all border ${
                    commerceImage ? 'bg-pink-900/30 border-pink-600 text-pink-300' : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-pink-700'
                  }`}>
                    {commerceImage ? '✅ 사진 업로드됨' : '📷 제품 사진'}
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) { const reader = new FileReader(); reader.onload = (ev) => setCommerceImage(ev.target.result); reader.readAsDataURL(file); }
                    }} />
                  </label>
                  <button
                    disabled={commerceProcessing || (!masterInput && !commerceImage)}
                    onClick={handleCommerceEngine}
                    className={`px-6 py-3 rounded-lg font-bold text-sm whitespace-nowrap transition-all ${
                      commerceProcessing
                        ? 'bg-gray-700 text-gray-400 cursor-not-allowed animate-pulse'
                        : (!masterInput && !commerceImage)
                        ? 'bg-gray-800 text-pink-700 cursor-not-allowed'
                        : 'bg-gradient-to-r from-pink-600 to-pink-500 hover:from-pink-500 hover:to-pink-400 text-white shadow-lg shadow-pink-900/30'
                    }`}
                  >
                    {commerceProcessing ? '⏳ AI 분석 중...' : '🛍️ 광고 기획'}
                  </button>
                </div>
              </div>
              {commerceImage && (
                <div className="flex items-center gap-3">
                  <img src={commerceImage} alt="product" className="w-16 h-16 object-cover rounded-lg border border-pink-800" />
                  <div className="text-[9px] text-gray-500">
                    <p>시나리오: {masterInput ? 'C (하이브리드)' : 'A (이미지 감성)'}</p>
                    <p>Gemini Vision 멀티모달 분석</p>
                  </div>
                  <button onClick={() => setCommerceImage(null)} className="text-[8px] text-red-500 hover:text-red-400">❌ 제거</button>
                </div>
              )}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className={`p-3 rounded-lg border text-center ${!commerceImage && !masterInput ? 'bg-black/40 border-gray-800' : masterInput && commerceImage ? 'bg-pink-900/20 border-pink-700/50' : commerceImage ? 'bg-pink-900/10 border-pink-800/30' : 'bg-pink-900/10 border-pink-800/30'}`}>
                <p className="text-pink-400 text-xs font-bold">{commerceImage && masterInput ? '🔥 하이브리드' : commerceImage ? '📸 감성 모드' : '📊 논리 모드'}</p>
                <p className="text-[9px] text-gray-500 mt-1">시나리오 {commerceImage && masterInput ? 'C' : commerceImage ? 'A' : 'B'}</p>
              </div>
              <div className="bg-black/40 p-3 rounded-lg border border-gray-800 text-center">
                <p className="text-pink-400 text-xs font-bold">📝 설득카피</p>
                <p className="text-[9px] text-gray-500 mt-1">구매 전환 최적화</p>
              </div>
              <div className="bg-black/40 p-3 rounded-lg border border-gray-800 text-center">
                <p className="text-pink-400 text-xs font-bold">🎬 MJ+영상</p>
                <p className="text-[9px] text-gray-500 mt-1">컨 자동 생성</p>
              </div>
            </div>

            {/* 커머스 결과 */}
            {commerceResult && (
              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-pink-400 text-xs font-bold">🛍️ {commerceResult.scenarioLabel} 결과</h4>
                  <button
                    onClick={() => { navigator.clipboard.writeText(JSON.stringify(commerceResult.data, null, 2)); setToastMsg('✅ 커머스 JSON 복사 완료'); setTimeout(() => setToastMsg(null), 2000); }}
                    className="text-[9px] text-pink-500 hover:text-pink-400"
                  >📋 JSON 복사</button>
                </div>
                {commerceResult.data.product_analysis && (
                  <div className="bg-black/40 p-3 rounded-lg border border-gray-800 text-[10px]">
                    <p className="text-white font-bold">{commerceResult.data.product_analysis.name || '상품'}</p>
                    <p className="text-gray-500 mt-1">카테고리: {commerceResult.data.product_analysis.category} · 톤: {commerceResult.data.product_analysis.price_tier}</p>
                    {commerceResult.data.product_analysis.usp?.length > 0 && <div className="mt-1 flex gap-1 flex-wrap">{commerceResult.data.product_analysis.usp.map((u, i) => <span key={i} className="px-1.5 py-0.5 bg-pink-900/30 text-pink-300 rounded text-[8px]">{u}</span>)}</div>}
                  </div>
                )}
                {commerceResult.data.ad_variants?.map((v, i) => (
                  <div key={i} className="bg-black/30 p-3 rounded-lg border border-pink-900/30 text-[10px]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-pink-400 font-bold">{v.angle}</span>
                      <button onClick={() => { navigator.clipboard.writeText(`${v.headline}\n${v.body}\n${v.cta}`); setToastMsg('✅ 카피 복사'); setTimeout(() => setToastMsg(null), 1500); }} className="text-[8px] text-gray-500 hover:text-pink-400">📋</button>
                    </div>
                    <p className="text-white font-bold">{v.headline}</p>
                    <p className="text-gray-400 mt-1">{v.body}</p>
                    <p className="text-pink-300 mt-1 font-bold">➡️ {v.cta}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 엔진 상태 표시 */}
        {isProcessing && (
          <div className="mt-4 flex items-center gap-3 text-xs text-amber-400">
            <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
            카피라이팅 AI + 렌더링 엔진 + 비디오 시퀀스 동시 가동 중...
          </div>
        )}
      </section>

      {/* Master DNA 하위 기능 버튼 */}
      {masterDNA.brand_name && (
        <section className="mb-6 bg-gray-900/30 p-4 rounded-xl border border-gray-800">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-amber-500 text-xs font-bold">🧬 MASTER DNA</span>
            <span className="text-[9px] text-gray-500 bg-black/30 px-2 py-0.5 rounded">{masterDNA.brand_name}</span>
            <span className="text-[9px] text-gray-600">{masterDNA.target}</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {[
              { id: 'btn_logo', icon: '🎨', label: '로고 생성', prompt: `A minimalist luxury real estate logo for ${masterDNA.brand_name}, high-end emblem, geometric, ${masterDNA.main_color}, flat vector design, clean white background, premium brand identity --no text, typography, letters --v 6.0` },
              { id: 'btn_poster', icon: '🖼️', label: '포스터 시안', prompt: `A breathtaking cinematic poster for ${masterDNA.brand_name}, featuring ${masterDNA.usp[0] || masterDNA.brand_name}, ${masterDNA.mood}, photorealistic, 8k, advertising photography --ar 9:16 --v 6.0` },
              { id: 'btn_banner', icon: '📱', label: 'SNS 배너', prompt: `An Instagram advertisement banner for ${masterDNA.brand_name}, targeting ${masterDNA.target}, modern lifestyle visual, ${masterDNA.main_color} accent, premium feel, clean layout, photorealistic --ar 1:1 --v 6.0` },
              { id: 'btn_card', icon: '🪨', label: '디지털 명함', prompt: `Professional luxury business card design for ${masterDNA.brand_name}, dark marble texture with ${masterDNA.main_color} metallic accents, minimal, clean, cinematic lighting, photorealistic, 8k --ar 16:9 --v 6.0` },
              { id: 'btn_script', icon: '✍️', label: '광고 대본', prompt: `Write a viral 15-second Korean ad script in 해요체 for ${masterDNA.brand_name}. USP: ${masterDNA.usp.join(', ')}. Target: ${masterDNA.target}. Tone: ${masterDNA.mood}. Make it emotional and conversational.` },
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => {
                  navigator.clipboard.writeText(btn.prompt);
                  setToastMsg(`✅ ${btn.label} 프롬프트 복사 완료`);
                  setTimeout(() => setToastMsg(null), 2000);
                }}
                className="flex items-center gap-1.5 px-3 py-2 bg-black/40 hover:bg-amber-900/20 border border-gray-800 hover:border-amber-700/50 rounded-lg text-[10px] text-gray-300 hover:text-amber-300 transition-all"
              >
                <span>{btn.icon}</span>
                <span className="font-bold">{btn.label}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* STEP 2: 3대 구역 통합 그리드 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        {/* 구역 A: 기획/카피 */}
        <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 hover:border-gray-700 transition-colors">
          <h3 className="text-blue-400 font-bold mb-4 border-b border-gray-800 pb-2 text-sm flex items-center gap-2">
            📝 기획 & 카피라이팅
            {copyData && <span className="text-[10px] px-1.5 py-0.5 bg-blue-900/30 text-blue-300 rounded">READY</span>}
          </h3>
          <div className="space-y-3 text-sm text-gray-400">
            {copyData ? (
              copyData.map((copy, i) => (
                <div key={i} className="bg-black/50 p-3 rounded-lg border border-gray-800/50">
                  <p className="text-white font-bold text-xs mb-1">{copy.headline}</p>
                  <p className="text-gray-400 text-[11px] leading-relaxed">{copy.body}</p>
                  <p className="text-cyan-400 text-[10px] mt-1.5 font-medium">{copy.cta}</p>
                </div>
              ))
            ) : (
              <p className="bg-black/30 p-4 rounded-lg text-center text-gray-600 text-xs italic">
                엔진 가동 후 카피가 생성됩니다
              </p>
            )}
            {copyData && (
              <button
                onClick={() => {
                  const all = copyData.map(c => `${c.headline}\n${c.body}\n${c.cta}`).join('\n\n---\n\n');
                  navigator.clipboard.writeText(all);
                  alert('✅ 카피 전체 복사 완료');
                }}
                className="w-full py-2 bg-gray-800 hover:bg-gray-700 rounded text-xs transition-colors"
              >
                📋 카피 전체 복사
              </button>
            )}
          </div>
        </div>

        {/* 구역 B: 비주얼 시안 (미드저니) */}
        <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 hover:border-gray-700 transition-colors text-sm">
          <h3 className="text-emerald-400 font-bold mb-4 border-b border-gray-800 pb-2 text-sm flex items-center gap-2">
            🎨 비주얼 브랜딩
            {mjPrompts && <span className="text-[10px] px-1.5 py-0.5 bg-emerald-900/30 text-emerald-300 rounded">4 PROMPTS</span>}
          </h3>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {[
              { key: 'poster', icon: '📸', label: '포스터 시안' },
              { key: 'logo', icon: '◈', label: '로고/간판' },
              { key: 'sns', icon: '📱', label: 'SNS 배너' },
              { key: 'card', icon: '💳', label: '명함' },
            ].map((item) => (
              <div
                key={item.key}
                onClick={() => {
                  if (mjPrompts?.[item.key]) {
                    navigator.clipboard.writeText(mjPrompts[item.key]);
                    setToastMsg(`✅ ${item.label} 프롬프트 복사 완료`);
                    setTimeout(() => setToastMsg(null), 2000);
                  }
                }}
                className={`bg-black aspect-video rounded-lg flex flex-col items-center justify-center text-[10px] border transition-all cursor-pointer ${
                  mjPrompts?.[item.key]
                    ? 'border-emerald-800/50 hover:border-emerald-600 text-emerald-400'
                    : 'border-gray-800 hover:border-gray-700 text-gray-600'
                }`}
              >
                <span className="text-lg mb-1">{item.icon}</span>
                <span>{item.label}</span>
                {mjPrompts?.[item.key] && <span className="text-[8px] text-gray-500 mt-0.5">클릭으로 복사</span>}
              </div>
            ))}
          </div>
          <button
            onClick={() => {
              if (mjPrompts) {
                const all = Object.entries(mjPrompts)
                  .map(([k, v]) => `[${k.toUpperCase()}]\n${v}`)
                  .join('\n\n---\n\n');
                navigator.clipboard.writeText(all);
                setToastMsg('✅ 4종 프롬프트 전체 복사 완료');
                setTimeout(() => setToastMsg(null), 2000);
              } else {
                alert('엔진 가동 후 프롬프트가 생성됩니다.');
              }
            }}
            className={`w-full py-2 border rounded text-xs mb-3 transition-colors ${
              mjPrompts
                ? 'border-emerald-700 hover:bg-emerald-900/30 text-emerald-400'
                : 'border-gray-700 hover:border-gray-600 text-gray-500'
            }`}
          >
            📋 프롬프트 일괄 복사 {mjPrompts ? '(4종)' : ''}
          </button>
          {/* 업로드 썸네일 표시 */}
          {uploadedImages.length > 0 && (
            <div className="grid grid-cols-4 gap-1.5 mb-3">
              {uploadedImages.map((img, i) => (
                <div key={i} className="relative group">
                  <img src={img.url} alt={img.name} className="w-full aspect-square object-cover rounded-lg border border-gray-700" />
                  <button
                    onClick={() => setUploadedImages(prev => prev.filter((_, idx) => idx !== i))}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white text-[8px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  >×</button>
                  <button
                    onClick={() => { setVideoSourceImg(img.url); setToastMsg(`✅ ${img.name} → 3구역 소스로 선택`); setTimeout(() => setToastMsg(null), 2000); }}
                    className="absolute bottom-0 left-0 right-0 bg-purple-600/80 text-white text-[7px] py-0.5 text-center opacity-0 group-hover:opacity-100 transition-opacity rounded-b-lg"
                  >🎬 영상 소스</button>
                </div>
              ))}
            </div>
          )}
          {/* 드래그 앤 드롭 영역 */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => document.getElementById('mj-upload').click()}
            className={`block w-full py-4 border-2 border-dashed rounded-lg text-center text-[10px] cursor-pointer transition-all ${
              isDragOver
                ? 'border-emerald-400 bg-emerald-900/20 text-emerald-300 scale-[1.02]'
                : 'border-gray-700 hover:border-emerald-800 text-gray-500'
            }`}
          >
            {isDragOver ? '🎯 여기에 놓으세요!' : '📁 미드저니 결과물 업로드 (드래그 앤 드롭 또는 클릭)'}
            <input id="mj-upload" type="file" className="hidden" accept="image/*" multiple onChange={handleFileInput} />
          </div>
        </div>

        {/* 구역 C: 영상/오디오 (런웨이/루마) */}
        <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 hover:border-gray-700 transition-colors">
          <h3 className="text-purple-400 font-bold mb-4 border-b border-gray-800 pb-2 text-sm flex items-center gap-2">
            🎬 시네마틱 영상
            {videoJobs.length > 0 && <span className="text-[10px] px-1.5 py-0.5 bg-purple-900/30 text-purple-300 rounded">{videoJobs.length} JOBS</span>}
          </h3>
          <div className="space-y-3">
            {/* 소스 이미지 표시 */}
            {videoSourceImg && (
              <div className="bg-black/50 p-2 rounded-lg border border-purple-800/50">
                <p className="text-[9px] text-purple-400 font-bold mb-1">📸 소스 이미지 (Image→Video)</p>
                <img src={videoSourceImg} alt="Video source" className="w-full aspect-video object-cover rounded" />
              </div>
            )}

            {/* 이미지 드롭 영역 */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
                if (files[0]) {
                  const reader = new FileReader();
                  reader.onload = (ev) => { setVideoSourceImg(ev.target.result); setToastMsg('✅ 영상 소스 이미지 설정 완료'); setTimeout(() => setToastMsg(null), 2000); };
                  reader.readAsDataURL(files[0]);
                }
              }}
              onClick={() => document.getElementById('video-src-upload').click()}
              className="border-2 border-dashed border-gray-800 hover:border-purple-700 p-3 rounded-lg text-center text-[10px] text-gray-600 cursor-pointer transition-colors"
            >
              {videoSourceImg ? '🔄 소스 이미지 교체 (드래그 또는 클릭)' : '📸 소스 이미지 드롭 (Image→Video)'}
              <input id="video-src-upload" type="file" className="hidden" accept="image/*" onChange={(e) => {
                const file = e.target.files[0];
                if (file) { const reader = new FileReader(); reader.onload = (ev) => setVideoSourceImg(ev.target.result); reader.readAsDataURL(file); }
              }} />
            </div>

            {/* 영상 생성 버튼 */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleVideoGenerate(
                  mjPrompts?.poster || `Cinematic shot of ${masterInput || 'luxury apartment'}, golden hour, 4K`,
                  videoSourceImg,
                  'runway'
                )}
                className="py-2.5 bg-purple-900/50 hover:bg-purple-800/50 border border-purple-700/50 rounded-lg text-[10px] text-purple-300 font-bold transition-colors"
              >
                🎬 Runway 렌더링
              </button>
              <button
                onClick={() => handleVideoGenerate(
                  mjPrompts?.poster || `Cinematic shot of ${masterInput || 'luxury apartment'}, golden hour, 4K`,
                  videoSourceImg,
                  'luma'
                )}
                className="py-2.5 bg-indigo-900/50 hover:bg-indigo-800/50 border border-indigo-700/50 rounded-lg text-[10px] text-indigo-300 font-bold transition-colors"
              >
                ✨ Luma 렌더링
              </button>
            </div>

            {/* 🎤 ElevenLabs 보이스 드롭다운 */}
            <div className="bg-black/40 p-3 rounded-lg border border-gray-800">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] text-amber-400 font-bold">🎤 AI 성우 선택</span>
                {voicesLoading && <span className="text-[8px] text-gray-500 animate-pulse">로딩...</span>}
                {voices.length > 0 && <span className="text-[8px] px-1.5 py-0.5 bg-amber-900/30 text-amber-300 rounded">{voices.length}개 보이스</span>}
              </div>
              <select
                value={selectedVoice}
                onChange={(e) => setSelectedVoice(e.target.value)}
                className="w-full bg-black border border-gray-700 rounded-lg p-2 text-[10px] text-gray-300 focus:border-amber-500 outline-none transition-colors"
              >
                {voices.length === 0 ? (
                  <option value="">보이스 목록 로드 중...</option>
                ) : (
                  voices.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} {v.category !== 'unknown' ? `(${v.category})` : ''} {v.description ? `— ${v.description}` : ''}
                    </option>
                  ))
                )}
              </select>
              {selectedVoice && (
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="text-[8px] text-gray-600">ID: {selectedVoice.substring(0, 12)}...</span>
                  <button
                    onClick={() => { navigator.clipboard.writeText(selectedVoice); setToastMsg('✅ Voice ID 복사 완료'); setTimeout(() => setToastMsg(null), 2000); }}
                    className="text-[8px] text-cyan-500 hover:text-cyan-400 transition-colors"
                  >📋 복사</button>
                  {voices.find(v => v.id === selectedVoice)?.previewUrl && (
                    <button
                      onClick={() => { const a = new Audio(voices.find(v => v.id === selectedVoice).previewUrl); a.play(); }}
                      className="text-[8px] text-amber-500 hover:text-amber-400 transition-colors"
                    >🔊 미리듣기</button>
                  )}
                </div>
              )}
            </div>

            {/* 영상 작업 목록 */}
            {videoJobs.map((job) => (
              <div key={job.id} className={`p-3 rounded-lg border text-[10px] ${
                job.status === 'processing' ? 'bg-purple-900/20 border-purple-700/30 animate-pulse' :
                job.status === 'complete' ? 'bg-emerald-900/20 border-emerald-700/30' :
                'bg-red-900/20 border-red-700/30'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-purple-400">{job.provider.toUpperCase()}</span>
                  <span className={job.status === 'processing' ? 'text-amber-400' : job.status === 'complete' ? 'text-emerald-400' : 'text-red-400'}>
                    {job.status === 'processing' ? '⏳ 렌더링 중...' : job.status === 'complete' ? '✅ 완료' : '❌ 에러'}
                  </span>
                </div>
                <p className="text-gray-500 truncate">{job.prompt?.substring(0, 60)}...</p>
                {job.imageUrl && <p className="text-gray-600 text-[8px]">📸 Image→Video 모드</p>}
                {job.result?.message && <p className="text-gray-400 mt-1 text-[9px]">{job.result.message}</p>}
              </div>
            ))}

            {/* 오디오 플레이어 */}
            {engineResult?.audio?.dataUrl && (
              <div className="bg-black/50 p-3 rounded-lg border border-gray-800/50">
                <p className="text-[10px] text-amber-400 font-bold mb-1.5">🔊 AI 내레이션 ({engineResult.audio.source})</p>
                <audio src={engineResult.audio.dataUrl} controls className="w-full h-8" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* STEP 3: 쉐도우 룸 (비밀 시사회실) */}
      {showShadowRoom && (
        <section className="bg-amber-950/20 border-2 border-amber-900/40 p-6 md:p-8 rounded-2xl relative overflow-hidden">
          {/* 배경 글로우 */}
          <div className="absolute inset-0 bg-gradient-to-br from-amber-900/5 to-transparent pointer-events-none" />

          <div className="relative z-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
              <h2 className="text-amber-500 font-black text-lg md:text-xl flex items-center gap-3">
                🔒 STEP 3: 비밀 시사회실 (SHADOW ROOM)
              </h2>
              <span className="bg-amber-600 text-white text-[10px] px-3 py-1 rounded-full font-bold tracking-wider">
                MASTER ACCESS GRANTED
              </span>
            </div>

            {/* 에셋 선택 그리드 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {['포스터_01', '로고_최종', '숏폼_영상', 'AI_내레이션'].map((asset, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setSelectedAssets(prev =>
                      prev.includes(asset) ? prev.filter(a => a !== asset) : [...prev, asset]
                    );
                  }}
                  className={`p-3 rounded-lg text-xs font-medium transition-all border ${
                    selectedAssets.includes(asset)
                      ? 'bg-amber-900/30 border-amber-700 text-amber-300 shadow-inner'
                      : 'bg-black/30 border-gray-800 text-gray-500 hover:border-gray-700'
                  }`}
                >
                  {selectedAssets.includes(asset) ? '✅' : '⬜'} {asset}
                </button>
              ))}
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
              <div className="flex-1 bg-black/50 p-4 rounded-lg border border-amber-900/30 text-gray-400 text-sm">
                {selectedAssets.length > 0
                  ? `선택된 ${selectedAssets.length}개 에셋: [${selectedAssets.join(', ')}]`
                  : '에셋을 선택하면 고객용 보안 링크에 포함됩니다'}
              </div>
              <button
                disabled={selectedAssets.length === 0}
                className={`px-6 py-3 rounded-lg font-bold text-sm whitespace-nowrap transition-all ${
                  selectedAssets.length > 0
                    ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-900/30'
                    : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                }`}
              >
                🔗 고객용 보안 링크 생성
              </button>
            </div>
          </div>
        </section>
      )}

      {/* SYSTEM ADMINISTRATION: ANTI_PROTOCOL */}
      <section className="mt-20 border-t border-gray-800 pt-10 pb-10 opacity-40 hover:opacity-100 transition-opacity duration-500">
        <h3 className="text-gray-500 font-mono text-xs mb-4">{'// SYSTEM ADMINISTRATION: ANTI_PROTOCOL'}</h3>
        <div className="bg-gray-900/30 p-6 rounded-lg border border-dashed border-gray-700 font-mono text-[11px] leading-relaxed text-gray-400">
          <p className="text-amber-500 mb-2">[필독: 안티 지시 사항]</p>
          <ul className="list-disc ml-4 space-y-1">
            <li><strong>보안 임무:</strong> 쉐도우 룸 마스터 비번은 서버사이드 검증(<span className="text-cyan-400">/api/shadow-auth</span>)으로 보호. 클라이언트 노출 차단.</li>
            <li><strong>UI 통합 임무:</strong> 1, 2, 3구역을 그리드 레이아웃으로 한 화면에 배치. 오퍼레이터 동선 최소화 <span className="text-emerald-400">✅ 적용됨</span></li>
            <li><strong>데이터 분류 임무:</strong> URL 입력 시 AI 엔진이 카피/포스터/영상으로 자동 분류하여 해당 섹션에 즉각 표시 <span className="text-emerald-400">✅ 적용됨</span></li>
            <li><strong>API 연동 가이드:</strong>
              <ul className="list-disc ml-4 mt-1 space-y-0.5">
                <li>Midjourney: 비공식 API 세션 유지 최우선</li>
                <li>Luma/Runway: 영상 생성 Progress 실시간 모니터링</li>
                <li>ElevenLabs: 스크립트 → 성우 보이스 자동 합성 → MP4 결합</li>
              </ul>
            </li>
            <li className="mt-2 pt-2 border-t border-gray-800"><strong className="text-red-400">[긴급] 카피라이팅 TOV 전면 수정:</strong> 제 1구역 15초 숏폼 대본 생성 시, 딱딱한 설명문(<span className="text-red-300 line-through">~한다, ~하십시오</span>) 전면 금지. 시청자에게 직접 말을 거는 <span className="text-white">자연스러운 경어체/해요체</span>(~기회예요, ~어떠세요?, ~확인해 보세요)로 출력. <span className="text-emerald-400">✅ 적용됨</span>
              <div className="mt-1 bg-black/30 p-2 rounded text-[10px] text-gray-500 italic">참고 대본: &ldquo;부산에 다시없을 기회예요. 18만 평 사상공원을 내 집 앞마당처럼 누리는 진정한 하이엔드 라이프!&rdquo;</div>
            </li>
            <li className="mt-2 pt-2 border-t border-gray-800"><strong className="text-purple-400">[자막 자동화]:</strong> Gemini 대본 생성 시 타임코드 JSON 포함 → <span className="text-cyan-400">/api/subtitle</span> SRT 자동 변환 → FFmpeg <span className="text-white">subtitles 필터</span> 하드코딩. 캡컷 불필요. <span className="text-emerald-400">✅ 적용됨</span>
              <div className="mt-1 bg-black/30 p-2 rounded text-[10px] text-gray-500">스타일: Malgun Gothic / 22pt / 흰색+검정 테두리 / 하단 중앙 고정</div>
            </li>
          </ul>
        </div>
      </section>

      {/* Toast 알림 */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 bg-emerald-600 text-white px-5 py-3 rounded-xl text-sm font-bold shadow-2xl shadow-emerald-900/50 z-50 animate-bounce">
          {toastMsg}
        </div>
      )}

      {/* 하단 */}
      <footer className="mt-6 text-center text-[10px] text-gray-700 tracking-widest">
        EMPIRE INTEGRATED CONSOLE — V1.0 · MASTER ACCESS ONLY
      </footer>
    </div>
  );
}
