from __future__ import annotations

import json
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT / "artifacts" / "raw"
ARTIFACTS_OUT = ROOT / "artifacts" / "analytics_v2.json"
FRONTEND_PUBLIC_OUT = ROOT / "frontend" / "public" / "analytics_v2.json"


REPORT_TYPES = {
    "comissoes": "commissions",
    "commissions": "commissions",
    "descontos_e_promocoes": "promotions",
    "promotions": "promotions",
    "fretes": "freight",
    "freight": "freight",
    "incentivos": "manual_payments",
    "incentives": "manual_payments",
    "pagamentos_manuais": "manual_payments",
    "manual_payments": "manual_payments",
    "markup": "markup",
}


def as_items(payload: Any) -> list[dict[str, Any]]:
    if isinstance(payload, list):
        return [item for item in payload if isinstance(item, dict)]
    if isinstance(payload, dict) and "report_type" in payload:
        return [payload]
    return []


def normalize_report_type(report_type: Any) -> str | None:
    return REPORT_TYPES.get(str(report_type or "").strip().lower())


def parse_date(value: Any) -> datetime | None:
    if not value:
        return None
    text = str(value).strip()
    for fmt in ("%d/%m/%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(text, fmt)
        except ValueError:
            continue
    return None


def numeric(value: Any) -> float:
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        text = value.strip().replace("R$", "").replace("%", "").replace(".", "").replace(",", ".")
        try:
            return float(text)
        except ValueError:
            return 0.0
    return 0.0


def first_row_date(rows: list[dict[str, Any]]) -> datetime | None:
    for row in rows:
        if not isinstance(row, dict):
            continue
        date = parse_date(row.get("Data do Pedido") or row.get("Data"))
        if date:
            return date
    return None


def component_amount(report_type: str, row: dict[str, Any]) -> float:
    if report_type == "commissions":
        return numeric(row.get("Comissão Total") or row.get("Restituição Total") or row.get("Restituição"))
    if report_type == "freight":
        return numeric(row.get("Restituição") or row.get("Frete Total Negociado"))
    if report_type == "promotions":
        return numeric(row.get("Restituição Total") or row.get("Restituição Cupom") or row.get("Restituição Desconto Zé") or row.get("Restituição Brindes"))
    if report_type == "markup":
        return numeric(row.get("Restituição Total") or row.get("Restituição"))
    if report_type == "manual_payments":
        return numeric(row.get("Restituição") or row.get("Incentivo/Dedução"))
    return 0.0


def gross_revenue_from_row(report_type: str, row: dict[str, Any]) -> float:
    if report_type == "commissions":
        qty = numeric(row.get("Quantidade"))
        unit_price = numeric(row.get("Preço Unitário de Venda"))
        return qty * unit_price
    return 0.0


def load_raw_items() -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    for path in sorted(RAW_DIR.glob("*.json")):
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            continue
        for item in as_items(payload):
            report_type = normalize_report_type(item.get("report_type"))
            if not report_type:
                continue
            item = {**item, "report_type": report_type, "source_path": path.relative_to(ROOT).as_posix()}
            items.append(item)
    return items


def infer_folder_periods(items: list[dict[str, Any]]) -> dict[str, str]:
    votes: dict[str, Counter[str]] = defaultdict(Counter)
    for item in items:
        folder = str(item.get("folder_name") or "")
        rows = item.get("rows") or []
        date = first_row_date(rows)
        if folder and date:
            votes[folder][date.strftime("%Y-%m")] += 1
    return {folder: counter.most_common(1)[0][0] for folder, counter in votes.items() if counter}


def item_period(item: dict[str, Any], folder_periods: dict[str, str]) -> str | None:
    date = first_row_date(item.get("rows") or [])
    if date:
        return date.strftime("%Y-%m")
    folder = str(item.get("folder_name") or "")
    return folder_periods.get(folder)


def build() -> dict[str, Any]:
    items = load_raw_items()
    folder_periods = infer_folder_periods(items)
    yearly: dict[str, Counter[str]] = defaultdict(Counter)
    monthly: dict[str, Counter[str]] = defaultdict(Counter)
    docs_by_year = Counter()
    rows_by_year = Counter()
    source_files_by_year: dict[str, set[str]] = defaultdict(set)

    for item in items:
        period = item_period(item, folder_periods)
        if not period:
            continue
        year = period[:4]
        report_type = item["report_type"]
        rows = item.get("rows") or []
        docs_by_year[year] += 1
        rows_by_year[year] += len(rows)
        source_files_by_year[year].add(str(item.get("source_file") or item.get("source_path") or ""))

        for row in rows:
            if not isinstance(row, dict):
                continue
            amount = component_amount(report_type, row)
            revenue = gross_revenue_from_row(report_type, row)
            yearly[year][report_type] += amount
            yearly[year]["faturamento"] += revenue
            monthly[period][report_type] += amount
            monthly[period]["faturamento"] += revenue

    years = []
    for year in sorted(yearly):
        bucket = yearly[year]
        resultado = bucket["commissions"] + bucket["freight"] + bucket["promotions"] + bucket["markup"] + bucket["manual_payments"]
        years.append({
            "year": year,
            "documents": docs_by_year[year],
            "rows": rows_by_year[year],
            "source_files": len(source_files_by_year[year]),
            "faturamento": round(bucket["faturamento"], 2),
            "commissions": round(bucket["commissions"], 2),
            "freight": round(bucket["freight"], 2),
            "promotions": round(bucket["promotions"], 2),
            "markup": round(bucket["markup"], 2),
            "manual_payments": round(bucket["manual_payments"], 2),
            "resultado": round(resultado, 2),
        })

    months = []
    for period in sorted(monthly):
        bucket = monthly[period]
        resultado = bucket["commissions"] + bucket["freight"] + bucket["promotions"] + bucket["markup"] + bucket["manual_payments"]
        months.append({
            "month": period,
            "faturamento": round(bucket["faturamento"], 2),
            "commissions": round(bucket["commissions"], 2),
            "freight": round(bucket["freight"], 2),
            "promotions": round(bucket["promotions"], 2),
            "markup": round(bucket["markup"], 2),
            "manual_payments": round(bucket["manual_payments"], 2),
            "resultado": round(resultado, 2),
        })

    return {
        "source": "artifacts/raw/*.json",
        "version": 2,
        "scope": {
            "json_files": len(list(RAW_DIR.glob("*.json"))),
            "records": len(items),
            "years": len(years),
            "months": len(months),
        },
        "years": years,
        "months": months,
    }


def main() -> None:
    analytics = build()
    text = json.dumps(analytics, ensure_ascii=False, indent=2)
    ARTIFACTS_OUT.write_text(text, encoding="utf-8")
    FRONTEND_PUBLIC_OUT.write_text(text, encoding="utf-8")
    print(f"wrote {ARTIFACTS_OUT.relative_to(ROOT)}")
    print(f"wrote {FRONTEND_PUBLIC_OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
