# Reverse Engineering

Reclapp allows you to reverse-engineer a `.rcl.md` contract from an existing application. This is useful for:
- Migrating existing projects to the Reclapp platform.
- Synchronizing a manually updated codebase back to a declarative contract.
- Bootstrapping a new contract from a prototype.

## How it works

The `reverse` command analyzes the source code of an application to:
1.  **Detect Entities**: Identifies data structures, interfaces, and classes.
2.  **Detect Endpoints**: Finds API routes and handlers.
3.  **Detect AI Plans**: Searches for existing `contract.ai.json` files to preserve the AI-native context.
4.  **Generate Markdown**: Produces a human-readable `.rcl.md` file that represents the system.

## Usage

```bash
# Reverse engineer the current directory
reclapp reverse .

# Reverse engineer a specific directory and save to a custom path
reclapp reverse ./my-app --output ./docs/contracts/my-app.rcl.md
```

## Integrating with AI Plan

If your project was generated using `reclapp evolve` or contains a `contract.ai.json`, the `reverse` command will automatically find it and embed it into the Markdown file under the `## 🤖 Plan AI` section.

This allows you to move from an AI-managed state back to a human-editable Markdown document without losing the underlying AI instructions and tech stack configuration.

## Workflow: Syncing Code back to Contract

1.  You make manual changes to the generated code (e.g., adding a field to a TypeScript interface).
2.  Run `reclapp reverse .`.
3.  The `.rcl.md` is updated to reflect your manual changes.
4.  You can now continue using `reclapp evolve` or other tools with the updated contract.
