# Plan: Interchangeable Workflows (RCL.md ↔ JSON)

This document outlines the tasks required to make Manual (RCL.md) and AI-First (contract.ai.json) workflows interchangeable and integrated.

## 📋 TODO List

### 1. Integration of JSON into RCL.md
- [ ] **Define JSON Block Format**: Establish a standard code block identifier in Markdown (e.g., ` ```json:contract.ai.json `) to store the evolution plan.
- [ ] **CLI Update**: Modify `reclapp evolve` to accept an `.rcl.md` file as input, extract the prompt or the embedded JSON, and use it for the evolution process.
- [ ] **Extraction Tool**: Create a utility (or update `dsl-loader.ts`) to extract `contract.ai.json` from an `.rcl.md` file.

### 2. Bidirectional Conversion
- [ ] **JSON to Markdown Generator**: Implement a template-based generator that takes `contract.ai.json` and produces a formatted `.rcl.md`.
- [ ] **Sync Mechanism**: Allow `reclapp evolve` to update the `.rcl.md` file with the latest execution results and state.

### 3. Unified Validation
- [ ] **Cross-Validation**: Ensure that the entities defined in the Markdown match the entities in the embedded JSON plan.
- [ ] **Schema Enforcement**: Apply the same 8-stage validation to the JSON plan whether it's standalone or embedded.

### 4. Testing & Verification
- [ ] **Manual → JSON Test**: Test extracting a valid JSON plan from a manually written Markdown file.
- [ ] **Evolve → Contract Test**: Test that `reclapp evolve` correctly generates or updates a contract file.
- [ ] **Full Loop Test**: Markdown → Evolve → Code → Test → Updated Markdown.

## 🛠️ Implementation Steps (Current Sprint)

1. **Step 1**: Create a test case in `tests/e2e/workflow-interchange.test.ts`.
2. **Step 2**: Update `src/core/contract-ai/evolution/evolution-manager.ts` to support Markdown inputs.
3. **Step 3**: Implement the `extractJsonFromMarkdown` utility.
