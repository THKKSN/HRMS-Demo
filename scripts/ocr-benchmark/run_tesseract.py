from __future__ import annotations

from pathlib import Path
from typing import Any

from common import run_engine, run_subprocess


def run_tesseract(image_path: Path, args) -> tuple[str, list[dict[str, Any]]]:
    command = [
        "tesseract",
        str(image_path),
        "stdout",
        "-l",
        args.lang or "tha+eng",
        "--oem",
        "1",
        "--psm",
        "6",
    ]
    completed = run_subprocess(command)
    raw_text = completed.stdout.strip()
    lines = [{"text": line.strip()} for line in raw_text.splitlines() if line.strip()]
    return raw_text, lines


if __name__ == "__main__":
    raise SystemExit(run_engine("tesseract", run_tesseract))
