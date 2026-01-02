#!/bin/bash
# Auto-generated duplicate cleanup script
# Generated: 2026-01-02T22:33:17.467670
# Review before running!

set -e
cd "$(dirname "$0")/.."

# === PIP Package Copies (safe to remove - will be re-copied) ===
# rm -f "reclapp/generator/code_generator.py"  # duplicate of src/python/reclapp/generator/code_generator.py
# rm -f "reclapp/generator/__init__.py"  # duplicate of src/python/reclapp/generator/__init__.py
# rm -f "reclapp/generator/contract_generator.py"  # duplicate of src/python/reclapp/generator/contract_generator.py
# rm -f "reclapp/generator/prompt_builder.py"  # duplicate of src/python/reclapp/generator/prompt_builder.py
# rm -f "reclapp/models/contract.py"  # duplicate of src/python/reclapp/models/contract.py
# rm -f "reclapp/models/__init__.py"  # duplicate of src/python/reclapp/models/__init__.py
# rm -f "reclapp/models/validation.py"  # duplicate of src/python/reclapp/models/validation.py
# rm -f "reclapp/models/generation.py"  # duplicate of src/python/reclapp/models/generation.py
# rm -f "reclapp/models/definition.py"  # duplicate of src/python/reclapp/models/definition.py
# rm -f "reclapp/llm/manager.py"  # duplicate of src/python/reclapp/llm/manager.py
# rm -f "reclapp/llm/ollama.py"  # duplicate of src/python/reclapp/llm/ollama.py
# rm -f "reclapp/llm/__init__.py"  # duplicate of src/python/reclapp/llm/__init__.py
# rm -f "reclapp/llm/provider.py"  # duplicate of src/python/reclapp/llm/provider.py
# rm -f "reclapp/parser/__init__.py"  # duplicate of src/python/reclapp/parser/__init__.py
# rm -f "reclapp/parser/markdown_parser.py"  # duplicate of src/python/reclapp/parser/markdown_parser.py
# rm -f "reclapp/evolution/shell_renderer.py"  # duplicate of src/python/reclapp/evolution/shell_renderer.py
# rm -f "reclapp/evolution/__init__.py"  # duplicate of src/python/reclapp/evolution/__init__.py
# rm -f "reclapp/evolution/task_queue.py"  # duplicate of src/python/reclapp/evolution/task_queue.py
# rm -f "reclapp/validation/stages.py"  # duplicate of src/python/reclapp/validation/stages.py
# rm -f "reclapp/validation/__init__.py"  # duplicate of src/python/reclapp/validation/__init__.py
# rm -f "reclapp/validation/pipeline.py"  # duplicate of src/python/reclapp/validation/pipeline.py

