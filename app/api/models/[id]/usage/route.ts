import { NextRequest, NextResponse } from 'next/server';
import { agentDefinitionsRepo } from '@/lib/db/repositories';

/**
 * GET /api/models/[id]/usage
 *
 * Check how many agents are using a specific model.
 * Used by the delete confirmation modal to prevent deletion of models in use.
 *
 * Returns:
 * - agentCount: number of agents using this model
 * - agentNames: array of agent display names
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id: modelId } = await params;

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(modelId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid model ID format' },
        { status: 400 }
      );
    }

    // Find all agents using this model
    const agents = await agentDefinitionsRepo.list({ model_id: modelId });

    const agentCount = agents.length;
    const agentNames = agents.map((agent: any) => agent.display_name);

    return NextResponse.json({
      success: true,
      data: {
        agentCount,
        agentNames,
      },
    });
  } catch (error) {
    console.error('Error checking model usage:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to check model usage',
      },
      { status: 500 }
    );
  }
}
