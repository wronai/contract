/**
 * Reclapp Mock Data Generators
 * 
 * Generates realistic mock data for B2B scenarios:
 * - Customer onboarding
 * - Contractor monitoring
 * - Financial reporting
 */

// ============================================================================
// TYPES
// ============================================================================

export interface Company {
  id: string;
  name: string;
  nip: string;
  krs?: string;
  regon: string;
  address: Address;
  status: CompanyStatus;
  createdAt: Date;
  financials?: FinancialData;
  riskScore?: number;
  board?: BoardMember[];
}

export interface Address {
  street: string;
  city: string;
  postalCode: string;
  country: string;
}

export type CompanyStatus = 'active' | 'suspended' | 'liquidation' | 'bankrupt' | 'unknown';

export interface FinancialData {
  revenue: number;
  profit: number;
  assets: number;
  liabilities: number;
  employees: number;
  year: number;
}

export interface BoardMember {
  name: string;
  role: string;
  since: Date;
}

export interface Customer extends Company {
  customerId: string;
  segment: 'enterprise' | 'sme' | 'startup';
  onboardingStatus: 'pending' | 'verified' | 'rejected';
  creditLimit?: number;
  paymentTerms?: number;
}

export interface Contractor extends Company {
  contractorId: string;
  category: string;
  rating: number;
  lastOrderDate?: Date;
  totalOrders: number;
  totalValue: number;
}

export interface RiskEvent {
  id: string;
  entityId: string;
  entityType: 'customer' | 'contractor';
  eventType: RiskEventType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  timestamp: Date;
  resolved: boolean;
}

export type RiskEventType = 
  | 'financial_decline'
  | 'board_change'
  | 'legal_issue'
  | 'payment_delay'
  | 'credit_downgrade'
  | 'address_change'
  | 'status_change';

// ============================================================================
// DATA POOLS
// ============================================================================

const POLISH_FIRST_NAMES = [
  'Jan', 'Piotr', 'Andrzej', 'Krzysztof', 'Tomasz', 'Paweł', 'Michał', 'Marcin',
  'Anna', 'Maria', 'Katarzyna', 'Małgorzata', 'Agnieszka', 'Barbara', 'Ewa', 'Joanna'
];

const POLISH_LAST_NAMES = [
  'Nowak', 'Kowalski', 'Wiśniewski', 'Wójcik', 'Kowalczyk', 'Kamiński', 'Lewandowski',
  'Zieliński', 'Szymański', 'Woźniak', 'Dąbrowski', 'Kozłowski', 'Jankowski', 'Mazur'
];

const POLISH_CITIES = [
  { city: 'Warszawa', postalPrefix: '00' },
  { city: 'Kraków', postalPrefix: '30' },
  { city: 'Wrocław', postalPrefix: '50' },
  { city: 'Poznań', postalPrefix: '60' },
  { city: 'Gdańsk', postalPrefix: '80' },
  { city: 'Łódź', postalPrefix: '90' },
  { city: 'Szczecin', postalPrefix: '70' },
  { city: 'Katowice', postalPrefix: '40' }
];

const STREET_NAMES = [
  'Marszałkowska', 'Piłsudskiego', 'Mickiewicza', 'Kościuszki', 'Sienkiewicza',
  'Słowackiego', 'Krakowska', 'Warszawska', 'Gdańska', 'Poznańska'
];

const COMPANY_TYPES = [
  'Sp. z o.o.', 'S.A.', 'Sp.k.', 'Sp.j.', 'P.P.H.U.'
];

const INDUSTRY_PREFIXES = [
  'Tech', 'Data', 'Cloud', 'Digital', 'Smart', 'Pro', 'Net', 'Sys', 'Info', 'Cyber'
];

const INDUSTRY_SUFFIXES = [
  'Solutions', 'Systems', 'Group', 'Partners', 'Consulting', 'Labs', 'Works', 'Hub'
];

const CATEGORIES = [
  'IT Services', 'Manufacturing', 'Logistics', 'Marketing', 'Consulting',
  'Finance', 'Healthcare', 'Construction', 'Retail', 'Energy'
];

// ============================================================================
// GENERATORS
// ============================================================================

export class MockDataGenerator {
  private idCounter = 0;

  // Generate unique ID
  generateId(prefix: string = ''): string {
    this.idCounter++;
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `${prefix}${timestamp}${random}${this.idCounter}`;
  }

  // Generate NIP (Polish Tax ID)
  generateNIP(): string {
    const digits = Array.from({ length: 10 }, () => Math.floor(Math.random() * 10));
    // Simplified - real NIP has checksum
    return digits.join('');
  }

  // Generate KRS number
  generateKRS(): string {
    return String(Math.floor(Math.random() * 900000000) + 100000000).padStart(10, '0');
  }

  // Generate REGON
  generateREGON(): string {
    return String(Math.floor(Math.random() * 900000000) + 100000000);
  }

