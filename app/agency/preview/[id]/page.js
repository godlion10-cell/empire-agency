'use client';
import { useState } from 'react';
import { useParams } from 'next/navigation';

/**
 * 🔒 비밀 시사회실 — Empire Studio Client Preview Room
 * 
 * 워터마크 보호된 프리뷰를 고객에게 보여주고,
 * 승인(Confirm) 시에만 원본을 제공하는 보안 시사실.
 */
export default function ShadowRoom() {
  const params = useParams();
  const campaignId = params.id;
  const [status, setStatus] = useState('pending'); // 'pending' | 'approved' | 'rejected'
  const [comment, setComment] = useState('');

  const handleContextMenu = (e) => {
    e.preventDefault();
    alert("🔒 보안 정책에 의해 다운로드가 제한되어 있습니다. 최종 승인 후 원본을 제공합니다.");
  };

  const handleApprove = () => {
    setStatus('approved');
  };

  const handleReject = () => {
    if (!comment.trim()) {
      alert('수정 요청 사항을 입력해주세요.');
      return;
    }
    setStatus('rejected');
  };

  return (
    <div
      className="min-h-screen bg-black text-gray-200 flex flex-col items-center py-12 px-4"
      onContextMenu={handleContextMenu}
    >
      {/* 헤더 */}
      <div className="w-full max-w-4xl mb-8 text-center">
        <h1 className="text-3xl font-bold text-amber-500 tracking-widest">EMPIRE STUDIO</h1>
        <p className="text-gray-400 mt-2">🔒 비밀 시사회실 (캠페인 ID: {campaignId})</p>
      </div>

      {/* 워터마크 영상 플레이어 */}
      <div className="w-full max-w-4xl mb-8">
        <div
          className="relative bg-gray-900 rounded-xl overflow-hidden border border-gray-800"
          style={{ aspectRatio: '16/9' }}
        >
          {/* 워터마크 오버레이 */}
          <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
            <p
              className="text-white/10 font-black select-none"
              style={{
                fontSize: 'clamp(24px, 6vw, 80px)',
                letterSpacing: '0.3em',
                transform: 'rotate(-30deg)',
                userSelect: 'none',
                WebkitUserSelect: 'none',
              }}
            >
              PREVIEW ONLY
            </p>
          </div>

          {/* 플레이어 영역 */}
          <div className="absolute inset-0 flex items-center justify-center text-gray-500 z-0">
            <div className="text-center">
              <p className="text-5xl mb-4">▶</p>
              <p className="text-sm">영상 프리뷰가 여기에 표시됩니다</p>
              <p className="text-xs text-gray-600 mt-1">워터마크 적용 · 다운로드 제한됨</p>
            </div>
          </div>
        </div>
      </div>

      {/* 승인/수정 요청 */}
      <div className="w-full max-w-4xl">
        {status === 'pending' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={handleApprove}
                className="py-4 rounded-xl font-bold text-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-lg shadow-emerald-900/30"
              >
                ✅ 최종 승인 (원본 요청)
              </button>
              <button
                onClick={handleReject}
                className="py-4 rounded-xl font-bold text-lg bg-red-600/80 hover:bg-red-600 text-white transition-all shadow-lg shadow-red-900/30"
              >
                ❌ 수정 요청
              </button>
            </div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="수정 요청 시 상세 내용을 입력하세요..."
              className="w-full p-4 bg-gray-900 border border-gray-800 rounded-xl text-sm text-gray-300 placeholder-gray-600 focus:border-amber-500 focus:outline-none resize-none"
              rows={3}
            />
          </div>
        )}

        {status === 'approved' && (
          <div className="text-center py-8 bg-emerald-950/30 border border-emerald-800/30 rounded-xl">
            <p className="text-4xl mb-3">✅</p>
            <p className="text-emerald-400 font-bold text-lg">승인 완료</p>
            <p className="text-gray-400 text-sm mt-2">원본 파일 다운로드 링크가 이메일로 발송됩니다.</p>
          </div>
        )}

        {status === 'rejected' && (
          <div className="text-center py-8 bg-red-950/30 border border-red-800/30 rounded-xl">
            <p className="text-4xl mb-3">📝</p>
            <p className="text-red-400 font-bold text-lg">수정 요청 접수됨</p>
            <p className="text-gray-400 text-sm mt-2">요청: &quot;{comment}&quot;</p>
            <p className="text-gray-500 text-xs mt-1">담당자가 확인 후 수정본을 재전송합니다.</p>
          </div>
        )}
      </div>

      {/* 보안 안내 */}
      <footer className="mt-12 text-center text-xs text-gray-600">
        <p>이 페이지는 보안 세션으로 보호됩니다.</p>
        <p className="mt-1">EMPIRE STUDIO — SECURE CLIENT PREVIEW ROOM</p>
      </footer>
    </div>
  );
}
