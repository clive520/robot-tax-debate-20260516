import argparse
import math
import re
import shutil
import subprocess
import time
from pathlib import Path

import imageio_ffmpeg
from mutagen.mp3 import MP3
from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
FONT_REGULAR = Path("C:/Windows/Fonts/NotoSansTC-VF.ttf")
FONT_BOLD = Path("C:/Windows/Fonts/msjhbd.ttc")
WIDTH = 1280
HEIGHT = 720
FPS = 24

PODCAST_ORDER = [
    ("正方申論", "正方 Claude"),
    ("反方申論", "反方 Gemini"),
    ("正方駁論", "正方 Claude"),
    ("反方駁論", "反方 Gemini"),
    ("反方結辯", "反方 Gemini"),
    ("正方結辯", "正方 Claude"),
]

SCENES = [
    ("Opening", "公共議題進入辯論場", (30, 38, 44), (129, 96, 58)),
    ("Justice", "生命權與國家刑罰", (36, 46, 61), (185, 156, 104)),
    ("Court", "司法判斷與程序風險", (41, 48, 55), (92, 122, 137)),
    ("Victims", "被害人支持與社會安全", (44, 54, 49), (164, 116, 96)),
    ("Deliberation", "政策選擇與制度轉型", (35, 42, 58), (118, 143, 120)),
    ("Closing", "回到法治與尊嚴", (38, 35, 47), (154, 128, 90)),
]


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    path = FONT_BOLD if bold and FONT_BOLD.exists() else FONT_REGULAR
    return ImageFont.truetype(str(path), size=size)


def parse_sections(markdown: str) -> dict[str, str]:
    matches = re.finditer(r"(?ms)^##\s+(.+?)\r?\n(.*?)(?=^##\s+|\Z)", markdown)
    return {match.group(1).strip(): match.group(2).strip() for match in matches}


