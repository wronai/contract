/**
 * Stage 1: Syntax Validator
 * 
 * Sprawdza składnię TypeScript wygenerowanego kodu.
 * 
 * @version 2.2.0
 */

import { StageResult } from '../../types';
import { ValidationContext, ValidationStage } from '../pipeline-orchestrator';

// ============================================================================
// SYNTAX VALIDATOR STAGE
// ============================================================================

/**
 * Stage 1: Walidacja składni TypeScript
 */
export class SyntaxValidator implements ValidationStage {
  name = 'syntax';
  critical = true;
  timeout = 30000;

  async validator(context: ValidationContext): Promise<StageResult> {
    const errors: StageResult['errors'] = [];
    const warnings: StageResult['warnings'] = [];

    for (const file of context.code.files) {
      // Sprawdź błędy składniowe z parsera
      if (file.syntaxErrors && file.syntaxErrors.length > 0) {
        for (const err of file.syntaxErrors) {
          errors.push({
            message: err.message,
            file: file.path,
            line: err.line,
            code: 'SYNTAX_ERROR'
          });
        }
      }

      // Dodatkowe sprawdzenia składniowe
      const syntaxErrors = this.checkBasicSyntax(file.path, file.content);
      errors.push(...syntaxErrors);
    }

    // Sprawdź czy wszystkie wymagane pliki istnieją
    const missingFiles = this.checkRequiredFiles(context);
    errors.push(...missingFiles);

    return {
      stage: this.name,
      passed: errors.length === 0,
      errors,
      warnings,
      timeMs: 0
    };
  }

  /**
   * Sprawdza podstawową składnię pliku
   */
  private checkBasicSyntax(
    filePath: string,
    content: string
  ): StageResult['errors'] {
    const errors: StageResult['errors'] = [];
    const ext = filePath.split('.').pop()?.toLowerCase();

    // Sprawdzenia dla TypeScript/JavaScript
    if (['ts', 'tsx', 'js', 'jsx'].includes(ext || '')) {
      // Niezamknięte nawiasy klamrowe
      const openBraces = (content.match(/{/g) || []).length;
      const closeBraces = (content.match(/}/g) || []).length;
      
      if (openBraces !== closeBraces) {
        errors.push({
          message: `Unbalanced braces: ${openBraces} open, ${closeBraces} close`,
          file: filePath,
          code: 'UNBALANCED_BRACES'
        });
      }

      // Niezamknięte nawiasy okrągłe
      const openParens = (content.match(/\(/g) || []).length;
      const closeParens = (content.match(/\)/g) || []).length;
      
      if (openParens !== closeParens) {
        errors.push({
          message: `Unbalanced parentheses: ${openParens} open, ${closeParens} close`,
          file: filePath,
          code: 'UNBALANCED_PARENS'
        });
      }

      // Niezamknięte nawiasy kwadratowe
      const openBrackets = (content.match(/\[/g) || []).length;
      const closeBrackets = (content.match(/\]/g) || []).length;
      
      if (openBrackets !== closeBrackets) {
        errors.push({
          message: `Unbalanced brackets: ${openBrackets} open, ${closeBrackets} close`,
          file: filePath,
          code: 'UNBALANCED_BRACKETS'
        });
      }

      // Sprawdź niezamknięte stringi (prosty check)
      const lines = content.split('\n');
      lines.forEach((line, index) => {
        // Pomiń komentarze
        if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
          return;
        }

        const singleQuotes = (line.match(/'/g) || []).length;
        const doubleQuotes = (line.match(/"/g) || []).length;
        const backticks = (line.match(/`/g) || []).length;

        // Template literals mogą być wieloliniowe, więc tylko sprawdzamy zwykłe stringi
        if (singleQuotes % 2 !== 0 && !line.includes('`')) {
          errors.push({
            message: `Unclosed single quote string`,
            file: filePath,
            line: index + 1,
            code: 'UNCLOSED_STRING'
          });
        }

        if (doubleQuotes % 2 !== 0 && !line.includes('`')) {
          errors.push({
            message: `Unclosed double quote string`,
            file: filePath,
            line: index + 1,
            code: 'UNCLOSED_STRING'
          });
        }
      });
    }

    // Sprawdzenia dla JSON
    if (ext === 'json') {
      try {
        JSON.parse(content);
      } catch (e: any) {
        const match = e.message.match(/position (\d+)/);
        const position = match ? parseInt(match[1]) : 0;
        const line = content.substring(0, position).split('\n').length;

        errors.push({
          message: `Invalid JSON: ${e.message}`,
          file: filePath,
          line,
          code: 'INVALID_JSON'
        });
      }
    }

    return errors;
  }

  /**
   * Sprawdza czy wymagane pliki istnieją
   */
  private checkRequiredFiles(context: ValidationContext): StageResult['errors'] {
    const errors: StageResult['errors'] = [];
    const existingPaths = new Set(context.code.files.map(f => f.path));

    // Sprawdź asercje file-exists
    for (const assertion of context.contract.validation.assertions) {
      if (assertion.check.type === 'file-exists') {
        const path = assertion.check.path;
        
        // Sprawdź czy plik istnieje (z różnymi prefiksami)
        const exists = existingPaths.has(path) ||
                      existingPaths.has(`api/${path}`) ||
                      existingPaths.has(`frontend/${path}`);

        if (!exists) {
          errors.push({
            message: `Required file missing: ${path}`,
            file: path,
            code: 'MISSING_FILE'
          });
        }
      }
    }

    return errors;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export function createSyntaxValidator(): SyntaxValidator {
  return new SyntaxValidator();
}
