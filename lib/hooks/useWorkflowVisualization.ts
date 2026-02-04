/**
 * React hook for bridging SSE workflow events to Zustand visualization store
 *
 * Usage:
 * ```typescript
 * const { isLoading, mode } = useWorkflowVisualization(workflowId);
 * ```
 *
 * Features:
 * - Subscribes to useWorkflowSSE event stream
 * - Updates Zustand store with step status changes (pending → running → completed/failed)
 * - Records step costs for cumulative cost tracking
 * - Returns connection metadata for optional UI indicators
 *
 * Implementation notes:
 * - Event processing is idempotent (safe to replay events)
 * - SSE/polling handle deduplication via lastSequence
 * - Store updates trigger React Flow re-renders automatically
 */

'use client';

import { useEffect } from 'react';
import { useWorkflowSSE } from './useWorkflowSSE';
import { useWorkflowStore } from '@/lib/store/workflowStore';
import { useStepDetailsStore } from '@/lib/store/stepDetailsStore';
import type { ConnectionMode } from './useWorkflowSSE';

export interface UseWorkflowVisualizationResult {
  /**
   * True while establishing initial SSE/polling connection
   */
  isLoading: boolean;

  /**
   * Current connection mode (sse, polling, connecting, disconnected)
   * Useful for showing "Live" vs "Polling" indicator in UI
   */
  mode: ConnectionMode;
}

/**
 * Hook that connects SSE event stream to Zustand visualization store
 *
 * Automatically updates node status and cumulative cost as workflow executes.
 * No manual polling required - real-time updates driven by SSE or polling fallback.
 *
 * @param workflowId - Workflow UUID to subscribe to (null to disable)
 * @returns Connection state for optional UI indicators
 *
 * @example
 * ```tsx
 * function WorkflowCanvas({ workflowId }: { workflowId: string }) {
 *   const { isLoading, mode } = useWorkflowVisualization(workflowId);
 *
 *   // Zustand store automatically updated - no manual calls needed
 *   const nodes = useWorkflowStore(state => state.nodes);
 *
 *   return (
 *     <div>
 *       {mode === 'sse' && <Badge>🟢 Live</Badge>}
 *       <ReactFlow nodes={nodes} ... />
 *     </div>
 *   );
 * }
 * ```
 */
export function useWorkflowVisualization(
  workflowId: string | null
): UseWorkflowVisualizationResult {
  // Subscribe to SSE event stream (with polling fallback)
  const { events, isLoading, mode } = useWorkflowSSE(workflowId);

  // Get store actions for updating node status and cost
  const { updateNodeStatus, recordStepCost } = useWorkflowStore();
  const { setStepDetails } = useStepDetailsStore();

  // Process events and update store
  useEffect(() => {
    // Skip if no events yet
    if (events.length === 0) return;

    // Process each event to update visualization state
    for (const event of events) {
      // Update node status based on event type
      switch (event.eventType) {
        case 'step:started':
          // Step execution begins - mark as running
          updateNodeStatus(event.stepName, 'running');
          break;

        case 'step:completed':
          // Step execution succeeds - mark as completed
          updateNodeStatus(event.stepName, 'completed');

          // Record cost if available (from Phase 2 cost embedding)
          if (event.payload?.costUsd !== undefined) {
            recordStepCost(event.stepName, event.payload.costUsd);
          }

          // Populate step details for sidebar (Phase 4 Plan 03)
          setStepDetails(event.stepName, {
            stepName: event.stepName,
            output: event.payload?.output ?? null,
            costUsd: event.payload?.costUsd ?? 0,
            costBreakdown: event.payload?.tokensUsed
              ? {
                  inputTokens: (event.payload.tokensUsed as any)?.inputTokens ?? 0,
                  outputTokens: (event.payload.tokensUsed as any)?.outputTokens ?? 0,
                  cacheTokens: (event.payload.tokensUsed as any)?.cacheTokens,
                  reasoningTokens: (event.payload.tokensUsed as any)?.reasoningTokens,
                }
              : null,
            duration: event.durationMs ?? 0,
            error: null,
            timestamp: event.timestamp,
          });
          break;

        case 'step:failed':
          // Step execution fails - mark as failed
          updateNodeStatus(event.stepName, 'failed');

          // Populate step details for failed steps (Phase 4 Plan 03)
          setStepDetails(event.stepName, {
            stepName: event.stepName,
            output: event.payload?.output ?? null,
            costUsd: event.payload?.costUsd ?? 0,
            costBreakdown: event.payload?.tokensUsed
              ? {
                  inputTokens: (event.payload.tokensUsed as any)?.inputTokens ?? 0,
                  outputTokens: (event.payload.tokensUsed as any)?.outputTokens ?? 0,
                  cacheTokens: (event.payload.tokensUsed as any)?.cacheTokens,
                  reasoningTokens: (event.payload.tokensUsed as any)?.reasoningTokens,
                }
              : null,
            duration: event.durationMs ?? 0,
            error: event.payload?.error ?? 'Unknown error',
            timestamp: event.timestamp,
          });
          break;

        case 'workflow:error':
          // Workflow-level error - no specific step to update
          // (Could add global error state to store in future if needed)
          break;

        default:
          // Unknown event type - log warning in development
          if (process.env.NODE_ENV === 'development') {
            console.warn('Unknown workflow event type:', event.eventType);
          }
      }
    }
  }, [events, updateNodeStatus, recordStepCost, setStepDetails]);

  return {
    isLoading,
    mode,
  };
}

// Re-export ConnectionMode type for convenience
export type { ConnectionMode };
