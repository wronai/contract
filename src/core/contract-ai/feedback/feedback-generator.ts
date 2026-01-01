/**
 * Feedback Generator
 * 
 * Generuje feedback dla LLM na podstawie wyników walidacji.
 * 
 * @version 2.2.0
 * @see todo/16-reclapp-implementation-todo-prompts.md
 */

import { ContractAI, PipelineResult, StageResult } from '../types';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Issue z walidacji
 */
export interface ValidationIssue {
  /** Stage który zgłosił problem */
  stage: string;
  /** Poziom problemu */
  severity: 'error' | 'warning';
  /** Opis problemu */
  message: string;
  /** Plik z problemem */
  file?: string;
  /** Linia z problemem */
  line?: number;
  /** Kod błędu */
  code?: string;
  /** Sugestia naprawy */
  suggestion?: string;
}

/**
 * Feedback do przekazania LLM
 */
export interface ValidationFeedback {
  /** Lista problemów do naprawienia */
  issues: ValidationIssue[];
  /** Podsumowanie tekstowe */
  summary: string;
  /** Wskazówki z kontraktu */
  contractHints: string[];
  /** Pliki do poprawienia */
  filesToFix: string[];
}

// ============================================================================
// FEEDBACK GENERATOR
// ============================================================================

/**
 * Generator feedbacku dla LLM
 */
export class FeedbackGenerator {
  
  /**
   * Generuje feedback na podstawie wyników walidacji
   */
  generateFeedback(
    contract: ContractAI,
    result: PipelineResult
  ): ValidationFeedback {
    const issues = this.extractIssues(result);
    const summary = this.generateSummary(issues);
    const contractHints = this.extractContractHints(contract, issues);
    const filesToFix = this.getFilesToFix(issues);

    return {
      issues,
      summary,
      contractHints,
      filesToFix
    };
  }

  /**
   * Buduje prompt do korekty kodu
   */
  buildCorrectionPrompt(
    contract: ContractAI,
    currentCode: { path: string; content: string }[],
    feedback: ValidationFeedback
  ): string {
    const issuesByFile = this.groupIssuesByFile(feedback.issues);

    let prompt = `
# CODE CORRECTION TASK

The previously generated code has validation errors that need to be fixed.

## SUMMARY
${feedback.summary}

## ISSUES TO FIX (${feedback.issues.length} total)

`;

    // Grupuj issues po plikach
    for (const [filePath, fileIssues] of Object.entries(issuesByFile)) {
      const file = currentCode.find(f => f.path === filePath || f.path.endsWith(filePath));
      
      prompt += `
### FILE: ${filePath}

**Issues:**
${fileIssues.map((issue, i) => `${i + 1}. [${issue.severity.toUpperCase()}] ${issue.message}${issue.line ? ` (line ${issue.line})` : ''}${issue.suggestion ? `\n   Suggestion: ${issue.suggestion}` : ''}`).join('\n')}

`;

      if (file) {
        prompt += `
**Current Code:**
\`\`\`typescript
${file.content}
\`\`\`

`;
      }
    }

    // Issues bez konkretnego pliku
    const globalIssues = feedback.issues.filter(i => !i.file);
    if (globalIssues.length > 0) {
      prompt += `
### GENERAL ISSUES

${globalIssues.map((issue, i) => `${i + 1}. [${issue.severity.toUpperCase()}] ${issue.message}${issue.suggestion ? `\n   Suggestion: ${issue.suggestion}` : ''}`).join('\n')}

`;
    }

    // Wskazówki z kontraktu
    if (feedback.contractHints.length > 0) {
      prompt += `
## CONTRACT HINTS

${feedback.contractHints.map(hint => `- ${hint}`).join('\n')}

`;
    }

    prompt += `
## INSTRUCTIONS

1. Fix ALL issues listed above
2. Maintain compatibility with other files
3. Follow the contract specification
4. Keep the same file structure
5. Output ONLY the corrected code files

For each fixed file, output in format:
\`\`\`typescript:path/to/file.ts
// corrected code here
\`\`\`
`;

    return prompt.trim();
  }

