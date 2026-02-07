/**
 * Individual Agent API Routes
 * GET /api/agents/[id] - Get agent details
 * PUT /api/agents/[id] - Update agent
 * DELETE /api/agents/[id] - Delete agent
 */

import { NextRequest, NextResponse } from 'next/server';
import { agentDefinitionsRepo } from '@/lib/db/repositories';
import type { AgentDefinitionUpdate } from '@/lib/db/types';

/**
 * GET /api/agents/[id]
 * Get agent details by ID
 * Query params:
 * - withModel: Include model and provider information (default: false)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const withModel = searchParams.get('withModel') === 'true';

    const agent = withModel
      ? await agentDefinitionsRepo.findByIdWithModel(id)
      : await agentDefinitionsRepo.findById(id);

    if (!agent) {
      return NextResponse.json(
        {
          success: false,
          error: 'Agent not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: agent,
    });
  } catch (error) {
    console.error('[API] Error getting agent:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get agent',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/agents/[id]
 * Update agent
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Build update object
    const updates: AgentDefinitionUpdate = {
      updated_at: new Date(),
    };

    // Only include fields that are provided
    if (body.display_name !== undefined) updates.display_name = body.display_name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.system_prompt !== undefined) updates.system_prompt = body.system_prompt;
    if (body.model_id !== undefined) updates.model_id = body.model_id;
    if (body.max_tokens !== undefined) updates.max_tokens = body.max_tokens;
    if (body.temperature !== undefined) updates.temperature = body.temperature;
    if (body.tools !== undefined) updates.tools = body.tools;
    if (body.capabilities !== undefined) updates.capabilities = body.capabilities;
    if (body.is_enabled !== undefined) updates.is_enabled = body.is_enabled;
    if (body.version !== undefined) updates.version = body.version;

    const agent = await agentDefinitionsRepo.update(id, updates);

    if (!agent) {
      return NextResponse.json(
        {
          success: false,
          error: 'Agent not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: agent,
    });
  } catch (error) {
    console.error('[API] Error updating agent:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update agent',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/agents/[id]
 * Delete agent
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = await agentDefinitionsRepo.delete(id);

    if (!deleted) {
      return NextResponse.json(
        {
          success: false,
          error: 'Agent not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Agent deleted successfully',
    });
  } catch (error) {
    console.error('[API] Error deleting agent:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete agent',
      },
      { status: 500 }
    );
  }
}
