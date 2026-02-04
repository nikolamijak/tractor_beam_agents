/**
 * Polling Fallback Endpoint for Workflow Events
 * GET /api/workflows/[id]/events/fallback
 *
 * This endpoint is used when SSE connections fail (restrictive proxies, corporate networks).
 * Supports Last-Event-ID deduplication to prevent duplicate events across polling requests.
 *
 * Query parameters:
 * - lastSequence: Last sequence number received (default: 0)
 *   Only events with sequenceNumber > lastSequence are returned
 *
 * Response format:
 * {
 *   events: WorkflowEvent[];        // Filtered events (sequenceNumber > lastSequence)
 *   lastSequence: number;            // Updated sequence number (highest from events)
 *   hasMore: boolean;                // True if workflow still running
 *   timestamp: string;               // Current server timestamp (ISO8601)
 * }
 *
 * This endpoint is automatically called by SSEConnectionFallback when SSE fails.
 * Clients should NOT call this directly - use useWorkflowSSE hook instead.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getWorkflowEvents, getWorkflowStatus } from '@/lib/db/workflow-events';
import type { WorkflowEvent as SSEWorkflowEvent } from '@/lib/sse/types';

// Ensure fresh data on each request (no caching)
export const dynamic = 'force-dynamic';

/**
 * GET /api/workflows/[id]/events/fallback?lastSequence=N
 *
 * Returns workflow events filtered by sequence number for polling deduplication
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workflowId } = await params;

    // Extract lastSequence from query params
    const searchParams = request.nextUrl.searchParams;
    const lastSequence = parseInt(searchParams.get('lastSequence') || '0', 10);

    // Check if workflow exists
    const status = await getWorkflowStatus(workflowId);
    if (!status) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    // Get all events from database
    const rawEvents = await getWorkflowEvents(workflowId);

    // Transform database events to SSE format with sequence numbers
    // Note: Database events don't have sequence numbers, so we assign them based on order
    const transformedEvents: SSEWorkflowEvent[] = rawEvents
      .map((dbEvent, index) => {
        // Parse event key: "step:{stepName}:{status}"
        const match = dbEvent.key.match(/^step:([^:]+):(.+)$/);
        if (!match) return null;

        const [, stepName, eventStatus] = match;
        const eventType = `step:${eventStatus}` as SSEWorkflowEvent['eventType'];

        // Assign sequence number (1-based index)
        const sequenceNumber = index + 1;

        return {
          sequenceNumber,
          workflowId: dbEvent.workflow_uuid,
          stepName,
          eventType,
          timestamp: dbEvent.created_at.toISOString(),
          durationMs: dbEvent.value?.durationMs,
          payload: {
            input: dbEvent.value?.input,
            output: dbEvent.value?.output,
            tokensUsed: dbEvent.value?.tokensUsed,
            costUsd: dbEvent.value?.costUsd,
            costBreakdown: dbEvent.value?.costBreakdown,
            error: dbEvent.value?.error
          }
        } as SSEWorkflowEvent;
      })
      .filter((event): event is SSEWorkflowEvent => event !== null);

    // Filter events: only return those with sequenceNumber > lastSequence
    const filteredEvents = transformedEvents.filter(
      event => event.sequenceNumber > lastSequence
    );

    // Determine new lastSequence (highest from filtered events)
    const newLastSequence = filteredEvents.length > 0
      ? filteredEvents[filteredEvents.length - 1].sequenceNumber
      : lastSequence;

    // Check if workflow still running (hasMore events expected)
    const hasMore = status.status === 'PENDING' || status.status === 'ENQUEUED';

    return NextResponse.json({
      events: filteredEvents,
      lastSequence: newLastSequence,
      hasMore,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[API] Error fetching workflow events (fallback):', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch workflow events',
        events: [],
        lastSequence: 0,
        hasMore: false,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
