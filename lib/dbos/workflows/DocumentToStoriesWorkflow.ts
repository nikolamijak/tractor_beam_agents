/**
 * Document to Stories Workflow
 * Example DBOS workflow that demonstrates agent orchestration
 *
 * This workflow:
 * 1. Intake: Parses document and extracts requirements
 * 2. Ideation: Converts requirements to epics/stories
 * 3. Product Owner: Assigns story IDs and prioritizes
 *
 * See .claude/instructions/dbos-instructions.md for DBOS patterns
 */

import { DBOS } from '@dbos-inc/dbos-sdk';
import { getAgentExecutor } from '../../agents';
import { sessionsRepo } from '../../db/repositories';
import { safeRegisterWorkflow } from '../workflowRegistration';
import { setWorkflowStepContext, clearWorkflowContext } from './eventHelpers';
import { broadcastWorkflowEvent, closeWorkflowSubscriptions } from '../../sse';

// ============================================================================
// Workflow Input/Output Types
// ============================================================================
export interface DocumentToStoriesInput {
  userId: string;
  documentPath: string;
  documentContent: string;
  technology?: string;
}

export interface DocumentToStoriesOutput {
  success: boolean;
  sessionId: string;
  extractedRequirements: any;
  epicsAndStories: any;
  prioritizedStories: any;
  storiesCreated: number;
  storyIds: string[];
}

// ============================================================================
// Step Functions
// ============================================================================

/**
 * Step 1: Intake - Parse document and extract requirements
 */
async function intakeStep(sessionId: string, documentContent: string) {
  const executor = getAgentExecutor();

  const input = `Parse this document and extract all requirements:

${documentContent}`;

  const result = await executor.execute('dmas-intake', input, {
    sessionId,
    includeHistory: false,
  });

  if (!result.success) {
    throw new Error(`Intake agent failed: ${result.error}`);
  }

  DBOS.logger.info(`[DocumentToStories] Intake completed: ${result.tokensUsed} tokens`);
  return result;
}

/**
 * Step 2: Ideation - Convert requirements to epics/stories
 */
async function ideationStep(sessionId: string, intakeOutput: any) {
  const executor = getAgentExecutor();

  const input = `Convert these requirements into epics and user stories:

${JSON.stringify(intakeOutput, null, 2)}`;

  const result = await executor.execute('dmas-ideation', input, {
    sessionId,
    includeHistory: true,
    maxHistoryMessages: 5,
  });

  if (!result.success) {
    throw new Error(`Ideation agent failed: ${result.error}`);
  }

  DBOS.logger.info(`[DocumentToStories] Ideation completed: ${result.tokensUsed} tokens`);
  return result;
}

/**
 * Step 3: Product Owner - Assign story IDs and prioritize
 */
async function productOwnerStep(sessionId: string, ideationOutput: any) {
  const executor = getAgentExecutor();

  const input = `Assign story IDs (ACF-XXX format) and prioritize these stories:

${JSON.stringify(ideationOutput, null, 2)}`;

  const result = await executor.execute('dmas-product-owner', input, {
    sessionId,
    includeHistory: true,
    maxHistoryMessages: 5,
  });

  if (!result.success) {
    throw new Error(`Product Owner agent failed: ${result.error}`);
  }

  DBOS.logger.info(`[DocumentToStories] Product Owner completed: ${result.tokensUsed} tokens`);
  return result;
}

// ============================================================================
// Workflow Function
// ============================================================================

/**
 * Document to Stories Workflow Function
 * Orchestrates the 3-step process to convert a document into prioritized stories
 */
