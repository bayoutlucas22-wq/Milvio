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

from app.routers.insights import router as insights_router


ANALYTICS_PATH = Path(os.getenv("ANALYTICS_PATH", "/data/artifacts/analytics.json"))
ANALYTICS_V2_PATH = Path(os.getenv("ANALYTICS_V2_PATH", "/data/artifacts/analytics_v2.json"))
ARTIFACTS_DIR = Path("/data/artifacts")
ARTIFACTS_SOURCE_DIRS = [
    ARTIFACTS_DIR / "raw" / "by_xlsx_source",
    ARTIFACTS_DIR / "raw" / "by_year_month_clean",
    ARTIFACTS_DIR / "raw" / "by_year_month",
    ARTIFACTS_DIR / "raw",
    ARTIFACTS_DIR,
]
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

app.include_router(insights_router)


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
    files: list[str] = []
    seen: set[str] = set()
    for base_dir in ARTIFACTS_SOURCE_DIRS:
        if not base_dir.exists():
            continue
        for path in base_dir.rglob("*.json"):
            try:
                relative = str(path.relative_to(ARTIFACTS_DIR))
            except ValueError:
                relative = str(path)
            if relative in seen:
                continue
            seen.add(relative)
            files.append(relative)
    return sorted(files)


@app.get("/api/artifacts/content")
def get_artifact_content(path: str) -> Any:
    if not path:
        raise HTTPException(status_code=400, detail="Path is required")
    
    target_path = resolve_artifact_path(path)
    
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
    if not ANALYTICS_V2_PATH.exists():
        raise HTTPException(status_code=404, detail="analytics_v2.json not found")
    payload = json.loads(ANALYTICS_V2_PATH.read_text())
    return {"ok": True, **payload}


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


def resolve_artifact_path(path: str) -> Path:
    candidate = ARTIFACTS_DIR / path
    try:
        candidate.resolve().relative_to(ARTIFACTS_DIR.resolve())
        return candidate
    except ValueError:
        raise HTTPException(status_code=403, detail="Access denied")