  // Generate Polish address
  generateAddress(): Address {
    const cityData = this.randomElement(POLISH_CITIES);
    const streetNumber = Math.floor(Math.random() * 200) + 1;
    const postalSuffix = String(Math.floor(Math.random() * 999)).padStart(3, '0');

    return {
      street: `ul. ${this.randomElement(STREET_NAMES)} ${streetNumber}`,
      city: cityData.city,
      postalCode: `${cityData.postalPrefix}-${postalSuffix}`,
      country: 'Polska'
    };
  }

  // Generate company name
  generateCompanyName(): string {
    const prefix = this.randomElement(INDUSTRY_PREFIXES);
    const suffix = this.randomElement(INDUSTRY_SUFFIXES);
    const type = this.randomElement(COMPANY_TYPES);
    return `${prefix}${suffix} ${type}`;
  }

  // Generate person name
  generatePersonName(): string {
    return `${this.randomElement(POLISH_FIRST_NAMES)} ${this.randomElement(POLISH_LAST_NAMES)}`;
  }

  // Generate board members
  generateBoard(count: number = 3): BoardMember[] {
    const roles = ['Prezes Zarządu', 'Wiceprezes', 'Członek Zarządu', 'Dyrektor Finansowy'];
    return Array.from({ length: count }, (_, i) => ({
      name: this.generatePersonName(),
      role: roles[Math.min(i, roles.length - 1)],
      since: this.randomDate(new Date(2015, 0, 1), new Date())
    }));
  }

  // Generate financial data
  generateFinancials(scale: 'small' | 'medium' | 'large' = 'medium'): FinancialData {
    const multipliers = { small: 1, medium: 10, large: 100 };
    const m = multipliers[scale];

    const revenue = Math.floor(Math.random() * 10000000 * m) + 100000 * m;
    const profitMargin = (Math.random() * 0.3) - 0.05; // -5% to 25%
    const profit = Math.floor(revenue * profitMargin);
    const assets = Math.floor(revenue * (0.5 + Math.random()));
    const liabilities = Math.floor(assets * (0.3 + Math.random() * 0.5));

    return {
      revenue,
      profit,
      assets,
      liabilities,
      employees: Math.floor(Math.random() * 500 * m) + 5,
      year: new Date().getFullYear() - 1
    };
  }

  // Generate risk score (0-100)
  generateRiskScore(): number {
    // Weighted towards lower risk
    const base = Math.random();
    return Math.floor(Math.pow(base, 0.7) * 100);
  }

  // Generate company status
  generateStatus(): CompanyStatus {
    const rand = Math.random();
    if (rand < 0.85) return 'active';
    if (rand < 0.92) return 'suspended';
    if (rand < 0.97) return 'liquidation';
    if (rand < 0.99) return 'bankrupt';
    return 'unknown';
  }

  // Generate full company
  generateCompany(options?: { scale?: 'small' | 'medium' | 'large' }): Company {
    const status = this.generateStatus();
    return {
      id: this.generateId('comp_'),
      name: this.generateCompanyName(),
      nip: this.generateNIP(),
      krs: Math.random() > 0.3 ? this.generateKRS() : undefined,
      regon: this.generateREGON(),
      address: this.generateAddress(),
      status,
      createdAt: this.randomDate(new Date(2000, 0, 1), new Date()),
      financials: status === 'active' ? this.generateFinancials(options?.scale) : undefined,
      riskScore: this.generateRiskScore(),
      board: this.generateBoard(Math.floor(Math.random() * 3) + 2)
    };
  }

  // Generate customer
  generateCustomer(options?: { segment?: 'enterprise' | 'sme' | 'startup' }): Customer {
    const company = this.generateCompany({
      scale: options?.segment === 'enterprise' ? 'large' : 
             options?.segment === 'sme' ? 'medium' : 'small'
    });
    
    const segment = options?.segment || this.randomElement(['enterprise', 'sme', 'startup'] as const);
    const creditLimits = { enterprise: 1000000, sme: 100000, startup: 10000 };

    return {
      ...company,
      customerId: this.generateId('cust_'),
      segment,
      onboardingStatus: this.randomElement(['pending', 'verified', 'rejected'] as const),
      creditLimit: creditLimits[segment] * (0.5 + Math.random()),
      paymentTerms: this.randomElement([14, 30, 45, 60])
    };
  }

  // Generate contractor
  generateContractor(): Contractor {
    const company = this.generateCompany();
    const totalOrders = Math.floor(Math.random() * 100);

    return {
      ...company,
      contractorId: this.generateId('cont_'),
      category: this.randomElement(CATEGORIES),
      rating: Math.floor(Math.random() * 50 + 50) / 10, // 5.0 - 10.0
      lastOrderDate: totalOrders > 0 ? this.randomDate(new Date(2023, 0, 1), new Date()) : undefined,
      totalOrders,
      totalValue: totalOrders * (Math.random() * 50000 + 1000)
    };
  }

