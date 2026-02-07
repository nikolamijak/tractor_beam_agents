import { NextRequest, NextResponse } from 'next/server';
import { sessionsRepo } from '@/lib/db/repositories';
import { db } from '@/lib/db/client';

/**
 * GET /api/sessions/[id]/cost
 * Get session cost breakdown
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get session
    const session = await sessionsRepo.findById(id);
    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: 'Session not found',
        },
        { status: 404 }
      );
    }

    // Get cost breakdown by agent
    const costByAgentResult = await db.raw(
      `SELECT
        ad.agent_name,
        ad.display_name,
        COUNT(*) as message_count,
        SUM(am.input_tokens) as total_input_tokens,
        SUM(am.output_tokens) as total_output_tokens,
        SUM(am.cache_creation_tokens) as total_cache_creation_tokens,
        SUM(am.cache_read_tokens) as total_cache_read_tokens,
        SUM(am.total_cost_usd) as total_cost
      FROM agent_messages am
      INNER JOIN agent_definitions ad ON am.agent_definition_id = ad.id
      WHERE am.session_id = ?
      GROUP BY ad.id, ad.agent_name, ad.display_name
      ORDER BY total_cost DESC`,
      [id]
    );

    return NextResponse.json({
      success: true,
      data: {
        session_id: session.id,
        total_messages: session.total_messages,
        total_input_tokens: session.total_input_tokens,
        total_output_tokens: session.total_output_tokens,
        total_cache_creation_tokens: session.total_cache_creation_tokens,
        total_cache_read_tokens: session.total_cache_read_tokens,
        total_cost_usd: session.total_cost_usd,
        cache_savings_usd:
          (session.total_cache_read_tokens * 2.7) / 1_000_000, // Approximate savings
        cost_by_agent: costByAgentResult.rows,
      },
    });
  } catch (error) {
    console.error('[GET /api/sessions/[id]/cost] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch session cost',
      },
      { status: 500 }
    );
  }
}
