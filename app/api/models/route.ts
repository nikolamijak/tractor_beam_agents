import { NextRequest, NextResponse } from 'next/server';
import { modelsRepo } from '@/lib/db/repositories';
import type { ModelInsert } from '@/lib/db/types';

/**
 * GET /api/models
 * List all models with optional filters
 * Query params: providerId, isActive, modelFamily, withProvider
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const providerId = searchParams.get('providerId');
    const isActive = searchParams.get('isActive');
    const modelFamily = searchParams.get('modelFamily');
    const withProvider = searchParams.get('withProvider') === 'true';

    const filters: {
      providerId?: string;
      isActive?: boolean;
      modelFamily?: string;
    } = {};

    if (providerId) filters.providerId = providerId;
    if (isActive !== null) filters.isActive = isActive === 'true';
    if (modelFamily) filters.modelFamily = modelFamily;

    const models = withProvider
      ? await modelsRepo.listWithProvider(filters)
      : await modelsRepo.list(filters);

    return NextResponse.json({
      success: true,
      data: models,
      count: models.length,
    });
  } catch (error) {
    console.error('[GET /api/models] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch models',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/models
 * Create a new model
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.provider_id || !body.model_name || !body.display_name || !body.pricing) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: provider_id, model_name, display_name, pricing',
        },
        { status: 400 }
      );
    }

    // Build model insert object
    const modelData: ModelInsert = {
      provider_id: body.provider_id,
      model_name: body.model_name,
      display_name: body.display_name,
      description: body.description || null,
      model_family: body.model_family || null,
      is_active: body.is_active ?? true,
      is_recommended: body.is_recommended ?? false,
      capabilities: body.capabilities || {},
      max_tokens: body.max_tokens || null,
      context_window: body.context_window || null,
      supports_streaming: body.supports_streaming ?? false,
      supports_function_calling: body.supports_function_calling ?? false,
      supports_vision: body.supports_vision ?? false,
      supports_prompt_caching: body.supports_prompt_caching ?? false,
      pricing: body.pricing,
      performance_tier: body.performance_tier || null,
      avg_latency_ms: body.avg_latency_ms || null,
      release_date: body.release_date || null,
      deprecation_date: body.deprecation_date || null,
      metadata: body.metadata || {},
    };

    const model = await modelsRepo.create(modelData);

    return NextResponse.json(
      {
        success: true,
        data: model,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[POST /api/models] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create model',
      },
      { status: 500 }
    );
  }
}
