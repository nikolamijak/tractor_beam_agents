/**
 * DBOS module exports
 * Central export point for DBOS configuration and workflows
 *
 * IMPORTANT: Workflows are exported from the registry, NOT re-imported from files.
 * This prevents duplicate registration errors.
 */

import { getWorkflowRegistry } from './init';

export * from './config';
export { initializeDBOS, isDBOSReady, getWorkflowRegistry } from './init';

// Re-export workflow TYPES only (types don't cause imports)
export type { DocumentToStoriesInput, DocumentToStoriesOutput } from './workflows/DocumentToStoriesWorkflow';
export type { StoryImplementationInput, StoryImplementationOutput } from './workflows/StoryImplementationWorkflow';
export type { CodeReviewInput, CodeReviewOutput } from './workflows/CodeReviewWorkflow';
export type { PrototypeInput, PrototypeOutput } from './workflows/PrototypeWorkflow';

/**
 * Get workflow starter functions from registry
 * Use these in API routes instead of importing workflows directly
 *
 * Example:
 * ```typescript
 * import { getWorkflowStarters } from '@/lib/dbos';
 * const { startDocumentToStoriesWorkflow } = getWorkflowStarters();
 * const handle = await startDocumentToStoriesWorkflow({ ... });
 * ```
 */
export function getWorkflowStarters() {
  const registry = getWorkflowRegistry();
  return {
    startDocumentToStoriesWorkflow: registry.startDocumentToStoriesWorkflow,
    startStoryImplementationWorkflow: registry.startStoryImplementationWorkflow,
    startCodeReviewWorkflow: registry.startCodeReviewWorkflow,
    startPrototypeWorkflow: registry.startPrototypeWorkflow,
    documentToStoriesWorkflow: registry.documentToStoriesWorkflow
  };
}
