from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from common import DEFAULT_EXPECTED, DEFAULT_RESULTS_DIR, field_hit, load_samples, parse_fields_from_text


def load_engine_results(results_dir: Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for path in sorted(results_dir.glob("*.json")):
        if path.name in {"summary.json", "summary.md"}:
            continue
        payload = json.loads(path.read_text(encoding="utf-8"))
        rows.extend(payload.get("results", []))
    return rows


def main() -> int:
    parser = argparse.ArgumentParser(description="Evaluate OCR benchmark output")
    parser.add_argument("--expected", type=Path, default=DEFAULT_EXPECTED)
    parser.add_argument("--results-dir", type=Path, default=DEFAULT_RESULTS_DIR)
    args = parser.parse_args()

    samples = {sample.file: sample for sample in load_samples(args.expected)}
    results = load_engine_results(args.results_dir)
    if not results:
        print(f"No OCR result JSON files found in {args.results_dir}")
        return 0

    summary: dict[str, Any] = {"engines": {}, "results": []}

    for row in results:
        sample = samples.get(row["file"])
        if not sample:
            continue
        raw_text = row.get("rawText") or ""
        parsed = parse_fields_from_text(raw_text, sample.document_type, row.get("lines") or [])
        field_results: dict[str, bool] = {}
        for field, expected in sample.expected.items():
            field_results[field] = field_hit(expected, parsed.get(field), raw_text)

        hit_count = sum(1 for hit in field_results.values() if hit)
        total_fields = len(field_results)
        evaluated = {
            "engine": row.get("runLabel") or row["engine"],
            "file": row["file"],
            "documentType": sample.document_type,
            "durationMs": row.get("durationMs"),
            "error": row.get("error"),
            "parsed": parsed,
            "fieldResults": field_results,
            "hitCount": hit_count,
            "totalFields": total_fields,
            "hitRate": round(hit_count / total_fields, 4) if total_fields else 0,
        }
        summary["results"].append(evaluated)

        engine = summary["engines"].setdefault(
            row.get("runLabel") or row["engine"],
            {"files": 0, "errors": 0, "hitCount": 0, "totalFields": 0, "durationsMs": []},
        )
        engine["files"] += 1
        if row.get("error"):
            engine["errors"] += 1
        engine["hitCount"] += hit_count
        engine["totalFields"] += total_fields
        if row.get("durationMs") is not None:
            engine["durationsMs"].append(row["durationMs"])

    for engine in summary["engines"].values():
        durations = engine.pop("durationsMs")
        engine["hitRate"] = round(engine["hitCount"] / engine["totalFields"], 4) if engine["totalFields"] else 0
        engine["avgDurationMs"] = round(sum(durations) / len(durations), 2) if durations else None

    args.results_dir.mkdir(parents=True, exist_ok=True)
    (args.results_dir / "summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    (args.results_dir / "summary.md").write_text(render_markdown(summary), encoding="utf-8")
    print(args.results_dir / "summary.md")
    return 0


def render_markdown(summary: dict[str, Any]) -> str:
    lines = ["# OCR Benchmark Summary", ""]
    lines.append("| Engine | Files | Errors | Field hit rate | Avg runtime ms |")
    lines.append("| --- | ---: | ---: | ---: | ---: |")
    for engine, data in sorted(summary["engines"].items()):
        lines.append(
            f"| {engine} | {data['files']} | {data['errors']} | {data['hitRate']:.2%} | {data['avgDurationMs'] or '-'} |"
        )

    lines.extend(["", "## Per File", ""])
    lines.append("| Engine | File | Type | Hits | Hit rate | Error |")
    lines.append("| --- | --- | --- | ---: | ---: | --- |")
    for row in summary["results"]:
        error = row["error"] or ""
        lines.append(
            f"| {row['engine']} | {row['file']} | {row['documentType']} | "
            f"{row['hitCount']}/{row['totalFields']} | {row['hitRate']:.2%} | {error} |"
        )
    lines.append("")
    return "\n".join(lines)


if __name__ == "__main__":
    raise SystemExit(main())
