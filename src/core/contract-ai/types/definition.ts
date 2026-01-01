/**
 * Contract AI - Layer 1: Definition Types (CO)
 * 
 * Definiuje STRUKTURĘ aplikacji - encje, eventy, workflow, API.
 * 
 * @version 2.2.0
 * @see todo/14-reclapp-llm-code-generation-spec.md
 */

// ============================================================================
// FIELD TYPES
// ============================================================================

/**
 * Podstawowe typy pól obsługiwane przez Contract AI
 */
export type BasicFieldType = 
  | 'String'
  | 'Int'
  | 'Float'
  | 'Boolean'
  | 'UUID'
  | 'DateTime';

/**
 * Rozszerzone typy pól z walidacją
 */
export type ExtendedFieldType =
  | 'Email'
  | 'URL'
  | 'Phone'
  | 'Money'
  | 'JSON'
  | 'Text';

/**
 * Typy relacji między encjami
 */
export type RelationType =
  | 'OneToOne'
  | 'OneToMany'
  | 'ManyToOne'
  | 'ManyToMany';

/**
 * Wszystkie obsługiwane typy pól
 */
export type FieldType = BasicFieldType | ExtendedFieldType | string;

// ============================================================================
// FIELD ANNOTATIONS
// ============================================================================

/**
 * Adnotacje pola definiujące walidację i zachowanie
 * 
 * @example
 * ```typescript
 * const emailAnnotations: FieldAnnotations = {
 *   required: true,
 *   unique: true,
 *   pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'
 * };
 * ```
 */
export interface FieldAnnotations {
  /** Pole jest wymagane */
  required?: boolean;
  /** Wartość musi być unikalna */
  unique?: boolean;
  /** Wartość generowana automatycznie */
  generated?: boolean;
  /** Wartość domyślna */
  default?: any;
  /** Minimalna wartość (dla liczb) lub długość (dla stringów) */
  min?: number;
  /** Maksymalna wartość (dla liczb) lub długość (dla stringów) */
  max?: number;
  /** Wzorzec regex do walidacji */
  pattern?: string;
  /** Dozwolone wartości (enum) */
  enum?: string[];
  /** Nazwa relacji do innej encji */
  relation?: string;
  /** Opis pola */
  description?: string;
}

// ============================================================================
// FIELD DEFINITION
// ============================================================================

/**
 * Definicja pola encji
 * 
 * @example
 * ```typescript
 * const emailField: FieldDefinition = {
 *   name: 'email',
 *   type: 'Email',
 *   annotations: {
 *     required: true,
 *     unique: true
 *   }
 * };
 * ```
 */
export interface FieldDefinition {
  /** Nazwa pola */
  name: string;
  /** Typ pola */
  type: FieldType;
  /** Adnotacje pola */
  annotations?: FieldAnnotations;
}

// ============================================================================
// RELATION DEFINITION
// ============================================================================

/**
 * Definicja relacji między encjami
 * 
 * @example
 * ```typescript
 * const contactCompanyRelation: RelationDefinition = {
 *   name: 'company',
 *   type: 'ManyToOne',
 *   target: 'Company',
 *   foreignKey: 'companyId',
 *   onDelete: 'SET NULL'
 * };
 * ```
 */
export interface RelationDefinition {
  /** Nazwa relacji */
  name: string;
  /** Typ relacji */
  type: RelationType;
  /** Docelowa encja */
  target: string;
  /** Pole klucza obcego */
  foreignKey?: string;
  /** Akcja przy usunięciu */
  onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
  /** Akcja przy aktualizacji */
  onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
}

// ============================================================================
// ENTITY DEFINITION
// ============================================================================

/**
 * Definicja encji domenowej
 * 
 * @example
 * ```typescript
 * const contactEntity: EntityDefinition = {
 *   name: 'Contact',
 *   description: 'Customer contact information',
 *   fields: [
 *     { name: 'id', type: 'UUID', annotations: { generated: true } },
 *     { name: 'email', type: 'Email', annotations: { required: true, unique: true } },
 *     { name: 'firstName', type: 'String', annotations: { required: true } }
 *   ],
 *   relations: [
 *     { name: 'company', type: 'ManyToOne', target: 'Company' }
 *   ]
 * };
 * ```
 */
export interface EntityDefinition {
  /** Nazwa encji (PascalCase) */
  name: string;
  /** Opis encji */
  description?: string;
  /** Pola encji */
  fields: FieldDefinition[];
  /** Relacje do innych encji */
  relations?: RelationDefinition[];
  /** Indeksy bazy danych */
  indexes?: IndexDefinition[];
  /** Tagi dla kategoryzacji */
  tags?: string[];
}

/**
 * Definicja indeksu bazy danych
 */
export interface IndexDefinition {
  /** Nazwa indeksu */
  name: string;
  /** Pola w indeksie */
  fields: string[];
  /** Czy indeks jest unikalny */
  unique?: boolean;
}

// ============================================================================
// EVENT DEFINITION
// ============================================================================

/**
 * Definicja eventu domenowego
 * 
 * @example
 * ```typescript
 * const contactCreatedEvent: EventDefinition = {
 *   name: 'ContactCreated',
 *   description: 'Emitted when a new contact is created',
 *   fields: [
 *     { name: 'contactId', type: 'UUID', annotations: { required: true } },
 *     { name: 'email', type: 'Email', annotations: { required: true } }
 *   ],
 *   triggers: ['api.contact.create', 'import.contact']
 * };
 * ```
 */
