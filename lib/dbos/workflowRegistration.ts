/**
 * Workflow Registration Helpers
 * Provides safe workflow registration that prevents duplicate registration errors
 * in production builds where modules may be evaluated multiple times
 */

import { DBOS } from '@dbos-inc/dbos-sdk';

// Track registered workflows to prevent duplicates
// Use a global to persist across module reloads in dev mode
const globalForWorkflowCache = global as typeof global & {
  __dbosWorkflowCache?: Map<string, any>;
};

if (!globalForWorkflowCache.__dbosWorkflowCache) {
  globalForWorkflowCache.__dbosWorkflowCache = new Map();
}

const registeredWorkflows = globalForWorkflowCache.__dbosWorkflowCache;

/**
 * Safely register a workflow, preventing duplicate registrations
 * Returns the registered workflow (either newly registered or existing)
 *
 * @param name - Unique name for the workflow
 * @param workflowFunction - The workflow function to register
 * @returns The registered workflow
 */
export function safeRegisterWorkflow<F extends (...args: any[]) => any, R = any>(
  name: string,
  workflowFunction: F
): (input: Parameters<F>[0]) => Promise<R> {
  // Check if already registered
  if (registeredWorkflows.has(name)) {
    console.log(`[DBOS] Workflow "${name}" already registered, reusing existing registration`);
    return registeredWorkflows.get(name)!;
  }

  // Register the workflow
  console.log(`[DBOS] Registering workflow: ${name}`);

  // Wrap in try-catch to handle duplicate registration gracefully
  try {
    const registeredWorkflow = DBOS.registerWorkflow(workflowFunction, { name });

    // Cache it to prevent duplicate registration
    registeredWorkflows.set(name, registeredWorkflow);

    return registeredWorkflow as any;
  } catch (error) {
    // If registration failed due to duplicate, check if we have it cached
    if (error instanceof Error && error.message.includes('already registered')) {
      console.log(`[DBOS] Workflow "${name}" already registered in DBOS, using cached version`);

      // If not in cache, re-throw as we can't recover
      if (!registeredWorkflows.has(name)) {
        throw error;
      }

      return registeredWorkflows.get(name)!;
    }

    // Re-throw other errors
    throw error;
  }
}

/**
 * Clear the workflow registration cache
 * Useful for testing or hot module replacement
 */
export function clearWorkflowRegistrations(): void {
  registeredWorkflows.clear();
  console.log('[DBOS] Cleared workflow registration cache');
}

/**
 * Check if a workflow is already registered
 */
export function isWorkflowRegistered(name: string): boolean {
  return registeredWorkflows.has(name);
}

/**
 * Get all registered workflow names
 */
export function getRegisteredWorkflowNames(): string[] {
  return Array.from(registeredWorkflows.keys());
}
