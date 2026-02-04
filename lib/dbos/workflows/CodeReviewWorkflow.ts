/**
 * Code Review Workflow
 * Comprehensive code review: CodeReviewer → Security → TestGenerator
 */

import { DBOS } from '@dbos-inc/dbos-sdk';
import { AgentExecutor } from '@/lib/agents/AgentExecutor';
import { sessionsRepo } from '@/lib/db/repositories';
import { safeRegisterWorkflow } from '../workflowRegistration';
import { setWorkflowStepContext, clearWorkflowContext } from './eventHelpers';

export interface CodeReviewInput {
  userId: string;
  code: string;
  filePath: string;
  language: string;
  context?: string;
}

export interface CodeReviewOutput {
  success: boolean;
  review?: {
    codeQuality: string;
    securityFindings: string;
    suggestedTests: string;
    overallScore: string;
  };
  error?: string;
}

/**
 * Code Quality Review Step
 */
async function codeReviewStep(
  sessionId: string,
  code: string,
  filePath: string,
  language: string
): Promise<any> {
  const executor = new AgentExecutor();

  const input = `Review the following ${language} code for quality, maintainability, and best practices:

File: ${filePath}

\`\`\`${language}
${code}
\`\`\`

Provide detailed feedback on:
- Code structure and organization
- Naming conventions
- Performance considerations
- Best practices adherence
- Potential bugs or issues`;

  const result = await executor.execute('dmas-code-reviewer', input, {
    sessionId,
    userId: 'workflow-system',
  });

  return result;
}

/**
 * Security Review Step
 */
async function securityReviewStep(
  sessionId: string,
  code: string,
  language: string
): Promise<any> {
  const executor = new AgentExecutor();

  const input = `Perform a security audit on the following ${language} code:

\`\`\`${language}
${code}
\`\`\`

Check for:
- SQL injection vulnerabilities
- XSS vulnerabilities
- Authentication/authorization issues
- Insecure data handling
- OWASP Top 10 vulnerabilities
- Security best practices

Provide a detailed security report with severity levels.`;

  const result = await executor.execute('dmas-security-auditor', input, {
    sessionId,
    userId: 'workflow-system',
  });

  return result;
}

/**
 * Test Generation Step
 */
async function testGenerationStep(
  sessionId: string,
  code: string,
  language: string
): Promise<any> {
  const executor = new AgentExecutor();

  const input = `Generate comprehensive tests for the following ${language} code:

\`\`\`${language}
${code}
\`\`\`

Generate:
- Unit tests
- Edge case tests
- Error handling tests
- Integration test suggestions

Use appropriate testing framework for ${language}.`;

  const result = await executor.execute('dmas-test-generator', input, {
    sessionId,
    userId: 'workflow-system',
  });

  return result;
}

/**
 * Main Workflow Function
 */
