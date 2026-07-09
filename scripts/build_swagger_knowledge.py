from __future__ import annotations

import json
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
SWAGGER_PATH = ROOT / "swagger_ambev.json"
OUT_PATH = ROOT / "artifacts" / "swagger_knowledge.json"


def compact_schema(schema: dict[str, Any]) -> dict[str, Any]:
    return {
        "type": schema.get("type"),
        "description": schema.get("description"),
        "required": schema.get("required", []),
        "properties": sorted((schema.get("properties") or {}).keys()),
    }


def main() -> None:
    swagger = json.loads(SWAGGER_PATH.read_text())
    paths = []
    for path, methods in sorted((swagger.get("paths") or {}).items()):
        for method, operation in sorted((methods or {}).items()):
            if method.lower() not in {"get", "post", "put", "patch", "delete"}:
                continue
            paths.append(
                {
                    "method": method.upper(),
                    "path": path,
                    "tags": operation.get("tags", []),
                    "summary": operation.get("summary"),
                    "description": operation.get("description"),
                    "operation_id": operation.get("operationId"),
                    "parameters": [
                        {
                            "name": param.get("name"),
                            "in": param.get("in"),
                            "required": param.get("required", False),
                            "description": param.get("description"),
                        }
                        for param in operation.get("parameters", [])
                    ],
                    "responses": sorted((operation.get("responses") or {}).keys()),
                }
            )

    schemas = {
        name: compact_schema(schema)
        for name, schema in sorted((swagger.get("components", {}).get("schemas") or {}).items())
    }

    knowledge = {
        "source_file": str(SWAGGER_PATH.name),
        "title": swagger.get("info", {}).get("title"),
        "version": swagger.get("info", {}).get("version"),
        "openapi": swagger.get("openapi"),
        "servers": swagger.get("servers", []),
        "tags": swagger.get("tags", []),
        "paths": paths,
        "schemas": schemas,
        "retrieval_notes": [
            "Use this OpenAPI-derived knowledge as documented API context only.",
            "Do not infer commercial rules that are not present in the documentation.",
            "When analyzing reports, separate API capabilities from financial conclusions.",
        ],
    }
    OUT_PATH.write_text(json.dumps(knowledge, ensure_ascii=False, indent=2))
    print(f"wrote {OUT_PATH.relative_to(ROOT)}")
    print(f"paths {len(paths)}")
    print(f"schemas {len(schemas)}")


if __name__ == "__main__":
    main()
