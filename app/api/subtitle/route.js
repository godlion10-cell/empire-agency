import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * 자막 스타일 고정값 (대시보드 설정)
 */
const SUBTITLE_STYLE = {
  FontName: 'Malgun Gothic',       // 맑은 고딕 (한글 기본)
  FontSize: 22,
  PrimaryColour: '&H00FFFFFF',     // 흰색
  SecondaryColour: '&H00FFFF00',   // 강조: 노란색
  OutlineColour: '&H00000000',     // 테두리: 검정
  BackColour: '&H80000000',        // 배경: 반투명 검정
  Outline: 2,
  Shadow: 1,
  Alignment: 2,                     // 하단 중앙
  MarginV: 35,                      // 하단 여백
  Bold: 1,
};

/**
 * 타임코드 JSON → SRT 변환
 * 
 * 입력 형식:
 * [
 *   { "start": 0.0, "end": 3.5, "text": "부산에 다시없을 기회예요." },
 *   { "start": 3.5, "end": 7.0, "text": "18만 평 사상공원을 내 집 앞마당처럼!" },
 *   ...
 * ]
 */
function jsonToSrt(segments) {
  return segments.map((seg, i) => {
    const startTime = formatSrtTime(seg.start);
    const endTime = formatSrtTime(seg.end);
    return `${i + 1}\n${startTime} --> ${endTime}\n${seg.text}\n`;
  }).join('\n');
}

function formatSrtTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

/**
 * FFmpeg subtitles 필터 문자열 생성
 */
function buildSubtitleFilter(srtPath) {
  const s = SUBTITLE_STYLE;
  const styleStr = Object.entries(s).map(([k, v]) => `${k}=${v}`).join(',');
  // Windows 경로 이스케이프 (\ → \\, : → \\:)
  const escaped = srtPath.replace(/\\/g, '/').replace(/:/g, '\\\\:');
  return `subtitles='${escaped}':force_style='${styleStr}'`;
}

/**
 * POST /api/subtitle
 * 
 * 3가지 모드:
 * 1. convert: JSON 타임코드 → SRT 파일 생성
 * 2. burn: 영상에 SRT 자막 하드코딩
 * 3. full: JSON → SRT → 영상 하드코딩 (원스톱)
 * 
 * Body:
 *   mode: 'convert' | 'burn' | 'full'
 *   segments?: Array<{start, end, text}>  (convert/full 모드)
 *   scriptText?: string                    (convert 모드 — 대본 텍스트)
 *   srtPath?: string                       (burn 모드)
 *   videoPath: string                      (burn/full 모드)
 *   audioPath?: string                     (full 모드 — 오디오 합성)
 *   output?: string
 */
