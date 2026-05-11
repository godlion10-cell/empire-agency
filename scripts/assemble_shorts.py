"""
🏛️ Empire Shorts Assembly Engine
=================================
MoviePy 기반 숏폼 영상 최종 렌더링 파이프라인

사용법:
  python scripts/assemble_shorts.py --video input.mp4 --audio narration.mp3 --logo logo.png --output final.mp4
  python scripts/assemble_shorts.py --video input.mp4 --audio narration.mp3 --output final.mp4  (로고 없이)
"""

import argparse
import os
import sys
from moviepy.editor import (
    VideoFileClip, AudioFileClip, ImageClip,
    CompositeVideoClip, TextClip, ColorClip, concatenate_videoclips
)


def create_empire_shorts(video_path, audio_path, logo_path=None, output_path="output.mp4",
                          watermark_text=None, fade_in=0.5, fade_out=0.5):
    """
    Empire 숏폼 영상 어셈블리 엔진
    
    Args:
        video_path: 원본 영상 파일 경로
        audio_path: AI 내레이션 오디오 파일 경로
        logo_path: 로고/워터마크 이미지 경로 (선택)
        output_path: 최종 렌더링 출력 경로
        watermark_text: 워터마크 텍스트 (선택)
        fade_in: 페이드인 초
        fade_out: 페이드아웃 초
    """
    print("🏛️ Empire Shorts Assembly Engine 가동...")
    print(f"   📹 영상: {video_path}")
    print(f"   🔊 오디오: {audio_path}")
    print(f"   🎨 로고: {logo_path or 'N/A'}")
    print(f"   📦 출력: {output_path}")
    print()

    # ============================
    # 1. 영상 및 오디오 로드
    # ============================
    print("⏳ [1/4] 소스 파일 로딩...")
    video = VideoFileClip(video_path)
    audio = AudioFileClip(audio_path)

    # 2. 오디오 길이에 맞춰 영상 길이 조절 (오디오가 메인)
    print("⏳ [2/4] 오디오 싱크 조정...")
    if video.duration < audio.duration:
        # 영상이 짧으면 마지막 프레임을 정지화면으로 연장
        freeze = video.to_ImageClip(t=video.duration - 0.1).set_duration(audio.duration - video.duration)
        video = concatenate_videoclips([video, freeze])
    
    final_video = video.subclip(0, audio.duration).set_audio(audio)

    # 페이드 효과 적용
    if fade_in > 0:
        final_video = final_video.fadein(fade_in)
    if fade_out > 0:
        final_video = final_video.fadeout(fade_out)

    # ============================
    # 3. 레이어 합성
    # ============================
    print("⏳ [3/4] 레이어 합성 중...")
    layers = [final_video]

    # 3a. 로고 합성 (우측 상단, 투명도 80%)
    if logo_path and os.path.exists(logo_path):
        logo = (ImageClip(logo_path)
                .set_duration(final_video.duration)
                .resize(height=100)
                .margin(right=40, top=40, opacity=0)
                .set_pos(("right", "top"))
                .set_opacity(0.8))
        layers.append(logo)
        print("   ✅ 로고 오버레이 적용됨")

    # 3b. 워터마크 텍스트 (선택)
    if watermark_text:
        try:
            wm = (TextClip(watermark_text,
                          fontsize=14, color='white', font='Arial',
                          stroke_color='black', stroke_width=0.5)
                  .set_duration(final_video.duration)
                  .set_pos(("center", "bottom"))
                  .margin(bottom=20, opacity=0)
                  .set_opacity(0.4))
            layers.append(wm)
            print(f"   ✅ 워터마크 적용됨: '{watermark_text}'")
        except Exception as e:
            print(f"   ⚠️ 워터마크 건너뜀 (폰트 오류): {e}")

    # ============================
    # 4. 최종 렌더링
    # ============================
    print("⏳ [4/4] 최종 렌더링 중... (시간이 소요됩니다)")
    result = CompositeVideoClip(layers)
    result.write_videofile(
        output_path,
        fps=30,
        codec="libx264",
        audio_codec="aac",
        bitrate="8000k",
        preset="medium",
        threads=4,
        logger="bar"
    )

    # 정리
    video.close()
    audio.close()
    result.close()

    file_size = os.path.getsize(output_path) / (1024 * 1024)
    print()
    print(f"✅ 렌더링 완료!")
    print(f"   📦 출력: {output_path}")
    print(f"   📊 파일 크기: {file_size:.1f} MB")
    print(f"   ⏱️ 길이: {audio.duration:.1f}초")
    print("🏛️ EMPIRE ASSEMBLY COMPLETE")
    
    return output_path


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="🏛️ Empire Shorts Assembly Engine")
    parser.add_argument("--video", required=True, help="원본 영상 파일 경로")
    parser.add_argument("--audio", required=True, help="AI 내레이션 오디오 경로")
    parser.add_argument("--logo", default=None, help="로고 이미지 경로 (선택)")
    parser.add_argument("--output", default="output.mp4", help="출력 파일 경로")
    parser.add_argument("--watermark", default=None, help="워터마크 텍스트 (선택)")
    parser.add_argument("--fade-in", type=float, default=0.5, help="페이드인 초 (기본: 0.5)")
    parser.add_argument("--fade-out", type=float, default=0.5, help="페이드아웃 초 (기본: 0.5)")
    
    args = parser.parse_args()
    
    # 파일 존재 확인
    if not os.path.exists(args.video):
        print(f"❌ 영상 파일을 찾을 수 없습니다: {args.video}")
        sys.exit(1)
    if not os.path.exists(args.audio):
        print(f"❌ 오디오 파일을 찾을 수 없습니다: {args.audio}")
        sys.exit(1)
    
    create_empire_shorts(
        video_path=args.video,
        audio_path=args.audio,
        logo_path=args.logo,
        output_path=args.output,
        watermark_text=args.watermark,
        fade_in=args.fade_in,
        fade_out=args.fade_out,
    )
