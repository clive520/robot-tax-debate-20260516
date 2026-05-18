import argparse
import json
import math
import re
import shutil
import subprocess
import tempfile
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

DEFAULT_PODCAST_ORDER = [
    ("正方申論", "正方 Claude"),
    ("反方申論", "反方 Gemini"),
    ("正方駁論", "正方 Claude"),
    ("反方駁論", "反方 Gemini"),
    ("反方結辯", "反方 Gemini"),
    ("正方結辯", "正方 Claude"),
]

DEFAULT_VISUAL_CUES = [
    {
        "section": "正方申論",
        "label": "司法錯誤不可逆",
        "kicker": "生命權與國家權力",
        "visual": "files",
        "dark": (28, 36, 46),
        "accent": (164, 133, 82),
    },
    {
        "section": "反方申論",
        "label": "最嚴重犯罪的最後界線",
        "kicker": "應報正義與社會信任",
        "visual": "gavel",
        "dark": (38, 35, 42),
        "accent": (148, 93, 74),
    },
    {
        "section": "正方駁論",
        "label": "更小心不能消除錯殺",
        "kicker": "程序風險",
        "visual": "court",
        "dark": (30, 42, 55),
        "accent": (91, 132, 146),
    },
    {
        "section": "反方駁論",
        "label": "改革與保留的折衷路線",
        "kicker": "制度穩定",
        "visual": "meeting",
        "dark": (42, 44, 40),
        "accent": (150, 125, 82),
    },
    {
        "section": "反方結辯",
        "label": "限縮死刑，而非立即廢除",
        "kicker": "法治信任",
        "visual": "bars",
        "dark": (34, 39, 47),
        "accent": (112, 125, 139),
    },
    {
        "section": "正方結辯",
        "label": "國家可以嚴厲，但不必殺人",
        "kicker": "制度轉型",
        "visual": "candle",
        "dark": (39, 36, 45),
        "accent": (184, 147, 90),
    },
]

