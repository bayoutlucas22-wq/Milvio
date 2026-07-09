#!/usr/bin/env python3

from __future__ import annotations

import json
import re
import shutil
from collections import Counter, defaultdict
from pathlib import Path


def load_json(path: Path):
    data = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(data, list):
        return data[0] if data else {}
    return data


def extract_source_file(payload: dict) -> str:
    return str(payload.get("source_file") or payload.get("__source_file") or "")


def extract_week_folder(source_file: str) -> str:
    match = re.search(r"(Relatorios-Semana-[^/]+)", source_file)
    return match.group(1) if match else "unknown"


def extract_year_month(source_file: str) -> tuple[str, str]:
    match = re.search(r"Relatorios-Semana-[^/]+", source_file)
    if not match:
        return "unknown", "unknown"
    # Preserve the grouped folder, but the actual year/month is only reliably
    # available on cleaned outputs. For raw JSONs we keep the weekly folder.
    return "unknown", "unknown"


def main() -> int:
    root = Path.cwd()
    raw_dir = root / "artifacts" / "raw"
    out_dir = raw_dir / "by_xlsx_source"
    out_dir.mkdir(parents=True, exist_ok=True)

    raw_files = sorted(
        p for p in raw_dir.glob("*.json")
        if p.name not in {
            "by_year_month_summary.json",
            "by_year_month_summary.md",
            "by_year_month_clean_summary.json",
            "jsons_from_xlsx.txt",
        }
    )

    copied = 0
    groups = defaultdict(list)
    report_types = Counter()

    for path in raw_files:
        payload = load_json(path)
        if not isinstance(payload, dict):
            continue
        source_file = extract_source_file(payload)
        if not source_file.endswith(".xlsx"):
            continue

        week_folder = extract_week_folder(source_file)
        if week_folder == "unknown":
            target_dir = out_dir / "unknown"
        else:
            # Keep the weekly folder as the first organizing level.
            target_dir = out_dir / week_folder
        target_dir.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path, target_dir / path.name)
        copied += 1
        groups[week_folder].append(path.name)
        report_types[str(payload.get("report_type") or "unknown")] += 1

    summary = {
        "totals": {
            "files": copied,
            "folders": len(groups),
        },
        "folders": {
            folder: {
                "files": len(files),
                "sample": files[:6],
            }
            for folder, files in sorted(groups.items())
        },
        "report_types": dict(sorted(report_types.items())),
    }

    (raw_dir / "by_xlsx_source_summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print(f"Copied {copied} JSON files into {out_dir}")
    print(f"Wrote summary to {raw_dir / 'by_xlsx_source_summary.json'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
