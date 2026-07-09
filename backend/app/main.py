from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient
from pymongo.errors import PyMongoError
from redis import Redis
from redis.exceptions import RedisError


ANALYTICS_PATH = Path(os.getenv("ANALYTICS_PATH", "/data/artifacts/analytics.json"))
ARTIFACTS_DIR = Path("/data/artifacts")
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://mongo:27017")
MONGODB_DB = os.getenv("MONGODB_DB", "milvio")
MONGO_CLEAN_COLLECTION = os.getenv("MONGODB_CLEAN_COLLECTION", "artifacts_clean")
CACHE_KEY = os.getenv("ANALYTICS_CACHE_KEY", "app-milvio:analytics:v1")
CACHE_SECONDS = int(os.getenv("ANALYTICS_CACHE_SECONDS", "3600"))

app = FastAPI(title="APP-milvio Analytics API", version="0.1.0")
redis_client = Redis.from_url(REDIS_URL, decode_responses=True)
mongo_client = MongoClient(MONGODB_URL, serverSelectionTimeoutMS=1500)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, Any]:
    redis_ok = True
    try:
        redis_client.ping()
    except RedisError:
        redis_ok = False

    return {
        "ok": True,
        "redis": redis_ok,
        "analytics_exists": ANALYTICS_PATH.exists(),
    }


@app.get("/api/analytics")
def get_analytics() -> dict[str, Any]:
    cached = read_cache()
    if cached is not None:
        return {"source": "redis", "data": cached}

    data = read_analytics_file()
    write_cache(data)
    return {"source": "file", "data": data}


@app.post("/api/analytics/refresh")
def refresh_analytics() -> dict[str, Any]:
    data = read_analytics_file()
    write_cache(data)
    return {"source": "file", "cached": True, "data": data}


@app.get("/api/artifacts")
def list_artifacts() -> list[str]:
    if not ARTIFACTS_DIR.exists():
        return []
    
    files = []
    for path in ARTIFACTS_DIR.rglob("*.json"):
        files.append(str(path.relative_to(ARTIFACTS_DIR)))
    return files


@app.get("/api/artifacts/content")
def get_artifact_content(path: str) -> Any:
    if not path:
        raise HTTPException(status_code=400, detail="Path is required")
    
    target_path = ARTIFACTS_DIR / path
    
    try:
        # Prevent directory traversal
        target_path.resolve().relative_to(ARTIFACTS_DIR.resolve())
    except ValueError:
        raise HTTPException(status_code=403, detail="Access denied")
        
    if not target_path.exists():
        raise HTTPException(status_code=404, detail="Artifact not found")
        
    return json.loads(target_path.read_text(encoding='utf-8'))


@app.get("/api/mongo/overview")
def mongo_overview() -> dict[str, Any]:
    try:
        db = mongo_client[MONGODB_DB]
        collections = []
        for name in sorted(db.list_collection_names()):
            collection = db[name]
            count = collection.estimated_document_count()
            sample = collection.find_one({}, {"_id": 0})
            fields = sorted(sample.keys()) if isinstance(sample, dict) else []
            collections.append({
                "name": name,
                "documents": count,
                "fields": fields,
                "sample": sample,
            })

        return {
            "ok": True,
            "db": MONGODB_DB,
            "url": MONGODB_URL,
            "collections": collections,
        }
    except PyMongoError as exc:
        raise HTTPException(status_code=503, detail=f"Mongo unavailable: {exc}") from exc


@app.get("/api/faturamento/v2")
def faturamento_v2() -> dict[str, Any]:
    try:
        db = mongo_client[MONGODB_DB]
        collection = db[MONGO_CLEAN_COLLECTION]
        yearly: dict[str, dict[str, Any]] = {}

        for doc in collection.find({}, {"_id": 0, "path": 1, "report_type": 1, "rows": 1}):
            year = extract_year(doc.get("path") or "")
            if year is None:
                continue
            bucket = yearly.setdefault(year, {
                "year": year,
                "documents": 0,
                "commissions": 0.0,
                "freight": 0.0,
                "promotions": 0.0,
                "markup": 0.0,
                "manual_payments": 0.0,
            })
            bucket["documents"] += 1
            report_type = normalize_report_type(str(doc.get("report_type") or ""))
            amount = sum_document_amount(report_type, doc.get("rows") or [])
            if report_type == "commissions":
                bucket["commissions"] += amount
            elif report_type == "freight":
                bucket["freight"] += amount
            elif report_type == "promotions":
                bucket["promotions"] += amount
            elif report_type == "markup":
                bucket["markup"] += amount
            elif report_type == "manual_payments":
                bucket["manual_payments"] += amount

        years = sorted(yearly.values(), key=lambda item: item["year"])
        for row in years:
          row["resultado"] = row["markup"] + row["promotions"] + row["manual_payments"] + row["freight"] + row["commissions"]

        return {
            "ok": True,
            "collection": MONGO_CLEAN_COLLECTION,
            "years": years,
        }
    except PyMongoError as exc:
        raise HTTPException(status_code=503, detail=f"Mongo unavailable: {exc}") from exc


def read_cache() -> dict[str, Any] | None:
    return read_json_cache(CACHE_KEY)


def read_json_cache(key: str) -> dict[str, Any] | None:
    try:
        value = redis_client.get(key)
    except RedisError:
        return None
    if not value:
        return None
    return json.loads(value)


def write_cache(data: dict[str, Any]) -> None:
    write_json_cache(CACHE_KEY, data, CACHE_SECONDS)


def write_json_cache(key: str, data: dict[str, Any], ttl_seconds: int) -> None:
    try:
        redis_client.setex(key, ttl_seconds, json.dumps(data, ensure_ascii=False))
    except RedisError:
        return


def read_analytics_file() -> dict[str, Any]:
    if not ANALYTICS_PATH.exists():
        raise HTTPException(status_code=404, detail="analytics.json not found")
    return json.loads(ANALYTICS_PATH.read_text())


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

