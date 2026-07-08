COMPOSE ?= docker compose

.PHONY: help up down build rebuild logs clean analytics

help:
	@printf '%s\n' "Available targets:"
	@printf '%s\n' "  make up       Build and start the app"
	@printf '%s\n' "  make down     Stop the app"
	@printf '%s\n' "  make build    Build the frontend image"
	@printf '%s\n' "  make rebuild  Rebuild and start the app"
	@printf '%s\n' "  make logs     Follow frontend logs"
	@printf '%s\n' "  make analytics Rebuild analytics.json from raw reports"
	@printf '%s\n' "  make clean    Remove Docker build cache for this project"

up:
	$(COMPOSE) up -d --build

down:
	$(COMPOSE) down

build:
	$(COMPOSE) build

rebuild:
	$(COMPOSE) down
	$(COMPOSE) up -d --build

logs:
	$(COMPOSE) logs -f frontend

analytics:
	python3 scripts/build_analytics.py

clean:
	$(COMPOSE) down --volumes --remove-orphans
