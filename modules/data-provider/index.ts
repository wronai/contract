/**
 * Reclapp Data Provider
 * 
 * Loads data from JSON files or external APIs instead of generating mock data.
 * Supports multiple data sources: local JSON, REST APIs, and database connections.
 */

import fs from 'fs';
import path from 'path';

// ============================================================================
// TYPES
// ============================================================================

export interface Address {
  street: string;
  city: string;
  postalCode: string;
  country: string;
}

export interface Customer {
  customerId: string;
  name: string;
  nip: string;
  krs?: string;
  regon: string;
  address: Address;
  segment: 'enterprise' | 'sme' | 'startup';
  onboardingStatus: 'pending' | 'verified' | 'rejected';
  riskScore: number;
  creditLimit: number;
  paymentTerms: number;
  status: string;
  createdAt?: Date;
}

export interface Contractor {
  contractorId: string;
  name: string;
  nip: string;
  krs?: string;
  regon: string;
  address: Address;
  category: string;
  status: string;
  rating: number;
  riskScore: number;
  totalOrders: number;
  totalValue: number;
  createdAt?: Date;
}

export interface RiskEvent {
  id: string;
  entityId: string;
  entityType: 'customer' | 'contractor';
  eventType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  timestamp: Date;
  resolved: boolean;
}

export interface DataProviderConfig {
  dataDir?: string;
  customersUrl?: string;
  contractorsUrl?: string;
  riskEventsUrl?: string;
  useExternalApi?: boolean;
}

// ============================================================================
// DATA PROVIDER CLASS
// ============================================================================

export class DataProvider {
  private config: DataProviderConfig;
  private dataDir: string;

  constructor(config: DataProviderConfig = {}) {
    this.config = config;
    this.dataDir = config.dataDir || path.join(__dirname, '../../data');
  }

  /**
   * Load customers from JSON file or external API
   */
  async loadCustomers(): Promise<Customer[]> {
    if (this.config.useExternalApi && this.config.customersUrl) {
      return this.fetchFromApi<Customer[]>(this.config.customersUrl, 'customers');
    }
    return this.loadFromJson<Customer[]>('customers.json', 'customers');
  }

  /**
   * Load contractors from JSON file or external API
   */
  async loadContractors(): Promise<Contractor[]> {
    if (this.config.useExternalApi && this.config.contractorsUrl) {
      return this.fetchFromApi<Contractor[]>(this.config.contractorsUrl, 'contractors');
    }
    return this.loadFromJson<Contractor[]>('contractors.json', 'contractors');
  }

  /**
   * Load risk events from JSON file or external API
   */
  async loadRiskEvents(): Promise<RiskEvent[]> {
    if (this.config.useExternalApi && this.config.riskEventsUrl) {
      return this.fetchFromApi<RiskEvent[]>(this.config.riskEventsUrl, 'riskEvents');
    }
    const events = await this.loadFromJson<RiskEvent[]>('risk-events.json', 'riskEvents');
    return events.map(e => ({
      ...e,
      timestamp: new Date(e.timestamp)
    }));
  }

  /**
   * Load all data at once
   */
  async loadAll(): Promise<{
    customers: Customer[];
    contractors: Contractor[];
    riskEvents: RiskEvent[];
  }> {
    const [customers, contractors, riskEvents] = await Promise.all([
      this.loadCustomers(),
      this.loadContractors(),
      this.loadRiskEvents()
    ]);

    return { customers, contractors, riskEvents };
  }

  /**
   * Load data from local JSON file
   */
  private async loadFromJson<T>(filename: string, key: string): Promise<T> {
    const filePath = path.join(this.dataDir, filename);
    
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content) as Record<string, any>;
      
      if (key && data[key]) {
        return data[key] as T;
      }
      return data as T;
    } catch (error: any) {
      console.error(`Failed to load ${filename}: ${error.message}`);
      throw new Error(`Data file not found: ${filename}`);
    }
  }

  /**
   * Fetch data from external API
   */
  private async fetchFromApi<T>(url: string, key: string): Promise<T> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }
      const data = (await response.json()) as Record<string, unknown>;
      
      if (key && data[key]) {
        return data[key] as T;
      }
      return data as unknown as T;
    } catch (error: any) {
      console.error(`Failed to fetch from ${url}: ${error.message}`);
      throw error;
    }
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

let defaultProvider: DataProvider | null = null;

export function getDataProvider(config?: DataProviderConfig): DataProvider {
  if (!defaultProvider || config) {
    defaultProvider = new DataProvider(config);
  }
  return defaultProvider;
}

export async function loadCustomers(config?: DataProviderConfig): Promise<Customer[]> {
  return getDataProvider(config).loadCustomers();
}

export async function loadContractors(config?: DataProviderConfig): Promise<Contractor[]> {
  return getDataProvider(config).loadContractors();
}

export async function loadRiskEvents(config?: DataProviderConfig): Promise<RiskEvent[]> {
  return getDataProvider(config).loadRiskEvents();
}

export async function loadAllData(config?: DataProviderConfig): Promise<{
  customers: Customer[];
  contractors: Contractor[];
  riskEvents: RiskEvent[];
}> {
  return getDataProvider(config).loadAll();
}

// ============================================================================
// DSL SOURCE INTEGRATION
// ============================================================================

export interface SourceConfig {
  type: 'rest' | 'json' | 'database';
  url?: string;
  path?: string;
  auth?: 'api_key' | 'bearer' | 'basic';
  cache?: string;
  mapping?: Record<string, string>;
}

/**
 * Create a data source from DSL SOURCE declaration
 */
export function createSourceFromDSL(name: string, config: SourceConfig): () => Promise<any> {
  switch (config.type) {
    case 'json':
      return async () => {
        const provider = new DataProvider({ dataDir: path.dirname(config.path || '') });
        const content = fs.readFileSync(config.path!, 'utf-8');
        return JSON.parse(content);
      };
    
    case 'rest':
      return async () => {
        const headers: Record<string, string> = {};
        
        if (config.auth === 'api_key') {
          headers['X-API-Key'] = process.env[`${name.toUpperCase()}_API_KEY`] || '';
        } else if (config.auth === 'bearer') {
          headers['Authorization'] = `Bearer ${process.env[`${name.toUpperCase()}_TOKEN`] || ''}`;
        }
        
        const response = await fetch(config.url!, { headers });
        if (!response.ok) {
          throw new Error(`Source ${name} fetch failed: ${response.status}`);
        }
        
        const data = await response.json() as Record<string, any>;
        
        // Apply mapping if provided
        if (config.mapping) {
          return applyMapping(data, config.mapping);
        }
        
        return data;
      };
    
    default:
      throw new Error(`Unsupported source type: ${config.type}`);
  }
}

function applyMapping(data: any, mapping: Record<string, string>): any {
  const result: Record<string, any> = {};
  
  for (const [source, target] of Object.entries(mapping)) {
    const value = getNestedValue(data, source);
    setNestedValue(result, target, value);
  }
  
  return result;
}

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

function setNestedValue(obj: any, path: string, value: any): void {
  const keys = path.split('.');
  const lastKey = keys.pop()!;
  const target = keys.reduce((current, key) => {
    if (!current[key]) current[key] = {};
    return current[key];
  }, obj);
  target[lastKey] = value;
}
