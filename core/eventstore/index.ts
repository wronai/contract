/**
 * Reclapp Event Store
 * 
 * Event sourcing infrastructure for storing and replaying events.
 * Supports EventStoreDB and in-memory storage for development.
 */

import { EventEmitter } from 'events';

// ============================================================================
// TYPES
// ============================================================================

export interface StoredEvent {
  id: string;
  streamId: string;
  type: string;
  data: Record<string, any>;
  metadata: EventMetadata;
  version: number;
  timestamp: Date;
}

export interface EventMetadata {
  correlationId?: string;
  causationId?: string;
  userId?: string;
  source?: string;
}

export interface AppendResult {
  success: boolean;
  nextExpectedVersion: number;
  position: number;
}

export interface ReadResult {
  events: StoredEvent[];
  nextPosition?: number;
  isEndOfStream: boolean;
}

export interface SubscriptionOptions {
  fromPosition?: number;
  fromVersion?: number;
  batchSize?: number;
}

export type EventHandler = (event: StoredEvent) => Promise<void>;

// ============================================================================
// EVENT STORE INTERFACE
// ============================================================================

export interface IEventStore {
  append(streamId: string, events: Omit<StoredEvent, 'id' | 'version' | 'timestamp'>[], expectedVersion?: number): Promise<AppendResult>;
  read(streamId: string, fromVersion?: number, count?: number): Promise<ReadResult>;
  readAll(fromPosition?: number, count?: number): Promise<ReadResult>;
  subscribe(streamPattern: string, handler: EventHandler, options?: SubscriptionOptions): () => void;
  getLatestVersion(streamId: string): Promise<number>;
}

// ============================================================================
// IN-MEMORY EVENT STORE (Development)
// ============================================================================

export class InMemoryEventStore extends EventEmitter implements IEventStore {
  private streams: Map<string, StoredEvent[]> = new Map();
  private allEvents: StoredEvent[] = [];
  private globalPosition = 0;

  async append(
    streamId: string,
    events: Omit<StoredEvent, 'id' | 'version' | 'timestamp'>[],
    expectedVersion?: number
  ): Promise<AppendResult> {
    const stream = this.streams.get(streamId) || [];
    const currentVersion = stream.length - 1;

    // Optimistic concurrency check
    if (expectedVersion !== undefined && expectedVersion !== currentVersion) {
      throw new Error(`Concurrency conflict: expected version ${expectedVersion}, but current is ${currentVersion}`);
    }

    const storedEvents: StoredEvent[] = events.map((event, index) => ({
      ...event,
      id: this.generateId(),
      streamId,
      version: currentVersion + index + 1,
      timestamp: new Date()
    }));

    // Append to stream
    stream.push(...storedEvents);
    this.streams.set(streamId, stream);

    // Append to global log
    for (const event of storedEvents) {
      this.globalPosition++;
      this.allEvents.push({ ...event, metadata: { ...event.metadata } });
      this.emit('event', event);
      this.emit(`stream:${streamId}`, event);
      this.emit(`type:${event.type}`, event);
    }

    return {
      success: true,
      nextExpectedVersion: stream.length - 1,
      position: this.globalPosition
    };
  }

  async read(streamId: string, fromVersion = 0, count = 100): Promise<ReadResult> {
    const stream = this.streams.get(streamId) || [];
    const events = stream.filter(e => e.version >= fromVersion).slice(0, count);

    return {
      events,
      nextPosition: fromVersion + events.length,
      isEndOfStream: fromVersion + events.length >= stream.length
    };
  }

  async readAll(fromPosition = 0, count = 100): Promise<ReadResult> {
    const events = this.allEvents.slice(fromPosition, fromPosition + count);

    return {
      events,
      nextPosition: fromPosition + events.length,
      isEndOfStream: fromPosition + events.length >= this.allEvents.length
    };
  }

  subscribe(streamPattern: string, handler: EventHandler, options?: SubscriptionOptions): () => void {
    const listener = async (event: StoredEvent) => {
      try {
        await handler(event);
      } catch (error) {
        console.error('Event handler error:', error);
      }
    };

    if (streamPattern === '*') {
      this.on('event', listener);
      return () => this.off('event', listener);
    }

    if (streamPattern.startsWith('$type:')) {
      const eventType = streamPattern.slice(6);
      this.on(`type:${eventType}`, listener);
      return () => this.off(`type:${eventType}`, listener);
    }

    this.on(`stream:${streamPattern}`, listener);
    return () => this.off(`stream:${streamPattern}`, listener);
  }

