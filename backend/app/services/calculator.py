import re
from typing import Any

def extract_year(path: str) -> str | None:
    match = re.search(r"/(20\d{2})/", path)
    return match.group(1) if match else None

def normalize_report_type(report_type: str) -> str:
    mapping = {
        "comissoes": "commissions",
        "commissions": "commissions",
        "fretes": "freight",
        "freight": "freight",
        "descontos_e_promocoes": "promotions",
        "promotions": "promotions",
        "markup": "markup",
        "manual_payments": "manual_payments",
        "pagamentos_manuais": "manual_payments",
        "incentives": "manual_payments",
        "incentivos": "manual_payments",
    }
    return mapping.get(report_type, report_type)

def numeric_value(value: Any) -> float:
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        value = value.strip().replace("R$", "").replace(".", "").replace(",", ".")
        try:
            return float(value)
        except ValueError:
            return 0.0
    return 0.0

def sum_document_amount(report_type: str, rows: list[dict[str, Any]]) -> float:
    total = 0.0
    for row in rows:
        if not isinstance(row, dict):
            continue
        if report_type == "commissions":
            total += numeric_value(row.get("Comissão Total") or row.get("Restituição Total") or row.get("Restituição"))
        elif report_type == "freight":
            total += numeric_value(row.get("Restituição") or row.get("Frete Total Negociado"))
        elif report_type == "promotions":
            total += numeric_value(row.get("Restituição Total") or row.get("Restituição Cupom") or row.get("Restituição Desconto Zé") or row.get("Restituição Brindes"))
        elif report_type == "markup":
            total += numeric_value(row.get("Restituição Total") or row.get("Restituição"))
        elif report_type == "manual_payments":
            total += numeric_value(row.get("Restituição") or row.get("Incentivo/Dedução"))
    return total
