'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function EmpireConsole() {
  const [isLocked, setIsLocked] = useState(true);
  const [showShadowRoom, setShowShadowRoom] = useState(false);

  // 마스터 입력 상태
  const [masterInput, setMasterInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [engineResult, setEngineResult] = useState(null);

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

  // 쉐도우 룸 에셋 선택
  const [selectedAssets, setSelectedAssets] = useState([]);

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

        {/* 엔진 상태 표시 */}
        {isProcessing && (
          <div className="mt-4 flex items-center gap-3 text-xs text-amber-400">
            <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
            카피라이팅 AI + 렌더링 엔진 + 비디오 시퀀스 동시 가동 중...
          </div>
        )}
      </section>

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
