/**
 * Workflow Cancel API Route
 * POST /api/workflows/[id]/cancel - Cancel a running workflow
 */

import { NextRequest, NextResponse } from 'next/server';
import { DBOS } from '@dbos-inc/dbos-sdk';

/**
 * POST /api/workflows/[id]/cancel
 * Cancel a running workflow
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Cancel workflow using DBOS
    await DBOS.cancelWorkflow(id);

    return NextResponse.json({
      success: true,
      message: 'Workflow cancelled successfully',
      workflowId: id,
    });
  } catch (error) {
    console.error('[API] Error cancelling workflow:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel workflow',
      },
      { status: 500 }
    );
  }
}
