from __future__ import annotations

import json
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT / "artifacts" / "raw"
ARTIFACTS_OUT = ROOT / "artifacts" / "analytics.json"
FRONTEND_OUT = ROOT / "frontend" / "src" / "analytics.json"


VALUE_FIELD_BY_REPORT = {
    "commissions": "Comissão Total",
    "promotions": "Restituição Total",
    "freight": "Restituição",
    "incentives": "Restituição",
    "markup": "Restituição Total",
    "manual_payments": "Restituição",
}

DISPLAY_BY_REPORT = {
    "commissions": "Comissões",
    "promotions": "Promoções",
    "freight": "Fretes",
    "incentives": "Incentivos",
    "markup": "Markup",
    "manual_payments": "Pagamentos Manuais",
}

ROLE_HINTS = {
    "Parceiro": "dimensao",
    "Produto": "dimensao",
    "Tipo de Entrega": "dimensao",
    "E-mail do entregador": "dimensao",
    "Indicadores": "dimensao",
    "Descrição": "dimensao",
    "Tipo de Pagamento": "dimensao",
    "No. do Pedido": "chave",
    "Pedido": "chave",
    "Semana": "chave",
    "Data do Pedido": "tempo",
    "Data": "tempo",
    "Horário do Pedido": "tempo",
    "Horário": "tempo",
}


@dataclass
class Record:
    report_type: str
    report_label: str
    sheet_name: str
    week_label: str
    folder_name: str
    source_file: str
    headers: list[str]
    rows: list[dict[str, Any]]


def parse_date(value: Any) -> datetime | None:
    if not value:
        return None
    text = str(value)
    for fmt in ("%d/%m/%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(text, fmt)
        except ValueError:
            continue
    return None


def to_float(value: Any) -> float:
    if value in (None, "", "-"):
        return 0.0
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value).strip().replace("%", "").replace(".", "").replace(",", ".")
    try:
        return float(text)
    except ValueError:
        return 0.0


def first_present(row: dict[str, Any], *keys: str) -> Any:
    for key in keys:
        value = row.get(key)
        if value not in (None, ""):
            return value
    return None


def slug_report_name(name: str) -> str:
    return (
        name.replace("Relatorio-", "")
        .replace("Descontos-e-Promocoes", "promotions")
        .replace("Comissoes", "commissions")
        .replace("Fretes", "freight")
        .replace("Incentivos", "incentives")
        .replace("Markup", "markup")
        .replace("Pagamentos-Manuais", "manual_payments")
    )


def get_week_label(file_name: str) -> str:
    after = file_name.split("-Semana-", 1)[1]
    return after.rsplit("-", 5)[0]


def load_records() -> list[Record]:
    records: list[Record] = []
    
    REPORT_TYPE_MAP = {
        "comissoes": "commissions",
        "commissions": "commissions",
        "descontos_e_promocoes": "promotions",
        "promotions": "promotions",
        "fretes": "freight",
        "freight": "freight",
        "incentivos": "incentives",
        "incentives": "incentives",
        "pagamentos_manuais": "manual_payments",
        "manual_payments": "manual_payments",
        "markup": "markup",
    }
    
    for file_path in sorted(RAW_DIR.glob("*.json")):
        try:
            content = json.loads(file_path.read_text())
            if isinstance(content, dict):
                content = [content]
            for item in content:
                if not isinstance(item, dict):
                    continue
                raw_type = item.get("report_type", "").lower()
                report_type = REPORT_TYPE_MAP.get(raw_type, raw_type)
                sheet_name = item.get("sheet_name", "")
                if report_type == "freight" and sheet_name != "Resumo":
                    continue
                records.append(
                    Record(
                        report_type=report_type,
                        report_label=DISPLAY_BY_REPORT[report_type],
                        sheet_name=item["sheet_name"],
                        week_label=get_week_label(file_path.name),
                        folder_name=item["folder_name"],
                        source_file=item["source_file"],
                        headers=item["headers"],
                        rows=item["rows"],
                    )
                )
        except Exception as e:
            print(f"Skipping {file_path.name}: {e}")
    return records


def compute_week_ranges(records: list[Record]) -> dict[str, dict[str, Any]]:
    ranges: dict[str, dict[str, Any]] = {}
    grouped: dict[str, list[datetime]] = defaultdict(list)
    for record in records:
        for row in record.rows:
            date = parse_date(row.get("Data do Pedido") or row.get("Data"))
            if date:
                grouped[record.week_label].append(date)

    for week_label, dates in grouped.items():
        start = min(dates)
        end = max(dates)
        ranges[week_label] = {
            "start_date": start.strftime("%Y-%m-%d"),
            "end_date": end.strftime("%Y-%m-%d"),
            "month_key": start.strftime("%Y-%m"),
        }
    return ranges


