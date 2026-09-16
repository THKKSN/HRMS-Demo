from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from common import DEFAULT_EXPECTED, SCRIPT_DIR, load_samples


DEFAULT_OUTPUT_DIR = SCRIPT_DIR / "preprocessed"


@dataclass(frozen=True)
class Variant:
    name: str
    max_side: int
    grayscale: bool = False
    autocontrast: bool = False
    contrast: float = 1.0
    sharpness: float = 1.0
    threshold: int | None = None


VARIANTS: dict[str, Variant] = {
    "resize-1400": Variant("resize-1400", max_side=1400),
    "resize-1000": Variant("resize-1000", max_side=1000),
    "resize-800": Variant("resize-800", max_side=800),
    "contrast-1000": Variant("contrast-1000", max_side=1000, autocontrast=True, contrast=1.25, sharpness=1.25),
    "gray-sharpen-1000": Variant("gray-sharpen-1000", max_side=1000, grayscale=True, autocontrast=True, contrast=1.2, sharpness=1.6),
    "threshold-1000": Variant("threshold-1000", max_side=1000, grayscale=True, autocontrast=True, sharpness=1.4, threshold=170),
}


def main() -> int:
    parser = argparse.ArgumentParser(description="Create preprocessed OCR benchmark images")
    parser.add_argument("--expected", type=Path, default=DEFAULT_EXPECTED)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--variants", default="resize-1000,gray-sharpen-1000,contrast-1000")
    parser.add_argument("--quality", type=int, default=92)
    args = parser.parse_args()

    selected = [item.strip() for item in args.variants.split(",") if item.strip()]
    unknown = [item for item in selected if item not in VARIANTS]
    if unknown:
        raise SystemExit(f"Unknown variants: {', '.join(unknown)}. Available: {', '.join(VARIANTS)}")

    from PIL import Image, ImageEnhance, ImageOps

    samples = load_samples(args.expected)
    source_payload = json.loads(args.expected.read_text(encoding="utf-8"))

    for variant_name in selected:
        variant = VARIANTS[variant_name]
        variant_dir = args.output_dir / variant.name
        variant_dir.mkdir(parents=True, exist_ok=True)
        manifest: list[dict[str, Any]] = []
        expected_samples: list[dict[str, Any]] = []

        for sample in samples:
            image = Image.open(sample.image_path)
            original_size = image.size
            image = ImageOps.exif_transpose(image)
            image = apply_variant(image, variant)

            output_name = f"{Path(sample.file).stem}.jpg"
            output_path = variant_dir / output_name
            image.save(output_path, quality=args.quality, optimize=True)

            manifest.append(
                {
                    "file": output_name,
                    "sourceFile": sample.file,
                    "documentType": sample.document_type,
                    "variant": variant.name,
                    "originalSize": list(original_size),
                    "outputSize": list(image.size),
                    "operations": describe_variant(variant),
                }
            )
            expected_samples.append(
                {
                    "file": output_name,
                    "sourceFile": sample.file,
                    "documentType": sample.document_type,
                    "qualityNotes": [f"preprocess:{variant.name}", *source_quality_notes(source_payload, sample.file)],
                    "expected": sample.expected,
                }
            )

        (variant_dir / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
        (variant_dir / "expected.json").write_text(
            json.dumps(
                {
                    "datasetVersion": f"{source_payload.get('datasetVersion', 'ocr-benchmark')}-{variant.name}",
                    "imageRoot": ".",
                    "samples": expected_samples,
                },
                ensure_ascii=False,
                indent=2,
            ),
            encoding="utf-8",
        )
        print(variant_dir / "expected.json")

    return 0


def apply_variant(image, variant: Variant):
    from PIL import ImageEnhance, ImageOps

    image = image.convert("RGB")
    image.thumbnail((variant.max_side, variant.max_side))

    if variant.grayscale:
        image = image.convert("L")

    if variant.autocontrast:
        image = ImageOps.autocontrast(image)

    if variant.contrast != 1.0:
        image = ImageEnhance.Contrast(image).enhance(variant.contrast)

    if variant.sharpness != 1.0:
        image = ImageEnhance.Sharpness(image).enhance(variant.sharpness)

    if variant.threshold is not None:
        image = image.point(lambda value: 255 if value >= variant.threshold else 0)

    return image.convert("RGB")


def describe_variant(variant: Variant) -> list[str]:
    operations = ["exif_transpose", f"resize_max_side:{variant.max_side}"]
    if variant.grayscale:
        operations.append("grayscale")
    if variant.autocontrast:
        operations.append("autocontrast")
    if variant.contrast != 1.0:
        operations.append(f"contrast:{variant.contrast}")
    if variant.sharpness != 1.0:
        operations.append(f"sharpness:{variant.sharpness}")
    if variant.threshold is not None:
        operations.append(f"threshold:{variant.threshold}")
    return operations


def source_quality_notes(payload: dict[str, Any], file_name: str) -> list[str]:
    for item in payload.get("samples", []):
        if item.get("file") == file_name:
            return item.get("qualityNotes", [])
    return []


if __name__ == "__main__":
    raise SystemExit(main())
