from __future__ import annotations

from pathlib import Path
from typing import Any

from common import run_engine


def run_easyocr(image_path: Path, args) -> tuple[str, list[dict[str, Any]]]:
    import easyocr

    languages = [part.strip() for part in (args.lang or "th,en").split(",") if part.strip()]
    reader = easyocr.Reader(languages, gpu=False)
    result = reader.readtext(str(image_path), detail=1, paragraph=False)
    lines: list[dict[str, Any]] = []
    for bbox, text, confidence in result:
        lines.append({"text": text, "confidence": float(confidence), "bbox": bbox})
    raw_text = "\n".join(item["text"] for item in lines)
    return raw_text, lines


if __name__ == "__main__":
    raise SystemExit(run_engine("easyocr", run_easyocr))