def plain_text(markdown: str) -> str:
    text = re.sub(r"(?m)^#+\s*", "", markdown)
    text = re.sub(r"\*\*(.*?)\*\*", r"\1", text)
    text = re.sub(r"\|.*?\|", " ", text)
    text = re.sub(r"\d+\.\s*", "", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def split_chunks(text: str, max_chars: int = 42) -> list[str]:
    sentences = [part.strip() for part in re.split(r"(?<=[。！？；])", text) if part.strip()]
    chunks: list[str] = []
    current = ""
    for sentence in sentences:
        if len(current) + len(sentence) <= max_chars:
            current += sentence
        else:
            if current:
                chunks.append(current)
            if len(sentence) <= max_chars:
                current = sentence
            else:
                for i in range(0, len(sentence), max_chars):
                    part = sentence[i:i + max_chars]
                    if len(part) == max_chars:
                        chunks.append(part)
                    else:
                        current = part
        if len(current) >= max_chars * 0.8:
            chunks.append(current)
            current = ""
    if current:
        chunks.append(current)
    return chunks


def wrap_text(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont, max_width: int) -> list[str]:
    lines: list[str] = []
    current = ""
    for char in text:
        candidate = current + char
        if draw.textlength(candidate, font=font) <= max_width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = char
    if current:
        lines.append(current)
    return lines


def srt_time(seconds: float) -> str:
    ms = int(round(seconds * 1000))
    hours, ms = divmod(ms, 3600_000)
    minutes, ms = divmod(ms, 60_000)
    secs, ms = divmod(ms, 1000)
    return f"{hours:02}:{minutes:02}:{secs:02},{ms:03}"


def make_captions(sections: dict[str, str], duration: float) -> list[dict[str, object]]:
    raw: list[dict[str, object]] = []
    for title, speaker in PODCAST_ORDER:
        body = plain_text(sections[title])
        for chunk in split_chunks(body):
            raw.append({"speaker": speaker, "section": title, "text": chunk, "weight": max(8, len(chunk))})

    total_weight = sum(item["weight"] for item in raw)
    cursor = 0.0
    captions = []
    for index, item in enumerate(raw):
        segment_duration = duration * item["weight"] / total_weight
        if index == len(raw) - 1:
            end = duration
        else:
            end = cursor + segment_duration
        captions.append({
            "start": cursor,
            "end": end,
            "speaker": item["speaker"],
            "section": item["section"],
            "text": item["text"],
        })
        cursor = end
    return captions


def write_srt(captions: list[dict[str, object]], path: Path) -> None:
    lines = []
    for index, caption in enumerate(captions, start=1):
        lines.extend([
            str(index),
            f"{srt_time(caption['start'])} --> {srt_time(caption['end'])}",
            f"{caption['speaker']}：{caption['text']}",
            "",
        ])
    path.write_text("\n".join(lines), encoding="utf-8")


def interpolate(a: tuple[int, int, int], b: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def draw_background(draw: ImageDraw.ImageDraw, base: Image.Image, scene: tuple[str, str, tuple[int, int, int], tuple[int, int, int]], frame_index: int) -> None:
    _, _, dark, accent = scene
    for y in range(HEIGHT):
        t = y / HEIGHT
        color = interpolate(dark, accent, t * 0.52)
        draw.line([(0, y), (WIDTH, y)], fill=color)

    drift = math.sin(frame_index / 11) * 22
    for i in range(9):
        x = int((i * 170 + drift * (i % 3 + 1)) % (WIDTH + 220)) - 110
        y = 120 + (i % 4) * 110
        radius = 95 + (i % 3) * 36
        overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
        od = ImageDraw.Draw(overlay)
        od.ellipse((x - radius, y - radius, x + radius, y + radius), fill=(*accent, 24))
        base.alpha_composite(overlay.filter(ImageFilter.GaussianBlur(18)))

    line_color = (*interpolate(accent, (245, 238, 220), 0.45), 105)
    for x in range(-100, WIDTH + 200, 110):
        draw.line([(x + drift, HEIGHT), (x + 320 + drift, 0)], fill=line_color, width=1)


def draw_scales(draw: ImageDraw.ImageDraw, x: int, y: int, color: tuple[int, int, int, int]) -> None:
    draw.line((x, y, x, y + 155), fill=color, width=6)
    draw.line((x - 110, y + 45, x + 110, y + 45), fill=color, width=5)
    draw.line((x - 78, y + 45, x - 118, y + 118), fill=color, width=2)
    draw.line((x - 78, y + 45, x - 38, y + 118), fill=color, width=2)
    draw.arc((x - 128, y + 100, x - 28, y + 155), 0, 180, fill=color, width=4)
    draw.line((x + 78, y + 45, x + 38, y + 118), fill=color, width=2)
    draw.line((x + 78, y + 45, x + 118, y + 118), fill=color, width=2)
    draw.arc((x + 28, y + 100, x + 128, y + 155), 0, 180, fill=color, width=4)


def draw_host(draw: ImageDraw.ImageDraw, frame_index: int) -> None:
    x, y = 1080, 430
    bob = int(math.sin(frame_index / 5) * 4)
    draw.rounded_rectangle((x - 70, y + 78 + bob, x + 70, y + 210 + bob), radius=34, fill=(230, 221, 204, 230))
    draw.ellipse((x - 78, y - 74 + bob, x + 78, y + 82 + bob), fill=(239, 231, 214, 255))
    draw.ellipse((x - 34, y - 16 + bob, x - 18, y + bob), fill=(38, 42, 48, 255))
    draw.ellipse((x + 18, y - 16 + bob, x + 34, y + bob), fill=(38, 42, 48, 255))
    mouth_open = abs(math.sin(frame_index / 3)) > 0.56
    if mouth_open:
        draw.ellipse((x - 18, y + 26 + bob, x + 18, y + 48 + bob), fill=(94, 52, 56, 255))
    else:
        draw.arc((x - 22, y + 18 + bob, x + 22, y + 46 + bob), 0, 180, fill=(94, 52, 56, 255), width=4)
    draw.arc((x - 54, y - 46 + bob, x + 54, y + 50 + bob), 205, 335, fill=(139, 104, 62, 255), width=8)
    draw.rounded_rectangle((x - 118, y + 178 + bob, x + 118, y + 214 + bob), radius=18, fill=(68, 78, 82, 235))


def render_frame(path: Path, frame_index: int, current_caption: dict[str, object], topic: str, duration: float) -> None:
    scene = SCENES[min(len(SCENES) - 1, int(frame_index / max(1, duration) * len(SCENES)))]
    img = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 255))
    draw = ImageDraw.Draw(img)
    draw_background(draw, img, scene, frame_index)

    title_font = load_font(44, bold=True)
    meta_font = load_font(23)
    section_font = load_font(28, bold=True)
    caption_font = load_font(38, bold=True)
    small_font = load_font(19)

    draw.rounded_rectangle((58, 56, 780, 164), radius=22, fill=(0, 0, 0, 92))
    draw.text((84, 74), topic, fill=(255, 255, 255, 255), font=title_font)
    draw.text((86, 130), "Podcast Video｜AI Debate Archive", fill=(236, 226, 208, 230), font=meta_font)

    draw.rounded_rectangle((68, 226, 520, 414), radius=24, fill=(0, 0, 0, 76), outline=(255, 255, 255, 88), width=2)
    draw_scales(draw, 294, 246, (245, 232, 202, 225))
    draw.text((90, 364), scene[1], fill=(255, 246, 226, 245), font=section_font)

    progress = (frame_index / FPS) / duration
    draw.rounded_rectangle((80, 642, 1200, 654), radius=6, fill=(255, 255, 255, 54))
    draw.rounded_rectangle((80, 642, 80 + int(1120 * progress), 654), radius=6, fill=(238, 210, 151, 230))

    draw_host(draw, frame_index)
    draw.rounded_rectangle((726, 642, 1200, 680), radius=18, fill=(0, 0, 0, 70))
    draw.text((750, 649), "AI 主持人：字幕同步整理辯論重點", fill=(255, 255, 255, 230), font=small_font)

    caption_box = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    cd = ImageDraw.Draw(caption_box)
    cd.rounded_rectangle((118, 486, 1162, 618), radius=28, fill=(0, 0, 0, 142), outline=(255, 255, 255, 76), width=2)
    speaker = str(current_caption["speaker"])
    section = str(current_caption["section"])
    cd.text((152, 506), f"{speaker}｜{section}", fill=(242, 212, 154, 255), font=section_font)
    lines = wrap_text(cd, str(current_caption["text"]), caption_font, 940)[:2]
    for i, line in enumerate(lines):
        cd.text((152, 548 + i * 43), line, fill=(255, 255, 255, 255), font=caption_font)
    img.alpha_composite(caption_box)

    img.convert("RGB").save(path, quality=92)


