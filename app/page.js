import Link from 'next/link';

export default function AgencyDashboard() {
  // 예시 데이터: 데이터베이스에서 불러올 클라이언트 목록
  const campaigns = [
    { id: 'camp_001', client: '더파크 비스타동원', status: '진행중', budget: '₩500,000', roi: '320%' },
    { id: 'camp_002', client: '해운대 엘시티 레지던스', status: '대기중', budget: '₩1,200,000', roi: '-' },
    { id: 'camp_003', client: '거제 반석교회', status: '완료', budget: '₩200,000', roi: '580%' },
  ];

  const totalBudget = '₩1,900,000';
  const activeCampaigns = campaigns.filter(c => c.status === '진행중').length;

  return (
    <div className="p-6 md:p-8 bg-gray-950 min-h-screen text-gray-200">
      <header className="mb-8 border-b border-gray-800 pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-amber-500">🏢 Empire Agency (2호기)</h1>
          <p className="text-gray-400 mt-2">클라이언트 광고 캠페인 통합 관제 센터</p>
        </div>
        <Link
          href="/agency/campaigns/new"
          className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2.5 rounded-lg font-bold transition-all shadow-lg shadow-amber-900/30 hover:shadow-amber-900/50"
        >
          + 새 캠페인 생성
        </Link>
      </header>

      {/* 핵심 지표 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 hover:border-gray-700 transition-colors">
          <h3 className="text-sm text-gray-400 uppercase tracking-wider">이번 달 누적 청구액</h3>
          <p className="text-2xl font-bold text-white mt-2">{totalBudget}</p>
          <p className="text-xs text-emerald-400 mt-1">↑ 12% vs 지난 달</p>
        </div>
        <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 hover:border-gray-700 transition-colors">
          <h3 className="text-sm text-gray-400 uppercase tracking-wider">활성 캠페인</h3>
          <p className="text-2xl font-bold text-emerald-400 mt-2">{activeCampaigns} <span className="text-sm text-gray-500">/ {campaigns.length}개</span></p>
          <p className="text-xs text-gray-500 mt-1">총 {campaigns.length}개 캠페인 관리 중</p>
        </div>
        <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 hover:border-gray-700 transition-colors">
          <h3 className="text-sm text-gray-400 uppercase tracking-wider">API 잔여 크레딧</h3>
          <p className="text-lg font-bold text-cyan-400 mt-2">Runway: <span className="text-white">420</span></p>
          <p className="text-lg font-bold text-purple-400">ElevenLabs: <span className="text-white">85%</span></p>
        </div>
      </div>

      {/* 캠페인 테이블 */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center">
          <h2 className="text-lg font-bold text-white">📋 캠페인 목록</h2>
          <span className="text-xs text-gray-500">{campaigns.length}건</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-800/50 text-gray-400 text-sm">
              <tr>
                <th className="p-4 font-medium">클라이언트</th>
                <th className="p-4 font-medium">상태</th>
                <th className="p-4 font-medium">예산</th>
                <th className="p-4 font-medium">예상 ROI</th>
                <th className="p-4 font-medium">관리</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((camp) => (
                <tr key={camp.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                  <td className="p-4 font-medium text-white">{camp.client}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      camp.status === '진행중'
                        ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-700/30'
                        : camp.status === '완료'
                        ? 'bg-blue-900/50 text-blue-300 border border-blue-700/30'
                        : 'bg-gray-700/50 text-gray-300 border border-gray-600/30'
                    }`}>
                      {camp.status}
                    </span>
                  </td>
                  <td className="p-4 text-gray-300 font-mono text-sm">{camp.budget}</td>
                  <td className="p-4 text-amber-400 font-bold">{camp.roi}</td>
                  <td className="p-4">
                    <Link
                      href={`/agency/campaigns/${camp.id}`}
                      className="text-cyan-400 hover:text-cyan-300 text-sm font-medium transition-colors"
                    >
                      캠페인 룸 입장 →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 하단 정보 */}
      <footer className="mt-8 text-center text-xs text-gray-600">
        BANSEOK EMPIRE AGENCY — V1.0 · Powered by 1호기 Cinematic Engine
      </footer>
    </div>
  );
}