export interface EventDefinition {
  /** Nazwa eventu (PascalCase) */
  name: string;
  /** Opis eventu */
  description?: string;
  /** Pola eventu */
  fields: FieldDefinition[];
  /** Wyzwalacze eventu */
  triggers?: string[];
  /** Encja źródłowa */
  sourceEntity?: string;
}

// ============================================================================
// WORKFLOW DEFINITION
// ============================================================================

/**
 * Typy kroków workflow
 */
export type WorkflowStepType =
  | 'action'
  | 'condition'
  | 'parallel'
  | 'loop'
  | 'wait'
  | 'notify'
  | 'transform'
  | 'validate';

/**
 * Definicja kroku workflow
 */
export interface WorkflowStepDefinition {
  /** ID kroku */
  id: string;
  /** Typ kroku */
  type: WorkflowStepType;
  /** Nazwa kroku */
  name: string;
  /** Opis kroku */
  description?: string;
  /** Konfiguracja kroku */
  config?: Record<string, any>;
  /** Następny krok (dla success) */
  next?: string;
  /** Krok przy błędzie */
  onError?: string;
  /** Warunek wykonania */
  condition?: string;
}

/**
 * Definicja workflow
 * 
 * @example
 * ```typescript
 * const onboardingWorkflow: WorkflowDefinition = {
 *   name: 'CustomerOnboarding',
 *   description: 'New customer onboarding process',
 *   trigger: 'ContactCreated',
 *   steps: [
 *     { id: 'verify', type: 'action', name: 'Verify Email', next: 'welcome' },
 *     { id: 'welcome', type: 'notify', name: 'Send Welcome Email' }
 *   ]
 * };
 * ```
 */
export interface WorkflowDefinition {
  /** Nazwa workflow */
  name: string;
  /** Opis workflow */
  description?: string;
  /** Wersja workflow */
  version?: string;
  /** Event wyzwalający */
  trigger?: string;
  /** Harmonogram (cron) */
  schedule?: string;
  /** Kroki workflow */
  steps: WorkflowStepDefinition[];
}

// ============================================================================
// API DEFINITION
// ============================================================================

/**
 * Operacje CRUD
 */
export type ApiOperation = 'list' | 'get' | 'create' | 'update' | 'delete';

/**
 * Definicja zasobu API
 */
export interface ApiResourceDefinition {
  /** Nazwa zasobu (kebab-case, plural) */
  name: string;
  /** Encja źródłowa */
  entity: string;
  /** Dostępne operacje */
  operations: ApiOperation[];
  /** Dodatkowe endpointy */
  customEndpoints?: ApiEndpointDefinition[];
}

/**
 * Definicja customowego endpointu
 */
export interface ApiEndpointDefinition {
  /** Metoda HTTP */
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Ścieżka (względna do zasobu) */
  path: string;
  /** Opis endpointu */
  description?: string;
  /** Schemat request body */
  requestBody?: Record<string, any>;
  /** Schemat response */
  response?: Record<string, any>;
}

/**
 * Definicja API
 * 
 * @example
 * ```typescript
 * const crmApi: ApiDefinition = {
 *   version: 'v1',
 *   prefix: '/api/v1',
 *   resources: [
 *     { name: 'contacts', entity: 'Contact', operations: ['list', 'get', 'create', 'update', 'delete'] },
 *     { name: 'companies', entity: 'Company', operations: ['list', 'get', 'create', 'update'] }
 *   ]
 * };
 * ```
 */
export interface ApiDefinition {
  /** Wersja API */
  version: string;
  /** Prefix URL */
  prefix: string;
  /** Zasoby API */
  resources: ApiResourceDefinition[];
  /** Autentykacja */
  authentication?: {
    type: 'jwt' | 'api-key' | 'oauth2' | 'none';
    config?: Record<string, any>;
  };
}

// ============================================================================
// APP DEFINITION
// ============================================================================

/**
 * Definicja aplikacji
 * 
 * @example
 * ```typescript
 * const crmApp: AppDefinition = {
 *   name: 'CRM System',
 *   version: '1.0.0',
 *   description: 'Customer Relationship Management System'
 * };
 * ```
 */
export interface AppDefinition {
  /** Nazwa aplikacji */
  name: string;
  /** Wersja aplikacji */
  version: string;
  /** Opis aplikacji */
  description?: string;
  /** Autor */
  author?: string;
  /** Licencja */
  license?: string;
}

// ============================================================================
// DEFINITION LAYER
// ============================================================================

/**
 * Layer 1: Definition - definiuje CO ma być zaimplementowane
 * 
 * @example
 * ```typescript
 * const crmDefinition: DefinitionLayer = {
 *   app: {
 *     name: 'CRM System',
 *     version: '1.0.0',
 *     description: 'Customer Relationship Management'
 *   },
 *   entities: [
 *     { name: 'Contact', fields: [...] },
 *     { name: 'Company', fields: [...] }
 *   ],
 *   api: {
 *     version: 'v1',
 *     prefix: '/api/v1',
 *     resources: [...]
 *   }
 * };
 * ```
 */
export interface DefinitionLayer {
  /** Definicja aplikacji */
  app: AppDefinition;
  /** Encje domenowe */
  entities: EntityDefinition[];
  /** Eventy domenowe */
  events?: EventDefinition[];
  /** Workflow */
  workflows?: WorkflowDefinition[];
  /** Definicja API */
  api?: ApiDefinition;
}
