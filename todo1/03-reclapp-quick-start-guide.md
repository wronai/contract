# Reclapp Contract Format - Quick Start Guide

**Project:** Reclapp  
**Status:** 🟢 Active  
**Date:** January 2, 2026  

---

## Overview

This guide explains how to test and deploy the new Contract Markdown format in your Reclapp project.

## Quick Start

### Step 1: Copy Implementation Files

```bash
cd ~/github/wronai/contract

# Create parser directory
mkdir -p src/core/contract-ai/parser

# Create types file
cat > src/core/contract-ai/types/contract-markdown.ts << 'EOF'
// Copy content from article 02 - Types section
EOF

# Create parser file
cat > src/core/contract-ai/parser/markdown-parser.ts << 'EOF'
// Copy content from article 02 - Parser section
EOF

# Create converter file
cat > src/core/contract-ai/converter/to-contract-ai.ts << 'EOF'
// Copy content from article 02 - Converter section
EOF
```

### Step 2: Install Dependencies

```bash
# Add YAML parser
npm install js-yaml
npm install -D @types/js-yaml
```

### Step 3: Create Example Contract

```bash
# Copy the example contract
mkdir -p examples/contracts
cp ~/articles/examples/todo.contract.md examples/contracts/
```

### Step 4: Update CLI

Add to `bin/reclapp` or `reclapp/cli.py`:

```python
# Python CLI addition
@click.command()
@click.argument('contract', type=click.Path(exists=True))
@click.option('--output', '-o', default='./generated', help='Output directory')
def contract(contract, output):
    """Generate from .contract.md file"""
    # Implementation
    pass
```

### Step 5: Test the Parser

```bash
# Run unit tests
npx jest tests/unit/markdown-parser.test.ts --verbose

# Or quick manual test
node -e "
const fs = require('fs');
const { parseContractMarkdown } = require('./src/core/contract-ai/parser/markdown-parser');
const content = fs.readFileSync('examples/contracts/todo.contract.md', 'utf-8');
const contract = parseContractMarkdown(content);
console.log(JSON.stringify(contract.frontmatter, null, 2));
console.log('Entities:', contract.entities.map(e => e.name));
"
```

---

## Verification Checklist

### Parser Tests

```bash
# 1. Test frontmatter parsing
node -e "
const { parseContractMarkdown } = require('./dist/core/contract-ai/parser/markdown-parser');
const content = \`---
contract:
  name: test
  version: 1.0.0
  description: Test
generation:
  mode: full-stack
  output: ./out
tech:
  backend: express-typescript
  frontend: react-vite
  database: json-file
  testing: jest
runtime:
  port: 3000
  healthCheck: /health
---
# Test
\`;
const result = parseContractMarkdown(content);
console.assert(result.frontmatter.contract.name === 'test', 'Name parsing failed');
console.log('✅ Frontmatter parsing works');
"

# 2. Test entity parsing
node -e "
const { parseContractMarkdown } = require('./dist/core/contract-ai/parser/markdown-parser');
const content = \`---
contract:
  name: test
  version: 1.0.0
  description: Test
generation:
  mode: full-stack
  output: ./out
tech:
  backend: express-typescript
  frontend: react-vite
  database: json-file
  testing: jest
runtime:
  port: 3000
  healthCheck: /health
---
# Test

## Entities

### Item

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | uuid | auto | ID |
| name | string | yes | Name |
\`;
const result = parseContractMarkdown(content);
console.assert(result.entities.length === 1, 'Entity count wrong');
console.assert(result.entities[0].name === 'Item', 'Entity name wrong');
console.assert(result.entities[0].fields.length === 2, 'Field count wrong');
console.log('✅ Entity parsing works');
"
```

### Integration Test

```bash
# Full flow test
reclapp --contract examples/contracts/todo.contract.md --keep-running

# Expected output:
# ╭─────── 🚀 Starting ───────╮
# │ RECLAPP FULL LIFECYCLE    │
# │ Contract: todo.contract.md│
# │ Output: ./generated       │
# │ Port: 3000                │
# ╰───────────────────────────╯
# ...
```

### Compare Outputs

```bash
# Generate from TypeScript contract
reclapp generate examples/contract-ai/crm-contract.ts -o ./test-ts

# Generate from Markdown contract (same content)
reclapp --contract examples/contracts/crm.contract.md -o ./test-md

# Compare generated files
diff -r ./test-ts/api ./test-md/api
```

---

## Deployment Steps

### 1. Create Feature Branch

