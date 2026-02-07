import { NextRequest, NextResponse } from 'next/server';
import { providersRepo } from '@/lib/db/repositories';

/**
 * POST /api/providers/[id]/set-default
 * Set provider as default (unsets all others)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const provider = await providersRepo.setDefault(id);

    if (!provider) {
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
      data: provider,
      message: `${provider.display_name} set as default provider`,
    });
  } catch (error) {
    console.error('[POST /api/providers/[id]/set-default] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to set default provider',
      },
      { status: 500 }
    );
  }
}