async function codeReviewWorkflowFunction(
  input: CodeReviewInput
): Promise<CodeReviewOutput> {
  try {
    // Create session for this workflow
    await DBOS.setEvent('step:createSession:started', {
      timestamp: new Date().toISOString(),
      input: { userId: input.userId, filePath: input.filePath },
    });

    const sessionStartTime = Date.now();
    const session = await DBOS.runStep(
      () =>
        sessionsRepo.create({
          user_id: input.userId,
          technology: input.language,
          state: { workflow: 'CodeReview', step: 'initialized' },
          context: { filePath: input.filePath },
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

    // Step 1: Code Quality Review
    await DBOS.setEvent('step:codeQualityReview:started', {
      timestamp: new Date().toISOString(),
      input: { codeLength: input.code.length, language: input.language },
    });

    // Set workflow context for cost attribution
    setWorkflowStepContext('codeQualityReview');

    const codeQualityStartTime = Date.now();
    const codeQualityResult = await DBOS.runStep(
      () => codeReviewStep(session.id, input.code, input.filePath, input.language),
      { name: 'codeQualityReview' }
    );

    // Clear workflow context after step completes
    clearWorkflowContext();

    if (!codeQualityResult.success) {
      await DBOS.setEvent('step:codeQualityReview:failed', {
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - codeQualityStartTime,
        error: codeQualityResult.error || 'Unknown error',
      });
      return {
        success: false,
        error: 'Code quality review failed: ' + (codeQualityResult.error || 'Unknown error'),
      };
    }

    await DBOS.setEvent('step:codeQualityReview:completed', {
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - codeQualityStartTime,
      output: typeof codeQualityResult.output === 'string'
        ? codeQualityResult.output.substring(0, 200)
        : JSON.stringify(codeQualityResult.output).substring(0, 200),
      cost: {
        tokensUsed: codeQualityResult.tokensUsed,
        costUsd: codeQualityResult.costUsd,
      },
    });

    // Step 2: Security Review
    await DBOS.setEvent('step:securityReview:started', {
      timestamp: new Date().toISOString(),
      input: { codeLength: input.code.length, language: input.language },
    });

    // Set workflow context for cost attribution
    setWorkflowStepContext('securityReview');

    const securityStartTime = Date.now();
    const securityResult = await DBOS.runStep(
      () => securityReviewStep(session.id, input.code, input.language),
      { name: 'securityReview' }
    );

    // Clear workflow context after step completes
    clearWorkflowContext();

    if (!securityResult.success) {
      await DBOS.setEvent('step:securityReview:failed', {
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - securityStartTime,
        error: securityResult.error || 'Unknown error',
      });
      return {
        success: false,
        error: 'Security review failed: ' + (securityResult.error || 'Unknown error'),
      };
    }

    await DBOS.setEvent('step:securityReview:completed', {
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - securityStartTime,
      output: typeof securityResult.output === 'string'
        ? securityResult.output.substring(0, 200)
        : JSON.stringify(securityResult.output).substring(0, 200),
      cost: {
        tokensUsed: securityResult.tokensUsed,
        costUsd: securityResult.costUsd,
      },
    });

    // Step 3: Test Generation
    await DBOS.setEvent('step:testGeneration:started', {
      timestamp: new Date().toISOString(),
      input: { codeLength: input.code.length, language: input.language },
    });

    // Set workflow context for cost attribution
    setWorkflowStepContext('testGeneration');

    const testGenStartTime = Date.now();
    const testGenResult = await DBOS.runStep(
      () => testGenerationStep(session.id, input.code, input.language),
      { name: 'testGeneration' }
    );

    // Clear workflow context after step completes
    clearWorkflowContext();

    if (!testGenResult.success) {
      await DBOS.setEvent('step:testGeneration:failed', {
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - testGenStartTime,
        error: testGenResult.error || 'Unknown error',
      });
      return {
        success: false,
        error: 'Test generation failed: ' + (testGenResult.error || 'Unknown error'),
      };
    }

    await DBOS.setEvent('step:testGeneration:completed', {
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - testGenStartTime,
      output: typeof testGenResult.output === 'string'
        ? testGenResult.output.substring(0, 200)
        : JSON.stringify(testGenResult.output).substring(0, 200),
      cost: {
        tokensUsed: testGenResult.tokensUsed,
        costUsd: testGenResult.costUsd,
      },
    });

    // Calculate overall score based on reviews
    const overallScore = 'Review complete - check individual sections for details';

    return {
      success: true,
      review: {
        codeQuality: codeQualityResult.output,
        securityFindings: securityResult.output,
        suggestedTests: testGenResult.output,
        overallScore,
      },
    };
  } catch (error) {
    await DBOS.setEvent('workflow:error', {
      timestamp: new Date().toISOString(),
      error: (error as Error).message,
      stackTrace: (error as Error).stack,
    });
    console.error('[CodeReviewWorkflow] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Register the workflow
export const codeReviewWorkflow = safeRegisterWorkflow(
  'codeReviewWorkflow',
  codeReviewWorkflowFunction
);

/**
 * Start workflow in background
 */
export async function startCodeReviewWorkflow(input: CodeReviewInput) {
  return await DBOS.startWorkflow(codeReviewWorkflow)(input);
}
