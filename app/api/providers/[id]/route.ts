import { NextRequest, NextResponse } from 'next/server';
import { providersRepo } from '@/lib/db/repositories';
import type { ProviderUpdate } from '@/lib/db/types';

/**
 * GET /api/providers/[id]
 * Get provider details by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const provider = await providersRepo.findById(id);

    if (!provider) {
      return NextResponse.json(
        {
          success: false,
          error: 'Provider not found',
        },
        { status: 404 }
      );
    }

    // Mask API key in response
    const maskedProvider = {
      ...provider,
      api_key: provider.api_key ? `••••••••${provider.api_key.slice(-4)}` : null,
      api_key_encrypted: provider.api_key_encrypted ? '••••••••' : null,
    };

    return NextResponse.json({
      success: true,
      data: maskedProvider,
    });
  } catch (error) {
    console.error('[GET /api/providers/[id]] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch provider',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/providers/[id]
 * Update provider
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Build update object (only include provided fields)
    const updates: ProviderUpdate = {
      updated_at: new Date(),
    };

    if (body.display_name !== undefined) updates.display_name = body.display_name;
    if (body.provider_type !== undefined) updates.provider_type = body.provider_type;
    if (body.api_base_url !== undefined) updates.api_base_url = body.api_base_url;
    if (body.auth_type !== undefined) updates.auth_type = body.auth_type;
    if (body.api_key !== undefined) {
      updates.api_key = body.api_key;
      updates.api_key_last_rotated = new Date(); // Track key rotation
    }
    if (body.is_active !== undefined) updates.is_active = body.is_active;
    if (body.is_default !== undefined) updates.is_default = body.is_default;
    if (body.supports_streaming !== undefined) updates.supports_streaming = body.supports_streaming;
    if (body.supports_function_calling !== undefined) updates.supports_function_calling = body.supports_function_calling;
    if (body.supports_vision !== undefined) updates.supports_vision = body.supports_vision;
    if (body.configuration !== undefined) updates.configuration = body.configuration;
    if (body.metadata !== undefined) updates.metadata = body.metadata;

    const provider = await providersRepo.update(id, updates);

    if (!provider) {
      return NextResponse.json(
        {
          success: false,
          error: 'Provider not found',
        },
        { status: 404 }
      );
    }

    // Mask API key in response
    const maskedProvider = {
      ...provider,
      api_key: provider.api_key ? `••••••••${provider.api_key.slice(-4)}` : null,
      api_key_encrypted: provider.api_key_encrypted ? '••••••••' : null,
    };

    return NextResponse.json({
      success: true,
      data: maskedProvider,
    });
  } catch (error) {
    console.error('[PUT /api/providers/[id]] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update provider',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/providers/[id]
 * Delete provider (cascades to models)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = await providersRepo.delete(id);

    if (!deleted) {
      return NextResponse.json(
        {
          success: false,
          error: 'Provider not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Provider deleted successfully',
    });
  } catch (error) {
    console.error('[DELETE /api/providers/[id]] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete provider',
      },
      { status: 500 }
    );
  }
}
