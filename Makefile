.PHONY: up down restart logs build backend-shell frontend-shell migrate-up migrate-down test lint

up:
	docker compose up -d --build

down:
	docker compose down

restart:
	docker compose down && docker compose up -d --build

logs:
	docker compose logs -f

build:
	docker compose build

backend-shell:
	docker compose exec backend sh

frontend-shell:
	docker compose exec frontend sh

migrate-up:
	docker compose exec backend sh -c "echo 'migrations entram a partir da Fase 2'"

migrate-down:
	docker compose exec backend sh -c "echo 'migrations entram a partir da Fase 2'"

test:
	cd backend && go test ./...
	cd frontend && npm run test

lint:
	cd backend && go vet ./...
	cd frontend && npm run lint
