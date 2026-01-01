/**
 * Contract AI - Layer 2: Generation Types (JAK GENEROWAĆ)
 * 
 * Definiuje instrukcje dla LLM jak generować kod.
 * 
 * @version 2.2.0
 * @see todo/14-reclapp-llm-code-generation-spec.md
 */

// ============================================================================
// GENERATION TARGET
// ============================================================================

/**
 * Cele generacji kodu
 */
export type GenerationTarget = 
  | 'api'
  | 'frontend'
  | 'database'
  | 'tests'
  | 'docker'
  | 'all';

/**
 * Priorytet instrukcji
 */
export type InstructionPriority = 'must' | 'should' | 'may';

// ============================================================================
// CODE EXAMPLE
// ============================================================================

/**
 * Przykład kodu do wykorzystania w instrukcjach
 */
export interface CodeExample {
  /** Nazwa przykładu */
  name: string;
  /** Opis przykładu */
  description?: string;
  /** Język programowania */
  language: string;
  /** Kod źródłowy */
  code: string;
}

// ============================================================================
// GENERATION INSTRUCTION
// ============================================================================

/**
 * Instrukcja generacji dla LLM
 * 
 * @example
 * ```typescript
 * const errorHandlingInstruction: GenerationInstruction = {
 *   target: 'api',
 *   priority: 'must',
 *   instruction: 'Implement proper error handling with try-catch and return appropriate HTTP status codes.',
 *   examples: [
 *     {
 *       name: 'Express error handler',
 *       language: 'typescript',
 *       code: `router.get('/', async (req, res) => {
 *         try {
 *           const data = await service.findAll();
 *           res.json(data);
 *         } catch (error) {
 *           res.status(500).json({ error: 'Internal server error' });
 *         }
 *       });`
 *     }
 *   ]
 * };
 * ```
 */
export interface GenerationInstruction {
  /** Cel instrukcji */
  target: GenerationTarget;
  /** Priorytet */
  priority: InstructionPriority;
  /** Treść instrukcji */
  instruction: string;
  /** Przykłady kodu */
  examples?: CodeExample[];
}

// ============================================================================
// PATTERN VARIABLE
// ============================================================================

/**
 * Zmienna do podstawienia w pattern
 */
export interface PatternVariable {
  /** Nazwa zmiennej */
  name: string;
  /** Opis zmiennej */
  description: string;
  /** Typ zmiennej */
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  /** Wartość domyślna */
  default?: any;
  /** Czy wymagana */
  required?: boolean;
}

// ============================================================================
// CODE PATTERN
// ============================================================================

/**
 * Wzorzec kodu do naśladowania przez LLM
 * 
 * @example
 * ```typescript
 * const expressRoutePattern: CodePattern = {
 *   name: 'Express Route Pattern',
 *   description: 'Standard pattern for Express.js routes',
 *   appliesTo: ['api'],
 *   template: `
 *     import { Router, Request, Response } from 'express';
 *     
 *     const router = Router();
 *     
 *     router.get('/', async (req: Request, res: Response) => {
 *       try {
 *         const items = await {{service}}.findAll();
 *         res.json(items);
 *       } catch (error) {
 *         res.status(500).json({ error: 'Internal server error' });
 *       }
 *     });
 *     
 *     export default router;
 *   `,
 *   variables: [
 *     { name: 'service', description: 'Service class name', type: 'string', required: true }
 *   ]
 * };
 * ```
 */
export interface CodePattern {
  /** Nazwa wzorca */
  name: string;
  /** Opis wzorca */
  description: string;
  /** Do jakich celów stosować */
  appliesTo: GenerationTarget[];
  /** Szablon kodu */
  template: string;
  /** Zmienne do podstawienia */
  variables?: PatternVariable[];
}

// ============================================================================
// TECHNICAL CONSTRAINT
// ============================================================================

/**
 * Typy ograniczeń technicznych
 */
export type ConstraintType =
  | 'no-external-deps'
  | 'max-file-size'
  | 'naming-convention'
  | 'no-any-types'
  | 'max-function-length'
  | 'max-complexity'
  | 'custom';

