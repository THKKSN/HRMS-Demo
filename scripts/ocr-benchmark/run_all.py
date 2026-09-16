from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

from common import DEFAULT_EXPECTED, DEFAULT_RESULTS_DIR


ENGINES = {
    "paddleocr": "run_paddleocr.py",
    "tesseract": "run_tesseract.py",
    "easyocr": "run_easyocr.py",
}


def main() -> int:
    parser = argparse.ArgumentParser(description="Run OCR benchmark engines and evaluate results")
    parser.add_argument("--expected", type=Path, default=DEFAULT_EXPECTED)
    parser.add_argument("--results-dir", type=Path, default=DEFAULT_RESULTS_DIR)
    parser.add_argument("--engines", default="paddleocr,tesseract,easyocr")
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--profile", choices=["default", "fast"], default="default")
    parser.add_argument("--max-side", type=int, default=0)
    args = parser.parse_args()

    script_dir = Path(__file__).resolve().parent
    selected = [name.strip() for name in args.engines.split(",") if name.strip()]

    for engine in selected:
        script = ENGINES.get(engine)
        if not script:
            print(f"Unknown engine: {engine}", file=sys.stderr)
            continue
        command = [
            sys.executable,
            str(script_dir / script),
            "--expected",
            str(args.expected),
            "--results-dir",
            str(args.results_dir),
        ]
        if args.limit:
            command.extend(["--limit", str(args.limit)])
        if args.profile != "default":
            command.extend(["--profile", args.profile])
        if args.max_side:
            command.extend(["--max-side", str(args.max_side)])
        print(f"Running {engine}...", file=sys.stderr)
        completed = subprocess.run(command, text=True)
        if completed.returncode != 0:
            print(f"{engine} exited with {completed.returncode}", file=sys.stderr)

    return subprocess.run(
        [
            sys.executable,
            str(script_dir / "evaluate_results.py"),
            "--expected",
            str(args.expected),
            "--results-dir",
            str(args.results_dir),
        ],
        text=True,
    ).returncode


if __name__ == "__main__":
    raise SystemExit(main())
