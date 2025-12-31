# ============================================================================
# Reclapp 2.1.0 - AI-Native Declarative Platform
# ============================================================================
# 
# Usage:
#   make help          - Show all available commands
#   make install       - Install dependencies
#   make dev           - Start development server
#   make test          - Run all tests
#   make docker-up     - Start Docker services
#   make publish       - Publish to npm
#
# ============================================================================

.PHONY: help install dev build test lint clean publish release stop stop-docker stop-dev up down \
	docker-build docker-up docker-down docker-logs docker-restart docker-full docker-clean docker-shell \
	docker-check-ports docker-health \
	example-b2b-build example-b2b-up example-b2b-down example-b2b-logs example-b2b-check-ports example-b2b-health \
	example-iot-build example-iot-up example-iot-down example-iot-logs example-iot-check-ports example-iot-health \
	example-agent-build example-agent-up example-agent-down example-agent-logs example-agent-check-ports example-agent-health \
	examples-build-all examples-down-all \
	env-check env-show env-init \
	auto-up auto-b2b auto-iot auto-agent

# Colors for output
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NC := \033[0m # No Color

# Project info
PROJECT_NAME := reclapp
VERSION := 2.1.0
DOCKER_IMAGE := reclapp/platform

# ============================================================================
# ENV (load .env if present)
# ============================================================================

ifneq (,$(wildcard .env))
include .env
export $(shell sed -n 's/^\([A-Za-z_][A-Za-z0-9_]*\)=.*/\1/p' .env)
endif

# Defaults (can be overridden by .env or environment)
NODE_ENV ?= development
PORT ?= 8080
HOST ?= 0.0.0.0
FRONTEND_PORT ?= 3000
EVENTSTORE_HTTP_PORT ?= 2113
REDIS_PORT ?= 6379
POSTGRES_PORT ?= 5432

# Docker port defaults
DOCKER_API_PORT ?= $(PORT)
DOCKER_FRONTEND_PORT ?= $(FRONTEND_PORT)
DOCKER_EVENTSTORE_HTTP_PORT ?= $(EVENTSTORE_HTTP_PORT)
DOCKER_REDIS_PORT ?= $(REDIS_PORT)
DOCKER_GRAFANA_PORT ?= 3001
DOCKER_PROMETHEUS_PORT ?= 9090

# Example port defaults
B2B_API_PORT ?= 8081
IOT_API_PORT ?= 8082
AGENT_ORCHESTRATOR_PORT ?= 8090

# URLs
API_URL ?= http://localhost:$(DOCKER_API_PORT)
FRONTEND_URL ?= $(if $(CORS_ORIGIN),$(CORS_ORIGIN),http://localhost:$(DOCKER_FRONTEND_PORT))
EVENTSTORE_HTTP_URL ?= http://localhost:$(DOCKER_EVENTSTORE_HTTP_PORT)
GRAFANA_URL ?= http://localhost:$(DOCKER_GRAFANA_PORT)
PROMETHEUS_URL ?= http://localhost:$(DOCKER_PROMETHEUS_PORT)

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

# Check if a port is in use (returns 0 if in use, 1 if free)
define check_port
	@if ss -tuln 2>/dev/null | grep -q ":$(1) " || netstat -tuln 2>/dev/null | grep -q ":$(1) "; then \
		echo "$(RED)✗ Port $(1) is already in use$(NC)"; \
		exit 1; \
	else \
		echo "$(GREEN)✓ Port $(1) is available$(NC)"; \
	fi
endef

# Check if a URL is healthy (with retries)
define check_health
	@echo "$(BLUE)  Checking $(1)...$(NC)"; \
	for i in 1 2 3 4 5 6 7 8 9 10; do \
		if curl -sf "$(1)" >/dev/null 2>&1; then \
			echo "$(GREEN)  ✓ $(1) is healthy$(NC)"; \
			break; \
		fi; \
		if [ $$i -eq 10 ]; then \
			echo "$(YELLOW)  ⚠ $(1) not responding (may still be starting)$(NC)"; \
		else \
			sleep 2; \
		fi; \
	done
endef

# ============================================================================
# HELP
# ============================================================================

help: ## Show this help message
	@echo ""
	@echo "$(BLUE)╔═══════════════════════════════════════════════════════════════╗$(NC)"
	@echo "$(BLUE)║          Reclapp $(VERSION) - AI-Native Platform                  ║$(NC)"
	@echo "$(BLUE)╚═══════════════════════════════════════════════════════════════╝$(NC)"
	@echo ""
	@echo "$(GREEN)Available commands:$(NC)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-20s$(NC) %s\n", $$1, $$2}'
	@echo ""

# ============================================================================
# INSTALLATION
# ============================================================================

install: ## Install all dependencies
	@echo "$(BLUE)📦 Installing dependencies...$(NC)"
	npm install
	cd frontend && npm install
	@echo "$(GREEN)✓ Dependencies installed$(NC)"

install-ci: ## Install dependencies for CI (no optional deps)
	@echo "$(BLUE)📦 Installing CI dependencies...$(NC)"
	npm ci
	cd frontend && npm ci
	@echo "$(GREEN)✓ CI dependencies installed$(NC)"

# ============================================================================
# DEVELOPMENT
# ============================================================================

dev: ## Start development server with hot reload
	@echo "$(BLUE)🚀 Starting development server...$(NC)"
	@$(MAKE) stop-dev >/dev/null 2>&1 || true
	npm run dev

stop: ## Stop all services (Docker + local dev)
	@echo "$(BLUE)🛑 Stopping all services...$(NC)"
	@$(MAKE) stop-docker
	@$(MAKE) stop-dev || true
	@echo "$(GREEN)✓ All services stopped$(NC)"

stop-docker: ## Stop Docker services
	@echo "$(BLUE)🐳 Stopping Docker services...$(NC)"
	@docker compose down --remove-orphans >/dev/null 2>&1 || true
	@$(MAKE) example-b2b-down >/dev/null 2>&1 || true
	@$(MAKE) example-iot-down >/dev/null 2>&1 || true
	@$(MAKE) example-agent-down >/dev/null 2>&1 || true

stop-dev: ## Stop local dev processes (API + frontend). Use DEBUG=1 for verbose output.
	@echo "$(BLUE)🧹 Stopping local dev processes...$(NC)"
	@self=$$$$; parent=$$PPID; make_pids=$$(pgrep -f "^make" 2>/dev/null | tr '\n' ' ' || true); \
	pids=$$(pgrep -f "api/src/server.ts|ts-node-dev|vite" 2>/dev/null | sort -u || true); \
	pids_by_port=""; \
	if command -v ss >/dev/null 2>&1; then \
		pids_by_port=$$(ss -ltnp 2>/dev/null | awk -v port="$(PORT)" 'NR>1 && $$4 ~ ":"port"$$" { if (match($$0, /pid=([0-9]+)/, m)) print m[1]; }' | sort -u); \
	elif command -v lsof >/dev/null 2>&1; then \
		pids_by_port=$$(lsof -tiTCP:$(PORT) -sTCP:LISTEN 2>/dev/null | sort -u); \
	fi; \
	[ "$(DEBUG)" = "1" ] && echo "[DEBUG] self=$$self parent=$$parent make_pids=$$make_pids"; \
	[ "$(DEBUG)" = "1" ] && echo "[DEBUG] pids from pgrep: $$pids"; \
	[ "$(DEBUG)" = "1" ] && echo "[DEBUG] pids from port $(PORT): $$pids_by_port"; \
	for pid in $$pids $$pids_by_port; do \
		[ -z "$$pid" ] && continue; \
		[ "$$pid" = "$$self" ] && { [ "$(DEBUG)" = "1" ] && echo "[DEBUG] skip self $$pid"; continue; }; \
		[ "$$pid" = "$$parent" ] && { [ "$(DEBUG)" = "1" ] && echo "[DEBUG] skip parent $$pid"; continue; }; \
		echo " $$make_pids " | grep -q " $$pid " && { [ "$(DEBUG)" = "1" ] && echo "[DEBUG] skip make $$pid"; continue; }; \
		args=$$(ps -p $$pid -o args= 2>/dev/null || true); \
		echo "$$args" | grep -qE "(node|ts-node|ts-node-dev|vite)" || { [ "$(DEBUG)" = "1" ] && echo "[DEBUG] skip non-node $$pid: $$args"; continue; }; \
		echo "$$args" | grep -qE "(make|Makefile)" && { [ "$(DEBUG)" = "1" ] && echo "[DEBUG] skip make-related $$pid: $$args"; continue; }; \
		[ "$(DEBUG)" = "1" ] && echo "[DEBUG] killing $$pid: $$args"; \
		kill -TERM $$pid 2>/dev/null || true; \
	done; \
	sleep 0.2; \
	for pid in $$pids $$pids_by_port; do \
		[ -z "$$pid" ] && continue; \
		[ "$$pid" = "$$self" ] && continue; \
		[ "$$pid" = "$$parent" ] && continue; \
		echo " $$make_pids " | grep -q " $$pid " && continue; \
		args=$$(ps -p $$pid -o args= 2>/dev/null || true); \
		echo "$$args" | grep -qE "(node|ts-node|ts-node-dev|vite)" || continue; \
		echo "$$args" | grep -qE "(make|Makefile)" && continue; \
		kill -KILL $$pid 2>/dev/null || true; \
	done

# ============================================================================
# AUTO (opinionated workflows)
# ============================================================================

auto-up: ## Stop everything, then start root Docker stack
	@$(MAKE) stop
	@$(MAKE) up

auto-b2b: ## Stop everything, then start B2B example
	@$(MAKE) stop
	@$(MAKE) example-b2b-up

auto-iot: ## Stop everything, then start IoT example
	@$(MAKE) stop
	@$(MAKE) example-iot-up

auto-agent: ## Stop everything, then start Multi-Agent example
	@$(MAKE) stop
	@$(MAKE) example-agent-up

dev-api: ## Start only API server
	@echo "$(BLUE)🚀 Starting API server...$(NC)"
	npm run dev

dev-frontend: ## Start only frontend dev server
	@echo "$(BLUE)🚀 Starting frontend...$(NC)"
	cd frontend && npm run dev

dev-all: ## Start all services in parallel
	@echo "$(BLUE)🚀 Starting all development services...$(NC)"
	@make -j2 dev-api dev-frontend

watch: ## Watch for changes and rebuild
	@echo "$(BLUE)👁️ Watching for changes...$(NC)"
	npm run build -- --watch

# ============================================================================
# BUILD
# ============================================================================

build: ## Build the project
	@echo "$(BLUE)🔨 Building project...$(NC)"
	npm run build
	@echo "$(GREEN)✓ Build complete$(NC)"

build-parser: ## Build DSL parser from grammar
	@echo "$(BLUE)🔨 Building DSL parser...$(NC)"
	npm run build:parser
	@echo "$(GREEN)✓ Parser built$(NC)"

build-frontend: ## Build frontend for production
	@echo "$(BLUE)🔨 Building frontend...$(NC)"
	cd frontend && npm run build
	@echo "$(GREEN)✓ Frontend built$(NC)"

build-all: build build-frontend ## Build everything
	@echo "$(GREEN)✓ All builds complete$(NC)"

# ============================================================================
# TESTING
# ============================================================================

test: ## Run all tests
	@echo "$(BLUE)🧪 Running all tests...$(NC)"
	npm test
	@echo "$(GREEN)✓ All tests passed$(NC)"

test-unit: ## Run unit tests only
	@echo "$(BLUE)🧪 Running unit tests...$(NC)"
	npm run test:unit

test-integration: ## Run integration tests only
	@echo "$(BLUE)🧪 Running integration tests...$(NC)"
	npm run test:integration

test-e2e: ## Run E2E tests only
	@echo "$(BLUE)🧪 Running E2E tests...$(NC)"
	npm run test:e2e

test-coverage: ## Run tests with coverage report
	@echo "$(BLUE)🧪 Running tests with coverage...$(NC)"
	npm run test:coverage
	@echo "$(GREEN)✓ Coverage report generated in coverage/$(NC)"

test-watch: ## Run tests in watch mode
	@echo "$(BLUE)🧪 Running tests in watch mode...$(NC)"
	npm run test:watch

test-ci: ## Run tests for CI pipeline
	@echo "$(BLUE)🧪 Running CI tests...$(NC)"
	npm run test:coverage -- --ci --reporters=default --reporters=jest-junit
	@echo "$(GREEN)✓ CI tests complete$(NC)"

# ============================================================================
# CODE QUALITY
# ============================================================================

lint: ## Run ESLint
	@echo "$(BLUE)🔍 Running linter...$(NC)"
	npm run lint

lint-fix: ## Run ESLint and fix issues
	@echo "$(BLUE)🔧 Fixing lint issues...$(NC)"
	npm run lint:fix

format: ## Format code with Prettier
	@echo "$(BLUE)✨ Formatting code...$(NC)"
	npm run format

typecheck: ## Run TypeScript type checking
	@echo "$(BLUE)🔍 Type checking...$(NC)"
	npm run typecheck

check-all: lint typecheck test ## Run all checks (lint, typecheck, test)
	@echo "$(GREEN)✓ All checks passed$(NC)"

# ============================================================================
# DOCKER
# ============================================================================

docker-build: ## Build Docker images
	@echo "$(BLUE)🐳 Building Docker images...$(NC)"
	docker compose build
	@echo "$(GREEN)✓ Docker images built$(NC)"

docker-up: docker-check-ports ## Start Docker services
	@echo "$(BLUE)🐳 Starting Docker services...$(NC)"
	docker compose up -d --build --remove-orphans
	@echo "$(GREEN)✓ Services started$(NC)"
	@echo ""
	@echo "$(YELLOW)Services available at:$(NC)"
	@echo "  API:        $(API_URL)"
	@echo "  Frontend:   $(FRONTEND_URL)"
	@echo "  EventStore: $(EVENTSTORE_HTTP_URL)"
	@echo "  Grafana:    $(GRAFANA_URL) (with --profile monitoring)"
	@echo "  Prometheus: $(PROMETHEUS_URL) (with --profile monitoring)"
	@echo ""
	@$(MAKE) docker-health

docker-check-ports: ## Check if required ports are available
	@echo "$(BLUE)🔍 Checking port availability...$(NC)"
	@PORTS_IN_USE=""; \
	for port in $(DOCKER_API_PORT) $(DOCKER_FRONTEND_PORT) $(DOCKER_EVENTSTORE_HTTP_PORT) $(DOCKER_REDIS_PORT); do \
		if ss -tuln 2>/dev/null | grep -q ":$$port " || netstat -tuln 2>/dev/null | grep -q ":$$port "; then \
			PORTS_IN_USE="$$PORTS_IN_USE $$port"; \
		fi; \
	done; \
	if [ -n "$$PORTS_IN_USE" ]; then \
		echo "$(RED)✗ Ports in use:$$PORTS_IN_USE$(NC)"; \
		echo "$(YELLOW)  Run 'make stop' to free ports or change ports in .env$(NC)"; \
		exit 1; \
	else \
		echo "$(GREEN)✓ All ports available$(NC)"; \
	fi

docker-health: ## Check health of running Docker services
	@echo "$(BLUE)🏥 Checking service health...$(NC)"
	@sleep 2
	@for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do \
		API_OK=$$(curl -sf "http://localhost:$(DOCKER_API_PORT)/api/health" >/dev/null 2>&1 && echo "1" || echo "0"); \
		ES_OK=$$(curl -sf "http://localhost:$(DOCKER_EVENTSTORE_HTTP_PORT)/health/live" >/dev/null 2>&1 && echo "1" || echo "0"); \
		REDIS_OK=$$(docker compose exec -T redis redis-cli ping 2>/dev/null | grep -q PONG && echo "1" || echo "0"); \
		if [ "$$API_OK" = "1" ] && [ "$$ES_OK" = "1" ] && [ "$$REDIS_OK" = "1" ]; then \
			echo "$(GREEN)✓ API:        healthy$(NC)"; \
			echo "$(GREEN)✓ EventStore: healthy$(NC)"; \
			echo "$(GREEN)✓ Redis:      healthy$(NC)"; \
			exit 0; \
		fi; \
		if [ $$i -eq 15 ]; then \
			echo "$(YELLOW)Health status after 30s:$(NC)"; \
			[ "$$API_OK" = "1" ] && echo "$(GREEN)✓ API:        healthy$(NC)" || echo "$(RED)✗ API:        not ready$(NC)"; \
			[ "$$ES_OK" = "1" ] && echo "$(GREEN)✓ EventStore: healthy$(NC)" || echo "$(RED)✗ EventStore: not ready$(NC)"; \
			[ "$$REDIS_OK" = "1" ] && echo "$(GREEN)✓ Redis:      healthy$(NC)" || echo "$(RED)✗ Redis:      not ready$(NC)"; \
		else \
			sleep 2; \
		fi; \
	done

docker-down: ## Stop Docker services
	@echo "$(BLUE)🐳 Stopping Docker services...$(NC)"
	docker compose down --remove-orphans
	@echo "$(GREEN)✓ Services stopped$(NC)"
	@$(MAKE) docker-check-ports

docker-logs: ## Show Docker logs
	docker compose logs -f

docker-restart: docker-down docker-up ## Restart Docker services

up: docker-up ## Alias for docker-up

down: docker-down ## Alias for docker-down

logs: docker-logs ## Alias for docker-logs

docker-full: ## Start all services including hardware and monitoring
	@echo "$(BLUE)🐳 Starting full stack...$(NC)"
	docker compose --profile hardware --profile monitoring up -d
	@echo "$(GREEN)✓ Full stack started$(NC)"

docker-clean: ## Remove Docker containers and volumes
	@echo "$(RED)🗑️ Cleaning Docker resources...$(NC)"
	docker compose down -v --remove-orphans
	@echo "$(GREEN)✓ Docker resources cleaned$(NC)"
	@$(MAKE) docker-check-ports

docker-shell: ## Open shell in API container
	docker compose exec api sh

# ============================================================================
# EXAMPLES
# ============================================================================

example-b2b-build: ## Build B2B Risk Monitoring example
	@echo "$(BLUE)🔨 Building B2B Risk Monitoring example...$(NC)"
	cd examples/b2b-risk-monitoring && docker compose build
	@echo "$(GREEN)✓ B2B example built$(NC)"

example-b2b-check-ports: ## Check B2B example ports
	@echo "$(BLUE)🔍 Checking B2B ports...$(NC)"
	@PORTS_IN_USE=""; \
	for port in $(B2B_API_PORT) $(B2B_EVENTSTORE_HTTP_PORT) $(B2B_POSTGRES_PORT) $(B2B_REDIS_PORT); do \
		if ss -tuln 2>/dev/null | grep -q ":$$port " || netstat -tuln 2>/dev/null | grep -q ":$$port "; then \
			PORTS_IN_USE="$$PORTS_IN_USE $$port"; \
		fi; \
	done; \
	if [ -n "$$PORTS_IN_USE" ]; then \
		echo "$(RED)✗ Ports in use:$$PORTS_IN_USE$(NC)"; \
		exit 1; \
	else \
		echo "$(GREEN)✓ All B2B ports available$(NC)"; \
	fi

example-b2b-up: example-b2b-check-ports ## Start B2B Risk Monitoring example
	@echo "$(BLUE)🚀 Starting B2B Risk Monitoring example...$(NC)"
	cd examples/b2b-risk-monitoring && docker compose up -d
	@echo "$(GREEN)✓ B2B example started$(NC)"
	@echo "  API: http://localhost:$(B2B_API_PORT)"
	@$(MAKE) example-b2b-health

example-b2b-health: ## Check B2B example health
	@echo "$(BLUE)🏥 Checking B2B health...$(NC)"
	@for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do \
		API_OK=$$(curl -sf "http://localhost:$(B2B_API_PORT)/health" >/dev/null 2>&1 && echo "1" || echo "0"); \
		if [ "$$API_OK" = "1" ]; then \
			echo "$(GREEN)✓ B2B API: healthy$(NC)"; \
			exit 0; \
		fi; \
		if [ $$i -eq 15 ]; then \
			echo "$(YELLOW)⚠ B2B API: not ready after 30s$(NC)"; \
		else \
			sleep 2; \
		fi; \
	done

example-b2b-down: ## Stop B2B Risk Monitoring example
	@cd examples/b2b-risk-monitoring && docker compose down --remove-orphans
	@$(MAKE) example-b2b-check-ports

example-b2b-logs: ## Show B2B example logs
	cd examples/b2b-risk-monitoring && docker compose logs -f

example-iot-build: ## Build IoT Monitoring example
	@echo "$(BLUE)🔨 Building IoT Monitoring example...$(NC)"
	cd examples/iot-monitoring && docker compose build
	@echo "$(GREEN)✓ IoT example built$(NC)"

example-iot-check-ports: ## Check IoT example ports
	@echo "$(BLUE)🔍 Checking IoT ports...$(NC)"
	@PORTS_IN_USE=""; \
	for port in $(IOT_API_PORT) $(IOT_MQTT_PORT) $(IOT_INFLUXDB_PORT) $(IOT_EVENTSTORE_HTTP_PORT); do \
		if ss -tuln 2>/dev/null | grep -q ":$$port " || netstat -tuln 2>/dev/null | grep -q ":$$port "; then \
			PORTS_IN_USE="$$PORTS_IN_USE $$port"; \
		fi; \
	done; \
	if [ -n "$$PORTS_IN_USE" ]; then \
		echo "$(RED)✗ Ports in use:$$PORTS_IN_USE$(NC)"; \
		exit 1; \
	else \
		echo "$(GREEN)✓ All IoT ports available$(NC)"; \
	fi

example-iot-up: example-iot-check-ports ## Start IoT Monitoring example
	@echo "$(BLUE)🚀 Starting IoT Monitoring example...$(NC)"
	cd examples/iot-monitoring && docker compose up -d
	@echo "$(GREEN)✓ IoT example started$(NC)"
	@echo "  API: http://localhost:$(IOT_API_PORT)"
	@$(MAKE) example-iot-health

example-iot-health: ## Check IoT example health
	@echo "$(BLUE)🏥 Checking IoT health...$(NC)"
	@for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do \
		API_OK=$$(curl -sf "http://localhost:$(IOT_API_PORT)/health" >/dev/null 2>&1 && echo "1" || echo "0"); \
		if [ "$$API_OK" = "1" ]; then \
			echo "$(GREEN)✓ IoT API: healthy$(NC)"; \
			exit 0; \
		fi; \
		if [ $$i -eq 15 ]; then \
			echo "$(YELLOW)⚠ IoT API: not ready after 30s$(NC)"; \
		else \
			sleep 2; \
		fi; \
	done

example-iot-down: ## Stop IoT Monitoring example
	@cd examples/iot-monitoring && docker compose down --remove-orphans
	@$(MAKE) example-iot-check-ports

example-iot-logs: ## Show IoT example logs
	cd examples/iot-monitoring && docker compose logs -f

example-agent-build: ## Build Multi-Agent example
	@echo "$(BLUE)🔨 Building Multi-Agent example...$(NC)"
	cd examples/multi-agent && docker compose build
	@echo "$(GREEN)✓ Multi-Agent example built$(NC)"

example-agent-check-ports: ## Check Multi-Agent example ports
	@echo "$(BLUE)🔍 Checking Multi-Agent ports...$(NC)"
	@PORTS_IN_USE=""; \
	for port in $(AGENT_ORCHESTRATOR_PORT) $(AGENT_RISK_PORT) $(AGENT_COMPLIANCE_PORT) $(AGENT_CUSTOMER_PORT) $(AGENT_EVENTSTORE_HTTP_PORT) $(AGENT_REDIS_PORT) $(AGENT_RABBITMQ_PORT); do \
		if ss -tuln 2>/dev/null | grep -q ":$$port " || netstat -tuln 2>/dev/null | grep -q ":$$port "; then \
			PORTS_IN_USE="$$PORTS_IN_USE $$port"; \
		fi; \
	done; \
	if [ -n "$$PORTS_IN_USE" ]; then \
		echo "$(RED)✗ Ports in use:$$PORTS_IN_USE$(NC)"; \
		exit 1; \
	else \
		echo "$(GREEN)✓ All Multi-Agent ports available$(NC)"; \
	fi

example-agent-up: example-agent-check-ports ## Start Multi-Agent example
	@echo "$(BLUE)🚀 Starting Multi-Agent example...$(NC)"
	cd examples/multi-agent && docker compose up -d
	@echo "$(GREEN)✓ Multi-Agent example started$(NC)"
	@echo "  Orchestrator: http://localhost:$(AGENT_ORCHESTRATOR_PORT)"
	@$(MAKE) example-agent-health

example-agent-health: ## Check Multi-Agent example health
	@echo "$(BLUE)🏥 Checking Multi-Agent health...$(NC)"
	@for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do \
		ORCH_OK=$$(curl -sf "http://localhost:$(AGENT_ORCHESTRATOR_PORT)/health" >/dev/null 2>&1 && echo "1" || echo "0"); \
		if [ "$$ORCH_OK" = "1" ]; then \
			echo "$(GREEN)✓ Orchestrator: healthy$(NC)"; \
			exit 0; \
		fi; \
		if [ $$i -eq 15 ]; then \
			echo "$(YELLOW)⚠ Orchestrator: not ready after 30s$(NC)"; \
		else \
			sleep 2; \
		fi; \
	done

example-agent-down: ## Stop Multi-Agent example
	@cd examples/multi-agent && docker compose down --remove-orphans
	@$(MAKE) example-agent-check-ports

example-agent-logs: ## Show Multi-Agent example logs
	cd examples/multi-agent && docker compose logs -f

examples-build-all: example-b2b-build example-iot-build example-agent-build ## Build all examples
	@echo "$(GREEN)✓ All examples built$(NC)"

examples-down-all: example-b2b-down example-iot-down example-agent-down ## Stop all examples
	@echo "$(GREEN)✓ All examples stopped$(NC)"

# ============================================================================
# PUBLISHING
# ============================================================================

publish-check: ## Check if ready to publish
	@echo "$(BLUE)🔍 Checking publish readiness...$(NC)"
	@npm pack --dry-run
	@echo "$(GREEN)✓ Package is ready to publish$(NC)"

publish-npm: ## Publish to npm registry
	@echo "$(BLUE)📤 Publishing to npm...$(NC)"
	npm publish --access public
	@echo "$(GREEN)✓ Published to npm$(NC)"

publish-github: ## Publish to GitHub Packages
	@echo "$(BLUE)📤 Publishing to GitHub Packages...$(NC)"
	npm publish --registry=https://npm.pkg.github.com
	@echo "$(GREEN)✓ Published to GitHub Packages$(NC)"

# ============================================================================
# RELEASE
# ============================================================================

version-patch: ## Bump patch version (x.x.X)
	npm version patch

version-minor: ## Bump minor version (x.X.x)
	npm version minor

version-major: ## Bump major version (X.x.x)
	npm version major

release: check-all build ## Create a release (run checks, build, tag)
	@echo "$(BLUE)🏷️ Creating release...$(NC)"
	@VERSION=$$(node -p "require('./package.json').version"); \
	git tag -a "v$$VERSION" -m "Release v$$VERSION"; \
	echo "$(GREEN)✓ Tagged v$$VERSION$(NC)"
	@echo "$(YELLOW)Run 'git push --tags' to push the release$(NC)"

changelog: ## Generate changelog
	@echo "$(BLUE)📝 Generating changelog...$(NC)"
	@git log --pretty=format:"- %s (%h)" --no-merges $$(git describe --tags --abbrev=0 2>/dev/null || echo "")..HEAD
	@echo ""

# ============================================================================
# DOCUMENTATION
# ============================================================================

docs: ## Generate documentation
	@echo "$(BLUE)📚 Generating documentation...$(NC)"
	@mkdir -p docs/api
	npx typedoc --out docs/api ./contracts ./core ./dsl
	@echo "$(GREEN)✓ Documentation generated in docs/$(NC)"

docs-serve: ## Serve documentation locally
	@echo "$(BLUE)📚 Serving documentation...$(NC)"
	npx serve docs

articles-list: ## List all articles
	@echo "$(BLUE)📰 Available articles:$(NC)"
	@ls -1 articles/*.md | while read f; do echo "  - $$f"; done

articles-wordcount: ## Count words in articles
	@echo "$(BLUE)📊 Article word counts:$(NC)"
	@wc -w articles/*.md | sort -n

# ============================================================================
# MCP SERVER
# ============================================================================

mcp-start: ## Start MCP server
	@echo "$(BLUE)🔌 Starting MCP server...$(NC)"
	npm run mcp:server

mcp-test: ## Test MCP server connection
	@echo "$(BLUE)🔌 Testing MCP server...$(NC)"
	curl -X POST http://localhost:8080/mcp \
		-H "Content-Type: application/json" \
		-d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}'

# ============================================================================
# DATABASE / EVENT STORE
# ============================================================================

db-migrate: ## Run database migrations
	@echo "$(BLUE)🗄️ Running migrations...$(NC)"
	npm run db:migrate

db-seed: ## Seed database with test data
	@echo "$(BLUE)🌱 Seeding database...$(NC)"
	npm run db:seed

db-reset: ## Reset database
	@echo "$(RED)🗑️ Resetting database...$(NC)"
	npm run db:reset

# ============================================================================
# UTILITIES
# ============================================================================

clean: ## Clean build artifacts
	@echo "$(RED)🗑️ Cleaning build artifacts...$(NC)"
	rm -rf dist/
	rm -rf coverage/
	rm -rf node_modules/.cache/
	rm -rf frontend/dist/
	@echo "$(GREEN)✓ Cleaned$(NC)"

clean-all: clean ## Clean everything including node_modules
	@echo "$(RED)🗑️ Cleaning all...$(NC)"
	rm -rf node_modules/
	rm -rf frontend/node_modules/
	@echo "$(GREEN)✓ All cleaned$(NC)"

tree: ## Show project structure
	@echo "$(BLUE)📂 Project structure:$(NC)"
	@tree -I 'node_modules|dist|coverage|.git' -L 3 --dirsfirst

loc: ## Count lines of code
	@echo "$(BLUE)📊 Lines of code:$(NC)"
	@find . -name "*.ts" -not -path "./node_modules/*" | xargs wc -l | tail -1

stats: ## Show project statistics
	@echo "$(BLUE)📊 Project Statistics$(NC)"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "TypeScript files: $$(find . -name '*.ts' -not -path './node_modules/*' | wc -l)"
	@echo "Test files:       $$(find . -name '*.test.ts' -not -path './node_modules/*' | wc -l)"
	@echo "Markdown files:   $$(find . -name '*.md' -not -path './node_modules/*' | wc -l)"
	@echo "Total LOC:        $$(find . -name '*.ts' -not -path './node_modules/*' | xargs cat | wc -l)"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

env-check: ## Check environment setup
	@echo "$(BLUE)🔍 Checking environment...$(NC)"
	@echo "Node:    $$(node --version)"
	@echo "npm:     $$(npm --version)"
	@echo "Docker:  $$(docker --version 2>/dev/null || echo 'Not installed')"
	@echo "Git:     $$(git --version)"

env-show: ## Show current environment variables
	@echo "$(BLUE)🔧 Current Environment Configuration$(NC)"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "$(YELLOW)General:$(NC)"
	@echo "  NODE_ENV:              $(NODE_ENV)"
	@echo "  PORT:                  $(PORT)"
	@echo "  HOST:                  $(HOST)"
	@echo ""
	@echo "$(YELLOW)Docker Ports (main stack):$(NC)"
	@echo "  API:                   $(DOCKER_API_PORT)"
	@echo "  Frontend:              $(DOCKER_FRONTEND_PORT)"
	@echo "  EventStore:            $(DOCKER_EVENTSTORE_HTTP_PORT)"
	@echo "  Redis:                 $(DOCKER_REDIS_PORT)"
	@echo "  Grafana:               $(DOCKER_GRAFANA_PORT)"
	@echo "  Prometheus:            $(DOCKER_PROMETHEUS_PORT)"
	@echo ""
	@echo "$(YELLOW)Example Ports:$(NC)"
	@echo "  B2B API:               $(B2B_API_PORT)"
	@echo "  IoT API:               $(IOT_API_PORT)"
	@echo "  Multi-Agent:           $(AGENT_ORCHESTRATOR_PORT)"
	@echo ""
	@echo "$(YELLOW)URLs:$(NC)"
	@echo "  API_URL:               $(API_URL)"
	@echo "  FRONTEND_URL:          $(FRONTEND_URL)"
	@echo "  EVENTSTORE_HTTP_URL:   $(EVENTSTORE_HTTP_URL)"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

env-init: ## Initialize .env from .env.example
	@if [ -f .env ]; then \
		echo "$(YELLOW)⚠️  .env already exists. Backup created as .env.backup$(NC)"; \
		cp .env .env.backup; \
	fi
	cp .env.example .env
	@echo "$(GREEN)✓ .env initialized from .env.example$(NC)"
	@echo "$(YELLOW)Edit .env to customize your configuration$(NC)"

# ============================================================================
# PACKAGE CREATION
# ============================================================================

pack: ## Create distributable package
	@echo "$(BLUE)📦 Creating package...$(NC)"
	@mkdir -p dist
	tar -czvf dist/$(PROJECT_NAME)-$(VERSION).tar.gz \
		--exclude='node_modules' \
		--exclude='dist' \
		--exclude='.git' \
		--exclude='coverage' \
		.
	@echo "$(GREEN)✓ Package created: dist/$(PROJECT_NAME)-$(VERSION).tar.gz$(NC)"

pack-zip: ## Create ZIP package
	@echo "$(BLUE)📦 Creating ZIP package...$(NC)"
	@mkdir -p dist
	zip -r dist/$(PROJECT_NAME)-$(VERSION).zip . \
		-x "node_modules/*" \
		-x "dist/*" \
		-x ".git/*" \
		-x "coverage/*"
	@echo "$(GREEN)✓ Package created: dist/$(PROJECT_NAME)-$(VERSION).zip$(NC)"

# ============================================================================
# CI/CD
# ============================================================================

ci: install-ci lint typecheck test-ci build ## Full CI pipeline
	@echo "$(GREEN)✓ CI pipeline complete$(NC)"

cd-prepare: ## Prepare for deployment
	@echo "$(BLUE)🚀 Preparing deployment...$(NC)"
	@make build-all
	@make docker-build
	@echo "$(GREEN)✓ Deployment prepared$(NC)"

# ============================================================================
# DEFAULT
# ============================================================================

.DEFAULT_GOAL := help
