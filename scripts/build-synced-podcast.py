import argparse
import asyncio
import json
import re
import shutil
import subprocess
import tempfile
from pathlib import Path

import edge_tts
import imageio_ffmpeg
from mutagen.mp3 import MP3


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_PODCAST_ORDER = [
    {
        "title": "正方申論",
        "speaker": "正方 Claude",
        "voice": "zh-TW-YunJheNeural",
        "rate": "-1%",
        "pitch": "-1Hz",
    },
    {
        "title": "反方申論",
        "speaker": "反方 Gemini",
        "voice": "zh-TW-HsiaoChenNeural",
        "rate": "+3%",
        "pitch": "+2Hz",
    },
    {
        "title": "正方駁論",
        "speaker": "正方 Claude",
        "voice": "zh-TW-YunJheNeural",
        "rate": "-1%",
        "pitch": "-1Hz",
    },
    {
        "title": "反方駁論",
        "speaker": "反方 Gemini",
        "voice": "zh-TW-HsiaoChenNeural",
        "rate": "+3%",
        "pitch": "+2Hz",
    },
    {
        "title": "反方結辯",
        "speaker": "反方 Gemini",
        "voice": "zh-TW-HsiaoChenNeural",
        "rate": "+3%",
        "pitch": "+2Hz",
    },
    {
        "title": "正方結辯",
        "speaker": "正方 Claude",
        "voice": "zh-TW-YunJheNeural",
        "rate": "-1%",
        "pitch": "-1Hz",
    },
]

DEBATE_CONFIGS = {
    "school-phone": {
        "positive_speaker": "正方 Codex",
        "negative_speaker": "反方 Gemini",
    },
    "euthanasia": {
        "positive_speaker": "正方 Codex",
        "negative_speaker": "反方 Gemini",
    },
    "robot-tax": {
        "positive_speaker": "正方 Codex",
        "negative_speaker": "反方 Gemini",
    },
    "death-penalty": {
        "positive_speaker": "正方 Claude",
        "negative_speaker": "反方 Gemini",
    },
    "minimum-wage": {
        "positive_speaker": "正方 Codex / OpenAI",
        "negative_speaker": "反方 Claude",
    },
}


def podcast_order_for(slug: str) -> list[dict[str, str]]:
    config = DEBATE_CONFIGS.get(slug, {})
    positive_speaker = config.get("positive_speaker", "正方 Claude")
    negative_speaker = config.get("negative_speaker", "反方 Gemini")
    order = []
    for item in DEFAULT_PODCAST_ORDER:
        copied = dict(item)
        if copied["title"].startswith("正方"):
            copied["speaker"] = positive_speaker
        elif copied["title"].startswith("反方"):
            copied["speaker"] = negative_speaker
        order.append(copied)
    return order


def parse_sections(markdown: str) -> dict[str, str]:
    matches = re.finditer(r"(?ms)^##\s+(.+?)\r?\n(.*?)(?=^##\s+|\Z)", markdown)
    return {match.group(1).strip(): match.group(2).strip() for match in matches}


