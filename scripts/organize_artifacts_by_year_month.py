#!/usr/bin/env python3

from __future__ import annotations

import json
import re
import shutil
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path


DATE_PATTERNS = [
    re.compile(r"\b(\d{4})-(\d{2})-(\d{2})\b"),
    re.compile(r"\b(\d{2})/(\d{2})/(\d{4})\b"),
]


@dataclass
class RawRecord:
    path: Path
    payload: object
    rows: list[dict]
    report_type: str
    sheet_name: str
    folder_name: str
    first_date: datetime | None


def load_payload(path: Path):
    data = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(data, list):
        if not data:
            return {}
        return data[0]
    return data


def parse_date(value: str) -> datetime | None:
    if not isinstance(value, str):
        return None
    for pattern in DATE_PATTERNS:
        m = pattern.search(value)
        if not m:
            continue
        if len(m.groups()) == 3 and len(m.group(1)) == 4:
            year, month, day = map(int, m.groups())
        else:
            day, month, year = map(int, m.groups())
        try:
            return datetime(year, month, day)
        except ValueError:
            return None
    return None


def extract_rows(payload) -> list[dict]:
    if isinstance(payload, dict):
        rows = payload.get("rows", [])
        return rows if isinstance(rows, list) else []
    return []


def row_dates(rows: list[dict]) -> list[datetime]:
    dates = []
    for row in rows:
        if not isinstance(row, dict):
            continue
        for key, value in row.items():
            if "data" not in key.lower():
                continue
            d = parse_date(str(value))
            if d:
                dates.append(d)
                break
    return dates


def best_date_for_record(payload, rows: list[dict], filename: str) -> datetime | None:
    candidates = row_dates(rows)
    if candidates:
        return min(candidates)
    m = re.search(r"Semana-(\d{1,2})-a-(\d{1,2})", filename)
    if m:
        # Fallback only for grouping; not a real calendar date.
        return datetime(2025, 1, 1)
    return None


def month_key(dt: datetime) -> str:
    return f"{dt.year:04d}/{dt.month:02d}"


def year_key(dt: datetime) -> str:
    return f"{dt.year:04d}"


def summarize(records: list[RawRecord]) -> tuple[dict, dict]:
    by_year = defaultdict(list)
    by_month = defaultdict(list)
    report_types_by_month = defaultdict(Counter)

    for rec in records:
      if rec.first_date is None:
        continue
      y = year_key(rec.first_date)
      m = month_key(rec.first_date)
      by_year[y].append(rec)
      by_month[m].append(rec)
      report_types_by_month[m][rec.report_type] += 1

    years_summary = {}
    for year, items in sorted(by_year.items()):
        years_summary[year] = {
            "files": len(items),
            "rows": sum(len(r.rows) for r in items),
            "report_types": dict(Counter(r.report_type for r in items)),
        }

    months_summary = {}
    for month, items in sorted(by_month.items()):
        months_summary[month] = {
            "files": len(items),
            "rows": sum(len(r.rows) for r in items),
            "report_types": dict(report_types_by_month[month]),
            "files_list": [r.path.name for r in items[:6]],
        }

    return years_summary, months_summary


def main() -> int:
    root = Path.cwd()
    raw_dir = root / "artifacts" / "raw"
    organized_dir = raw_dir / "by_year_month"
    organized_dir.mkdir(parents=True, exist_ok=True)

    raw_files = sorted(
        p for p in raw_dir.glob("*.json")
        if p.name not in {"by_year_month_summary.json", "by_year_month_summary.md"}
    )

    records: list[RawRecord] = []
    for path in raw_files:
        payload = load_payload(path)
        rows = extract_rows(payload)
        if isinstance(payload, dict):
            report_type = str(payload.get("report_type", "unknown"))
            sheet_name = str(payload.get("sheet_name", ""))
            folder_name = str(payload.get("folder_name", ""))
        else:
            report_type = "unknown"
            sheet_name = ""
            folder_name = ""
        first_date = best_date_for_record(payload, rows, path.name)
        records.append(
            RawRecord(
                path=path,
                payload=payload,
                rows=rows,
                report_type=report_type,
                sheet_name=sheet_name,
                folder_name=folder_name,
                first_date=first_date,
            )
        )

    copied = 0
    for rec in records:
        if rec.first_date is None:
            target_dir = organized_dir / "unknown"
        else:
            target_dir = organized_dir / year_key(rec.first_date) / f"{rec.first_date.month:02d}"
        target_dir.mkdir(parents=True, exist_ok=True)
        shutil.copy2(rec.path, target_dir / rec.path.name)
        copied += 1

    years_summary, months_summary = summarize(records)
    summary = {
        "totals": {
            "files": len(records),
            "years": len(years_summary),
            "months": len(months_summary),
        },
        "years": years_summary,
        "months": months_summary,
    }

    (raw_dir / "by_year_month_summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    md_lines = ["# Artifacts By Year/Month", ""]
    md_lines.append(f"- Files: {summary['totals']['files']}")
    md_lines.append(f"- Years: {summary['totals']['years']}")
    md_lines.append(f"- Months: {summary['totals']['months']}")
    md_lines.append("")
    for year, ydata in years_summary.items():
        md_lines.append(f"## {year}")
        md_lines.append(f"- Files: {ydata['files']}")
        md_lines.append(f"- Rows: {ydata['rows']}")
        md_lines.append(f"- Types: {', '.join(f'{k}={v}' for k, v in sorted(ydata['report_types'].items()))}")
        md_lines.append("")
    for month, mdata in months_summary.items():
        md_lines.append(f"## {month}")
        md_lines.append(f"- Files: {mdata['files']}")
        md_lines.append(f"- Rows: {mdata['rows']}")
        md_lines.append(f"- Types: {', '.join(f'{k}={v}' for k, v in sorted(mdata['report_types'].items()))}")
        md_lines.append("")

    (raw_dir / "by_year_month_summary.md").write_text("\n".join(md_lines), encoding="utf-8")
    print(f"Copied {copied} files into {organized_dir}")
    print(f"Wrote summaries to {raw_dir / 'by_year_month_summary.json'} and .md")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
