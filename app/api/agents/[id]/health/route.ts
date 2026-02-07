/**
 * Agent Health API Route
 * GET /api/agents/[id]/health - Get agent health status
 */

import { NextRequest, NextResponse } from 'next/server';
import { agentDefinitionsRepo, agentHealthRepo } from '@/lib/db/repositories';

/**
 * GET /api/agents/[id]/health
 * Get agent health status
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verify agent exists
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

    // Get or create health record
    const health = await agentHealthRepo.getOrCreate(id);

    // Calculate metrics
    const successRate =
      health.total_requests > 0
        ? ((health.total_requests - health.failed_requests) / health.total_requests) * 100
        : 100;

    const avgResponseTime = health.response_time_ms || 0;

    return NextResponse.json({
      success: true,
      data: {
        agentId: id,
        agentName: agent.agent_name,
        status: health.status,
        lastHealthCheck: health.last_health_check,
        metrics: {
          totalRequests: health.total_requests,
          failedRequests: health.failed_requests,
          successRate: successRate.toFixed(2) + '%',
          totalTokensUsed: health.total_tokens_used,
          avgResponseTime: avgResponseTime,
        },
        errorMessage: health.error_message,
      },
    });
  } catch (error) {
    console.error('[API] Error getting agent health:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get agent health',
      },
      { status: 500 }
    );
  }
}
