/**
 * React hook for accessing cached step details
 *
 * Reads from stepDetailsStore which is populated by SSE events in useWorkflowVisualization.
 * This is a read-only accessor - step details are populated asynchronously from workflow events.
 */

'use client';

import { useStepDetailsStore, type StepDetail } from '@/lib/store/stepDetailsStore';

/**
 * Hook to access step details for a given step name
 *
 * @param stepName - Name of the step to get details for (null if no step selected)
 * @returns Step details or null if not found or no step selected
 *
 * @example
 * ```tsx
 * function StepDetailsSidebar() {
 *   const selectedStepName = useWorkflowStore(s => s.selectedStepName);
 *   const stepDetails = useStepDetails(selectedStepName);
 *
 *   if (!stepDetails) return null;
 *
 *   return (
 *     <div>
 *       <h2>{stepDetails.stepName}</h2>
 *       <p>Cost: ${stepDetails.costUsd}</p>
 *       <pre>{stepDetails.output}</pre>
 *     </div>
 *   );
 * }
 * ```
 */
export function useStepDetails(stepName: string | null): StepDetail | null {
  // Return null if no step selected
  if (!stepName) return null;

  // Get details from store (returns undefined if not found)
  const details = useStepDetailsStore((state) => state.details[stepName]);

  // Return null if not found (step hasn't completed yet or failed before emitting details)
  return details ?? null;
}
