import json
from collections import defaultdict
from pathlib import Path
from datetime import datetime

ROOT = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT / "artifacts" / "raw"

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

def parse_date(date_str: str) -> str:
    # Typical formats: DD/MM/YYYY, DD/MM/YYYY HH:MM:SS, or YYYY-MM-DD
    if not date_str:
        return ""
    date_str = date_str.split(" ")[0]
    if "/" in date_str:
        parts = date_str.split("/")
        if len(parts[0]) == 4:
            return f"{parts[0]}-{parts[1].zfill(2)}-{parts[2].zfill(2)}"
        return f"{parts[2]}-{parts[1].zfill(2)}-{parts[0].zfill(2)}"
    return date_str

def parse_money(val) -> float:
    if isinstance(val, (int, float)):
        return float(val)
    if not val:
        return 0.0
    val = str(val).replace("R$", "").replace(".", "").replace(",", ".").strip()
    try:
        return float(val)
    except:
        return 0.0

def main():
    daily_data = defaultdict(lambda: {
        "faturamento": 0.0,
        "comissao": 0.0,
        "markup": 0.0,
        "frete": 0.0,
        "desconto": 0.0,
        "pedidos": set(),
        "resultado_proxy": 0.0
    })

    for file_path in RAW_DIR.glob("*.json"):
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
                
                rows = item.get("rows", [])
                for row in rows:
                    date_val = row.get("Data do Pedido") or row.get("Data") or ""
                    date_val = parse_date(date_val)
                    if not date_val or date_val == "":
                        continue
                        
                    d = daily_data[date_val]
                    
                    if report_type == "commissions":
                        q = parse_money(row.get("Quantidade", 0))
                        p = parse_money(row.get("Preço Unitário de Venda", 0))
                        d["faturamento"] += (q * p)
                        d["comissao"] += parse_money(row.get("Comissão Total", 0))
                        order_id = row.get("Pedido") or row.get("No. do Pedido")
                        if order_id:
                            d["pedidos"].add(str(order_id))
                    elif report_type == "markup":
                        d["markup"] += parse_money(row.get("Restituição Total", 0))
                    elif report_type == "promotions":
                        d["desconto"] += parse_money(row.get("Restituição Total", 0))
                    elif report_type == "freight":
                        d["frete"] += parse_money(row.get("Restituição", 0))
                        order_id = row.get("Pedido") or row.get("No. do Pedido")
                        if order_id:
                            d["pedidos"].add(str(order_id))
        except Exception as e:
            print(f"Skipping {file_path.name}: {e}")

    # Build list and calculate proxy
    result_daily = []
    for date_key in sorted(daily_data.keys()):
        d = daily_data[date_key]
        pedidos_count = len(d["pedidos"])
        proxy = d["comissao"] + d["markup"] + d["frete"] + d["desconto"]
        result_daily.append({
            "date": date_key,
            "faturamento": d["faturamento"],
            "comissao": d["comissao"],
            "markup": d["markup"],
            "frete": d["frete"],
            "desconto": d["desconto"],
            "pedidos": pedidos_count,
            "resultado_proxy": proxy
        })

    # Build monthly
    monthly_data = defaultdict(lambda: {
        "faturamento": 0.0,
        "comissao": 0.0,
        "markup": 0.0,
        "frete": 0.0,
        "desconto": 0.0,
        "pedidos": 0,
        "resultado_proxy": 0.0,
        "days": 0
    })

    for d in result_daily:
        m = d["date"][:7]
        md = monthly_data[m]
        md["faturamento"] += d["faturamento"]
        md["comissao"] += d["comissao"]
        md["markup"] += d["markup"]
        md["frete"] += d["frete"]
        md["desconto"] += d["desconto"]
        md["pedidos"] += d["pedidos"]
        md["resultado_proxy"] += d["resultado_proxy"]
        md["days"] += 1

    result_monthly = []
    for month_key in sorted(monthly_data.keys()):
        md = monthly_data[month_key]
        result_monthly.append({
            "month": month_key,
            "faturamento": md["faturamento"],
            "comissao": md["comissao"],
            "markup": md["markup"],
            "frete": md["frete"],
            "desconto": md["desconto"],
            "pedidos": md["pedidos"],
            "resultado_proxy": md["resultado_proxy"],
            "days": md["days"]
        })

    # Save to artifacts and public
    for path in [ROOT / "artifacts" / "timeline_daily.json", ROOT / "frontend" / "public" / "timeline_daily.json"]:
        path.write_text(json.dumps(result_daily, indent=2))
        
    for path in [ROOT / "artifacts" / "timeline_monthly.json", ROOT / "frontend" / "public" / "timeline_monthly.json"]:
        path.write_text(json.dumps(result_monthly, indent=2))
        
    print(f"Generated timelines with {len(result_daily)} days and {len(result_monthly)} months.")

if __name__ == "__main__":
    main()
