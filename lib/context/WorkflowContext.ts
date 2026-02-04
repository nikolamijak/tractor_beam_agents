/**
 * WorkflowContext - Async local storage for workflow execution context
 *
 * Enables implicit context passing without changing function signatures.
 * AgentExecutor can read workflow context without workflows explicitly passing it.
 * Thread-safe across async operations using Node.js AsyncLocalStorage.
 *
 * Pattern: Singleton with global state (survives Next.js HMR)
 */

import { AsyncLocalStorage } from 'async_hooks';

// ============================================================================
// Types
// ============================================================================

export interface WorkflowContextData {
  workflowId: string;
  stepName: string;
  startTime: number; // for duration tracking
}

// ============================================================================
// WorkflowContext Class
// ============================================================================

export class WorkflowContext {
  private asyncLocalStorage: AsyncLocalStorage<WorkflowContextData>;

  constructor() {
    this.asyncLocalStorage = new AsyncLocalStorage<WorkflowContextData>();
  }

  /**
   * Set workflow context for the current async execution context
   * Must be called within an async context
   *
   * @param context - Workflow context data (workflowId, stepName, startTime)
   */
  setContext(context: WorkflowContextData): void {
    // Store context in async local storage
    // Note: Must be called within an async context
    const store = this.asyncLocalStorage.getStore();
    if (store) {
      // If store exists, update it
      Object.assign(store, context);
    } else {
      // If no store exists, create one
      this.asyncLocalStorage.enterWith(context);
    }
  }

  /**
   * Get the current workflow context
   * Returns null if not in a workflow execution context
   *
   * @returns Current workflow context or null
   */
  getCurrentContext(): WorkflowContextData | null {
    return this.asyncLocalStorage.getStore() || null;
  }

  /**
   * Clear the workflow context
   * Should be called after step completes
   */
  clearContext(): void {
    // Clear by entering with undefined
    this.asyncLocalStorage.enterWith(undefined as any);
  }

  /**
   * Run a function within a specific workflow context
   * Ensures context is properly scoped to the function execution
   *
   * @param context - Workflow context data
   * @param fn - Function to execute within the context
   * @returns Result of the function
   */
  run<T>(context: WorkflowContextData, fn: () => T | Promise<T>): T | Promise<T> {
    return this.asyncLocalStorage.run(context, fn);
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

// Use global to persist across Next.js HMR (Hot Module Replacement)
// This ensures the singleton survives module reloads in dev mode
const globalForContext = global as typeof globalThis & {
  workflowContext?: WorkflowContext;
};

/**
 * Get the singleton WorkflowContext instance
 * Safe to call multiple times - always returns the same instance
 *
 * @returns Shared WorkflowContext instance
 */
export function getWorkflowContext(): WorkflowContext {
  if (!globalForContext.workflowContext) {
    globalForContext.workflowContext = new WorkflowContext();
  }
  return globalForContext.workflowContext;
}
