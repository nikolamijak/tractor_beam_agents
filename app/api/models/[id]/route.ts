import { NextRequest, NextResponse } from 'next/server';
import { modelsRepo } from '@/lib/db/repositories';
import type { ModelUpdate } from '@/lib/db/types';

/**
 * GET /api/models/[id]
 * Get model details by ID
 * Query params: withProvider (boolean)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const withProvider = searchParams.get('withProvider') === 'true';

    const model = withProvider
      ? await modelsRepo.findByIdWithProvider(id)
      : await modelsRepo.findById(id);

    if (!model) {
      return NextResponse.json(
        {
          success: false,
          error: 'Model not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: model,
    });
  } catch (error) {
    console.error('[GET /api/models/[id]] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch model',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/models/[id]
 * Update model
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Build update object (only include provided fields)
    const updates: ModelUpdate = {
      updated_at: new Date(),
    };

    if (body.display_name !== undefined) updates.display_name = body.display_name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.model_family !== undefined) updates.model_family = body.model_family;
    if (body.is_active !== undefined) updates.is_active = body.is_active;
    if (body.is_recommended !== undefined) updates.is_recommended = body.is_recommended;
    if (body.capabilities !== undefined) updates.capabilities = body.capabilities;
    if (body.max_tokens !== undefined) updates.max_tokens = body.max_tokens;
    if (body.context_window !== undefined) updates.context_window = body.context_window;
    if (body.supports_streaming !== undefined) updates.supports_streaming = body.supports_streaming;
    if (body.supports_function_calling !== undefined)
      updates.supports_function_calling = body.supports_function_calling;
    if (body.supports_vision !== undefined) updates.supports_vision = body.supports_vision;
    if (body.supports_prompt_caching !== undefined)
      updates.supports_prompt_caching = body.supports_prompt_caching;
    if (body.pricing !== undefined) updates.pricing = body.pricing;
    if (body.performance_tier !== undefined) updates.performance_tier = body.performance_tier;
    if (body.avg_latency_ms !== undefined) updates.avg_latency_ms = body.avg_latency_ms;
    if (body.release_date !== undefined) updates.release_date = body.release_date;
    if (body.deprecation_date !== undefined) updates.deprecation_date = body.deprecation_date;
    if (body.metadata !== undefined) updates.metadata = body.metadata;

    const model = await modelsRepo.update(id, updates);

    if (!model) {
      return NextResponse.json(
        {
          success: false,
          error: 'Model not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: model,
    });
  } catch (error) {
    console.error('[PUT /api/models/[id]] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update model',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/models/[id]
 * Delete model
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = await modelsRepo.delete(id);

    if (!deleted) {
      return NextResponse.json(
        {
          success: false,
          error: 'Model not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Model deleted successfully',
    });
  } catch (error) {
    console.error('[DELETE /api/models/[id]] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete model',
      },
      { status: 500 }
    );
  }
}
