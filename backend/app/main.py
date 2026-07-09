from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from redis import Redis
from redis.exceptions import RedisError


ANALYTICS_PATH = Path(os.getenv("ANALYTICS_PATH", "/data/artifacts/analytics.json"))
ARTIFACTS_DIR = Path("/data/artifacts")
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")
CACHE_KEY = os.getenv("ANALYTICS_CACHE_KEY", "app-milvio:analytics:v1")
CACHE_SECONDS = int(os.getenv("ANALYTICS_CACHE_SECONDS", "3600"))

app = FastAPI(title="APP-milvio Analytics API", version="0.1.0")
redis_client = Redis.from_url(REDIS_URL, decode_responses=True)

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



