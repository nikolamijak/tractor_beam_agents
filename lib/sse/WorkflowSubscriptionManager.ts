/**
 * WorkflowSubscriptionManager - Singleton subscription registry for SSE connections
 *
 * Manages active SSE subscriptions per workflow, handles event fan-out to multiple
 * connected clients, and maintains per-workflow sequence counters for event ordering.
 *
 * Memory management:
 * - Subscriptions stored in-memory per workflow
 * - clear(workflowId) MUST be called when workflow reaches terminal state
 * - No automatic cleanup - caller responsible for lifecycle
 */

import type {
  WorkflowEvent,
  EventSubscription,
  WorkflowSubscriptions
} from './types';

/**
 * Manages workflow event subscriptions and sequence numbering
 *
 * Thread-safe for Node.js single-threaded event loop. No locks needed.
 * All methods are synchronous - no awaiting or async operations.
 */
export class WorkflowSubscriptionManager {
  /** Map of workflow ID to array of subscription callbacks */
  private subscriptions: WorkflowSubscriptions = new Map();

  /** Per-workflow sequence counter for event ordering */
  private sequenceCounters: Map<string, number> = new Map();

  /**
   * Subscribe to workflow events
   *
   * Adds callback to subscription list for the specified workflow.
   * Initializes sequence counter to 0 if this is the first subscription.
   *
   * @param workflowId - DBOS workflow UUID
   * @param callback - Function to call when events are broadcast
   * @returns Unsubscribe function that removes this callback
   */
  subscribe(workflowId: string, callback: EventSubscription): () => void {
    // Initialize subscription array if first subscriber
    if (!this.subscriptions.has(workflowId)) {
      this.subscriptions.set(workflowId, []);
      this.sequenceCounters.set(workflowId, 0);
    }

    // Add callback to subscription list
    const callbacks = this.subscriptions.get(workflowId)!;
    callbacks.push(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.subscriptions.get(workflowId);
      if (!callbacks) return;

      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }

      // Clean up empty subscription arrays (but keep sequence counter)
      if (callbacks.length === 0) {
        this.subscriptions.delete(workflowId);
      }
    };
  }

  /**
   * Broadcast event to all subscribers of a workflow
   *
   * Increments sequence counter and calls all registered callbacks with the event.
   * Does nothing if no active subscriptions exist (memory efficient).
   * Does NOT throw on broadcast failure - caller handles errors.
   *
   * @param workflowId - DBOS workflow UUID
   * @param event - Event data without sequence number
   */
  broadcast(
    workflowId: string,
    event: Omit<WorkflowEvent, 'sequenceNumber'>
  ): void {
    const callbacks = this.subscriptions.get(workflowId);

    // No subscribers - nothing to do
    if (!callbacks || callbacks.length === 0) {
      return;
    }

    // Increment sequence counter
    const currentSequence = this.sequenceCounters.get(workflowId) || 0;
    const nextSequence = currentSequence + 1;
    this.sequenceCounters.set(workflowId, nextSequence);

    // Create event with sequence number
    const eventWithSequence: WorkflowEvent = {
      sequenceNumber: nextSequence,
      ...event
    };

    // Broadcast to all callbacks
    // Note: Catch errors per callback to prevent one failure affecting others
    for (const callback of callbacks) {
      try {
        callback(eventWithSequence);
      } catch (err) {
        // Silently ignore callback errors - client disconnect will clean up via unsubscribe
        // Logging here would spam console in production
      }
    }
  }

  /**
   * Get count of active subscriptions for a workflow
   *
   * Used for testing, debugging, and monitoring connection counts.
   *
   * @param workflowId - DBOS workflow UUID
   * @returns Number of active subscriptions (0 if none)
   */
  getSubscriptionCount(workflowId: string): number {
    const callbacks = this.subscriptions.get(workflowId);
    return callbacks ? callbacks.length : 0;
  }

  /**
   * Clear all subscriptions and sequence counter for a workflow
   *
   * Call this when workflow reaches terminal state (SUCCESS/ERROR/CANCELLED)
   * to prevent memory leaks. Does not notify subscribers - connection cleanup
   * happens via request.signal.abort in SSE route handler.
   *
   * @param workflowId - DBOS workflow UUID
   */
  clear(workflowId: string): void {
    this.subscriptions.delete(workflowId);
    this.sequenceCounters.delete(workflowId);
  }

  /**
   * Get current sequence number for a workflow
   *
   * Used for Last-Event-ID recovery when client reconnects.
   * Returns 0 if workflow has no sequence counter yet.
   *
   * @param workflowId - DBOS workflow UUID
   * @returns Current sequence number (0 if not initialized)
   */
  getSequence(workflowId: string): number {
    return this.sequenceCounters.get(workflowId) || 0;
  }
}

/**
 * Global singleton instance
 *
 * Lazy-initialized on first access. Survives Next.js HMR (stored in global scope).
 * Thread-safe due to Node.js single-threaded event loop.
 */
let manager: WorkflowSubscriptionManager | null = null;

/**
 * Get the global WorkflowSubscriptionManager instance
 *
 * Lazy-initializes singleton on first call. Always returns the same instance.
 *
 * @returns WorkflowSubscriptionManager singleton
 */
export function getSubscriptionManager(): WorkflowSubscriptionManager {
  if (!manager) {
    manager = new WorkflowSubscriptionManager();
  }
  return manager;
}
