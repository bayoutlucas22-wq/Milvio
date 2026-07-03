SHELL := /bin/sh

COMPOSE ?= docker compose
SERVICE ?= app
DB_SERVICE ?= db

.PHONY: help install dev build start check test lint up down logs ps shell db-shell clean

help:
	@printf '%s\n' \
		'Targets:' \
		'  make install   Install dependencies' \
		'  make dev       Start local dev server' \
		'  make build     Build client and server' \
		'  make start     Run production server from dist/' \
		'  make check     Typecheck the project' \
		'  make test      Run the test suite' \
		'  make up        Start Docker Compose stack' \
		'  make down      Stop Docker Compose stack' \
		'  make logs      Follow Docker Compose logs' \
		'  make shell     Open a shell in the app container' \
		'  make db-shell  Open a MySQL shell in the db container'

install:
	pnpm install

dev:
	pnpm dev

build:
	pnpm build

start:
	pnpm start

check:
	pnpm check

test:
	pnpm test

lint:
	pnpm exec prettier --check .

up:
	$(COMPOSE) up --build

down:
	$(COMPOSE) down

logs:
	$(COMPOSE) logs -f

ps:
	$(COMPOSE) ps

shell:
	$(COMPOSE) exec $(SERVICE) sh

db-shell:
	$(COMPOSE) exec $(DB_SERVICE) mysql -u$${MYSQL_USER:-app} -p$${MYSQL_PASSWORD:-app} $${MYSQL_DATABASE:-app}

clean:
	rm -rf dist .manus-logs
