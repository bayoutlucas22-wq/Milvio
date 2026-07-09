from __future__ import annotations

import json
from collections import defaultdict
from pathlib import Path
import re
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT / "artifacts" / "raw"
OUT_DIR = RAW_DIR / "mega_merge"

REPORT_ORDER = [
    "comissoes",
    "fretes",
    "markup",
    "descontos_e_promocoes",
    "incentivos",
    "pagamentos_manuais",
]


def normalize_report_type(report_type: str | None) -> str | None:
    if not report_type:
        return None
    report_type = str(report_type).strip().lower()
    mapping = {
        "comissoes": "comissoes",
        "commissions": "comissoes",
        "fretes": "fretes",
        "freight": "fretes",
        "markup": "markup",
        "descontos_e_promocoes": "descontos_e_promocoes",
        "promotions": "descontos_e_promocoes",
        "incentivos": "incentivos",
        "incentives": "incentivos",
        "pagamentos_manuais": "pagamentos_manuais",
        "manual_payments": "pagamentos_manuais",
    }
    return mapping.get(report_type)


def load_payload(path: Path) -> dict[str, Any] | None:
    try:
        payload = json.loads(path.read_text())
    except Exception:
        return None
    if not isinstance(payload, dict):
        return None
    if "report_type" not in payload:
        return None
    return payload


def unique_key(payload: dict[str, Any], path: Path) -> str:
    source_file = str(payload.get("source_file") or "")
    folder_name = str(payload.get("folder_name") or "")
    sheet_name = str(payload.get("sheet_name") or "")
    if source_file:
        return source_file
    return f"{folder_name}|{sheet_name}|{path.as_posix()}"


def period_from_path(path: Path) -> tuple[str | None, str | None]:
    relative = path.as_posix()
    match = re.search(r"(?:^|/)by_year_month/(20\d{2})/(\d{2})/", relative)
    if not match:
        match = re.search(r"(?:^|/)by_year_month_clean/(20\d{2})/(\d{2})/", relative)
    if not match:
        return None, None
    return match.group(1), match.group(2)


def occurrence_score(path: Path) -> int:
    relative = path.as_posix()
    if "by_year_month/" in relative:
        return 3
    if "by_year_month_clean/" in relative:
        return 2
    if "by_xlsx_source/" in relative:
        return 1
    return 0


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    grouped: dict[str, dict[str, Any]] = {report_type: {"items_by_key": {}} for report_type in REPORT_ORDER}
    totals = defaultdict(int)
    skipped = 0

    for path in sorted(RAW_DIR.rglob("*.json")):
        if OUT_DIR in path.parents:
            continue
        payload = load_payload(path)
        if payload is None:
            continue
        report_type = normalize_report_type(payload.get("report_type"))
        if report_type not in grouped:
            skipped += 1
            continue
        key = unique_key(payload, path)
        source_path = path.relative_to(ROOT).as_posix()
        year, month = period_from_path(path)
        occurrence = {
            "path": source_path,
            "year": year,
            "month": month,
        }
        current = grouped[report_type]["items_by_key"].get(key)
        if current is None:
            grouped[report_type]["items_by_key"][key] = {
                "source_file": payload.get("source_file"),
                "folder_name": payload.get("folder_name"),
                "report_type": report_type,
                "sheet_name": payload.get("sheet_name"),
                "headers": payload.get("headers", []),
                "rows": payload.get("rows", []),
                "source_path": source_path,
                "year": year,
                "month": month,
                "period_key": f"{year}-{month}" if year and month else None,
                "occurrences": [occurrence],
                "_score": occurrence_score(path),
            }
            totals[report_type] += 1
            continue

        current["occurrences"].append(occurrence)
        score = occurrence_score(path)
        if score > current["_score"]:
            current["source_path"] = source_path
            current["year"] = year
            current["month"] = month
            current["period_key"] = f"{year}-{month}" if year and month else None
            current["_score"] = score

    manifest = {
        "source": "artifacts/raw",
        "generated_from": "all json files with report_type under raw",
        "totals": dict(totals),
        "skipped_without_report_type": skipped,
        "files": {},
    }

    for report_type in REPORT_ORDER:
        items = list(grouped[report_type]["items_by_key"].values())
        items.sort(key=lambda item: (item.get("period_key") or "9999-99", item.get("source_file") or ""))
        for item in items:
            item.pop("_score", None)
        out_path = OUT_DIR / f"{report_type}.json"
        out_payload = {
            "report_type": report_type,
            "count": len(items),
            "items": items,
        }
        out_path.write_text(json.dumps(out_payload, ensure_ascii=False, indent=2))
        manifest["files"][report_type] = {
            "path": out_path.relative_to(ROOT).as_posix(),
            "count": len(items),
        }

    (OUT_DIR / "_manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2))
    print(json.dumps(manifest, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
