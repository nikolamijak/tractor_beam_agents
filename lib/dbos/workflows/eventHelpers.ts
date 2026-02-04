/**
 * Event Helpers - Workflow context management
 *
 * Helper functions to set workflow context before step execution.
 * This enables AgentExecutor to track cost attribution by workflow and step.
 *
 * Pattern: Call setWorkflowStepContext before DBOS.runStep,
 *          clearWorkflowContext after step completes.
 */

import { DBOS } from '@dbos-inc/dbos-sdk';
import { getWorkflowContext } from '../../context';

/**
 * Set workflow context before step execution.
 * Call this before DBOS.runStep to ensure AgentExecutor can track cost attribution.
 *
 * Example usage:
 * ```typescript
 * setWorkflowStepContext('intakeStep');
 * const result = await DBOS.runStep(intakeStep, { name: 'intakeStep' }, ...);
 * clearWorkflowContext();
 * ```
 *
 * @param stepName - Name of the workflow step (should match DBOS.runStep name)
 */
export function setWorkflowStepContext(stepName: string): void {
  const workflowCtx = getWorkflowContext();

  // DBOS.workflowID is only available inside workflow context
  const workflowId = DBOS.workflowID;
  if (!workflowId) {
    throw new Error('setWorkflowStepContext must be called from within a DBOS workflow');
  }

  workflowCtx.setContext({
    workflowId: workflowId,
    stepName: stepName,
    startTime: Date.now(),
  });
}

/**
 * Clear workflow context after step completes.
 * Call this after DBOS.runStep finishes (success or failure).
 *
 * Example usage:
 * ```typescript
 * setWorkflowStepContext('intakeStep');
 * const result = await DBOS.runStep(intakeStep, { name: 'intakeStep' }, ...);
 * clearWorkflowContext();
 * ```
 */
export function clearWorkflowContext(): void {
  getWorkflowContext().clearContext();
}
