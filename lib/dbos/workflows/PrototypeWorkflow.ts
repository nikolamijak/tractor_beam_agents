/**
 * Prototype Development Workflow
 * Rapid prototyping: Prototype → Product → Developer → QA
 */

import { DBOS } from '@dbos-inc/dbos-sdk';
import { AgentExecutor } from '@/lib/agents/AgentExecutor';
import { sessionsRepo } from '@/lib/db/repositories';
import { safeRegisterWorkflow } from '../workflowRegistration';
import { setWorkflowStepContext, clearWorkflowContext } from './eventHelpers';

export interface PrototypeInput {
  userId: string;
  idea: string;
  targetMarket?: string;
  constraints?: string;
  technology: string;
}

export interface PrototypeOutput {
  success: boolean;
  prototype?: {
    concept: string;
    productSpec: string;
    mvpCode: string;
    validationResults: string;
  };
  error?: string;
}

/**
 * Prototype Concept Step
 */
async function prototypeConceptStep(
  sessionId: string,
  idea: string,
  targetMarket?: string,
  constraints?: string
): Promise<any> {
  const executor = new AgentExecutor();

  const input = `Create a rapid prototype concept for the following idea:

Idea: ${idea}
${targetMarket ? `Target Market: ${targetMarket}` : ''}
${constraints ? `Constraints: ${constraints}` : ''}

Provide:
- Core feature set for MVP
- User stories
- Technical architecture outline
- Success metrics`;

  const result = await executor.execute('dmas-prototype', input, {
    sessionId,
    userId: 'workflow-system',
  });

  return result;
}

/**
 * Product Specification Step
 */
async function productSpecStep(
  sessionId: string,
  prototypeConcept: string
): Promise<any> {
  const executor = new AgentExecutor();

  const input = `Based on this prototype concept, create detailed product specifications:

${prototypeConcept}

Provide:
- Detailed feature specifications
- User experience flow
- Technical requirements
- Risk assessment
- Go-to-market considerations`;

  const result = await executor.execute('dmas-product', input, {
    sessionId,
    userId: 'workflow-system',
  });

  return result;
}

/**
 * MVP Development Step
 */
async function mvpDevelopmentStep(
  sessionId: string,
  productSpec: string,
  technology: string
): Promise<any> {
  const executor = new AgentExecutor();

  const input = `Implement an MVP based on these specifications:

${productSpec}

Technology: ${technology}

Generate:
- Core implementation code
- Basic UI/UX components
- Essential API endpoints
- Configuration files`;

  const result = await executor.execute('dmas-developer', input, {
    sessionId,
    userId: 'workflow-system',
  });

  return result;
}

/**
 * MVP Validation Step
 */
async function mvpValidationStep(
  sessionId: string,
  mvpCode: string
): Promise<any> {
  const executor = new AgentExecutor();

  const input = `Validate this MVP implementation:

${mvpCode}

Provide:
- Functionality assessment
- Quality checks
- Critical issues to address
- Testing recommendations`;

  const result = await executor.execute('dmas-qa', input, {
    sessionId,
    userId: 'workflow-system',
  });

  return result;
}

/**
 * Main Workflow Function
 */
