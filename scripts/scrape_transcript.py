"""
🏛️ Empire Data Pipeline — YouTube 자막 스크래핑 엔진

사용법:
  python scripts/scrape_transcript.py --url "https://www.youtube.com/watch?v=VIDEO_ID"
  python scripts/scrape_transcript.py --id "VIDEO_ID"
"""

import argparse
import json
import re
import sys

from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api.formatters import SRTFormatter


def extract_video_id(url_or_id):
    """YouTube URL에서 video ID 추출"""
    patterns = [
        r'(?:v=|/v/|youtu\.be/)([a-zA-Z0-9_-]{11})',
        r'^([a-zA-Z0-9_-]{11})$',
    ]
    for pattern in patterns:
        match = re.search(pattern, url_or_id)
        if match:
            return match.group(1)
    return url_or_id


def get_transcript(video_id, languages=None):
    """
    YouTube 영상의 자막 데이터를 추출합니다.
    
    Returns:
        dict: {
            "video_id": str,
            "full_text": str,        # 전체 텍스트 (AI 분석용)
            "segments": list,         # 타임코드별 세그먼트
            "srt": str,               # SRT 포맷 (자막 파일용)
            "duration_sec": float,    # 총 길이
            "word_count": int,        # 단어 수
        }
    """
    if languages is None:
        languages = ['ko', 'en', 'ja']

    print(f"🔍 자막 스캔 중: {video_id}")

    try:
        transcript = YouTubeTranscriptApi.get_transcript(video_id, languages=languages)
    except Exception:
        # 자동 생성 자막 포함 시도
        transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
        transcript = transcript_list.find_generated_transcript(languages).fetch()

    # 전체 텍스트 조합
    full_text = " ".join([seg['text'] for seg in transcript])

    # SRT 포맷 생성
    formatter = SRTFormatter()
    srt_output = formatter.format_transcript(transcript)

    # 총 길이 계산
    last_seg = transcript[-1]
    duration = last_seg['start'] + last_seg.get('duration', 0)

    result = {
        "video_id": video_id,
        "full_text": full_text,
        "segments": transcript,
        "srt": srt_output,
        "duration_sec": round(duration, 1),
        "word_count": len(full_text.split()),
        "segment_count": len(transcript),
    }

    print(f"✅ 자막 추출 완료!")
    print(f"   📊 세그먼트: {len(transcript)}개")
    print(f"   ⏱️ 길이: {duration:.0f}초 ({duration/60:.1f}분)")
    print(f"   📝 단어 수: {len(full_text.split())}개")

    return result


def get_video_metadata(video_id):
    """yt-dlp로 영상 메타데이터만 추출 (다운로드 없음)"""
    try:
        import yt_dlp
        opts = {
            'quiet': True,
            'no_warnings': True,
            'skip_download': True,
        }
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(f"https://www.youtube.com/watch?v={video_id}", download=False)
            return {
                "title": info.get('title', ''),
                "description": info.get('description', '')[:500],
                "duration": info.get('duration', 0),
                "view_count": info.get('view_count', 0),
                "channel": info.get('channel', ''),
                "upload_date": info.get('upload_date', ''),
                "thumbnail": info.get('thumbnail', ''),
            }
    except Exception as e:
        print(f"⚠️ 메타데이터 추출 실패: {e}")
        return None


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="🏛️ Empire YouTube 자막 스크래퍼")
    parser.add_argument("--url", help="YouTube URL")
    parser.add_argument("--id", help="YouTube Video ID")
    parser.add_argument("--output", default=None, help="출력 JSON 파일 경로")
    parser.add_argument("--srt", default=None, help="SRT 자막 파일 출력 경로")
    parser.add_argument("--meta", action="store_true", help="메타데이터도 포함")

    args = parser.parse_args()

    video_input = args.url or args.id
    if not video_input:
        print("❌ --url 또는 --id를 입력해주세요.")
        sys.exit(1)

    video_id = extract_video_id(video_input)
    result = get_transcript(video_id)

    if args.meta:
        meta = get_video_metadata(video_id)
        if meta:
            result["metadata"] = meta

    # SRT 파일 저장
    if args.srt:
        with open(args.srt, 'w', encoding='utf-8') as f:
            f.write(result['srt'])
        print(f"📄 SRT 저장: {args.srt}")

    # JSON 출력
    if args.output:
        with open(args.output, 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        print(f"📦 JSON 저장: {args.output}")
    else:
        # stdout으로 전체 텍스트만 출력 (API 파이프라인용)
        print("\n" + "=" * 60)
        print("[TRANSCRIPT OUTPUT]")
        print("=" * 60)
        print(result['full_text'])
