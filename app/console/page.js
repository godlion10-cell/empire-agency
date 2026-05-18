'use client';
import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { routeAfterStep, PIPELINE_STEPS, INITIAL_WIZARD_STATE } from '@/lib/pipeline-router';

export default function EmpireConsolePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center"><div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <EmpireConsole />
    </Suspense>
  );
}

function EmpireConsole() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeProjectId_param = searchParams?.get('pid') || null;
  const [activeProjectId, setActiveProjectId] = useState(activeProjectId_param);
  useEffect(() => { if (activeProjectId_param) setActiveProjectId(activeProjectId_param); }, [activeProjectId_param]);
  const [isLocked, setIsLocked] = useState(true);
  const [showShadowRoom, setShowShadowRoom] = useState(false);

  // 마스터 입력 상태
  const [masterInput, setMasterInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [engineResult, setEngineResult] = useState(null);
  const [activeEngine, setActiveEngine] = useState('recreate'); // recreate | summary | commerce | global | keyword

  // Master DNA — 전역 대시보드 상태 (모든 하위 버튼이 참조)
  const [masterDNA, setMasterDNA] = useState({
    brand_name: '',
    main_color: 'dynamic adaptive',
    mood: 'cinematic premium',
    usp: [],
    target: '',
  });

  // 구역별 데이터
  const [copyData, setCopyData] = useState(null);
  const [visualAssets, setVisualAssets] = useState([]);
  const [videoCuts, setVideoCuts] = useState([]);
  const [mjPrompts, setMjPrompts] = useState(null); // MJ 프롬프트 4종
  const [toastMsg, setToastMsg] = useState(null);
  const [uploadedImages, setUploadedImages] = useState([]); // 업로드 썸네일
  const [isDragOver, setIsDragOver] = useState(false);
  const [slotImages, setSlotImages] = useState({ poster: null, logo: null, sns: null, card: null }); // 슬롯 매핑 이미지
  const [dragOverSlot, setDragOverSlot] = useState(null); // 드래그 중인 슬롯
  const [videoJobs, setVideoJobs] = useState([]); // 영상 생성 작업
  const [visualProvider, setVisualProvider] = useState('ideogram'); // 비주얼 엔진 선택
  const [visualGenJobs, setVisualGenJobs] = useState({}); // 슬롯별 생성 상태
  const [videoSourceImg, setVideoSourceImg] = useState(null); // 3구역 소스 이미지
  const [summaryResult, setSummaryResult] = useState(null); // 엔진2 하이라이트 결과
  const [summaryProcessing, setSummaryProcessing] = useState(false);
  const [commerceResult, setCommerceResult] = useState(null); // 엔진3 커머스 결과
  const [commerceProcessing, setCommerceProcessing] = useState(false);
  const [commerceImage, setCommerceImage] = useState(null); // 상품 이미지
  const [selectedHighlight, setSelectedHighlight] = useState(null); // 선택된 하이라이트
  const [copyGenerating, setCopyGenerating] = useState(false); // 카피 생성 중
  const [visualGenerating, setVisualGenerating] = useState(false); // 비주얼 생성 중

  // ★ Global Finder 상태
  const [globalResult, setGlobalResult] = useState(null);
  const [globalProcessing, setGlobalProcessing] = useState(false);
  const [globalTab, setGlobalTab] = useState('URL'); // 'URL' | 'FILE' | 'RADAR'
  const [globalFile, setGlobalFile] = useState(null);
  const [globalFileName, setGlobalFileName] = useState('');

  // ★ Global Radar 상태
  const [radarKeyword, setRadarKeyword] = useState('');
  const [radarRegion, setRadarRegion] = useState('US');
  const [radarVideos, setRadarVideos] = useState([]);
  const [radarScanning, setRadarScanning] = useState(false);
  const [absorbingId, setAbsorbingId] = useState(null); // 현재 DNA 추출 중인 videoId
  const [absorbedVideoTitle, setAbsorbedVideoTitle] = useState(''); // 추출된 영상 제목

  // ★ Golden Keyword Discovery 상태
  const [kwSeed, setKwSeed] = useState('');
  const [kwResults, setKwResults] = useState([]);
  const [kwScanning, setKwScanning] = useState(false);

  // ★ Arsenal Injector — VVIP 비주얼 생성
  const [vvipGenerating, setVvipGenerating] = useState(false);
  const [vvipImage, setVvipImage] = useState(null);

  // ★ 각 액션별 인라인 진행 + 결과 상태
  const [actionStates, setActionStates] = useState({
    summary: { loading: false, percent: 0, status: '' },
    subtitle: { loading: false, percent: 0, status: '', result: null },
    facetrack: { loading: false, percent: 0, status: '', result: null },
    banner: { loading: false, percent: 0, status: '', result: null },
  });
  const [renderVideo, setRenderVideo] = useState(null);
  const [subtitleText, setSubtitleText] = useState(''); // 편집 가능한 자막

  // 액션 상태 업데이트 헬퍼
  const updateAction = (key, updates) => setActionStates(prev => ({ ...prev, [key]: { ...prev[key], ...updates } }));

  // 쉐도우 룸 에셋 선택
  const [selectedAssets, setSelectedAssets] = useState([]);

  // ElevenLabs 보이스 목록
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState('');
  const [voicesLoading, setVoicesLoading] = useState(false);

  // ★ Adaptive Analysis 세그먼트
  const [adaptiveSegments, setAdaptiveSegments] = useState(null);
  const [adaptiveConfig, setAdaptiveConfig] = useState(null);

  // ═══ 🔀 Hybrid Pipeline — 전자동/반자동 모드 ═══
  const [pipelineMode, setPipelineMode] = useState('AUTO'); // 'AUTO' | 'SEMI_AUTO'
  const [wizardState, setWizardState] = useState(INITIAL_WIZARD_STATE);
  const [wizardEditScript, setWizardEditScript] = useState(''); // 반자동 시 편집 가능한 대본
  const [wizardVisualStyle, setWizardVisualStyle] = useState('cinematic'); // 비주얼 스타일 선택
  const [renderStatus, setRenderStatus] = useState('IDLE'); // IDLE | RENDERING | DONE | ERROR
  const [renderAssets, setRenderAssets] = useState({ images: [], audio: null, error: null });
  const wizardResolveRef = useRef(null); // 반자동 대기 Promise resolver

  // ═══ Auto-Save (Debounced) — 프로젝트 상태 자동 저장 ═══
  const saveTimerRef = useRef(null);
  const autoSave = useCallback(async (overrides = {}) => {
    if (!activeProjectId) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        const payload = {
          masterInput,
          activeEngine,
          masterDNA,
          copyData,
          mjPrompts,
          slotImages,
          videoJobs,
          visualProvider,
          globalResult: globalResult ? { detected_language: globalResult.detected_language, viral_potential: globalResult.viral_potential } : null,
          adaptiveConfig,
          adaptiveSegments: adaptiveSegments?.slice(0, 20),
          ...overrides,
        };
        await fetch(`/api/projects/${activeProjectId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payload }),
        });
        console.log('💾 [AUTO-SAVE] 저장 완료');
      } catch (e) {
        console.error('⚠️ [AUTO-SAVE] 실패:', e.message);
      }
    }, 2000);
  }, [activeProjectId, masterInput, activeEngine, masterDNA, copyData, mjPrompts, slotImages, videoJobs, visualProvider, globalResult, adaptiveConfig, adaptiveSegments]);

  // ═══ Hydration — 페이지 로드 시 프로젝트 복원 ═══
  useEffect(() => {
    if (!activeProjectId) return;
    const hydrate = async () => {
      try {
        const res = await fetch(`/api/projects/${activeProjectId}`);
        const data = await res.json();
        if (!data.success || !data.project?.payload) return;
        const p = data.project.payload;
        console.log('💧 [HYDRATE] 프로젝트 복원 시작:', activeProjectId);
        if (p.masterInput) setMasterInput(p.masterInput);
        if (p.activeEngine) setActiveEngine(p.activeEngine);
        if (p.masterDNA?.brand_name) setMasterDNA(p.masterDNA);
        if (p.copyData) setCopyData(p.copyData);
        if (p.mjPrompts) setMjPrompts(p.mjPrompts);
        if (p.slotImages) setSlotImages(p.slotImages);
        if (p.visualProvider) setVisualProvider(p.visualProvider);
        if (p.adaptiveConfig) setAdaptiveConfig(p.adaptiveConfig);
        if (p.adaptiveSegments) setAdaptiveSegments(p.adaptiveSegments);
        console.log('✅ [HYDRATE] 복원 완료');
      } catch (e) {
        console.error('⚠️ [HYDRATE] 실패:', e.message);
      }
    };
    hydrate();
  }, [activeProjectId]);

  // ★ 상태 변경 시 Auto-Save 트리거
  useEffect(() => {
    if (activeProjectId && (copyData || mjPrompts || globalResult)) {
      autoSave();
    }
  }, [copyData, mjPrompts, globalResult, slotImages, videoJobs, autoSave, activeProjectId]);

  // ★ 유틸: 조회수 포맷 (1500000 → 150만)
  const formatViews = (views) => {
    if (!views) return '0';
    return new Intl.NumberFormat('ko-KR', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(views));
  };
  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  useEffect(() => {
    const fetchVoices = async () => {
      setVoicesLoading(true);
      try {
        const res = await fetch('/api/voices');
        const data = await res.json();
        if (data.success && data.voices?.length > 0) {
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

  // ★ 엔진 D: Global Finder — 해외 콘텐츠 한국화
  const handleGlobalFinder = async () => {
    if (globalProcessing) return;
    if (globalTab === 'URL' && !masterInput) return;
    if (globalTab === 'FILE' && !globalFile) return;

    setGlobalProcessing(true);
    setGlobalResult(null);

    try {
      const formData = new FormData();
      formData.append('type', globalTab);
      if (globalTab === 'URL') formData.append('url', masterInput);
      if (globalTab === 'FILE' && globalFile) formData.append('file', globalFile);

      const res = await fetch('/api/engine/global-processor', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(`HTTP ${res.status}: ${errBody.error || res.statusText}`);
      }

      const data = await res.json();
      if (data.success) {
        setGlobalResult(data.data);
        setToastMsg(`✅ Global Finder 완료: ${data.data.detected_language} → KR`);
        setTimeout(() => setToastMsg(null), 3000);
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (e) {
      console.error('[GLOBAL] Error:', e.message);
      setToastMsg(`❌ Global Finder 실패: ${e.message}`);
      setTimeout(() => setToastMsg(null), 5000);
    } finally {
      setGlobalProcessing(false);
    }
  };

  // ★ Global Radar — YouTube 50개 트렌드 스캔
  const handleRadarScan = async () => {
    if (!radarKeyword || radarScanning) return;
    setRadarScanning(true);
    setRadarVideos([]);
    setGlobalResult(null);
    try {
      const res = await fetch(`/api/engine/global-radar?keyword=${encodeURIComponent(radarKeyword)}&regionCode=${radarRegion}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(`HTTP ${res.status}: ${err.error || res.statusText}`);
      }
      const data = await res.json();
      if (data.success) {
        setRadarVideos(data.videos || []);
        setToastMsg(`📡 ${data.count}개 영상 스캔 완료 (${radarRegion})`);
        setTimeout(() => setToastMsg(null), 3000);
      } else {
        throw new Error(data.error);
      }
    } catch (e) {
      setToastMsg(`❌ Radar 실패: ${e.message}`);
      setTimeout(() => setToastMsg(null), 5000);
    } finally {
      setRadarScanning(false);
    }
  };

  // ★ Absorb DNA — 개별 영상 선택 → Global Processor 파이프라인
  const handleAbsorbDNA = async (videoId) => {
    if (absorbingId) return;
    setAbsorbingId(videoId);
    setGlobalResult(null);
    // 레이더 영상 목록에서 제목 찾기
    const matchedVideo = radarVideos.find(v => v.videoId === videoId);
    setAbsorbedVideoTitle(matchedVideo?.title || '');
    try {
      const formData = new FormData();
      formData.append('type', 'URL');
      formData.append('url', `https://youtube.com/watch?v=${videoId}`);
      // 영상 메타데이터 전달 (트랜스크립트가 부족할 때 Gemini 컨텍스트용)
      if (matchedVideo?.title) formData.append('videoTitle', matchedVideo.title);
      if (matchedVideo?.channel) formData.append('channelName', matchedVideo.channel);
      const res = await fetch('/api/engine/global-processor', { method: 'POST', body: formData });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(`HTTP ${res.status}: ${err.error || res.statusText}`);
      }
      const data = await res.json();
      if (data.success) {
        setGlobalResult(data.data);
        setToastMsg(`✅ DNA Absorbed: ${data.data.detected_language} → KR`);
        setTimeout(() => setToastMsg(null), 3000);
      } else {
        throw new Error(data.error);
      }
    } catch (e) {
      setToastMsg(`❌ DNA 추출 실패: ${e.message}`);
      setTimeout(() => setToastMsg(null), 5000);
    } finally {
      setAbsorbingId(null);
    }
  };

  // ★ Golden Keyword Discovery — 황금 키워드 발굴
  const handleKeywordDiscovery = async () => {
    if (!kwSeed.trim() || kwScanning) return;
    setKwScanning(true);
    setKwResults([]);
    try {
      const res = await fetch('/api/engine/keyword-scorer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seed: kwSeed.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(`HTTP ${res.status}: ${err.error || res.statusText}`);
      }
      const data = await res.json();
      if (data.success) {
        setKwResults(data.data.keywords || []);
        setToastMsg(`✨ ${data.data.total}개 글로벌 키워드 발굴 완료 (황금 ${data.data.goldenCount}개 · US:${data.data.regionCounts?.US||0} JP:${data.data.regionCounts?.JP||0} CN:${data.data.regionCounts?.CN||0} KR:${data.data.regionCounts?.KR||0})`);
        setTimeout(() => setToastMsg(null), 4000);
      } else {
        throw new Error(data.error);
      }
    } catch (e) {
      setToastMsg(`❌ 키워드 발굴 실패: ${e.message}`);
      setTimeout(() => setToastMsg(null), 5000);
    } finally {
      setKwScanning(false);
    }
  };

  // ★ Push to Global Radar — 황금 키워드를 레이더로 즉시 전송 (시장 자동 설정)
  const handlePushToRadar = (keyword, region) => {
    setRadarKeyword(keyword);
    // 시장별 자동 지역 설정
    if (region && ['US', 'JP', 'CN', 'KR', 'GB', 'IN', 'DE', 'FR', 'BR', 'TH', 'VN'].includes(region)) {
      setRadarRegion(region);
    }
    setActiveEngine('global');
    setGlobalTab('RADAR');
    const flag = region === 'US' ? '🇺🇸' : region === 'JP' ? '🇯🇵' : region === 'CN' ? '🇨🇳' : region === 'KR' ? '🇰🇷' : '🌍';
    setToastMsg(`🚀 ${flag} "${keyword}" → Global Radar (${region || 'AUTO'}) 전송 완료! Scan 버튼을 누르세요.`);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // ★ Arsenal Injector — VVIP 시네마틱 비주얼 자동 생성
  const handleVVIPGenerate = async (basePrompt) => {
    if (!basePrompt || vvipGenerating) return;
    setVvipGenerating(true);
    setVvipImage(null);
    setToastMsg('🎨 VVIP Arsenal Injector 가동 중... (최대 60초)');
    try {
      const res = await fetch('/api/engine/auto-visual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseVisualPrompt: basePrompt, aspectRatio: '9:16' }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data.success) {
        setVvipImage(data.data);
        setToastMsg('✅ VVIP 시네마틱 비주얼 생성 완료!');
        setTimeout(() => setToastMsg(null), 3000);
      } else {
        throw new Error(data.error);
      }
    } catch (e) {
      setToastMsg(`❌ VVIP 생성 실패: ${e.message}`);
      setTimeout(() => setToastMsg(null), 5000);
    } finally {
      setVvipGenerating(false);
    }
  };

  // ★ 클립보드 복사 헬퍼
  const handleCopy = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setToastMsg('✅ 클립보드에 복사 완료!');
    setTimeout(() => setToastMsg(null), 2000);
  };

  // 엔진 2: 원본 숏폼 요약 — 인라인 진행 표시
  const handleSummaryEngine = async () => {
    if (!masterInput || summaryProcessing) return;
    setSummaryProcessing(true);
    setSummaryResult(null);
    updateAction('summary', { loading: true, percent: 5, status: '🔍 YouTube URL 파싱 중...' });

    const stages = [
      { at: 800, p: 15, s: '📡 서버 연결 완료' },
      { at: 2000, p: 25, s: '📄 자막 트랙 스캔 중...' },
      { at: 4000, p: 35, s: '🔵 Level 1: 라이브러리 스크래핑...' },
      { at: 7000, p: 45, s: '🟣 Level 2: 웹페이지 파싱...' },
      { at: 12000, p: 55, s: '🧠 Level 3: Gemini AI 분석 중...' },
      { at: 18000, p: 65, s: '🧠 AI가 영상 오디오를 듣고 있어요...' },
      { at: 25000, p: 72, s: '✍️ 하이라이트 구간 추출 중...' },
      { at: 35000, p: 80, s: '📊 바이럴 점수 계산 중...' },
    ];
    const timers = stages.map(s => setTimeout(() => {
      updateAction('summary', { percent: s.p, status: s.s });
    }, s.at));

    try {
      const res = await fetch('/api/engine/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: masterInput }),
      });
      timers.forEach(t => clearTimeout(t));

      // ── Strict HTTP Error Handling ──
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        const errMsg = `HTTP ${res.status}: ${errBody.error || res.statusText}`;
        console.error('[SUMMARY] API Error:', errMsg);
        updateAction('summary', { loading: false, percent: 100, status: `❌ ${errMsg}` });
        setSummaryProcessing(false);
        return;
      }

      updateAction('summary', { percent: 90, status: '📦 데이터 수신 완료...' });

      const data = await res.json();
      if (data.success) {
        updateAction('summary', { percent: 95, status: '🔗 카피/비주얼 자동 생성 중...' });
        setSummaryResult(data.data);
        if (data.data.highlights?.length > 0) {
          autoGenerateFromHighlights(data.data);
        }
        await new Promise(r => setTimeout(r, 600));
        const src = data.data.source?.transcriptSource;
        const srcLabel = src === 'gemini' ? '🟣 Gemini AI' : src === 'scrape' ? '🔵 스크래핑' : '🟢 라이브러리';
        updateAction('summary', { loading: false, percent: 100, status: `✅ 완료! 하이라이트 ${data.data.highlights?.length || 0}개 (${srcLabel})` });
      } else {
        updateAction('summary', { loading: false, percent: 100, status: `❌ ${data.error}` });
      }
    } catch (err) {
      timers.forEach(t => clearTimeout(t));
      updateAction('summary', { loading: false, percent: 100, status: `❌ 에러: ${err.message}` });
    }
    setSummaryProcessing(false);
  };

  // ★ 하이라이트 분석 완료 → 카피 + 비주얼 자동 생성
  const autoGenerateFromHighlights = (data) => {
    const topHL = data.highlights[0];
    setSelectedHighlight(topHL);

    // 카피 섹션 자동 생성
    setCopyGenerating(true);
    setTimeout(() => {
      const autoCopy = data.highlights.slice(0, 3).map((h, i) => ({
        headline: `✨ ${h.caption || `하이라이트 #${i + 1}`}`,
        body: h.reason || h.caption || '',
        cta: `🔥 ${h.emotion || '놀라운'} 구간 ${Math.floor(h.start_sec / 60)}:${String(h.start_sec % 60).padStart(2, '0')} ~ ${Math.floor(h.end_sec / 60)}:${String(h.end_sec % 60).padStart(2, '0')} 확인하세요!`,
      }));
      setCopyData(autoCopy);
      setCopyGenerating(false);
    }, 800);

    // 비주얼 섹션 자동 프롬프트 생성
    setVisualGenerating(true);
    setTimeout(() => {
      const title = data.source?.title || masterInput;
      const hlText = topHL?.caption || masterInput;
      setMjPrompts({
        poster: `A cinematic vertical poster of "${title}", featuring ${hlText}, dramatic lighting, bold Korean typography overlay, premium ad style, photorealistic, 8k --ar 9:16 --v 6.0`,
        logo: `A minimalist luxury brand logo for "${title}", high-end emblem, geometric, gold and black, flat vector design, clean background --no text, typography --v 6.0`,
        sns: `An engaging Instagram Reels thumbnail for "${title}", featuring ${hlText}, vibrant colors, Korean text overlay, viral social media style, attention-grabbing --ar 1:1 --v 6.0`,
        card: `A premium YouTube short thumbnail for "${title}", ${hlText}, cinematic color grading, bold caption style, 8k --ar 16:9 --v 6.0`,
      });
      setMasterDNA(prev => ({
        ...prev,
        brand_name: title,
        usp: data.highlights.slice(0, 3).map(h => h.caption),
      }));
      setVisualGenerating(false);
    }, 1200);
  };

  // ★ 특정 하이라이트 클릭 → 카피 즉시 갱신
  const handleHighlightSelect = (highlight, index) => {
    setSelectedHighlight(highlight);
    setCopyGenerating(true);
    setToastMsg(`🎯 하이라이트 #${index + 1} 선택 → 카피/비주얼 갱신 중...`);

    setTimeout(() => {
      setCopyData([{
        headline: `🔥 ${highlight.caption}`,
        body: `${highlight.reason || ''}\n\n감정: ${highlight.emotion || '강렬'} · 바이럴 지수: ${highlight.viral_score || '-'}/10`,
        cta: `▶️ ${Math.floor(highlight.start_sec / 60)}:${String(highlight.start_sec % 60).padStart(2, '0')} ~ ${Math.floor(highlight.end_sec / 60)}:${String(highlight.end_sec % 60).padStart(2, '0')} 이 구간을 놓치지 마세요!`,
      }]);
      setCopyGenerating(false);
      setToastMsg(`✅ #${index + 1} 하이라이트 카피 갱신 완료`);
      setTimeout(() => setToastMsg(null), 2000);
    }, 500);

    // 비주얼도 해당 하이라이트에 맞춰 갱신
    setVisualGenerating(true);
    setTimeout(() => {
      const title = summaryResult?.source?.title || masterInput;
      setMjPrompts(prev => ({
        ...prev,
        poster: `A cinematic vertical poster of "${title}", scene: ${highlight.caption}, emotion: ${highlight.emotion || 'intense'}, dramatic lighting, bold Korean typography, 8k --ar 9:16 --v 6.0`,
        sns: `Instagram Reels cover for "${title}" highlight: ${highlight.caption}, ${highlight.emotion || 'viral'} mood, Korean text, vibrant --ar 1:1 --v 6.0`,
      }));
      setVisualGenerating(false);
    }, 800);
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

      if (!data.success) {
        // API 에러 (실제 에러 메시지 표시)
        setVideoJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: 'error', result: data.data, error: data.error } : j));
        setToastMsg(`❌ ${data.error}`);
        setTimeout(() => setToastMsg(null), 5000);
        return;
      }

      const result = data.data;
      setVideoJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: result.status, result } : j));

      // Mock → 즉시 완료 (폴링 불필요)
      if (result.provider === 'mock') {
        setToastMsg(`⚠️ MOCK 모드 — API 키를 설정하세요`);
        setTimeout(() => setToastMsg(null), 4000);
        return;
      }

      // LIVE — 비동기 폴링 시작
      if (result.status === 'processing') {
        setToastMsg(`⏳ ${provider.toUpperCase()} 렌더링 중... (30-90초 소요)`);
        let pollCount = 0;
        const maxPolls = 36; // 최대 3분 (5초 × 36)

        const pollInterval = setInterval(async () => {
          pollCount++;
          try {
            const pollRes = await fetch(`/api/video-status?id=${result.id}&provider=${result.provider}`);
            const pollData = await pollRes.json();

            if (!pollData.success) {
              clearInterval(pollInterval);
              setVideoJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: 'error', error: pollData.error } : j));
              setToastMsg(`❌ 폴링 실패: ${pollData.error}`);
              setTimeout(() => setToastMsg(null), 5000);
              return;
            }

            const pd = pollData.data;

            // 상태 업데이트
            setVideoJobs(prev => prev.map(j => j.id === jobId ? {
              ...j,
              status: pd.status,
              progress: pd.progress || Math.min(pollCount * 3, 95),
              result: { ...j.result, ...pd, videoUrl: pd.videoUrl },
            } : j));

            // 완료!
            if (pd.status === 'complete' && pd.videoUrl) {
              clearInterval(pollInterval);
              setRenderVideo(pd.videoUrl);
              setToastMsg(`🎉 ${provider.toUpperCase()} 영상 렌더링 완료!`);
              setTimeout(() => setToastMsg(null), 4000);
            }

            // 에러
            if (pd.status === 'error') {
              clearInterval(pollInterval);
              setToastMsg(`❌ 렌더링 실패: ${pd.message}`);
              setTimeout(() => setToastMsg(null), 5000);
            }

            // 타임아웃
            if (pollCount >= maxPolls) {
              clearInterval(pollInterval);
              setToastMsg(`⏰ 렌더링 시간 초과 (3분). 수동으로 확인하세요.`);
              setTimeout(() => setToastMsg(null), 5000);
            }
          } catch (pollErr) {
            console.error('Polling error:', pollErr);
          }
        }, 5000); // 5초마다 폴링
      } else {
        setToastMsg(`✅ ${provider.toUpperCase()} 영상 작업 완료`);
        setTimeout(() => setToastMsg(null), 3000);
      }
    } catch (err) {
      setVideoJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: 'error', error: err.message } : j));
      setToastMsg(`❌ 네트워크 에러: ${err.message}`);
      setTimeout(() => setToastMsg(null), 5000);
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
      setToastMsg('❌ URL 또는 주제를 입력해주세요.');
      setTimeout(() => setToastMsg(null), 2000);
      return;
    }
    setIsProcessing(true);
    setEngineResult(null);
    setToastMsg('🚀 제국 엔진 점화 중...');

    try {
      // ═══ Step 0: FORCE INSERT — 반드시 DB에 기록 ═══
      let projectId = activeProjectId;
      if (!projectId) {
        setToastMsg('📦 프로젝트 생성 중...');
        const projRes = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: masterInput.substring(0, 60) || 'New Empire Campaign',
            status: 'ANALYZING',
            payload: {
              input: {
                url: masterInput,
                type: masterInput.startsWith('http') ? 'URL' : 'TEXT',
              },
            },
          }),
        });

        const projData = await projRes.json();

        if (!projData.success || !projData.project?.id) {
          throw new Error(`DB INSERT 실패: ${projData.error || 'Unknown'}`);
        }

        projectId = projData.project.id;
        setActiveProjectId(projectId);

        // ✅ 사이드바 즉시 갱신 (낙관적 UI 업데이트)
        window.dispatchEvent(new CustomEvent('empire-sidebar-refresh', {
          detail: { project: projData.project },
        }));

        // URL 업데이트 → hydration 가능
        router.push(`/console?pid=${projectId}`, { scroll: false });
        console.log('📦 [IGNITE] 프로젝트 생성 완료:', projectId);
      }

      // ═══ Step 1: DNA Extraction ═══
      const isUrl = masterInput.startsWith('http');
      setCopyGenerating(true);
      setToastMsg('🧬 DNA 추출 중...');

      let copyResult;
      if (isUrl) {
        const res = await fetch('/api/process-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoUrl: masterInput }),
        });
        copyResult = await res.json();
      } else {
        const res = await fetch('/api/engine/global-processor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ input: masterInput, inputType: 'TEXT' }),
        });
        copyResult = await res.json();
      }

      let d = null;
      if (copyResult.success) {
        d = copyResult.rewrittenCopy || copyResult.data;
        setCopyData(d);
        setEngineResult(d);

        const brandName = d?.videoTitle || d?.title || d?.brand_name || masterInput.substring(0, 30);
        const extractedUsps = d?.pureContent?.map(c => c.headline || c.copy?.substring(0, 50)).filter(Boolean)
          || d?.copies?.map(c => c.headline).filter(Boolean)
          || [brandName];
        const detectedMood = d?.mood || d?.creative_direction?.visual_mood || 'cinematic premium';
        const detectedTarget = d?.target_audience || d?.market_position?.target_demo || '콘텐츠 소비자';

        setMasterDNA({
          brand_name: brandName,
          main_color: d?.creative_direction?.color_scheme || 'dynamic adaptive',
          mood: detectedMood,
          usp: extractedUsps.slice(0, 3),
          target: detectedTarget,
        });

        if (copyResult.adaptive) {
          setAdaptiveConfig(copyResult.adaptive.config);
          setAdaptiveSegments(copyResult.adaptive.segments);
        } else if (d?.adaptive) {
          setAdaptiveConfig(d.adaptive.config);
          setAdaptiveSegments(d.adaptive.segments);
        }

        // ═══ Step 1 완료 → DB UPDATE (DNA 결과 저장) ═══
        if (projectId) {
          fetch(`/api/projects/${projectId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              status: 'GEN_VISUALS',
              title: brandName.substring(0, 60),
              payload: {
                input: { url: masterInput, type: isUrl ? 'URL' : 'TEXT' },
                stageData: { script: { raw: d, committed: true } },
                adaptive: copyResult.adaptive || d?.adaptive || null,
                qa: copyResult.qa || d?.qa || null,
              },
            }),
          }).then(() => {
            // 사이드바에 업데이트된 상태 반영
            window.dispatchEvent(new CustomEvent('empire-sidebar-refresh', {}));
          }).catch(e => console.error('DB UPDATE 실패:', e.message));
        }
      } else {
        // ═══ 🚨 API 실패 시 Emergency Fallback ═══
        const errorMsg = copyResult.error || '알 수 없는 백엔드 오류';
        console.error(`🚨 [IGNITE] DNA 추출 실패: ${errorMsg}`);
        setToastMsg(`⚠️ DNA 추출 실패: ${errorMsg}`);

        // 비상 대본 — 반자동 모드에서 위저드가 null 대신 의미있는 텍스트를 표시
        d = {
          _emergency: true,
          title: masterInput.substring(0, 60),
          error: errorMsg,
          pureContent: [
            {
              headline: `⚠️ 대본 추출 실패 — 수동 입력 필요`,
              copy: `[에러 상세]\n${errorMsg}\n\n[입력값]\n${masterInput}\n\n이 텍스트를 삭제하고 원하시는 대본을 직접 입력해주세요.\n\n--- 예시 ---\n이 영상은 ___에 대한 이야기입니다.\n핵심 메시지는 ___이며,\n타겟 시청자는 ___입니다.`,
            },
          ],
        };
      }
      setCopyGenerating(false);

      // ═══ 🔀 HYBRID CHECKPOINT: Step 1 → Step 2 라우팅 ═══
      const routing = routeAfterStep('STEP_1_DNA', pipelineMode === 'AUTO');

      if (routing.action === 'PAUSE') {
        // ✍️ 반자동: 위저드 패널 열고 사용자 검토 대기
        // d의 모든 가능한 응답 형식에서 텍스트 추출 (null 방지)
        let scriptText = '';
        if (typeof d === 'string') {
          scriptText = d;
        } else if (d?.pureContent?.length > 0) {
          scriptText = d.pureContent.map(c => (c.headline || '') + '\n' + (c.copy || c.body || '')).join('\n\n');
        } else if (d?.copies?.length > 0) {
          scriptText = d.copies.map(c => (c.headline || '') + '\n' + (c.body || '')).join('\n\n');
        } else if (d?.script) {
          scriptText = typeof d.script === 'string' ? d.script : JSON.stringify(d.script, null, 2);
        } else if (d?.text || d?.result) {
          scriptText = d.text || d.result;
        } else if (d?.videoTitle || d?.title) {
          // 최소한 제목이라도 표시
          scriptText = `[제목] ${d.videoTitle || d.title}\n\n${d?.description || d?.summary || JSON.stringify(d, null, 2)}`;
        } else if (d) {
          scriptText = JSON.stringify(d, null, 2);
        } else {
          scriptText = '⚠️ 대본 추출 결과가 비어있습니다. 입력을 확인하고 다시 시도해주세요.';
        }

        setWizardEditScript(scriptText.trim());
        setWizardState({
          active: true,
          currentStep: 'STEP_1_DNA',
          nextStep: routing.nextStep,
          status: 'WAITING_FOR_USER',
          editableData: d,
          stepHistory: ['STEP_0_INIT', 'STEP_1_DNA'],
        });
        setToastMsg('✍️ 반자동 모드 — 대본을 검토하고 [다음 단계로] 버튼을 눌러주세요.');

        // Promise로 일시정지 — 사용자가 '다음 단계로' 클릭하면 resolve
        await new Promise((resolve) => {
          wizardResolveRef.current = resolve;
        });

        // 사용자가 스크립트를 수정했을 수 있으므로 반영
        setWizardState(prev => ({ ...prev, active: false, status: 'PROCESSING' }));
        setToastMsg('🚀 다음 단계 진행 중...');
      }

      // ═══ Step 2: MJ 프롬프트 4종 — LLM 동적 생성 ═══
      setToastMsg('🎨 비주얼 프롬프트 생성 중...');
      setVisualGenerating(true);
      const kw = masterDNA.brand_name || masterInput.substring(0, 30);

      try {
        const mjRes = await fetch('/api/engine/mj-prompts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            keyword: kw,
            context: copyResult.data?.[0]?.headline || '',
            mood: 'premium cinematic luxury',
            style: wizardVisualStyle, // 위저드에서 선택한 비주얼 스타일
          }),
        });
        const mjData = await mjRes.json();
        if (mjData.success && mjData.prompts) {
          setMjPrompts(mjData.prompts);
        } else {
          // Fallback: 간단한 키워드 기반 프롬프트
          setMjPrompts({
            poster: `A breathtaking cinematic wide shot of ${kw}, dramatic lighting, photorealistic, 8k --ar 9:16 --v 6.0`,
            logo: `A minimalist premium logo emblem for ${kw}, geometric, clean white background, flat vector design --no text, typography, letters --v 6.0`,
            sns: `A premium lifestyle scene related to ${kw}, warm golden hour lighting, photorealistic, 8k --ar 1:1 --v 6.0`,
            card: `A cinematic wide shot showcasing ${kw}, dramatic atmosphere, premium feel, photorealistic, 8k --ar 16:9 --v 6.0`,
          });
        }
      } catch (mjErr) {
        console.error('MJ prompt generation failed:', mjErr);
        setMjPrompts({
          poster: `A breathtaking cinematic wide shot of ${kw}, dramatic lighting, photorealistic, 8k --ar 9:16 --v 6.0`,
          logo: `A minimalist premium logo emblem for ${kw}, geometric, clean white background, flat vector design --no text, typography, letters --v 6.0`,
          sns: `A premium lifestyle scene related to ${kw}, warm golden hour lighting, photorealistic, 8k --ar 1:1 --v 6.0`,
          card: `A cinematic wide shot showcasing ${kw}, dramatic atmosphere, premium feel, photorealistic, 8k --ar 16:9 --v 6.0`,
        });
      }
      setVisualGenerating(false);

      // ★ Adaptive Analysis 결과 저장 (글로벌 프로세서에서 반환된 경우)
      if (copyResult.data?.adaptive) {
        setAdaptiveConfig(copyResult.data.adaptive.config);
        setAdaptiveSegments(copyResult.data.adaptive.segments);
      }

      // ═══ 🔀 HYBRID CHECKPOINT 2: Step 2 → Step 3 라우팅 ═══
      const routing2 = routeAfterStep('STEP_2_VISUAL', pipelineMode === 'AUTO');

      if (routing2.action === 'PAUSE') {
        setWizardState({
          active: true,
          currentStep: 'STEP_2_VISUAL',
          nextStep: routing2.nextStep,
          status: 'WAITING_FOR_USER',
          editableData: mjPrompts,
          stepHistory: ['STEP_0_INIT', 'STEP_1_DNA', 'STEP_2_VISUAL'],
        });
        setToastMsg('✍️ 반자동 — 비주얼 프롬프트를 검토하고 [다음 단계로] 버튼을 눌러주세요.');

        await new Promise((resolve) => {
          wizardResolveRef.current = resolve;
        });

        setWizardState(prev => ({ ...prev, active: false, status: 'PROCESSING' }));
        setToastMsg('🚀 최종 단계 진행 중...');
      }

      // ═══ Step 2 완료 → DB UPDATE (Visual 결과 저장) ═══
      if (projectId) {
        fetch(`/api/projects/${projectId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'COMPLETE',
            payload: {
              stageData: {
                script: { committed: true },
                visuals: { prompts: mjPrompts, committed: true },
              },
            },
          }),
        }).then(() => {
          window.dispatchEvent(new CustomEvent('empire-sidebar-refresh', {}));
        }).catch(e => console.error('Step 2 DB UPDATE 실패:', e.message));
      }

      // ═══ 🔀 HYBRID CHECKPOINT 3: Step 3 렌더링 (반자동 전용) ═══
      const routing3 = routeAfterStep('STEP_3_RENDER', pipelineMode === 'AUTO');

      if (routing3.action === 'PAUSE') {
        setRenderStatus('IDLE');
        setRenderAssets({ images: [], audio: null, error: null });
        setWizardState({
          active: true,
          currentStep: 'STEP_3_RENDER',
          nextStep: routing3.nextStep,
          status: 'WAITING_FOR_USER',
          editableData: null,
          stepHistory: ['STEP_0_INIT', 'STEP_1_DNA', 'STEP_2_VISUAL', 'STEP_3_RENDER'],
        });
        setToastMsg('🎬 반자동 — 렌더링 준비 완료. [렌더 시작] 버튼을 눌러주세요.');

        await new Promise((resolve) => {
          wizardResolveRef.current = resolve;
        });

        setWizardState(prev => ({ ...prev, active: false, status: 'PROCESSING' }));
      }

      setToastMsg('✅ 제국 엔진 가동 완료!');
      setTimeout(() => setToastMsg(null), 3000);
      setIsProcessing(false);
    } catch (error) {
      setIsProcessing(false);
      setWizardState(INITIAL_WIZARD_STATE);
      setCopyGenerating(false);
      setVisualGenerating(false);
      setToastMsg(`❌ 엔진 오류: ${error.message}`);
      setTimeout(() => setToastMsg(null), 3000);
    }
  };

  return (
    <div className="min-h-full bg-black text-gray-100 p-4 md:p-6 font-sans">
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
          {/* ═══ 🔀 Hybrid Pipeline Toggle ═══ */}
          <button
            id="btn_pipeline_mode"
            onClick={() => setPipelineMode(prev => prev === 'AUTO' ? 'SEMI_AUTO' : 'AUTO')}
            className={`relative px-1 py-1 rounded-full text-xs font-bold transition-all duration-300 border flex items-center gap-0 w-[220px] ${
              pipelineMode === 'AUTO'
                ? 'bg-emerald-950 border-emerald-600 shadow-lg shadow-emerald-900/30'
                : 'bg-violet-950 border-violet-600 shadow-lg shadow-violet-900/30'
            }`}
          >
            <span className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all duration-300 ${
              pipelineMode === 'AUTO'
                ? 'bg-emerald-500 text-black shadow-md'
                : 'text-gray-500'
            }`}>⚡ 전자동</span>
            <span className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all duration-300 ${
              pipelineMode === 'SEMI_AUTO'
                ? 'bg-violet-500 text-white shadow-md'
                : 'text-gray-500'
            }`}>✍️ 반자동</span>
          </button>
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


      {/* ═══ Full-screen 로딩 오버레이 (Global Engine) ═══ */}
      {(globalProcessing || absorbingId || radarScanning || kwScanning) && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="flex flex-col items-center p-8 bg-gray-900 border border-purple-500 rounded-2xl shadow-2xl max-w-md mx-4">
            <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
            <h2 className="mt-6 text-2xl font-bold text-white text-center">
              {kwScanning ? '✨ 황금 키워드 발굴 중...' : absorbingId ? '🧬 글로벌 DNA 심층 추출 중...' : radarScanning ? '📡 글로벌 레이더 스캔 중...' : '🔥 글로벌 DNA 심층 추출 중...'}
            </h2>
            <p className="mt-2 text-purple-300 text-center">
              {kwScanning ? 'YouTube 연관 검색어를 수집하고 Gemini AI가 수익성을 분석 중입니다.' : absorbingId ? '해외 VVIP 대본을 한국형 타겟으로 재창조하고 있습니다.' : radarScanning ? '전 세계 트렌드를 실시간 스캔하고 있습니다.' : '원본 콘텐츠를 분석하고 심리 어댑터를 적용 중입니다.'}
            </p>
            <p className="mt-1 text-sm text-gray-400">(최대 10~15초 소요)</p>
          </div>
        </div>
      )}

      {/* ═══ 🔀 Wizard Review Panel (반자동 모드 일시정지 화면) ═══ */}
      {wizardState.active && wizardState.status === 'WAITING_FOR_USER' && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-3xl mx-4 bg-gray-900 border border-violet-500/60 rounded-2xl shadow-2xl shadow-violet-900/20 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-violet-900/40 to-purple-900/40 border-b border-violet-800/40">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-violet-300">✍️ 반자동 위저드 — 검토 단계</h2>
                  <p className="text-xs text-violet-400/70 mt-0.5">
                    {PIPELINE_STEPS[wizardState.currentStep]?.icon} {PIPELINE_STEPS[wizardState.currentStep]?.label} 완료 → {wizardState.nextStep?.icon} {wizardState.nextStep?.label} 대기 중
                  </p>
                </div>
                {/* 여기서 전자동으로 전환하면 즉시 진행 */}
                <button
                  onClick={() => {
                    setPipelineMode('AUTO');
                    if (wizardResolveRef.current) {
                      wizardResolveRef.current();
                      wizardResolveRef.current = null;
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-emerald-600 text-white hover:bg-emerald-500 transition-all"
                >
                  ⚡ 전자동으로 전환 & 즉시 진행
                </button>
              </div>

              {/* ═══ Dynamic Progress Bar ═══ */}
              {(() => {
                const stepOrder = ['STEP_0_INIT', 'STEP_1_DNA', 'STEP_2_VISUAL', 'STEP_3_RENDER', 'COMPLETE'];
                const currentIdx = stepOrder.indexOf(wizardState.currentStep);
                const progress = Math.round(((currentIdx + 1) / stepOrder.length) * 100);
                const statusMap = {
                  'STEP_0_INIT': '📦 프로젝트 생성 완료',
                  'STEP_1_DNA': '✍️ 대본 검토 대기 중 (수정 후 다음 단계를 눌러주세요)',
                  'STEP_2_VISUAL': '🎨 비주얼 프롬프트 검토 대기 중 (스타일 선택 후 다음 단계를 눌러주세요)',
                  'STEP_3_RENDER': '🎬 렌더링 스튜디오 — FLUX & TTS 가동 대기',
                  'COMPLETE': '✅ 파이프라인 완료',
                };
                const statusText = statusMap[wizardState.currentStep] || '처리 중...';
                return (
                  <div className="mt-4">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-xs font-bold text-violet-300">{statusText}</span>
                      <span className="text-xs font-mono font-bold text-violet-400">{progress}%</span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-600 to-purple-400 transition-all duration-700 ease-out"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    {/* Step dots */}
                    <div className="flex justify-between mt-2">
                      {stepOrder.map((stepId) => {
                        const step = PIPELINE_STEPS[stepId];
                        const isDone = wizardState.stepHistory?.includes(stepId);
                        const isCurrent = wizardState.currentStep === stepId;
                        return (
                          <div key={stepId} className="flex flex-col items-center gap-0.5">
                            <span className={`text-sm ${isDone ? '' : isCurrent ? 'animate-pulse' : 'opacity-30'}`}>{step?.icon}</span>
                            <span className={`text-[7px] ${isDone ? 'text-violet-400' : isCurrent ? 'text-violet-300 font-bold' : 'text-gray-600'}`}>{step?.label?.split(' ')[0]}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Body — 단계별 조건부 UI */}
            <div className="p-6">

              {/* ═══ STEP 1: 대본 검토 + 편집 ═══ */}
              {wizardState.currentStep === 'STEP_1_DNA' && (
                <div>
                  <label className="block text-xs text-gray-400 mb-2 font-bold">📝 추출된 대본 (수정 가능)</label>
                  <textarea
                    id="wizard_edit_script"
                    value={wizardEditScript}
                    onChange={(e) => setWizardEditScript(e.target.value)}
                    className="w-full h-64 bg-black border border-gray-700 rounded-lg p-4 text-sm text-gray-200 font-mono leading-relaxed focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 outline-none resize-y"
                    placeholder="대본이 여기에 표시됩니다..."
                  />
                  <p className="text-[10px] text-gray-600 mt-1">💡 수정 후 [다음 단계로] 버튼을 누르면 수정된 내용이 반영됩니다.</p>

                  {/* 비주얼 스타일 사전 선택 (Step 2에서 사용) */}
                  <div className="mt-4 p-4 bg-gray-800/50 rounded-xl border border-gray-700">
                    <label className="block text-xs text-violet-400 mb-2 font-bold">🎨 비주얼 스타일 선택 (다음 단계에 적용)</label>
                    <select
                      value={wizardVisualStyle}
                      onChange={(e) => setWizardVisualStyle(e.target.value)}
                      className="w-full p-2.5 bg-black border border-gray-700 rounded-lg text-sm text-gray-200 focus:border-violet-500 outline-none"
                    >
                      <option value="cinematic">🎬 시네마틱 실사 (Cinematic Realism)</option>
                      <option value="cyberpunk">🌆 사이버펑크 / 네온 (Cyberpunk)</option>
                      <option value="3d_pixar">🧸 3D 픽사 스타일 (3D Animation)</option>
                      <option value="claymation">🎭 클레이메이션 (Claymation)</option>
                      <option value="anime">🌸 일본 애니메이션 (Anime)</option>
                      <option value="watercolor">🎨 수채화 / 일러스트 (Watercolor)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* ═══ STEP 2: 비주얼 프롬프트 검토 ═══ */}
              {wizardState.currentStep === 'STEP_2_VISUAL' && (
                <div>
                  {/* 확정된 대본 요약 (읽기 전용) */}
                  <div className="mb-4 p-3 bg-gray-800/60 rounded-lg border border-gray-700">
                    <p className="text-[10px] font-bold text-gray-400 mb-1">📄 확정된 대본 요약</p>
                    <p className="text-xs text-gray-300 line-clamp-3">{wizardEditScript?.substring(0, 200) || '(대본 없음)'}...</p>
                  </div>

                  {/* 비주얼 스타일 변경 */}
                  <div className="mb-4">
                    <label className="block text-xs text-violet-400 mb-2 font-bold">🎨 비주얼 스타일</label>
                    <select
                      value={wizardVisualStyle}
                      onChange={(e) => setWizardVisualStyle(e.target.value)}
                      className="w-full p-2.5 bg-black border border-gray-700 rounded-lg text-sm text-gray-200 focus:border-violet-500 outline-none"
                    >
                      <option value="cinematic">🎬 시네마틱 실사 (Cinematic Realism)</option>
                      <option value="cyberpunk">🌆 사이버펑크 / 네온 (Cyberpunk)</option>
                      <option value="3d_pixar">🧸 3D 픽사 스타일 (3D Animation)</option>
                      <option value="claymation">🎭 클레이메이션 (Claymation)</option>
                      <option value="anime">🌸 일본 애니메이션 (Anime)</option>
                      <option value="watercolor">🎨 수채화 / 일러스트 (Watercolor)</option>
                    </select>
                  </div>

                  {/* 생성된 프롬프트 4종 그리드 */}
                  <label className="block text-xs text-gray-400 mb-2 font-bold">🖼️ 생성된 프롬프트 4종 (검토)</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { key: 'poster', label: '🎬 포스터', ratio: '9:16' },
                      { key: 'logo', label: '◇ 로고', ratio: '1:1' },
                      { key: 'sns', label: '📱 SNS', ratio: '1:1' },
                      { key: 'card', label: '🎴 카드', ratio: '16:9' },
                    ].map(slot => (
                      <div key={slot.key} className="bg-black border border-gray-700 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-bold text-violet-400">{slot.label}</span>
                          <span className="text-[8px] text-gray-600">{slot.ratio}</span>
                        </div>
                        <p className="text-[10px] text-gray-400 leading-relaxed line-clamp-4">
                          {mjPrompts?.[slot.key] || '생성 중...'}
                        </p>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-gray-600 mt-2">💡 프롬프트는 대시보드 비주얼 영역에서 수정 가능합니다.</p>
                </div>
              )}

              {/* ═══ STEP 3: 최종 렌더링 스튜디오 ═══ */}
              {wizardState.currentStep === 'STEP_3_RENDER' && (
                <div>
                  {/* 확정 에셋 요약 */}
                  <div className="mb-4 grid grid-cols-2 gap-2">
                    <div className="p-3 bg-gray-800/60 rounded-lg border border-gray-700">
                      <p className="text-[10px] font-bold text-gray-400 mb-1">📄 확정 대본</p>
                      <p className="text-[10px] text-gray-300 line-clamp-2">{wizardEditScript?.substring(0, 100) || '(없음)'}...</p>
                    </div>
                    <div className="p-3 bg-gray-800/60 rounded-lg border border-gray-700">
                      <p className="text-[10px] font-bold text-gray-400 mb-1">🎨 프롬프트</p>
                      <p className="text-[10px] text-gray-300">{Object.keys(mjPrompts || {}).length}종 확정 ({wizardVisualStyle})</p>
                    </div>
                  </div>

                  {/* 렌더 액션 영역 */}
                  {renderStatus === 'IDLE' && (
                    <div className="text-center py-6">
                      <p className="text-sm text-gray-400 mb-4">FLUX 이미지 + Edge TTS 음성을 동시에 생성합니다.</p>
                      <button
                        id="btn_start_render"
                        onClick={async () => {
                          setRenderStatus('RENDERING');
                          try {
                            const prompts = mjPrompts || {};
                            const promptEntries = Object.entries(prompts).filter(([, v]) => v);

                            // 이미지 생성 (병렬)
                            const imgResults = await Promise.allSettled(
                              promptEntries.map(async ([key, prompt]) => {
                                const res = await fetch('/api/engine/visual', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ prompt, provider: 'huggingface' }),
                                });
                                const data = await res.json();
                                return { key, url: data.imageUrl || data.url || null, error: data.error };
                              })
                            );

                            const images = imgResults
                              .filter(r => r.status === 'fulfilled' && r.value.url)
                              .map(r => r.value);

                            // TTS 생성
                            let audioUrl = null;
                            try {
                              const ttsText = wizardEditScript?.substring(0, 500) || '제국 엔진이 생성한 음성입니다.';
                              const ttsRes = await fetch('/api/tts', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ text: ttsText, voice: 'ko-KR-SunHiNeural' }),
                              });
                              const ttsData = await ttsRes.json();
                              audioUrl = ttsData.audioUrl || ttsData.url || null;
                            } catch (ttsErr) {
                              console.error('TTS 실패:', ttsErr);
                            }

                            setRenderAssets({ images, audio: audioUrl, error: null });
                            setRenderStatus('DONE');
                          } catch (err) {
                            console.error('🚨 렌더링 실패:', err);
                            setRenderAssets(prev => ({ ...prev, error: err.message }));
                            setRenderStatus('ERROR');
                          }
                        }}
                        className="px-8 py-3 rounded-xl text-sm font-black bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-500 hover:to-orange-400 text-white shadow-lg shadow-red-900/30 transition-all"
                      >
                        🔥 FLUX & 보이스 엔진 가동 시작
                      </button>
                    </div>
                  )}

                  {renderStatus === 'RENDERING' && (
                    <div className="text-center py-8">
                      <div className="inline-block w-10 h-10 border-4 border-violet-400 border-t-transparent rounded-full animate-spin mb-4" />
                      <p className="text-sm font-bold text-amber-400 animate-pulse">⚙️ 고화질 이미지 & AI 음성 생성 중...</p>
                      <p className="text-xs text-gray-500 mt-2">약 30초~2분 소요 | 창을 닫지 마세요</p>
                      <div className="mt-4 flex gap-3 justify-center">
                        <span className="text-[10px] px-2 py-1 bg-gray-800 rounded text-gray-400">🖼️ FLUX 이미지...</span>
                        <span className="text-[10px] px-2 py-1 bg-gray-800 rounded text-gray-400">🔊 Edge TTS...</span>
                      </div>
                    </div>
                  )}

                  {renderStatus === 'DONE' && (
                    <div>
                      <div className="text-center py-3 mb-4">
                        <p className="text-sm font-bold text-emerald-400">✅ 렌더링 완료!</p>
                      </div>
                      {/* 생성된 이미지 프리뷰 */}
                      {renderAssets.images.length > 0 && (
                        <div className="mb-4">
                          <label className="block text-xs text-gray-400 mb-2 font-bold">🖼️ 생성된 이미지 ({renderAssets.images.length}장)</label>
                          <div className="grid grid-cols-2 gap-2">
                            {renderAssets.images.map((img, i) => (
                              <div key={i} className="bg-black border border-gray-700 rounded-lg overflow-hidden">
                                <img src={img.url} alt={img.key} className="w-full h-32 object-cover" />
                                <p className="text-[9px] text-center py-1 text-gray-500">{img.key}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {/* 오디오 프리뷰 */}
                      {renderAssets.audio && (
                        <div className="mb-4 p-3 bg-gray-800/60 rounded-lg border border-gray-700">
                          <label className="block text-xs text-gray-400 mb-2 font-bold">🔊 AI 음성</label>
                          <audio controls src={renderAssets.audio} className="w-full h-8" />
                        </div>
                      )}
                    </div>
                  )}

                  {renderStatus === 'ERROR' && (
                    <div className="text-center py-6">
                      <p className="text-sm font-bold text-red-400 mb-2">🚨 렌더링 실패</p>
                      <p className="text-xs text-gray-500">{renderAssets.error || '서버 로그를 확인하세요.'}</p>
                      <button
                        onClick={() => setRenderStatus('IDLE')}
                        className="mt-3 px-4 py-1.5 rounded-lg text-xs font-bold border border-gray-700 text-gray-400 hover:bg-gray-800 transition-all"
                      >
                        🔄 다시 시도
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer — 액션 버튼 */}
            <div className="px-6 py-4 bg-gray-950 border-t border-gray-800 flex items-center justify-between">
              <button
                onClick={() => {
                  setWizardState(INITIAL_WIZARD_STATE);
                  setIsProcessing(false);
                  if (wizardResolveRef.current) {
                    // reject하지 않고 그냥 닫기 — pipeline은 catch에서 처리
                  }
                  wizardResolveRef.current = null;
                  setRenderStatus('IDLE');
                  setToastMsg('⏹️ 파이프라인 중단됨');
                  setTimeout(() => setToastMsg(null), 2000);
                }}
                className="px-4 py-2 rounded-lg text-xs font-bold text-red-400 border border-red-800 hover:bg-red-900/30 transition-all"
              >
                ⏹️ 중단
              </button>
              {/* Step 3 완료 시: '파이프라인 완료' 버튼 | 그 외: '다음 단계로' 버튼 */}
              {wizardState.currentStep === 'STEP_3_RENDER' && renderStatus === 'DONE' ? (
                <button
                  onClick={() => {
                    if (wizardResolveRef.current) {
                      wizardResolveRef.current();
                      wizardResolveRef.current = null;
                    }
                  }}
                  className="px-8 py-2.5 rounded-lg text-sm font-black bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-white shadow-lg shadow-emerald-900/30 transition-all"
                >
                  ✅ 파이프라인 완료
                </button>
              ) : wizardState.currentStep !== 'STEP_3_RENDER' ? (
                <button
                  id="btn_wizard_proceed"
                  onClick={() => {
                    if (wizardResolveRef.current) {
                      wizardResolveRef.current();
                      wizardResolveRef.current = null;
                    }
                  }}
                  className="px-8 py-2.5 rounded-lg text-sm font-black bg-gradient-to-r from-violet-600 to-purple-500 hover:from-violet-500 hover:to-purple-400 text-white shadow-lg shadow-violet-900/30 transition-all"
                >
                  {wizardState.nextStep?.icon} 다음 단계로 → {wizardState.nextStep?.label}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* STEP 1: 마스터 입력 포털 */}
      <section className="mb-10 bg-gray-900/50 p-6 md:p-8 rounded-2xl border border-gray-800 shadow-2xl">
        <h2 className="text-amber-500 font-bold mb-4 text-sm uppercase tracking-widest">🔻 STEP 1: 마스터 입력 포털</h2>

        {/* 3엔진 탭 메뉴 */}
        <div className="flex gap-2 mb-5 border-b border-gray-800 pb-3 overflow-x-auto">
          {[
            { id: 'recreate', icon: '🚀', label: '롱폼 재창조 (시네마틱)', color: 'amber' },
            { id: 'summary', icon: '✂️', label: '원본 숏폼 요약', color: 'cyan' },
            { id: 'commerce', icon: '🛍️', label: '커머스 맞춤 광고', color: 'pink' },
            { id: 'global', icon: '🌍', label: 'Global Finder', color: 'violet' },
            { id: 'keyword', icon: '🔑', label: 'Golden Keyword', color: 'yellow' },
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
                background: engine.id === 'recreate' ? 'rgba(217,119,6,0.15)' : engine.id === 'summary' ? 'rgba(6,182,212,0.15)' : engine.id === 'commerce' ? 'rgba(236,72,153,0.15)' : engine.id === 'keyword' ? 'rgba(234,179,8,0.15)' : 'rgba(139,92,246,0.15)',
                borderColor: engine.id === 'recreate' ? '#d97706' : engine.id === 'summary' ? '#06b6d4' : engine.id === 'commerce' ? '#ec4899' : engine.id === 'keyword' ? '#eab308' : '#8b5cf6',
                color: engine.id === 'recreate' ? '#fbbf24' : engine.id === 'summary' ? '#22d3ee' : engine.id === 'commerce' ? '#f472b6' : engine.id === 'keyword' ? '#facc15' : '#a78bfa',
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
                  <span className="text-[9px] text-gray-600">{summaryResult.highlights?.length || 0}개 추출됨</span>
                </div>
                {summaryResult.source?.title && (
                  <div className="bg-black/40 p-3 rounded-lg border border-gray-800 text-[10px]">
                    <p className="text-white font-bold">{summaryResult.source.title}</p>
                    <p className="text-gray-500 mt-1">{summaryResult.source.channel} · {Math.round(summaryResult.source.duration / 60)}분</p>
                    {summaryResult.summary && <p className="text-gray-400 mt-1 italic">{summaryResult.summary}</p>}
                  </div>
                )}
                {summaryResult.highlights?.length > 0 && (
                  <p className="text-[9px] text-cyan-600 mb-1">👆 하이라이트를 클릭하면 하단 카피/비주얼이 즉시 갱신됩니다</p>
                )}
                {summaryResult.highlights?.map((h, i) => (
                  <div
                    key={i}
                    onClick={() => handleHighlightSelect(h, i)}
                    className={`relative bg-black/30 p-3 rounded-lg border text-[10px] cursor-pointer transition-all hover:bg-cyan-900/10 ${
                      selectedHighlight === h ? 'border-cyan-500 ring-1 ring-cyan-500/30 bg-cyan-900/20' : 'border-cyan-900/30'
                    }`}
                  >
                    {/* ★ Viral Score 대형 배지 */}
                    {h.viral_score && (
                      <div className={`absolute -top-2 -right-2 w-10 h-10 rounded-full flex items-center justify-center text-[11px] font-black border-2 ${
                        h.viral_score >= 8 ? 'bg-red-600 border-red-400 text-white shadow-[0_0_12px_rgba(239,68,68,0.5)]'
                        : h.viral_score >= 6 ? 'bg-amber-600 border-amber-400 text-white shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                        : 'bg-gray-700 border-gray-500 text-gray-300'
                      }`}>
                        {h.viral_score}
                      </div>
                    )}
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-cyan-400 font-bold">#{h.rank || i + 1} {h.emotion && `${h.emotion === '놀라움' ? '😮' : h.emotion === '감동' ? '🥹' : h.emotion === '유머' ? '😂' : h.emotion === '긴장' ? '😰' : '🔥'}`} {selectedHighlight === h && <span className="text-[8px] text-cyan-300 ml-1">✓ 선택됨</span>}</span>
                      <span className="text-gray-500 mr-12">{Math.floor(h.start_sec / 60)}:{String(h.start_sec % 60).padStart(2, '0')} → {Math.floor(h.end_sec / 60)}:{String(h.end_sec % 60).padStart(2, '0')}</span>
                    </div>
                    <p className="text-white">{h.caption}</p>
                    <p className="text-gray-500 mt-1">{h.reason}</p>
                    {h.keywords && <div className="mt-1 flex gap-1 flex-wrap">{h.keywords.map((kw, ki) => <span key={ki} className="px-1.5 py-0.5 bg-cyan-900/30 text-cyan-300 rounded text-[8px]">{kw}</span>)}</div>}
                    {h.viral_score && <div className="mt-1.5 flex items-center gap-1"><span className="text-[8px] text-gray-600">Viral Potential:</span><div className="flex-1 bg-gray-800 h-1 rounded-full overflow-hidden"><div className={`h-full rounded-full ${h.viral_score>=8?'bg-red-500':h.viral_score>=6?'bg-amber-500':'bg-gray-600'}`} style={{width:`${h.viral_score*10}%`}}></div></div><span className="text-[8px] font-bold text-gray-400">{h.viral_score}/10</span></div>}
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

        {/* 엔진 D: Global Finder */}
        {activeEngine === 'global' && (
          <div>
            <p className="text-[10px] text-violet-400 mb-3 font-medium">🌍 해외 콘텐츠(EN/CN/JP)를 한국 시장에 최적화합니다. YouTube URL 또는 MP4/MP3 파일을 업로드하세요.</p>
            {/* URL / FILE 서브탭 */}
            <div className="flex gap-2 mb-4">
              <button onClick={() => setGlobalTab('URL')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border ${globalTab === 'URL' ? 'bg-violet-900/30 border-violet-600 text-violet-300' : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:border-violet-700'}`}>🔗 YouTube URL</button>
              <button onClick={() => setGlobalTab('FILE')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border ${globalTab === 'FILE' ? 'bg-violet-900/30 border-violet-600 text-violet-300' : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:border-violet-700'}`}>📁 파일 업로드</button>
              <button onClick={() => setGlobalTab('RADAR')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border ${globalTab === 'RADAR' ? 'bg-violet-900/30 border-violet-600 text-violet-300' : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:border-violet-700'}`}>📡 Global Radar</button>
            </div>

            {globalTab === 'URL' && (
              <div className="flex flex-col md:flex-row gap-3">
                <input
                  type="text"
                  value={masterInput}
                  onChange={(e) => setMasterInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !globalProcessing && masterInput && handleGlobalFinder()}
                  placeholder="해외 YouTube URL (예: https://youtube.com/watch?v=... — EN/CN/JP 지원)"
                  className="flex-1 bg-black border border-gray-700 rounded-lg p-3.5 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 outline-none transition-all placeholder-gray-600"
                />
                <button
                  disabled={globalProcessing || !masterInput}
                  onClick={handleGlobalFinder}
                  className={`px-8 py-3.5 rounded-lg font-bold text-sm whitespace-nowrap transition-all ${
                    globalProcessing
                      ? 'bg-gray-700 text-gray-400 cursor-not-allowed animate-pulse'
                      : !masterInput
                      ? 'bg-gray-800 text-violet-700 cursor-not-allowed'
                      : 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white shadow-lg shadow-violet-900/30'
                  }`}
                >
                  {globalProcessing ? '⚡ DNA 추출 중...' : '🌍 Global Finder 가동'}
                </button>
              </div>
            )}

            {globalTab === 'FILE' && (
              <div className="space-y-3">
                <div
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
                    globalFile ? 'border-violet-500 bg-violet-900/10' : 'border-gray-700 hover:border-violet-600 bg-black/30'
                  }`}
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-violet-400', 'bg-violet-900/20'); }}
                  onDragLeave={(e) => { e.currentTarget.classList.remove('border-violet-400', 'bg-violet-900/20'); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('border-violet-400', 'bg-violet-900/20');
                    const f = e.dataTransfer.files[0];
                    if (f && (f.type.startsWith('video/') || f.type.startsWith('audio/'))) {
                      setGlobalFile(f);
                      setGlobalFileName(f.name);
                    }
                  }}
                  onClick={() => document.getElementById('global-file-input').click()}
                >
                  {globalFile ? (
                    <div>
                      <p className="text-violet-400 font-bold text-sm">✅ {globalFileName}</p>
                      <p className="text-gray-500 text-[10px] mt-1">{(globalFile.size / 1024 / 1024).toFixed(1)}MB · 클릭하여 변경</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-gray-400 text-sm">📁 MP4/MP3 파일을 드래그하거나 클릭하세요</p>
                      <p className="text-gray-600 text-[10px] mt-1">Gemini 2.5 Flash STT로 자동 전사</p>
                    </div>
                  )}
                  <input id="global-file-input" type="file" className="hidden" accept="video/*,audio/*" onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) { setGlobalFile(f); setGlobalFileName(f.name); }
                  }} />
                </div>
                <button
                  disabled={globalProcessing || !globalFile}
                  onClick={handleGlobalFinder}
                  className={`w-full py-3.5 rounded-lg font-bold text-sm transition-all ${
                    globalProcessing
                      ? 'bg-gray-700 text-gray-400 cursor-not-allowed animate-pulse'
                      : !globalFile
                      ? 'bg-gray-800 text-violet-700 cursor-not-allowed'
                      : 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white shadow-lg shadow-violet-900/30'
                  }`}
                >
                  {globalProcessing ? '⚡ DNA 추출 중...' : '🚀 Launch Empire Engine'}
                </button>
              </div>
            )}

            {globalTab === 'RADAR' && (
              <div className="space-y-4">
                {/* 검색 바 */}
                <div className="flex flex-col md:flex-row gap-3">
                  <input
                    type="text"
                    value={radarKeyword}
                    onChange={(e) => setRadarKeyword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !radarScanning && radarKeyword && handleRadarScan()}
                    placeholder="글로벌 트렌드 키워드 (예: AI marketing, 短视频, ショート動画)"
                    className="flex-1 bg-black border border-gray-700 rounded-lg p-3.5 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 outline-none transition-all placeholder-gray-600"
                  />
                  <select
                    value={radarRegion}
                    onChange={(e) => setRadarRegion(e.target.value)}
                    className="bg-black border border-gray-700 rounded-lg px-4 py-3.5 text-sm text-violet-300 focus:border-violet-500 outline-none cursor-pointer"
                  >
                    <option value="US">🇺🇸 US (미국)</option>
                    <option value="CN">🇨🇳 CN (중국)</option>
                    <option value="JP">🇯🇵 JP (일본)</option>
                    <option value="KR">🇰🇷 KR (한국)</option>
                    <option value="GB">🇬🇧 GB (영국)</option>
                    <option value="IN">🇮🇳 IN (인도)</option>
                    <option value="DE">🇩🇪 DE (독일)</option>
                    <option value="FR">🇫🇷 FR (프랑스)</option>
                    <option value="BR">🇧🇷 BR (브라질)</option>
                    <option value="TH">🇹🇭 TH (태국)</option>
                    <option value="VN">🇻🇳 VN (베트남)</option>
                  </select>
                  <button
                    disabled={radarScanning || !radarKeyword}
                    onClick={handleRadarScan}
                    className={`px-8 py-3.5 rounded-lg font-bold text-sm whitespace-nowrap transition-all ${
                      radarScanning
                        ? 'bg-gray-700 text-gray-400 cursor-not-allowed animate-pulse'
                        : !radarKeyword
                        ? 'bg-gray-800 text-violet-700 cursor-not-allowed'
                        : 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white shadow-lg shadow-violet-900/30'
                    }`}
                  >
                    {radarScanning ? '📡 스캔 중...' : '📡 Scan Global Trends'}
                  </button>
                </div>

                {/* 50개 영상 그리드 */}
                {radarVideos.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-violet-400 text-xs font-bold">📡 {radarVideos.length}개 영상 발견 — 클릭하여 DNA 추출</p>
                      <span className="text-[9px] text-gray-600">{radarKeyword} · {radarRegion}</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 max-h-[700px] overflow-y-auto pr-1">
                      {radarVideos.map((v) => (
                        <div key={v.videoId} className={`bg-gray-800/60 rounded-xl border overflow-hidden transition-all hover:border-violet-500 ${
                          absorbingId === v.videoId ? 'border-violet-500 ring-1 ring-violet-500/30' : 'border-gray-700'
                        }`}>
                          <img src={v.thumbnail} alt={v.title} className="w-full aspect-video object-cover" loading="lazy" />
                          <div className="p-3">
                            <p className="text-[10px] text-purple-400 font-bold mb-1">🌐 글로벌 콘텐츠</p>
                            <h3 className="text-[11px] text-white font-semibold leading-tight line-clamp-2 mb-1.5">{v.title}</h3>
                            <p className="text-[9px] text-gray-500 truncate">📺 {v.channel}</p>
                            <div className="flex justify-between items-center text-[9px] text-gray-400 mt-2 border-t border-gray-700 pt-2">
                              <span className="font-bold">👁️ {formatViews(v.viewCount)}회</span>
                              <span>📅 {formatDate(v.publishedAt)}</span>
                            </div>
                            <button
                              disabled={!!absorbingId}
                              onClick={() => handleAbsorbDNA(v.videoId)}
                              className={`w-full mt-2.5 py-2 rounded-lg text-[10px] font-bold transition-all ${
                                absorbingId === v.videoId
                                  ? 'bg-violet-700 text-violet-300 animate-pulse'
                                  : absorbingId
                                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                  : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/30'
                              }`}
                            >
                              {absorbingId === v.videoId ? '⚡ DNA 추출 중...' : '🧬 Absorb DNA'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 특성 카드 */}
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="bg-black/40 p-3 rounded-lg border border-gray-800 text-center">
                <p className="text-violet-400 text-xs font-bold">🔤 언어 감지</p>
                <p className="text-[9px] text-gray-500 mt-1">EN/CN/JP 자동 인식</p>
              </div>
              <div className="bg-black/40 p-3 rounded-lg border border-gray-800 text-center">
                <p className="text-violet-400 text-xs font-bold">🧠 심리 어댑터</p>
                <p className="text-[9px] text-gray-500 mt-1">한국 소비자 심리 최적화</p>
              </div>
              <div className="bg-black/40 p-3 rounded-lg border border-gray-800 text-center">
                <p className="text-violet-400 text-xs font-bold">📝 3종 카피</p>
                <p className="text-[9px] text-gray-500 mt-1">15초/30초/60초 자동 생성</p>
              </div>
            </div>

            {/* ═══ Global DNA 추출 결과 패널 ═══ */}
            {globalResult && !globalProcessing && !absorbingId && (
              <div className="mt-8 p-6 bg-gray-900 border border-purple-500 rounded-xl shadow-2xl">
                
                {/* 상단 헤더 및 핵심 훅(Hook) */}
                <div className="mb-6">
                  <h2 className="text-2xl text-white font-bold mb-2">🔥 글로벌 DNA 심층 추출 완료</h2>
                  {/* 소스 영상 정보 */}
                  {(absorbedVideoTitle || globalResult.source?.videoId) && (
                    <div className="flex items-center gap-2 flex-wrap mb-3 p-2.5 bg-black/40 rounded-lg border border-gray-800">
                      <span className="text-[9px] text-gray-500">🎬 분석 소스:</span>
                      {absorbedVideoTitle && <span className="text-[10px] text-white font-semibold truncate max-w-[400px]">{absorbedVideoTitle}</span>}
                      {globalResult.source?.videoId && <a href={`https://youtube.com/watch?v=${globalResult.source.videoId}`} target="_blank" rel="noopener noreferrer" className="text-[9px] text-violet-400 hover:text-violet-300 underline">{globalResult.source.videoId}</a>}
                      {globalResult.source?.extractionEngine && <span className="text-[8px] text-gray-600 bg-gray-800 px-1.5 py-0.5 rounded">via {globalResult.source.extractionEngine}</span>}
                      {globalResult.source?.duration && <span className="text-[8px] text-gray-600">{Math.round(globalResult.source.duration / 60)}분</span>}
                      {globalResult.detected_language && <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-violet-900/40 text-violet-300">{globalResult.detected_language} → KR</span>}
                    </div>
                  )}
                  <p className="text-gray-400 italic">" {globalResult.korean_adaptation?.hook || '분석된 후킹 포인트가 여기에 표시됩니다.'} "</p>
                </div>

                {/* 메인 토픽 */}
                {globalResult.main_topic && (
                  <div className="mb-5 flex items-center gap-2 p-2.5 bg-black/30 rounded-lg border border-gray-800">
                    <span className="text-[9px] text-emerald-500 font-bold">🎯 메인 토픽:</span>
                    <span className="text-[11px] text-white font-semibold">{globalResult.main_topic}</span>
                  </div>
                )}

                {/* ═══ 3-Track DNA Fusion Panel ═══ */}
                <div className="mb-6">
                  <h3 className="text-xs text-gray-500 font-bold mb-3 uppercase tracking-wider">🧬 DNA Fusion — 3-Track Extraction</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                    {/* TRACK 1: Pure Content */}
                    <div className="p-4 bg-gray-800 rounded-lg border border-emerald-800/30">
                      <div className="flex justify-between items-center border-b border-emerald-900/30 pb-2 mb-3">
                        <h3 className="text-emerald-400 font-bold text-sm">🧪 순수 콘텐츠</h3>
                        <button onClick={() => handleCopy(globalResult.pureContent)} className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded">📋 복사</button>
                      </div>
                      <p className="text-[9px] text-emerald-500/60 mb-2">광고 0% — 영상 본연의 바이럴 스토리</p>
                      <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{globalResult.pureContent || '분석 결과가 없습니다.'}</p>
                    </div>

                    {/* TRACK 2: Extracted Sponsor */}
                    <div className="p-4 bg-gray-800 rounded-lg border border-red-800/30">
                      <div className="flex justify-between items-center border-b border-red-900/30 pb-2 mb-3">
                        <h3 className="text-red-400 font-bold text-sm">📢 스폰서 추출</h3>
                        <button onClick={() => handleCopy(globalResult.extractedSponsor?.found ? `[${globalResult.extractedSponsor.brandName}]\n${globalResult.extractedSponsor.koreanCopy}\n셀링포인트: ${globalResult.extractedSponsor.sellingPoints?.join(', ')}\nCTA: ${globalResult.extractedSponsor.cta}` : '광고 없음')} className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded">📋 복사</button>
                      </div>
                      {globalResult.extractedSponsor?.found ? (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-0.5 bg-red-900/40 text-red-300 text-[9px] font-bold rounded border border-red-700/50">{globalResult.extractedSponsor.brandName}</span>
                          </div>
                          <p className="text-[10px] text-gray-500 mb-1">📝 원문:</p>
                          <p className="text-[11px] text-gray-400 italic mb-2">{globalResult.extractedSponsor.originalCopy}</p>
                          <p className="text-[10px] text-gray-500 mb-1">🇰🇷 한국어:</p>
                          <p className="text-sm text-gray-300 mb-2">{globalResult.extractedSponsor.koreanCopy}</p>
                          {globalResult.extractedSponsor.sellingPoints?.length > 0 && (
                            <div className="flex gap-1 flex-wrap mb-2">
                              {globalResult.extractedSponsor.sellingPoints.map((sp, i) => (
                                <span key={i} className="text-[9px] bg-red-900/20 text-red-300/80 px-1.5 py-0.5 rounded">{sp}</span>
                              ))}
                            </div>
                          )}
                          <p className="text-[10px] text-amber-400">💡 CTA: {globalResult.extractedSponsor.cta}</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-6 text-gray-600">
                          <span className="text-2xl mb-2">🛡️</span>
                          <p className="text-sm font-bold">광고 없음</p>
                          <p className="text-[10px]">스폰서/PPL이 감지되지 않았습니다</p>
                        </div>
                      )}
                    </div>

                    {/* TRACK 3: Hybrid Commerce */}
                    <div className="p-4 bg-gray-800 rounded-lg border border-amber-800/30">
                      <div className="flex justify-between items-center border-b border-amber-900/30 pb-2 mb-3">
                        <h3 className="text-amber-400 font-bold text-sm">🐴 트로이 목마</h3>
                        <button onClick={() => handleCopy(globalResult.hybridCommerce)} className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded">📋 복사</button>
                      </div>
                      <p className="text-[9px] text-amber-500/60 mb-2">콘텐츠 훅 → 자연 전환 → 커머스 착지</p>
                      <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{globalResult.hybridCommerce || '분석 결과가 없습니다.'}</p>
                    </div>
                  </div>
                </div>

                {/* 3종 대본 (15초 / 30초 / 60초) */}
                <div className="mb-6">
                  <h3 className="text-xs text-gray-500 font-bold mb-3 uppercase tracking-wider">📝 순수 콘텐츠 기반 — 3종 대본</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* 15초 숏폼 */}
                    <div className="p-4 bg-gray-800 rounded-lg">
                      <div className="flex justify-between items-center border-b border-gray-700 pb-2 mb-2">
                        <h3 className="text-purple-400 font-bold">⏱️ 15초 컷!</h3>
                        <button onClick={() => handleCopy(globalResult.korean_adaptation?.copies?.[0] ? `${globalResult.korean_adaptation.copies[0].headline}\n${globalResult.korean_adaptation.copies[0].body}\n${globalResult.korean_adaptation.copies[0].cta}` : '')} className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded">📋 복사</button>
                      </div>
                      <p className="text-sm text-gray-300 whitespace-pre-wrap">{globalResult.korean_adaptation?.copies?.[0] ? `${globalResult.korean_adaptation.copies[0].headline}\n\n${globalResult.korean_adaptation.copies[0].body}\n\n${globalResult.korean_adaptation.copies[0].cta}` : ''}</p>
                    </div>

                    {/* 30초 숏폼 */}
                    <div className="p-4 bg-gray-800 rounded-lg border border-purple-500/30">
                      <div className="flex justify-between items-center border-b border-gray-700 pb-2 mb-2">
                        <h3 className="text-purple-400 font-bold">🎬 30초 숏폼 (추천)</h3>
                        <button onClick={() => handleCopy(globalResult.korean_adaptation?.copies?.[1] ? `${globalResult.korean_adaptation.copies[1].headline}\n${globalResult.korean_adaptation.copies[1].body}\n${globalResult.korean_adaptation.copies[1].cta}` : '')} className="text-xs bg-purple-600 hover:bg-purple-500 px-2 py-1 rounded">📋 복사</button>
                      </div>
                      <p className="text-sm text-white whitespace-pre-wrap">{globalResult.korean_adaptation?.copies?.[1] ? `${globalResult.korean_adaptation.copies[1].headline}\n\n${globalResult.korean_adaptation.copies[1].body}\n\n${globalResult.korean_adaptation.copies[1].cta}` : ''}</p>
                    </div>

                    {/* 60초 숏폼 */}
                    <div className="p-4 bg-gray-800 rounded-lg">
                      <div className="flex justify-between items-center border-b border-gray-700 pb-2 mb-2">
                        <h3 className="text-purple-400 font-bold">📖 60초 스토리텔링</h3>
                        <button onClick={() => handleCopy(globalResult.korean_adaptation?.copies?.[2] ? `${globalResult.korean_adaptation.copies[2].headline}\n${globalResult.korean_adaptation.copies[2].body}\n${globalResult.korean_adaptation.copies[2].cta}` : '')} className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded">📋 복사</button>
                      </div>
                      <p className="text-sm text-gray-300 whitespace-pre-wrap">{globalResult.korean_adaptation?.copies?.[2] ? `${globalResult.korean_adaptation.copies[2].headline}\n\n${globalResult.korean_adaptation.copies[2].body}\n\n${globalResult.korean_adaptation.copies[2].cta}` : ''}</p>
                    </div>
                  </div>
                </div>

                {/* 비주얼 프롬프트 + Arsenal Injector */}
                <div className="p-5 bg-blue-900/20 border border-blue-500 rounded-lg">
                  <div className="flex justify-between items-center mb-3 border-b border-blue-800/50 pb-2">
                    <h3 className="text-blue-400 font-bold text-lg">🎨 비주얼 프롬프트 (Arsenal Injector)</h3>
                    <div className="flex gap-2">
                      <button onClick={() => handleCopy(globalResult.korean_adaptation?.visual_prompt)} className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs font-bold rounded">
                        📋 복사
                      </button>
                      <button
                        disabled={vvipGenerating}
                        onClick={() => handleVVIPGenerate(globalResult.korean_adaptation?.visual_prompt)}
                        className={`px-4 py-1.5 text-sm font-bold rounded transition-all ${
                          vvipGenerating
                            ? 'bg-gray-700 text-gray-400 cursor-not-allowed animate-pulse'
                            : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg shadow-blue-900/30'
                        }`}
                      >
                        {vvipGenerating ? '⏳ VVIP 생성 중...' : '💎 VVIP 비주얼 생성'}
                      </button>
                    </div>
                  </div>
                  <p className="text-blue-200 font-mono text-sm break-all mb-3">{globalResult.korean_adaptation?.visual_prompt}</p>
                  <p className="text-[8px] text-blue-500/50">🛡️ Arsenal Tags: 35mm lens · f/1.8 · cinematic lighting · 8k · UE5 · photorealistic · film grain · depth of field</p>

                  {/* VVIP 생성 결과 */}
                  {vvipImage && (
                    <div className="mt-4 p-4 bg-black/40 rounded-lg border border-purple-500/30">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-purple-400 text-xs font-bold">💎 VVIP 시네마틱 결과</span>
                        <a href={vvipImage.imageUrl} target="_blank" rel="noopener noreferrer" className="text-[9px] text-blue-400 hover:text-blue-300 underline">원본 다운로드 ↗</a>
                      </div>
                      <img src={vvipImage.imageUrl} alt="VVIP Generated Visual" className="w-full max-w-sm mx-auto rounded-lg shadow-2xl shadow-purple-900/20 border border-gray-700" />
                      <p className="mt-2 text-[8px] text-gray-600 text-center">ID: {vvipImage.generationId} · {vvipImage.aspectRatio}</p>
                    </div>
                  )}
                </div>
                
              </div>
            )}
          </div>
        )}

        {/* 엔진 E: Golden Keyword Discovery */}
        {activeEngine === 'keyword' && (
          <div>
            <p className="text-[10px] text-yellow-400 mb-3 font-medium">✨ 한국어 씨앗 키워드를 입력하면 Gemini AI가 미국·일본·중국·한국 4개 시장의 현지어 바이럴 키워드를 발굴합니다. 황금 키워드를 Global Radar로 즉시 전송하세요!</p>
            <div className="flex flex-col md:flex-row gap-3 mb-5">
              <input
                type="text"
                value={kwSeed}
                onChange={(e) => setKwSeed(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !kwScanning && kwSeed && handleKeywordDiscovery()}
                placeholder="핵심 씨앗 키워드 입력 (예: 부업, AI 마케팅, 부동산 투자)"
                className="flex-1 bg-black border border-gray-700 rounded-lg p-3.5 text-sm focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500/20 outline-none transition-all placeholder-gray-600"
              />
              <button
                disabled={kwScanning || !kwSeed.trim()}
                onClick={handleKeywordDiscovery}
                className={`px-8 py-3.5 rounded-lg font-bold text-sm whitespace-nowrap transition-all ${
                  kwScanning
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed animate-pulse'
                    : !kwSeed.trim()
                    ? 'bg-gray-800 text-yellow-700 cursor-not-allowed'
                    : 'bg-gradient-to-r from-yellow-600 to-amber-500 hover:from-yellow-500 hover:to-amber-400 text-black shadow-lg shadow-yellow-900/30'
                }`}
              >
                {kwScanning ? '⏳ 글로벌 AI 분석 중...' : '✨ 글로벌 황금 키워드 발굴'}
              </button>
            </div>

            {/* 특성 카드 */}
            <div className="grid grid-cols-4 gap-3 mb-5">
              <div className="bg-black/40 p-3 rounded-lg border border-gray-800 text-center">
                <p className="text-yellow-400 text-xs font-bold">🇺🇸 US Market</p>
                <p className="text-[9px] text-gray-500 mt-1">영어 YouTube 키워드</p>
              </div>
              <div className="bg-black/40 p-3 rounded-lg border border-gray-800 text-center">
                <p className="text-yellow-400 text-xs font-bold">🇯🇵 JP Market</p>
                <p className="text-[9px] text-gray-500 mt-1">일본어 YouTube 키워드</p>
              </div>
              <div className="bg-black/40 p-3 rounded-lg border border-gray-800 text-center">
                <p className="text-yellow-400 text-xs font-bold">🇨🇳 CN Market</p>
                <p className="text-[9px] text-gray-500 mt-1">중국어 TikTok/抖音</p>
              </div>
              <div className="bg-black/40 p-3 rounded-lg border border-gray-800 text-center">
                <p className="text-yellow-400 text-xs font-bold">🇰🇷 KR Market</p>
                <p className="text-[9px] text-gray-500 mt-1">한국어 YouTube 키워드</p>
              </div>
            </div>

            {/* ═══ 키워드 분석 결과 ═══ */}
            {kwResults.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-yellow-400 text-xs font-bold">✨ {kwResults.length}개 글로벌 키워드 발굴 완료 — 수익성 높은 순</p>
                  <button
                    onClick={() => { navigator.clipboard.writeText(JSON.stringify(kwResults, null, 2)); setToastMsg('✅ 키워드 JSON 전체 복사 완료'); setTimeout(() => setToastMsg(null), 2000); }}
                    className="text-[9px] text-yellow-500 hover:text-yellow-400 bg-yellow-900/20 px-2 py-1 rounded border border-yellow-800/30"
                  >📋 JSON 전체 복사</button>
                </div>

                {kwResults.map((item, idx) => {
                  const isGolden = item.competition === '하' && (item.profitability || 0) >= 8;
                  const profColor = (item.profitability || 0) >= 8 ? 'text-red-400' : (item.profitability || 0) >= 6 ? 'text-amber-400' : 'text-gray-400';
                  const compColor = item.competition === '하' ? 'bg-green-900/40 text-green-300 border-green-700/50' : item.competition === '중' ? 'bg-amber-900/40 text-amber-300 border-amber-700/50' : 'bg-red-900/40 text-red-300 border-red-700/50';
                  const regionFlag = item.region === 'US' ? '🇺🇸' : item.region === 'JP' ? '🇯🇵' : item.region === 'CN' ? '🇨🇳' : '🇰🇷';
                  const regionBgColor = item.region === 'US' ? 'bg-blue-900/40 text-blue-300 border-blue-700/50' : item.region === 'JP' ? 'bg-rose-900/40 text-rose-300 border-rose-700/50' : item.region === 'CN' ? 'bg-red-900/40 text-red-300 border-red-700/50' : 'bg-green-900/40 text-green-300 border-green-700/50';

                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-xl border transition-all ${
                        isGolden
                          ? 'bg-yellow-900/15 border-yellow-500/60 shadow-[0_0_15px_rgba(234,179,8,0.15)] hover:shadow-[0_0_20px_rgba(234,179,8,0.25)]'
                          : 'bg-gray-800/60 border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            {isGolden && <span className="text-yellow-400 text-sm animate-pulse">⭐</span>}
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${regionBgColor}`}>{regionFlag} {item.region}</span>
                            <span className="text-white font-bold text-sm">{item.globalKeyword}</span>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${compColor}`}>경쟁 {item.competition}</span>
                            <span className={`font-black text-sm ${profColor}`}>{item.profitability || 0}점</span>
                            {isGolden && <span className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-300 text-[8px] font-bold rounded border border-yellow-500/30">★ GOLDEN</span>}
                          </div>
                          <p className="text-[11px] text-purple-300 font-semibold mb-1">💡 {item.koMeaning}</p>
                          <p className="text-[11px] text-gray-400 leading-relaxed mb-2">🧠 {item.psychology}</p>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] text-gray-600">🎯 Hook:</span>
                            <p className="text-[11px] text-violet-300 italic">" {item.targetHook} "</p>
                          </div>
                          {/* 수익성 바 */}
                          <div className="mt-2 flex items-center gap-2">
                            <span className="text-[8px] text-gray-600">수익성:</span>
                            <div className="flex-1 bg-gray-800 h-1.5 rounded-full overflow-hidden max-w-[200px]">
                              <div
                                className={`h-full rounded-full transition-all duration-700 ${(item.profitability || 0) >= 8 ? 'bg-gradient-to-r from-yellow-500 to-red-500' : (item.profitability || 0) >= 6 ? 'bg-gradient-to-r from-amber-600 to-amber-400' : 'bg-gray-600'}`}
                                style={{ width: `${(item.profitability || 0) * 10}%` }}
                              ></div>
                            </div>
                            <span className="text-[9px] font-bold text-gray-400">{item.profitability}/10</span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1.5 shrink-0">
                          <button
                            onClick={() => handlePushToRadar(item.globalKeyword, item.region)}
                            className={`px-3 py-2 rounded-lg text-[10px] font-bold transition-all border ${
                              isGolden
                                ? 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white border-violet-500 shadow-lg shadow-violet-900/30'
                                : 'bg-gray-700 hover:bg-violet-900/30 text-gray-300 hover:text-violet-300 border-gray-600 hover:border-violet-600'
                            }`}
                          >
                            {regionFlag} Radar 🚀
                          </button>
                          <button
                            onClick={() => handleCopy(item.targetHook)}
                            className="px-3 py-2 rounded-lg text-[10px] font-bold bg-gray-700 hover:bg-gray-600 text-gray-300 border border-gray-600 transition-all"
                          >
                            📋 Hook 복사
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
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

      {/* Master DNA 하위 기능 버튼 — 탭별 조건부 렌더링 */}
      {(masterDNA.brand_name || summaryResult || commerceResult || globalResult) && (
        <section className="mb-6 bg-gray-900/30 p-4 rounded-xl border border-gray-800">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-amber-500 text-xs font-bold">🧬 MASTER DNA</span>
            {masterDNA.brand_name && <span className="text-[9px] text-gray-500 bg-black/30 px-2 py-0.5 rounded">{masterDNA.brand_name}</span>}
            <span className={`text-[9px] px-2 py-0.5 rounded font-bold ${
              activeEngine === 'recreate' ? 'bg-amber-900/30 text-amber-400' :
              activeEngine === 'summary' ? 'bg-cyan-900/30 text-cyan-400' :
              activeEngine === 'global' ? 'bg-violet-900/30 text-violet-400' :
              activeEngine === 'keyword' ? 'bg-yellow-900/30 text-yellow-400' :
              'bg-pink-900/30 text-pink-400'
            }`}>
              {activeEngine === 'recreate' ? '🚀 재창조 모드' : activeEngine === 'summary' ? '✂️ 요약 모드' : activeEngine === 'global' ? '🌍 글로벌 모드' : activeEngine === 'keyword' ? '🔑 키워드 모드' : '🛍️ 커머스 모드'}
            </span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {/* ──── 🚀 롱폼 재창조 탭 ──── */}
            {activeEngine === 'recreate' && [
              { id: 'btn_script', icon: '✍️', label: '숏폼 스크립트', highlight: true, prompt: `Write a viral 15-second Korean ad script in 해요체 for ${masterDNA.brand_name || masterInput}. USP: ${masterDNA.usp.join(', ') || masterInput}. Target: ${masterDNA.target}. Tone: ${masterDNA.mood}. Make it emotional, conversational, hook viewers in 3 seconds.` },
              { id: 'btn_cinematic', icon: '🎬', label: '시네마틱 이미지', prompt: `A breathtaking cinematic shot of ${masterDNA.brand_name || masterInput}, ${masterDNA.mood || 'luxury premium'}, golden hour, volumetric lighting, Unreal Engine 5, photorealistic, 8k, film photography --ar 9:16 --v 6.0` },
              { id: 'btn_voicemix', icon: '🔊', label: '성우 믹싱', prompt: `[ElevenLabs TTS 지시] 보이스: ${selectedVoice || '미선택'}. 감정 톤: 웅장하고 우아한 내레이션. 텍스트: "${masterDNA.usp[0] || masterDNA.brand_name || masterInput}"` },
              { id: 'btn_runway', icon: '🎥', label: 'Runway 렌더링', prompt: `Cinematic camera push-in shot of ${masterDNA.brand_name || masterInput}, slow motion reveal, dramatic atmosphere, golden hour lighting, volumetric fog, premium advertisement, 4K` },
              { id: 'btn_luma', icon: '✨', label: 'Luma 렌더링', prompt: `Smooth aerial drone shot sweeping over ${masterDNA.brand_name || masterInput}, sunrise, epic scale, cinematic color grading, premium visual storytelling, photography in motion` },
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => {
                  navigator.clipboard.writeText(btn.prompt);
                  setToastMsg(`✅ ${btn.label} 프롬프트 복사 완료`);
                  setTimeout(() => setToastMsg(null), 2000);
                }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-bold transition-all border ${
                  btn.highlight
                    ? 'bg-amber-900/30 border-amber-600/50 text-amber-300 hover:bg-amber-800/40 hover:border-amber-500 shadow-sm shadow-amber-900/20'
                    : 'bg-black/40 border-gray-800 text-gray-300 hover:bg-amber-900/20 hover:border-amber-700/50 hover:text-amber-300'
                }`}
              >
                <span>{btn.icon}</span>
                <span>{btn.label}</span>
              </button>
            ))}

            {/* ──── ✂️ 원본 숏폼 요약 탭 — 인라인 결과 컨테이너 ──── */}
            {activeEngine === 'summary' && (<div className="flex flex-col gap-3 w-full mt-2">
                <div className="flex gap-2 flex-wrap">
                  {[
                    { id: 'sh', icon: '📊', label: '하이라이트 추출', hl: true, act: 'summary' },
                    { id: 'ss', icon: '💬', label: '자막 자동 생성', act: 'subtitle' },
                    { id: 'sf', icon: '👤', label: '페이스 트래킹', act: 'facetrack' },
                    { id: 'sb', icon: '📱', label: 'SNS 배너', act: 'snsbanner' },
                  ].map((btn) => {
                    const key = btn.act === 'snsbanner' ? 'banner' : btn.act;
                    const st = actionStates[key];
                    return (
                    <button key={btn.id} disabled={st?.loading}
                      onClick={async () => {
                        if (btn.act === 'summary') { handleSummaryEngine(); return; }
                        if (!masterInput) { setToastMsg('❌ URL을 먼저 입력하세요'); setTimeout(() => setToastMsg(null), 2000); return; }
                        updateAction(key, { loading: true, percent: 10, status: `${btn.icon} 서버 처리 중...`, result: null });
                        const eps = { subtitle: { url: '/api/generate-subtitles', body: { url: masterInput, highlight_id: selectedHighlight?.rank || null }, ss: [{at:2e3,p:20,s:'📡 YouTube 서버 연결...'},{at:5e3,p:35,s:'📄 자막 트랙 탐색...'},{at:8e3,p:50,s:'🧠 AI STT 엔진 가동...'},{at:15e3,p:65,s:'✍️ 음성 → 텍스트 변환...'},{at:25e3,p:78,s:'📊 타임코드 매핑...'}] },
                          facetrack: { url: '/api/process-video', body: { url: masterInput, mode: 'facetrack', highlights: summaryResult?.highlights||[] }, ss: [{at:2e3,p:20,s:'📡 영상 메타데이터 로드...'},{at:5e3,p:40,s:'🎯 Gemini AI 인물 분석...'},{at:10e3,p:60,s:'📐 9:16 크롭 좌표 계산...'},{at:18e3,p:78,s:'🎬 FFmpeg 명령 생성...'}] },
                          banner: { url: '/api/generate-image', body: { prompt: `Instagram Reels cover "${summaryResult?.source?.title||masterInput}", Korean text, viral --ar 9:16 --v 6.0`, style: 'sns_banner' }, ss: [{at:2e3,p:40,s:'🎨 설계...'},{at:5e3,p:70,s:'🖼️ 렌더링...'}] } };
                        const ep = eps[key]; const ts = ep.ss.map(s => setTimeout(() => updateAction(key, { percent: s.p, status: s.s }), s.at));
                        try {
                          const r = await fetch(ep.url, { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(ep.body) });
                          ts.forEach(t=>clearTimeout(t));
                          // ── Strict HTTP Error Handling: 401/500 등 즉시 표시 ──
                          if (!r.ok) {
                            const errBody = await r.json().catch(() => ({}));
                            const errMsg = `HTTP ${r.status}: ${errBody.error || r.statusText}`;
                            console.error(`[${key.toUpperCase()}] API Error:`, errMsg);
                            updateAction(key, { loading: false, percent: 100, status: `❌ ${errMsg}` });
                            if (key === 'subtitle') setSubtitleText(`❌ 자막 추출 실패 (Failed):\n${errMsg}\n\n* Vercel 로그 또는 401 인증 문제를 확인하세요.`);
                            return;
                          }
                          updateAction(key, { percent: 90, status: '📦 데이터 수신 완료...' });
                          const d = await r.json();
                          if (d.success) {
                            updateAction(key, { loading: false, percent: 100, status: `✅ 완료! ${key==='subtitle' ? `(${d.data?.sourceLabel||d.data?.source||''})` : key==='facetrack' ? `(${d.data?.crops?.length||0}개 크롭 포인트)` : ''}`, result: d.data });
                            if (key==='subtitle') {
                              const text = d.data?.text || d.data?.segments?.map(s=>`[${s.start}s→${s.end||''}s] ${s.text}`).join('\n') || '';
                              if (!text) { setSubtitleText('❌ 자막 추출 실패: 백엔드가 빈 텍스트를 반환했습니다.'); }
                              else { setSubtitleText(text); }
                            }
                            if (key==='facetrack' && d.data?.videoUrl) setRenderVideo(d.data.videoUrl);
                          } else {
                            const failMsg = d.error || '알 수 없는 오류';
                            updateAction(key, { loading: false, percent: 100, status: `❌ ${failMsg}` });
                            if (key === 'subtitle') setSubtitleText(`❌ 자막 추출 실패:\n${failMsg}`);
                          }
                        } catch(e) {
                          ts.forEach(t=>clearTimeout(t));
                          console.error(`[${key.toUpperCase()}] Network Error:`, e);
                          updateAction(key, { loading: false, percent: 100, status: `❌ ${e.message}` });
                          if (key === 'subtitle') setSubtitleText(`❌ 자막 추출 실패 (Network Error):\n${e.message}\n\n* 네트워크 연결 또는 서버 상태를 확인하세요.`);
                        }
                      }}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-bold transition-all border ${st?.loading ? 'opacity-60 cursor-wait border-cyan-700/50 text-cyan-400 animate-pulse' : btn.hl ? 'bg-cyan-900/30 border-cyan-600/50 text-cyan-300 hover:bg-cyan-800/40 hover:border-cyan-500' : 'bg-black/40 border-gray-800 text-gray-300 hover:bg-cyan-900/20 hover:border-cyan-700/50 hover:text-cyan-300'}`}
                    ><span>{btn.icon}</span><span>{btn.label}</span></button>);
                  })}
                </div>
                {/* 하이라이트 인라인 진행 */}
                {(actionStates.summary.loading || actionStates.summary.percent > 0) && (
                  <div className="bg-black/40 border border-cyan-900/30 rounded-lg p-3">
                    <div className="flex items-center justify-between text-[10px] mb-1">
                      <span className={actionStates.summary.percent>=100?'text-[#39FF14]':'text-cyan-300'}>{actionStates.summary.status}</span>
                      <span className="text-white font-mono font-bold">{actionStates.summary.percent}%</span>
                    </div>
                    <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${actionStates.summary.percent>=100?'bg-[#39FF14]':'bg-gradient-to-r from-cyan-500 to-blue-500'}`} style={{width:`${actionStates.summary.percent}%`}}></div>
                    </div>
                  </div>
                )}
                {/* 자막 결과 — 편집 가능 textarea */}
                {(actionStates.subtitle.loading || actionStates.subtitle.result) && (
                  <div className="bg-black/40 border border-cyan-900/30 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-cyan-400 text-[10px] font-bold">💬 자막 자동 생성</span>
                      {actionStates.subtitle.loading && <span className="text-cyan-300 text-[10px] font-mono animate-pulse">{actionStates.subtitle.percent}%</span>}
                      {!actionStates.subtitle.loading && actionStates.subtitle.result && <span className="text-[9px] text-gray-500">{actionStates.subtitle.result.sourceLabel || actionStates.subtitle.result.source} · {actionStates.subtitle.result.segmentCount || actionStates.subtitle.result.segments?.length || 0}개 세그먼트 · {actionStates.subtitle.result.durationSec || 0}초</span>}
                    </div>
                    {actionStates.subtitle.loading && <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden mb-2"><div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500" style={{width:`${actionStates.subtitle.percent}%`}}></div></div>}
                    {actionStates.subtitle.loading && <p className="text-gray-500 text-[9px] flex items-center gap-1"><span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-ping"></span>{actionStates.subtitle.status}</p>}
                    {subtitleText && <textarea value={subtitleText} onChange={(e)=>setSubtitleText(e.target.value)} className="w-full bg-black/60 border border-gray-700 rounded-lg p-3 text-[11px] text-gray-200 font-mono leading-relaxed resize-y focus:border-[#39FF14] focus:ring-1 focus:ring-[#39FF14]/20 outline-none mt-2" rows={8} placeholder="자막 편집..."/>}
                    {subtitleText && <span className="text-[8px] text-gray-600 mt-1 block">✏️ 위 텍스트를 직접 편집할 수 있습니다 · 백엔드 실제 추출 데이터</span>}
                  </div>
                )}
                {/* Face-Track 결과 + 비디오 플레이어 */}
                {(actionStates.facetrack.loading || actionStates.facetrack.result) && (
                  <div className="bg-black/40 border border-purple-900/30 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-purple-400 text-[10px] font-bold">👤 Face-Tracking</span>
                      {actionStates.facetrack.loading && <span className="text-purple-300 text-[10px] font-mono animate-pulse">{actionStates.facetrack.percent}%</span>}
                    </div>
                    {actionStates.facetrack.loading && <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden mb-2"><div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500" style={{width:`${actionStates.facetrack.percent}%`}}></div></div>}
                    {actionStates.facetrack.loading && <p className="text-gray-500 text-[9px] flex items-center gap-1"><span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-ping"></span>{actionStates.facetrack.status}</p>}
                    {actionStates.facetrack.result && (<div className="space-y-2 mt-2">
                      <p className="text-white text-[11px]">{actionStates.facetrack.result.guide}</p>
                      {actionStates.facetrack.result.cropResolution && <p className="text-gray-600 text-[9px]">원본: {actionStates.facetrack.result.originalResolution} → 크롭: {actionStates.facetrack.result.cropResolution}</p>}
                      {actionStates.facetrack.result.crops?.map((c,i) => <div key={i} className="bg-black/30 p-2 rounded border border-gray-800 text-[10px]">
                        <div className="flex items-center gap-3">
                          <span className="text-purple-400 font-bold">Scene {c.scene||i+1}</span>
                          <span className="text-gray-400">{c.time || `${c.startSec}s~${c.endSec}s`}</span>
                          <span className="text-white">{c.subject} — {c.action}</span>
                          <span className="text-gray-500 ml-auto font-mono text-[9px]">crop={c.width}:{c.height}:{c.x}:{c.y}</span>
                        </div>
                        {c.confidence && <div className="mt-1 flex items-center gap-1"><span className="text-[8px] text-gray-600">신뢰도:</span><div className="flex-1 bg-gray-800 h-1 rounded-full overflow-hidden"><div className={`h-full rounded-full ${c.confidence>=0.8?'bg-green-500':c.confidence>=0.6?'bg-amber-500':'bg-red-500'}`} style={{width:`${c.confidence*100}%`}}></div></div><span className="text-[8px] text-gray-400">{Math.round(c.confidence*100)}%</span></div>}
                      </div>)}
                      {actionStates.facetrack.result.ffmpegCommands?.length > 0 && (
                        <div className="bg-black/60 p-3 rounded-lg border border-gray-700 mt-2">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-amber-400 text-[9px] font-bold">🖥️ FFmpeg 명령어 ({actionStates.facetrack.result.ffmpegCommands.length}개 Scene)</p>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(actionStates.facetrack.result.ffmpegCommands.join('\n'));
                                setToastMsg('✅ FFmpeg 명령어 전체 복사 완료');
                                setTimeout(() => setToastMsg(null), 2000);
                              }}
                              className="text-[8px] text-amber-500 hover:text-amber-300 bg-amber-900/30 hover:bg-amber-800/40 border border-amber-700/40 px-2 py-0.5 rounded transition-all"
                            >📋 전체 복사</button>
                          </div>
                          {actionStates.facetrack.result.ffmpegCommands.map((cmd, i) => (
                            <div key={i} className="flex items-start gap-2 mb-1.5 group">
                              <code className="flex-1 text-[9px] text-green-400 font-mono bg-black/50 p-2 rounded border border-gray-800 break-all leading-relaxed select-all">{cmd}</code>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(cmd);
                                  setToastMsg(`✅ Scene ${i + 1} 명령어 복사 완료`);
                                  setTimeout(() => setToastMsg(null), 2000);
                                }}
                                className="shrink-0 mt-0.5 text-[9px] text-gray-500 hover:text-green-400 bg-gray-800/80 hover:bg-green-900/30 border border-gray-700 hover:border-green-600/50 px-2 py-1.5 rounded transition-all opacity-60 group-hover:opacity-100"
                                title={`Scene ${i + 1} 복사`}
                              >📋</button>
                            </div>
                          ))}
                          <p className="text-[8px] text-gray-600 mt-1">💡 각 명령어의 📋 버튼을 클릭하거나, 전체 복사 후 터미널에서 실행하세요.</p>
                        </div>
                      )}
                      {actionStates.facetrack.result.tips?.map((t,i) => <p key={i} className="text-gray-500 text-[9px]">💡 {t}</p>)}
                    </div>)}
                    {renderVideo && <video src={renderVideo} controls autoPlay className="w-full rounded-lg border-2 border-[#39FF14]/50 mt-3 shadow-[0_0_15px_rgba(57,255,20,0.15)]"/>}
                  </div>
                )}
                {/* SNS 배너 이미지 프리뷰 */}
                {(actionStates.banner.loading || actionStates.banner.result) && (
                  <div className="bg-black/40 border border-emerald-900/30 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-emerald-400 text-[10px] font-bold">📱 SNS 배너</span>
                      {actionStates.banner.loading && <span className="text-emerald-300 text-[10px] font-mono animate-pulse">{actionStates.banner.percent}%</span>}
                    </div>
                    {actionStates.banner.loading && <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden mb-2"><div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-500" style={{width:`${actionStates.banner.percent}%`}}></div></div>}
                    {actionStates.banner.loading && <p className="text-gray-500 text-[9px] flex items-center gap-1"><span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></span>{actionStates.banner.status}</p>}
                    {actionStates.banner.result && (<div className="space-y-2 mt-2">
                      {actionStates.banner.result.imageUrl ? <img src={actionStates.banner.result.imageUrl} alt="SNS Banner" className="w-full rounded-lg border-2 border-[#39FF14]/50 shadow-[0_0_15px_rgba(57,255,20,0.15)]"/> : (<div className="bg-black/60 p-3 rounded-lg border border-emerald-800/30">
                        <p className="text-white text-[11px] font-bold mb-1">🎯 정제된 MJ 프롬프트</p>
                        <p className="text-emerald-300 text-[10px] font-mono leading-relaxed">{actionStates.banner.result.refined_prompt}</p>
                        {actionStates.banner.result.variations?.map((v,i) => <div key={i} className="mt-2 bg-black/40 p-2 rounded border border-gray-800"><p className="text-cyan-400 text-[9px] font-bold">{v.name}</p><p className="text-gray-300 text-[9px] font-mono mt-0.5">{v.prompt}</p></div>)}
                        {actionStates.banner.result.description_ko && <p className="text-gray-500 text-[9px] mt-2 italic">{actionStates.banner.result.description_ko}</p>}
                      </div>)}
                    </div>)}
                  </div>
                )}
              </div>)}

            {/* ──── 🛍️ 커머스 맞춤 광고 탭 ──── */}
            {activeEngine === 'commerce' && [
              { id: 'btn_sales_page', icon: '🏆', label: '상세페이지 자동 기획', highlight: true, prompt: `[Master-piece 상세페이지 기획]\n브랜드: ${masterDNA.brand_name || masterInput}\nUSP: ${masterDNA.usp.join(', ') || masterInput}\n타겟: ${masterDNA.target}\n\n[출력]\n1. 히어로 섹션 카피 (해요체)\n2. 3가지 핵심 소구점 + 아이콘\n3. 사회적 증거 (리뷰/수상)\n4. 긴급 CTA (한정 혜택)\n5. FAQ 3개\n6. 각 섹션의 MJ 비주얼 프롬프트` },
              { id: 'btn_logo_c', icon: '🎨', label: '로고 생성', prompt: `A minimalist luxury brand logo for ${masterDNA.brand_name || masterInput}, high-end emblem, geometric, ${masterDNA.main_color}, flat vector design, clean white background, premium brand identity --no text, typography, letters --v 6.0` },
              { id: 'btn_poster_c', icon: '🖼️', label: '포스터 시안', prompt: `A breathtaking product advertisement poster for ${masterDNA.brand_name || masterInput}, featuring ${masterDNA.usp[0] || 'premium quality'}, ${masterDNA.mood || 'luxury'}, studio lighting, product photography, 8k --ar 9:16 --v 6.0` },
              { id: 'btn_hooking', icon: '🪝', label: '킬러 후킹 문구', prompt: `[킬러 후킹 문구 5종 생성]\n브랜드: ${masterDNA.brand_name || masterInput}\nUSP: ${masterDNA.usp.join(', ') || masterInput}\n타겟: ${masterDNA.target}\n\n규칙:\n- 해요체 필수\n- 3초 안에 스크롤 멈추게\n- 숫자/비교/질문 활용\n- 5가지 앵글: 호기심, 공포, FOMO, 비교, 반전\n\n예시: "이거 몰랐으면 100만원 날릴 뻔했어요..."` },
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => {
                  if (btn.action === 'commerce' && !commerceProcessing) {
                    handleCommerceEngine();
                  } else {
                    navigator.clipboard.writeText(btn.prompt);
                    setToastMsg(`✅ ${btn.label} ${btn.highlight ? '기획서' : '프롬프트'} 복사 완료`);
                    setTimeout(() => setToastMsg(null), 2000);
                  }
                }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-bold transition-all border ${
                  btn.highlight
                    ? 'bg-pink-900/30 border-pink-600/50 text-pink-300 hover:bg-pink-800/40 hover:border-pink-500 shadow-sm shadow-pink-900/20 ring-1 ring-pink-500/20'
                    : 'bg-black/40 border-gray-800 text-gray-300 hover:bg-pink-900/20 hover:border-pink-700/50 hover:text-pink-300'
                }`}
              >
                <span>{btn.icon}</span>
                <span>{btn.label}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* STEP 2: 3대 구역 통합 그리드 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        <div className={`relative bg-gray-900 p-6 rounded-xl border-2 transition-all duration-500 ${
          copyGenerating ? 'border-blue-500/60 shadow-[0_0_15px_rgba(59,130,246,0.25)] animate-pulse'
          : copyData ? 'border-[#39FF14]/60 shadow-[0_0_15px_rgba(57,255,20,0.2)]'
          : 'border-gray-800 hover:border-gray-700'
        }`}>
          {!copyGenerating && copyData && <span className="absolute top-3 right-3 bg-[#39FF14] text-black text-[10px] font-bold px-2 py-0.5 rounded shadow-[0_0_8px_rgba(57,255,20,0.4)]">READY</span>}
          <h3 className="text-blue-400 font-bold mb-4 border-b border-gray-800 pb-2 text-sm flex items-center gap-2">
            📝 기획 & 카피라이팅
            {copyGenerating && <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/20 text-blue-300 rounded animate-pulse">⏳ AI 기획 중...</span>}
            {selectedHighlight && <span className="text-[9px] text-gray-500 ml-auto">#{selectedHighlight.rank || '1'} 기반</span>}
          </h3>
          {/* ★ Adaptive Analysis Chunk Visualization */}
          {adaptiveSegments && adaptiveSegments.length > 0 && (
            <div className="bg-black/40 rounded-lg p-3 border border-purple-800/40 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] text-purple-400 font-bold flex items-center gap-1">
                  🔬 Adaptive Segments
                  <span className={`text-[7px] px-1.5 py-0.5 rounded font-bold ${
                    adaptiveConfig?.resolution === 'ULTRA_HIGH' ? 'bg-red-900/40 text-red-300' :
                    adaptiveConfig?.resolution === 'HIGH' ? 'bg-amber-900/40 text-amber-300' :
                    adaptiveConfig?.resolution === 'BALANCED' ? 'bg-blue-900/40 text-blue-300' :
                    'bg-gray-800 text-gray-400'
                  }`}>{adaptiveConfig?.resolution || 'AUTO'}</span>
                </span>
                <span className="text-[7px] text-gray-600">{adaptiveSegments.length}청크 | {adaptiveConfig?.interval}s 간격</span>
              </div>
              <div className="max-h-32 overflow-y-auto space-y-0.5 scrollbar-thin">
                {adaptiveSegments.map((seg, i) => (
                  <div key={i} className="flex items-start gap-2 py-1 px-1.5 rounded hover:bg-purple-900/10 transition-colors group">
                    <span className="text-[8px] font-mono text-purple-400/80 shrink-0 w-16">{seg.timeLabel}–{seg.endLabel}</span>
                    <span className="text-[8px] text-gray-500 truncate flex-1 group-hover:text-gray-300 transition-colors">{seg.content?.substring(0, 80)}{seg.content?.length > 80 ? '...' : ''}</span>
                    <span className="text-[6px] text-gray-700 shrink-0">{seg.wordCount}w</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3 text-sm text-gray-400">
            {copyGenerating ? (
              <div className="bg-black/30 p-6 rounded-lg text-center">
                <div className="inline-block w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mb-2"></div>
                <p className="text-blue-400 text-xs font-medium animate-pulse">🤖 AI가 기획 중입니다...</p>
                <p className="text-gray-600 text-[10px] mt-1">하이라이트 데이터를 기반으로 카피를 생성하고 있어요</p>
              </div>
            ) : copyData ? (
              copyData.map((copy, i) => (
                <div key={i} className="bg-black/50 p-3 rounded-lg border border-gray-800/50">
                  <p className="text-white font-bold text-xs mb-1">{copy.headline}</p>
                  <p className="text-gray-400 text-[11px] leading-relaxed whitespace-pre-line">{copy.body}</p>
                  <p className="text-cyan-400 text-[10px] mt-1.5 font-medium">{copy.cta}</p>
                </div>
              ))
            ) : (
              <p className="bg-black/30 p-4 rounded-lg text-center text-gray-600 text-xs italic">
                엔진 가동 후 카피가 자동 생성됩니다
              </p>
            )}
            {copyData && !copyGenerating && (
              <button
                onClick={() => {
                  const all = copyData.map(c => `${c.headline}\n${c.body}\n${c.cta}`).join('\n\n---\n\n');
                  navigator.clipboard.writeText(all);
                  setToastMsg('✅ 카피 전체 복사 완료');
                  setTimeout(() => setToastMsg(null), 2000);
                }}
                className="w-full py-2 bg-blue-900/30 hover:bg-blue-800/40 border border-blue-800/50 rounded text-xs transition-colors text-blue-300"
              >
                📋 카피 전체 복사
              </button>
            )}
          </div>
        </div>

        {/* 구역 B: 비주얼 시안 (미드저니) */}
        <div className={`relative bg-gray-900 p-6 rounded-xl border-2 transition-all duration-500 text-sm ${
          visualGenerating ? 'border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.25)] animate-pulse'
          : mjPrompts ? 'border-[#39FF14]/60 shadow-[0_0_15px_rgba(57,255,20,0.2)]'
          : 'border-gray-800 hover:border-gray-700'
        }`}>
          {!visualGenerating && mjPrompts && <span className="absolute top-3 right-3 bg-[#39FF14] text-black text-[10px] font-bold px-2 py-0.5 rounded shadow-[0_0_8px_rgba(57,255,20,0.4)]">READY</span>}
          <h3 className="text-emerald-400 font-bold mb-4 border-b border-gray-800 pb-2 text-sm flex items-center gap-2">
            🎨 비주얼 브랜딩
            {visualGenerating && <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 rounded animate-pulse">⏳ AI 생성 중...</span>}
            {!visualGenerating && mjPrompts && <span className="text-[10px] px-1.5 py-0.5 bg-emerald-900/30 text-emerald-300 rounded">4종</span>}
          </h3>
          {visualGenerating && (
            <div className="bg-black/30 p-4 rounded-lg text-center mb-4">
              <div className="inline-block w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mb-1.5"></div>
              <p className="text-emerald-400 text-[10px] font-medium animate-pulse">🎨 AI가 비주얼 프롬프트를 기획 중...</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {[
              { key: 'poster', icon: '📸', label: '포스터 시안' },
              { key: 'logo', icon: '◈', label: '로고/간판' },
              { key: 'sns', icon: '📱', label: 'SNS 배너' },
              { key: 'card', icon: '💳', label: '명함' },
            ].map((item) => (
              <div
                key={item.key}
                onDragOver={(e) => { e.preventDefault(); setDragOverSlot(item.key); }}
                onDragLeave={() => setDragOverSlot(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverSlot(null);
                  const imgUrl = e.dataTransfer.getData('text/image-url');
                  const imgName = e.dataTransfer.getData('text/image-name');
                  if (imgUrl) {
                    setSlotImages(prev => ({ ...prev, [item.key]: { url: imgUrl, name: imgName } }));
                    setToastMsg(`✅ ${imgName || '이미지'} → ${item.label} 슬롯에 매핑 완료`);
                    setTimeout(() => setToastMsg(null), 2000);
                  }
                }}
                onClick={() => {
                  if (mjPrompts?.[item.key]) {
                    navigator.clipboard.writeText(mjPrompts[item.key]);
                    setToastMsg(`✅ ${item.label} 프롬프트 복사 완료`);
                    setTimeout(() => setToastMsg(null), 2000);
                  }
                }}
                className={`relative bg-black aspect-video rounded-lg flex flex-col items-center justify-center text-[10px] border-2 transition-all duration-300 cursor-pointer overflow-hidden ${
                  dragOverSlot === item.key
                    ? 'border-amber-400 bg-amber-900/20 scale-[1.03] shadow-[0_0_15px_rgba(251,191,36,0.3)]'
                    : slotImages[item.key]
                      ? 'border-emerald-500/60 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                      : mjPrompts?.[item.key]
                        ? 'border-[#39FF14]/50 hover:border-[#39FF14] text-emerald-400 shadow-[0_0_8px_rgba(57,255,20,0.15)] hover:shadow-[0_0_12px_rgba(57,255,20,0.3)]'
                        : 'border-gray-800 hover:border-gray-700 text-gray-600'
                }`}
              >
                {slotImages[item.key] ? (
                  <>
                    <img src={slotImages[item.key].url} alt={item.label} className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    <span className="absolute bottom-1.5 left-2 text-[9px] text-white font-bold z-10">{item.icon} {item.label}</span>
                    <button onClick={(e) => { e.stopPropagation(); setSlotImages(prev => ({ ...prev, [item.key]: null })); }} className="absolute top-1 right-1 w-5 h-5 bg-red-600/80 hover:bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center z-10 opacity-0 hover:opacity-100 transition-opacity">×</button>
                    {mjPrompts?.[item.key] && <span className="absolute top-1 left-1 w-2 h-2 rounded-full bg-[#39FF14] shadow-[0_0_6px_rgba(57,255,20,0.6)] z-10"></span>}
                  </>
                ) : (
                  <>
                    {dragOverSlot === item.key ? (
                      <><span className="text-2xl mb-1 animate-bounce">🎯</span><span className="text-amber-400 font-bold">여기에 놓기!</span></>
                    ) : (
                      <>
                        {mjPrompts?.[item.key] && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#39FF14] shadow-[0_0_6px_rgba(57,255,20,0.6)]"></span>}
                        <span className="text-lg mb-1">{item.icon}</span>
                        <span>{item.label}</span>
                        {mjPrompts?.[item.key] ? <span className="text-[8px] text-[#39FF14]/70 mt-0.5">클릭→복사 | 드래그→매핑</span> : <span className="text-[8px] text-gray-600 mt-0.5">이미지를 드래그하세요</span>}
                      </>
                    )}
                  </>
                )}
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

          {/* 🎨 AI 이미지 생성 엔진 선택 */}
          <div className="bg-black/30 p-3 rounded-lg border border-gray-800 mb-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[9px] text-amber-400 font-bold">🎨 AI 이미지 엔진</span>
              <span className="text-[7px] text-gray-600">슬롯 클릭 → AI 직접 생성</span>
            </div>
            <div className="grid grid-cols-3 gap-1">
              {[
                { id: 'ideogram', icon: '🔤', label: 'Ideogram', sub: 'Typography' },
                { id: 'flux', icon: '📸', label: 'FLUX.1', sub: 'Realism' },
                { id: 'leonardo', icon: '🎬', label: 'Leonardo', sub: 'Cinematic' },
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => setVisualProvider(p.id)}
                  className={`py-1.5 px-1 rounded-md text-[8px] font-bold transition-all border ${
                    visualProvider === p.id
                      ? 'border-amber-500 bg-amber-900/30 text-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.2)]'
                      : 'border-gray-700 hover:border-gray-600 text-gray-500'
                  }`}
                >
                  <span className="text-sm block">{p.icon}</span>
                  <span className="block">{p.label}</span>
                  <span className="block text-[6px] opacity-60">{p.sub}</span>
                </button>
              ))}
            </div>
            {mjPrompts && (
              <button
                onClick={async () => {
                  const slots = ['poster', 'logo', 'sns', 'card'];
                  for (const slot of slots) {
                    if (!mjPrompts[slot]) continue;
                    setVisualGenJobs(prev => ({ ...prev, [slot]: 'generating' }));
                    try {
                      const res = await fetch('/api/engine/visual', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          prompt: mjPrompts[slot],
                          provider: visualProvider,
                          slotType: slot,
                        }),
                      });
                      const data = await res.json();
                      if (data.success && data.data?.imageUrl) {
                        setSlotImages(prev => ({ ...prev, [slot]: { url: data.data.imageUrl, name: `AI ${slot}` } }));
                        setVisualGenJobs(prev => ({ ...prev, [slot]: 'done' }));
                      } else {
                        setVisualGenJobs(prev => ({ ...prev, [slot]: 'error' }));
                        setToastMsg(`❌ ${slot}: ${data.error}`);
                        setTimeout(() => setToastMsg(null), 3000);
                      }
                    } catch (err) {
                      setVisualGenJobs(prev => ({ ...prev, [slot]: 'error' }));
                    }
                  }
                  setToastMsg(`✅ ${visualProvider.toUpperCase()} 4종 생성 완료`);
                  setTimeout(() => setToastMsg(null), 3000);
                }}
                className="w-full py-2 bg-gradient-to-r from-amber-700 to-orange-700 hover:from-amber-600 hover:to-orange-600 text-white text-[10px] font-bold rounded-lg transition-all shadow-lg shadow-amber-900/20 flex items-center justify-center gap-1.5"
              >
                {Object.values(visualGenJobs).some(v => v === 'generating') ? (
                  <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> AI 생성 중...</>
                ) : (
                  <><span>🚀</span> {visualProvider === 'ideogram' ? 'Ideogram' : visualProvider === 'flux' ? 'FLUX' : 'Leonardo'}로 4종 자동 생성</>
                )}
              </button>
            )}
          </div>

          {/* 업로드 썸네일 표시 */}
          {uploadedImages.length > 0 && (
            <div className="grid grid-cols-4 gap-1.5 mb-3">
              {uploadedImages.map((img, i) => (
                <div key={i} className="relative group cursor-grab active:cursor-grabbing"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/image-url', img.url);
                    e.dataTransfer.setData('text/image-name', img.name || `Image ${i + 1}`);
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                >
                  <img src={img.url} alt={img.name} className="w-full aspect-square object-cover rounded-lg border border-gray-700 group-hover:border-amber-500 transition-colors" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors rounded-lg flex items-center justify-center">
                    <span className="text-white text-[9px] font-bold opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 px-1.5 py-0.5 rounded">⬆️ 드래그</span>
                  </div>
                  <button
                    onClick={() => setUploadedImages(prev => prev.filter((_, idx) => idx !== i))}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white text-[8px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10"
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
        <div className={`relative bg-gray-900 p-6 rounded-xl border-2 transition-all duration-500 ${
          videoJobs.some(j => j.status === 'processing') ? 'border-purple-500/60 shadow-[0_0_15px_rgba(168,85,247,0.25)] animate-pulse'
          : videoJobs.some(j => j.status === 'complete') ? 'border-[#39FF14]/60 shadow-[0_0_15px_rgba(57,255,20,0.2)]'
          : 'border-gray-800 hover:border-gray-700'
        }`}>
          {videoJobs.some(j => j.status === 'complete') && <span className="absolute top-3 right-3 bg-[#39FF14] text-black text-[10px] font-bold px-2 py-0.5 rounded shadow-[0_0_8px_rgba(57,255,20,0.4)]">READY</span>}
          <h3 className="text-purple-400 font-bold mb-4 border-b border-gray-800 pb-2 text-sm flex items-center gap-2">
            🎬 시네마틱 영상
            {videoJobs.some(j => j.status === 'processing') && <span className="text-[10px] px-1.5 py-0.5 bg-purple-500/20 text-purple-300 rounded animate-pulse">⏳ 렌더링 중...</span>}
            {videoJobs.length > 0 && !videoJobs.some(j => j.status === 'processing') && <span className="text-[10px] px-1.5 py-0.5 bg-purple-900/30 text-purple-300 rounded">{videoJobs.length} JOBS</span>}
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
                  mjPrompts?.poster || `Cinematic shot of ${masterInput || 'premium concept'}, golden hour, 4K`,
                  videoSourceImg,
                  'runway'
                )}
                className="py-2.5 bg-purple-900/50 hover:bg-purple-800/50 border border-purple-700/50 rounded-lg text-[10px] text-purple-300 font-bold transition-colors"
              >
                🎬 Runway 렌더링
              </button>
              <button
                onClick={() => handleVideoGenerate(
                  mjPrompts?.poster || `Cinematic shot of ${masterInput || 'premium concept'}, golden hour, 4K`,
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
            {videoJobs.map((job) => {
              const isMock = job.result?.provider === 'mock';
              const isComplete = job.status === 'complete';
              const videoUrl = job.result?.videoUrl || renderVideo;
              const hasVideo = isComplete && videoUrl;

              return (
                <div key={job.id} className={`rounded-xl border overflow-hidden transition-all ${
                  job.status === 'processing' ? 'border-purple-700/30 animate-pulse' :
                  isComplete ? (isMock ? 'border-amber-700/40' : 'border-emerald-700/30') :
                  'border-red-700/30'
                }`}>
                  {/* Job Header */}
                  <div className={`p-3 text-[10px] ${
                    job.status === 'processing' ? 'bg-purple-900/20' :
                    isComplete ? (isMock ? 'bg-amber-900/15' : 'bg-emerald-900/20') :
                    'bg-red-900/20'
                  }`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-purple-400 flex items-center gap-1.5">
                        {job.provider === 'runway' ? '🎬' : '✨'} {job.provider.toUpperCase()}
                        {isMock && <span className="text-[8px] px-1.5 py-0.5 bg-amber-800/50 text-amber-400 rounded font-medium">MOCK</span>}
                      </span>
                      <span className={
                        job.status === 'processing' ? 'text-amber-400' :
                        isComplete ? (isMock ? 'text-amber-400' : 'text-emerald-400') :
                        'text-red-400'
                      }>
                        {job.status === 'processing' ? '⏳ 렌더링 중...' : isComplete ? (isMock ? '⚠️ Mock 완료' : '✅ 완료') : '❌ 에러'}
                      </span>
                    </div>
                    <p className="text-gray-500 truncate">{job.prompt?.substring(0, 60)}...</p>
                    {job.imageUrl && <p className="text-gray-600 text-[8px]">📸 Image→Video 모드</p>}
                  </div>

                  {/* ⚠️ MOCK 모드 경고 */}
                  {isMock && (
                    <div className="m-3 p-4 bg-gradient-to-r from-amber-950/60 to-red-950/40 border border-amber-600/40 rounded-lg">
                      <div className="flex items-start gap-3">
                        <span className="text-3xl">⚠️</span>
                        <div className="flex-1">
                          <h4 className="text-amber-400 font-bold text-xs mb-1">API 키 미설정 — 실제 영상이 생성되지 않았습니다</h4>
                          <p className="text-[10px] text-amber-300/70 mb-2">{job.result?.message}</p>
                          <div className="bg-black/40 rounded-lg p-2.5 text-[9px] font-mono text-gray-400 space-y-1">
                            <p className="text-amber-400 font-bold">// .env.local에 아래 키를 추가하세요:</p>
                            <p>RUNWAY_API_KEY=<span className="text-red-400">your_runway_key_here</span></p>
                            <p>LUMA_API_KEY=<span className="text-red-400">your_luma_key_here</span></p>
                          </div>
                          {job.result?.mockPreview?.thumbnail && (
                            <div className="mt-3">
                              <p className="text-[9px] text-gray-500 mb-1">📸 소스 이미지 (실제 렌더링 시 사용됨):</p>
                              <img src={job.result.mockPreview.thumbnail} alt="Mock preview" className="w-full aspect-video object-cover rounded-lg border border-gray-800" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 🎬 비디오 플레이어 (실제 영상이 있을 때) */}
                  {hasVideo && (
                    <div className="m-3 rounded-lg overflow-hidden border border-gray-800 bg-black">
                      <div className="px-3 py-2 bg-gray-900/80 border-b border-gray-800 flex justify-between items-center">
                        <span className="text-[9px] text-gray-400 font-medium">🎬 Final Output Preview</span>
                        <span className="text-[8px] text-emerald-500 font-mono">MP4 + 자막</span>
                      </div>
                      <video
                        controls
                        className="w-full aspect-[9/16] bg-black object-contain"
                        src={videoUrl}
                        crossOrigin="anonymous"
                        playsInline
                      >
                        {/* WebVTT 자막 트랙 */}
                        {(copyData || engineResult) && (() => {
                          const scriptText = copyData?.[0]?.body || engineResult?.script?.hook || '';
                          if (!scriptText) return null;
                          const lines = scriptText.split(/[.!?。！？\n]/).filter(l => l.trim());
                          const secPerLine = Math.max(3, Math.floor(30 / Math.max(lines.length, 1)));
                          let vtt = 'WEBVTT\n\n';
                          lines.forEach((line, i) => {
                            const start = i * secPerLine;
                            const end = start + secPerLine;
                            const fmt = (s) => {
                              const m = String(Math.floor(s / 60)).padStart(2, '0');
                              const sec = String(s % 60).padStart(2, '0');
                              return `00:${m}:${sec}.000`;
                            };
                            vtt += `${i + 1}\n${fmt(start)} --> ${fmt(end)}\n${line.trim()}\n\n`;
                          });
                          const blob = new Blob([vtt], { type: 'text/vtt' });
                          const url = URL.createObjectURL(blob);
                          return <track default kind="captions" srcLang="ko" src={url} label="Korean" />;
                        })()}
                      </video>
                      <div className="px-3 py-2 bg-gray-900/80 border-t border-gray-800 flex justify-between items-center gap-2">
                        <span className="text-[8px] text-gray-600">🎬 {job.provider.toUpperCase()} • {job.result?.duration || 5}s</span>
                        <a href={videoUrl} download className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-[9px] font-bold rounded-lg transition-colors flex items-center gap-1">
                          💾 MP4 다운로드
                        </a>
                      </div>
                    </div>
                  )}

                  {/* 자막 프리뷰 텍스트 (영상 없어도 표시) */}
                  {isComplete && !hasVideo && (copyData || engineResult) && (
                    <div className="m-3 p-3 bg-gray-900/50 border border-gray-800 rounded-lg">
                      <p className="text-[9px] text-gray-500 font-bold mb-1.5">📝 자막 프리뷰 (영상 생성 후 오버레이됨)</p>
                      <div className="bg-black/60 rounded p-2 max-h-24 overflow-y-auto">
                        {(copyData?.[0]?.body || engineResult?.script?.hook || '자막 데이터 없음').split(/[.!?。！？\n]/).filter(l => l.trim()).map((line, i) => (
                          <p key={i} className="text-[9px] text-white/80 py-0.5 border-b border-gray-800/30 last:border-0">
                            <span className="text-[7px] text-purple-500 mr-1.5 font-mono">{String(i + 1).padStart(2, '0')}</span>
                            {line.trim()}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

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
              <div className="mt-1 bg-black/30 p-2 rounded text-[10px] text-gray-500 italic">참고: 시청자에게 직접 말을 거는 자연스러운 경어체/해요체 (~기회예요, ~어떠세요?, ~확인해 보세요)</div>
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
