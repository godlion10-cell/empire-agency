'use client';
import { useState } from 'react';

const MODEL_ICONS = {
  'Gemini 2.5 Flash': { icon: '🧠', color: 'text-blue-400 bg-blue-900/30 border-blue-800/40' },
  'Gemini 1.5 Pro': { icon: '🧬', color: 'text-cyan-400 bg-cyan-900/30 border-cyan-800/40' },
  'Leonardo Kino XL': { icon: '🎨', color: 'text-purple-400 bg-purple-900/30 border-purple-800/40' },
  'Runway Gen-3': { icon: '🎬', color: 'text-pink-400 bg-pink-900/30 border-pink-800/40' },
  'Midjourney v6.1': { icon: '👑', color: 'text-amber-400 bg-amber-900/30 border-amber-800/40' },
  'ElevenLabs': { icon: '🔊', color: 'text-green-400 bg-green-900/30 border-green-800/40' },
  'Whisper': { icon: '👂', color: 'text-gray-400 bg-gray-800/30 border-gray-700/40' },
};

const EMOTION_COLORS = {
  'Pain Avoidance': 'text-red-400 bg-red-900/20 border-red-500/30',
  'FOMO': 'text-orange-400 bg-orange-900/20 border-orange-500/30',
  'Curiosity Gap': 'text-yellow-400 bg-yellow-900/20 border-yellow-500/30',
  'Social Proof': 'text-blue-400 bg-blue-900/20 border-blue-500/30',
  'Aspiration': 'text-emerald-400 bg-emerald-900/20 border-emerald-500/30',
  'Nostalgia': 'text-purple-400 bg-purple-900/20 border-purple-500/30',
  'General': 'text-gray-400 bg-gray-800/20 border-gray-600/30',
};

const STATUS_MAP = {
  'IDLE': { label: '대기', color: 'text-gray-500', dot: 'bg-gray-500' },
  'GEN_SCRIPT': { label: '대본 생성', color: 'text-blue-400', dot: 'bg-blue-400 animate-pulse' },
  'REVIEW_SCRIPT': { label: '대본 검토', color: 'text-yellow-400', dot: 'bg-yellow-400' },
  'GEN_VISUALS': { label: '비주얼 생성', color: 'text-purple-400', dot: 'bg-purple-400 animate-pulse' },
  'REVIEW_VISUALS': { label: '비주얼 검토', color: 'text-amber-400', dot: 'bg-amber-400' },
  'COMPLETE': { label: '완료', color: 'text-emerald-400', dot: 'bg-emerald-400' },
};

function getScoreColor(score) {
  if (score >= 80) return 'text-emerald-400';
  if (score >= 60) return 'text-yellow-400';
  if (score >= 40) return 'text-orange-400';
  return 'text-red-400';
}

function getScoreBar(score) {
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 60) return 'bg-yellow-500';
  if (score >= 40) return 'bg-orange-500';
  return 'bg-red-500';
}

