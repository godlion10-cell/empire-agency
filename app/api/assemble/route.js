import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = promisify(exec);

/**
 * POST /api/assemble
 * 
 * MoviePy 어셈블리 엔진 호출 — 영상 + 오디오 + 로고 → 최종 MP4
 * 
 * Body: { video, audio, logo?, output?, watermark? }
 */
export async function POST(req) {
  try {
    const { video, audio, logo, output, watermark } = await req.json();

    if (!video || !audio) {
      return NextResponse.json({
        success: false,
        error: '영상(video)과 오디오(audio) 경로는 필수입니다.'
      }, { status: 400 });
    }

    // 출력 경로 기본값
    const outputPath = output || path.join(process.cwd(), 'public', 'renders', `empire_${Date.now()}.mp4`);
    
    // renders 디렉토리 확보
    const renderDir = path.dirname(outputPath);
    if (!fs.existsSync(renderDir)) {
      fs.mkdirSync(renderDir, { recursive: true });
    }

    // 스크립트 경로
    const scriptPath = path.join(process.cwd(), 'scripts', 'assemble_shorts.py');

    // 커맨드 조립
    let cmd = `python "${scriptPath}" --video "${video}" --audio "${audio}" --output "${outputPath}"`;
    if (logo) cmd += ` --logo "${logo}"`;
    if (watermark) cmd += ` --watermark "${watermark}"`;

    console.log(`🎬 [ASSEMBLE] 렌더링 시작: ${cmd}`);

    const { stdout, stderr } = await execAsync(cmd, { timeout: 300000 }); // 5분 타임아웃

    console.log(`✅ [ASSEMBLE] 렌더링 완료: ${outputPath}`);

    // 파일 크기 확인
    const stats = fs.statSync(outputPath);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(1);

    return NextResponse.json({
      success: true,
      data: {
        outputPath,
        publicUrl: outputPath.replace(path.join(process.cwd(), 'public'), ''),
        fileSizeMB,
        log: stdout,
      }
    });
  } catch (error) {
    console.error('❌ [ASSEMBLE] 렌더링 실패:', error.message);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