def aggregate(records: list[Record]) -> dict[str, Any]:
    week_ranges = compute_week_ranges(records)
    component_totals = Counter()
    weekly = defaultdict(Counter)
    monthly = defaultdict(Counter)
    top_products = Counter()
    top_markup_products = Counter()
    top_promo_products = Counter()
    product_units = Counter()
    top_drivers = Counter()
    top_delivery_types = Counter()
    manual_types = Counter()
    manual_descriptions = Counter()
    incentive_indicators = Counter()
    incentive_meta = defaultdict(lambda: {"orders": 0.0, "closing": set(), "target": set()})
    order_component_map = defaultdict(Counter)
    field_catalog: dict[str, dict[str, Any]] = {}
    report_shapes = []

    for record in records:
        week_meta = week_ranges.get(record.week_label, {})
        month_key = week_meta.get("month_key", "na")
        value_key = VALUE_FIELD_BY_REPORT[record.report_type]
        field_catalog.setdefault(
            record.report_type,
            {
                "label": record.report_label,
                "sheet_name": record.sheet_name,
                "fields": [],
            },
        )
        if not field_catalog[record.report_type]["fields"]:
            for header in record.headers:
                role = ROLE_HINTS.get(header)
                if not role:
                    role = "medida" if any(token in header for token in ["Preço", "Comissão", "Restituição", "Total", "Meta", "Quantidade", "Markup"]) else "dimensao"
                field_catalog[record.report_type]["fields"].append({"name": header, "role": role})

        report_total = 0.0
        for row in record.rows:
            value = to_float(row.get(value_key))
            report_total += value

            order_id = row.get("No. do Pedido") or row.get("Pedido") or row.get("Semana") or row.get("Descrição")
            if order_id:
                order_component_map[str(order_id)][record.report_type] += value

            if record.report_type == "commissions":
                product = row.get("Produto")
                if product:
                    top_products[product] += value
                    product_units[product] += to_float(row.get("Quantidade"))

            if record.report_type == "markup":
                product = row.get("Produto")
                if product:
                    top_markup_products[product] += value
                    product_units[product] += to_float(row.get("Unidades vendidas no Pedido"))

            if record.report_type == "promotions":
                top_promo_products["Cupom"] += to_float(row.get("Restituição Cupom"))
                top_promo_products["Desconto Zé"] += to_float(row.get("Restituição Desconto Zé"))
                top_promo_products["Brindes"] += to_float(row.get("Restituição Brindes"))

            if record.report_type == "freight":
                driver_email = first_present(row, "E-mail do entregador", "E-mail do Entregador")
                delivery_type = first_present(row, "Tipo de Entrega") or record.sheet_name or "Sem tipo"
                if driver_email:
                    top_drivers[driver_email] += value
                else:
                    top_drivers[f"Sem entregador informado ({delivery_type})"] += value
                top_delivery_types[delivery_type] += value

            if record.report_type == "manual_payments":
                manual_types[row.get("Tipo de Pagamento") or "Sem tipo"] += value
                manual_descriptions[row.get("Descrição") or "Sem descrição"] += value

            if record.report_type == "incentives":
                indicator = row.get("Indicadores") or "Sem indicador"
                incentive_indicators[indicator] += value
                meta = incentive_meta[indicator]
                meta["orders"] += to_float(row.get("Total de Pedidos"))
                if row.get("Fechamento da Semana"):
                    meta["closing"].add(str(row["Fechamento da Semana"]))
                if row.get("Meta"):
                    meta["target"].add(str(row["Meta"]))

        component_totals[record.report_type] += report_total
        weekly[record.week_label][record.report_type] += report_total
        monthly[month_key][record.report_type] += report_total
        report_shapes.append(
            {
                "report_type": record.report_type,
                "label": record.report_label,
                "sheet_name": record.sheet_name,
                "week_label": record.week_label,
                "row_count": len(record.rows),
                "field_count": len(record.headers),
            }
        )

    weekly_series = []
    for week_label, totals in weekly.items():
        meta = week_ranges.get(week_label, {})
        point = {
            "week_label": week_label.replace("-", " "),
            "week_key": week_label,
            "start_date": meta.get("start_date"),
            "end_date": meta.get("end_date"),
            "month_key": meta.get("month_key", "na"),
        }
        proxy_total = 0.0
        for report_type in DISPLAY_BY_REPORT:
            val = totals.get(report_type, 0.0)
            point[report_type] = round(val, 2)
            proxy_total += val
        point["proxy_total"] = round(proxy_total, 2)
        weekly_series.append(point)
    weekly_series.sort(key=lambda item: (item["start_date"] or "", item["week_key"]))

    monthly_series = []
    for month_key, totals in monthly.items():
        point = {"month_key": month_key}
        proxy_total = 0.0
        for report_type in DISPLAY_BY_REPORT:
            val = totals.get(report_type, 0.0)
            point[report_type] = round(val, 2)
            proxy_total += val
        point["proxy_total"] = round(proxy_total, 2)
        monthly_series.append(point)
    monthly_series.sort(key=lambda item: item["month_key"])

    total_proxy = round(sum(component_totals.values()), 2)
    losses = [
        {"key": report_type, "label": DISPLAY_BY_REPORT[report_type], "value": round(total, 2)}
        for report_type, total in component_totals.items()
        if total < 0
    ]
    gains = [
        {"key": report_type, "label": DISPLAY_BY_REPORT[report_type], "value": round(total, 2)}
        for report_type, total in component_totals.items()
        if total > 0
    ]
    losses.sort(key=lambda item: item["value"])
    gains.sort(key=lambda item: item["value"], reverse=True)

    nodes = [
        {"id": "reports", "label": "Relatorios Zé", "group": "origin"},
        {"id": "orders", "label": "Pedidos e Semanas", "group": "bridge"},
        {"id": "losses", "label": "Perdas e Ajustes", "group": "analysis"},
        {"id": "actions", "label": "Decisões do Dono", "group": "action"},
    ]
    edges = [
        {"from": "reports", "to": "orders", "label": "linhas e pedidos"},
        {"from": "orders", "to": "losses", "label": "repasse, desconto, comissão"},
        {"from": "losses", "to": "actions", "label": "margem, preço, frete, operação"},
    ]
    for report_type, meta in field_catalog.items():
        node_id = f"report:{report_type}"
        nodes.append({"id": node_id, "label": meta["label"], "group": "report"})
        edges.append({"from": "reports", "to": node_id, "label": meta["sheet_name"]})
        for field in meta["fields"]:
            field_id = f"field:{report_type}:{field['name']}"
            nodes.append({"id": field_id, "label": field["name"], "group": field["role"]})
            edges.append({"from": node_id, "to": field_id, "label": field["role"]})

    top_combined_products = []
    for product, _ in (top_markup_products + top_products).most_common(12):
        top_combined_products.append(
            {
                "product": product,
                "commission_total": round(top_products.get(product, 0.0), 2),
                "markup_total": round(top_markup_products.get(product, 0.0), 2),
                "units": round(product_units.get(product, 0.0), 0),
            }
        )

    weekly_proxy_sorted = sorted(weekly_series, key=lambda item: item["proxy_total"], reverse=True)
    strongest_week = weekly_proxy_sorted[0] if weekly_proxy_sorted else None
    weakest_week = sorted(weekly_series, key=lambda item: item["proxy_total"])[0] if weekly_series else None

    return {
        "scope": {
            "source": "Relatorios do Zé Delivery",
            "json_files": len(list(RAW_DIR.glob("*.json"))),
            "report_rows": sum(shape["row_count"] for shape in report_shapes),
            "weeks": len(weekly_series),
            "months": len(monthly_series),
        },
        "headline": {
            "proxy_total": total_proxy,
            "strongest_week": strongest_week,
            "weakest_week": weakest_week,
        },
        "components": {
            "totals": {
                report_type: round(component_totals.get(report_type, 0.0), 2)
                for report_type in DISPLAY_BY_REPORT
            },
            "losses": losses,
            "gains": gains,
        },
        "series": {
            "weekly": weekly_series,
            "monthly": monthly_series,
        },
        "breakdowns": {
            "top_products": top_combined_products,
            "promotion_buckets": [
                {"label": label, "value": round(value, 2)}
                for label, value in top_promo_products.most_common()
            ],
            "top_drivers": [
                {"label": label, "value": round(value, 2)}
                for label, value in top_drivers.most_common(10)
            ],
            "delivery_types": [
                {"label": label, "value": round(value, 2)}
                for label, value in top_delivery_types.most_common(10)
            ],
            "manual_types": [
                {"label": label, "value": round(value, 2)}
                for label, value in manual_types.most_common()
            ],
            "manual_descriptions_negative": [
                {"label": label, "value": round(value, 2)}
                for label, value in sorted(manual_descriptions.items(), key=lambda item: item[1])[:12]
            ],
            "incentive_indicators": [
                {
                    "label": label,
                    "value": round(value, 2),
                    "orders": round(incentive_meta[label]["orders"], 0),
                    "closing": sorted(incentive_meta[label]["closing"]),
                    "target": sorted(incentive_meta[label]["target"]),
                }
                for label, value in incentive_indicators.most_common()
            ],
        },
        "field_map": {
            "reports": field_catalog,
            "flow": {
                "nodes": nodes,
                "edges": edges,
            },
        },
        "notes": [
            "A leitura continua restrita aos relatórios financeiros do Zé Delivery; custo de mercadoria, imposto e despesas internas seguem fora do escopo.",
            "As semanas do material nao sao uma sequencia continua de calendario, entao os graficos mostram amostras operacionais e nao um painel contiguo dia a dia.",
            "O mesmo parceiro domina praticamente toda a base, o que ajuda a leitura do deposito mas limita comparacoes entre parceiros.",
        ],
    }


def main() -> None:
    records = load_records()
    analytics = aggregate(records)
    text = json.dumps(analytics, ensure_ascii=False, indent=2)
    ARTIFACTS_OUT.write_text(text)
    FRONTEND_OUT.write_text(text)
    print(f"wrote {ARTIFACTS_OUT.relative_to(ROOT)}")
    print(f"wrote {FRONTEND_OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