```bash
git checkout -b feature/contract-markdown-format
```

### 2. Add New Files

```bash
git add src/core/contract-ai/types/contract-markdown.ts
git add src/core/contract-ai/parser/markdown-parser.ts
git add src/core/contract-ai/converter/to-contract-ai.ts
git add examples/contracts/todo.contract.md
git add tests/unit/markdown-parser.test.ts
```

### 3. Update Package Version

```bash
# Update version in pyproject.toml
sed -i 's/version = "2.3.2"/version = "2.4.0"/' pyproject.toml

# Update version in package.json
npm version minor
```

### 4. Run Full Test Suite

```bash
# All tests
npm test

# Python tests
pytest tests/contracts/ -v

# E2E tests
./tests/e2e/run-all.sh
```

### 5. Update Documentation

```bash
# Add to docs/contract-ai.md
echo "
## Contract Markdown Format (.contract.md)

See [Contract Format Proposal](../articles/01-reclapp-contract-format-proposal.md) for details.
" >> docs/contract-ai.md

# Update CHANGELOG
echo "
## [2.4.0] - 2026-01-03

### Added
- New Contract Markdown format (.contract.md)
- Markdown parser with YAML frontmatter support
- Entity table parsing
- API endpoint extraction
- Test definition parsing
- Backward-compatible converter to ContractAI format

### Changed
- CLI now supports both .reclapp.ts and .contract.md files
" >> CHANGELOG.md
```

### 6. Commit and Push

```bash
git add -A
git commit -m "feat: Add Contract Markdown format support

- New .contract.md format optimized for LLM and human editing
- Markdown parser with YAML frontmatter
- Entity extraction from tables
- API endpoint parsing
- Backward compatible with existing formats
- Includes todo.contract.md example

Closes #XXX"

git push origin feature/contract-markdown-format
```

### 7. Create Pull Request

```bash
gh pr create \
  --title "feat: Contract Markdown Format Support" \
  --body "## Summary
  
Adds new .contract.md format that is:
- Human-readable (familiar Markdown syntax)
- LLM-optimized (clear sections, examples)
- Machine-parseable (YAML frontmatter, structured tables)
- Backward compatible (converts to existing ContractAI format)

## Testing

- [x] Unit tests for parser
- [x] Integration tests for full flow
- [x] Example contract included
- [x] Documentation updated

## Files Changed

- src/core/contract-ai/types/contract-markdown.ts (new)
- src/core/contract-ai/parser/markdown-parser.ts (new)
- src/core/contract-ai/converter/to-contract-ai.ts (new)
- examples/contracts/todo.contract.md (new)
- tests/unit/markdown-parser.test.ts (new)
- docs/contract-ai.md (updated)
- CHANGELOG.md (updated)"
```

### 8. After Merge - Tag Release

```bash
git checkout main
git pull
git tag -a v2.4.0 -m "Release 2.4.0 - Contract Markdown Format"
git push --tags
```

### 9. Publish to PyPI (Optional)

```bash
make publish-pypi-test  # Test first
make publish            # Production release
```

---

## Troubleshooting

### Parser Errors

**Problem:** YAML frontmatter not detected
```bash
# Check file starts with ---
head -1 contract.md
# Should be: ---
```

**Problem:** Entity fields not parsed
```bash
# Verify table format (must have | separators)
grep -A5 "### Task" contract.md
```

**Problem:** TypeScript in code blocks not extracted
```bash
# Verify code block markers
grep '```typescript' contract.md
```

### Generation Issues

**Problem:** Generated code doesn't match contract
```bash
# Debug: print parsed contract
reclapp parse contract.md --debug

# Verify conversion
reclapp convert contract.md --format json
```

**Problem:** Tests fail after generation
```bash
# Check generated validators match entity fields
cat generated/api/src/validators/task.ts

# Compare with contract
grep -A20 "### Task" contract.md
```

---

## Next Steps After Deployment

1. **Create more example contracts** - CRM, E-commerce, Blog
2. **Add validation schema** - JSON Schema for contract structure
3. **Build VS Code extension** - Syntax highlighting, snippets
4. **Improve LLM prompts** - Use contract structure for better generation
5. **Add AI contract generator** - `reclapp init --ai "describe your app"`

---

## Resources

- [Contract Format Proposal](01-reclapp-contract-format-proposal.md)
- [Parser Implementation](02-reclapp-contract-parser-implementation.md)
- [Example Contract](examples/todo.contract.md)
- [Reclapp Documentation](https://github.com/wronai/reclapp/docs)
