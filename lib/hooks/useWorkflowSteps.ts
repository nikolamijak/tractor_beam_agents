import { usePolling } from './usePolling';

interface WorkflowStep {
  functionId: string;
  name: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'ERROR';
  output?: any;
  error?: string | null;
  startedAt?: number | null;
  completedAt?: number | null;
  duration?: number | null;
  childWorkflowId?: string | null;
}

interface UseWorkflowStepsOptions {
  enabled?: boolean;
}

export function useWorkflowSteps(workflowId: string, options: UseWorkflowStepsOptions = {}) {
  const fetchSteps = async (): Promise<WorkflowStep[] | null> => {
    const response = await fetch(`/api/workflows/${workflowId}/steps`);
    const result = await response.json();
    return result.success ? result.data : null;
  };

  const shouldStopPolling = (steps: WorkflowStep[] | null): boolean => {
    if (!steps || steps.length === 0) return false;

    // Stop polling if all steps are completed (SUCCESS or ERROR)
    return steps.every((step) => step.status === 'SUCCESS' || step.status === 'ERROR');
  };

  return usePolling<WorkflowStep[] | null>(fetchSteps, shouldStopPolling, {
    enabled: options.enabled ?? true,
    initialInterval: 500,
    maxInterval: 2000,
  });
}