DEBATE_CONFIGS = {
    "death-penalty": {
        "positive_speaker": "正方 Claude",
        "negative_speaker": "反方 Gemini",
        "visual_cues": DEFAULT_VISUAL_CUES,
    },
    "school-phone": {
        "topic": "學校是否應全面禁止學生帶手機到學校",
        "positive_speaker": "正方 Codex",
        "negative_speaker": "反方 Gemini",
        "visual_cues": [
            {
                "section": "正方申論",
                "label": "讓學習重新安靜下來",
                "kicker": "專注與校園秩序",
                "visual": "phone",
                "dark": (28, 44, 48),
                "accent": (68, 126, 112),
            },
            {
                "section": "反方申論",
                "label": "禁止不是數位素養",
                "kicker": "引導與自律",
                "visual": "classroom",
                "dark": (42, 44, 38),
                "accent": (150, 116, 68),
            },
            {
                "section": "正方駁論",
                "label": "教學科技不等於私人手機",
                "kicker": "工具與干擾的界線",
                "visual": "devices",
                "dark": (31, 45, 58),
                "accent": (83, 132, 154),
            },
            {
                "section": "反方駁論",
                "label": "通勤安全不能被流程取代",
                "kicker": "即時聯繫",
                "visual": "route",
                "dark": (48, 39, 45),
                "accent": (157, 89, 89),
            },
            {
                "section": "反方結辯",
                "label": "讓規範取代禁令",
                "kicker": "教育現場",
                "visual": "dialogue",
                "dark": (39, 45, 46),
                "accent": (128, 128, 82),
            },
            {
                "section": "正方結辯",
                "label": "未成熟的學生需要清楚邊界",
                "kicker": "公平與安全",
                "visual": "shield",
                "dark": (38, 42, 52),
                "accent": (90, 119, 158),
            },
        ],
    },
    "euthanasia": {
        "topic": "我國應將「積極安樂死」合法化",
        "positive_speaker": "正方 Codex",
        "negative_speaker": "反方 Gemini",
        "visual_cues": [
            {
                "section": "正方申論",
                "label": "尊嚴不是只剩忍耐",
                "kicker": "病人自主",
                "visual": "candle",
                "dark": (38, 39, 47),
                "accent": (166, 135, 92),
            },
            {
                "section": "反方申論",
                "label": "合法死亡會壓迫弱勢",
                "kicker": "生命價值",
                "visual": "shield",
                "dark": (45, 38, 42),
                "accent": (147, 82, 84),
            },
            {
                "section": "正方駁論",
                "label": "制度化比地下化更透明",
                "kicker": "嚴格審查",
                "visual": "files",
                "dark": (31, 47, 54),
                "accent": (85, 132, 134),
            },
            {
                "section": "反方駁論",
                "label": "拒絕醫療不等於加工致死",
                "kicker": "醫療倫理",
                "visual": "meeting",
                "dark": (39, 42, 48),
                "accent": (138, 116, 86),
            },
            {
                "section": "反方結辯",
                "label": "先承接痛苦，而非授權死亡",
                "kicker": "安寧與長照",
                "visual": "dialogue",
                "dark": (42, 45, 43),
                "accent": (112, 130, 104),
            },
            {
                "section": "正方結辯",
                "label": "最後選擇必須有限且透明",
                "kicker": "尊嚴出口",
                "visual": "court",
                "dark": (33, 40, 54),
                "accent": (98, 121, 156),
            },
        ],
    },
    "robot-tax": {
        "topic": "我國應開徵「機器人稅」以因應 AI 造成的失業問題",
        "positive_speaker": "正方 Codex",
        "negative_speaker": "反方 Gemini",
        "visual_cues": [
            {
                "section": "正方申論",
                "label": "讓技術紅利回流社會",
                "kicker": "轉型成本",
                "visual": "files",
                "dark": (30, 42, 50),
                "accent": (92, 142, 152),
            },
            {
                "section": "反方申論",
                "label": "創新不該被懲罰",
                "kicker": "產業競爭力",
                "visual": "devices",
                "dark": (42, 38, 48),
                "accent": (142, 106, 170),
            },
            {
                "section": "正方駁論",
                "label": "公平與效率可以並存",
                "kicker": "責任型創新",
                "visual": "court",
                "dark": (32, 48, 54),
                "accent": (88, 146, 120),
            },
            {
                "section": "反方駁論",
                "label": "定義模糊會誤傷升級",
                "kicker": "政策執行",
                "visual": "meeting",
                "dark": (48, 40, 42),
                "accent": (158, 102, 88),
            },
            {
                "section": "反方結辯",
                "label": "用既有稅制支持轉職",
                "kicker": "替代方案",
                "visual": "dialogue",
                "dark": (42, 45, 48),
                "accent": (136, 126, 84),
            },
            {
                "section": "正方結辯",
                "label": "誰受益，誰分攤",
                "kicker": "社會契約",
                "visual": "shield",
                "dark": (34, 42, 55),
                "accent": (92, 118, 164),
            },
        ],
    },
    "minimum-wage": {
        "topic": "台灣應大幅調高基本工資以解決低薪問題",
        "positive_speaker": "正方 Codex / OpenAI",
        "negative_speaker": "反方 Claude",
        "visual_cues": [
            {
                "section": "正方申論",
                "label": "讓全職工作撐起基本生活",
                "kicker": "薪資底線",
                "visual": "files",
                "dark": (34, 45, 50),
                "accent": (90, 145, 132),
            },
            {
                "section": "反方申論",
                "label": "低薪不是單一底線問題",
                "kicker": "結構改革",
                "visual": "meeting",
                "dark": (45, 40, 48),
                "accent": (138, 112, 166),
            },
            {
                "section": "正方駁論",
                "label": "底線提高才有改革起點",
                "kicker": "薪資外溢",
                "visual": "shield",
                "dark": (32, 46, 57),
                "accent": (88, 125, 166),
            },
            {
                "section": "反方駁論",
                "label": "政策鈍器可能誤傷弱勢",
                "kicker": "就業風險",
                "visual": "dialogue",
                "dark": (48, 42, 39),
                "accent": (166, 112, 82),
            },
            {
                "section": "反方結辯",
                "label": "用精準工具重建市場",
                "kicker": "替代方案",
                "visual": "route",
                "dark": (42, 45, 48),
                "accent": (118, 132, 92),
            },
            {
                "section": "正方結辯",
                "label": "沒有底線，改革會漂浮",
                "kicker": "工作尊嚴",
                "visual": "court",
                "dark": (36, 42, 55),
                "accent": (98, 124, 170),
            },
        ],
    },
}


def debate_config(slug: str) -> dict[str, object]:
    return DEBATE_CONFIGS.get(slug, DEBATE_CONFIGS["death-penalty"])


