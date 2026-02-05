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

  useEffect(() => {
    // If polling is enabled, use polling results
    if (options.enablePolling) {
      setData(pollingResult.data);
      setLoading(pollingResult.loading);
      setError(pollingResult.error);
      return;
    }

    // Otherwise, single fetch (backward compatibility)
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
    // CRITICAL: Only depend on workflowId and enablePolling flag
    // Do NOT depend on pollingResult - that creates infinite loop because
    // pollingResult.data/loading/error are object references that change on every update
  }, [workflowId, options.enablePolling]);

  return { data, loading, error };
}
