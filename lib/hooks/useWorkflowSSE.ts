/**
 * React hook for workflow event streaming via SSE with polling fallback
 *
 * Usage:
 * ```typescript
 * const { events, isConnected, mode, isLoading } = useWorkflowSSE(workflowId);
 * ```
 *
 * Features:
 * - Tries SSE connection first (EventSource)
 * - Automatically falls back to polling if SSE fails
 * - Deduplicates events across reconnections
 * - Can be disabled via feature flag
 * - Cleans up on unmount (no memory leaks)
 *
 * Connection modes:
 * - 'connecting': Initial state, trying to connect
 * - 'sse': Connected via Server-Sent Events
 * - 'polling': Connected via HTTP polling (fallback)
 * - 'disconnected': Connection failed or closed
 */

'use client';

import { useEffect, useState, useRef } from 'react';
import { SSEConnectionFallback } from '@/lib/sse/SSEConnectionFallback';
import type { WorkflowEvent } from '@/lib/sse/types';

export type ConnectionMode = 'sse' | 'polling' | 'connecting' | 'disconnected';

export interface UseWorkflowSSEOptions {
  /**
   * Feature flag to enable/disable SSE
   * Default: true (reads from NEXT_PUBLIC_WORKFLOW_SSE_ENABLED env var)
   */
  enabled?: boolean;

  /**
   * Callback when connection mode changes (SSE ↔ polling)
   * Useful for showing "Live" vs "Polling" indicator in UI
   */
  onModeChange?: (mode: ConnectionMode) => void;
}

export interface UseWorkflowSSEResult {
  /**
   * Array of workflow events received so far
   * Events are cumulative (append-only)
   */
  events: WorkflowEvent[];

  /**
   * True if connected (either SSE or polling mode)
   */
  isConnected: boolean;

  /**
   * Current connection mode
   */
  mode: ConnectionMode;

  /**
   * True while establishing initial connection
   */
  isLoading: boolean;
}

/**
 * React hook for consuming workflow events via SSE with automatic polling fallback
 *
 * @param workflowId - Workflow UUID to subscribe to (null to disable)
 * @param options - Configuration options
 * @returns Event stream state and data
 *
 * @example
 * ```tsx
 * function WorkflowMonitor({ workflowId }: { workflowId: string }) {
 *   const { events, isConnected, mode } = useWorkflowSSE(workflowId);
 *
 *   return (
 *     <div>
 *       <div>Status: {mode} {isConnected ? '✓' : '✗'}</div>
 *       <ul>
 *         {events.map(event => (
 *           <li key={event.sequenceNumber}>
 *             {event.stepName}: {event.eventType}
 *           </li>
 *         ))}
 *       </ul>
 *     </div>
 *   );
 * }
 * ```
 */
export function useWorkflowSSE(
  workflowId: string | null,
  options?: UseWorkflowSSEOptions
): UseWorkflowSSEResult {
  const [events, setEvents] = useState<WorkflowEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [mode, setMode] = useState<ConnectionMode>('connecting');
  const [isLoading, setIsLoading] = useState(false);
  const connectionRef = useRef<SSEConnectionFallback | null>(null);

  // Check feature flag from environment variable (default: true)
  const sseEnabled = options?.enabled ?? (
    typeof window !== 'undefined'
      ? process.env.NEXT_PUBLIC_WORKFLOW_SSE_ENABLED !== 'false'
      : true
  );

  useEffect(() => {
    // Don't connect if no workflowId or SSE disabled
    if (!workflowId || !sseEnabled) {
      setEvents([]);
      setIsConnected(false);
      setMode('disconnected');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setMode('connecting');

    // Create connection manager
    const connection = new SSEConnectionFallback(
      workflowId,
      // Event callback: append to events array
      (event: WorkflowEvent) => {
        setEvents(prev => [...prev, event]);
      },
      // Mode change callback: update state and notify parent
      (newMode: ConnectionMode) => {
        setMode(newMode);
        setIsConnected(true);
        setIsLoading(false);
        options?.onModeChange?.(newMode);
      }
    );

    connectionRef.current = connection;

    // Try SSE first (will fallback to polling if fails)
    connection.startSSE();

    // Cleanup on unmount or workflowId change
    return () => {
      connection.close();
      connectionRef.current = null;
      setIsConnected(false);
      setIsLoading(false);
    };
  }, [workflowId, sseEnabled, options?.onModeChange]);

  // Update isConnected based on mode changes
  useEffect(() => {
    if (mode === 'sse' || mode === 'polling') {
      setIsConnected(true);
      setIsLoading(false);
    } else if (mode === 'disconnected') {
      setIsConnected(false);
      setIsLoading(false);
    }
  }, [mode]);

  return {
    events,
    isConnected,
    mode,
    isLoading
  };
}
