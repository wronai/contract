## [2.4.1] - 2026-02-01

### Summary

refactor(examples): CLI interface improvements

### Core

- update src/python/reclapp/__init__.py
- update src/python/reclapp/parser/markdown_parser.py

### Docs

- docs: update AGENTS.md
- docs: update README
- docs: update 00-architecture-overview.md
- docs: update 21-testing-guide.md
- docs: update 22-project-status.md
- docs: update 30-evolution-system.md
- docs: update cli-reference.md
- docs: update contract-lifecycle-workflow.md
- docs: update studio-guide.md
- docs: update crm-human-readable.rcl.md
- ... and 1 more

### Test

- update tests/python/test_evolve_free_model.py
- update tests/python/test_openrouter_models.py

### Build

- deps: update package.json

### Other

- build: update Makefile
- update examples/b2b-onboarding/contracts/onboarding.reclapp.ts
- update examples/contract-ai/blog-contract.ts
- update examples/contract-ai/ecommerce-contract.ts
- update examples/contract-ai/task-manager-contract.ts
- update examples/crm/contracts/crm-compact-dsl.reclapp.rcl
- update examples/crm/contracts/crm-full-deployment.reclapp
- update examples/crm/contracts/crm-typescript-validation.reclapp.ts
- update examples/desktop-electron/contracts/investment.reclapp
- update examples/e-commerce/contracts/main.reclapp
- ... and 13 more


## [2.4.1] - 2026-02-01

### Summary

feat(docs): CLI interface with 3 supporting modules

### Core

- update src/python/reclapp/__init__.py
- update src/python/reclapp/evolution/evolution_manager.py

### Docs

- docs: update 22-project-status.md

### Test

- update tests/python/test_evolve_free_model.py

### Other

- update .gitignore


## [2.2.3] - 2026-02-01

### Summary

feat(goal): multi-language support with 3 supporting modules

### Core

- update src/python/reclapp/cli/main.py

### Test

- update tests/python/test_reverse_integrity.py


## [2.2.2] - 2026-02-01

### Summary

refactor(goal): code analysis engine

### Core

- update src/python/reclapp/cli/executor.py
- update src/python/reclapp/cli/main.py
- update src/python/reclapp/cli/runner.py
- update src/python/reclapp/evolution/evolution_manager.py
- update src/python/reclapp/evolution/shell_renderer.py
- update src/python/reclapp/evolution/task_queue.py
- update src/python/reclapp/llm/manager.py
- update src/python/reclapp/llm/openrouter.py

### Docs

- docs: update onboarding-reverse.rcl.md
- docs: update README
- docs: update README
- docs: update reverse-engineered.rcl.md
- docs: update todo.md

### Test

- update test.tasks
- update tests/python/test_cli.py
- update tests/python/test_openrouter_models.py
- update tests/python/test_windsurf_client.py

### Build

- update pyproject.toml

### Config

- config: update goal.yaml

### Other

- update bin/reclapp
- update dsl/writer/markdown.ts
- update reclapp-contracts/pyproject.toml
- update reclapp-contracts/reclapp_contracts/__init__.py
- update reclapp-contracts/reclapp_contracts/models/__init__.py
- update reclapp-contracts/reclapp_contracts/models/contract.py
- update reclapp-contracts/reclapp_contracts/models/definition.py
- update reclapp-contracts/reclapp_contracts/models/generation.py
- update reclapp-contracts/reclapp_contracts/models/validation.py
- update reclapp-contracts/reclapp_contracts/parser/__init__.py
- ... and 16 more


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
