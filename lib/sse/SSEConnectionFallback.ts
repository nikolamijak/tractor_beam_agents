/**
 * SSE Connection State Machine with Polling Fallback
 *
 * Manages connection to workflow event streams with automatic fallback:
 * 1. Try SSE first (EventSource to /api/workflows/[id]/subscribe)
 * 2. If SSE fails to connect within 5 seconds, fallback to polling
 * 3. If SSE disconnects, switch to polling
 * 4. Polling uses /api/workflows/[id]/events/fallback with Last-Event-ID
 *
 * State transitions:
 * - connecting → sse (on EventSource.onopen)
 * - connecting → polling (on timeout or EventSource.onerror)
 * - sse → polling (on EventSource.onerror or heartbeat timeout)
 * - polling → disconnected (on max retries exceeded)
 *
 * Deduplication: Tracks lastSequence to prevent duplicate events across SSE/polling transitions
 */

import type { WorkflowEvent } from './types';

type ConnectionMode = 'sse' | 'polling' | 'connecting' | 'disconnected';

export class SSEConnectionFallback {
  private mode: ConnectionMode = 'connecting';
  private eventSource: EventSource | null = null;
  private pollingInterval: NodeJS.Timeout | null = null;
  private sseTimeout: NodeJS.Timeout | null = null;
  private heartbeatTimeout: NodeJS.Timeout | null = null;
  private lastSequence = 0;
  private reconnectAttempt = 0;
  private maxReconnectAttempts = 10;
  private pollingIntervalMs = 2000; // 2 seconds
  private backoffDelays = [1000, 2000, 4000, 8000, 16000, 30000]; // Max 30s
  private lastHeartbeat = Date.now();

  constructor(
    private workflowId: string,
    private onEvent: (event: WorkflowEvent) => void,
    private onModeChange?: (mode: ConnectionMode) => void
  ) {}

  /**
   * Start SSE connection
   * Tries EventSource first, falls back to polling if fails within 5 seconds
   */
  public startSSE(): void {
    // Prevent double-connects
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    this.setMode('connecting');

    // Set timeout: if not connected within 5 seconds, fallback to polling
    this.sseTimeout = setTimeout(() => {
      console.log('[SSE] Connection timeout after 5 seconds, switching to polling');
      this.close();
      this.startPolling();
    }, 5000);

    try {
      // Open EventSource connection
      this.eventSource = new EventSource(
        `/api/workflows/${this.workflowId}/subscribe`,
        { withCredentials: false }
      );

      // Connection opened successfully
      this.eventSource.onopen = () => {
        console.log('[SSE] Connection opened');
        if (this.sseTimeout) {
          clearTimeout(this.sseTimeout);
          this.sseTimeout = null;
        }
        this.reconnectAttempt = 0;
        this.setMode('sse');
        this.resetHeartbeatTimeout();
      };

      // Receive event message
      this.eventSource.onmessage = (e) => {
        this.lastHeartbeat = Date.now();
        this.resetHeartbeatTimeout();

        try {
          const event: WorkflowEvent = JSON.parse(e.data);

          // Deduplication: only process if sequence > lastSequence
          if (event.sequenceNumber > this.lastSequence) {
            this.lastSequence = event.sequenceNumber;
            this.onEvent(event);
          }
        } catch (err) {
          console.error('[SSE] Failed to parse event:', err);
        }
      };

      // Connection error or disconnect
      this.eventSource.onerror = (err) => {
        console.error('[SSE] Connection error, switching to polling:', err);
        this.close();
        this.startPolling();
      };

    } catch (err) {
      console.error('[SSE] Failed to create EventSource:', err);
      this.close();
      this.startPolling();
    }
  }

  /**
   * Start polling fallback
   * Fetches events from /api/workflows/[id]/events/fallback with Last-Event-ID
   */
  public startPolling(): void {
    // Clear any existing polling interval
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }

    this.setMode('polling');
    this.reconnectAttempt = 0;

    // Poll immediately, then on interval
    this.poll();

    this.pollingInterval = setInterval(() => {
      this.poll();
    }, this.pollingIntervalMs);
  }

  /**
   * Execute single poll request
   */
  private async poll(): Promise<void> {
    try {
      const response = await fetch(
        `/api/workflows/${this.workflowId}/events/fallback?lastSequence=${this.lastSequence}`
      );

      if (!response.ok) {
        if (response.status === 404) {
          console.error('[Polling] Workflow not found');
          this.handlePollingError();
          return;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Reset reconnect attempts on success
      this.reconnectAttempt = 0;

      // Process new events
      if (data.events && Array.isArray(data.events)) {
        data.events.forEach((event: WorkflowEvent) => {
          // Deduplication: only process if sequence > lastSequence
          if (event.sequenceNumber > this.lastSequence) {
            this.lastSequence = event.sequenceNumber;
            this.onEvent(event);
          }
        });
      }

      // Update lastSequence from response if provided
      if (data.lastSequence && data.lastSequence > this.lastSequence) {
        this.lastSequence = data.lastSequence;
      }

      // Stop polling if workflow is complete and no more events
      if (data.hasMore === false) {
        console.log('[Polling] Workflow complete, stopping polling');
        this.close();
      }

    } catch (err) {
      console.error('[Polling] Request failed:', err);
      this.handlePollingError();
    }
  }

  /**
   * Handle polling errors with exponential backoff
   */
  private handlePollingError(): void {
    this.reconnectAttempt++;

    if (this.reconnectAttempt >= this.maxReconnectAttempts) {
      console.error('[Polling] Max reconnect attempts exceeded, disconnecting');
      this.close();
      this.setMode('disconnected');
      return;
    }

    // Exponential backoff
    const delayIndex = Math.min(this.reconnectAttempt - 1, this.backoffDelays.length - 1);
    const delay = this.backoffDelays[delayIndex];

    console.log(`[Polling] Retrying in ${delay}ms (attempt ${this.reconnectAttempt}/${this.maxReconnectAttempts})`);

    // Adjust polling interval for backoff
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = setInterval(() => {
        this.poll();
      }, delay);
    }
  }

  /**
   * Reset heartbeat timeout for SSE connections
   * If no messages received for 60 seconds, assume connection dead
   */
  private resetHeartbeatTimeout(): void {
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
    }

    this.heartbeatTimeout = setTimeout(() => {
      const timeSinceLastHeartbeat = Date.now() - this.lastHeartbeat;
      if (timeSinceLastHeartbeat >= 60000) {
        console.log('[SSE] No heartbeat for 60 seconds, switching to polling');
        this.close();
        this.startPolling();
      }
    }, 60000);
  }

  /**
   * Close all connections and timers
   */
  public close(): void {
    // Close EventSource
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    // Clear polling interval
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }

    // Clear SSE timeout
    if (this.sseTimeout) {
      clearTimeout(this.sseTimeout);
      this.sseTimeout = null;
    }

    // Clear heartbeat timeout
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }
  }

  /**
   * Set connection mode and notify listeners
   */
  private setMode(mode: ConnectionMode): void {
    if (this.mode !== mode) {
      console.log(`[Connection] Mode change: ${this.mode} → ${mode}`);
      this.mode = mode;

      // Only call onModeChange for active modes (not connecting/disconnected)
      if ((mode === 'sse' || mode === 'polling') && this.onModeChange) {
        this.onModeChange(mode);
      }
    }
  }

  /**
   * Get current connection mode
   */
  public getMode(): ConnectionMode {
    return this.mode;
  }

  /**
   * Check if connected (either SSE or polling)
   */
  public isConnected(): boolean {
    return this.mode === 'sse' || this.mode === 'polling';
  }
}
