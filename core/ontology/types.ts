/**
 * Reclapp Ontology & Causal Model Types
 * 
 * Semantic layer for understanding domain concepts,
 * relationships, and causal dependencies.
 */

// ============================================================================
// ONTOLOGY TYPES
// ============================================================================

export interface Concept {
  name: string;
  description?: string;
  isA: string[];                      // Inheritance hierarchy
  properties: ConceptProperty[];
  relations: ConceptRelation[];
  influences: Influence[];
}

export interface ConceptProperty {
  name: string;
  type: string;
  description?: string;
  constraints?: PropertyConstraint[];
}

export interface PropertyConstraint {
  type: 'range' | 'pattern' | 'enum' | 'required';
  value: any;
}

export interface ConceptRelation {
  name: string;
  type: RelationType;
  target: string;
  cardinality: Cardinality;
  description?: string;
}

export type RelationType = 
  | 'has'           // Composition
  | 'references'    // Association
  | 'depends_on'    // Dependency
  | 'extends'       // Inheritance
  | 'contains'      // Aggregation
  | 'triggers'      // Event causation
  | 'produces';     // Output relation

export type Cardinality = '1' | '0..1' | '1..*' | '0..*';

export interface Influence {
  source: string;           // Property or concept
  weight: number;           // -1.0 to 1.0
  mechanism?: string;       // Description of how influence works
  conditions?: string[];    // Conditions under which influence applies
}

// ============================================================================
// CAUSAL MODEL TYPES
// ============================================================================

export interface CausalModel {
  name: string;
  description?: string;
  nodes: CausalNode[];
  edges: CausalEdge[];
  interventions: Intervention[];
  observations: Observation[];
}

export interface CausalNode {
  id: string;
  name: string;
  type: CausalNodeType;
  domain?: string[];        // Possible values
  description?: string;
}

export type CausalNodeType = 
  | 'variable'      // Observable variable
  | 'latent'        // Hidden variable
  | 'intervention'  // Controllable intervention point
  | 'outcome';      // Target outcome

export interface CausalEdge {
  from: string;
  to: string;
  strength: number;         // Effect size (-1.0 to 1.0)
  mechanism?: string;       // Causal mechanism description
  confidence: number;       // Confidence in this relationship (0-1)
  conditions?: string[];    // When this edge is active
}

export interface Intervention {
  id: string;
  name: string;
  description?: string;
  target: string;           // Node to intervene on
  action: InterventionAction;
  expectedEffects: ExpectedEffect[];
  cost?: number;            // Cost/effort of intervention
  constraints?: string[];   // Conditions for valid intervention
}

export interface InterventionAction {
  type: 'set' | 'increase' | 'decrease' | 'toggle';
  value?: any;
  amount?: number;
}

export interface ExpectedEffect {
  target: string;           // Affected node
  direction: 'increase' | 'decrease' | 'stabilize';
  magnitude: number;        // Expected change (0-1 scale)
  confidence: number;       // Confidence in prediction
  timeframe?: string;       // Expected time to effect
}

export interface Observation {
  timestamp: Date;
  node: string;
  value: any;
  context?: Record<string, any>;
}

// ============================================================================
// SEMANTIC QUERY TYPES
// ============================================================================

export interface SemanticQuery {
  type: SemanticQueryType;
  subject?: string;
  predicate?: string;
  object?: string;
  constraints?: QueryConstraint[];
}

export type SemanticQueryType =
  | 'what_is'           // Definition query
  | 'how_related'       // Relationship query
  | 'why'               // Causal explanation
  | 'what_if'           // Intervention simulation
  | 'how_to'            // Action recommendation
  | 'what_affects'      // Influence query
  | 'what_depends_on';  // Dependency query

export interface QueryConstraint {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'contains' | 'matches';
  value: any;
}

export interface SemanticAnswer {
  query: SemanticQuery;
  answer: string;
  confidence: number;
  explanation?: CausalExplanation;
  evidence?: Evidence[];
  alternatives?: SemanticAnswer[];
}

export interface CausalExplanation {
  cause: string;
  effect: string;
  mechanism: string;
  path: CausalPath;
  confidence: number;
  counterfactual?: string;  // "If X had not happened, Y would not have occurred"
}

export interface CausalPath {
  nodes: string[];
  edges: CausalEdge[];
  totalStrength: number;
}

export interface Evidence {
  type: 'observation' | 'rule' | 'inference';
  source: string;
  content: string;
  confidence: number;
}

// ============================================================================
// DOMAIN ONTOLOGY (Pre-defined for B2B)
// ============================================================================

