/**
 * Stage 2: Assertion Validator
 * 
 * Sprawdza asercje zdefiniowane w Contract AI.
 * 
 * @version 2.4.1
 */

import { StageResult, CodeAssertion, GeneratedFile } from '../../types';
import { ValidationContext, ValidationStage } from '../pipeline-orchestrator';

// ============================================================================
// ASSERTION VALIDATOR STAGE
// ============================================================================

/**
 * Stage 2: Walidacja asercji z kontraktu
 */
export class AssertionValidator implements ValidationStage {
  name = 'assertions';
  critical = true;
  timeout = 30000;

  private getFileForAssertion(assertion: CodeAssertion): string | undefined {
    const { check } = assertion;

    switch (check.type) {
      case 'file-exists':
      case 'file-contains':
      case 'file-not-contains':
      case 'exports-function':
      case 'exports-class':
      case 'has-error-handling':
        return check.path;
      default:
        return undefined;
    }
  }

  async validator(context: ValidationContext): Promise<StageResult> {
    const errors: StageResult['errors'] = [];
    const warnings: StageResult['warnings'] = [];
    const { assertions } = context.contract.validation;

    for (const assertion of assertions) {
      const result = this.checkAssertion(assertion, context.code.files);
      
      if (!result.passed) {
        const file = this.getFileForAssertion(assertion);
        if (assertion.severity === 'error') {
          errors.push({
            message: `[${assertion.id}] ${assertion.errorMessage}`,
            ...(file ? { file } : {}),
            code: assertion.id
          });
        } else {
          warnings.push({
            message: `[${assertion.id}] ${assertion.errorMessage}`
          });
        }
      }
    }

    return {
      stage: this.name,
      passed: errors.length === 0,
      errors,
      warnings,
      timeMs: 0
    };
  }

  /**
   * Sprawdza pojedynczą asercję
   */
  private checkAssertion(
    assertion: CodeAssertion,
    files: GeneratedFile[]
  ): { passed: boolean; details?: string } {
    const { check } = assertion;

    switch (check.type) {
      case 'file-exists':
        return this.checkFileExists(check.path, files);
      
      case 'file-contains':
        return this.checkFileContains(check.path, check.pattern, files);
      
      case 'file-not-contains':
        return this.checkFileNotContains(check.path, check.pattern, files);
      
      case 'exports-function':
        return this.checkExportsFunction(check.path, check.functionName, files);
      
      case 'exports-class':
        return this.checkExportsClass(check.path, check.className, files);
      
      case 'has-error-handling':
        return this.checkHasErrorHandling(check.path, files);
      
      case 'has-validation':
        return this.checkHasValidation(check.entityName, check.fieldName, files);
      
      default:
        return { passed: true, details: 'Unknown check type, skipped' };
    }
  }

  /**
   * Sprawdza czy plik istnieje (z wariantami nazewnictwa)
   */
  private checkFileExists(path: string, files: GeneratedFile[]): { passed: boolean } {
    // Use findFile which handles singular/plural variants
    const found = this.findFile(path, files);
    return { passed: !!found };
  }

  /**
   * Sprawdza czy plik zawiera pattern
   */
  private checkFileContains(
    path: string,
    pattern: string,
    files: GeneratedFile[]
  ): { passed: boolean } {
    const file = this.findFile(path, files);
    if (!file) return { passed: false };

    const regex = new RegExp(pattern, 's');
    return { passed: regex.test(file.content) };
  }

  /**
   * Sprawdza czy plik NIE zawiera pattern
   */
  private checkFileNotContains(
    path: string,
    pattern: string,
    files: GeneratedFile[]
  ): { passed: boolean } {
    const file = this.findFile(path, files);
    if (!file) return { passed: true }; // Plik nie istnieje, więc nie zawiera

    const regex = new RegExp(pattern, 's');
    return { passed: !regex.test(file.content) };
  }

  /**
   * Sprawdza czy plik eksportuje funkcję
   */
  private checkExportsFunction(
    path: string,
    functionName: string,
    files: GeneratedFile[]
  ): { passed: boolean } {
    const file = this.findFile(path, files);
    if (!file) return { passed: false };

    // Szukaj: export function name, export const name =, export { name }
    const patterns = [
      new RegExp(`export\\s+function\\s+${functionName}\\s*\\(`),
      new RegExp(`export\\s+const\\s+${functionName}\\s*=`),
      new RegExp(`export\\s+\\{[^}]*\\b${functionName}\\b[^}]*\\}`),
      new RegExp(`export\\s+default\\s+${functionName}`)
    ];

    const found = patterns.some(p => p.test(file.content));
    return { passed: found };
  }

