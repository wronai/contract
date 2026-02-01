import { MarkdownParser } from '../../dsl/parser/markdown';
import * as fs from 'fs';
import * as path from 'path';

describe('Markdown Parser - AI Plan Extraction', () => {
  const contentWithJson = `
# Test App
> Description

## 🤖 AI Plan
\`\`\`json:contract.ai.json
{
  "definition": {
    "app": { "name": "EmbeddedApp" }
  }
}
\`\`\`
  `;

  const contentWithYaml = `
# Test App
> Description

## 🤖 AI Plan
\`\`\`yaml
# ai-plan:
{
  "definition": {
    "app": { "name": "YamlApp" }
  }
}
\`\`\`
  `;

  it('should extract ai-plan from json block', () => {
    const parser = new MarkdownParser(contentWithJson);
    const result = parser.parse();
    expect(result.success).toBe(true);
    expect(result.ir?.aiPlan).toBeDefined();
    expect(result.ir?.aiPlan.definition.app.name).toBe('EmbeddedApp');
  });

  it('should extract ai-plan from yaml block', () => {
    const parser = new MarkdownParser(contentWithYaml);
    const result = parser.parse();
    expect(result.success).toBe(true);
    expect(result.ir?.aiPlan).toBeDefined();
    expect(result.ir?.aiPlan.definition.app.name).toBe('YamlApp');
  });
});
