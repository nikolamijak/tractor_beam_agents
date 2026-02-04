/**
 * Story Implementation Workflow
 * Implements a story: Developer → QA → DevOps
 */

import { DBOS } from '@dbos-inc/dbos-sdk';
import { AgentExecutor } from '@/lib/agents/AgentExecutor';
import { sessionsRepo } from '@/lib/db/repositories';
import { safeRegisterWorkflow } from '../workflowRegistration';

export interface StoryImplementationInput {
  userId: string;
  storyId: string;
  storyTitle: string;
  storyDescription: string;
  acceptanceCriteria: string;
  technology: string;
}

export interface StoryImplementationOutput {
  success: boolean;
  storyId: string;
  implementation?: {
    code: string;
    tests: string;
    deployment: string;
  };
  error?: string;
}

/**
 * Developer Step - Generate implementation code
 */
async function developerStep(
  sessionId: string,
  storyInfo: string
): Promise<any> {
  const executor = new AgentExecutor();

  const input = `Implement the following story:\n\n${storyInfo}\n\nGenerate the implementation code following best practices.`;

  const result = await executor.execute('dmas-developer', input, {
    sessionId,
    userId: 'workflow-system',
  });

  return result;
}

/**
 * QA Step - Generate and validate tests
 */
async function qaStep(
  sessionId: string,
  implementationCode: string
): Promise<any> {
  const executor = new AgentExecutor();

  const input = `Review and validate the following implementation:\n\n${implementationCode}\n\nGenerate comprehensive tests and validate the code meets quality standards.`;

  const result = await executor.execute('dmas-qa', input, {
    sessionId,
    userId: 'workflow-system',
  });

  return result;
}

/**
 * DevOps Step - Deployment planning
 */
async function devOpsStep(
  sessionId: string,
  implementationInfo: string
): Promise<any> {
  const executor = new AgentExecutor();

  const input = `Plan deployment for the following implementation:\n\n${implementationInfo}\n\nProvide deployment configuration and rollout strategy.`;

  const result = await executor.execute('dmas-devops', input, {
    sessionId,
    userId: 'workflow-system',
  });

  return result;
}

/**
 * Main Workflow Function
 */
