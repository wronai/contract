# Contributing to Reclapp

Thank you for your interest in contributing to Reclapp! This document provides guidelines and instructions for contributing.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)

## Code of Conduct

This project adheres to a Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior.

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Docker (optional, for full stack testing)
- Git

### Setup

1. **Fork the repository**
   ```bash
   # Click "Fork" on GitHub
   ```

2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/reclapp.git
   cd reclapp
   ```

3. **Add upstream remote**
   ```bash
   git remote add upstream https://github.com/softreck/reclapp.git
   ```

4. **Install dependencies**
   ```bash
   make install
   ```

5. **Run tests to verify setup**
   ```bash
   make test
   ```

## Development Workflow

### Branch Naming

Use descriptive branch names:
- `feature/add-causal-reasoning` - New features
- `fix/parser-null-check` - Bug fixes
- `docs/update-readme` - Documentation
- `refactor/simplify-executor` - Code refactoring
- `test/add-unit-tests` - Test additions

### Making Changes

1. **Create a branch**
   ```bash
   git checkout -b feature/your-feature
   ```

2. **Make changes and commit**
   ```bash
   git add .
   git commit -m "feat: add causal reasoning support"
   ```

3. **Keep your branch updated**
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `style` - Formatting (no code change)
- `refactor` - Code refactoring
- `test` - Adding tests
- `chore` - Maintenance

**Examples:**
```
feat(contracts): add TypeScript validation for AI contracts
fix(parser): handle null values in DSL expressions
docs(readme): update installation instructions
test(executor): add unit tests for rate limiting
```

## Pull Request Process

1. **Ensure all checks pass**
   ```bash
   make check-all
   ```

2. **Update documentation** if needed

3. **Create Pull Request** with:
   - Clear title following commit convention
   - Description of changes
   - Link to related issue (if any)
   - Screenshots (if UI changes)

4. **Wait for review** - maintainers will review your PR

5. **Address feedback** - make requested changes

6. **Merge** - once approved, your PR will be merged

### PR Checklist

- [ ] Code follows project style guidelines
- [ ] Tests added for new functionality
- [ ] All tests pass (`make test`)
- [ ] Linting passes (`make lint`)
- [ ] Type checking passes (`make typecheck`)
- [ ] Documentation updated if needed
- [ ] Commit messages follow convention

## Coding Standards

### TypeScript

- Use strict TypeScript (`strict: true`)
- Prefer interfaces over types for objects
- Use explicit return types for functions
- Avoid `any` - use `unknown` if type is truly unknown

```typescript
// Good
interface User {
  id: string;
  name: string;
}

function getUser(id: string): User | null {
  // ...
}

// Avoid
type User = {
  id: any;
  name: string;
}

function getUser(id) {
  // ...
}
```

### File Organization

```typescript
// 1. Imports (external first, then internal)
import { something } from 'external-package';
import { internal } from '../internal';

// 2. Types/Interfaces
interface MyInterface {
  // ...
}

// 3. Constants
const MY_CONSTANT = 'value';

// 4. Main code (classes, functions)
export class MyClass {
  // ...
}

// 5. Helper functions
function helper() {
  // ...
}

// 6. Exports (if not inline)
export { helper };
```

### Naming Conventions

- **Files**: `kebab-case.ts` (e.g., `causal-loop.ts`)
- **Classes**: `PascalCase` (e.g., `ContractExecutor`)
- **Interfaces**: `PascalCase` (e.g., `AgentContract`)
- **Functions**: `camelCase` (e.g., `executeWorkflow`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `DEFAULT_TIMEOUT`)
- **Variables**: `camelCase` (e.g., `currentUser`)

## Testing Guidelines

### Test Structure

```typescript
describe('ModuleName', () => {
  describe('functionName()', () => {
    it('should do something specific', () => {
      // Arrange
      const input = { ... };
      
      // Act
      const result = functionName(input);
      
      // Assert
      expect(result).toBe(expected);
    });
  });
});
```

### Test Coverage

- Aim for 80%+ coverage
- Focus on critical paths
- Test edge cases
- Test error handling

### Running Tests

```bash
# All tests
make test

# Specific suite
make test-unit
make test-e2e

# With coverage
make test-coverage

# Watch mode
make test-watch
```

## Documentation

### Code Documentation

Use JSDoc for public APIs:

```typescript
/**
 * Validates an AI contract against the schema.
 * 
 * @param contract - The contract to validate
 * @returns Validation result with errors and warnings
 * 
 * @example
 * ```typescript
 * const result = validateContract(myContract);
 * if (!result.valid) {
 *   console.error(result.errors);
 * }
 * ```
 */
export function validateContract(contract: AgentContract): ValidationResult {
  // ...
}
```

### Article Documentation

When adding features, consider adding/updating articles in `articles/`:

1. Use clear, descriptive titles
2. Include code examples
3. Explain concepts before implementation
4. Add diagrams where helpful

## Questions?

- Open an issue for bugs or feature requests
- Start a discussion for questions
- Check existing issues before creating new ones

---

Thank you for contributing to Reclapp! 🎉
