from __future__ import annotations

import json
import os
import tempfile
from pathlib import Path
from typing import Any

from common import run_engine

_PADDLEOCR_ENGINE: Any | None = None
_PADDLEOCR_MODE: str | None = None


def run_paddleocr(image_path: Path, args) -> tuple[str, list[dict[str, Any]]]:
    ocr_image_path, cleanup_path = prepare_image(image_path, args)
    ocr, mode = get_paddleocr_engine(args)
    try:
        if mode == "v3":
            return parse_v3_results(ocr.predict(str(ocr_image_path)))
        return parse_legacy_results(ocr.ocr(str(ocr_image_path), cls=True))
    finally:
        if cleanup_path is not None:
            try:
                os.unlink(cleanup_path)
            except OSError:
                pass


def get_paddleocr_engine(args) -> tuple[Any, str]:
    global _PADDLEOCR_ENGINE, _PADDLEOCR_MODE
    if _PADDLEOCR_ENGINE is not None and _PADDLEOCR_MODE is not None:
        return _PADDLEOCR_ENGINE, _PADDLEOCR_MODE

    from paddleocr import PaddleOCR
    lang = (args.lang or "th").split(",")[0].replace("tha", "th")
    fast = getattr(args, "profile", "default") == "fast"

    try:
        _PADDLEOCR_ENGINE = PaddleOCR(
            lang=lang,
            use_doc_orientation_classify=not fast,
            use_doc_unwarping=False,
            use_textline_orientation=not fast,
            engine="paddle",
            device="cpu",
            enable_mkldnn=False,
        )
        _PADDLEOCR_MODE = "v3"
    except TypeError:
        _PADDLEOCR_ENGINE = PaddleOCR(use_angle_cls=True, lang=lang, show_log=False)
        _PADDLEOCR_MODE = "legacy"

    return _PADDLEOCR_ENGINE, _PADDLEOCR_MODE


def prepare_image(image_path: Path, args) -> tuple[Path, str | None]:
    max_side = int(getattr(args, "max_side", 0) or 0)

    try:
        from PIL import Image, ImageOps
    except ImportError:
        return image_path, None

    image = Image.open(image_path)
    orientation = image.getexif().get(274)
    image = ImageOps.exif_transpose(image)
    width, height = image.size
    longest = max(width, height)

    needs_resize = max_side > 0 and longest > max_side
    needs_orientation_fix = bool(orientation and orientation != 1)
    if not needs_resize and not needs_orientation_fix:
        return image_path, None

    image = image.convert("RGB")
    if needs_resize:
        image.thumbnail((max_side, max_side))

    temp = tempfile.NamedTemporaryFile(delete=False, suffix=image_path.suffix or ".jpg")
    temp.close()
    image.save(temp.name, quality=92)
    return Path(temp.name), temp.name


def parse_legacy_results(result: Any) -> tuple[str, list[dict[str, Any]]]:
    lines: list[dict[str, Any]] = []

    for page in result or []:
        for item in page or []:
            if not item or len(item) < 2:
                continue
            bbox = item[0]
            text_info = item[1]
            if isinstance(text_info, (list, tuple)) and len(text_info) >= 2:
                text = str(text_info[0])
                confidence = float(text_info[1])
            else:
                text = str(text_info)
                confidence = None
            lines.append({"text": text, "confidence": confidence, "bbox": bbox})

    raw_text = "\n".join(item["text"] for item in lines)
    return raw_text, lines


def parse_v3_results(result: Any) -> tuple[str, list[dict[str, Any]]]:
    lines: list[dict[str, Any]] = []

    for res in result or []:
        payload = result_to_dict(res)
        data = payload.get("res", payload)
        rec_texts = data.get("rec_texts", [])
        rec_scores = data.get("rec_scores", [])
        rec_boxes = data["rec_boxes"] if "rec_boxes" in data else data.get("rec_polys", [])

        for index, text in enumerate(rec_texts):
            lines.append(
                {
                    "text": text,
                    "confidence": list_value(rec_scores, index),
                    "bbox": list_value(rec_boxes, index),
                }
            )

    raw_text = "\n".join(item["text"] for item in lines if item.get("text"))
    return raw_text, lines


def result_to_dict(res: Any) -> dict[str, Any]:
    if isinstance(res, dict):
        return res

    json_value = getattr(res, "json", None)
    if isinstance(json_value, dict):
        return json_value
    if callable(json_value):
        value = json_value()
        if isinstance(value, dict):
            return value

    save_to_json = getattr(res, "save_to_json", None)
    if callable(save_to_json):
        with tempfile.TemporaryDirectory() as temp_dir:
            save_to_json(temp_dir, ensure_ascii=False)
            json_files = sorted(Path(temp_dir).glob("*.json"))
            if json_files:
                return json.loads(json_files[0].read_text(encoding="utf-8"))

    return {}


def list_value(values: Any, index: int) -> Any:
    try:
        value = values[index]
        return value.tolist() if hasattr(value, "tolist") else value
    except Exception:
        return None


if __name__ == "__main__":
    raise SystemExit(run_engine("paddleocr", run_paddleocr))
