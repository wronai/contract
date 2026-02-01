/**
 * Contract AI - Layer 3: Validation Types (JAK SPRAWDZAĆ / KIEDY GOTOWE)
 * 
 * Definiuje reguły walidacji i kryteria akceptacji wygenerowanego kodu.
 * 
 * @version 2.4.1
 * @see todo/14-reclapp-llm-code-generation-spec.md
 */

// ============================================================================
// ASSERTION CHECK TYPES
// ============================================================================

/**
 * Sprawdzenie czy plik istnieje
 */
export interface FileExistsCheck {
  type: 'file-exists';
  path: string;
}

/**
 * Sprawdzenie czy plik zawiera pattern
 */
export interface FileContainsCheck {
  type: 'file-contains';
  path: string;
  pattern: string;
}

/**
 * Sprawdzenie czy plik NIE zawiera pattern
 */
export interface FileNotContainsCheck {
  type: 'file-not-contains';
  path: string;
  pattern: string;
}

/**
 * Sprawdzenie czy plik eksportuje funkcję
 */
export interface ExportsFunctionCheck {
  type: 'exports-function';
  path: string;
  functionName: string;
}

/**
 * Sprawdzenie czy plik eksportuje klasę
 */
export interface ExportsClassCheck {
  type: 'exports-class';
  path: string;
  className: string;
}

/**
 * Sprawdzenie czy klasa implementuje interfejs
 */
export interface ImplementsInterfaceCheck {
  type: 'implements-interface';
  path: string;
  interfaceName: string;
}

/**
 * Sprawdzenie czy kod ma obsługę błędów
 */
export interface HasErrorHandlingCheck {
  type: 'has-error-handling';
  path: string;
}

/**
 * Sprawdzenie czy encja ma walidację pola
 */
export interface HasValidationCheck {
  type: 'has-validation';
  entityName: string;
  fieldName: string;
}

/**
 * Custom validator (nazwa funkcji walidującej)
 */
export interface CustomCheck {
  type: 'custom';
  validator: string;
  config?: Record<string, any>;
}

/**
 * Union type wszystkich typów sprawdzeń
 */
export type AssertionCheck =
  | FileExistsCheck
  | FileContainsCheck
  | FileNotContainsCheck
  | ExportsFunctionCheck
  | ExportsClassCheck
  | ImplementsInterfaceCheck
  | HasErrorHandlingCheck
  | HasValidationCheck
  | CustomCheck;

// ============================================================================
// CODE ASSERTION
// ============================================================================

/**
 * Asercja którą kod musi spełniać
 * 
 * @example
 * ```typescript
 * const serverExistsAssertion: CodeAssertion = {
 *   id: 'A001',
 *   description: 'Server entry point must exist',
 *   check: { type: 'file-exists', path: 'api/src/server.ts' },
 *   errorMessage: 'Missing server.ts file - the API entry point is required',
 *   severity: 'error'
 * };
 * ```
 */
export interface CodeAssertion {
  /** Unikalny identyfikator (np. 'A001') */
  id: string;
  /** Opis asercji */
  description: string;
  /** Sprawdzenie do wykonania */
  check: AssertionCheck;
  /** Komunikat błędu */
  errorMessage: string;
  /** Poziom błędu */
  severity: 'error' | 'warning';
}

// ============================================================================
// TEST SPECIFICATION
// ============================================================================

/**
 * Typ testu
 */
export type TestType = 'unit' | 'integration' | 'e2e' | 'api';

/**
 * Oczekiwany wynik testu
 */
export interface ExpectedResult {
  /** Status HTTP (dla testów API) */
  status?: number;
  /** Oczekiwane pola w response */
  fields?: string[];
  /** Oczekiwana wartość */
  value?: any;
  /** Czy wynik ma być tablicą */
  isArray?: boolean;
  /** Minimalna liczba elementów */
  minLength?: number;
}

/**
 * Scenariusz testowy
 * 
 * @example
 * ```typescript
 * const createContactScenario: TestScenario = {
 *   name: 'should create a new contact',
 *   given: 'an empty contacts database',
 *   when: 'POST /api/v1/contacts with valid contact data',
 *   then: 'return 201 and the created contact with id',
 *   testData: {
 *     email: 'john@example.com',
 *     firstName: 'John',
 *     lastName: 'Doe'
 *   },
 *   expectedResult: {
 *     status: 201,
 *     fields: ['id', 'email', 'firstName', 'lastName', 'createdAt']
 *   }
 * };
 * ```
 */
export interface TestScenario {
  /** Nazwa scenariusza */
  name: string;
  /** Warunki początkowe (Given) */
  given: string;
  /** Akcja (When) */
  when: string;
  /** Oczekiwany rezultat (Then) */
  then: string;
  /** Dane testowe */
  testData?: Record<string, any>;
  /** Oczekiwany wynik */
  expectedResult?: ExpectedResult;
}

/**
 * Specyfikacja testów do wygenerowania
 * 
 * @example
 * ```typescript
 * const contactApiTests: TestSpecification = {
 *   name: 'Contact API Tests',
 *   type: 'api',
 *   target: 'Contact',
 *   scenarios: [
 *     { name: 'should list all contacts', ... },
 *     { name: 'should create a new contact', ... },
 *     { name: 'should return 400 for invalid email', ... }
 *   ]
 * };
 * ```
 */
export interface TestSpecification {
  /** Nazwa zestawu testów */
  name: string;
  /** Typ testów */
  type: TestType;
  /** Cel testów (encja lub endpoint) */
  target: string;
  /** Scenariusze testowe */
  scenarios: TestScenario[];
}

