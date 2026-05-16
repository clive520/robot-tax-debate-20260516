import asyncio
import re
from pathlib import Path

import edge_tts


ROOT = Path(__file__).resolve().parent
MARKDOWN = ROOT / "debate.md"
AUDIO_DIR = ROOT / "audio"

SECTIONS = [
    {
        "title": "正方申論",
        "file": "positive-opening.mp3",
        "voice": "zh-TW-YunJheNeural",
        "rate": "+0%",
        "pitch": "+0Hz",
    },
    {
        "title": "反方申論",
        "file": "negative-opening.mp3",
        "voice": "zh-TW-HsiaoChenNeural",
        "rate": "+3%",
        "pitch": "+2Hz",
    },
    {
        "title": "正方駁論",
        "file": "positive-rebuttal.mp3",
        "voice": "zh-TW-YunJheNeural",
        "rate": "+0%",
        "pitch": "+0Hz",
    },
    {
        "title": "反方駁論",
        "file": "negative-rebuttal.mp3",
        "voice": "zh-TW-HsiaoChenNeural",
        "rate": "+3%",
        "pitch": "+2Hz",
    },
    {
        "title": "反方結辯",
        "file": "negative-closing.mp3",
        "voice": "zh-TW-HsiaoChenNeural",
        "rate": "+3%",
        "pitch": "+2Hz",
    },
    {
        "title": "正方結辯",
        "file": "positive-closing.mp3",
        "voice": "zh-TW-YunJheNeural",
        "rate": "+0%",
        "pitch": "+0Hz",
    },
    {
        "title": "Claude 評審結果",
        "file": "judge.mp3",
        "voice": "zh-TW-HsiaoYuNeural",
        "rate": "-5%",
        "pitch": "-2Hz",
    },
]


def plain_text(markdown: str) -> str:
    text = re.sub(r"(?m)^#+\s*", "", markdown)
    text = re.sub(r"\*\*(.*?)\*\*", r"\1", text)
    text = re.sub(r"\|", " ", text)
    text = re.sub(r"[-:]{3,}", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def parse_sections(markdown: str) -> dict[str, str]:
    matches = re.finditer(r"(?ms)^##\s+(.+?)\r?\n(.*?)(?=^##\s+|\Z)", markdown)
    return {match.group(1).strip(): match.group(2).strip() for match in matches}


async def synthesize(section: dict[str, str], body: str) -> None:
    output = AUDIO_DIR / section["file"]
    communicate = edge_tts.Communicate(
        plain_text(body),
        voice=section["voice"],
        rate=section["rate"],
        pitch=section["pitch"],
    )
    await communicate.save(str(output))
    print(f"Generated {output.name} with {section['voice']}")


async def main() -> None:
    AUDIO_DIR.mkdir(exist_ok=True)
    sections = parse_sections(MARKDOWN.read_text(encoding="utf-8"))
    for section in SECTIONS:
      body = sections.get(section["title"])
      if not body:
          raise RuntimeError(f"Missing section: {section['title']}")
      await synthesize(section, body)


if __name__ == "__main__":
    asyncio.run(main())
