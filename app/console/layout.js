'use client';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const STATUS_DOT = {
  'IDLE': 'bg-gray-500',
  'GEN_SCRIPT': 'bg-blue-400 animate-pulse',
  'REVIEW_SCRIPT': 'bg-yellow-400',
  'GEN_VISUALS': 'bg-purple-400 animate-pulse',
  'REVIEW_VISUALS': 'bg-amber-400',
  'COMPLETE': 'bg-emerald-400',
};

export default function ConsoleLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState(false);

  // 페이지 로드 시 프로젝트 목록 fetch
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await fetch('/api/projects');
        const data = await res.json();
        if (data.success) setProjects(data.projects || []);
      } catch (e) {
        console.log('⚠️ 프로젝트 로드 실패:', e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  // URL에서 현재 활성 프로젝트 ID 추출
  const activeId = pathname?.match(/\/console\/([^/]+)/)?.[1] || null;

  const filtered = projects.filter(p =>
    !search || p.title?.toLowerCase().includes(search.toLowerCase())
  );

  const handleNew = async () => {
    const name = prompt('프로젝트 이름:');
    if (!name) return;
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: name }),
      });
      const data = await res.json();
      if (data.success) {
        setProjects(prev => [data.project, ...prev]);
        router.push(`/console/${data.project.id}`);
      }
    } catch (e) {
      console.error('프로젝트 생성 실패:', e);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!confirm('이 프로젝트를 삭제할까요?')) return;
    await fetch(`/api/projects/${id}`, { method: 'DELETE' });
    setProjects(prev => prev.filter(p => p.id !== id));
    if (activeId === id) router.push('/console');
  };

  return (
    <div className="flex h-screen w-full bg-black text-white overflow-hidden">
      {/* ════ EMPIRE LOG — 고정 사이드바 ════ */}
      <aside className={`${collapsed ? 'w-14' : 'w-72'} h-screen bg-gray-950 border-r border-gray-800 flex flex-col shrink-0 transition-all duration-300`}>
        {/* Header */}
        <div className={`border-b border-gray-800/60 bg-gradient-to-b from-gray-900/80 to-gray-950 ${collapsed ? 'p-2' : 'p-4'}`}>
          <div className="flex items-center justify-between">
            {!collapsed && (
              <div>
                <h2 className="text-sm font-black text-amber-500 tracking-tighter">EMPIRE LOG</h2>
                <p className="text-[8px] text-gray-600 mt-0.5">{projects.length} projects</p>
              </div>
            )}
            <button onClick={() => setCollapsed(!collapsed)} className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-white rounded transition-colors text-xs">
              {collapsed ? '▶' : '◀'}
            </button>
          </div>

          {!collapsed && (
            <div className="mt-3 flex gap-1.5">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="🔍 검색..."
                className="flex-1 bg-gray-800/80 border border-gray-700 rounded-md px-2.5 py-1.5 text-[10px] text-white placeholder-gray-500 focus:border-amber-600 focus:outline-none"
              />
              <button onClick={handleNew} className="w-7 h-7 flex items-center justify-center bg-amber-600 hover:bg-amber-500 rounded-md text-white text-sm font-bold transition-colors shadow-lg shadow-amber-900/20">+</button>
            </div>
          )}
          {collapsed && (
            <button onClick={handleNew} className="w-full mt-2 h-7 flex items-center justify-center bg-amber-600 hover:bg-amber-500 rounded-md text-white text-xs font-bold transition-colors">+</button>
          )}
        </div>

        {/* Project List */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
          {loading ? (
            <div className="flex flex-col items-center py-8">
              <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              {!collapsed && <p className="text-[9px] text-gray-600 mt-2">로딩 중...</p>}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8">
              {!collapsed && <>
                <span className="text-2xl block mb-1">📂</span>
                <p className="text-[9px] text-gray-600">{search ? '검색 결과 없음' : '프로젝트 없음'}</p>
                <button onClick={handleNew} className="mt-2 text-[9px] text-amber-500 hover:text-amber-400">+ 새 프로젝트</button>
              </>}
            </div>
          ) : filtered.map(p => {
            const isActive = p.id === activeId;
            const meta = p.payload?.meta || {};
            const dot = STATUS_DOT[p.status] || 'bg-gray-500';

            return (
              <div
                key={p.id}
                onClick={() => router.push(`/console/${p.id}`)}
                className={`group rounded-lg border cursor-pointer transition-all ${collapsed ? 'p-1.5' : 'p-2.5'} ${
                  isActive
                    ? 'border-amber-500/50 bg-amber-900/15 shadow-md shadow-amber-900/10'
                    : 'border-transparent hover:border-gray-700 hover:bg-gray-900/60'
                }`}
              >
                {collapsed ? (
                  /* 접힌 상태: 점만 표시 */
                  <div className="flex justify-center">
                    <span className={`w-2.5 h-2.5 rounded-full ${dot}`} title={p.title} />
                  </div>
                ) : (
                  /* 펼친 상태: 풀 카드 */
                  <>
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
                        <span className="text-[10px] font-bold text-gray-200 truncate">{p.title}</span>
                      </div>
                      <button onClick={(e) => handleDelete(p.id, e)} className="text-[8px] text-red-500/0 group-hover:text-red-500/70 hover:text-red-400 transition-all">🗑️</button>
                    </div>
                    {/* Meta: PV + Models */}
                    {(meta.predicted_views || meta.model_stack?.length > 0) && (
                      <div className="flex items-center justify-between mt-1">
                        <div className="flex gap-0.5 flex-wrap">
                          {(meta.model_stack || []).slice(0, 3).map(m => (
                            <span key={m} className="text-[7px] px-1 py-0 rounded bg-gray-800 text-gray-500 border border-gray-700/50">
                              {m.split(' ').slice(-1)[0]}
                            </span>
                          ))}
                        </div>
                        {meta.predicted_views > 0 && (
                          <span className="text-[8px] text-amber-500/70 font-mono">{(meta.predicted_views || 0).toLocaleString()} PV</span>
                        )}
                      </div>
                    )}
                    <div className="flex justify-between items-center mt-1.5 text-[7px] text-gray-700">
                      <span>{p.status}</span>
                      <span>{new Date(p.updatedAt || p.createdAt).toLocaleDateString('ko-KR')}</span>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        {!collapsed && (
          <div className="p-2 border-t border-gray-800/40 bg-gray-900/20">
            <div className="flex justify-between text-[7px] text-gray-600">
              <span>✅ {projects.filter(p => p.status === 'COMPLETE').length}</span>
              <span>⏳ {projects.filter(p => !['IDLE', 'COMPLETE'].includes(p.status)).length}</span>
              <span>💤 {projects.filter(p => p.status === 'IDLE').length}</span>
            </div>
          </div>
        )}
      </aside>

      {/* ════ 메인 대시보드 ════ */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
