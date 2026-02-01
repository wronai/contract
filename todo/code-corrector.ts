/**
 * Code Corrector
 * 
 * Poprawia wygenerowany kod na podstawie feedback z validation pipeline.
 * 
 * @version 2.4.1
 */

import {
  ContractAI,
  GeneratedCode,
  GeneratedFile
} from '../types';
import { LLMClient } from '../generator/contract-generator';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Feedback z walidacji
 */
export interface ValidationFeedback {
  issues: ValidationIssue[];
  summary: string;
  contractHints: ContractHint[];
  filesAffected: string[];
}

/**
 * Pojedynczy problem do naprawienia
 */
export interface ValidationIssue {
  file: string;
  line?: number;
  stage: string;
  severity: 'critical' | 'error' | 'warning';
  message: string;
  suggestion: string;
  contractRef?: string;
}

/**
 * Wskazówka z kontraktu
 */
export interface ContractHint {
  type: 'pattern' | 'instruction' | 'constraint';
  name: string;
  content: string;
  relevantTo: string[];
}

/**
 * Opcje korektora
 */
export interface CorrectorOptions {
  maxTokens: number;
  temperature: number;
  verbose: boolean;
}

// ============================================================================
// DEFAULT OPTIONS
// ============================================================================

const DEFAULT_OPTIONS: CorrectorOptions = {
  maxTokens: 4000,
  temperature: 0.2, // Niska dla precyzyjnych poprawek
  verbose: false
};

// ============================================================================
// CODE CORRECTOR
// ============================================================================

/**
 * Korektor kodu używający LLM
 */
export class CodeCorrector {
  private options: CorrectorOptions;
  private llmClient: LLMClient | null = null;

