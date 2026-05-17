from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "debates" / "robot-tax" / "publishing"
PREVIEW = ROOT / "debates" / "robot-tax" / "video" / "output" / "preview-speaker-30s.jpg"
FONT_REGULAR = "C:/Windows/Fonts/NotoSansTC-VF.ttf"
FONT_BOLD = "C:/Windows/Fonts/msjhbd.ttc"


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(FONT_BOLD if bold else FONT_REGULAR, size=size)


def make_youtube_thumbnail(source: Image.Image) -> None:
    thumb = source.resize((1280, 720)).filter(ImageFilter.GaussianBlur(1.2))
    draw = ImageDraw.Draw(thumb, "RGBA")
    draw.rectangle((0, 0, 1280, 720), fill=(8, 14, 18, 92))
    draw.rounded_rectangle((56, 58, 780, 166), radius=24, fill=(0, 0, 0, 170))
    draw.text((84, 82), "AI 辯論所", font=font(30, True), fill=(238, 214, 160, 255))
    draw.text((84, 116), "Podcast Video", font=font(22), fill=(230, 230, 230, 220))
    draw.rounded_rectangle((840, 84, 1194, 178), radius=24, fill=(44, 83, 92, 210))
    draw.text((876, 108), "Codex  VS  Gemini", font=font(31, True), fill=(255, 255, 255, 255))
    draw.rounded_rectangle((56, 410, 1120, 654), radius=30, fill=(0, 0, 0, 178), outline=(255, 255, 255, 70), width=2)
    y = 440
    for line in ["我國應開徵「機器人稅」", "以因應 AI 造成的失業問題"]:
        draw.text((88, y), line, font=font(58, True), fill=(255, 255, 255, 255))
        y += 82
    thumb.save(OUT / "youtube-thumbnail.png")


def make_podcast_cover(source: Image.Image) -> None:
    base = source.resize((3000, 1688))
    canvas = Image.new("RGB", (3000, 3000), (18, 24, 28))
    canvas.paste(base, (0, 0))
    canvas = canvas.filter(ImageFilter.GaussianBlur(2.0))
    draw = ImageDraw.Draw(canvas, "RGBA")
    draw.rectangle((0, 0, 3000, 3000), fill=(6, 10, 12, 118))
    draw.rounded_rectangle((210, 230, 2790, 2760), radius=96, fill=(0, 0, 0, 132), outline=(255, 255, 255, 70), width=7)
    draw.text((310, 360), "AI 辯論所", font=font(150, True), fill=(238, 214, 160, 255))
    draw.text((318, 535), "Podcast", font=font(72), fill=(230, 230, 230, 225))
    y = 900
    for line in ["我國應開徵", "「機器人稅」", "以因應 AI 造成的", "失業問題"]:
        draw.text((310, y), line, font=font(166, True), fill=(255, 255, 255, 255))
        y += 220
    draw.rounded_rectangle((310, 2380, 1560, 2515), radius=50, fill=(44, 83, 92, 225))
    draw.text((370, 2410), "Codex × Gemini", font=font(78, True), fill=(255, 255, 255, 255))
    draw.text((310, 2615), "完整辯論與裁判評分請見網站", font=font(58), fill=(235, 235, 235, 225))
    canvas.save(OUT / "podcast-cover.png")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    source = Image.open(PREVIEW).convert("RGB")
    make_youtube_thumbnail(source)
    make_podcast_cover(source)
    print(OUT / "youtube-thumbnail.png")
    print(OUT / "podcast-cover.png")


if __name__ == "__main__":
    main()
