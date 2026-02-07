/**
 * Workflows API Routes
 * GET /api/workflows - List workflow executions from dbos.workflow_status
 */

import { NextResponse } from 'next/server';
import { getAllWorkflows } from '@/lib/db/workflow-events';
import { convertUnixTimestampToDate } from '@/lib/utils/formatting';
/**
 * GET /api/workflows
 * List all workflow executions from dbos.workflow_status table
 * Query params:
 * - limit: number (default: 50, max: 100)
 * - offset: number (default: 0)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    const workflows = await getAllWorkflows(limit, offset);

    // Map database columns to frontend-friendly format
    const formattedWorkflows = workflows.map(workflow => ({
      id: workflow.workflow_uuid,
      workflowType: workflow.name,
      status: workflow.status,
      createdAt: convertUnixTimestampToDate(workflow.created_at).toISOString(),
      updatedAt: convertUnixTimestampToDate(workflow.updated_at).toISOString(),
      duration: workflow.updated_at - workflow.created_at,
      error: workflow.error,
      output: workflow.output
    }));

    return NextResponse.json({
      success: true,
      data: formattedWorkflows,
      count: formattedWorkflows.length,
      pagination: {
        limit,
        offset,
        hasMore: formattedWorkflows.length === limit
      }
    });
  } catch (error) {
    console.error('[API] Error listing workflows:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list workflows',
      },
      { status: 500 }
    );
  }
}
