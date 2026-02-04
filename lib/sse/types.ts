/**
 * Type definitions for Server-Sent Events (SSE) workflow event streaming
 *
 * These types define the structure of workflow events sent over SSE connections,
 * subscription callbacks, and internal subscription management.
 */

/**
 * Event payload embedded in WorkflowEvent
 *
 * Contains the actual event data, including inputs, outputs, cost metrics,
 * and error information depending on the event type.
 */
export interface EventPayload {
  /** Input data for step:started events */
  input?: any;

  /** Output data for step:completed events (truncated to 200 chars per D022) */
  output?: string;

  /** Token usage count for step:completed events (from CostCalculatorService) */
  tokensUsed?: number;

  /** Cost in USD for step:completed events (from CostCalculatorService) */
  costUsd?: number;

  /** Detailed cost breakdown by token type (optional, from CostCalculatorService) */
  costBreakdown?: {
    inputCost?: number;
    outputCost?: number;
    cachedCost?: number;
    thinkingCost?: number;
    reasoningCost?: number;
  };

  /** Error message for step:failed and workflow:error events */
  error?: string;
}

/**
 * Workflow event type discriminator
 *
 * Maps to Phase 2 event keys (step:{stepName}:{status} format):
 * - step:started: Step execution begins
 * - step:completed: Step execution succeeds
 * - step:failed: Step execution fails
 * - workflow:error: Workflow-level error (D024)
 */
export type WorkflowEventType =
  | 'step:started'
  | 'step:completed'
  | 'step:failed'
  | 'workflow:error';

/**
 * Workflow event sent over SSE connection
 *
 * Represents a single workflow event with sequence number for ordering and
 * deduplication. This structure is sent as JSON in the SSE `data:` field.
 *
 * Sequence numbers are auto-incremented per workflow and enable:
 * - Client-side deduplication after reconnection
 * - Out-of-order event detection
 * - Last-Event-ID recovery via EventSource API
 */
export interface WorkflowEvent {
  /** Sequential event ID for this workflow (starts at 1, increments per event) */
  sequenceNumber: number;

  /** DBOS workflow UUID from dbos.workflow_status.workflow_uuid */
  workflowId: string;

  /** Step name extracted from event key (e.g., "intakeStep" from "step:intakeStep:started") */
  stepName: string;

  /** Event type discriminator */
  eventType: WorkflowEventType;

  /** ISO8601 timestamp when event occurred (from DBOS.setEvent timestamp) */
  timestamp: string;

  /**
   * Duration in milliseconds for step:completed and step:failed events
   * Calculated as (endTime - startTime) from Phase 2 event emission
   */
  durationMs?: number;

  /** Event payload with input/output/cost/error data */
  payload: EventPayload;
}

/**
 * SSE event payload sent to client
 *
 * This is the exact structure serialized to the SSE `data:` field.
 * Identical to WorkflowEvent - exported separately for clarity.
 */
export type SSEEventPayload = WorkflowEvent;

/**
 * Subscription callback function signature
 *
 * Called when a new event is broadcast to this workflow's subscribers.
 * Used by WorkflowSubscriptionManager to notify connected SSE clients.
 *
 * @param event - Workflow event to deliver to client
 */
export type EventSubscription = (event: WorkflowEvent) => void;

/**
 * Internal subscription registry structure
 *
 * Maps workflow IDs to arrays of active subscription callbacks.
 * Used by WorkflowSubscriptionManager for fan-out to multiple clients.
 */
export type WorkflowSubscriptions = Map<string, EventSubscription[]>;