def podcast_order_for(slug: str) -> list[tuple[str, str]]:
    config = debate_config(slug)
    positive_speaker = str(config.get("positive_speaker", "正方 Claude"))
    negative_speaker = str(config.get("negative_speaker", "反方 Gemini"))
    order = []
    for title, speaker in DEFAULT_PODCAST_ORDER:
        if title.startswith("正方"):
            order.append((title, positive_speaker))
        elif title.startswith("反方"):
            order.append((title, negative_speaker))
        else:
            order.append((title, speaker))
    return order


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    path = FONT_BOLD if bold and FONT_BOLD.exists() else FONT_REGULAR
    return ImageFont.truetype(str(path), size=size)


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


def split_chunks(text: str, max_chars: int = 38) -> list[str]:
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
                parts = [sentence[i:i + max_chars] for i in range(0, len(sentence), max_chars)]
                chunks.extend(parts[:-1])
                current = parts[-1]
        if len(current) >= max_chars * 0.9:
            chunks.append(current)
            current = ""
    if current:
        chunks.append(current)
    return chunks


def srt_time(seconds: float) -> str:
    ms = int(round(seconds * 1000))
    hours, ms = divmod(ms, 3_600_000)
    minutes, ms = divmod(ms, 60_000)
    secs, ms = divmod(ms, 1000)
    return f"{hours:02}:{minutes:02}:{secs:02},{ms:03}"


def make_srt_captions(sections: dict[str, str], duration: float) -> list[dict[str, object]]:
    raw: list[dict[str, object]] = []
    for title, speaker in DEFAULT_PODCAST_ORDER:
        body = plain_text(sections[title])
        for chunk in split_chunks(body):
            raw.append({
                "speaker": speaker,
                "section": title,
                "text": chunk,
                "weight": max(10, len(chunk)),
            })

    total_weight = sum(item["weight"] for item in raw)
    cursor = 0.0
    captions = []
    for index, item in enumerate(raw):
        segment_duration = duration * item["weight"] / total_weight
        end = duration if index == len(raw) - 1 else cursor + segment_duration
        captions.append({
            "start": cursor,
            "end": end,
            "speaker": item["speaker"],
            "section": item["section"],
            "text": item["text"],
        })
        cursor = end
    return captions


def write_srt(captions: list[dict[str, object]], path: Path, include_speaker: bool = True) -> None:
    lines = []
    for index, caption in enumerate(captions, start=1):
        text = str(caption["text"])
        if include_speaker and caption.get("speaker"):
            text = f"{caption['speaker']}：{text}"
        lines.extend([
            str(index),
            f"{srt_time(float(caption['start']))} --> {srt_time(float(caption['end']))}",
            text,
            "",
        ])
    path.write_text("\n".join(lines), encoding="utf-8")


