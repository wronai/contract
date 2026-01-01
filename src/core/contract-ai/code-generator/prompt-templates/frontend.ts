/**
 * Frontend Prompt Template
 * 
 * Szablony promptów do generowania kodu Frontend przez LLM.
 * 
 * @version 2.2.0
 * @see todo/16-reclapp-implementation-todo-prompts.md
 */

import { ContractAI, EntityDefinition } from '../../types';
import { PromptTemplate } from './api';

// ============================================================================
// FRONTEND PROMPT TEMPLATE
// ============================================================================

/**
 * Szablon promptów dla generowania kodu Frontend
 */
export class FrontendPromptTemplate implements PromptTemplate {
  
  /**
   * Buduje kompletny prompt do generowania Frontend
   */
  buildPrompt(contract: ContractAI): string {
    const { definition, generation, validation } = contract;
    
    return `
# CODE GENERATION TASK: FRONTEND

## APPLICATION
Name: ${definition.app.name}
Version: ${definition.app.version}
Description: ${definition.app.description || 'N/A'}

## TECH STACK
${this.formatTechStack(generation.techStack)}

## API BASE URL
${definition.api?.prefix || '/api/v1'}

## ENTITIES & COMPONENTS

${this.formatEntitiesWithComponents(definition.entities)}

## INSTRUCTIONS (sorted by priority)

${this.formatInstructions(generation.instructions, 'frontend')}

## CODE PATTERNS TO FOLLOW

${this.formatPatterns(generation.patterns, 'frontend')}

## CONSTRAINTS

${this.formatConstraints(generation.constraints)}

## OUTPUT FORMAT

Generate complete, working TypeScript/React code files. Each file should be in format:
\`\`\`typescript:path/to/file.tsx
// code here
\`\`\`

## REQUIRED FILES

${this.getRequiredFiles(contract).map(f => `- ${f}`).join('\n')}

Generate ALL files listed above. Each component must be complete and styled with Tailwind CSS.
`.trim();
  }

  /**
   * Zwraca listę wymaganych plików do wygenerowania
   */
  getRequiredFiles(contract: ContractAI): string[] {
    const files: string[] = [
      'frontend/src/main.tsx',
      'frontend/src/App.tsx',
      'frontend/src/api/client.ts',
      'frontend/src/types/index.ts',
      'frontend/package.json',
      'frontend/tsconfig.json',
      'frontend/tailwind.config.js',
      'frontend/index.html'
    ];

    // Dodaj komponenty dla każdej encji
    for (const entity of contract.definition.entities) {
      const name = entity.name;
      files.push(`frontend/src/components/${name}List.tsx`);
      files.push(`frontend/src/components/${name}Form.tsx`);
      files.push(`frontend/src/hooks/use${name}.ts`);
    }

    return files;
  }

