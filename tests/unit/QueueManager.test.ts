import { QueueManager } from '../../src/server/services/QueueManager';
import { MCPRequest } from '../../src/server/types/mcp';

describe('QueueManager', () => {
  let queueManager: QueueManager;
  const maxConcurrent = 2;
  const maxQueueSize = 5;

  beforeEach(() => {
    queueManager = new QueueManager(maxConcurrent, maxQueueSize);
  });

  const createMockRequest = (id: string): MCPRequest => ({
    id,
    prompt: `Test prompt ${id}`,
    model: 'test-model',
    createdAt: new Date()
  });

  describe('enqueue', () => {
    it('adds requests to the queue', () => {
      const request = createMockRequest('test-1');
      const item = queueManager.enqueue(request);
      
      expect(item.request).toBe(request);
      expect(item.status).toBe('pending');
      expect(item.priority).toBe(0);
      expect(item.queuedAt).toBeInstanceOf(Date);
    });

    it('respects priority ordering', () => {
      queueManager.enqueue(createMockRequest('test-1'), 1);
      queueManager.enqueue(createMockRequest('test-2'), 3);
      queueManager.enqueue(createMockRequest('test-3'), 2);

      const status = queueManager.getStatus();
      expect(status.queueLength).toBe(3);
    });

    it('throws error when queue is full', () => {
      for (let i = 0; i < maxQueueSize; i++) {
        queueManager.enqueue(createMockRequest(`test-${i}`));
      }

      expect(() => {
        queueManager.enqueue(createMockRequest('overflow'));
      }).toThrow('Queue is full');
    });
  });

  describe('processing', () => {
    it('processes up to maxConcurrent items', async () => {
      const processedItems: string[] = [];
      
      const processingPromise = new Promise<void>((resolve) => {
        queueManager.on('processing', (item) => {
          processedItems.push(item.request.id);
          if (processedItems.length === maxConcurrent) {
            expect(processedItems).toHaveLength(maxConcurrent);
            resolve();
          }
        });
      });

      // Add more than maxConcurrent items
      for (let i = 0; i < maxConcurrent + 2; i++) {
        queueManager.enqueue(createMockRequest(`test-${i}`));
      }

      await processingPromise;
    });

    it('processes next items when current ones complete', async () => {
      const processedItems: string[] = [];
      let firstTwoProcessed = false;
      
      const processingPromise = new Promise<void>((resolve) => {
        queueManager.on('processing', (item) => {
          processedItems.push(item.request.id);
          
          if (!firstTwoProcessed && processedItems.length === 2) {
            firstTwoProcessed = true;
            // First two items are processing
            expect(processedItems).toContain('test-0');
            expect(processedItems).toContain('test-1');
            
            // Complete one item
            queueManager.complete('test-0');
          }
          
          if (processedItems.length === 3) {
            // Third item should now be processing
            expect(processedItems).toContain('test-2');
            resolve();
          }
        });
      });

      // Add three items
      queueManager.enqueue(createMockRequest('test-0'));
      queueManager.enqueue(createMockRequest('test-1'));
      queueManager.enqueue(createMockRequest('test-2'));

      await processingPromise;
    });
  });

  describe('priority updates', () => {
    it('updates priority of queued items', () => {
      const request1 = createMockRequest('test-1');
      queueManager.enqueue(request1, 1);

      const updated = queueManager.updatePriority('test-1', 3);
      expect(updated).toBe(true);
    });

    it('returns false when updating non-existent item', () => {
      const updated = queueManager.updatePriority('non-existent', 1);
      expect(updated).toBe(false);
    });
  });

  describe('queue management', () => {
    it('clears the queue', () => {
      queueManager.enqueue(createMockRequest('test-1'));
      queueManager.enqueue(createMockRequest('test-2'));

      queueManager.clear();
      const status = queueManager.getStatus();
      expect(status.queueLength).toBe(0);
    });

    it('retrieves specific items', () => {
      const request = createMockRequest('test-1');
      queueManager.enqueue(request);

      const item = queueManager.getItem('test-1');
      expect(item?.request).toBe(request);
    });
  });
}); 