  constructor(options: Partial<CorrectorOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Ustawia klienta LLM
   */
  setLLMClient(client: LLMClient): void {
    this.llmClient = client;
  }

  /**
   * Poprawia kod na podstawie feedback
   */
  async correct(
    code: GeneratedCode,
    feedback: ValidationFeedback,
    contract: ContractAI
  ): Promise<GeneratedCode> {
    if (this.options.verbose) {
      console.log(`\n🔧 Correcting ${feedback.filesAffected.length} files...`);
    }

    // Grupuj issues po plikach
    const issuesByFile = this.groupIssuesByFile(feedback.issues);

    // Popraw każdy plik z błędami
    const correctedFiles: GeneratedFile[] = [];

    for (const file of code.files) {
      const fileIssues = issuesByFile.get(file.path);

      if (fileIssues && fileIssues.length > 0) {
        // Znajdź relevantne hints dla tego pliku
        const hints = feedback.contractHints.filter(h => 
          h.relevantTo.includes(file.path) || h.relevantTo.length === 0
        );

        if (this.options.verbose) {
          console.log(`   📝 Fixing ${file.path} (${fileIssues.length} issues)`);
        }

        const correctedFile = await this.correctFile(file, fileIssues, hints, contract);
        correctedFiles.push(correctedFile);
      } else {
        // Plik bez błędów - zachowaj bez zmian
        correctedFiles.push(file);
      }
    }

    return {
      ...code,
      files: correctedFiles,
      metadata: {
        ...code.metadata,
        correctedAt: new Date()
      }
    };
  }

  /**
   * Poprawia pojedynczy plik
   */
  async correctFile(
    file: GeneratedFile,
    issues: ValidationIssue[],
    hints: ContractHint[],
    contract: ContractAI
  ): Promise<GeneratedFile> {
    const prompt = this.buildCorrectionPrompt(file, issues, hints, contract);
    const systemPrompt = this.getSystemPrompt();

    // Wywołaj LLM
    let correctedContent: string;

    if (this.llmClient) {
      const response = await this.llmClient.generate({
        system: systemPrompt,
        user: prompt,
        temperature: this.options.temperature,
        maxTokens: this.options.maxTokens
      });
      correctedContent = this.extractCodeFromResponse(response);
    } else {
      // Fallback - symulacja prostych poprawek
      correctedContent = this.simulateCorrection(file.content, issues);
    }

    return {
      ...file,
      content: correctedContent
    };
  }

  /**
   * Grupuje issues po plikach
   */
  private groupIssuesByFile(issues: ValidationIssue[]): Map<string, ValidationIssue[]> {
    const map = new Map<string, ValidationIssue[]>();

    for (const issue of issues) {
      const existing = map.get(issue.file) || [];
      existing.push(issue);
      map.set(issue.file, existing);
    }

    return map;
  }

  /**
   * Buduje prompt do korekcji
   */
  buildCorrectionPrompt(
    file: GeneratedFile,
    issues: ValidationIssue[],
    hints: ContractHint[],
    contract: ContractAI
  ): string {
    // Sortuj issues według severity
    const sortedIssues = [...issues].sort((a, b) => {
      const severityOrder = { critical: 0, error: 1, warning: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });

    const issuesList = sortedIssues.map((issue, i) => `
${i + 1}. [${issue.severity.toUpperCase()}] ${issue.line ? `Line ${issue.line}: ` : ''}
   Problem: ${issue.message}
   Fix: ${issue.suggestion}
   ${issue.contractRef ? `Contract ref: ${issue.contractRef}` : ''}`
    ).join('\n');

    const hintsList = hints.map(hint => `
### ${hint.name} (${hint.type})
\`\`\`typescript
${hint.content}
\`\`\``
    ).join('\n');

    return `
# CODE CORRECTION TASK

## FILE TO CORRECT
Path: ${file.path}

\`\`\`typescript
${file.content}
\`\`\`

## ISSUES TO FIX (${issues.length} total)
${issuesList}

## RELEVANT CONTRACT PATTERNS
${hints.length > 0 ? hintsList : 'No specific patterns - use best practices.'}

## TECH STACK
${JSON.stringify(contract.generation?.techStack || {}, null, 2)}

## INSTRUCTIONS
1. Fix ALL listed issues
2. Maintain compatibility with other files in the project
3. Follow the contract patterns exactly where applicable
4. Keep the same file structure and exports
5. Do NOT add new features or remove existing functionality
6. Ensure proper TypeScript types (no 'any' unless necessary)
7. Add proper error handling with try-catch where missing

Output ONLY the corrected code. No explanations or markdown wrappers.
`.trim();
  }

  /**
   * System prompt dla LLM
   */
  getSystemPrompt(): string {
    return `You are an expert TypeScript/JavaScript code reviewer and fixer.

Your task is to fix code issues while making minimal changes.

Rules:
1. Fix ONLY the reported issues
2. Maintain the existing code structure
3. Use proper TypeScript types
4. Add error handling where needed
5. Follow the provided patterns exactly
6. Output only the corrected code, nothing else

You are precise, careful, and thorough.`;
  }

  /**
   * Ekstrahuje kod z odpowiedzi LLM
   */
  extractCodeFromResponse(response: string): string {
    // Usuń markdown code blocks jeśli są
    let code = response;

    // Usuń ```typescript lub ``` wrapper
    code = code.replace(/^```(?:typescript|javascript|ts|js)?\n?/m, '');
    code = code.replace(/\n?```$/m, '');

    // Usuń ewentualne komentarze/wyjaśnienia na początku/końcu
    code = code.trim();

    return code;
  }

  /**
   * Symulacja korekcji (bez LLM)
   */
  private simulateCorrection(content: string, issues: ValidationIssue[]): string {
    let corrected = content;

    for (const issue of issues) {
      // Proste reguły symulacji

      // 1. Dodaj try-catch jeśli brakuje
      if (issue.message.includes('try-catch') || issue.message.includes('error handling')) {
        // Znajdź async function/arrow functions i wrap w try-catch
        corrected = this.addTryCatch(corrected);
      }

      // 2. Dodaj walidację email
      if (issue.message.includes('email') && issue.message.includes('validation')) {
        corrected = this.addEmailValidation(corrected);
      }

      // 3. Zamień any na unknown lub proper type
      if (issue.message.includes('any')) {
        corrected = corrected.replace(/: any\b/g, ': unknown');
      }
    }

    return corrected;
  }

  /**
   * Dodaje try-catch do async handlers
   */
  private addTryCatch(content: string): string {
    // Prosty regex do znalezienia route handlers bez try-catch
    const routePattern = /router\.(get|post|put|delete)\([^)]+,\s*async\s*\([^)]*\)\s*=>\s*{([^}]*)}/g;
    
    return content.replace(routePattern, (match, method, body) => {
      if (body.includes('try')) return match; // Już ma try-catch
      
      const indentedBody = body.trim().split('\n').map((l: string) => '    ' + l).join('\n');
      return match.replace(body, `
  try {
${indentedBody}
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
`);
    });
  }

  /**
   * Dodaje walidację email
   */
  private addEmailValidation(content: string): string {
    // Sprawdź czy już jest funkcja walidacji
    if (content.includes('validateEmail') || content.includes('isValidEmail')) {
      return content;
    }

    // Dodaj funkcję walidacji na początku pliku (po importach)
    const validationCode = `
// Email validation helper
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
  return emailRegex.test(email);
};
`;

    // Znajdź koniec importów
    const importEndIndex = content.lastIndexOf('import');
    if (importEndIndex !== -1) {
      const nextNewline = content.indexOf('\n', importEndIndex);
      const afterImportsNewline = content.indexOf('\n', nextNewline + 1);
      
      return content.slice(0, afterImportsNewline) + '\n' + validationCode + content.slice(afterImportsNewline);
    }

    return validationCode + '\n' + content;
  }
}

// ============================================================================
// FACTORY
// ============================================================================

export function createCodeCorrector(options?: Partial<CorrectorOptions>): CodeCorrector {
  return new CodeCorrector(options);
}
