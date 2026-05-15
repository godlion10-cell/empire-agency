'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

const STAGES = {
  IDLE: { idx: 0, label: '대기', icon: '⏸️' },
  GEN_SCRIPT: { idx: 1, label: '대본 생성', icon: '🧠' },
  REVIEW_SCRIPT: { idx: 2, label: '대본 검토', icon: '✏️' },
  GEN_VISUALS: { idx: 3, label: '비주얼 생성', icon: '🎨' },
  REVIEW_VISUALS: { idx: 4, label: '비주얼 검토', icon: '👁️' },
  COMPLETE: { idx: 5, label: '완료', icon: '✅' },
};
const STAGE_ORDER = ['IDLE', 'GEN_SCRIPT', 'REVIEW_SCRIPT', 'GEN_VISUALS', 'REVIEW_VISUALS', 'COMPLETE'];

export default function ProjectPipeline() {
  const { id } = useParams();
  const router = useRouter();
  const [project, setProject] = useState(null);
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stageLoading, setStageLoading] = useState(null);
  const [toast, setToast] = useState(null);
  const [editScript, setEditScript] = useState('');
  const [editVisualPrompt, setEditVisualPrompt] = useState('');
  const saveTimer = useRef(null);

  const showToast = (msg, dur = 3000) => { setToast(msg); setTimeout(() => setToast(null), dur); };

  // ── Load from DB ──
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/projects/${id}`);
        const data = await res.json();
        if (!data.success) { router.push('/console'); return; }
        setProject(data.project);
        const p = data.project.payload || {};
        setPayload(p);
        if (p.stageData?.script?.edited) {
          setEditScript(typeof p.stageData.script.edited === 'string' ? p.stageData.script.edited : JSON.stringify(p.stageData.script.edited, null, 2));
        }
        if (p.stageData?.visuals?.editedPrompt) setEditVisualPrompt(p.stageData.visuals.editedPrompt);
        else if (p.stageData?.visuals?.prompt) setEditVisualPrompt(p.stageData.visuals.prompt);
      } catch { router.push('/console'); }
      setLoading(false);
    })();
  }, [id, router]);

  // ── Save to DB (debounced) ──
  const saveToDb = useCallback(async (newPayload, newStatus) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        const body = { payload: newPayload };
        if (newStatus) body.status = newStatus;
        await fetch(`/api/projects/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } catch (e) { console.error('Save failed:', e); }
    }, 500);
  }, [id]);

  // ── Update helper ──
  const update = useCallback((payloadUpdates, newStatus) => {
    const merged = { ...payload, ...payloadUpdates };
    setPayload(merged);
    if (newStatus) setProject(prev => ({ ...prev, status: newStatus }));
    saveToDb(merged, newStatus);
  }, [payload, saveToDb]);

  // ── Add history entry ──
  const addHist = (stage, action) => {
    const h = [...(payload?.history || []), { stage, action, ts: new Date().toISOString() }].slice(-50);
    return h;
  };

  // ══════ STAGE 1: GEN_SCRIPT ══════
  const runGenScript = async () => {
    if (stageLoading) return;
    setStageLoading('GEN_SCRIPT');
    showToast('🧠 DNA 추출 중...');
    update({ history: addHist('GEN_SCRIPT', 'start') }, 'GEN_SCRIPT');
    try {
      const inp = payload.input || {};
      const formData = new FormData();
      formData.append('type', 'URL');
      formData.append('url', inp.url);
      if (inp.videoTitle) formData.append('videoTitle', inp.videoTitle);
      if (inp.channelName) formData.append('channelName', inp.channelName);

      const res = await fetch('/api/engine/global-processor', { method: 'POST', body: formData });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      const scriptJson = JSON.stringify(data.data, null, 2);
      setEditScript(scriptJson);
      setEditVisualPrompt(data.data.korean_adaptation?.visual_prompt || '');
      update({
        stageData: {
          ...payload.stageData,
          script: { raw: data.data, edited: scriptJson, committed: false },
          visuals: { ...(payload.stageData?.visuals || {}), prompt: data.data.korean_adaptation?.visual_prompt || '' },
        },
        history: addHist('GEN_SCRIPT', 'complete'),
      }, 'REVIEW_SCRIPT');
      showToast('✅ DNA 추출 완료!');

      if (payload.autoStages?.GEN_SCRIPT) setTimeout(() => commitScript(), 500);
    } catch (e) {
      showToast(`❌ 실패: ${e.message}`, 5000);
      update({ history: addHist('GEN_SCRIPT', `error: ${e.message}`) }, 'IDLE');
    } finally { setStageLoading(null); }
  };

  const commitScript = () => {
    let parsed; try { parsed = JSON.parse(editScript); } catch { parsed = editScript; }
    update({
      stageData: { ...payload.stageData, script: { ...payload.stageData.script, edited: parsed, committed: true } },
      history: addHist('REVIEW_SCRIPT', 'committed'),
    }, 'REVIEW_SCRIPT');
    showToast('✅ 대본 확정');
    if (payload.autoStages?.REVIEW_SCRIPT) setTimeout(() => runGenVisuals(), 500);
  };

  // ══════ STAGE 2: GEN_VISUALS ══════
  const runGenVisuals = async () => {
    if (stageLoading) return;
    setStageLoading('GEN_VISUALS');
    showToast('🎨 VVIP 비주얼 생성 중...');
    update({ history: addHist('GEN_VISUALS', 'start') }, 'GEN_VISUALS');
    try {
      const prompt = editVisualPrompt || payload.stageData?.visuals?.prompt;
      const res = await fetch('/api/engine/auto-visual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseVisualPrompt: prompt, aspectRatio: '9:16' }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      update({
        stageData: {
          ...payload.stageData,
          visuals: { ...(payload.stageData?.visuals || {}), editedPrompt: prompt, imageUrl: data.data.imageUrl, generationId: data.data.generationId, committed: false },
        },
        history: addHist('GEN_VISUALS', 'complete'),
      }, 'REVIEW_VISUALS');
      showToast('✅ 비주얼 생성 완료!');
      if (payload.autoStages?.GEN_VISUALS) setTimeout(() => commitVisuals(), 500);
    } catch (e) {
      showToast(`❌ 실패: ${e.message}`, 5000);
      update({ history: addHist('GEN_VISUALS', `error: ${e.message}`) }, 'REVIEW_SCRIPT');
    } finally { setStageLoading(null); }
  };

  const commitVisuals = () => {
    update({
      stageData: { ...payload.stageData, visuals: { ...payload.stageData.visuals, committed: true } },
      history: addHist('COMPLETE', 'pipeline_done'),
    }, 'COMPLETE');
    showToast('🎉 파이프라인 완료!');
  };

  // ══════ RENDER ══════
  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-white"><span className="animate-pulse text-lg">로딩 중...</span></div>;
  if (!project || !payload) return null;

  const status = project.status || 'IDLE';
  const currentIdx = STAGES[status]?.idx || 0;
  const sd = payload.stageData || {};
  const scriptData = sd.script || {};
  const visualData = sd.visuals || {};

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-black text-white">
      {toast && <div className="fixed top-4 right-4 z-50 bg-gray-900 border border-purple-500 px-6 py-3 rounded-lg shadow-2xl text-sm animate-pulse">{toast}</div>}

      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/console" className="text-gray-500 hover:text-white text-sm">← 콘솔</Link>
          <div>
            <h1 className="text-lg font-bold">{project.title}</h1>
            <p className="text-[10px] text-gray-600">{STAGES[status]?.icon} {STAGES[status]?.label} · DB synced</p>
          </div>
        </div>
        <button onClick={() => {
          const all = !payload.isAuto;
          const auto = {}; STAGE_ORDER.forEach(s => auto[s] = all);
          update({ isAuto: all, autoStages: auto });
        }} className={`px-4 py-1.5 rounded-lg text-xs font-bold ${payload.isAuto ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}>
          {payload.isAuto ? '🤖 완전 자동화' : '🖐️ 단계별 개입'}
        </button>
      </header>

      {/* Progress Bar */}
      <div className="px-6 py-4 border-b border-gray-800/50">
        <div className="flex items-center gap-1">
          {STAGE_ORDER.map((stg, i) => {
            const s = STAGES[stg]; const done = i < currentIdx; const active = i === currentIdx;
            return (<div key={stg} className="flex items-center flex-1">
              <div className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-bold w-full justify-center ${done ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-800/40' : active ? 'bg-purple-900/40 text-purple-300 border border-purple-500' : 'bg-gray-900/30 text-gray-600 border border-gray-800'}`}>
                <span>{s.icon}</span><span className="hidden md:inline">{s.label}</span>
              </div>
              {i < 5 && <div className={`w-3 h-[2px] mx-0.5 ${done ? 'bg-emerald-700' : 'bg-gray-800'}`} />}
            </div>);
          })}
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* STAGE 0: INPUT */}
        <section className="p-5 rounded-xl border border-gray-700 bg-gray-800/30">
          <h2 className="font-bold text-sm mb-4">⏸️ Stage 0 — 입력</h2>
          <input value={payload.input?.url || ''} onChange={(e) => update({ input: { ...payload.input, url: e.target.value } })} placeholder="YouTube URL" className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-sm focus:border-purple-500 focus:outline-none mb-2" disabled={status !== 'IDLE'} />
          <div className="flex gap-2 mb-3">
            <input value={payload.input?.videoTitle || ''} onChange={(e) => update({ input: { ...payload.input, videoTitle: e.target.value } })} placeholder="영상 제목 (선택)" className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs focus:outline-none" disabled={status !== 'IDLE'} />
            <input value={payload.input?.channelName || ''} onChange={(e) => update({ input: { ...payload.input, channelName: e.target.value } })} placeholder="채널명" className="w-40 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs focus:outline-none" disabled={status !== 'IDLE'} />
          </div>
          {status === 'IDLE' && <button onClick={runGenScript} disabled={!payload.input?.url || stageLoading} className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:opacity-40 py-3 rounded-lg font-bold text-sm">🚀 파이프라인 시작</button>}
        </section>

        {/* STAGE 1-2: SCRIPT */}
        {currentIdx >= 1 && (
          <section className={`p-5 rounded-xl border ${currentIdx <= 2 ? 'border-yellow-600 bg-yellow-900/10' : 'border-emerald-800/30 bg-emerald-900/10'}`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-sm">🧠 Stage 1-2 — 대본</h2>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" checked={payload.autoStages?.GEN_SCRIPT || false} onChange={() => { const a = { ...payload.autoStages, GEN_SCRIPT: !payload.autoStages?.GEN_SCRIPT }; update({ autoStages: a }); }} className="accent-blue-500 w-3 h-3" /><span className="text-[9px] text-gray-500">Auto</span></label>
                <span className={`text-[9px] px-2 py-0.5 rounded font-bold ${stageLoading === 'GEN_SCRIPT' ? 'bg-blue-600 text-white animate-pulse' : scriptData.committed ? 'bg-emerald-900/40 text-emerald-400' : 'bg-yellow-900/40 text-yellow-400'}`}>
                  {stageLoading === 'GEN_SCRIPT' ? '생성 중...' : scriptData.committed ? '✓ 확정' : '검토 대기'}
                </span>
              </div>
            </div>
            {scriptData.raw && (
              <>
                {scriptData.raw.main_topic && <div className="flex items-center gap-2 p-2 bg-black/30 rounded-lg mb-3"><span className="text-[9px] text-emerald-500 font-bold">🎯</span><span className="text-[11px] text-white font-semibold">{scriptData.raw.main_topic}</span></div>}
                <textarea value={editScript} onChange={(e) => setEditScript(e.target.value)} disabled={scriptData.committed} rows={14} className="w-full bg-black/50 border border-gray-700 rounded-lg px-4 py-3 text-xs font-mono text-gray-300 focus:border-purple-500 focus:outline-none resize-y disabled:opacity-60" />
                <div className="flex gap-2 mt-3">
                  <button onClick={runGenScript} disabled={stageLoading} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 rounded-lg text-xs font-bold">🔄 재생성</button>
                  {!scriptData.committed && <button onClick={commitScript} className="px-6 py-2 bg-gradient-to-r from-yellow-600 to-amber-600 rounded-lg text-xs font-bold text-black">✅ 확정 → 다음</button>}
                </div>
              </>
            )}
            {stageLoading === 'GEN_SCRIPT' && <div className="py-12 text-center"><span className="text-4xl animate-bounce block mb-3">🧠</span><p className="text-sm text-gray-400 animate-pulse">Gemini DNA 추출 중...</p></div>}
          </section>
        )}

        {/* STAGE 3-4: VISUALS */}
        {currentIdx >= 3 && (
          <section className={`p-5 rounded-xl border ${currentIdx <= 4 ? 'border-purple-600 bg-purple-900/10' : 'border-emerald-800/30 bg-emerald-900/10'}`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-sm">🎨 Stage 3-4 — 비주얼</h2>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" checked={payload.autoStages?.GEN_VISUALS || false} onChange={() => { const a = { ...payload.autoStages, GEN_VISUALS: !payload.autoStages?.GEN_VISUALS }; update({ autoStages: a }); }} className="accent-purple-500 w-3 h-3" /><span className="text-[9px] text-gray-500">Auto</span></label>
                <span className={`text-[9px] px-2 py-0.5 rounded font-bold ${stageLoading === 'GEN_VISUALS' ? 'bg-purple-600 text-white animate-pulse' : visualData.committed ? 'bg-emerald-900/40 text-emerald-400' : 'bg-amber-900/40 text-amber-400'}`}>
                  {stageLoading === 'GEN_VISUALS' ? '생성 중...' : visualData.committed ? '✓ 확정' : '검토 대기'}
                </span>
              </div>
            </div>
            <textarea value={editVisualPrompt} onChange={(e) => setEditVisualPrompt(e.target.value)} disabled={visualData.committed} rows={3} className="w-full bg-black/50 border border-gray-700 rounded-lg px-4 py-3 text-xs font-mono text-blue-200 focus:border-purple-500 focus:outline-none resize-y disabled:opacity-60 mb-3" />
            {visualData.imageUrl && <div className="mb-4 p-4 bg-black/40 rounded-lg border border-purple-500/30 text-center"><img src={visualData.imageUrl} alt="VVIP" className="max-w-sm mx-auto rounded-lg shadow-2xl border border-gray-700" /><a href={visualData.imageUrl} target="_blank" rel="noopener noreferrer" className="text-[9px] text-blue-400 underline mt-2 inline-block">다운로드 ↗</a></div>}
            {stageLoading === 'GEN_VISUALS' && <div className="py-12 text-center"><span className="text-4xl animate-bounce block mb-3">🎨</span><p className="text-sm text-gray-400 animate-pulse">Leonardo.ai 생성 중...</p></div>}
            <div className="flex gap-2">
              <button onClick={runGenVisuals} disabled={stageLoading} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 rounded-lg text-xs font-bold">🔄 재생성</button>
              {visualData.imageUrl && !visualData.committed && <button onClick={commitVisuals} className="px-6 py-2 bg-gradient-to-r from-emerald-600 to-green-600 rounded-lg text-xs font-bold text-white">✅ 확정 → 완료</button>}
            </div>
          </section>
        )}

        {/* STAGE 5: COMPLETE */}
        {status === 'COMPLETE' && (
          <section className="p-6 rounded-xl border border-emerald-600 bg-emerald-900/20">
            <h2 className="font-bold text-lg text-emerald-400 mb-4">🎉 파이프라인 완료!</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="p-4 bg-black/30 rounded-lg"><p className="text-[9px] text-gray-500 mb-1 font-bold">🧠 대본</p><pre className="text-[10px] text-gray-400 font-mono max-h-40 overflow-auto whitespace-pre-wrap">{(typeof scriptData.edited === 'string' ? scriptData.edited : JSON.stringify(scriptData.edited, null, 2) || '').substring(0, 600)}...</pre></div>
              <div className="p-4 bg-black/30 rounded-lg text-center"><p className="text-[9px] text-gray-500 mb-2 font-bold">🎨 비주얼</p>{visualData.imageUrl && <img src={visualData.imageUrl} alt="Final" className="max-w-[200px] mx-auto rounded-lg border border-gray-700" />}</div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => update({ stageData: { script: { raw: null, edited: null, committed: false }, visuals: { prompt: '', editedPrompt: '', imageUrl: '', generationId: '', committed: false } }, history: addHist('IDLE', 'reset') }, 'IDLE')} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs font-bold">🔄 처음부터</button>
              <Link href="/console" className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs font-bold">← 콘솔</Link>
            </div>
          </section>
        )}

        {/* History */}
        {payload.history?.length > 0 && (
          <section className="p-4 rounded-xl border border-gray-800 bg-gray-900/30">
            <h3 className="text-xs text-gray-500 font-bold mb-3">📜 히스토리 ({payload.history.length}건)</h3>
            <div className="space-y-1">{payload.history.slice(-10).reverse().map((h, i) => (
              <div key={i} className="flex items-center gap-2 text-[9px] text-gray-600"><span>{STAGES[h.stage]?.icon || '📌'}</span><span className="text-gray-500">{new Date(h.ts).toLocaleTimeString('ko-KR')}</span><span className="text-gray-400">{h.action}</span></div>
            ))}</div>
          </section>
        )}
      </div>
    </div>
  );
}