# === Example/Target Duplicates (review carefully) ===
# rm -f "examples/monitoring/target/frontend/tsconfig.json"  # duplicate of examples/e-commerce/target/frontend/tsconfig.json
# rm -f "examples/desktop-electron/target/frontend/tsconfig.json"  # duplicate of examples/e-commerce/target/frontend/tsconfig.json
# rm -f "examples/b2b-onboarding/target/frontend/tsconfig.json"  # duplicate of examples/e-commerce/target/frontend/tsconfig.json
# rm -f "examples/web-dashboard/target/frontend/tsconfig.json"  # duplicate of examples/e-commerce/target/frontend/tsconfig.json
# rm -f "examples/saas-starter/target/frontend/tsconfig.json"  # duplicate of examples/e-commerce/target/frontend/tsconfig.json
# rm -f "examples/reporting/target/frontend/tsconfig.json"  # duplicate of examples/e-commerce/target/frontend/tsconfig.json
# rm -f "apps/task-manager/target/frontend/tsconfig.json"  # duplicate of examples/e-commerce/target/frontend/tsconfig.json
# rm -f "studio/projects/booking-system/target/frontend/tsconfig.json"  # duplicate of examples/e-commerce/target/frontend/tsconfig.json
# rm -f "examples/target/frontend/tsconfig.json"  # duplicate of examples/e-commerce/target/frontend/tsconfig.json
# rm -f "examples/crm/target/frontend/tsconfig.json"  # duplicate of examples/e-commerce/target/frontend/tsconfig.json
# rm -f "examples/monitoring/target/frontend/vite.config.ts"  # duplicate of examples/e-commerce/target/frontend/vite.config.ts
# rm -f "examples/desktop-electron/target/frontend/vite.config.ts"  # duplicate of examples/e-commerce/target/frontend/vite.config.ts
# rm -f "examples/b2b-onboarding/target/frontend/vite.config.ts"  # duplicate of examples/e-commerce/target/frontend/vite.config.ts
# rm -f "examples/web-dashboard/target/frontend/vite.config.ts"  # duplicate of examples/e-commerce/target/frontend/vite.config.ts
# rm -f "examples/saas-starter/target/frontend/vite.config.ts"  # duplicate of examples/e-commerce/target/frontend/vite.config.ts
# rm -f "examples/reporting/target/frontend/vite.config.ts"  # duplicate of examples/e-commerce/target/frontend/vite.config.ts
# rm -f "apps/task-manager/target/frontend/vite.config.ts"  # duplicate of examples/e-commerce/target/frontend/vite.config.ts
# rm -f "studio/projects/booking-system/target/frontend/vite.config.ts"  # duplicate of examples/e-commerce/target/frontend/vite.config.ts
# rm -f "examples/target/frontend/vite.config.ts"  # duplicate of examples/e-commerce/target/frontend/vite.config.ts
# rm -f "examples/crm/target/frontend/vite.config.ts"  # duplicate of examples/e-commerce/target/frontend/vite.config.ts
# rm -f "examples/saas-starter/target/frontend/tailwind.config.js"  # duplicate of examples/web-dashboard/target/frontend/tailwind.config.js
# rm -f "examples/reporting/target/frontend/tailwind.config.js"  # duplicate of examples/web-dashboard/target/frontend/tailwind.config.js
# rm -f "apps/task-manager/target/frontend/tailwind.config.js"  # duplicate of examples/web-dashboard/target/frontend/tailwind.config.js
# rm -f "studio/projects/booking-system/target/frontend/tailwind.config.js"  # duplicate of examples/web-dashboard/target/frontend/tailwind.config.js
# rm -f "examples/target/frontend/tailwind.config.js"  # duplicate of examples/web-dashboard/target/frontend/tailwind.config.js
# rm -f "examples/crm/target/frontend/tailwind.config.js"  # duplicate of examples/web-dashboard/target/frontend/tailwind.config.js
# rm -f "examples/monitoring/target/api/tsconfig.json"  # duplicate of examples/e-commerce/target/api/tsconfig.json
# rm -f "examples/desktop-electron/target/api/tsconfig.json"  # duplicate of examples/e-commerce/target/api/tsconfig.json
# rm -f "examples/b2b-onboarding/target/api/tsconfig.json"  # duplicate of examples/e-commerce/target/api/tsconfig.json
# rm -f "examples/web-dashboard/target/api/tsconfig.json"  # duplicate of examples/e-commerce/target/api/tsconfig.json
# rm -f "examples/saas-starter/target/api/tsconfig.json"  # duplicate of examples/e-commerce/target/api/tsconfig.json
# rm -f "examples/reporting/target/api/tsconfig.json"  # duplicate of examples/e-commerce/target/api/tsconfig.json
# rm -f "apps/task-manager/target/api/tsconfig.json"  # duplicate of examples/e-commerce/target/api/tsconfig.json
# rm -f "studio/projects/booking-system/target/api/tsconfig.json"  # duplicate of examples/e-commerce/target/api/tsconfig.json
# rm -f "examples/target/api/tsconfig.json"  # duplicate of examples/e-commerce/target/api/tsconfig.json
# rm -f "examples/crm/target/api/tsconfig.json"  # duplicate of examples/e-commerce/target/api/tsconfig.json
# rm -f "examples/saas-starter/target/frontend/src/main.tsx"  # duplicate of examples/web-dashboard/target/frontend/src/main.tsx
# rm -f "examples/reporting/target/frontend/src/main.tsx"  # duplicate of examples/web-dashboard/target/frontend/src/main.tsx
# rm -f "apps/task-manager/target/frontend/src/main.tsx"  # duplicate of examples/web-dashboard/target/frontend/src/main.tsx
# rm -f "studio/projects/booking-system/target/frontend/src/main.tsx"  # duplicate of examples/web-dashboard/target/frontend/src/main.tsx
# rm -f "examples/target/frontend/src/main.tsx"  # duplicate of examples/web-dashboard/target/frontend/src/main.tsx
# rm -f "examples/crm/target/frontend/src/main.tsx"  # duplicate of examples/web-dashboard/target/frontend/src/main.tsx
# rm -f "examples/target/frontend/src/components/TaskList.tsx"  # duplicate of apps/task-manager/target/frontend/src/components/TaskList.tsx
# rm -f "examples/monitoring/target/frontend/tailwind.config.js"  # duplicate of examples/e-commerce/target/frontend/tailwind.config.js
# rm -f "examples/desktop-electron/target/frontend/tailwind.config.js"  # duplicate of examples/e-commerce/target/frontend/tailwind.config.js
# rm -f "examples/b2b-onboarding/target/frontend/tailwind.config.js"  # duplicate of examples/e-commerce/target/frontend/tailwind.config.js
# rm -f "examples/b2b-onboarding/target/api/src/routes/customer.ts"  # duplicate of examples/e-commerce/target/api/src/routes/customer.ts
# rm -f "examples/monitoring/target/frontend/src/main.tsx"  # duplicate of examples/e-commerce/target/frontend/src/main.tsx
# rm -f "examples/desktop-electron/target/frontend/src/main.tsx"  # duplicate of examples/e-commerce/target/frontend/src/main.tsx
# rm -f "examples/b2b-onboarding/target/frontend/src/main.tsx"  # duplicate of examples/e-commerce/target/frontend/src/main.tsx
# rm -f "examples/crm/target/api/src/middleware/auth.ts"  # duplicate of examples/saas-starter/target/api/src/middleware/auth.ts

echo 'Review and uncomment lines to execute cleanup'
