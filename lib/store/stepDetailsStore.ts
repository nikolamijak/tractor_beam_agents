import { create } from 'zustand';

/**
 * Step detail data structure
 *
 * Contains all information needed to display in the step details sidebar:
 * - Output from agent execution
 * - Cost breakdown by token type
 * - Duration metrics
 * - Error information (if failed)
 */
export interface StepDetail {
  stepName: string;
  output: string | null;
  costUsd: number;
  costBreakdown: {
    inputTokens: number;
    outputTokens: number;
    cacheTokens?: number;
    reasoningTokens?: number;
  } | null;
  duration: number; // milliseconds
  error: string | null;
  timestamp: string;
}

/**
 * Zustand store for step detail data
 *
 * Populated from SSE events (step:completed, step:failed) by useWorkflowVisualization hook.
 * Accessed by StepDetailsSidebar component when user clicks a step node.
 *
 * Structure:
 * - details: Map of stepName -> StepDetail
 * - setStepDetails: Update or add step detail
 * - clear: Reset all details (useful on workflow change)
 */
interface StepDetailsState {
  /** Map of stepName to step details */
  details: Record<string, StepDetail>;

  /** Update or add step details */
  setStepDetails: (stepName: string, detail: StepDetail) => void;

  /** Clear all step details */
  clear: () => void;
}

/**
 * Step details store
 *
 * Usage:
 * ```typescript
 * // Set details (from SSE event handler)
 * useStepDetailsStore.getState().setStepDetails('intakeStep', {
 *   stepName: 'intakeStep',
 *   output: '{ "stories": [...] }',
 *   costUsd: 0.0042,
 *   costBreakdown: { inputTokens: 1000, outputTokens: 500 },
 *   duration: 3420,
 *   error: null,
 *   timestamp: '2026-02-04T12:34:56Z'
 * });
 *
 * // Get details (from sidebar component)
 * const details = useStepDetailsStore(s => s.details['intakeStep']);
 * ```
 */
export const useStepDetailsStore = create<StepDetailsState>((set) => ({
  details: {},

  setStepDetails: (stepName, detail) =>
    set((state) => ({
      details: { ...state.details, [stepName]: detail },
    })),

  clear: () => set({ details: {} }),
}));
