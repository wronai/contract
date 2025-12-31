# ============================================================================
# Reclapp 2.1.0 - AI-Native Declarative Platform
# ============================================================================
# 
# Usage:
#   make help          - Show all available commands
#   make install       - Install dependencies
#   make dev           - Start development server
#   make test          - Run all tests
#   make up     - Start Docker services
#   make publish       - Publish to npm
#
# ============================================================================

.PHONY: help install dev build test lint clean docker-build up down docker-logs logs docker-restart publish release stop stop-docker stop-dev

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

ifneq (,$(wildcard ../.env.examples))
include ../.env.examples
export $(shell sed -n 's/^\([A-Za-z_][A-Za-z0-9_]*\)=.*/\1/p' ../.env.examples)
endif

ifneq (,$(wildcard .env.examples))
include .env.examples
export $(shell sed -n 's/^\([A-Za-z_][A-Za-z0-9_]*\)=.*/\1/p' .env.examples)
endif

ifneq (,$(wildcard .env))
include .env
export $(shell sed -n 's/^\([A-Za-z_][A-Za-z0-9_]*\)=.*/\1/p' .env)
endif

# Defaults (can be overridden by .env or environment)
PORT ?= 8080
FRONTEND_PORT ?= 3000
EVENTSTORE_HTTP_PORT ?= 2113

API_URL ?= http://localhost:$(PORT)
FRONTEND_URL ?= $(if $(CORS_ORIGIN),$(CORS_ORIGIN),http://localhost:$(FRONTEND_PORT))
EVENTSTORE_HTTP_URL ?= http://localhost:$(EVENTSTORE_HTTP_PORT)

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
	npm run dev

stop: ## Stop all services (Docker + local dev)
	@echo "$(BLUE)🛑 Stopping all services...$(NC)"
	@$(MAKE) stop-docker
	@$(MAKE) stop-dev
	@echo "$(GREEN)✓ All services stopped$(NC)"

stop-docker: ## Stop Docker services
	@echo "$(BLUE)🐳 Stopping Docker services...$(NC)"
	@docker compose down --remove-orphans >/dev/null 2>&1 || true

stop-dev: ## Stop local dev processes (API + frontend)
	@echo "$(BLUE)🧹 Stopping local dev processes...$(NC)"
	@pkill -f "[a]pi/src/server.ts" >/dev/null 2>&1 || true; \
	pkill -f "[t]s-node-dev" >/dev/null 2>&1 || true; \
	pkill -f "[v]ite" >/dev/null 2>&1 || true

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

up: ## Start Docker services
	@echo "$(BLUE)🐳 Starting Docker services...$(NC)"
	docker compose up -d --build --remove-orphans
	@echo "$(GREEN)✓ Services started$(NC)"
	@echo ""
	@echo "$(YELLOW)Services available at:$(NC)"
	@echo "  API:        $(API_URL)"
	@echo "  Frontend:   $(FRONTEND_URL)"
	@echo "  EventStore: $(EVENTSTORE_HTTP_URL)"

down: ## Stop Docker services
	@echo "$(BLUE)🐳 Stopping Docker services...$(NC)"
	docker compose down --remove-orphans
	@echo "$(GREEN)✓ Services stopped$(NC)"

docker-logs: ## Show Docker logs
	docker compose logs -f

logs: docker-logs ## Alias for docker-logs

docker-restart: down up ## Restart Docker services

docker-full: ## Start all services including hardware and monitoring
	@echo "$(BLUE)🐳 Starting full stack...$(NC)"
	docker compose --profile hardware --profile monitoring up -d
	@echo "$(GREEN)✓ Full stack started$(NC)"

docker-clean: ## Remove Docker containers and volumes
	@echo "$(RED)🗑️ Cleaning Docker resources...$(NC)"
	docker compose down -v --remove-orphans
	@echo "$(GREEN)✓ Docker resources cleaned$(NC)"

docker-shell: ## Open shell in API container
	docker compose exec api sh

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
