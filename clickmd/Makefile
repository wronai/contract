.PHONY: help install dev test lint format type-check clean build publish publish-test docs

PYTHON := python3
PIP := pip
PYTEST := pytest
RUFF := ruff
BLACK := black
MYPY := mypy

help:
	@echo "clickmd - Markdown rendering for CLI applications"
	@echo ""
	@echo "Usage: make <target>"
	@echo ""
	@echo "Development:"
	@echo "  install      Install package in development mode"
	@echo "  dev          Install with all development dependencies"
	@echo "  test         Run tests with pytest"
	@echo "  test-cov     Run tests with coverage report"
	@echo "  lint         Run ruff linter"
	@echo "  format       Format code with black and ruff"
	@echo "  type-check   Run mypy type checker"
	@echo "  check        Run all checks (lint, type-check, test)"
	@echo ""
	@echo "Build & Publish:"
	@echo "  clean        Remove build artifacts"
	@echo "  build        Build package (sdist and wheel)"
	@echo "  publish-test Publish to TestPyPI"
	@echo "  publish      Publish to PyPI"
	@echo ""
	@echo "Documentation:"
	@echo "  docs         Generate documentation"

install:
	$(PIP) install -e .

dev:
	$(PIP) install -e ".[dev,click]"

test:
	$(PYTEST) tests/ -v

test-cov:
	$(PYTEST) tests/ -v --cov=. --cov-report=term-missing --cov-report=html

lint:
	$(RUFF) check .
	$(RUFF) format --check .

format:
	$(RUFF) format .
	$(RUFF) check --fix .

type-check:
	$(MYPY) --ignore-missing-imports .

check: lint type-check test

clean:
	rm -rf build/
	rm -rf dist/
	rm -rf *.egg-info/
	rm -rf .pytest_cache/
	rm -rf .mypy_cache/
	rm -rf .ruff_cache/
	rm -rf htmlcov/
	rm -rf .coverage
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete

build: clean
	$(PYTHON) -m build

publish-test: build
	$(PYTHON) -m twine upload --repository testpypi dist/*

publish: build
	$(PYTHON) -m twine upload dist/*

docs:
	@echo "Documentation is in README.md and docs/"
	@echo "For API docs, consider using pdoc or sphinx"

# Development shortcuts
.PHONY: t l f c
t: test
l: lint
f: format
c: check
