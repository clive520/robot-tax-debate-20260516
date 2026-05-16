import argparse
import subprocess
import tempfile
from pathlib import Path

import imageio_ffmpeg


ROOT = Path(__file__).resolve().parents[1]
PODCAST_AUDIO_ORDER = [
    "positive-opening.mp3",
    "negative-opening.mp3",
    "positive-rebuttal.mp3",
    "negative-rebuttal.mp3",
    "negative-closing.mp3",
    "positive-closing.mp3",
]


def build_podcast_audio(slug: str) -> None:
    debate_dir = ROOT / "debates" / slug
    audio_dir = debate_dir / "audio"
    podcast_dir = debate_dir / "podcast"
    podcast_dir.mkdir(parents=True, exist_ok=True)
    output = podcast_dir / "debate-podcast.mp3"

    missing = [
        filename for filename in PODCAST_AUDIO_ORDER
        if not (audio_dir / filename).exists()
    ]
    if missing:
        raise FileNotFoundError(f"Missing audio file(s): {', '.join(missing)}")

    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", suffix=".txt", delete=False) as handle:
        list_path = Path(handle.name)
        for filename in PODCAST_AUDIO_ORDER:
            source = (audio_dir / filename).resolve().as_posix()
            handle.write(f"file '{source}'\n")

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

    print(output)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("slug", help="Debate slug, for example death-penalty")
    args = parser.parse_args()
    build_podcast_audio(args.slug)


if __name__ == "__main__":
    main()
