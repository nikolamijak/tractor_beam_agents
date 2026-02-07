import { NextRequest, NextResponse } from 'next/server';
import { providersRepo, modelsRepo } from '@/lib/db/repositories';

/**
 * GET /api/models/by-provider/[providerName]
 * Get models by provider name
 * Query params: isActive (boolean)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ providerName: string }> }
) {
  try {
    const { providerName } = await params;
    const searchParams = request.nextUrl.searchParams;
    const isActive = searchParams.get('isActive');

    // Find provider by name
    const provider = await providersRepo.findByName(providerName);
    if (!provider) {
      return NextResponse.json(
        {
          success: false,
          error: `Provider "${providerName}" not found`,
        },
        { status: 404 }
      );
    }

    // Get models for this provider
    const filters: { providerId: string; isActive?: boolean } = {
      providerId: provider.id,
    };

    if (isActive !== null) {
      filters.isActive = isActive === 'true';
    }

    const models = await modelsRepo.list(filters);

    return NextResponse.json({
      success: true,
      data: {
        provider,
        models,
      },
      count: models.length,
    });
  } catch (error) {
    console.error('[GET /api/models/by-provider/[providerName]] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch models',
      },
      { status: 500 }
    );
  }
}
