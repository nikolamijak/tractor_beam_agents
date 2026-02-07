import { NextRequest, NextResponse } from 'next/server';
import { providersRepo } from '@/lib/db/repositories';
import type { ProviderInsert } from '@/lib/db/types';

/**
 * GET /api/providers
 * List all providers with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const isActive = searchParams.get('isActive');

    const filters: { isActive?: boolean } = {};
    if (isActive !== null) {
      filters.isActive = isActive === 'true';
    }

    const providers = await providersRepo.list(filters);

    // Mask API keys in response for security
    const maskedProviders = providers.map((provider) => ({
      ...provider,
      api_key: provider.api_key ? `••••••••${provider.api_key.slice(-4)}` : null,
      api_key_encrypted: provider.api_key_encrypted ? '••••••••' : null,
    }));

    return NextResponse.json({
      success: true,
      data: maskedProviders,
      count: maskedProviders.length,
    });
  } catch (error) {
    console.error('[GET /api/providers] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch providers',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/providers
 * Create a new provider
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.provider_name || !body.display_name || !body.provider_type) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: provider_name, display_name, provider_type',
        },
        { status: 400 }
      );
    }

    // Build provider insert object
    const providerData: ProviderInsert = {
      provider_name: body.provider_name,
      display_name: body.display_name,
      provider_type: body.provider_type,
      api_base_url: body.api_base_url || null,
      auth_type: body.auth_type || null,
      api_key: body.api_key || null,
      api_key_encrypted: null, // TODO: Implement encryption
      api_key_last_rotated: body.api_key ? new Date() : null,
      is_active: body.is_active ?? true,
      is_default: body.is_default ?? false,
      supports_streaming: body.supports_streaming ?? false,
      supports_function_calling: body.supports_function_calling ?? false,
      supports_vision: body.supports_vision ?? false,
      configuration: body.configuration || {},
      metadata: body.metadata || {},
    };

    const provider = await providersRepo.create(providerData);

    // Mask API key in response
    const maskedProvider = {
      ...provider,
      api_key: provider.api_key ? `••••••••${provider.api_key.slice(-4)}` : null,
      api_key_encrypted: provider.api_key_encrypted ? '••••••••' : null,
    };

    return NextResponse.json(
      {
        success: true,
        data: maskedProvider,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[POST /api/providers] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create provider',
      },
      { status: 500 }
    );
  }
}