export default function EnhancedSidebar({ projects = [], onSelect, onNew, onDelete, activeId }) {
  const [search, setSearch] = useState('');
  const [filterModel, setFilterModel] = useState('ALL');
  const [filterEmotion, setFilterEmotion] = useState('ALL');

  // 모든 프로젝트에서 사용된 모델/감정 추출
  const allModels = [...new Set(projects.flatMap(p => p.payload?.meta?.model_stack || []))];
  const allEmotions = [...new Set(projects.map(p => p.payload?.meta?.target_emotion).filter(Boolean))];

  // 필터링
  const filtered = projects.filter(p => {
    const meta = p.payload?.meta || {};
    const matchSearch = !search || p.title?.toLowerCase().includes(search.toLowerCase()) || meta.target_emotion?.toLowerCase().includes(search.toLowerCase());
    const matchModel = filterModel === 'ALL' || (meta.model_stack || []).includes(filterModel);
    const matchEmotion = filterEmotion === 'ALL' || meta.target_emotion === filterEmotion;
    return matchSearch && matchModel && matchEmotion;
  });

  // 퍼포먼스 스코어 계산 (예측 조회수 기반)
  const calcScore = (meta) => {
    if (!meta) return 0;
    const pv = meta.predicted_views || 0;
    const models = (meta.model_stack || []).length;
    const hasEmotion = meta.target_emotion ? 10 : 0;
    return Math.min(100, Math.round((pv / 100000) * 40 + models * 15 + hasEmotion));
  };

  return (
    <aside className="w-80 h-screen bg-gray-950 border-r border-gray-800 flex flex-col font-sans shrink-0">
      {/* Header */}
      <div className="p-5 bg-gradient-to-b from-gray-900 to-gray-950 border-b border-gray-800/50">
        <div className="flex justify-between items-center mb-3">
          <div>
            <h2 className="text-base font-black text-amber-500 tracking-tighter">EMPIRE INTELLIGENCE</h2>
            <p className="text-[9px] text-gray-600 mt-0.5">V2.5 · {projects.length} PROJECTS</p>
          </div>
          <button onClick={onNew} className="w-8 h-8 flex items-center justify-center bg-amber-600 hover:bg-amber-500 rounded-lg text-white text-lg font-bold transition-all shadow-lg shadow-amber-900/20">+</button>
        </div>

        {/* Search */}
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 프로젝트 검색..." className="w-full bg-gray-800/80 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:border-amber-600 focus:outline-none mb-2" />

        {/* Filters */}
        <div className="flex gap-1.5">
          <select value={filterModel} onChange={(e) => setFilterModel(e.target.value)} className="flex-1 bg-gray-800 border border-gray-700 rounded-md px-2 py-1 text-[9px] text-gray-400 focus:outline-none">
            <option value="ALL">모든 모델</option>
            {allModels.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select value={filterEmotion} onChange={(e) => setFilterEmotion(e.target.value)} className="flex-1 bg-gray-800 border border-gray-700 rounded-md px-2 py-1 text-[9px] text-gray-400 focus:outline-none">
            <option value="ALL">모든 감정</option>
            {allEmotions.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
      </div>

      {/* Project List */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <span className="text-3xl block mb-2">📂</span>
            <p className="text-xs text-gray-600">{search ? '검색 결과 없음' : '프로젝트가 없습니다'}</p>
          </div>
        ) : filtered.map((p) => {
          const meta = p.payload?.meta || {};
          const score = calcScore(meta);
          const status = STATUS_MAP[p.status] || STATUS_MAP['IDLE'];
          const isActive = p.id === activeId;

          return (
            <div key={p.id} onClick={() => onSelect?.(p.id)}
              className={`group p-3.5 rounded-xl border transition-all cursor-pointer ${isActive ? 'border-amber-500/60 bg-amber-900/10 shadow-lg shadow-amber-900/10' : 'border-gray-800 bg-gray-900/50 hover:border-gray-700 hover:bg-gray-900/80'}`}>

              {/* Title + PV */}
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${status.dot}`} />
                  <h3 className="text-[11px] font-bold text-gray-200 truncate">{p.title}</h3>
                </div>
                <span className="text-amber-500 text-[9px] font-mono font-bold shrink-0 ml-2">
                  {(meta.predicted_views || 0).toLocaleString()} PV
                </span>
              </div>

              {/* Model Badges */}
              {(meta.model_stack || []).length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {meta.model_stack.map(model => {
                    const m = MODEL_ICONS[model] || { icon: '⚙️', color: 'text-gray-400 bg-gray-800/30 border-gray-700/40' };
                    return (
                      <span key={model} className={`text-[8px] px-1.5 py-0.5 rounded border ${m.color} font-medium`}>
                        {m.icon} {model.split(' ').slice(-1)[0]}
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Score Bar + Emotion */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 flex-1">
                  {/* Performance Score */}
                  <div className="flex items-center gap-1.5 flex-1">
                    <div className="h-1 flex-1 bg-gray-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${getScoreBar(score)}`} style={{ width: `${score}%` }} />
                    </div>
                    <span className={`text-[9px] font-bold font-mono ${getScoreColor(score)}`}>{score}</span>
                  </div>
                  {/* Emotion */}
                  <span className={`text-[8px] px-1.5 py-0.5 rounded-full border whitespace-nowrap ${EMOTION_COLORS[meta.target_emotion] || EMOTION_COLORS['General']}`}>
                    {meta.target_emotion || 'General'}
                  </span>
                </div>
                {/* Delete */}
                <button onClick={(e) => { e.stopPropagation(); onDelete?.(p.id); }} className="opacity-0 group-hover:opacity-100 text-[9px] text-red-500 hover:text-red-400 ml-2 transition-opacity">🗑️</button>
              </div>

              {/* Status + Date */}
              <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-800/50">
                <span className={`text-[8px] font-medium ${status.color}`}>{status.label}</span>
                <span className="text-[8px] text-gray-700">{new Date(p.updatedAt || p.createdAt).toLocaleDateString('ko-KR')}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Stats */}
      <div className="p-3 border-t border-gray-800/50 bg-gray-900/30">
        <div className="flex justify-between text-[8px] text-gray-600">
          <span>완료: {projects.filter(p => p.status === 'COMPLETE').length}</span>
          <span>진행중: {projects.filter(p => p.status !== 'IDLE' && p.status !== 'COMPLETE').length}</span>
          <span>대기: {projects.filter(p => p.status === 'IDLE').length}</span>
        </div>
      </div>
    </aside>
  );
}