  /**
   * Sprawdza czy plik eksportuje klasę
   */
  private checkExportsClass(
    path: string,
    className: string,
    files: GeneratedFile[]
  ): { passed: boolean } {
    const file = this.findFile(path, files);
    if (!file) return { passed: false };

    const patterns = [
      new RegExp(`export\\s+class\\s+${className}\\b`),
      new RegExp(`export\\s+default\\s+class\\s+${className}\\b`),
      new RegExp(`export\\s+\\{[^}]*\\b${className}\\b[^}]*\\}`)
    ];

    const found = patterns.some(p => p.test(file.content));
    return { passed: found };
  }

  /**
   * Sprawdza czy plik ma obsługę błędów (try-catch)
   */
  private checkHasErrorHandling(
    path: string,
    files: GeneratedFile[]
  ): { passed: boolean } {
    const file = this.findFile(path, files);
    if (!file) return { passed: false };

    // Szukaj try-catch lub .catch()
    const hasTryCatch = /try\s*\{[\s\S]*?\}\s*catch/.test(file.content);
    const hasPromiseCatch = /\.catch\s*\(/.test(file.content);

    return { passed: hasTryCatch || hasPromiseCatch };
  }

  /**
   * Sprawdza czy encja ma walidację pola
   */
  private checkHasValidation(
    entityName: string,
    fieldName: string,
    files: GeneratedFile[]
  ): { passed: boolean } {
    // Szukaj w plikach walidatorów
    const validatorFile = files.find(f => 
      f.path.toLowerCase().includes('validator') &&
      f.path.toLowerCase().includes(entityName.toLowerCase())
    );

    if (!validatorFile) {
      // Sprawdź w innych plikach
      for (const file of files) {
        if (this.hasFieldValidation(file.content, fieldName)) {
          return { passed: true };
        }
      }
      return { passed: false };
    }

    return { passed: this.hasFieldValidation(validatorFile.content, fieldName) };
  }

  /**
   * Sprawdza czy kod zawiera walidację danego pola
   */
  private hasFieldValidation(content: string, fieldName: string): boolean {
    const patterns = [
      // Bezpośrednia walidacja pola
      new RegExp(`${fieldName}.*(?:required|validate|check|isValid|regex|pattern)`, 'i'),
      // Walidacja email
      fieldName.toLowerCase() === 'email' && /email.*(?:regex|pattern|@|\.test\()/i.test(content),
      // Ogólna walidacja
      new RegExp(`validate.*${fieldName}`, 'i').test(content),
      // Zod/Yup schema
      new RegExp(`${fieldName}\\s*:\\s*z\\.`).test(content)
    ];

    return patterns.some(p => p === true || (p instanceof RegExp && p.test(content)));
  }

  /**
   * Znajduje plik po ścieżce (z wariantami nazewnictwa)
   */
  private findFile(path: string, files: GeneratedFile[]): GeneratedFile | undefined {
    // Direct match
    const direct = files.find(f => 
      f.path === path ||
      f.path.endsWith(path) ||
      f.path === `api/${path}` ||
      f.path === `frontend/${path}`
    );
    if (direct) return direct;

    // Try singular/plural variants
    const filename = path.split('/').pop() || '';
    const baseName = filename.replace(/\.(ts|tsx|js|jsx)$/, '');
    const variants = this.generateNameVariants(baseName);

    for (const variant of variants) {
      const variantPath = path.replace(filename, filename.replace(baseName, variant));
      const found = files.find(f =>
        f.path === variantPath ||
        f.path.endsWith(variantPath) ||
        f.path === `api/${variantPath}` ||
        f.path === `frontend/${variantPath}`
      );
      if (found) return found;
    }

    return undefined;
  }

  /**
   * Generuje warianty nazwy (singular/plural)
   */
  private generateNameVariants(name: string): string[] {
    const variants = [name];
    
    // Plural -> singular
    if (name.endsWith('ies')) {
      variants.push(name.slice(0, -3) + 'y');
    } else if (name.endsWith('es')) {
      variants.push(name.slice(0, -2));
      variants.push(name.slice(0, -1));
    } else if (name.endsWith('s')) {
      variants.push(name.slice(0, -1));
    }
    
    // Singular -> plural
    if (name.endsWith('y') && !name.endsWith('ey')) {
      variants.push(name.slice(0, -1) + 'ies');
    } else {
      variants.push(name + 's');
    }
    
    return variants;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export function createAssertionValidator(): AssertionValidator {
  return new AssertionValidator();
}