export async function POST(req) {
  try {
    const body = await req.json();
    const { mode = 'convert', segments, scriptText, srtPath: inputSrtPath, videoPath, audioPath, output } = body;

    const renderDir = path.join(process.cwd(), 'public', 'renders');
    if (!fs.existsSync(renderDir)) fs.mkdirSync(renderDir, { recursive: true });

    const timestamp = Date.now();

    // ========================================
    // MODE 1: JSON → SRT 변환
    // ========================================
    if (mode === 'convert') {
      let srtContent;

      if (segments && segments.length > 0) {
        // 타임코드 JSON → SRT
        srtContent = jsonToSrt(segments);
      } else if (scriptText) {
        // 대본 텍스트 → 균등 분할 SRT (타임코드 없을 때 폴백)
        const lines = scriptText.split('\n').filter(l => l.trim());
        const durationPerLine = 3.0;
        const autoSegments = lines.map((text, i) => ({
          start: i * durationPerLine,
          end: (i + 1) * durationPerLine,
          text: text.trim(),
        }));
        srtContent = jsonToSrt(autoSegments);
      } else {
        return NextResponse.json({ success: false, error: 'segments 또는 scriptText가 필요합니다.' }, { status: 400 });
      }

      const srtPath = path.join(renderDir, `caption_${timestamp}.srt`);
      fs.writeFileSync(srtPath, srtContent, 'utf-8');

      return NextResponse.json({
        success: true,
        data: {
          srtPath,
          publicUrl: `/renders/caption_${timestamp}.srt`,
          lineCount: srtContent.split('\n\n').filter(b => b.trim()).length,
          preview: srtContent.substring(0, 300),
        }
      });
    }

    // ========================================
    // MODE 2: 영상에 SRT 자막 하드코딩
    // ========================================
    if (mode === 'burn') {
      if (!videoPath || !inputSrtPath) {
        return NextResponse.json({ success: false, error: 'videoPath와 srtPath가 필요합니다.' }, { status: 400 });
      }

      const outputPath = output || path.join(renderDir, `subtitled_${timestamp}.mp4`);
      const subFilter = buildSubtitleFilter(inputSrtPath);

      const cmd = `ffmpeg -y -i "${videoPath}" -vf "${subFilter}" -c:v libx264 -c:a copy -pix_fmt yuv420p "${outputPath}"`;
      console.log(`📝 [SUBTITLE] 자막 하드코딩: ${cmd}`);

      await execAsync(cmd, { timeout: 300000 });

      const stats = fs.statSync(outputPath);
      return NextResponse.json({
        success: true,
        data: {
          outputPath,
          publicUrl: outputPath.replace(path.join(process.cwd(), 'public'), ''),
          fileSizeMB: (stats.size / (1024 * 1024)).toFixed(1),
        }
      });
    }

    // ========================================
    // MODE 3: 원스톱 (JSON→SRT→영상+오디오+자막)
    // ========================================
    if (mode === 'full') {
      if (!videoPath) {
        return NextResponse.json({ success: false, error: 'videoPath가 필요합니다.' }, { status: 400 });
      }

      // Step 1: SRT 생성
      let srtPath;
      if (segments && segments.length > 0) {
        srtPath = path.join(renderDir, `caption_${timestamp}.srt`);
        fs.writeFileSync(srtPath, jsonToSrt(segments), 'utf-8');
      } else if (scriptText) {
        const lines = scriptText.split('\n').filter(l => l.trim());
        const autoSegments = lines.map((text, i) => ({
          start: i * 3.0,
          end: (i + 1) * 3.0,
          text: text.trim(),
        }));
        srtPath = path.join(renderDir, `caption_${timestamp}.srt`);
        fs.writeFileSync(srtPath, jsonToSrt(autoSegments), 'utf-8');
      }

      const outputPath = output || path.join(renderDir, `final_${timestamp}.mp4`);
      const subFilter = srtPath ? buildSubtitleFilter(srtPath) : null;

      // Step 2: FFmpeg 커맨드 조립
      let cmd;
      if (audioPath && subFilter) {
        // 영상 + 오디오 + 자막
        cmd = `ffmpeg -y -i "${videoPath}" -i "${audioPath}" -vf "${subFilter}" -map 0:v:0 -map 1:a:0 -c:v libx264 -c:a aac -b:a 192k -pix_fmt yuv420p -shortest "${outputPath}"`;
      } else if (audioPath) {
        // 영상 + 오디오
        cmd = `ffmpeg -y -i "${videoPath}" -i "${audioPath}" -c:v libx264 -c:a aac -b:a 192k -pix_fmt yuv420p -map 0:v:0 -map 1:a:0 -shortest "${outputPath}"`;
      } else if (subFilter) {
        // 영상 + 자막
        cmd = `ffmpeg -y -i "${videoPath}" -vf "${subFilter}" -c:v libx264 -c:a copy -pix_fmt yuv420p "${outputPath}"`;
      } else {
        return NextResponse.json({ success: false, error: '자막(segments/scriptText) 또는 오디오(audioPath)가 필요합니다.' }, { status: 400 });
      }

      console.log(`🎬 [SUBTITLE] 풀 파이프라인: ${cmd}`);
      await execAsync(cmd, { timeout: 600000 });

      const stats = fs.statSync(outputPath);
      return NextResponse.json({
        success: true,
        data: {
          outputPath,
          publicUrl: outputPath.replace(path.join(process.cwd(), 'public'), ''),
          fileSizeMB: (stats.size / (1024 * 1024)).toFixed(1),
          hasSrt: !!srtPath,
          hasAudio: !!audioPath,
          subtitleStyle: SUBTITLE_STYLE,
        }
      });
    }

    return NextResponse.json({ success: false, error: `알 수 없는 mode: ${mode}` }, { status: 400 });

  } catch (error) {
    console.error('❌ [SUBTITLE] 에러:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * GET /api/subtitle
 * 
 * 현재 자막 스타일 설정값 반환 (대시보드 표시용)
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    style: SUBTITLE_STYLE,
    info: {
      supportedFonts: ['Malgun Gothic', 'NanumGothic', 'NanumSquare', 'Pretendard'],
      note: '자막 스타일은 서버 코드에서 고정 관리됩니다.',
    }
  });
}