/**
 * Ograniczenie techniczne
 * 
 * @example
 * ```typescript
 * const noAnyConstraint: TechnicalConstraint = {
 *   type: 'no-any-types',
 *   rule: 'All code must be properly typed. No "any" types allowed.',
 *   severity: 'error',
 *   autoFix: false
 * };
 * ```
 */
export interface TechnicalConstraint {
  /** Typ ograniczenia */
  type: ConstraintType;
  /** Opis reguły */
  rule: string;
  /** Poziom błędu */
  severity: 'error' | 'warning';
  /** Czy można automatycznie naprawić */
  autoFix?: boolean;
}

// ============================================================================
// TECH STACK
// ============================================================================

/**
 * Konfiguracja backendu
 */
export interface BackendConfig {
  /** Runtime (node, deno, bun) */
  runtime: 'node' | 'deno' | 'bun';
  /** Język */
  language: 'typescript' | 'javascript';
  /** Framework */
  framework: 'express' | 'fastify' | 'koa' | 'hono' | 'none';
  /** Port */
  port: number;
  /** Dodatkowe biblioteki */
  libraries?: string[];
}

/**
 * Konfiguracja frontendu
 */
export interface FrontendConfig {
  /** Framework */
  framework: 'react' | 'vue' | 'svelte' | 'solid' | 'none';
  /** Bundler */
  bundler: 'vite' | 'webpack' | 'esbuild' | 'none';
  /** Stylowanie */
  styling: 'tailwind' | 'css-modules' | 'styled-components' | 'sass' | 'none';
  /** Biblioteka UI */
  uiLibrary?: 'shadcn' | 'mui' | 'chakra' | 'none';
  /** Dodatkowe biblioteki */
  libraries?: string[];
}

/**
 * Konfiguracja bazy danych
 */
export interface DatabaseConfig {
  /** Typ bazy */
  type: 'postgresql' | 'mysql' | 'sqlite' | 'mongodb' | 'in-memory';
  /** ORM */
  orm?: 'prisma' | 'drizzle' | 'typeorm' | 'mongoose' | 'none';
  /** Connection string pattern */
  connectionPattern?: string;
}

/**
 * Stack technologiczny
 * 
 * @example
 * ```typescript
 * const crmTechStack: TechStack = {
 *   backend: {
 *     runtime: 'node',
 *     language: 'typescript',
 *     framework: 'express',
 *     port: 3000
 *   },
 *   frontend: {
 *     framework: 'react',
 *     bundler: 'vite',
 *     styling: 'tailwind',
 *     uiLibrary: 'shadcn'
 *   },
 *   database: {
 *     type: 'in-memory'
 *   }
 * };
 * ```
 */
export interface TechStack {
  /** Konfiguracja backendu */
  backend: BackendConfig;
  /** Konfiguracja frontendu (opcjonalna) */
  frontend?: FrontendConfig;
  /** Konfiguracja bazy danych (opcjonalna) */
  database?: DatabaseConfig;
}

// ============================================================================
// GENERATION LAYER
// ============================================================================

/**
 * Layer 2: Generation - definiuje JAK LLM ma generować kod
 * 
 * @example
 * ```typescript
 * const crmGeneration: GenerationLayer = {
 *   instructions: [
 *     {
 *       target: 'api',
 *       priority: 'must',
 *       instruction: 'Use Express.js with TypeScript. Each entity must have its own route file.'
 *     },
 *     {
 *       target: 'all',
 *       priority: 'must',
 *       instruction: 'All code must be properly typed. No "any" types allowed.'
 *     }
 *   ],
 *   patterns: [
 *     { name: 'Express Route Pattern', ... }
 *   ],
 *   constraints: [
 *     { type: 'no-any-types', rule: '...', severity: 'error' }
 *   ],
 *   techStack: {
 *     backend: { runtime: 'node', language: 'typescript', framework: 'express', port: 3000 }
 *   }
 * };
 * ```
 */
export interface GenerationLayer {
  /** Instrukcje dla LLM */
  instructions: GenerationInstruction[];
  /** Wzorce kodu */
  patterns: CodePattern[];
  /** Ograniczenia techniczne */
  constraints: TechnicalConstraint[];
  /** Stack technologiczny */
  techStack: TechStack;
}
