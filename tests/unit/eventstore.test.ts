/**
 * Event Store Unit Tests
 */

import { InMemoryEventStore, createEventStore } from '../../core/eventstore';

describe('InMemoryEventStore', () => {
  let store: InMemoryEventStore;

  beforeEach(async () => {
    store = new InMemoryEventStore();
  });

  afterEach(async () => {
    await store.clear();
  });

  describe('append()', () => {
    it('should append events to stream', async () => {
      const result = await store.append('customer-123', [
        {
          streamId: 'customer-123',
          type: 'CustomerCreated',
          data: { name: 'Test' },
          metadata: {}
        }
      ]);

      expect(result.success).toBe(true);
      expect(result.nextExpectedVersion).toBe(0);
    });

    it('should append multiple events', async () => {
      await store.append('customer-123', [
        { streamId: 'customer-123', type: 'Event1', data: {}, metadata: {} },
        { streamId: 'customer-123', type: 'Event2', data: {}, metadata: {} }
      ]);

      const result = await store.read('customer-123');

      expect(result.events).toHaveLength(2);
      expect(result.events[0].type).toBe('Event1');
      expect(result.events[1].type).toBe('Event2');
    });

    it('should increment version for each event', async () => {
      await store.append('test-stream', [
        { streamId: 'test-stream', type: 'Event1', data: {}, metadata: {} }
      ]);
      
      await store.append('test-stream', [
        { streamId: 'test-stream', type: 'Event2', data: {}, metadata: {} }
      ]);

      const result = await store.read('test-stream');

      expect(result.events[0].version).toBe(0);
      expect(result.events[1].version).toBe(1);
    });

    it('should enforce optimistic concurrency', async () => {
      await store.append('test-stream', [
        { streamId: 'test-stream', type: 'Event1', data: {}, metadata: {} }
      ], -1); // Expected version: empty stream

      await expect(
        store.append('test-stream', [
          { streamId: 'test-stream', type: 'Event2', data: {}, metadata: {} }
        ], -1) // Wrong expected version
      ).rejects.toThrow('Concurrency conflict');
    });

    it('should generate unique event IDs', async () => {
      await store.append('test-stream', [
        { streamId: 'test-stream', type: 'Event1', data: {}, metadata: {} },
        { streamId: 'test-stream', type: 'Event2', data: {}, metadata: {} }
      ]);

      const result = await store.read('test-stream');
      const ids = result.events.map(e => e.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should set timestamp on events', async () => {
      const before = new Date();
      
      await store.append('test-stream', [
        { streamId: 'test-stream', type: 'Event1', data: {}, metadata: {} }
      ]);

      const after = new Date();
      const result = await store.read('test-stream');

      expect(result.events[0].timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result.events[0].timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('read()', () => {
    beforeEach(async () => {
      await store.append('test-stream', [
        { streamId: 'test-stream', type: 'Event1', data: { seq: 1 }, metadata: {} },
        { streamId: 'test-stream', type: 'Event2', data: { seq: 2 }, metadata: {} },
        { streamId: 'test-stream', type: 'Event3', data: { seq: 3 }, metadata: {} }
      ]);
    });

    it('should read all events from stream', async () => {
      const result = await store.read('test-stream');

      expect(result.events).toHaveLength(3);
    });

    it('should read events from specific version', async () => {
      const result = await store.read('test-stream', 1);

      expect(result.events).toHaveLength(2);
      expect(result.events[0].data.seq).toBe(2);
    });

    it('should limit number of events', async () => {
      const result = await store.read('test-stream', 0, 2);

      expect(result.events).toHaveLength(2);
    });

    it('should return empty array for non-existent stream', async () => {
      const result = await store.read('non-existent');

      expect(result.events).toHaveLength(0);
      expect(result.isEndOfStream).toBe(true);
    });

    it('should indicate end of stream', async () => {
      const result = await store.read('test-stream', 0, 100);

      expect(result.isEndOfStream).toBe(true);
    });

    it('should indicate more events available', async () => {
      const result = await store.read('test-stream', 0, 2);

      expect(result.isEndOfStream).toBe(false);
    });
  });

  describe('readAll()', () => {
    beforeEach(async () => {
      await store.append('stream-1', [
        { streamId: 'stream-1', type: 'Event1', data: {}, metadata: {} }
      ]);
      await store.append('stream-2', [
        { streamId: 'stream-2', type: 'Event2', data: {}, metadata: {} }
      ]);
    });

    it('should read events from all streams', async () => {
      const result = await store.readAll();

      expect(result.events).toHaveLength(2);
    });

    it('should paginate all events', async () => {
      const result = await store.readAll(0, 1);

      expect(result.events).toHaveLength(1);
      expect(result.nextPosition).toBe(1);
    });
  });

  describe('subscribe()', () => {
    it('should notify on new events', async () => {
      const events: any[] = [];
      
      store.subscribe('*', async (event) => {
        events.push(event);
      });

      await store.append('test-stream', [
        { streamId: 'test-stream', type: 'TestEvent', data: {}, metadata: {} }
      ]);

      // Wait for event processing
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('TestEvent');
    });

    it('should filter by stream pattern', async () => {
      const events: any[] = [];
      
      store.subscribe('customer-stream', async (event) => {
        events.push(event);
      });

      await store.append('customer-stream', [
        { streamId: 'customer-stream', type: 'CustomerEvent', data: {}, metadata: {} }
      ]);
      await store.append('order-stream', [
        { streamId: 'order-stream', type: 'OrderEvent', data: {}, metadata: {} }
      ]);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('CustomerEvent');
    });

    it('should filter by event type', async () => {
      const events: any[] = [];
      
      store.subscribe('$type:CustomerCreated', async (event) => {
        events.push(event);
      });

      await store.append('test-stream', [
        { streamId: 'test-stream', type: 'CustomerCreated', data: {}, metadata: {} },
        { streamId: 'test-stream', type: 'CustomerUpdated', data: {}, metadata: {} }
      ]);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('CustomerCreated');
    });

    it('should return unsubscribe function', async () => {
      const events: any[] = [];
      
      const unsubscribe = store.subscribe('*', async (event) => {
        events.push(event);
      });

      await store.append('test-stream', [
        { streamId: 'test-stream', type: 'Event1', data: {}, metadata: {} }
      ]);

      await new Promise(resolve => setTimeout(resolve, 10));
      unsubscribe();

      await store.append('test-stream', [
        { streamId: 'test-stream', type: 'Event2', data: {}, metadata: {} }
      ]);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(events).toHaveLength(1);
    });
  });

  describe('getLatestVersion()', () => {
    it('should return -1 for non-existent stream', async () => {
      const version = await store.getLatestVersion('non-existent');

      expect(version).toBe(-1);
    });

    it('should return latest version', async () => {
      await store.append('test-stream', [
        { streamId: 'test-stream', type: 'Event1', data: {}, metadata: {} },
        { streamId: 'test-stream', type: 'Event2', data: {}, metadata: {} }
      ]);

      const version = await store.getLatestVersion('test-stream');

      expect(version).toBe(1);
    });
  });
});

describe('createEventStore()', () => {
  it('should create in-memory store by default', () => {
    const store = createEventStore({ type: 'memory' });

    expect(store).toBeInstanceOf(InMemoryEventStore);
  });
});
