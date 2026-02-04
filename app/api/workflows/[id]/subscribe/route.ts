/**
 * SSE endpoint for real-time workflow event streaming
 *
 * Clients connect to GET /api/workflows/[id]/subscribe to receive workflow events
 * in real-time using Server-Sent Events (SSE) protocol. The connection remains open
 * until the client disconnects or the workflow reaches a terminal state.
 *
 * SSE Format:
 * - id: {sequenceNumber}
 * - event: {eventType}
 * - data: {json}
 * - (blank line)
 *
 * Heartbeat: Server sends `: heartbeat\n\n` every 30 seconds to keep connection alive.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSubscriptionManager } from '@/lib/sse/WorkflowSubscriptionManager';
import { getWorkflowStatus } from '@/lib/db/workflow-events';

// CRITICAL: These directives prevent Next.js from caching SSE responses
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/workflows/[id]/subscribe
 *
 * Opens SSE connection for workflow event streaming
 *
 * Connection lifecycle:
 * 1. Verify workflow exists (404 if not found)
 * 2. Open ReadableStream for SSE protocol
 * 3. Subscribe to workflow events
 * 4. Send heartbeat every 30 seconds
 * 5. Clean up on client disconnect (via request.signal.abort)
 *
 * Event format: id + event + data fields per SSE spec
 * Sequence numbers enable Last-Event-ID recovery on reconnection
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: workflowId } = await params;

  // Verify workflow exists before opening stream
  const status = await getWorkflowStatus(workflowId);
  if (!status) {
    return NextResponse.json(
      { error: 'Workflow not found' },
      { status: 404 }
    );
  }

  const subscriptionManager = getSubscriptionManager();

  // Create SSE ReadableStream
  const stream = new ReadableStream({
    start(controller) {
      // Text encoder for SSE protocol formatting
      const encoder = new TextEncoder();

      /**
       * Format event as SSE protocol message
       *
       * Format: id: {number}\nevent: {type}\ndata: {json}\n\n
       * Double newline terminates each event
       */
      const formatSSEEvent = (event: any): string => {
        const lines = [
          `id: ${event.sequenceNumber}`,
          `event: ${event.eventType}`,
          `data: ${JSON.stringify(event)}`,
          '' // Empty line terminates event
        ];
        return lines.join('\n') + '\n'; // Double newline
      };

      /**
       * Send SSE heartbeat comment
       *
       * Format: : heartbeat\n\n
       * Comments (: prefix) keep connection alive without triggering onmessage
       */
      const sendHeartbeat = () => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
        } catch (err) {
          // Client disconnected - cleanup will be called via abort listener
        }
      };

      // Subscribe to workflow events
      const unsubscribe = subscriptionManager.subscribe(workflowId, (event) => {
        try {
          const formatted = formatSSEEvent(event);
          controller.enqueue(encoder.encode(formatted));
        } catch (err) {
          // Client disconnected - cleanup will be called via abort listener
        }
      });

      // Send initial heartbeat immediately
      sendHeartbeat();

      // Send heartbeat every 30 seconds to keep connection alive
      const heartbeatInterval = setInterval(sendHeartbeat, 30000);

      /**
       * Cleanup on client disconnect
       *
       * Called when:
       * - Client closes connection (browser navigates away)
       * - Client disconnects (network error)
       * - Server decides to close (not in this version)
       *
       * Cleanup steps:
       * 1. Stop heartbeat timer
       * 2. Unsubscribe from workflow events
       * 3. Clear workflow subscriptions (if this was last subscriber)
       * 4. Close stream
       */
      const cleanup = () => {
        clearInterval(heartbeatInterval);
        unsubscribe();

        // Only clear if no more subscribers (memory cleanup)
        if (subscriptionManager.getSubscriptionCount(workflowId) === 0) {
          subscriptionManager.clear(workflowId);
        }

        try {
          controller.close();
        } catch (err) {
          // Stream already closed - ignore
        }
      };

      // Register cleanup on abort signal (client disconnect)
      request.signal.addEventListener('abort', cleanup);
    }
  });

  // Return SSE response with required headers
  return new Response(stream, {
    headers: {
      // REQUIRED: Browser recognizes SSE from this content type
      'Content-Type': 'text/event-stream',

      // REQUIRED: Prevent proxy/CDN buffering
      'Cache-Control': 'no-cache, no-transform',

      // Keep connection alive (HTTP/1.1)
      'Connection': 'keep-alive',

      // Disable Nginx buffering (Nginx-specific)
      'X-Accel-Buffering': 'no',

      // Enable chunked transfer encoding
      'Transfer-Encoding': 'chunked'
    }
  });
}
