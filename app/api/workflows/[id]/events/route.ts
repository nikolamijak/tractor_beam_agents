/**
 * Workflow Events API Route
 * GET /api/workflows/[id]/events - Get all events for a workflow execution
 */

import { NextRequest, NextResponse } from 'next/server';
import { getWorkflowEvents, getWorkflowStatus } from '@/lib/db/workflow-events';

/**
 * GET /api/workflows/[id]/events
 * Returns workflow events from dbos.workflow_events table
 *
 * Response format:
 * {
 *   workflowId: string;
 *   status: 'PENDING' | 'SUCCESS' | 'ERROR' | ...;
 *   steps: Array<{
 *     stepName: string;
 *     started?: { timestamp: string, input: any };
 *     completed?: { timestamp: string, output: string, cost: any, durationMs: number };
 *     failed?: { timestamp: string, error: string };
 *   }>;
 *   rawEvents: Array<WorkflowEvent>;
 *   updatedAt: string;
 * }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workflowId } = await params;

    // Check if workflow exists
    const status = await getWorkflowStatus(workflowId);
    if (!status) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    // Get all events
    const events = await getWorkflowEvents(workflowId);

    // Transform events into grouped format
    // Events are keyed as "step:{stepName}:{status}" or "workflow:{status}"
    const eventsByStep = new Map<string, {
      started?: any;
      completed?: any;
      failed?: any;
    }>();

    events.forEach(event => {
      // Parse event key: "step:{stepName}:{status}"
      const match = event.key.match(/^step:([^:]+):(.+)$/);
      if (match) {
        const [, stepName, eventStatus] = match;

        if (!eventsByStep.has(stepName)) {
          eventsByStep.set(stepName, {});
        }

        const stepEvents = eventsByStep.get(stepName)!;
        stepEvents[eventStatus as 'started' | 'completed' | 'failed'] = {
          ...event.value,
          timestamp: event.created_at
        };
      }
    });

    // Convert map to array
    const steps = Array.from(eventsByStep.entries()).map(([stepName, events]) => ({
      stepName,
      ...events
    }));

    return NextResponse.json({
      workflowId,
      status: status.status,
      steps,
      rawEvents: events, // Include raw events for debugging
      updatedAt: status.updated_at
    });

  } catch (error) {
    console.error('[API] Error fetching workflow events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workflow events' },
      { status: 500 }
    );
  }
}
