import sys
import json
from pathlib import Path
from backend.app.services.calculator import normalize_report_type, sum_document_amount

ARTIFACTS_DIR = Path("artifacts")
ARTIFACTS_SOURCE_DIRS = [
    ARTIFACTS_DIR / "raw" / "by_xlsx_source",
    ARTIFACTS_DIR / "raw" / "by_year_month_clean",
    ARTIFACTS_DIR / "raw" / "by_year_month",
    ARTIFACTS_DIR / "raw",
    ARTIFACTS_DIR,
]

files = []
seen = set()
for base_dir in ARTIFACTS_SOURCE_DIRS:
    if not base_dir.exists():
        continue
    for path in base_dir.rglob("*.json"):
        if path in seen:
            continue
        seen.add(path)
        files.append(path)

totals = { "commissions": 0.0, "freight": 0.0, "promotions": 0.0, "markup": 0.0, "manual_payments": 0.0 }
processed = 0

for file_path in files:
    name_lower = file_path.name.lower()
    report_type = "unknown"
    if "comiss" in name_lower:
        report_type = "commissions"
    elif "frete" in name_lower:
        report_type = "freight"
    elif "promoc" in name_lower or "desconto" in name_lower:
        report_type = "promotions"
    elif "markup" in name_lower:
        report_type = "markup"
    elif "manu" in name_lower or "incentiv" in name_lower:
        report_type = "manual_payments"
    
    report_type = normalize_report_type(report_type)
    
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            if isinstance(data, list):
                for doc in data:
                    if isinstance(doc, dict) and "rows" in doc and isinstance(doc["rows"], list):
                        doc_report_type = doc.get("report_type", report_type)
                        doc_report_type = normalize_report_type(doc_report_type)
                        val = sum_document_amount(doc_report_type, doc["rows"])
                        totals[doc_report_type] += val
                        processed += 1
    except Exception as e:
        print(f"Error {file_path}: {e}")

print("Totals:", json.dumps(totals, indent=2))
print("Processed docs:", processed)
