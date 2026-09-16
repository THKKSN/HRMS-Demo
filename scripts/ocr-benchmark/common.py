from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable, Iterable

from field_parser import parse_expense_fields

try:
    import resource
except ImportError:  # resource is not available on Windows
    resource = None


SCRIPT_DIR = Path(__file__).resolve().parent
DEFAULT_EXPECTED = SCRIPT_DIR / "sample_expected.json"
DEFAULT_RESULTS_DIR = SCRIPT_DIR / "results"


@dataclass(frozen=True)
class Sample:
    file: str
    document_type: str
    expected: dict[str, Any]
    image_path: Path


def load_samples(expected_path: Path = DEFAULT_EXPECTED) -> list[Sample]:
    payload = json.loads(expected_path.read_text(encoding="utf-8"))
    image_root = (expected_path.parent / payload.get("imageRoot", "../../tmp-receipts")).resolve()
    samples: list[Sample] = []
    for item in payload.get("samples", []):
        file_name = item["file"]
        samples.append(
            Sample(
                file=file_name,
                document_type=item.get("documentType", "Other"),
                expected=item.get("expected", {}),
                image_path=(image_root / file_name).resolve(),
            )
        )
    return samples


def build_arg_parser(engine: str) -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=f"Run {engine} OCR benchmark")
    parser.add_argument("--expected", type=Path, default=DEFAULT_EXPECTED)
    parser.add_argument("--results-dir", type=Path, default=DEFAULT_RESULTS_DIR)
    parser.add_argument("--limit", type=int, default=0, help="Limit number of samples, 0 means all")
    parser.add_argument("--lang", default="tha+eng" if engine == "tesseract" else "th,en")
    parser.add_argument("--profile", choices=["default", "fast"], default="default")
    parser.add_argument("--max-side", type=int, default=0, help="Resize image longest side before OCR, 0 keeps original")
    parser.add_argument("--run-label", help="Override engine label in result files, useful for preprocess variants")
    return parser


def max_rss_kb() -> int | None:
    if resource is None:
        return None
    try:
        return int(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss)
    except Exception:
        return None


def normalize_text(value: Any) -> str:
    text = str(value or "").lower()
    text = text.replace(",", "")
    text = re.sub(r"\s+", "", text)
    return text


def normalize_date(value: str) -> str:
    value = value.strip()
    match = re.search(r"(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})", value)
    if not match:
        return value
    day, month, year = match.groups()
    year_int = int(year)
    if year_int < 100:
        year_int += 2000
    if year_int > 2400:
        year_int -= 543
    return f"{year_int:04d}-{int(month):02d}-{int(day):02d}"


def parse_fields_from_text(
    raw_text: str,
    document_type: str | None = None,
    lines: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    return {
        field: suggestion.value
        for field, suggestion in parse_expense_fields(raw_text, document_type, lines).items()
    }


def number_value(value: str) -> int | float:
    numeric = float(value.replace(",", ""))
    return int(numeric) if numeric.is_integer() else numeric


def field_hit(expected: Any, parsed: Any, raw_text: str) -> bool:
    if expected is None or expected == "":
        return False
    if parsed is not None:
        if isinstance(expected, (int, float)):
            try:
                return abs(float(parsed) - float(expected)) < 0.01
            except Exception:
                return False
        if str(parsed).lower() == str(expected).lower():
            return True

    return normalize_text(expected) in normalize_text(raw_text)


def run_engine(
    engine: str,
    ocr_fn: Callable[[Path, argparse.Namespace], tuple[str, list[dict[str, Any]]]],
    argv: Iterable[str] | None = None,
) -> int:
    parser = build_arg_parser(engine)
    args = parser.parse_args(list(argv) if argv is not None else None)
    samples = load_samples(args.expected)
    if args.limit > 0:
        samples = samples[: args.limit]

    args.results_dir.mkdir(parents=True, exist_ok=True)
    engine_label = args.run_label or engine
    rows: list[dict[str, Any]] = []

    for sample in samples:
        started = time.perf_counter()
        error = None
        raw_text = ""
        lines: list[dict[str, Any]] = []
        try:
            raw_text, lines = ocr_fn(sample.image_path, args)
        except Exception as exc:
            error = f"{type(exc).__name__}: {exc}"
        duration_ms = round((time.perf_counter() - started) * 1000, 2)
        rows.append(
            {
                "engine": engine,
                "runLabel": engine_label,
                "file": sample.file,
                "documentType": sample.document_type,
                "imagePath": str(sample.image_path),
                "durationMs": duration_ms,
                "maxRssKb": max_rss_kb(),
                "rawText": raw_text,
                "lines": lines,
                "error": error,
            }
        )
        status = "ok" if not error else "error"
        print(f"[{engine_label}] {sample.file}: {status} ({duration_ms} ms)", file=sys.stderr)

    out = args.results_dir / f"{safe_file_name(engine_label)}.json"
    out.write_text(json.dumps({"engine": engine, "runLabel": engine_label, "results": rows}, ensure_ascii=False, indent=2), encoding="utf-8")
    print(out)
    return 0


def safe_file_name(value: str) -> str:
    safe = re.sub(r"[^A-Za-z0-9_.-]+", "-", value.strip()).strip("-")
    return safe or "ocr-result"


def run_subprocess(command: list[str], timeout: int = 120) -> subprocess.CompletedProcess[str]:
    return subprocess.run(command, check=True, text=True, capture_output=True, timeout=timeout)
