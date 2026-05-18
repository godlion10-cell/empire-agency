/**
 * 🔊 Empire Audio Engine — Zero-Cost Edge TTS
 * 
 * Microsoft Edge TTS를 활용한 100% 무료 한국어 음성 생성 엔진.
 * ElevenLabs 대체 — MVP 단계에서 API 비용 ZERO.
 * 
 * 지원 보이스:
 * - ko-KR-SunHiNeural (여성, 밝고 깨끗한 톤)
 * - ko-KR-InJoonNeural (남성, 중후한 톤)
 * - ko-KR-HyunsuNeural (남성, 젊고 역동적인 톤)
 * - ko-KR-BongJinNeural (남성, 차분한 나레이션 톤)
 * - ko-KR-GookMinNeural (남성, 부드러운 톤)
 * - ko-KR-JiMinNeural (여성, 따뜻한 톤)
 * - ko-KR-SeoHyeonNeural (여성, 차분한 톤)
 * - ko-KR-SoonBokNeural (여성, 성숙한 톤)
 * - ko-KR-YuJinNeural (여성, 젊은 톤)
 */

import { UniversalEdgeTTS } from 'edge-tts-universal';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

/** 사용 가능한 한국어 보이스 목록 */
export const KOREAN_VOICES = [
  { id: 'ko-KR-SunHiNeural', name: '선희 (여성)', gender: 'female', tone: '밝고 깨끗한', bestFor: ['광고', '안내'] },
  { id: 'ko-KR-InJoonNeural', name: '인준 (남성)', gender: 'male', tone: '중후한', bestFor: ['다큐', '부동산'] },
  { id: 'ko-KR-HyunsuNeural', name: '현수 (남성)', gender: 'male', tone: '역동적', bestFor: ['트렌드', '유튜브'] },
  { id: 'ko-KR-BongJinNeural', name: '봉진 (남성)', gender: 'male', tone: '차분한 나레이션', bestFor: ['기업', 'B2B'] },
  { id: 'ko-KR-SeoHyeonNeural', name: '서현 (여성)', gender: 'female', tone: '차분하고 프로페셔널', bestFor: ['기업', '교육'] },
  { id: 'ko-KR-YuJinNeural', name: '유진 (여성)', gender: 'female', tone: '젊고 에너지 넘치는', bestFor: ['SNS', '트렌드'] },
];

/** 기본 보이스 */
const DEFAULT_VOICE = 'ko-KR-SunHiNeural';

/**
 * Edge TTS로 한국어 음성을 생성하고 파일로 저장
 * @param {string} text - 음성 변환할 텍스트
 * @param {Object} options
 * @param {string} options.projectId - 프로젝트 ID
 * @param {number} options.chunkIndex - 청크 인덱스 (여러 세그먼트일 때)
 * @param {string} options.voice - 보이스 ID (기본: ko-KR-SunHiNeural)
 * @param {string} options.rate - 속도 조절 (예: '+10%', '-5%')
 * @param {string} options.pitch - 피치 조절 (예: '+2Hz', '-1Hz')
 * @returns {Promise<Object>} { publicUrl, filePath, source, voice, duration }
 */
export async function generateFreeKoreanVoice(text, options = {}) {
  const {
    projectId = `project_${Date.now()}`,
    chunkIndex = 0,
    voice = DEFAULT_VOICE,
    rate = '+0%',
    pitch = '+0Hz',
  } = options;

  if (!text || text.trim().length === 0) {
    throw new Error('음성 변환할 텍스트가 필요합니다.');
  }

  console.log(`🔊 [EDGE-TTS] 생성 시작 — Voice: ${voice} | 텍스트: ${text.substring(0, 50)}...`);

  // 출력 디렉토리 확보
  const audioDir = path.join(process.cwd(), 'public', 'audio');
  if (!existsSync(audioDir)) {
    await mkdir(audioDir, { recursive: true });
  }

  const filename = `${projectId}_chunk${chunkIndex}_${Date.now()}.mp3`;
  const outputPath = path.join(audioDir, filename);

  try {
    // Edge TTS 합성
    const tts = new UniversalEdgeTTS(text, voice);
    const result = await tts.synthesize();

    // ArrayBuffer → Node.js Buffer → 파일 저장
    const audioBuffer = Buffer.from(await result.audio.arrayBuffer());
    await writeFile(outputPath, audioBuffer);

    const fileSizeKB = (audioBuffer.length / 1024).toFixed(1);
    console.log(`✅ [EDGE-TTS] 생성 완료 — ${filename} (${fileSizeKB}KB)`);

    return {
      publicUrl: `/audio/${filename}`,
      filePath: outputPath,
      source: 'EdgeTTS',
      voice,
      voiceName: KOREAN_VOICES.find(v => v.id === voice)?.name || voice,
      fileSizeKB: parseFloat(fileSizeKB),
      textLength: text.length,
      cost: 0, // 💰 ZERO COST
    };
  } catch (error) {
    console.error(`❌ [EDGE-TTS] 합성 실패:`, error.message);
    throw new Error(`Edge TTS 합성 실패: ${error.message}`);
  }
}

/**
 * 여러 텍스트 청크를 일괄 음성 생성
 * @param {Array<string>} textChunks - 텍스트 배열
 * @param {Object} options - 공통 옵션 (projectId, voice 등)
 * @returns {Promise<Array>} 결과 배열
 */
export async function generateVoiceBatch(textChunks, options = {}) {
  if (!Array.isArray(textChunks) || textChunks.length === 0) {
    throw new Error('텍스트 청크 배열이 필요합니다.');
  }

  console.log(`🔊 [EDGE-TTS] Batch 생성 시작 — ${textChunks.length}개 청크`);

  const results = [];
  for (let i = 0; i < textChunks.length; i++) {
    try {
      const result = await generateFreeKoreanVoice(textChunks[i], {
        ...options,
        chunkIndex: i,
      });
      results.push({ chunkIndex: i, success: true, ...result });
    } catch (error) {
      results.push({ chunkIndex: i, success: false, error: error.message });
    }
  }

  const successCount = results.filter(r => r.success).length;
  console.log(`✅ [EDGE-TTS] Batch 완료 — 성공: ${successCount}/${textChunks.length}`);

  return results;
}

/**
 * Edge TTS로 음성을 생성하고 Base64 DataURL로 반환
 * (파일 저장 없이 인라인 응답용)
 * @param {string} text - 변환할 텍스트
 * @param {string} voice - 보이스 ID
 * @returns {Promise<Object>} { source, dataUrl, voice }
 */
export async function generateVoiceAsDataUrl(text, voice = DEFAULT_VOICE) {
  if (!text || text.trim().length === 0) {
    throw new Error('음성 변환할 텍스트가 필요합니다.');
  }

  console.log(`🔊 [EDGE-TTS] DataURL 생성 — Voice: ${voice}`);

  const tts = new UniversalEdgeTTS(text, voice);
  const result = await tts.synthesize();

  const audioBuffer = Buffer.from(await result.audio.arrayBuffer());
  const base64 = audioBuffer.toString('base64');

  return {
    source: 'EdgeTTS',
    dataUrl: `data:audio/mpeg;base64,${base64}`,
    voice,
    voiceName: KOREAN_VOICES.find(v => v.id === voice)?.name || voice,
    cost: 0,
  };
}
