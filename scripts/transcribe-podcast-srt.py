import argparse
from pathlib import Path
import math

from faster_whisper import WhisperModel


ROOT = Path(__file__).resolve().parents[1]
PODCAST_ORDER = [
    "正方申論",
    "反方申論",
    "正方駁論",
    "反方駁論",
    "反方結辯",
    "正方結辯",
]


def srt_time(seconds: float) -> str:
    ms = int(round(seconds * 1000))
    hours, ms = divmod(ms, 3_600_000)
    minutes, ms = divmod(ms, 60_000)
    secs, ms = divmod(ms, 1000)
    return f"{hours:02}:{minutes:02}:{secs:02},{ms:03}"


def parse_sections(markdown: str) -> dict[str, str]:
    import re

    matches = re.finditer(r"(?ms)^##\s+(.+?)\r?\n(.*?)(?=^##\s+|\Z)", markdown)
    return {match.group(1).strip(): match.group(2).strip() for match in matches}


def plain_text(markdown: str) -> str:
    import re

    text = re.sub(r"(?m)^#+\s*", "", markdown)
    text = re.sub(r"\*\*(.*?)\*\*", r"\1", text)
    text = re.sub(r"(?m)^\|.*\|$", " ", text)
    text = re.sub(r"(?m)^\s*[-:| ]+\s*$", " ", text)
    text = re.sub(r"\d+\.\s*", "", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def source_text(markdown_path: Path) -> str:
    sections = parse_sections(markdown_path.read_text(encoding="utf-8"))
    return " ".join(plain_text(sections[title]) for title in PODCAST_ORDER if title in sections)


def split_long_text(text: str, max_chars: int = 46) -> list[str]:
    text = text.strip()
    if len(text) <= max_chars:
        return [text]

    chunks: list[str] = []
    current = ""
    for char in text:
        current += char
        if char in "。！？；，、" and len(current) >= max_chars * 0.55:
            chunks.append(current.strip())
            current = ""
        elif len(current) >= max_chars:
            chunks.append(current.strip())
            current = ""
    if current.strip():
        chunks.append(current.strip())
    return chunks


def split_to_count(text: str, count: int) -> list[str]:
    if count <= 1:
        return [text.strip()]

    chunks: list[str] = []
    start = 0
    punctuation = "。！？；，、"
    for index in range(1, count):
        ideal = round(len(text) * index / count)
        lower = max(start + 12, ideal - 18)
        upper = min(len(text) - 1, ideal + 22)
        candidates = [
            position + 1
            for position in range(lower, upper)
            if text[position] in punctuation
        ]
        end = min(candidates, key=lambda position: abs(position - ideal)) if candidates else ideal
        if end <= start:
            end = min(len(text), start + max(1, round(len(text) / count)))
        chunks.append(text[start:end].strip())
        start = end

    chunks.append(text[start:].strip())
    return chunks


def timing_ranges(segments: list[dict[str, object]], desired_count: int) -> list[dict[str, float]]:
    speech_segments = [
        {
            "start": float(segment["start"]),
            "end": float(segment["end"]),
            "duration": max(0.1, float(segment["end"]) - float(segment["start"])),
        }
        for segment in segments
        if str(segment["text"]).strip()
    ]
    total_duration = sum(segment["duration"] for segment in speech_segments)
    if not speech_segments or total_duration <= 0:
        return []

    allocations = [
        max(1, int(segment["duration"] / total_duration * desired_count))
        for segment in speech_segments
    ]
    while sum(allocations) < desired_count:
        index = max(
            range(len(speech_segments)),
            key=lambda i: speech_segments[i]["duration"] / allocations[i],
        )
        allocations[index] += 1
    while sum(allocations) > desired_count:
        candidates = [i for i, allocation in enumerate(allocations) if allocation > 1]
        if not candidates:
            break
        index = min(
            candidates,
            key=lambda i: speech_segments[i]["duration"] / allocations[i],
        )
        allocations[index] -= 1

    ranges: list[dict[str, float]] = []
    for segment, allocation in zip(speech_segments, allocations):
        start = segment["start"]
        end = segment["end"]
        duration = segment["duration"]
        chunk_duration = duration / allocation
        for chunk_index in range(allocation):
            chunk_start = start + chunk_index * chunk_duration
            chunk_end = end if chunk_index == allocation - 1 else start + (chunk_index + 1) * chunk_duration
            ranges.append({"start": chunk_start, "end": chunk_end})
    return ranges


def write_srt_from_ranges(ranges: list[dict[str, float]], texts: list[str], path: Path) -> None:
    lines: list[str] = []
    for index, (time_range, text) in enumerate(zip(ranges, texts), start=1):
        lines.extend([
            str(index),
            f"{srt_time(time_range['start'])} --> {srt_time(time_range['end'])}",
            text,
            "",
        ])
    path.write_text("\n".join(lines), encoding="utf-8")


def transcribe(audio_path: Path, markdown_path: Path, output_path: Path, model_name: str) -> None:
    model = WhisperModel(model_name, device="cpu", compute_type="int8")
    segments, info = model.transcribe(
        str(audio_path),
        language="zh",
        task="transcribe",
        beam_size=5,
        vad_filter=True,
        vad_parameters={"min_silence_duration_ms": 350},
        initial_prompt=(
            "以下是繁體中文辯論 Podcast，請使用繁體中文標點。"
            "主題包含死刑、司法錯誤、生命權、被害人支持、法治信任。"
        ),
    )
    materialized = [
        {"start": segment.start, "end": segment.end, "text": segment.text}
        for segment in segments
    ]
    clean_source = source_text(markdown_path)
    desired_count = max(len(materialized), math.ceil(len(clean_source) / 42))
    ranges = timing_ranges(materialized, desired_count)
    clean_texts = split_to_count(clean_source, len(ranges))
    asr_output_path = output_path.with_name("captions-asr-raw.srt")
    write_srt_from_ranges(ranges, split_to_count(" ".join(str(s["text"]).strip() for s in materialized), len(ranges)), asr_output_path)
    write_srt_from_ranges(ranges, clean_texts, output_path)
    print(f"Detected language: {info.language} ({info.language_probability:.2f})")
    print(f"Wrote {len(ranges)} caption item(s) to {output_path}")
    print(f"Raw ASR text backup: {asr_output_path}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("slug", help="Debate slug, for example death-penalty")
    parser.add_argument("--model", default="small", help="faster-whisper model size or path")
    args = parser.parse_args()

    debate_dir = ROOT / "debates" / args.slug
    audio_path = debate_dir / "podcast" / "debate-podcast.mp3"
    output_dir = debate_dir / "video" / "output"
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / "captions.srt"

    transcribe(audio_path, debate_dir / "debate.md", output_path, args.model)


if __name__ == "__main__":
    main()
