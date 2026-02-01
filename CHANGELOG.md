## [2.2.1] - 2026-02-01

### Summary

refactor(docs): deep code analysis engine with 6 supporting modules

### Core

- update src/python/reclapp/cli/main.py

### Docs

- docs: update 22-project-status.md
- docs: update todo.md
- docs: update todo2.md

### Test

- update tests/python/test_llm.py

### Other

- update generator/templates/api.ts


# Changelog

All notable changes to this project will be documented in this file.

## Unreleased

### Changed

- Reclapp Studio renamed/standardized to use `studio/` (Express + vanilla JS) and port `7861`.
- `make studio-up` now passes `STUDIO_PORT` to the Studio process.
- Shell chat and Studio shell chat now share a single core implementation (`lib/chat-core.js`).
- Contract generation pipeline now prefers Mini-DSL code blocks and normalizes common LLM mistakes.

### Fixed

- Studio Web UI **Run** button now sends the current contract to `/api/run` and can auto-generate missing targets.
- `.rcl.md` generation now includes full conversation history for both Web Studio and Shell chat.
- `./bin/reclapp generate` can recover from common LLM syntax errors in `.reclapp.rcl` via normalization fallback.

### Added

- E2E tests for Reclapp Studio (`tests/e2e/studio.test.ts`).
- Shell chat smoke tests (`tests/e2e/chat-shell.test.sh`).
- Documentation index: `docs/README.md`.
