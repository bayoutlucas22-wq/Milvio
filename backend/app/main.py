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


def read_cache() -> dict[str, Any] | None:
    try:
        value = redis_client.get(CACHE_KEY)
    except RedisError:
        return None
    if not value:
        return None
    return json.loads(value)


def write_cache(data: dict[str, Any]) -> None:
    try:
        redis_client.setex(CACHE_KEY, CACHE_SECONDS, json.dumps(data, ensure_ascii=False))
    except RedisError:
        return


def read_analytics_file() -> dict[str, Any]:
    if not ANALYTICS_PATH.exists():
        raise HTTPException(status_code=404, detail="analytics.json not found")
    return json.loads(ANALYTICS_PATH.read_text())
