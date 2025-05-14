import { EventEmitter } from 'events';
import { MCPRequest, MCPQueueItem } from '../types/mcp';

export class QueueManager extends EventEmitter {
  private queue: MCPQueueItem[];
  private processing: Map<string, MCPQueueItem>;
  private maxConcurrent: number;
  private maxQueueSize: number;

  constructor(maxConcurrent: number, maxQueueSize: number) {
    super();
    this.queue = [];
    this.processing = new Map();
    this.maxConcurrent = maxConcurrent;
    this.maxQueueSize = maxQueueSize;
  }

  /**
   * Add a request to the queue
   * @param request The MCP request to queue
   * @param priority Priority level (higher number = higher priority)
   * @returns The queue item
   * @throws Error if queue is full
   */
  enqueue(request: MCPRequest, priority: number = 0): MCPQueueItem {
    const totalItems = this.queue.length + this.processing.size;
    if (totalItems >= this.maxQueueSize) {
      throw new Error('Queue is full');
    }

    const queueItem: MCPQueueItem = {
      request,
      priority,
      status: 'pending',
      queuedAt: new Date()
    };

    // Insert into queue maintaining priority order
    const insertIndex = this.queue.findIndex(item => item.priority < priority);
    if (insertIndex === -1) {
      this.queue.push(queueItem);
    } else {
      this.queue.splice(insertIndex, 0, queueItem);
    }

    this.emit('queued', queueItem);

    // Process next items if we have capacity
    // Note: Using setTimeout to ensure status is still pending when event is emitted
    if (this.processing.size < this.maxConcurrent) {
      setTimeout(() => this.processNext(), 0);
    }

    return queueItem;
  }

  /**
   * Process the next items in the queue
   */
  private processNext(): void {
    while (
      this.queue.length > 0 && 
      this.processing.size < this.maxConcurrent
    ) {
      const item = this.queue.shift();
      if (!item) break;

      item.status = 'processing';
      item.startedAt = new Date();
      this.processing.set(item.request.id, item);

      this.emit('processing', item);
    }
  }

  /**
   * Mark a request as completed
   * @param requestId The ID of the completed request
   * @param error Optional error if the request failed
   */
  complete(requestId: string, error?: Error): void {
    const item = this.processing.get(requestId);
    if (!item) return;

    item.status = error ? 'failed' : 'completed';
    item.completedAt = new Date();
    this.processing.delete(requestId);
    
    this.emit('completed', { 
      requestId, 
      error,
      timestamp: item.completedAt,
      status: item.status
    });

    this.processNext();
  }

  /**
   * Get the current status of the queue
   */
  getStatus(): {
    queueLength: number;
    processing: number;
    maxQueueSize: number;
    maxConcurrent: number;
  } {
    return {
      queueLength: this.queue.length,
      processing: this.processing.size,
      maxQueueSize: this.maxQueueSize,
      maxConcurrent: this.maxConcurrent
    };
  }

  /**
   * Clear all items from the queue
   */
  clear(): void {
    this.queue = [];
    this.emit('cleared');
  }

  /**
   * Get a specific queue item
   * @param requestId The request ID to look for
   * @returns The queue item if found
   */
  getItem(requestId: string): MCPQueueItem | undefined {
    return (
      this.queue.find(item => item.request.id === requestId) ||
      this.processing.get(requestId)
    );
  }

  /**
   * Update the priority of a queued request
   * @param requestId The request ID to update
   * @param priority The new priority
   * @returns true if the item was found and updated
   */
  updatePriority(requestId: string, priority: number): boolean {
    const index = this.queue.findIndex(item => item.request.id === requestId);
    if (index === -1) return false;

    const item = this.queue[index];
    this.queue.splice(index, 1);
    item.priority = priority;

    // Reinsert at the correct priority position
    const insertIndex = this.queue.findIndex(item => item.priority < priority);
    if (insertIndex === -1) {
      this.queue.push(item);
    } else {
      this.queue.splice(insertIndex, 0, item);
    }

    this.emit('priorityUpdated', { requestId, priority });
    return true;
  }
} 