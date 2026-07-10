import json
from backend.app.routers.insights import get_summary

print(json.dumps(get_summary(), indent=2))
