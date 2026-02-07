/**
 * Agents API Routes
 * GET /api/agents - List all agents
 * POST /api/agents - Register new agent
 */

import { NextRequest, NextResponse } from 'next/server';
import { agentDefinitionsRepo } from '@/lib/db/repositories';
import type { AgentDefinitionInsert } from '@/lib/db/types';

/**
 * GET /api/agents
 * List all agents with optional filters
 * Query params:
 * - withModels: Include model and provider information (default: false)
 * - category: Filter by category
 * - technology: Filter by technology
 * - isEnabled: Filter by enabled status
 * - isCore: Filter by core status
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || undefined;
    const technology = searchParams.get('technology') || undefined;
    const isEnabled = searchParams.get('isEnabled') === 'true' ? true : undefined;
    const isCore = searchParams.get('isCore') === 'true' ? true : undefined;
    const withModels = searchParams.get('withModels') === 'true';

    const filters = {
      category: category as any,
      technology: technology === 'null' ? null : technology,
      isEnabled,
      isCore,
    };

    // Use listWithModels if requested, otherwise use regular list
    const agents = withModels
      ? await agentDefinitionsRepo.listWithModels(filters)
      : await agentDefinitionsRepo.list(filters);

    return NextResponse.json({
      success: true,
      data: agents,
      count: agents.length,
    });
  } catch (error) {
    console.error('[API] Error listing agents:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list agents',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/agents
 * Register a new agent
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const required = ['agent_name', 'display_name', 'category', 'system_prompt'];
    for (const field of required) {
      if (!body[field]) {
        return NextResponse.json(
          {
            success: false,
            error: `Missing required field: ${field}`,
          },
          { status: 400 }
        );
      }
    }

    // Validate model_id if provided
    if (!body.model_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required field: model_id',
        },
        { status: 400 }
      );
    }

    // Create agent
    const agentData: AgentDefinitionInsert = {
      agent_name: body.agent_name,
      display_name: body.display_name,
      description: body.description || null,
      category: body.category,
      technology: body.technology || null,
      system_prompt: body.system_prompt,
      model_id: body.model_id,
      max_tokens: body.max_tokens || 4096,
      temperature: body.temperature || 0.7,
      tools: body.tools || [],
      capabilities: body.capabilities || {},
      is_core: body.is_core || false,
      is_enabled: body.is_enabled !== undefined ? body.is_enabled : true,
      version: body.version || '1.0.0',
    };

    const agent = await agentDefinitionsRepo.create(agentData);

    return NextResponse.json(
      {
        success: true,
        data: agent,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[API] Error creating agent:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create agent',
      },
      { status: 500 }
    );
  }
}
