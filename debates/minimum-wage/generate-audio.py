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
        "rate": "-1%",
        "pitch": "-1Hz",
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
        "rate": "-1%",
        "pitch": "-1Hz",
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
        "rate": "-1%",
        "pitch": "-1Hz",
    },
    {
        "title": "DeepSeek 評審結果",
        "file": "judge.mp3",
        "voice": "zh-TW-HsiaoYuNeural",
        "rate": "-3%",
        "pitch": "-2Hz",
    },
]


def parse_sections(markdown: str) -> dict[str, str]:
    sections: dict[str, str] = {}
    current = ""
    body: list[str] = []
    for line in markdown.splitlines():
        match = re.match(r"^##\s+(.+)$", line)
        if match:
            if current:
                sections[current] = "\n".join(body).strip()
            current = match.group(1).strip()
            body = []
        elif current:
            body.append(line)
    if current:
        sections[current] = "\n".join(body).strip()
    return sections


def plain_text(markdown: str) -> str:
    text = re.sub(r"(?m)^#+\s*", "", markdown)
    text = re.sub(r"\*\*(.*?)\*\*", r"\1", text)
    text = re.sub(r"(?m)^\|.*\|$", " ", text)
    text = re.sub(r"(?m)^\s*[-:| ]+\s*$", " ", text)
    text = re.sub(r"\d+\.\s*", "", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


async def synthesize(output: Path, text: str, voice: str, rate: str, pitch: str) -> None:
    communicate = edge_tts.Communicate(
        plain_text(text),
        voice=voice,
        rate=rate,
        pitch=pitch,
    )
    await communicate.save(str(output))
    print(f"Generated {output.name}")


async def main() -> None:
    AUDIO_DIR.mkdir(exist_ok=True)
    sections = parse_sections(MARKDOWN.read_text(encoding="utf-8"))
    for section in SECTIONS:
        body = sections.get(section["title"])
        if not body:
            raise RuntimeError(f"Missing section: {section['title']}")
        await synthesize(
            AUDIO_DIR / section["file"],
            body,
            section["voice"],
            section["rate"],
            section["pitch"],
        )


if __name__ == "__main__":
    asyncio.run(main())