async function storyImplementationWorkflowFunction(
  input: StoryImplementationInput
): Promise<StoryImplementationOutput> {
  try {
    // Create session for this workflow
    await DBOS.setEvent('step:createSession:started', {
      timestamp: new Date().toISOString(),
      input: { userId: input.userId, storyId: input.storyId },
    });

    const sessionStartTime = Date.now();
    const session = await DBOS.runStep(
      () =>
        sessionsRepo.create({
          user_id: input.userId,
          technology: input.technology,
          state: { workflow: 'StoryImplementation', step: 'initialized' },
          context: { storyId: input.storyId },
          expires_at: null,
          metadata: { workflowId: DBOS.workflowID },
          total_messages: 0,
          total_input_tokens: 0,
          total_output_tokens: 0,
          total_cache_creation_tokens: 0,
          total_cache_read_tokens: 0,
          total_cost_usd: 0,
        }),
      { name: 'createSession' }
    );

    await DBOS.setEvent('step:createSession:completed', {
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - sessionStartTime,
      output: { sessionId: session.id },
    });

    // Prepare story information
    const storyInfo = `
Story ID: ${input.storyId}
Title: ${input.storyTitle}
Description: ${input.storyDescription}
Acceptance Criteria: ${input.acceptanceCriteria}
Technology: ${input.technology}
    `.trim();

    // Step 1: Developer - Generate implementation
    await DBOS.setEvent('step:developerStep:started', {
      timestamp: new Date().toISOString(),
      input: { storyId: input.storyId },
    });

    const developerStartTime = Date.now();
    const developerResult = await DBOS.runStep(
      () => developerStep(session.id, storyInfo),
      { name: 'developerStep' }
    );

    if (!developerResult.success) {
      await DBOS.setEvent('step:developerStep:failed', {
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - developerStartTime,
        error: developerResult.error || 'Unknown error',
      });
      return {
        success: false,
        storyId: input.storyId,
        error: 'Developer step failed: ' + (developerResult.error || 'Unknown error'),
      };
    }

    await DBOS.setEvent('step:developerStep:completed', {
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - developerStartTime,
      output: typeof developerResult.output === 'string'
        ? developerResult.output.substring(0, 200)
        : JSON.stringify(developerResult.output).substring(0, 200),
      cost: {
        tokensUsed: developerResult.tokensUsed,
        costUsd: developerResult.costUsd,
      },
    });

    // Step 2: QA - Validate and test
    await DBOS.setEvent('step:qaStep:started', {
      timestamp: new Date().toISOString(),
      input: { hasDeveloperResult: !!developerResult.output },
    });

    const qaStartTime = Date.now();
    const qaResult = await DBOS.runStep(
      () => qaStep(session.id, developerResult.output),
      { name: 'qaStep' }
    );

    if (!qaResult.success) {
      await DBOS.setEvent('step:qaStep:failed', {
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - qaStartTime,
        error: qaResult.error || 'Unknown error',
      });
      return {
        success: false,
        storyId: input.storyId,
        error: 'QA step failed: ' + (qaResult.error || 'Unknown error'),
      };
    }

    await DBOS.setEvent('step:qaStep:completed', {
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - qaStartTime,
      output: typeof qaResult.output === 'string'
        ? qaResult.output.substring(0, 200)
        : JSON.stringify(qaResult.output).substring(0, 200),
      cost: {
        tokensUsed: qaResult.tokensUsed,
        costUsd: qaResult.costUsd,
      },
    });

    // Step 3: DevOps - Deployment planning
    await DBOS.setEvent('step:devOpsStep:started', {
      timestamp: new Date().toISOString(),
      input: { hasQAResult: !!qaResult.output },
    });

    const devOpsStartTime = Date.now();
    const devOpsResult = await DBOS.runStep(
      () => devOpsStep(session.id, `${developerResult.output}\n\nQA Results:\n${qaResult.output}`),
      { name: 'devOpsStep' }
    );

    if (!devOpsResult.success) {
      await DBOS.setEvent('step:devOpsStep:failed', {
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - devOpsStartTime,
        error: devOpsResult.error || 'Unknown error',
      });
      return {
        success: false,
        storyId: input.storyId,
        error: 'DevOps step failed: ' + (devOpsResult.error || 'Unknown error'),
      };
    }

    await DBOS.setEvent('step:devOpsStep:completed', {
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - devOpsStartTime,
      output: typeof devOpsResult.output === 'string'
        ? devOpsResult.output.substring(0, 200)
        : JSON.stringify(devOpsResult.output).substring(0, 200),
      cost: {
        tokensUsed: devOpsResult.tokensUsed,
        costUsd: devOpsResult.costUsd,
      },
    });

    return {
      success: true,
      storyId: input.storyId,
      implementation: {
        code: developerResult.output,
        tests: qaResult.output,
        deployment: devOpsResult.output,
      },
    };
  } catch (error) {
    await DBOS.setEvent('workflow:error', {
      timestamp: new Date().toISOString(),
      error: (error as Error).message,
      stackTrace: (error as Error).stack,
    });
    console.error('[StoryImplementationWorkflow] Error:', error);
    return {
      success: false,
      storyId: input.storyId,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Register the workflow
export const storyImplementationWorkflow = safeRegisterWorkflow(
  'storyImplementationWorkflow',
  storyImplementationWorkflowFunction
);

/**
 * Start workflow in background
 */
export async function startStoryImplementationWorkflow(input: StoryImplementationInput) {
  return await DBOS.startWorkflow(storyImplementationWorkflow)(input);
}