def plain_text(markdown: str) -> str:
    text = re.sub(r"(?m)^#+\s*", "", markdown)
    text = re.sub(r"\*\*(.*?)\*\*", r"\1", text)
    text = re.sub(r"(?m)^\|.*\|$", " ", text)
    text = re.sub(r"(?m)^\s*[-:| ]+\s*$", " ", text)
    text = re.sub(r"\d+\.\s*", "", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def split_caption_text(text: str, phrase_chars: int) -> list[str]:
    normalized = re.sub(r"\s+", "", text)
    sentences = [
        part.strip()
        for part in re.split(r"(?<=[。！？])", normalized)
        if part.strip()
    ]
    chunks: list[str] = []

    for sentence in sentences:
        if len(sentence) <= phrase_chars:
            chunks.append(sentence)
            continue

        phrase = ""
        for part in re.split(r"(?<=[，、；：])", sentence):
            if not part:
                continue
            if phrase and len(phrase) + len(part) > phrase_chars:
                chunks.append(phrase)
                phrase = part
            else:
                phrase += part
        if phrase:
            chunks.append(phrase)

    return chunks


def srt_time(seconds: float) -> str:
    ms = int(round(seconds * 1000))
    hours, ms = divmod(ms, 3_600_000)
    minutes, ms = divmod(ms, 60_000)
    secs, ms = divmod(ms, 1000)
    return f"{hours:02}:{minutes:02}:{secs:02},{ms:03}"


def write_srt(items: list[dict[str, object]], path: Path) -> None:
    lines: list[str] = []
    for index, item in enumerate(items, start=1):
        lines.extend([
            str(index),
            f"{srt_time(float(item['start']))} --> {srt_time(float(item['end']))}",
            str(item["text"]),
            "",
        ])
    path.write_text("\n".join(lines), encoding="utf-8")


async def synthesize_segment(item: dict[str, object], output: Path) -> None:
    communicate = edge_tts.Communicate(
        str(item["text"]),
        voice=str(item["voice"]),
        rate=str(item["rate"]),
        pitch=str(item["pitch"]),
    )
    await communicate.save(str(output))


def concatenate_audio(segment_paths: list[Path], output: Path) -> None:
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", suffix=".txt", delete=False) as handle:
        list_path = Path(handle.name)
        for segment in segment_paths:
            handle.write(f"file '{segment.resolve().as_posix()}'\n")

    try:
        subprocess.run([
            ffmpeg,
            "-y",
            "-f", "concat",
            "-safe", "0",
            "-i", str(list_path),
            "-c", "copy",
            str(output),
        ], check=True)
    finally:
        list_path.unlink(missing_ok=True)


def trim_segment_tail(path: Path, tail_seconds: float) -> dict[str, float]:
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    original_duration = MP3(path).info.length
    target_duration = max(0.6, original_duration - tail_seconds)
    trimmed = path.with_name(f"{path.stem}-trimmed{path.suffix}")
    subprocess.run([
        ffmpeg,
        "-y",
        "-i", str(path),
        "-t", f"{target_duration:.3f}",
        "-ar", "24000",
        "-ac", "1",
        "-b:a", "48k",
        str(trimmed),
    ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    trimmed.replace(path)
    trimmed_duration = MP3(path).info.length
    return {
        "original_duration": original_duration,
        "trimmed_duration": trimmed_duration,
        "trimmed_seconds": max(0.0, original_duration - trimmed_duration),
    }


async def build_synced_podcast(slug: str, phrase_chars: int, trim_tail_seconds: float) -> None:
    debate_dir = ROOT / "debates" / slug
    markdown = debate_dir / "debate.md"
    podcast_dir = debate_dir / "podcast"
    output_dir = debate_dir / "video" / "output"
    segment_dir = podcast_dir / "caption-segments"
    podcast_dir.mkdir(parents=True, exist_ok=True)
    output_dir.mkdir(parents=True, exist_ok=True)
    if segment_dir.exists():
        shutil.rmtree(segment_dir)
    segment_dir.mkdir(parents=True, exist_ok=True)

    sections = parse_sections(markdown.read_text(encoding="utf-8"))
    planned: list[dict[str, object]] = []
    for config in podcast_order_for(slug):
        body = sections.get(config["title"])
        if body is None:
            raise RuntimeError(f"Missing section: {config['title']}")
        chunks = split_caption_text(plain_text(body), phrase_chars)
        for chunk in chunks:
            planned.append({
                "section": config["title"],
                "speaker": config["speaker"],
                "voice": config["voice"],
                "rate": config["rate"],
                "pitch": config["pitch"],
                "text": chunk,
                "char_count": len(chunk),
            })

    for index, item in enumerate(planned, start=1):
        path = segment_dir / f"{index:04}.mp3"
        await synthesize_segment(item, path)
        if trim_tail_seconds > 0:
            item.update(trim_segment_tail(path, trim_tail_seconds))
        item["file"] = path.relative_to(ROOT).as_posix()
        item["duration"] = MP3(path).info.length
        trim_note = f" trim {item.get('trimmed_seconds', 0):.2f}s" if trim_tail_seconds > 0 else ""
        print(f"{index:04}/{len(planned)} {item['duration']:.2f}s{trim_note} {item['text']}")

    cursor = 0.0
    for item in planned:
        item["start"] = cursor
        cursor += float(item["duration"])
        item["end"] = cursor

    podcast = podcast_dir / "debate-podcast.mp3"
    concatenate_audio([ROOT / str(item["file"]) for item in planned], podcast)

    manifest = {
        "slug": slug,
        "split_strategy": "sentence_or_phrase",
        "phrase_chars": phrase_chars,
        "caption_count": len(planned),
        "max_caption_chars": max(int(item["char_count"]) for item in planned),
        "duration": MP3(podcast).info.length,
        "trim_tail_seconds": trim_tail_seconds,
        "items": planned,
    }
    manifest_path = podcast_dir / "captions-source.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    write_srt(planned, output_dir / "captions.srt")
    print(f"Wrote {podcast}")
    print(f"Wrote {manifest_path}")
    print(f"Wrote {output_dir / 'captions.srt'}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("slug", help="Debate slug, for example death-penalty")
    parser.add_argument(
        "--phrase-chars",
        type=int,
        default=42,
        help="Soft phrase length for very long sentences. Captions split by sentence punctuation first.",
    )
    parser.add_argument(
        "--trim-tail-seconds",
        type=float,
        default=0.45,
        help="Fixed duration trimmed from the end of each synthesized segment.",
    )
    args = parser.parse_args()
    asyncio.run(build_synced_podcast(args.slug, args.phrase_chars, args.trim_tail_seconds))


if __name__ == "__main__":
    main()