  /**
   * Ekstrahuje issues z wyników walidacji
   */
  private extractIssues(result: PipelineResult): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    for (const stage of result.stages) {
      // Błędy
      for (const error of stage.errors) {
        issues.push({
          stage: stage.stage,
          severity: 'error',
          message: error.message,
          file: error.file,
          line: error.line,
          code: error.code,
          suggestion: this.getSuggestionForError(error.code, error.message)
        });
      }

      // Ostrzeżenia
      for (const warning of stage.warnings) {
        issues.push({
          stage: stage.stage,
          severity: 'warning',
          message: warning.message,
          file: warning.file,
          line: warning.line
        });
      }
    }

    return issues;
  }

  /**
   * Generuje podsumowanie tekstowe
   */
  private generateSummary(issues: ValidationIssue[]): string {
    const errors = issues.filter(i => i.severity === 'error');
    const warnings = issues.filter(i => i.severity === 'warning');

    const stageErrors = new Map<string, number>();
    for (const issue of errors) {
      stageErrors.set(issue.stage, (stageErrors.get(issue.stage) || 0) + 1);
    }

    let summary = `Found ${errors.length} error(s) and ${warnings.length} warning(s).`;

    if (stageErrors.size > 0) {
      summary += '\n\nErrors by stage:';
      for (const [stage, count] of stageErrors) {
        summary += `\n- ${stage}: ${count} error(s)`;
      }
    }

    return summary;
  }

  /**
   * Wyciąga wskazówki z kontraktu
   */
  private extractContractHints(
    contract: ContractAI,
    issues: ValidationIssue[]
  ): string[] {
    const hints: string[] = [];

    // Dodaj relevantne instrukcje generacji
    const relevantInstructions = contract.generation.instructions
      .filter(i => i.priority === 'must')
      .slice(0, 5);

    for (const inst of relevantInstructions) {
      hints.push(`[${inst.target}] ${inst.instruction}`);
    }

    // Dodaj patterns jeśli są
    for (const pattern of contract.generation.patterns.slice(0, 2)) {
      hints.push(`Use pattern "${pattern.name}": ${pattern.description}`);
    }

    return hints;
  }

  /**
   * Zwraca listę plików do poprawienia
   */
  private getFilesToFix(issues: ValidationIssue[]): string[] {
    const files = new Set<string>();
    
    for (const issue of issues) {
      if (issue.file && issue.severity === 'error') {
        files.add(issue.file);
      }
    }

    return Array.from(files);
  }

  /**
   * Grupuje issues po plikach
   */
  private groupIssuesByFile(issues: ValidationIssue[]): Record<string, ValidationIssue[]> {
    const grouped: Record<string, ValidationIssue[]> = {};

    for (const issue of issues) {
      if (issue.file) {
        if (!grouped[issue.file]) {
          grouped[issue.file] = [];
        }
        grouped[issue.file].push(issue);
      }
    }

    return grouped;
  }

  /**
   * Generuje sugestię naprawy dla danego błędu
   */
  private getSuggestionForError(code?: string, message?: string): string | undefined {
    if (!code && !message) return undefined;

    const suggestions: Record<string, string> = {
      'SYNTAX_ERROR': 'Check for missing brackets, semicolons, or typos',
      'UNBALANCED_BRACES': 'Count opening and closing braces { } and ensure they match',
      'UNBALANCED_PARENS': 'Count opening and closing parentheses ( ) and ensure they match',
      'MISSING_FILE': 'Generate this required file',
      'EVAL_USAGE': 'Replace eval() with a safer alternative',
      'INVALID_JSON': 'Verify JSON syntax - check for trailing commas, missing quotes'
    };

    if (code && suggestions[code]) {
      return suggestions[code];
    }

    // Sugestie na podstawie treści komunikatu
    if (message?.includes('try-catch') || message?.includes('error handling')) {
      return 'Wrap async operations in try-catch blocks';
    }
    if (message?.includes('validation')) {
      return 'Add input validation before processing data';
    }
    if (message?.includes('any type')) {
      return 'Replace "any" with a specific TypeScript type';
    }

    return undefined;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export function createFeedbackGenerator(): FeedbackGenerator {
  return new FeedbackGenerator();
}
