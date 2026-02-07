/**
 * Individual Workflow API Routes
 * GET /api/workflows/[id] - Get workflow status and results
 */

import { NextRequest, NextResponse } from 'next/server';
import { DBOS } from '@dbos-inc/dbos-sdk';

/**
 * GET /api/workflows/[id]
 * Get workflow status and results
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Retrieve workflow handle from DBOS
    const handle = DBOS.retrieveWorkflow(id);
    const status = await handle.getStatus();

    if (!status) {
      return NextResponse.json(
        {
          success: false,
          error: 'Workflow not found',
        },
        { status: 404 }
      );
    }

    // Check if workflow is complete
    let result = null;
    if (status.status === 'SUCCESS') {
      try {
        result = await handle.getResult();
      } catch (error) {
        console.error('[API] Error getting workflow result:', error);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        workflowId: status.workflowID,
        workflowName: status.workflowName,
        status: status.status,
        createdAt: new Date(status.createdAt).toISOString(),
        updatedAt: status.updatedAt
          ? new Date(status.updatedAt).toISOString()
          : null,
        result,
        error: status.error,
      },
    });
  } catch (error) {
    console.error('[API] Error getting workflow:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get workflow',
      },
      { status: 500 }
    );
  }
}
