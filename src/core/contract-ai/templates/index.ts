/**
 * Template RAG Library
 * 
 * Modular templates for LLM code generation.
 * Technology-agnostic - LLM decides based on contract.ai.json
 * 
 * @version 1.0.0
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// TYPES
// ============================================================================

export interface Template {
  id: string;
  name: string;
  description: string;
  category: 'api' | 'tests' | 'config' | 'frontend' | 'docs' | 'util';
  tags: string[];
  language?: string;
  framework?: string;
  content: string;
  variables: TemplateVariable[];
  dependencies?: string[];
  examples?: string[];
}

export interface TemplateVariable {
  name: string;
  description: string;
  required: boolean;
  default?: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
}

export interface TemplateQuery {
  category?: string;
  tags?: string[];
  language?: string;
  framework?: string;
  keywords?: string[];
}

export interface TemplateMatch {
  template: Template;
  score: number;
  matchedTags: string[];
}

// ============================================================================
// TEMPLATE RAG CLASS
// ============================================================================

export class TemplateRAG {
  private templates: Map<string, Template> = new Map();
  private templateDir: string;

  constructor(templateDir?: string) {
    this.templateDir = templateDir || path.join(__dirname);
    this.loadTemplates();
  }

  /**
   * Load all templates from the template directory
   */
  private loadTemplates(): void {
    const categories = ['api', 'tests', 'config', 'frontend', 'docs', 'util'];
    
    for (const category of categories) {
      const categoryDir = path.join(this.templateDir, category);
      if (!fs.existsSync(categoryDir)) continue;

      for (const file of fs.readdirSync(categoryDir)) {
        if (!file.endsWith('.json')) continue;
        
        try {
          const content = fs.readFileSync(path.join(categoryDir, file), 'utf-8');
          const template = JSON.parse(content) as Template;
          template.category = category as Template['category'];
          this.templates.set(template.id, template);
        } catch {
          // Skip invalid templates
        }
      }
    }
  }

  /**
   * Search templates by query
   */
  search(query: TemplateQuery): TemplateMatch[] {
    const results: TemplateMatch[] = [];

    for (const template of this.templates.values()) {
      let score = 0;
      const matchedTags: string[] = [];

      // Category match
      if (query.category && template.category === query.category) {
        score += 10;
      }

      // Language match
      if (query.language && template.language === query.language) {
        score += 5;
      }

      // Framework match
      if (query.framework && template.framework === query.framework) {
        score += 5;
      }

      // Tag matches
      if (query.tags) {
        for (const tag of query.tags) {
          if (template.tags.includes(tag)) {
            score += 3;
            matchedTags.push(tag);
          }
        }
      }

      // Keyword matches in name/description
      if (query.keywords) {
        const searchText = `${template.name} ${template.description}`.toLowerCase();
        for (const keyword of query.keywords) {
          if (searchText.includes(keyword.toLowerCase())) {
            score += 2;
          }
        }
      }

      if (score > 0) {
        results.push({ template, score, matchedTags });
      }
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);
    return results;
  }

  /**
   * Get template by ID
   */
  get(id: string): Template | undefined {
    return this.templates.get(id);
  }

  /**
   * Get all templates in a category
   */
  getByCategory(category: string): Template[] {
    return Array.from(this.templates.values())
      .filter(t => t.category === category);
  }

  /**
   * Render template with variables
   */
  render(templateId: string, variables: Record<string, any>): string {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    let content = template.content;

    // Replace variables
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      content = content.replace(regex, String(value));
    }

    // Apply defaults for missing required variables
    for (const variable of template.variables) {
      if (variable.default && !variables[variable.name]) {
        const regex = new RegExp(`\\{\\{\\s*${variable.name}\\s*\\}\\}`, 'g');
        content = content.replace(regex, variable.default);
      }
    }

    return content;
  }

  /**
   * Build context for LLM from contract
   */
  buildContextFromContract(contract: any): string {
    const techStack = contract.generation?.techStack || {};
    const entities = contract.definition?.entities || [];
    const targets = contract.generation?.targets || ['api'];

    const sections: string[] = [];

    // Tech stack hints (not requirements)
    sections.push('## Technology Hints (from contract)');
    if (techStack.backend) {
      sections.push(`Backend preference: ${techStack.backend.framework || 'any'} (${techStack.backend.language || 'any'})`);
    }
    if (techStack.frontend) {
      sections.push(`Frontend preference: ${techStack.frontend.framework || 'any'}`);
    }
    if (techStack.database) {
      sections.push(`Database preference: ${techStack.database.type || 'any'}`);
    }

    // Entities
    sections.push('\n## Entities');
    for (const entity of entities) {
      const fields = entity.fields?.map((f: any) => `${f.name}: ${f.type}`).join(', ') || 'id, name';
      sections.push(`- ${entity.name}: { ${fields} }`);
    }

    // Required targets
    sections.push('\n## Required Outputs');
    sections.push(targets.join(', '));

    return sections.join('\n');
  }

  /**
   * Get relevant templates for a task based on contract
   */
  getRelevantTemplates(contract: any, task: string): Template[] {
    const techStack = contract.generation?.techStack || {};
    const language = techStack.backend?.language;
    const framework = techStack.backend?.framework;

    // Determine category from task
    let category: string | undefined;
    if (task.includes('api') || task.includes('server')) category = 'api';
    else if (task.includes('test')) category = 'tests';
    else if (task.includes('config')) category = 'config';
    else if (task.includes('frontend') || task.includes('ui')) category = 'frontend';
    else if (task.includes('readme') || task.includes('doc')) category = 'docs';

    const results = this.search({
      category,
      language,
      framework,
      keywords: task.split(' ')
    });

    return results.slice(0, 5).map(r => r.template);
  }

  /**
   * Export templates as RAG context for LLM
   */
  exportAsContext(templates: Template[]): string {
    if (templates.length === 0) return '';

    const sections: string[] = ['## Available Templates\n'];

    for (const template of templates) {
      sections.push(`### ${template.name}`);
      sections.push(`ID: ${template.id}`);
      sections.push(`Description: ${template.description}`);
      sections.push(`Tags: ${template.tags.join(', ')}`);
      if (template.language) sections.push(`Language: ${template.language}`);
      if (template.framework) sections.push(`Framework: ${template.framework}`);
      sections.push('\nVariables:');
      for (const v of template.variables) {
        sections.push(`- ${v.name} (${v.type}${v.required ? ', required' : ''}): ${v.description}`);
      }
      sections.push('\n---\n');
    }

    return sections.join('\n');
  }

  /**
   * Get all template IDs
   */
  getAllIds(): string[] {
    return Array.from(this.templates.keys());
  }

  /**
   * Get template count
   */
  get count(): number {
    return this.templates.size;
  }
}

export default TemplateRAG;
