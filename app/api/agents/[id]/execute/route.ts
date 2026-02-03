/**
 * Agent Execution API Route
 * POST /api/agents/[id]/execute - Execute an agent
 */

import { NextRequest, NextResponse } from 'next/server';
import { agentDefinitionsRepo, sessionsRepo } from '@/lib/db/repositories';
import { getAgentExecutor } from '@/lib/agents';
import { RateLimitError } from '@/lib/errors/RateLimitError';

/**
 * POST /api/agents/[id]/execute
 * Execute an agent with input
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validate required fields
    if (!body.input) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required field: input',
        },
        { status: 400 }
      );
    }

    // Get agent
    const agent = await agentDefinitionsRepo.findById(id);
    if (!agent) {
      return NextResponse.json(
        {
          success: false,
          error: 'Agent not found',
        },
        { status: 404 }
      );
    }

    // Get or create session
    let sessionId = body.sessionId;
    if (!sessionId) {
      const session = await sessionsRepo.create({
        user_id: body.userId || 'anonymous',
        technology: body.technology || null,
        state: {},
        context: { agentId: id },
        expires_at: null,
        metadata: {},
        total_messages: 0,
        total_input_tokens: 0,
        total_output_tokens: 0,
        total_cache_creation_tokens: 0,
        total_cache_read_tokens: 0,
        total_cost_usd: 0,
      });
      sessionId = session.id;
    }

    // Execute agent
    const executor = getAgentExecutor();
    const result = await executor.execute(agent.agent_name, body.input, {
      sessionId,
      userId: body.userId,
      includeHistory: body.includeHistory || false,
      maxHistoryMessages: body.maxHistoryMessages || 10,
      metadata: body.metadata,
    });

    return NextResponse.json({
      success: result.success,
      data: {
        output: result.output,
        tokensUsed: result.tokensUsed,
        model: result.model,
        agentName: result.agentName,
        executionTime: result.executionTime,
        sessionId,
      },
      error: result.error,
    });
  } catch (error) {
    console.error('[API] Error executing agent:', error);

    // Handle rate limit errors with 429 status
    if (error instanceof RateLimitError) {
      return NextResponse.json(error.toJSON(), { status: 429 });
    }

    // Handle other errors with 500 status
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to execute agent',
      },
      { status: 500 }
    );
  }
}