  async getLatestVersion(streamId: string): Promise<number> {
    const stream = this.streams.get(streamId);
    return stream ? stream.length - 1 : -1;
  }

  // For testing
  async clear(): Promise<void> {
    this.streams.clear();
    this.allEvents = [];
    this.globalPosition = 0;
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ============================================================================
// EVENTSTORE DB CLIENT
// ============================================================================

export class EventStoreDBClient implements IEventStore {
  private baseUrl: string;

  constructor(connectionString: string) {
    this.baseUrl = connectionString.replace('esdb://', 'http://').split('?')[0];
  }

  async append(
    streamId: string,
    events: Omit<StoredEvent, 'id' | 'version' | 'timestamp'>[],
    expectedVersion?: number
  ): Promise<AppendResult> {
    const body = events.map(event => ({
      eventId: this.generateUUID(),
      eventType: event.type,
      data: event.data,
      metadata: event.metadata
    }));

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (expectedVersion !== undefined) {
      headers['ES-ExpectedVersion'] = String(expectedVersion);
    }

    const response = await fetch(`${this.baseUrl}/streams/${streamId}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`EventStore error: ${response.statusText}`);
    }

    return {
      success: true,
      nextExpectedVersion: expectedVersion !== undefined ? expectedVersion + events.length : -1,
      position: -1
    };
  }

  async read(streamId: string, fromVersion = 0, count = 100): Promise<ReadResult> {
    const response = await fetch(
      `${this.baseUrl}/streams/${streamId}/${fromVersion}/forward/${count}`,
      {
        headers: { 'Accept': 'application/json' }
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return { events: [], isEndOfStream: true };
      }
      throw new Error(`EventStore error: ${response.statusText}`);
    }

    const data = await response.json();
    const events: StoredEvent[] = data.entries?.map((entry: any) => ({
      id: entry.eventId,
      streamId,
      type: entry.eventType,
      data: entry.data,
      metadata: entry.metaData || {},
      version: entry.eventNumber,
      timestamp: new Date(entry.updated)
    })) || [];

    return {
      events,
      nextPosition: fromVersion + events.length,
      isEndOfStream: events.length < count
    };
  }

  async readAll(fromPosition = 0, count = 100): Promise<ReadResult> {
    const response = await fetch(
      `${this.baseUrl}/streams/$all/${fromPosition}/forward/${count}`,
      {
        headers: { 'Accept': 'application/json' }
      }
    );

    if (!response.ok) {
      throw new Error(`EventStore error: ${response.statusText}`);
    }

    const data = await response.json();
    const events: StoredEvent[] = data.entries?.map((entry: any) => ({
      id: entry.eventId,
      streamId: entry.streamId,
      type: entry.eventType,
      data: entry.data,
      metadata: entry.metaData || {},
      version: entry.eventNumber,
      timestamp: new Date(entry.updated)
    })) || [];

    return {
      events,
      nextPosition: fromPosition + events.length,
      isEndOfStream: events.length < count
    };
  }

  subscribe(streamPattern: string, handler: EventHandler, options?: SubscriptionOptions): () => void {
    // Simplified polling-based subscription for MVP
    let running = true;
    let position = options?.fromPosition || 0;

    const poll = async () => {
      while (running) {
        try {
          const result = await this.readAll(position, options?.batchSize || 100);
          for (const event of result.events) {
            if (streamPattern === '*' || event.streamId.match(streamPattern)) {
              await handler(event);
            }
          }
          if (result.nextPosition) {
            position = result.nextPosition;
          }
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error('Subscription error:', error);
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
    };

    poll();
    return () => { running = false; };
  }

  async getLatestVersion(streamId: string): Promise<number> {
    const result = await this.read(streamId, 0, 1);
    return result.events.length > 0 ? result.events[0].version : -1;
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

// ============================================================================
// FACTORY
// ============================================================================

export function createEventStore(config: { type: 'memory' | 'eventstoredb'; connectionString?: string }): IEventStore {
  if (config.type === 'eventstoredb' && config.connectionString) {
    return new EventStoreDBClient(config.connectionString);
  }
  return new InMemoryEventStore();
}
