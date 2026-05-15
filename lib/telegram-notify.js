/**
 * 📬 Empire Telegram Notification Engine
 * 
 * 파이프라인 완료 시 텔레그램으로 실시간 알림을 전송합니다.
 * - 영상 렌더링 완료
 * - 프로젝트 상태 변경
 * - 에러/경고 알림
 */

const DASHBOARD_URL = 'https://empire-agency-rose.vercel.app/console';

/**
 * 텔레그램 메시지 전송 (범용)
 * @param {string} text - HTML 형식 메시지
 * @returns {Promise<boolean>}
 */
async function sendTelegram(text) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.warn('📬 [TELEGRAM] 토큰/채팅ID 미설정 — 알림 스킵');
    return false;
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`📬 [TELEGRAM] 전송 실패 (${res.status}):`, err.substring(0, 200));
      return false;
    }

    console.log('📬 [TELEGRAM] 알림 전송 완료');
    return true;
  } catch (error) {
    console.error('📬 [TELEGRAM] 네트워크 오류:', error.message);
    return false;
  }
}

/**
 * 🎬 영상 렌더링 완료 알림
 */
export async function notifyVideoComplete(projectTitle, provider, videoUrl) {
  const now = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
  const message = `
🏭 <b>[EMPIRE FACTORY]</b> 영상 완료

✅ <b>프로젝트:</b> ${projectTitle || '제목 없음'}
🎬 <b>엔진:</b> ${(provider || 'unknown').toUpperCase()}
⏰ <b>완료:</b> ${now}

${videoUrl ? `🔗 <a href="${videoUrl}">영상 다운로드</a>` : ''}
👉 <a href="${DASHBOARD_URL}">대시보드 바로가기</a>`;

  return sendTelegram(message.trim());
}

/**
 * 🚀 파이프라인 단계 완료 알림
 */
export async function notifyStageComplete(projectTitle, stage, detail = '') {
  const icons = {
    'DNA': '🧬', 'COPY': '📝', 'VISUAL': '🎨',
    'VIDEO': '🎬', 'COMPLETE': '🏆', 'ERROR': '❌',
  };
  const icon = icons[stage] || '📊';
  const now = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

  const message = `
${icon} <b>[EMPIRE]</b> ${stage}

📋 <b>프로젝트:</b> ${projectTitle || '—'}
📊 <b>단계:</b> ${stage}
${detail ? `💡 <b>상세:</b> ${detail}` : ''}
⏰ ${now}

👉 <a href="${DASHBOARD_URL}">대시보드</a>`;

  return sendTelegram(message.trim());
}

/**
 * ⚠️ 에러 알림
 */
export async function notifyError(context, errorMessage) {
  const now = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
  const message = `
❌ <b>[EMPIRE ERROR]</b>

🔍 <b>위치:</b> ${context}
💥 <b>에러:</b> <code>${(errorMessage || '').substring(0, 300)}</code>
⏰ ${now}`;

  return sendTelegram(message.trim());
}