async function documentToStoriesWorkflowFunction(
  input: DocumentToStoriesInput
): Promise<DocumentToStoriesOutput> {
  DBOS.logger.info(`[DocumentToStories] Starting workflow for user: ${input.userId}`);

  try {
    // Create a session for this workflow
    await DBOS.setEvent('step:createSession:started', {
      timestamp: new Date().toISOString(),
      input: { userId: input.userId },
    });

    const sessionStartTime = Date.now();
    const session = await DBOS.runStep(
      async () => {
        return await sessionsRepo.create({
          user_id: input.userId,
          technology: input.technology || null,
          state: { workflow: 'DocumentToStories', step: 'initialized' },
          context: { documentPath: input.documentPath },
          expires_at: null,
          metadata: { workflowId: DBOS.workflowID },
          total_messages: 0,
          total_input_tokens: 0,
          total_output_tokens: 0,
          total_cache_creation_tokens: 0,
          total_cache_read_tokens: 0,
          total_cost_usd: 0,
        });
      },
      { name: 'createSession' }
    );

    await DBOS.setEvent('step:createSession:completed', {
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - sessionStartTime,
      output: { sessionId: session.id },
    });

    DBOS.logger.info(`[DocumentToStories] Created session: ${session.id}`);

    // Step 1: Intake
    await DBOS.setEvent('step:intakeStep:started', {
      timestamp: new Date().toISOString(),
      input: { documentLength: input.documentContent.length },
    });

    // Set workflow context for cost attribution
    setWorkflowStepContext('intakeStep');

    const intakeStartTime = Date.now();
    const intakeResult = await DBOS.runStep(
      () => intakeStep(session.id, input.documentContent),
      { name: 'intakeStep' }
    );

    // Clear workflow context after step completes
    clearWorkflowContext();

    const intakeDuration = Date.now() - intakeStartTime;
    const intakeOutput = typeof intakeResult.output === 'string'
      ? intakeResult.output.substring(0, 200)
      : JSON.stringify(intakeResult.output).substring(0, 200);

    await DBOS.setEvent('step:intakeStep:completed', {
      timestamp: new Date().toISOString(),
      durationMs: intakeDuration,
      output: intakeOutput,
      cost: {
        tokensUsed: intakeResult.tokensUsed,
        costUsd: intakeResult.costUsd,
      },
    });

    // Broadcast SSE event to connected clients
    await broadcastWorkflowEvent(
      DBOS.workflowID,
      'intakeStep',
      'step:completed',
      {
        output: intakeOutput,
        tokensUsed: intakeResult.tokensUsed,
        costUsd: intakeResult.costUsd,
      },
      intakeDuration
    );

    // Step 2: Ideation
    await DBOS.setEvent('step:ideationStep:started', {
      timestamp: new Date().toISOString(),
      input: { hasIntakeResult: !!intakeResult.output },
    });

    // Set workflow context for cost attribution
    setWorkflowStepContext('ideationStep');

    const ideationStartTime = Date.now();
    const ideationResult = await DBOS.runStep(
      () => ideationStep(session.id, intakeResult.output),
      { name: 'ideationStep' }
    );

    // Clear workflow context after step completes
    clearWorkflowContext();

    const ideationDuration = Date.now() - ideationStartTime;
    const ideationOutput = typeof ideationResult.output === 'string'
      ? ideationResult.output.substring(0, 200)
      : JSON.stringify(ideationResult.output).substring(0, 200);

    await DBOS.setEvent('step:ideationStep:completed', {
      timestamp: new Date().toISOString(),
      durationMs: ideationDuration,
      output: ideationOutput,
      cost: {
        tokensUsed: ideationResult.tokensUsed,
        costUsd: ideationResult.costUsd,
      },
    });

    // Broadcast SSE event to connected clients
    await broadcastWorkflowEvent(
      DBOS.workflowID,
      'ideationStep',
      'step:completed',
      {
        output: ideationOutput,
        tokensUsed: ideationResult.tokensUsed,
        costUsd: ideationResult.costUsd,
      },
      ideationDuration
    );

    // Step 3: Product Owner
    await DBOS.setEvent('step:productOwnerStep:started', {
      timestamp: new Date().toISOString(),
      input: { hasIdeationResult: !!ideationResult.output },
    });

    // Set workflow context for cost attribution
    setWorkflowStepContext('productOwnerStep');

    const productOwnerStartTime = Date.now();
    const productOwnerResult = await DBOS.runStep(
      () => productOwnerStep(session.id, ideationResult.output),
      { name: 'productOwnerStep' }
    );

    // Clear workflow context after step completes
    clearWorkflowContext();

    const productOwnerDuration = Date.now() - productOwnerStartTime;
    const productOwnerOutput = typeof productOwnerResult.output === 'string'
      ? productOwnerResult.output.substring(0, 200)
      : JSON.stringify(productOwnerResult.output).substring(0, 200);

    await DBOS.setEvent('step:productOwnerStep:completed', {
      timestamp: new Date().toISOString(),
      durationMs: productOwnerDuration,
      output: productOwnerOutput,
      cost: {
        tokensUsed: productOwnerResult.tokensUsed,
        costUsd: productOwnerResult.costUsd,
      },
    });

    // Broadcast SSE event to connected clients
    await broadcastWorkflowEvent(
      DBOS.workflowID,
      'productOwnerStep',
      'step:completed',
      {
        output: productOwnerOutput,
        tokensUsed: productOwnerResult.tokensUsed,
        costUsd: productOwnerResult.costUsd,
      },
      productOwnerDuration
    );

    // Extract story IDs and count
    const storyIds = Array.isArray(productOwnerResult.output?.stories)
      ? productOwnerResult.output.stories.map((s: any) => s.storyId || s.story_id || s.id)
      : [];

    DBOS.logger.info(
      `[DocumentToStories] Workflow completed: ${storyIds.length} stories created`
    );

    // Close SSE subscriptions on successful completion
    closeWorkflowSubscriptions(DBOS.workflowID);

    return {
      success: true,
      sessionId: session.id,
      extractedRequirements: intakeResult.output,
      epicsAndStories: ideationResult.output,
      prioritizedStories: productOwnerResult.output,
      storiesCreated: storyIds.length,
      storyIds,
    };
  } catch (error) {
    await DBOS.setEvent('workflow:error', {
      timestamp: new Date().toISOString(),
      error: (error as Error).message,
      stackTrace: (error as Error).stack,
    });

    // Broadcast error event to connected clients
    await broadcastWorkflowEvent(
      DBOS.workflowID,
      'workflow',
      'workflow:error',
      {
        error: (error as Error).message,
      }
    );

    // Close SSE subscriptions on error
    closeWorkflowSubscriptions(DBOS.workflowID);

    DBOS.logger.error(`[DocumentToStories] Workflow failed: ${(error as Error).message}`);
    throw error;
  }
}

// ============================================================================
// Register Workflow
// ============================================================================

/**
 * Registered workflow - use this to start the workflow
 *
 * Example usage:
 * ```typescript
 * const result = await documentToStoriesWorkflow({
 *   userId: 'user-123',
 *   documentPath: '/path/to/doc.pdf',
 *   documentContent: '...',
 *   technology: 'nodejs'
 * });
 * ```
 */
export const documentToStoriesWorkflow = safeRegisterWorkflow(
  'documentToStoriesWorkflow',
  documentToStoriesWorkflowFunction
);

// ============================================================================
// Background Execution
// ============================================================================

/**
 * Start workflow in background
 * Returns a handle that can be used to check status or get results
 *
 * Example usage:
 * ```typescript
 * const handle = await startDocumentToStoriesWorkflow({
 *   userId: 'user-123',
 *   documentPath: '/path/to/doc.pdf',
 *   documentContent: '...'
 * });
 *
 * // Later, get the result:
 * const result = await handle.getResult();
 * ```
 */
export async function startDocumentToStoriesWorkflow(input: DocumentToStoriesInput) {
  return await DBOS.startWorkflow(documentToStoriesWorkflow)(input);
}
