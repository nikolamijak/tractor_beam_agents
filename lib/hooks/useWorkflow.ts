import { useEffect, useState } from 'react';
import { usePolling } from './usePolling';

interface WorkflowData {
  workflowId: string;
  workflowName: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  input: Record<string, any>;
  output?: any;
  error?: string;
}

interface UseWorkflowOptions {
  enablePolling?: boolean;
}

export function useWorkflow(workflowId: string, options: UseWorkflowOptions = {}) {
  const [data, setData] = useState<WorkflowData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchWorkflow = async () => {
    const response = await fetch(`/api/workflows/${workflowId}`);
    const result = await response.json();
    return result.success ? result.data : null;
  };

  const shouldStopPolling = (data: WorkflowData | null) => {
    if (!data) return false;
    return data.status === 'SUCCESS' || data.status === 'ERROR';
  };

  // Use polling if enabled
  const pollingResult = usePolling(fetchWorkflow, shouldStopPolling, {
    enabled: options.enablePolling,
    initialInterval: 500,
    maxInterval: 2000,
  });

  // When polling is enabled, return polling results directly (no state duplication)
  if (options.enablePolling) {
    return pollingResult;
  }

  // Otherwise, single fetch (backward compatibility)
  useEffect(() => {
    const fetchOnce = async () => {
      try {
        const response = await fetch(`/api/workflows/${workflowId}`);
        const result = await response.json();

        if (result.success) {
          setData(result.data);
        } else {
          setError(new Error(result.error || 'Failed to fetch workflow'));
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch workflow'));
      } finally {
        setLoading(false);
      }
    };

    fetchOnce();
  }, [workflowId]);

  return { data, loading, error };
}
