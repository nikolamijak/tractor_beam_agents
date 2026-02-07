/**
 * DBOS Initialization
 * Initialize DBOS when the application starts
 * This should be called once during application bootstrap
 *
 * IMPORTANT: This is called from instrumentation.ts BEFORE any API routes load.
 * Workflows are imported and registered here, then stored in a registry.
 * API routes should import from the registry, NOT directly from workflow files.
 */

import { configureDBOS, launchDBOS } from './config';

// Workflow registry - stores registered workflows to avoid re-imports
interface WorkflowRegistry {
  documentToStoriesWorkflow: any;
  startDocumentToStoriesWorkflow: any;
  storyImplementationWorkflow: any;
  startStoryImplementationWorkflow: any;
  codeReviewWorkflow: any;
  startCodeReviewWorkflow: any;
  prototypeWorkflow: any;
  startPrototypeWorkflow: any;
}

// Use global to persist across Next.js HMR (Hot Module Replacement)
// This ensures the registry survives module reloads in dev mode
const globalForWorkflows = global as typeof global & {
  workflowRegistry?: WorkflowRegistry;
  isDBOSInitialized?: boolean;
};

// Initialize from global if available
let isInitialized = globalForWorkflows.isDBOSInitialized || false;
let workflowRegistry: WorkflowRegistry | null = globalForWorkflows.workflowRegistry || null;

/**
 * Get workflow registry
 * Only available after initialization
 */
export function getWorkflowRegistry(): WorkflowRegistry {
  // Check global first (survives HMR)
  const registry = globalForWorkflows.workflowRegistry || workflowRegistry;

  console.log('[DBOS] getWorkflowRegistry called, registry available:', !!registry);

  if (!registry) {
    throw new Error('DBOS not initialized. Call initializeDBOS() first.');
  }

  // Update local reference if it was null but global had it
  if (!workflowRegistry && globalForWorkflows.workflowRegistry) {
    workflowRegistry = globalForWorkflows.workflowRegistry;
    isInitialized = true;
  }

  return registry;
}

/**
 * Initialize DBOS
 * Safe to call multiple times - only initializes once
 */
export async function initializeDBOS(): Promise<void> {
  // Check both local and global initialization state
  if (isInitialized || globalForWorkflows.isDBOSInitialized) {
    console.log('[DBOS] Already initialized, skipping...');

    // Sync local state from global if needed
    if (!workflowRegistry && globalForWorkflows.workflowRegistry) {
      workflowRegistry = globalForWorkflows.workflowRegistry;
      isInitialized = true;
      console.log('[DBOS] Synced workflow registry from global state');
    }

    return;
  }

  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      attempt++;
      console.log(`[DBOS] Initialization attempt ${attempt}/${maxRetries}...`);

      // Step 1: Configure DBOS
      configureDBOS();

      // Step 2: Import and register ALL workflows BEFORE launch
      // These dynamic imports trigger DBOS.registerWorkflow() calls
      console.log('[DBOS] Importing and registering workflows...');

      const docToStories = await import('./workflows/DocumentToStoriesWorkflow');
      const storyImpl = await import('./workflows/StoryImplementationWorkflow');
      const codeReview = await import('./workflows/CodeReviewWorkflow');
      const prototype = await import('./workflows/PrototypeWorkflow');

      console.log('[DBOS] Workflows imported successfully');

      // Step 3: Launch DBOS (AFTER all workflows are registered)
      await launchDBOS();

      // Step 4: Store in registry (prevents re-imports later)
      workflowRegistry = {
        documentToStoriesWorkflow: docToStories.documentToStoriesWorkflow,
        startDocumentToStoriesWorkflow: docToStories.startDocumentToStoriesWorkflow,
        storyImplementationWorkflow: storyImpl.storyImplementationWorkflow,
        startStoryImplementationWorkflow: storyImpl.startStoryImplementationWorkflow,
        codeReviewWorkflow: codeReview.codeReviewWorkflow,
        startCodeReviewWorkflow: codeReview.startCodeReviewWorkflow,
        prototypeWorkflow: prototype.prototypeWorkflow,
        startPrototypeWorkflow: prototype.startPrototypeWorkflow,
      };

      // Persist to global (survives HMR in dev mode)
      globalForWorkflows.workflowRegistry = workflowRegistry;
      globalForWorkflows.isDBOSInitialized = true;

      console.log('[DBOS] Workflows registered in registry');

      isInitialized = true;
      console.log('[DBOS] ✅ Initialization complete');
      return;
    } catch (error) {
      console.error(`[DBOS] Initialization attempt ${attempt} failed:`, error);

      if (attempt >= maxRetries) {
        console.error('[DBOS] ❌ Max retries exceeded, initialization failed');
        throw error;
      }

      // Wait before retrying (exponential backoff)
      const delayMs = Math.pow(2, attempt) * 1000;
      console.log(`[DBOS] Retrying in ${delayMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
}

/**
 * Check if DBOS is initialized
 */
export function isDBOSReady(): boolean {
  // Check both local and global state
  return isInitialized || globalForWorkflows.isDBOSInitialized || false;
}