  // Generate risk event
  generateRiskEvent(entityId: string, entityType: 'customer' | 'contractor'): RiskEvent {
    const eventTypes: RiskEventType[] = [
      'financial_decline', 'board_change', 'legal_issue',
      'payment_delay', 'credit_downgrade', 'address_change', 'status_change'
    ];

    const descriptions: Record<RiskEventType, string[]> = {
      financial_decline: ['Revenue dropped 20%', 'Profit margin decreased', 'Cash flow issues detected'],
      board_change: ['CEO resigned', 'New board member appointed', 'CFO changed'],
      legal_issue: ['Court case filed', 'Regulatory investigation', 'License suspended'],
      payment_delay: ['Invoice overdue 30 days', 'Payment terms violated', 'Collection initiated'],
      credit_downgrade: ['Credit rating lowered', 'Credit limit reduced', 'Insurance declined'],
      address_change: ['Registered address changed', 'Office relocated', 'Multiple address changes'],
      status_change: ['Company status changed', 'Suspension notice', 'Liquidation announced']
    };

    const eventType = this.randomElement(eventTypes);
    const severity = this.randomElement(['low', 'medium', 'high', 'critical'] as const);

    return {
      id: this.generateId('risk_'),
      entityId,
      entityType,
      eventType,
      severity,
      description: this.randomElement(descriptions[eventType]),
      timestamp: this.randomDate(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), new Date()),
      resolved: Math.random() > 0.3
    };
  }

  // Batch generators
  generateCustomers(count: number): Customer[] {
    return Array.from({ length: count }, () => this.generateCustomer());
  }

  generateContractors(count: number): Contractor[] {
    return Array.from({ length: count }, () => this.generateContractor());
  }

  generateRiskEvents(entities: { id: string; type: 'customer' | 'contractor' }[], eventsPerEntity: number = 3): RiskEvent[] {
    return entities.flatMap(entity =>
      Array.from({ length: Math.floor(Math.random() * eventsPerEntity) + 1 }, () =>
        this.generateRiskEvent(entity.id, entity.type)
      )
    );
  }

  // Utility methods
  private randomElement<T>(array: readonly T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  private randomDate(start: Date, end: Date): Date {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  }
}

// ============================================================================
// SEED DATA GENERATOR
// ============================================================================

export interface SeedData {
  customers: Customer[];
  contractors: Contractor[];
  riskEvents: RiskEvent[];
}

export function generateSeedData(options?: {
  customers?: number;
  contractors?: number;
  eventsPerEntity?: number;
}): SeedData {
  const generator = new MockDataGenerator();
  
  const customerCount = options?.customers || 20;
  const contractorCount = options?.contractors || 15;
  const eventsPerEntity = options?.eventsPerEntity || 3;

  const customers = generator.generateCustomers(customerCount);
  const contractors = generator.generateContractors(contractorCount);

  const entities = [
    ...customers.map(c => ({ id: c.customerId, type: 'customer' as const })),
    ...contractors.map(c => ({ id: c.contractorId, type: 'contractor' as const }))
  ];

  const riskEvents = generator.generateRiskEvents(entities, eventsPerEntity);

  return { customers, contractors, riskEvents };
}

// ============================================================================
// EVENT GENERATORS (for Event Sourcing)
// ============================================================================

export interface DomainEvent {
  type: string;
  aggregateId: string;
  data: Record<string, any>;
  metadata: { timestamp: Date; version: number };
}

export function customerToEvents(customer: Customer): DomainEvent[] {
  const events: DomainEvent[] = [];
  let version = 0;

  // CustomerRegistered event
  events.push({
    type: 'CustomerRegistered',
    aggregateId: customer.customerId,
    data: {
      customerId: customer.customerId,
      name: customer.name,
      nip: customer.nip,
      krs: customer.krs,
      regon: customer.regon,
      address: customer.address,
      segment: customer.segment
    },
    metadata: { timestamp: customer.createdAt, version: ++version }
  });

  // CustomerVerified or CustomerRejected
  if (customer.onboardingStatus !== 'pending') {
    events.push({
      type: customer.onboardingStatus === 'verified' ? 'CustomerVerified' : 'CustomerRejected',
      aggregateId: customer.customerId,
      data: { customerId: customer.customerId },
      metadata: { 
        timestamp: new Date(customer.createdAt.getTime() + 86400000), 
        version: ++version 
      }
    });
  }

  // CreditLimitSet
  if (customer.creditLimit) {
    events.push({
      type: 'CreditLimitSet',
      aggregateId: customer.customerId,
      data: { 
        customerId: customer.customerId,
        creditLimit: customer.creditLimit,
        paymentTerms: customer.paymentTerms
      },
      metadata: { 
        timestamp: new Date(customer.createdAt.getTime() + 172800000),
        version: ++version 
      }
    });
  }

  return events;
}

export function riskEventToDomainEvent(riskEvent: RiskEvent): DomainEvent {
  return {
    type: 'RiskEventDetected',
    aggregateId: riskEvent.entityId,
    data: {
      riskEventId: riskEvent.id,
      entityId: riskEvent.entityId,
      entityType: riskEvent.entityType,
      eventType: riskEvent.eventType,
      severity: riskEvent.severity,
      description: riskEvent.description
    },
    metadata: { timestamp: riskEvent.timestamp, version: 1 }
  };
}
