.PHONY: help install dev test lint format type-check clean build publish publish-test docs examples examples-md examples-html

PYTHON := python3
PIP := pip
PYTEST := pytest
RUFF := ruff
BLACK := black
MYPY := mypy
EXAMPLES_DIR := examples
EXAMPLES_OUT := examples_output

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
	@echo ""
	@echo "Examples:"
	@echo "  examples     Run all examples sequentially"
	@echo "  examples-md  Generate examples_output/*.md (no ANSI)"
	@echo "  examples-html Generate examples_output/*.html and open in browser"

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

examples:
	@echo "Running all clickmd examples..."
	PYTHONPATH=.. $(PYTHON) $(EXAMPLES_DIR)/basic.py
	PYTHONPATH=.. $(PYTHON) $(EXAMPLES_DIR)/custom_renderer.py
	PYTHONPATH=.. $(PYTHON) $(EXAMPLES_DIR)/logging.py
	PYTHONPATH=.. $(PYTHON) $(EXAMPLES_DIR)/logger_usage.py
	@if PYTHONPATH=.. $(PYTHON) -c "import clickmd as c, sys; sys.exit(0 if getattr(c, 'CLICK_AVAILABLE', False) else 1)"; then \
		PYTHONPATH=.. $(PYTHON) $(EXAMPLES_DIR)/cli_app.py hello --name Alice; \
		PYTHONPATH=.. $(PYTHON) $(EXAMPLES_DIR)/cli_app.py status; \
		PYTHONPATH=.. $(PYTHON) $(EXAMPLES_DIR)/markdown_help.py --help; \
		PYTHONPATH=.. $(PYTHON) $(EXAMPLES_DIR)/markdown_help.py process --help; \
	else \
		echo "Skipping cli_app.py and markdown_help.py (click not installed). Install with: pip install clickmd[click]"; \
	fi

examples-md:
	@echo "Generating markdown outputs for examples..."
	rm -rf $(EXAMPLES_OUT)
	mkdir -p $(EXAMPLES_OUT)
	PYTHONPATH=.. $(PYTHON) $(EXAMPLES_DIR)/basic.py > $(EXAMPLES_OUT)/basic.md
	PYTHONPATH=.. $(PYTHON) $(EXAMPLES_DIR)/custom_renderer.py > $(EXAMPLES_OUT)/custom_renderer.md
	PYTHONPATH=.. $(PYTHON) $(EXAMPLES_DIR)/logging.py > $(EXAMPLES_OUT)/logging.md
	PYTHONPATH=.. $(PYTHON) $(EXAMPLES_DIR)/logger_usage.py > $(EXAMPLES_OUT)/logger_usage.md
	@if PYTHONPATH=.. $(PYTHON) -c "import clickmd as c, sys; sys.exit(0 if getattr(c, 'CLICK_AVAILABLE', False) else 1)"; then \
		PYTHONPATH=.. $(PYTHON) $(EXAMPLES_DIR)/cli_app.py hello --name Alice > $(EXAMPLES_OUT)/cli_app.md; \
		PYTHONPATH=.. $(PYTHON) $(EXAMPLES_DIR)/cli_app.py status >> $(EXAMPLES_OUT)/cli_app.md; \
		PYTHONPATH=.. $(PYTHON) $(EXAMPLES_DIR)/cli_app.py example python >> $(EXAMPLES_OUT)/cli_app.md; \
		PYTHONPATH=.. $(PYTHON) $(EXAMPLES_DIR)/markdown_help.py --help > $(EXAMPLES_OUT)/markdown_help.md; \
		PYTHONPATH=.. $(PYTHON) $(EXAMPLES_DIR)/markdown_help.py process --help >> $(EXAMPLES_OUT)/markdown_help.md; \
		PYTHONPATH=.. $(PYTHON) $(EXAMPLES_DIR)/markdown_help.py config list >> $(EXAMPLES_OUT)/markdown_help.md; \
	else \
		echo "# cli_app.py" > $(EXAMPLES_OUT)/cli_app.md; \
		echo "" >> $(EXAMPLES_OUT)/cli_app.md; \
		echo "Click is not installed. Install with: pip install clickmd[click]" >> $(EXAMPLES_OUT)/cli_app.md; \
		echo "# markdown_help.py" > $(EXAMPLES_OUT)/markdown_help.md; \
		echo "" >> $(EXAMPLES_OUT)/markdown_help.md; \
		echo "Click is not installed. Install with: pip install clickmd[click]" >> $(EXAMPLES_OUT)/markdown_help.md; \
	fi
	@echo "Wrote markdown files to $(EXAMPLES_OUT)/"

examples-html: examples-md
	@echo "Converting markdown to HTML..."
	$(PYTHON) tools/md_to_html.py $(EXAMPLES_OUT)
	@echo "Opening HTML files in browser..."
	@for html in $(EXAMPLES_OUT)/*.html; do xdg-open "$$html" >/dev/null 2>&1 || true; done

# Development shortcuts
.PHONY: t l f c
t: test
l: lint
f: format
c: check
