from fastapi import APIRouter, HTTPException
import json
from pathlib import Path
from typing import Any
from collections import defaultdict

from app.services.calculator import normalize_report_type, sum_document_amount

router = APIRouter(prefix="/api/insights", tags=["insights"])

# In a real setup, this path should be imported from config, but we match main.py for now
ARTIFACTS_DIR = Path("/data/artifacts")
ARTIFACTS_SOURCE_DIRS = [
    ARTIFACTS_DIR / "raw" / "by_xlsx_source",
    ARTIFACTS_DIR / "raw" / "by_year_month_clean",
    ARTIFACTS_DIR / "raw" / "by_year_month",
    ARTIFACTS_DIR / "raw",
    ARTIFACTS_DIR,
]

def get_all_artifacts() -> list[Path]:
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
    return files

@router.get("/summary")
def get_summary() -> dict[str, Any]:
    """Calculates proxy totals from all artifacts dynamically."""
    totals = defaultdict(float)
    files = get_all_artifacts()
    
    for file_path in files:
        # Extract report type from filename or path
        # Example filename: comissoes_semana_44.json
        name_lower = file_path.name.lower()
        
        # Determine base type
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
                            # The file might also specify report_type inside the doc!
                            doc_report_type = doc.get("report_type", report_type)
                            doc_report_type = normalize_report_type(doc_report_type)
                            val = sum_document_amount(doc_report_type, doc["rows"])
                            totals[doc_report_type] += val
        except Exception:
            pass

    proxy_total = sum(totals.values())
    
    return {
        "ok": True,
        "totals": dict(totals),
        "proxy_total": proxy_total,
        "files_processed": len(files)
    }