def interpolate(a: tuple[int, int, int], b: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


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


def draw_background(draw: ImageDraw.ImageDraw, base: Image.Image, cue: dict[str, object], frame_index: int) -> None:
    dark = cue["dark"]
    accent = cue["accent"]
    assert isinstance(dark, tuple) and isinstance(accent, tuple)
    for y in range(HEIGHT):
        t = y / HEIGHT
        color = interpolate(dark, accent, t * 0.55)
        draw.line([(0, y), (WIDTH, y)], fill=color)

    drift = math.sin(frame_index / 15) * 28
    for i in range(8):
        x = int((i * 180 + drift * (i % 3 + 1)) % (WIDTH + 260)) - 130
        y = 80 + (i % 4) * 135
        radius = 110 + (i % 3) * 42
        overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
        od = ImageDraw.Draw(overlay)
        od.ellipse((x - radius, y - radius, x + radius, y + radius), fill=(*accent, 25))
        base.alpha_composite(overlay.filter(ImageFilter.GaussianBlur(20)))

    line_color = (*interpolate(accent, (245, 238, 220), 0.48), 88)
    for x in range(-100, WIDTH + 220, 120):
        draw.line([(x + drift, HEIGHT), (x + 300 + drift, 0)], fill=line_color, width=1)


def draw_host(draw: ImageDraw.ImageDraw, frame_index: int) -> None:
    x, y = 1080, 230
    bob = int(math.sin(frame_index / 5) * 5)
    draw.rounded_rectangle((x - 72, y + 100 + bob, x + 72, y + 248 + bob), radius=36, fill=(219, 211, 195, 238))
    draw.ellipse((x - 82, y - 62 + bob, x + 82, y + 102 + bob), fill=(239, 231, 214, 255))
    draw.ellipse((x - 36, y - 2 + bob, x - 20, y + 14 + bob), fill=(34, 38, 44, 255))
    draw.ellipse((x + 20, y - 2 + bob, x + 36, y + 14 + bob), fill=(34, 38, 44, 255))
    mouth_open = abs(math.sin(frame_index / 3)) > 0.55
    if mouth_open:
        draw.ellipse((x - 20, y + 42 + bob, x + 20, y + 66 + bob), fill=(96, 50, 56, 255))
    else:
        draw.arc((x - 22, y + 36 + bob, x + 22, y + 62 + bob), 0, 180, fill=(96, 50, 56, 255), width=4)
    draw.arc((x - 58, y - 34 + bob, x + 58, y + 64 + bob), 202, 338, fill=(140, 104, 62, 255), width=8)
    draw.rounded_rectangle((x - 120, y + 220 + bob, x + 120, y + 258 + bob), radius=19, fill=(63, 73, 78, 235))


def draw_section_badge(draw: ImageDraw.ImageDraw, current_section: str, current_speaker: str) -> None:
    x0, y0, x1, y1 = 934, 494, 1232, 602
    title_font = load_font(17, bold=True)
    speaker_font = load_font(25, bold=True)
    section_font = load_font(34, bold=True)
    draw.rounded_rectangle((x0, y0, x1, y1), radius=24, fill=(0, 0, 0, 132), outline=(255, 255, 255, 76), width=2)
    draw.text((x0 + 24, y0 + 11), "目前發言", fill=(238, 219, 178, 230), font=title_font)
    speaker_width = draw.textlength(current_speaker, font=speaker_font)
    draw.text((x0 + (x1 - x0 - speaker_width) / 2, y0 + 31), current_speaker, fill=(242, 212, 154, 255), font=speaker_font)
    text_width = draw.textlength(current_section, font=section_font)
    draw.text((x0 + (x1 - x0 - text_width) / 2, y0 + 64), current_section, fill=(255, 255, 255, 255), font=section_font)


def draw_visual(draw: ImageDraw.ImageDraw, cue: dict[str, object], frame_index: int) -> None:
    x0, y0, x1, y1 = 68, 194, 705, 482
    draw.rounded_rectangle((x0, y0, x1, y1), radius=26, fill=(0, 0, 0, 82), outline=(255, 255, 255, 92), width=2)
    visual = str(cue["visual"])
    color = (245, 232, 202, 224)
    muted = (255, 255, 255, 80)

    if visual == "gavel":
        draw.rounded_rectangle((226, 322, 510, 354), radius=12, fill=color)
        draw.rounded_rectangle((378, 250, 452, 328), radius=14, fill=color)
        draw.rounded_rectangle((350, 236, 480, 260), radius=12, fill=color)
        draw.rounded_rectangle((344, 326, 486, 352), radius=12, fill=color)
        draw.line((456, 348, 596, 438), fill=color, width=18)
    elif visual == "files":
        for i in range(4):
            ox = 120 + i * 54
            oy = 270 + i * 20
            draw.rounded_rectangle((ox, oy, ox + 250, oy + 138), radius=10, fill=(235, 226, 206, 210), outline=muted, width=2)
            draw.line((ox + 30, oy + 48, ox + 205, oy + 48), fill=(62, 68, 74, 170), width=4)
            draw.line((ox + 30, oy + 76, ox + 190, oy + 76), fill=(62, 68, 74, 140), width=3)
    elif visual == "court":
        draw.polygon([(180, 374), (386, 252), (592, 374)], fill=color)
        for i in range(5):
            x = 220 + i * 84
            draw.rectangle((x, 374, x + 32, 466), fill=color)
        draw.rectangle((170, 466, 604, 488), fill=color)
        draw.line((180, 374, 592, 374), fill=(255, 255, 255, 185), width=4)
    elif visual == "meeting":
        draw.ellipse((190, 274, 250, 334), fill=color)
        draw.ellipse((514, 274, 574, 334), fill=color)
        draw.ellipse((352, 244, 422, 314), fill=color)
        draw.rounded_rectangle((160, 366, 604, 430), radius=32, fill=(245, 232, 202, 170))
        for x in (230, 382, 532):
            draw.line((x, 336, x, 366), fill=color, width=10)
    elif visual == "bars":
        for x in range(170, 610, 76):
            draw.rounded_rectangle((x, 246, x + 20, 486), radius=10, fill=color)
        draw.rectangle((150, 316, 640, 336), fill=(245, 232, 202, 160))
        draw.rectangle((150, 414, 640, 434), fill=(245, 232, 202, 160))
    elif visual == "candle":
        draw.ellipse((336, 446, 472, 482), fill=(245, 232, 202, 120))
        draw.rounded_rectangle((360, 310, 448, 456), radius=18, fill=(238, 224, 196, 230))
        flame = abs(math.sin(frame_index / 4)) * 10
        draw.ellipse((382 - flame / 2, 240, 426 + flame / 2, 318), fill=(255, 206, 103, 230))
        draw.ellipse((396, 266, 414, 306), fill=(255, 246, 202, 240))
    elif visual == "phone":
        draw.rounded_rectangle((310, 232, 466, 470), radius=28, fill=color)
        draw.rounded_rectangle((332, 268, 444, 420), radius=12, fill=(38, 50, 54, 210))
        draw.ellipse((378, 436, 398, 456), fill=(38, 50, 54, 210))
        for i in range(4):
            draw.arc((210 - i * 18, 248 - i * 18, 374 + i * 18, 412 + i * 18), 300, 52, fill=muted, width=5)
    elif visual == "classroom":
        draw.rectangle((160, 250, 620, 382), fill=(42, 60, 55, 210), outline=color, width=6)
        draw.line((190, 292, 430, 292), fill=color, width=5)
        draw.line((190, 326, 536, 326), fill=color, width=5)
        for x in (210, 382, 552):
            draw.rounded_rectangle((x, 420, x + 86, 464), radius=12, fill=color)
            draw.line((x + 12, 464, x - 14, 500), fill=color, width=6)
            draw.line((x + 74, 464, x + 100, 500), fill=color, width=6)
    elif visual == "devices":
        draw.rounded_rectangle((170, 280, 426, 430), radius=16, fill=color)
        draw.rectangle((198, 306, 398, 390), fill=(36, 46, 58, 200))
        draw.rounded_rectangle((478, 250, 590, 452), radius=24, fill=color)
        draw.rectangle((496, 286, 572, 408), fill=(36, 46, 58, 200))
        draw.line((146, 470, 626, 470), fill=color, width=10)
    elif visual == "route":
        draw.line((180, 430, 320, 300, 470, 392, 606, 260), fill=color, width=12)
        for x, y in ((180, 430), (320, 300), (470, 392), (606, 260)):
            draw.ellipse((x - 22, y - 22, x + 22, y + 22), fill=(255, 246, 202, 238))
        draw.rounded_rectangle((250, 224, 348, 370), radius=18, fill=color)
        draw.rectangle((268, 252, 330, 334), fill=(39, 45, 50, 210))
    elif visual == "dialogue":
        draw.rounded_rectangle((160, 260, 390, 358), radius=24, fill=color)
        draw.polygon([(240, 358), (270, 358), (246, 394)], fill=color)
        draw.rounded_rectangle((390, 330, 620, 428), radius=24, fill=(245, 232, 202, 176))
        draw.polygon([(532, 428), (562, 428), (586, 464)], fill=(245, 232, 202, 176))
        for x in (208, 250, 292, 438, 480, 522):
            draw.ellipse((x, 304 if x < 390 else 374, x + 14, 318 if x < 390 else 388), fill=(46, 48, 50, 180))
    elif visual == "shield":
        draw.polygon([(386, 232), (548, 286), (520, 430), (386, 500), (252, 430), (224, 286)], fill=color)
        draw.line((312, 360, 368, 416, 470, 306), fill=(45, 55, 66, 220), width=14)


def cue_at(second: float, duration: float, visual_cues: list[dict[str, object]]) -> dict[str, object]:
    index = min(len(visual_cues) - 1, int(second / duration * len(visual_cues)))
    return visual_cues[index]


def short_speaker_name(speaker: str) -> str:
    if "Codex" in speaker or "OpenAI" in speaker:
        return "OpenAI"
    if "Gemini" in speaker:
        return "Gemini"
    if "Claude" in speaker:
        return "Claude"
    if "Grok" in speaker:
        return "Grok"
    if "DeepSeek" in speaker:
        return "DeepSeek"
    if "Copilot" in speaker:
        return "Copilot"
    return speaker.replace("正方 ", "").replace("反方 ", "").replace("裁判 ", "")


def caption_state_at(captions: list[dict[str, object]], second: float) -> tuple[str, str]:
    for caption in captions:
        if float(caption["start"]) <= second < float(caption["end"]):
            return str(caption["section"]), short_speaker_name(str(caption.get("speaker", "")))
    last_caption = captions[-1]
    return str(last_caption["section"]), short_speaker_name(str(last_caption.get("speaker", "")))


def load_synced_captions(path: Path) -> list[dict[str, object]] | None:
    if not path.exists():
        return None
    data = json.loads(path.read_text(encoding="utf-8"))
    return list(data["items"])


def render_frame(path: Path, frame_index: int, topic: str, duration: float, cue: dict[str, object], current_section: str, current_speaker: str) -> None:
    img = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 255))
    draw = ImageDraw.Draw(img)
    draw_background(draw, img, cue, frame_index)

    title_font = load_font(44, bold=True)
    meta_font = load_font(23)
    label_font = load_font(40, bold=True)
    kicker_font = load_font(25, bold=True)

    draw.rounded_rectangle((58, 56, 800, 164), radius=22, fill=(0, 0, 0, 96))
    draw.text((84, 74), topic, fill=(255, 255, 255, 255), font=title_font)
    draw.text((86, 130), "Podcast Video｜AI Debate Archive", fill=(236, 226, 208, 230), font=meta_font)

    draw_visual(draw, cue, frame_index)
    draw.rounded_rectangle((86, 412, 680, 462), radius=20, fill=(0, 0, 0, 106))
    draw.text((112, 422), str(cue["kicker"]), fill=(242, 212, 154, 255), font=kicker_font)

    draw.rounded_rectangle((118, 494, 900, 570), radius=28, fill=(0, 0, 0, 142), outline=(255, 255, 255, 72), width=2)
    lines = wrap_text(draw, str(cue["label"]), label_font, 700)
    draw.text((150, 512), lines[0], fill=(255, 255, 255, 255), font=label_font)

    progress = (frame_index / FPS) / duration
    draw.rounded_rectangle((84, 176, 800, 188), radius=6, fill=(255, 255, 255, 54))
    draw.rounded_rectangle((84, 176, 84 + int(716 * progress), 188), radius=6, fill=(238, 210, 151, 230))

    draw_host(draw, frame_index)
    draw_section_badge(draw, current_section, current_speaker)

    img.convert("RGB").save(path, quality=92)