export const B2B_ONTOLOGY: Concept[] = [
  {
    name: 'BusinessEntity',
    isA: [],
    properties: [
      { name: 'id', type: 'UUID', constraints: [{ type: 'required', value: true }] },
      { name: 'name', type: 'String', constraints: [{ type: 'required', value: true }] },
      { name: 'status', type: 'String' },
      { name: 'createdAt', type: 'DateTime' }
    ],
    relations: [],
    influences: []
  },
  {
    name: 'Customer',
    isA: ['BusinessEntity'],
    properties: [
      { name: 'nip', type: 'String', constraints: [{ type: 'pattern', value: '[0-9]{10}' }] },
      { name: 'segment', type: 'String', constraints: [{ type: 'enum', value: ['enterprise', 'sme', 'startup'] }] },
      { name: 'riskScore', type: 'Int', constraints: [{ type: 'range', value: { min: 0, max: 100 } }] },
      { name: 'creditLimit', type: 'Money' }
    ],
    relations: [
      { name: 'orders', type: 'has', target: 'Order', cardinality: '0..*' },
      { name: 'riskEvents', type: 'has', target: 'RiskEvent', cardinality: '0..*' }
    ],
    influences: [
      { source: 'financialHealth.profitMargin', weight: -0.3, mechanism: 'Higher profit margin indicates lower risk' },
      { source: 'paymentHistory.avgDelayDays', weight: 0.4, mechanism: 'Payment delays increase risk' },
      { source: 'marketConditions.sectorRisk', weight: 0.2, mechanism: 'Sector-wide risk affects individual entities' }
    ]
  },
  {
    name: 'Contractor',
    isA: ['BusinessEntity'],
    properties: [
      { name: 'category', type: 'String' },
      { name: 'rating', type: 'Float', constraints: [{ type: 'range', value: { min: 0, max: 10 } }] },
      { name: 'riskScore', type: 'Int', constraints: [{ type: 'range', value: { min: 0, max: 100 } }] }
    ],
    relations: [
      { name: 'contracts', type: 'has', target: 'Contract', cardinality: '0..*' },
      { name: 'riskEvents', type: 'has', target: 'RiskEvent', cardinality: '0..*' }
    ],
    influences: [
      { source: 'financialHealth.revenue', weight: -0.25 },
      { source: 'legalStatus.activeCases', weight: 0.35 },
      { source: 'boardStability', weight: -0.2 }
    ]
  },
  {
    name: 'RiskEvent',
    isA: [],
    properties: [
      { name: 'eventType', type: 'String' },
      { name: 'severity', type: 'String', constraints: [{ type: 'enum', value: ['low', 'medium', 'high', 'critical'] }] },
      { name: 'resolved', type: 'Boolean' }
    ],
    relations: [
      { name: 'entity', type: 'references', target: 'BusinessEntity', cardinality: '1' },
      { name: 'triggers', type: 'triggers', target: 'Alert', cardinality: '0..*' }
    ],
    influences: []
  },
  {
    name: 'FinancialHealth',
    isA: [],
    properties: [
      { name: 'revenue', type: 'Money' },
      { name: 'profit', type: 'Money' },
      { name: 'profitMargin', type: 'Float' },
      { name: 'debtRatio', type: 'Float' }
    ],
    relations: [],
    influences: [
      { source: 'marketConditions', weight: 0.3 },
      { source: 'managementQuality', weight: 0.4 }
    ]
  }
];

export const B2B_CAUSAL_MODEL: CausalModel = {
  name: 'B2B Risk Model',
  description: 'Causal model for B2B customer and contractor risk assessment',
  nodes: [
    { id: 'market', name: 'Market Conditions', type: 'variable' },
    { id: 'financial', name: 'Financial Health', type: 'variable' },
    { id: 'payment', name: 'Payment Behavior', type: 'variable' },
    { id: 'legal', name: 'Legal Status', type: 'variable' },
    { id: 'board', name: 'Board Stability', type: 'variable' },
    { id: 'risk', name: 'Risk Score', type: 'outcome' },
    { id: 'alert', name: 'Alert Triggered', type: 'outcome' }
  ],
  edges: [
    { from: 'market', to: 'financial', strength: 0.4, confidence: 0.8 },
    { from: 'financial', to: 'payment', strength: 0.5, confidence: 0.85 },
    { from: 'financial', to: 'risk', strength: -0.3, confidence: 0.9 },
    { from: 'payment', to: 'risk', strength: 0.4, confidence: 0.9 },
    { from: 'legal', to: 'risk', strength: 0.35, confidence: 0.85 },
    { from: 'board', to: 'financial', strength: 0.3, confidence: 0.7 },
    { from: 'risk', to: 'alert', strength: 0.9, confidence: 0.95, conditions: ['risk > 80'] }
  ],
  interventions: [
    {
      id: 'improve-terms',
      name: 'Improve Payment Terms',
      target: 'payment',
      action: { type: 'decrease', amount: 0.2 },
      expectedEffects: [
        { target: 'risk', direction: 'decrease', magnitude: 0.1, confidence: 0.75 }
      ]
    },
    {
      id: 'require-guarantee',
      name: 'Require Bank Guarantee',
      target: 'risk',
      action: { type: 'decrease', amount: 0.25 },
      expectedEffects: [
        { target: 'risk', direction: 'decrease', magnitude: 0.25, confidence: 0.9 }
      ],
      cost: 500
    }
  ],
  observations: []
};
