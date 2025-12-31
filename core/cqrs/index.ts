/**
 * Reclapp CQRS Infrastructure
 * 
 * Command Query Responsibility Segregation implementation
 * with projections and read model management.
 */

import { IEventStore, StoredEvent } from '../eventstore';

// ============================================================================
// COMMAND TYPES
// ============================================================================

export interface Command {
  type: string;
  aggregateId?: string;
  payload: Record<string, any>;
  metadata?: CommandMetadata;
}

export interface CommandMetadata {
  userId?: string;
  correlationId?: string;
  timestamp?: Date;
}

export interface CommandResult {
  success: boolean;
  aggregateId?: string;
  events?: StoredEvent[];
  error?: string;
}

export type CommandHandler<T extends Command = Command> = (
  command: T,
  context: CommandContext
) => Promise<CommandResult>;

export interface CommandContext {
  eventStore: IEventStore;
  getAggregate: <T>(id: string) => Promise<T | null>;
}

// ============================================================================
// QUERY TYPES
// ============================================================================

export interface Query {
  type: string;
  params: Record<string, any>;
}

export interface QueryResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: QueryMetadata;
}

export interface QueryMetadata {
  totalCount?: number;
  page?: number;
  pageSize?: number;
  executionTime?: number;
}

export type QueryHandler<Q extends Query = Query, T = any> = (
  query: Q,
  context: QueryContext
) => Promise<QueryResult<T>>;

export interface QueryContext {
  readModels: ReadModelRegistry;
}

// ============================================================================
// READ MODEL / PROJECTION TYPES
// ============================================================================

export interface ReadModel<T = any> {
  name: string;
  get(id: string): Promise<T | null>;
  getAll(filter?: Record<string, any>): Promise<T[]>;
  query(query: Record<string, any>): Promise<T[]>;
}

export interface Projection {
  name: string;
  sourceEvents: string[];
  handlers: Map<string, ProjectionHandler>;
  start(): Promise<void>;
  stop(): Promise<void>;
}

export type ProjectionHandler = (
  event: StoredEvent,
  state: ProjectionState
) => Promise<void>;

export interface ProjectionState {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  update<T>(key: string, updater: (current: T | null) => T): Promise<void>;
}

// ============================================================================
// COMMAND BUS
// ============================================================================

export class CommandBus {
  private handlers: Map<string, CommandHandler> = new Map();
  private eventStore: IEventStore;

  constructor(eventStore: IEventStore) {
    this.eventStore = eventStore;
  }

  register<T extends Command>(commandType: string, handler: CommandHandler<T>): void {
    this.handlers.set(commandType, handler as CommandHandler);
  }