// ============================================================================
// STATIC ANALYSIS
// ============================================================================

/**
 * Reguła analizy statycznej
 */
export interface StaticAnalysisRule {
  /** Nazwa reguły (np. 'no-unused-vars') */
  name: string;
  /** Poziom błędu */
  severity: 'off' | 'warn' | 'error';
  /** Opcje reguły */
  options?: any[];
}

// ============================================================================
// QUALITY GATES
// ============================================================================

/**
 * Metryki jakości kodu
 */
export type QualityMetric =
  | 'test-coverage'
  | 'cyclomatic-complexity'
  | 'lines-of-code'
  | 'duplication-ratio'
  | 'type-coverage'
  | 'documentation-coverage';

/**
 * Operator porównania
 */
export type ComparisonOperator = '>' | '>=' | '<' | '<=' | '==';

/**
 * Bramka jakości
 * 
 * @example
 * ```typescript
 * const coverageGate: QualityGate = {
 *   name: 'Minimum test coverage',
 *   metric: 'test-coverage',
 *   threshold: 70,
 *   operator: '>='
 * };
 * ```
 */
export interface QualityGate {
  /** Nazwa bramki */
  name: string;
  /** Metryka do sprawdzenia */
  metric: QualityMetric;
  /** Próg wartości */
  threshold: number;
  /** Operator porównania */
  operator: ComparisonOperator;
}

// ============================================================================
// SECURITY CHECKS
// ============================================================================

/**
 * Typ sprawdzenia bezpieczeństwa
 */
export type SecurityCheckType =
  | 'no-hardcoded-secrets'
  | 'no-sql-injection'
  | 'no-xss'
  | 'https-only'
  | 'input-validation'
  | 'auth-required'
  | 'rate-limiting'
  | 'custom';

/**
 * Sprawdzenie bezpieczeństwa
 * 
 * @example
 * ```typescript
 * const noSecretsCheck: SecurityCheck = {
 *   type: 'no-hardcoded-secrets',
 *   severity: 'error',
 *   description: 'No API keys or passwords in source code'
 * };
 * ```
 */
export interface SecurityCheck {
  /** Typ sprawdzenia */
  type: SecurityCheckType;
  /** Poziom błędu */
  severity: 'error' | 'warning';
  /** Opis sprawdzenia */
  description?: string;
  /** Konfiguracja (dla custom) */
  config?: Record<string, any>;
}

// ============================================================================
// CUSTOM ACCEPTANCE CRITERION
// ============================================================================

/**
 * Niestandardowe kryterium akceptacji
 */
export interface CustomCriterion {
  /** Nazwa kryterium */
  name: string;
  /** Opis kryterium */
  description: string;
  /** Funkcja walidująca (nazwa) */
  validator: string;
  /** Konfiguracja */
  config?: Record<string, any>;
}

// ============================================================================
// ACCEPTANCE CRITERIA
// ============================================================================

/**
 * Kryteria akceptacji - definiują KIEDY kod jest gotowy
 * 
 * @example
 * ```typescript
 * const crmAcceptance: AcceptanceCriteria = {
 *   testsPass: true,
 *   minCoverage: 70,
 *   maxLintErrors: 0,
 *   maxResponseTime: 500,
 *   securityChecks: [
 *     { type: 'no-hardcoded-secrets', severity: 'error' },
 *     { type: 'input-validation', severity: 'error' }
 *   ],
 *   custom: []
 * };
 * ```
 */
export interface AcceptanceCriteria {
  /** Wszystkie testy muszą przejść */
  testsPass: boolean;
  /** Minimalne pokrycie kodu testami (%) */
  minCoverage: number;
  /** Maksymalna liczba błędów lintingu */
  maxLintErrors: number;
  /** Maksymalny czas odpowiedzi API (ms) */
  maxResponseTime: number;
  /** Wymagane sprawdzenia bezpieczeństwa */
  securityChecks: SecurityCheck[];
  /** Niestandardowe kryteria */
  custom: CustomCriterion[];
}

// ============================================================================
// VALIDATION LAYER
// ============================================================================

/**
 * Layer 3: Validation - definiuje JAK SPRAWDZAĆ i KIEDY kod jest gotowy
 * 
 * @example
 * ```typescript
 * const crmValidation: ValidationLayer = {
 *   assertions: [
 *     { id: 'A001', description: 'Server exists', check: { type: 'file-exists', path: 'api/src/server.ts' }, ... }
 *   ],
 *   tests: [
 *     { name: 'Contact API Tests', type: 'api', target: 'Contact', scenarios: [...] }
 *   ],
 *   staticRules: [
 *     { name: 'no-unused-vars', severity: 'error' }
 *   ],
 *   qualityGates: [
 *     { name: 'Coverage', metric: 'test-coverage', threshold: 70, operator: '>=' }
 *   ],
 *   acceptance: {
 *     testsPass: true,
 *     minCoverage: 70,
 *     maxLintErrors: 0,
 *     maxResponseTime: 500,
 *     securityChecks: [...],
 *     custom: []
 *   }
 * };
 * ```
 */
export interface ValidationLayer {
  /** Asercje które kod musi spełniać */
  assertions: CodeAssertion[];
  /** Specyfikacje testów */
  tests: TestSpecification[];
  /** Reguły analizy statycznej */
  staticRules: StaticAnalysisRule[];
  /** Bramki jakości */
  qualityGates: QualityGate[];
  /** Kryteria akceptacji */
  acceptance: AcceptanceCriteria;
}
