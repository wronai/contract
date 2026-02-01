/**
 * Stage 1: Syntax Validator
 * 
 * Sprawdza składnię TypeScript wygenerowanego kodu.
 * 
 * @version 2.4.1
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
    const existingPaths = context.code.files.map(f => f.path);

    // Sprawdź asercje file-exists
    for (const assertion of context.contract.validation.assertions) {
      if (assertion.check.type === 'file-exists') {
        const path = assertion.check.path;
        
        // Sprawdź czy plik istnieje (z różnymi wariantami)
        const exists = this.fileExists(path, existingPaths);

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

  /**
   * Sprawdza czy plik istnieje (z wariantami nazewnictwa)
   */
  private fileExists(requiredPath: string, existingPaths: string[]): boolean {
    // Exact match
    if (existingPaths.includes(requiredPath)) return true;
    
    // With api/ or frontend/ prefix
    if (existingPaths.includes(`api/${requiredPath}`)) return true;
    if (existingPaths.includes(`frontend/${requiredPath}`)) return true;
    
    // Extract filename and check for singular/plural variants
    const filename = requiredPath.split('/').pop() || '';
    const baseName = filename.replace(/\.(ts|tsx|js|jsx)$/, '');
    const ext = filename.match(/\.(ts|tsx|js|jsx)$/)?.[0] || '.ts';
    
    // Generate variants: contacts -> contact, companies -> company
    const variants = this.generateNameVariants(baseName);
    
    for (const variant of variants) {
      const variantPath = requiredPath.replace(filename, `${variant}${ext}`);
      if (existingPaths.includes(variantPath)) return true;
      if (existingPaths.includes(`api/${variantPath}`)) return true;
      if (existingPaths.includes(`frontend/${variantPath}`)) return true;
    }
    
    // Check if any existing path contains the base name in routes/
    const routePattern = /routes\//;
    if (routePattern.test(requiredPath)) {
      for (const existing of existingPaths) {
        if (routePattern.test(existing)) {
          for (const variant of variants) {
            if (existing.includes(`/${variant}.`) || existing.includes(`/${variant}${ext}`)) {
              return true;
            }
          }
        }
      }
    }
    
    return false;
  }

  /**
   * Generuje warianty nazwy (singular/plural)
   */
  private generateNameVariants(name: string): string[] {
    const variants = [name];
    
    // Plural -> singular
    if (name.endsWith('ies')) {
      variants.push(name.slice(0, -3) + 'y'); // companies -> company
    } else if (name.endsWith('es')) {
      variants.push(name.slice(0, -2)); // boxes -> box
      variants.push(name.slice(0, -1)); // types -> type
    } else if (name.endsWith('s')) {
      variants.push(name.slice(0, -1)); // contacts -> contact
    }
    
    // Singular -> plural
    if (name.endsWith('y')) {
      variants.push(name.slice(0, -1) + 'ies'); // company -> companies
    } else {
      variants.push(name + 's'); // contact -> contacts
    }
    
    return variants;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export function createSyntaxValidator(): SyntaxValidator {
  return new SyntaxValidator();
}