def caption_at(captions: list[dict[str, object]], second: float) -> dict[str, object]:
    for caption in captions:
        if caption["start"] <= second < caption["end"]:
            return caption
    return captions[-1]


def make_video(slug: str) -> None:
    debate_dir = ROOT / "debates" / slug
    podcast = debate_dir / "podcast" / "debate-podcast.mp3"
    markdown = debate_dir / "debate.md"
    output_dir = debate_dir / "video" / "output"
    frame_dir = output_dir / f"frames-{int(time.time())}"
    output_dir.mkdir(parents=True, exist_ok=True)
    frame_dir.mkdir(parents=True)

    sections = parse_sections(markdown.read_text(encoding="utf-8"))
    duration = MP3(podcast).info.length
    captions = make_captions(sections, duration)
    srt_path = output_dir / "captions.srt"
    write_srt(captions, srt_path)

    topic = markdown.read_text(encoding="utf-8").splitlines()[0].lstrip("# ").strip()
    total_frames = math.ceil(duration)
    for frame_index in range(total_frames):
        caption = caption_at(captions, frame_index)
        render_frame(frame_dir / f"frame_{frame_index:05}.jpg", frame_index * FPS, caption, topic, duration)

    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    video_no_subs = output_dir / "visual-track.mp4"
    final_video = output_dir / "podcast-video.mp4"
    subprocess.run([
        ffmpeg,
        "-y",
        "-framerate", "1",
        "-i", str(frame_dir / "frame_%05d.jpg"),
        "-i", str(podcast),
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-r", str(FPS),
        "-vf", "scale=1280:720",
        "-c:a", "aac",
        "-b:a", "192k",
        "-shortest",
        str(video_no_subs),
    ], check=True)
    shutil.copyfile(video_no_subs, final_video)

    notes = output_dir / "video-notes.md"
    notes.write_text(
        "\n".join([
            f"# Podcast Video：{topic}",
            "",
            f"- 音訊來源：`{podcast.relative_to(ROOT)}`",
            f"- 字幕：`{srt_path.relative_to(ROOT)}`",
            f"- 影片：`{final_video.relative_to(ROOT)}`",
            f"- 長度：約 {duration:.1f} 秒",
            "- 視覺風格：原創司法題材背景、AI 主持人角色、中文字幕。",
            "- 注意：Podcast 影片只包含正反方辯論，不包含裁判評分。",
            "",
        ]),
        encoding="utf-8",
    )
    print(final_video)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("slug")
    args = parser.parse_args()
    make_video(args.slug)


if __name__ == "__main__":
    main()
