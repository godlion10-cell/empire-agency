"""
🏛️ Empire Mixing Room — FFmpeg 자동 조립 엔진

영상 병합 + 오디오 합성 + 자막 하드코딩 풀 오토메이션

사용법:
  python scripts/ffmpeg_mixer.py --cuts cut1.mp4 cut2.mp4 cut3.mp4 --audio voice.mp3 --output final.mp4
  python scripts/ffmpeg_mixer.py --cuts cut1.mp4 cut2.mp4 --audio voice.mp3 --srt caption.srt --output final.mp4
"""

import argparse
import os
import subprocess
import sys
import tempfile


def check_ffmpeg():
    """FFmpeg 설치 확인"""
    try:
        result = subprocess.run(['ffmpeg', '-version'], capture_output=True, text=True)
        version = result.stdout.split('\n')[0] if result.stdout else 'Unknown'
        print(f"✅ FFmpeg 감지: {version}")
        return True
    except FileNotFoundError:
        print("❌ FFmpeg가 설치되어 있지 않습니다.")
        print("   설치: winget install Gyan.FFmpeg")
        return False


def concat_videos(video_paths, output_path):
    """영상 여러 개를 하나로 병합 (concat)"""
    # concat 파일 리스트 생성
    list_file = os.path.join(tempfile.gettempdir(), 'empire_concat_list.txt')
    with open(list_file, 'w', encoding='utf-8') as f:
        for vp in video_paths:
            f.write(f"file '{os.path.abspath(vp)}'\n")

    cmd = [
        'ffmpeg', '-y',
        '-f', 'concat', '-safe', '0',
        '-i', list_file,
        '-c', 'copy',
        output_path
    ]
    print(f"🔗 영상 {len(video_paths)}개 병합 중...")
    subprocess.run(cmd, check=True, capture_output=True)
    os.remove(list_file)
    return output_path


def mix_audio(video_path, audio_path, output_path):
    """영상에 오디오 합성 (오디오 길이 기준)"""
    cmd = [
        'ffmpeg', '-y',
        '-i', video_path,
        '-i', audio_path,
        '-c:v', 'libx264',
        '-c:a', 'aac',
        '-b:a', '192k',
        '-pix_fmt', 'yuv420p',
        '-map', '0:v:0',
        '-map', '1:a:0',
        '-shortest',
        output_path
    ]
    print(f"🔊 오디오 합성 중...")
    subprocess.run(cmd, check=True, capture_output=True)
    return output_path


def add_subtitles(video_path, srt_path, output_path, font_size=24, font_name='NanumGothic'):
    """영상에 자막 하드코딩 (SRT 기반)"""
    # subtitles 필터 — 한글 폰트 지정
    sub_filter = f"subtitles='{srt_path}':force_style='FontSize={font_size},FontName={font_name},PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,Outline=2,Shadow=1,Alignment=2,MarginV=30'"

    cmd = [
        'ffmpeg', '-y',
        '-i', video_path,
        '-vf', sub_filter,
        '-c:v', 'libx264',
        '-c:a', 'copy',
        '-pix_fmt', 'yuv420p',
        output_path
    ]
    print(f"📝 자막 하드코딩 중: {srt_path}")
    subprocess.run(cmd, check=True, capture_output=True)
    return output_path


def full_pipeline(video_paths, audio_path=None, srt_path=None, output_path='final_shortform.mp4'):
    """
    풀 파이프라인: 영상 병합 → 오디오 합성 → 자막 하드코딩
    """
    print("🏛️ Empire Mixing Room 가동...")
    print(f"   📹 영상: {len(video_paths)}개")
    print(f"   🔊 오디오: {audio_path or 'N/A'}")
    print(f"   📝 자막: {srt_path or 'N/A'}")
    print(f"   📦 출력: {output_path}")
    print()

    if not check_ffmpeg():
        sys.exit(1)

    current = None

    # Step 1: 영상 병합
    if len(video_paths) > 1:
        concat_out = output_path.replace('.mp4', '_concat.mp4')
        concat_videos(video_paths, concat_out)
        current = concat_out
        print(f"   ✅ 병합 완료: {concat_out}")
    else:
        current = video_paths[0]

    # Step 2: 오디오 합성
    if audio_path and os.path.exists(audio_path):
        audio_out = output_path.replace('.mp4', '_mixed.mp4')
        mix_audio(current, audio_path, audio_out)
        # 중간 파일 정리
        if current.endswith('_concat.mp4'):
            os.remove(current)
        current = audio_out
        print(f"   ✅ 오디오 합성 완료")

    # Step 3: 자막 하드코딩
    if srt_path and os.path.exists(srt_path):
        add_subtitles(current, srt_path, output_path)
        # 중간 파일 정리
        if current != video_paths[0]:
            os.remove(current)
        print(f"   ✅ 자막 하드코딩 완료")
    else:
        # 자막 없으면 현재 파일을 최종으로 이동
        if current != output_path:
            os.rename(current, output_path)

    file_size = os.path.getsize(output_path) / (1024 * 1024)
    print()
    print(f"✅ 최종 렌더링 완료!")
    print(f"   📦 출력: {output_path}")
    print(f"   📊 파일 크기: {file_size:.1f} MB")
    print("🏛️ EMPIRE MIXING COMPLETE")

    return output_path


def generate_srt_from_script(script_text, output_path, duration_per_line=3.0):
    """
    대본 텍스트를 SRT 자막 파일로 자동 변환
    (Gemini/GPT 대본 → .srt 변환용)
    """
    lines = [l.strip() for l in script_text.strip().split('\n') if l.strip()]
    
    with open(output_path, 'w', encoding='utf-8') as f:
        for i, line in enumerate(lines):
            start = i * duration_per_line
            end = start + duration_per_line
            
            start_h = int(start // 3600)
            start_m = int((start % 3600) // 60)
            start_s = int(start % 60)
            start_ms = int((start % 1) * 1000)
            
            end_h = int(end // 3600)
            end_m = int((end % 3600) // 60)
            end_s = int(end % 60)
            end_ms = int((end % 1) * 1000)
            
            f.write(f"{i + 1}\n")
            f.write(f"{start_h:02d}:{start_m:02d}:{start_s:02d},{start_ms:03d} --> {end_h:02d}:{end_m:02d}:{end_s:02d},{end_ms:03d}\n")
            f.write(f"{line}\n\n")
    
    print(f"📄 SRT 생성 완료: {output_path} ({len(lines)}줄)")
    return output_path


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="🏛️ Empire FFmpeg Mixing Room")
    parser.add_argument("--cuts", nargs='+', required=True, help="영상 파일들 (순서대로)")
    parser.add_argument("--audio", default=None, help="오디오 파일 (MP3)")
    parser.add_argument("--srt", default=None, help="SRT 자막 파일")
    parser.add_argument("--output", default="final_shortform.mp4", help="출력 파일")
    parser.add_argument("--script-to-srt", default=None, help="대본 텍스트 → SRT 변환 (파일 경로)")

    args = parser.parse_args()

    # 대본 → SRT 변환 모드
    if args.script_to_srt:
        with open(args.script_to_srt, 'r', encoding='utf-8') as f:
            script = f.read()
        srt_out = args.srt or args.script_to_srt.replace('.txt', '.srt')
        generate_srt_from_script(script, srt_out)
        args.srt = srt_out

    # 파일 존재 확인
    for vp in args.cuts:
        if not os.path.exists(vp):
            print(f"❌ 파일을 찾을 수 없습니다: {vp}")
            sys.exit(1)

    full_pipeline(args.cuts, args.audio, args.srt, args.output)
