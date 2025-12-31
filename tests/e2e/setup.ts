/**
 * E2E Test Setup
 * 
 * Initializes test environment with mock services
 * and test data for end-to-end testing.
 */

import { InMemoryEventStore } from '../../core/eventstore';
import { CQRSContainer, InMemoryReadModel } from '../../core/cqrs';
import { ExecutionPlanner, GraphExecutor } from '../../core/planner';
import { VerificationEngine } from '../../core/verification';
import { AIContractEnforcer, DEFAULT_AI_CONTRACT } from '../../core/ai-contract';
import { generateSeedData, Customer, Contractor, RiskEvent } from '../../modules/mock';

// ============================================================================
// TEST CONTEXT
// ============================================================================

export interface TestContext {
  eventStore: InMemoryEventStore;
  cqrs: CQRSContainer;
  planner: ExecutionPlanner;
  executor: GraphExecutor;
  verification: VerificationEngine;
  aiContract: AIContractEnforcer;
  readModels: {
    customers: InMemoryReadModel<Customer>;
    contractors: InMemoryReadModel<Contractor>;
    riskEvents: InMemoryReadModel<RiskEvent>;
  };
  seedData: {
    customers: Customer[];
    contractors: Contractor[];
    riskEvents: RiskEvent[];
  };
}

let testContext: TestContext | null = null;

// ============================================================================
// SETUP & TEARDOWN
// ============================================================================

export async function setupTestContext(): Promise<TestContext> {
  // Create services
  const eventStore = new InMemoryEventStore();
  const cqrs = new CQRSContainer(eventStore);
  const planner = new ExecutionPlanner();
  const executor = new GraphExecutor();
  const verification = new VerificationEngine();
  const aiContract = new AIContractEnforcer(DEFAULT_AI_CONTRACT);

  // Create read models
  const readModels = {
    customers: new InMemoryReadModel<Customer>('customers'),
    contractors: new InMemoryReadModel<Contractor>('contractors'),
    riskEvents: new InMemoryReadModel<RiskEvent>('riskEvents')
  };

  // Register read models
  cqrs.readModels.register(readModels.customers);
  cqrs.readModels.register(readModels.contractors);
  cqrs.readModels.register(readModels.riskEvents);

  // Generate seed data
  const seedData = generateSeedData({
    customers: 10,
    contractors: 5,
    eventsPerEntity: 2
  });

  // Populate read models
  for (const customer of seedData.customers) {
    await readModels.customers.set(customer.customerId, customer);
  }
  for (const contractor of seedData.contractors) {
    await readModels.contractors.set(contractor.contractorId, contractor);
  }
  for (const event of seedData.riskEvents) {
    await readModels.riskEvents.set(event.id, event);
  }

  testContext = {
    eventStore,
    cqrs,
    planner,
    executor,
    verification,
    aiContract,
    readModels,
    seedData
  };

  return testContext;
}

export async function teardownTestContext(): Promise<void> {
  if (testContext) {
    await testContext.eventStore.clear();
    await testContext.readModels.customers.clear();
    await testContext.readModels.contractors.clear();
    await testContext.readModels.riskEvents.clear();
    testContext = null;
  }
}

export function getTestContext(): TestContext {
  if (!testContext) {
    throw new Error('Test context not initialized. Call setupTestContext() first.');
  }
  return testContext;
}

// ============================================================================
// JEST HOOKS
// ============================================================================

beforeAll(async () => {
  await setupTestContext();
});

afterAll(async () => {
  await teardownTestContext();
});

beforeEach(async () => {
  // Reset state between tests if needed
});

// ============================================================================
// TEST UTILITIES
// ============================================================================

export async function waitFor(
  condition: () => Promise<boolean>,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  throw new Error(`Condition not met within ${timeout}ms`);
}

export function expectEventually<T>(
  getValue: () => Promise<T>,
  matcher: (value: T) => boolean,
  timeout: number = 5000
): Promise<void> {
  return waitFor(async () => matcher(await getValue()), timeout);
}

// ============================================================================
// MOCK DSL PROGRAMS
// ============================================================================

export const TEST_DSL_PROGRAMS = {
  simpleEntity: `
ENTITY TestCustomer {
  FIELD id: UUID @generated
  FIELD name: String @required
  FIELD email: Email @unique
}
  `.trim(),

  entityWithEvent: `
ENTITY Customer {
  FIELD id: UUID @generated
  FIELD name: String @required
  FIELD status: String @enum("pending", "active") = "pending"
}

EVENT CustomerCreated {
  customerId: UUID
  name: String
  timestamp: DateTime
}
  `.trim(),

  fullOnboarding: `
ENTITY Customer {
  FIELD id: UUID @generated
  FIELD name: String @required
  FIELD nip: String @unique @pattern("[0-9]{10}")
  FIELD status: String @enum("pending", "verified", "rejected") = "pending"
  FIELD riskScore: Int @min(0) @max(100) = 50
}

EVENT CustomerRegistered {
  customerId: UUID
  name: String
  nip: String
  timestamp: DateTime
}

EVENT CustomerVerified {
  customerId: UUID
  verifiedBy: String
  timestamp: DateTime
}

PIPELINE OnboardingVerification {
  INPUT customers.pending
  TRANSFORM validate, enrich
  OUTPUT dashboard
}

ALERT "Pending Too Long" {
  ENTITY Customer
  CONDITION status == "pending"
  TARGET email
  SEVERITY medium
}

DASHBOARD "Onboarding Overview" {
  ENTITY Customer
  METRICS totalCount, pendingCount
  STREAM real_time
}
  `.trim(),

  monitoring: `
ENTITY Contractor {
  FIELD id: UUID @generated
  FIELD name: String @required
  FIELD riskScore: Int = 50
  FIELD status: String = "active"
}

PIPELINE RiskMonitoring {
  INPUT contractors.active
  TRANSFORM fetchFinancials, calculateRisk
  OUTPUT alerts, dashboard
  SCHEDULE "0 6 * * *"
}

ALERT "High Risk Contractor" {
  ENTITY Contractor
  CONDITION riskScore > 80
  TARGET email, slack
  SEVERITY high
}
  `.trim(),

  withDevice: `
ENTITY Alert {
  FIELD id: UUID @generated
  FIELD message: String
  FIELD severity: String
}

DEVICE "status-display" {
  TYPE led_matrix
  PROTOCOL mqtt
  TOPIC "alerts/display"
  SUBSCRIBE Alert.critical
}
  `.trim()
};

// ============================================================================
// ASSERTIONS
// ============================================================================

export function assertValidParseResult(result: any): void {
  expect(result.success).toBe(true);
  expect(result.ast).toBeDefined();
  expect(result.ast.type).toBe('Program');
  expect(Array.isArray(result.ast.statements)).toBe(true);
}

export function assertValidationPassed(result: any): void {
  expect(result.valid).toBe(true);
  expect(result.errors).toHaveLength(0);
}

export function assertExecutionSuccess(result: any): void {
  expect(result.success).toBe(true);
  expect(result.errors).toHaveLength(0);
}