def make_video(slug: str) -> None:
    debate_dir = ROOT / "debates" / slug
    config = debate_config(slug)
    podcast = debate_dir / "podcast" / "debate-podcast.mp3"
    markdown = debate_dir / "debate.md"
    output_dir = debate_dir / "video" / "output"
    output_dir.mkdir(parents=True, exist_ok=True)
    frame_dir = Path(tempfile.mkdtemp(prefix=f"{slug}-frames-{int(time.time())}-"))

    source = markdown.read_text(encoding="utf-8")
    sections = parse_sections(source)
    duration = MP3(podcast).info.length
    synced_manifest = debate_dir / "podcast" / "captions-source.json"
    captions = load_synced_captions(synced_manifest) or make_srt_captions(sections, duration)
    srt_path = output_dir / "captions.srt"
    write_srt(captions, srt_path, include_speaker=not synced_manifest.exists())

    topic = str(config.get("topic") or source.splitlines()[0].lstrip("# ").strip())
    visual_cues = list(config.get("visual_cues", DEFAULT_VISUAL_CUES))
    total_frames = math.ceil(duration)
    for frame_index in range(total_frames):
        second = frame_index
        cue = cue_at(second, duration, visual_cues)
        current_section, current_speaker = caption_state_at(captions, second)
        render_frame(frame_dir / f"frame_{frame_index:05}.jpg", frame_index * FPS, topic, duration, cue, current_section, current_speaker)

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
            f"- YouTube 字幕檔：`{srt_path.relative_to(ROOT)}`",
            f"- 影片：`{final_video.relative_to(ROOT)}`",
            f"- 長度：約 {duration:.1f} 秒",
            "- 影片不燒逐字字幕，只呈現段落重點、視覺畫面、AI 主持人與進度列。",
            "- 上傳 YouTube 時，請將 `captions.srt` 作為字幕檔一併上傳。",
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
