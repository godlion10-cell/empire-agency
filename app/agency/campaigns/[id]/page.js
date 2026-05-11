'use client';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function CampaignRoom() {
  const params = useParams();
  const campaignId = params.id;

  const [renderMode, setRenderMode] = useState('U'); // 'U': 유(실사), 'M': 무(컨셉)
  const [isRendering, setIsRendering] = useState(false);
  const [renderResult, setRenderResult] = useState(null);

  // 카피 생성 상태
  const [copyLoading, setCopyLoading] = useState(false);
  const [adCopies, setAdCopies] = useState(null);

  // 에셋 관리
  const [assets, setAssets] = useState([]);

  // 1호기(렌더링 엔진) 호출 로직
  const handleRenderStart = async () => {
    setIsRendering(true);
    setRenderResult(null);
    try {
      const response = await fetch('/api/render-engine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: renderMode,
          script: "프리미엄 라이프의 시작, 더파크 비스타동원. 도심 속 자연과 함께하는 완벽한 일상.",
          videoPrompts: [
            "Cinematic drone shot sweeping over luxury apartment complex at golden hour, lens flare, 4K resolution",
            "Slow motion walking through modern minimalist lobby with marble floors, warm ambient lighting",
            "Aerial view of infinity pool overlooking city skyline at sunset, volumetric clouds"
          ],
          clientImage: renderMode === 'U' ? "https://client-domain.com/modelhouse.jpg" : null
        })
      });
      const data = await response.json();
      if (data.success) {
        setRenderResult(data.data);
        setAssets(prev => [...prev, {
          type: 'render',
          timestamp: new Date().toLocaleString('ko-KR'),
          mode: renderMode,
          data: data.data,
        }]);
      } else {
        alert(`❌ 렌더링 실패: ${data.error}`);
      }
    } catch (error) {
      alert("❌ 렌더링 엔진 연결 실패: " + error.message);
    }
    setIsRendering(false);
  };

  // 광고 카피 생성
  const handleGenerateCopy = async () => {
    setCopyLoading(true);
    try {
      const response = await fetch('/api/ad-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: '더파크 비스타동원',
          usps: ['한강 조망', '프리미엄 인테리어', '역세권 5분'],
          targetAudience: '30-50대 고소득 전문직',
        })
      });
      const data = await response.json();
      if (data.success) {
        setAdCopies(data.data);
        setAssets(prev => [...prev, {
          type: 'adcopy',
          timestamp: new Date().toLocaleString('ko-KR'),
          data: data.data,
        }]);
      } else {
        alert(`❌ 카피 생성 실패: ${data.error}`);
      }
    } catch (error) {
      alert("❌ 카피 엔진 연결 실패: " + error.message);
    }
    setCopyLoading(false);
  };

  return (
    <div className="p-6 md:p-8 bg-gray-950 min-h-screen text-gray-200">
      {/* 헤더 */}
      <div className="mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">CAMPAIGN WORKSPACE</p>
          <h1 className="text-xl md:text-2xl font-bold text-white">📁 {campaignId}</h1>
        </div>
        <Link href="/" className="text-gray-400 hover:text-white transition-colors text-sm">
          ← 대시보드로 돌아가기
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ============================== */}
        {/* 왼쪽: 전략 세팅 + 카피 생성 */}
        {/* ============================== */}
        <div className="space-y-6">
          {/* 렌더링 전략 스위치 */}
          <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
            <h2 className="text-lg font-bold text-amber-500 mb-4">⚙️ 렌더링 전략 스위치</h2>

            <div className="flex bg-black rounded-xl p-1 mb-6 border border-gray-700">
              <button
                onClick={() => setRenderMode('U')}
                className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all ${
                  renderMode === 'U'
                    ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/40'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                📸 [有] 실사 보정 모드
                <span className="block text-xs mt-0.5 opacity-70">Image → Video</span>
              </button>
              <button
                onClick={() => setRenderMode('M')}
                className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all ${
                  renderMode === 'M'
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/40'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                ✨ [無] 컨셉 아트 모드
                <span className="block text-xs mt-0.5 opacity-70">Text → Video</span>
              </button>
            </div>

            <div className="mb-6 p-4 rounded-lg bg-gray-800/50 border border-gray-700/50">
              <p className="text-sm text-gray-300 leading-relaxed">
                {renderMode === 'U'
                  ? "💡 고객이 제공한 모델하우스 사진을 기반으로 사실성을 유지하며 렌더링합니다. Runway Image-to-Video API를 사용합니다."
                  : "💡 텍스트 프롬프트만으로 현실에 없는 하이엔드 컨셉 영상을 창조합니다. Runway Text-to-Video API를 사용합니다."}
              </p>
              <div className="mt-3 flex gap-2">
                <span className={`text-xs px-2 py-0.5 rounded ${renderMode === 'U' ? 'bg-amber-900/50 text-amber-300' : 'bg-purple-900/50 text-purple-300'}`}>
                  {renderMode === 'U' ? '유료 API 중심' : '비용 절감 중심'}
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300">
                  ElevenLabs TTS 포함
                </span>
              </div>
            </div>

            <button
              onClick={handleRenderStart}
              disabled={isRendering}
              className={`w-full py-3.5 rounded-xl font-bold text-lg transition-all ${
                isRendering
                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-lg shadow-blue-900/40'
              }`}
            >
              {isRendering ? '⏳ 제국 엔진 가동 중...' : '🚀 캠페인 렌더링 시작'}
            </button>

            {/* 렌더 결과 */}
            {renderResult && (
              <div className="mt-4 p-4 rounded-lg bg-emerald-950/30 border border-emerald-800/30">
                <p className="text-xs text-emerald-400 font-bold mb-2">✅ 렌더링 완료</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="text-gray-400">🔊 Audio: <span className="text-white">{renderResult.audio?.source || 'N/A'}</span></div>
                  <div className="text-gray-400">🎬 Videos: <span className="text-white">{renderResult.videos?.length || 0} cuts</span></div>
                  <div className="text-gray-400">📝 Subtitles: <span className="text-white">{renderResult.subtitles?.lines?.length || 0} lines</span></div>
                  <div className="text-gray-400">🏷️ Status: <span className="text-amber-400">{renderResult.renderStatus}</span></div>
                </div>
                {renderResult.audio?.dataUrl && (
                  <audio src={renderResult.audio.dataUrl} controls className="w-full mt-3 rounded" />
                )}
              </div>
            )}
          </div>

          {/* 광고 카피 생성 */}
          <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
            <h2 className="text-lg font-bold text-purple-400 mb-4">✍️ AI 광고 카피 생성</h2>
            <p className="text-sm text-gray-400 mb-4">GPT-4o-mini가 Facebook/Instagram 광고 카피 3종을 자동 생성합니다.</p>
            <button
              onClick={handleGenerateCopy}
              disabled={copyLoading}
              className={`w-full py-3 rounded-xl font-bold transition-all ${
                copyLoading
                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-900/30'
              }`}
            >
              {copyLoading ? '⏳ 카피라이터 AI 작업 중...' : '✍️ 광고 카피 3종 생성'}
            </button>

            {/* 카피 결과 */}
            {adCopies && (
              <div className="mt-4 space-y-3">
                {adCopies.map((copy, i) => (
                  <div key={i} className="p-4 rounded-lg bg-gray-800/50 border border-gray-700/50">
                    <p className="text-xs text-purple-400 font-bold mb-1">VARIATION {i + 1}</p>
                    <p className="text-white font-bold text-sm">{copy.headline}</p>
                    <p className="text-gray-300 text-xs mt-1 leading-relaxed">{copy.body}</p>
                    <p className="text-cyan-400 text-xs mt-2 font-medium">{copy.cta}</p>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${copy.headline}\n${copy.body}\n${copy.cta}`);
                      }}
                      className="mt-2 text-xs text-gray-500 hover:text-white transition-colors"
                    >
                      📋 복사
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ============================== */}
        {/* 오른쪽: 에셋 보관함 */}
        {/* ============================== */}
        <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
          <h2 className="text-lg font-bold text-emerald-400 mb-4">📦 에셋 보관함 (Asset Vault)</h2>

          {assets.length === 0 ? (
            <div className="border border-dashed border-gray-700 rounded-xl p-12 text-center text-gray-500">
              <p className="text-3xl mb-3">📁</p>
              <p>아직 생성된 결과물이 없습니다.</p>
              <p className="text-xs mt-1">왼쪽에서 렌더링 또는 카피 생성을 시작해 주세요.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
              {assets.map((asset, i) => (
                <div key={i} className="p-4 rounded-lg bg-gray-800/50 border border-gray-700/50 hover:border-gray-600/50 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                      asset.type === 'render'
                        ? 'bg-cyan-900/50 text-cyan-300'
                        : 'bg-purple-900/50 text-purple-300'
                    }`}>
                      {asset.type === 'render' ? '🎬 Render' : '✍️ Ad Copy'}
                    </span>
                    <span className="text-xs text-gray-500">{asset.timestamp}</span>
                  </div>
                  {asset.type === 'render' ? (
                    <div className="text-xs text-gray-400">
                      <p>Mode: {asset.mode === 'U' ? '📸 실사(유)' : '✨ 컨셉(무)'}</p>
                      <p>Videos: {asset.data?.videos?.length || 0} cuts</p>
                      <p>Status: <span className="text-amber-400">{asset.data?.renderStatus}</span></p>
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400">
                      <p>{asset.data?.length || 0}종 카피 생성됨</p>
                      {asset.data?.[0] && (
                        <p className="text-white mt-1 font-medium truncate">{asset.data[0].headline}</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 하단 */}
      <footer className="mt-8 text-center text-xs text-gray-600">
        EMPIRE AGENCY CAMPAIGN ROOM — Connected to 1호기 Render Engine
      </footer>
    </div>
  );
}