  async dispatch(command: Command): Promise<CommandResult> {
    const handler = this.handlers.get(command.type);

    if (!handler) {
      return {
        success: false,
        error: `No handler registered for command: ${command.type}`
      };
    }

    const context: CommandContext = {
      eventStore: this.eventStore,
      getAggregate: async (id) => this.loadAggregate(id)
    };

    try {
      return await handler(command, context);
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  private async loadAggregate(id: string): Promise<any> {
    const result = await this.eventStore.read(id);
    if (result.events.length === 0) return null;

    // Simplified aggregate reconstruction
    return result.events.reduce((state, event) => ({
      ...state,
      ...event.data,
      version: event.version
    }), { id });
  }
}

// ============================================================================
// QUERY BUS
// ============================================================================

export class QueryBus {
  private handlers: Map<string, QueryHandler> = new Map();
  private readModels: ReadModelRegistry;

  constructor(readModels: ReadModelRegistry) {
    this.readModels = readModels;
  }

  register<Q extends Query, T>(queryType: string, handler: QueryHandler<Q, T>): void {
    this.handlers.set(queryType, handler as QueryHandler);
  }

  async execute<T>(query: Query): Promise<QueryResult<T>> {
    const startTime = Date.now();
    const handler = this.handlers.get(query.type);

    if (!handler) {
      return {
        success: false,
        error: `No handler registered for query: ${query.type}`
      };
    }

    const context: QueryContext = {
      readModels: this.readModels
    };

    try {
      const result = await handler(query, context);
      return {
        ...result,
        metadata: {
          ...result.metadata,
          executionTime: Date.now() - startTime
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// ============================================================================
// READ MODEL REGISTRY
// ============================================================================

export class ReadModelRegistry {
  private models: Map<string, ReadModel> = new Map();

  register<T>(model: ReadModel<T>): void {
    this.models.set(model.name, model);
  }

  get<T>(name: string): ReadModel<T> | undefined {
    return this.models.get(name) as ReadModel<T> | undefined;
  }

  getAll(): ReadModel[] {
    return Array.from(this.models.values());
  }
}

// ============================================================================
// IN-MEMORY READ MODEL
// ============================================================================

export class InMemoryReadModel<T extends { id: string }> implements ReadModel<T> {
  name: string;
  private data: Map<string, T> = new Map();

  constructor(name: string) {
    this.name = name;
  }

  async get(id: string): Promise<T | null> {
    return this.data.get(id) || null;
  }

  async getAll(filter?: Record<string, any>): Promise<T[]> {
    const all = Array.from(this.data.values());
    
    if (!filter) return all;

    return all.filter(item => {
      return Object.entries(filter).every(([key, value]) => {
        return (item as any)[key] === value;
      });
    });
  }

  async query(query: Record<string, any>): Promise<T[]> {
    return this.getAll(query);
  }

  async set(id: string, value: T): Promise<void> {
    this.data.set(id, value);
  }

  async delete(id: string): Promise<void> {
    this.data.delete(id);
  }

  async update(id: string, updater: (current: T | null) => T): Promise<void> {
    const current = this.data.get(id) || null;
    const updated = updater(current);
    this.data.set(id, updated);
  }

  async clear(): Promise<void> {
    this.data.clear();
  }
}

// ============================================================================
// PROJECTION ENGINE
// ============================================================================

export class ProjectionEngine {
  private projections: Map<string, Projection> = new Map();
  private eventStore: IEventStore;
  private unsubscribes: Map<string, () => void> = new Map();

  constructor(eventStore: IEventStore) {
    this.eventStore = eventStore;
  }

  register(projection: Projection): void {
    this.projections.set(projection.name, projection);
  }

  async start(projectionName?: string): Promise<void> {
    const projections = projectionName
      ? [this.projections.get(projectionName)].filter(Boolean)
      : Array.from(this.projections.values());

    for (const projection of projections) {
      if (!projection) continue;

      // Subscribe to relevant event types
      for (const eventType of projection.sourceEvents) {
        const unsubscribe = this.eventStore.subscribe(
          `$type:${eventType}`,
          async (event) => {
            const handler = projection.handlers.get(event.type);
            if (handler) {
              await handler(event, this.createProjectionState(projection.name));
            }
          }
        );
        this.unsubscribes.set(`${projection.name}:${eventType}`, unsubscribe);
      }

      await projection.start();
    }
  }

  async stop(projectionName?: string): Promise<void> {
    if (projectionName) {
      const projection = this.projections.get(projectionName);
      if (projection) {
        await projection.stop();
        // Remove subscriptions
        for (const [key, unsubscribe] of this.unsubscribes) {
          if (key.startsWith(`${projectionName}:`)) {
            unsubscribe();
            this.unsubscribes.delete(key);
          }
        }
      }
    } else {
      for (const projection of this.projections.values()) {
        await projection.stop();
      }
      for (const unsubscribe of this.unsubscribes.values()) {
        unsubscribe();
      }
      this.unsubscribes.clear();
    }
  }

  private projectionData: Map<string, Map<string, any>> = new Map();

  private createProjectionState(projectionName: string): ProjectionState {
    if (!this.projectionData.has(projectionName)) {
      this.projectionData.set(projectionName, new Map());
    }
    const data = this.projectionData.get(projectionName)!;

    return {
      async get<T>(key: string): Promise<T | null> {
        return data.get(key) || null;
      },
      async set<T>(key: string, value: T): Promise<void> {
        data.set(key, value);
      },
      async delete(key: string): Promise<void> {
        data.delete(key);
      },
      async update<T>(key: string, updater: (current: T | null) => T): Promise<void> {
        const current = data.get(key) || null;
        data.set(key, updater(current));
      }
    };
  }
}

// ============================================================================
// CQRS CONTAINER
// ============================================================================

export class CQRSContainer {
  readonly eventStore: IEventStore;
  readonly commandBus: CommandBus;
  readonly queryBus: QueryBus;
  readonly readModels: ReadModelRegistry;
  readonly projectionEngine: ProjectionEngine;

  constructor(eventStore: IEventStore) {
    this.eventStore = eventStore;
    this.readModels = new ReadModelRegistry();
    this.commandBus = new CommandBus(eventStore);
    this.queryBus = new QueryBus(this.readModels);
    this.projectionEngine = new ProjectionEngine(eventStore);
  }

  async start(): Promise<void> {
    await this.projectionEngine.start();
  }

  async stop(): Promise<void> {
    await this.projectionEngine.stop();
  }
}
