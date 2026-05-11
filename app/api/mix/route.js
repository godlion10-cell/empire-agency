import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import { getRenderDir, getPublicUrl, renderFileName } from '@/lib/render-path';

const execAsync = promisify(exec);

/**
 * POST /api/mix
 * 
 * FFmpeg 믹싱룸 — 영상 병합 + 오디오 합성 + 자막 하드코딩
 */
export async function POST(req) {
  try {
    const { cuts, audio, srt, scriptText, output } = await req.json();

    if (!cuts || cuts.length === 0) {
      return NextResponse.json({ success: false, error: '영상 파일 경로가 필요합니다.' }, { status: 400 });
    }

    const renderDir = getRenderDir();
    const outputPath = output || path.join(renderDir, renderFileName('empire_mix', '.mp4'));
    const scriptPath = path.join(process.cwd(), 'scripts', 'ffmpeg_mixer.py');

    // 대본 → SRT 자동 변환
    let srtPath = srt;
    if (scriptText && !srt) {
      srtPath = path.join(renderDir, renderFileName('caption', '.srt'));
      const scriptFile = path.join(renderDir, renderFileName('script', '.txt'));
      fs.writeFileSync(scriptFile, scriptText, 'utf-8');

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

    await execAsync(cmd, { timeout: 600000 });

    const stats = fs.statSync(outputPath);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(1);

    console.log(`✅ [MIX] 믹싱 완료: ${outputPath} (${fileSizeMB}MB)`);

    return NextResponse.json({
      success: true,
      data: {
        outputPath,
        publicUrl: getPublicUrl(outputPath),
        fileSizeMB,
        hasSrt: !!srtPath,
      }
    });
  } catch (error) {
    console.error('❌ [MIX] 믹싱 실패:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