async function prototypeWorkflowFunction(
  input: PrototypeInput
): Promise<PrototypeOutput> {
  try {
    // Create session for this workflow
    await DBOS.setEvent('step:createSession:started', {
      timestamp: new Date().toISOString(),
      input: { userId: input.userId, idea: input.idea.substring(0, 100) },
    });

    const sessionStartTime = Date.now();
    const session = await DBOS.runStep(
      () =>
        sessionsRepo.create({
          user_id: input.userId,
          technology: input.technology,
          state: { workflow: 'Prototype', step: 'initialized' },
          context: { idea: input.idea },
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

    // Step 1: Prototype Concept
    await DBOS.setEvent('step:prototypeConceptStep:started', {
      timestamp: new Date().toISOString(),
      input: { hasIdea: !!input.idea, hastargetMarket: !!input.targetMarket },
    });

    // Set workflow context for cost attribution
    setWorkflowStepContext('prototypeConceptStep');

    const conceptStartTime = Date.now();
    const conceptResult = await DBOS.runStep(
      () =>
        prototypeConceptStep(
          session.id,
          input.idea,
          input.targetMarket,
          input.constraints
        ),
      { name: 'prototypeConceptStep' }
    );

    // Clear workflow context after step completes
    clearWorkflowContext();

    if (!conceptResult.success) {
      await DBOS.setEvent('step:prototypeConceptStep:failed', {
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - conceptStartTime,
        error: conceptResult.error || 'Unknown error',
      });
      return {
        success: false,
        error: 'Prototype concept step failed: ' + (conceptResult.error || 'Unknown error'),
      };
    }

    await DBOS.setEvent('step:prototypeConceptStep:completed', {
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - conceptStartTime,
      output: typeof conceptResult.output === 'string'
        ? conceptResult.output.substring(0, 200)
        : JSON.stringify(conceptResult.output).substring(0, 200),
      cost: {
        tokensUsed: conceptResult.tokensUsed,
        costUsd: conceptResult.costUsd,
      },
    });

    // Step 2: Product Specification
    await DBOS.setEvent('step:productSpecStep:started', {
      timestamp: new Date().toISOString(),
      input: { hasConceptResult: !!conceptResult.output },
    });

    // Set workflow context for cost attribution
    setWorkflowStepContext('productSpecStep');

    const productSpecStartTime = Date.now();
    const productSpecResult = await DBOS.runStep(
      () => productSpecStep(session.id, conceptResult.output),
      { name: 'productSpecStep' }
    );

    // Clear workflow context after step completes
    clearWorkflowContext();

    if (!productSpecResult.success) {
      await DBOS.setEvent('step:productSpecStep:failed', {
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - productSpecStartTime,
        error: productSpecResult.error || 'Unknown error',
      });
      return {
        success: false,
        error: 'Product specification step failed: ' + (productSpecResult.error || 'Unknown error'),
      };
    }

    await DBOS.setEvent('step:productSpecStep:completed', {
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - productSpecStartTime,
      output: typeof productSpecResult.output === 'string'
        ? productSpecResult.output.substring(0, 200)
        : JSON.stringify(productSpecResult.output).substring(0, 200),
      cost: {
        tokensUsed: productSpecResult.tokensUsed,
        costUsd: productSpecResult.costUsd,
      },
    });

    // Step 3: MVP Development
    await DBOS.setEvent('step:mvpDevelopmentStep:started', {
      timestamp: new Date().toISOString(),
      input: { hasProductSpec: !!productSpecResult.output, technology: input.technology },
    });

    // Set workflow context for cost attribution
    setWorkflowStepContext('mvpDevelopmentStep');

    const mvpStartTime = Date.now();
    const mvpResult = await DBOS.runStep(
      () => mvpDevelopmentStep(session.id, productSpecResult.output, input.technology),
      { name: 'mvpDevelopmentStep' }
    );

    // Clear workflow context after step completes
    clearWorkflowContext();

    if (!mvpResult.success) {
      await DBOS.setEvent('step:mvpDevelopmentStep:failed', {
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - mvpStartTime,
        error: mvpResult.error || 'Unknown error',
      });
      return {
        success: false,
        error: 'MVP development step failed: ' + (mvpResult.error || 'Unknown error'),
      };
    }

    await DBOS.setEvent('step:mvpDevelopmentStep:completed', {
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - mvpStartTime,
      output: typeof mvpResult.output === 'string'
        ? mvpResult.output.substring(0, 200)
        : JSON.stringify(mvpResult.output).substring(0, 200),
      cost: {
        tokensUsed: mvpResult.tokensUsed,
        costUsd: mvpResult.costUsd,
      },
    });

    // Step 4: MVP Validation
    await DBOS.setEvent('step:mvpValidationStep:started', {
      timestamp: new Date().toISOString(),
      input: { hasMVPCode: !!mvpResult.output },
    });

    // Set workflow context for cost attribution
    setWorkflowStepContext('mvpValidationStep');

    const validationStartTime = Date.now();
    const validationResult = await DBOS.runStep(
      () => mvpValidationStep(session.id, mvpResult.output),
      { name: 'mvpValidationStep' }
    );

    // Clear workflow context after step completes
    clearWorkflowContext();

    if (!validationResult.success) {
      await DBOS.setEvent('step:mvpValidationStep:failed', {
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - validationStartTime,
        error: validationResult.error || 'Unknown error',
      });
      return {
        success: false,
        error: 'MVP validation step failed: ' + (validationResult.error || 'Unknown error'),
      };
    }

    await DBOS.setEvent('step:mvpValidationStep:completed', {
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - validationStartTime,
      output: typeof validationResult.output === 'string'
        ? validationResult.output.substring(0, 200)
        : JSON.stringify(validationResult.output).substring(0, 200),
      cost: {
        tokensUsed: validationResult.tokensUsed,
        costUsd: validationResult.costUsd,
      },
    });

    return {
      success: true,
      prototype: {
        concept: conceptResult.output,
        productSpec: productSpecResult.output,
        mvpCode: mvpResult.output,
        validationResults: validationResult.output,
      },
    };
  } catch (error) {
    await DBOS.setEvent('workflow:error', {
      timestamp: new Date().toISOString(),
      error: (error as Error).message,
      stackTrace: (error as Error).stack,
    });
    console.error('[PrototypeWorkflow] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Register the workflow
export const prototypeWorkflow = safeRegisterWorkflow(
  'prototypeWorkflow',
  prototypeWorkflowFunction
);

/**
 * Start workflow in background
 */
export async function startPrototypeWorkflow(input: PrototypeInput) {
  return await DBOS.startWorkflow(prototypeWorkflow)(input);
}
