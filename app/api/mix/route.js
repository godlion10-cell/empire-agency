import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = promisify(exec);

/**
 * POST /api/mix
 * 
 * FFmpeg 믹싱룸 — 영상 병합 + 오디오 합성 + 자막 하드코딩
 * 
 * Body: {
 *   cuts: string[],       // 영상 파일 경로 배열
 *   audio?: string,       // 오디오 파일 경로
 *   srt?: string,         // SRT 자막 파일 경로
 *   scriptText?: string,  // 대본 텍스트 (→ SRT 자동 생성)
 *   output?: string       // 출력 파일명
 * }
 */
export async function POST(req) {
  try {
    const { cuts, audio, srt, scriptText, output } = await req.json();

    if (!cuts || cuts.length === 0) {
      return NextResponse.json({ success: false, error: '영상 파일 경로가 필요합니다.' }, { status: 400 });
    }

    const renderDir = path.join(process.cwd(), 'public', 'renders');
    if (!fs.existsSync(renderDir)) fs.mkdirSync(renderDir, { recursive: true });

    const outputPath = output || path.join(renderDir, `empire_mix_${Date.now()}.mp4`);
    const scriptPath = path.join(process.cwd(), 'scripts', 'ffmpeg_mixer.py');

    // 대본 → SRT 자동 변환
    let srtPath = srt;
    if (scriptText && !srt) {
      srtPath = path.join(renderDir, `caption_${Date.now()}.srt`);
      const scriptFile = path.join(renderDir, `script_${Date.now()}.txt`);
      fs.writeFileSync(scriptFile, scriptText, 'utf-8');

      // Python 스크립트로 SRT 생성
      const srtCmd = `python "${scriptPath}" --cuts "${cuts[0]}" --script-to-srt "${scriptFile}" --srt "${srtPath}" --output "${outputPath}"`;
      // 위 명령은 SRT만 생성하고 실패해도 괜찮음
      try {
        await execAsync(`python -c "
import sys; sys.path.insert(0, '${process.cwd().replace(/\\/g, '\\\\')}\\\\scripts')
from ffmpeg_mixer import generate_srt_from_script
with open('${scriptFile.replace(/\\/g, '\\\\')}', 'r', encoding='utf-8') as f:
    script = f.read()
generate_srt_from_script(script, '${srtPath.replace(/\\/g, '\\\\')}')
"`, { timeout: 10000 });
      } catch (e) {
        console.log('⚠️ SRT 자동 생성 실패, 자막 없이 진행:', e.message);
        srtPath = null;
      }
    }

    // FFmpeg 믹싱 커맨드 조립
    let cmd = `python "${scriptPath}" --cuts ${cuts.map(c => `"${c}"`).join(' ')} --output "${outputPath}"`;
    if (audio) cmd += ` --audio "${audio}"`;
    if (srtPath) cmd += ` --srt "${srtPath}"`;

    console.log(`🎬 [MIX] 믹싱 시작: ${cmd}`);

    const { stdout, stderr } = await execAsync(cmd, { timeout: 600000 }); // 10분 타임아웃

    const stats = fs.statSync(outputPath);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(1);

    console.log(`✅ [MIX] 믹싱 완료: ${outputPath} (${fileSizeMB}MB)`);

    return NextResponse.json({
      success: true,
      data: {
        outputPath,
        publicUrl: outputPath.replace(path.join(process.cwd(), 'public'), ''),
        fileSizeMB,
        hasSrt: !!srtPath,
        log: stdout,
      }
    });
  } catch (error) {
    console.error('❌ [MIX] 믹싱 실패:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