  /**
   * Zwraca system prompt dla generowania Frontend
   */
  getSystemPrompt(): string {
    return `
You are an expert React/TypeScript developer specializing in modern frontend development.
Your task is to generate production-ready React code based on the Contract AI specification.

## Key Requirements:

1. **React 18+**: Use functional components with hooks only. No class components.

2. **TypeScript**: All code must be properly typed. Define interfaces for all props and state.

3. **Tailwind CSS**: Use Tailwind for all styling. Create clean, modern UI.

4. **Component Structure**:
   - List components: Display data in a table or card grid
   - Form components: Handle create/edit with validation
   - Hooks: Custom hooks for data fetching and state

5. **State Management**: Use React hooks (useState, useEffect, useCallback).

6. **API Integration**: Use fetch or a simple API client. Handle loading and error states.

7. **Code Style**:
   - Use arrow functions for components
   - Destructure props
   - Use meaningful variable names
   - Keep components focused and small

8. **Output Format**: Generate each file with the path prefix:
   \`\`\`typescript:frontend/src/App.tsx
   // code here
   \`\`\`

Generate complete, working code that can be run immediately with "npm install && npm run dev".
`.trim();
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private formatTechStack(techStack: ContractAI['generation']['techStack']): string {
    const frontend = techStack.frontend;
    if (!frontend) {
      return `
- Framework: React
- Bundler: Vite
- Styling: Tailwind CSS
`.trim();
    }

    return `
- Framework: ${frontend.framework}
- Bundler: ${frontend.bundler}
- Styling: ${frontend.styling}
${frontend.uiLibrary ? `- UI Library: ${frontend.uiLibrary}` : ''}
${frontend.libraries ? `- Libraries: ${frontend.libraries.join(', ')}` : ''}
`.trim();
  }

  private formatEntitiesWithComponents(entities: EntityDefinition[]): string {
    return entities.map(entity => {
      const formFields = entity.fields
        .filter(f => !f.annotations?.generated)
        .map(f => {
          const type = this.getInputType(f.type);
          const required = f.annotations?.required ? 'required' : 'optional';
          return `- ${f.name}: ${type} input (${required})`;
        });

      return `
### ${entity.name}

**List Component (${entity.name}List.tsx):**
- Display all ${entity.name.toLowerCase()}s in a table
- Include actions: View, Edit, Delete
- Add "Create New" button

**Form Component (${entity.name}Form.tsx):**
Form fields:
${formFields.join('\n')}

**Hook (use${entity.name}.ts):**
- Fetch all ${entity.name.toLowerCase()}s
- Create, update, delete operations
- Loading and error states
`;
    }).join('\n');
  }

  private formatInstructions(
    instructions: ContractAI['generation']['instructions'],
    target: string
  ): string {
    const priorityOrder = { must: 0, should: 1, may: 2 };
    
    const relevant = instructions.filter(i => i.target === target || i.target === 'all');
    
    if (relevant.length === 0) {
      return `
[MUST] Use React functional components with TypeScript
[MUST] Style all components with Tailwind CSS
[SHOULD] Create reusable UI components
[SHOULD] Handle loading and error states
`.trim();
    }

    return relevant
      .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
      .map(i => `[${i.priority.toUpperCase()}] ${i.instruction}`)
      .join('\n');
  }

  private formatPatterns(
    patterns: ContractAI['generation']['patterns'],
    target: string
  ): string {
    const relevantPatterns = patterns.filter(p => 
      p.appliesTo.includes(target as any) || p.appliesTo.includes('all' as any)
    );

    if (relevantPatterns.length === 0) {
      return `
### React Functional Component Pattern
\`\`\`typescript
interface Props {
  // props here
}

export const MyComponent: React.FC<Props> = ({ prop1, prop2 }) => {
  const [state, setState] = useState<Type>(initialValue);
  
  useEffect(() => {
    // side effects
  }, [dependencies]);
  
  return (
    <div className="...tailwind classes...">
      {/* JSX */}
    </div>
  );
};
\`\`\`

### Custom Hook Pattern
\`\`\`typescript
export function useEntity() {
  const [data, setData] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/entities');
      const json = await response.json();
      setData(json);
    } catch (err) {
      setError('Failed to fetch');
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => { fetchAll(); }, [fetchAll]);
  
  return { data, loading, error, refetch: fetchAll };
}
\`\`\`
`;
    }

    return relevantPatterns.map(p => `
### ${p.name}
${p.description}

\`\`\`typescript
${p.template}
\`\`\`
`).join('\n');
  }

  private formatConstraints(constraints: ContractAI['generation']['constraints']): string {
    const relevant = constraints.filter(c => 
      c.type !== 'no-external-deps' // frontend może mieć zależności
    );
    
    if (relevant.length === 0) {
      return '- Use TypeScript strict mode\n- No inline styles (use Tailwind)\n- Keep components under 200 lines';
    }

    return relevant.map(c => 
      `- [${c.severity.toUpperCase()}] ${c.rule}`
    ).join('\n');
  }

  private getInputType(fieldType: string): string {
    const typeMap: Record<string, string> = {
      'String': 'text',
      'Text': 'textarea',
      'Email': 'email',
      'URL': 'url',
      'Phone': 'tel',
      'Int': 'number',
      'Float': 'number',
      'Money': 'number',
      'Boolean': 'checkbox',
      'DateTime': 'datetime-local',
      'UUID': 'hidden'
    };
    return typeMap[fieldType] || 'text';
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export function createFrontendPromptTemplate(): FrontendPromptTemplate {
  return new FrontendPromptTemplate();
}
