'use client';

import { useWorkflow } from '@/lib/hooks/useWorkflow';
import { WorkflowFlowchart } from './WorkflowFlowchart';

interface WorkflowVisualizationProps {
  workflowId: string;
}

const statusColors = {
  PENDING: 'bg-gray-100 text-gray-800',
  RUNNING: 'bg-blue-100 text-blue-800',
  SUCCESS: 'bg-green-100 text-green-800',
  ERROR: 'bg-red-100 text-red-800',
};

export function WorkflowVisualization({ workflowId }: WorkflowVisualizationProps) {
  const { data: workflow, loading: workflowLoading, error: workflowError } = useWorkflow(
    workflowId,
    { enablePolling: true }
  );

  if (workflowLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
        <span className="ml-3 text-gray-600 dark:text-gray-400">Loading workflow...</span>
      </div>
    );
  }

  if (workflowError) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-red-900 dark:text-red-200 mb-2">Error Loading Workflow</h3>
        <p className="text-red-800 dark:text-red-300">{workflowError.message}</p>
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
        <p className="text-yellow-900 dark:text-yellow-200">Workflow not found.</p>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Workflow Status Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{workflow.workflowName}</h1>
          <span
            className={`px-4 py-2 rounded-full text-sm font-medium ${
              statusColors[workflow.status as keyof typeof statusColors] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
            }`}
          >
            {workflow.status}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600 dark:text-gray-400">Workflow ID:</span>
            <p className="font-mono text-gray-900 dark:text-gray-100 break-all">{workflow.workflowId}</p>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Created:</span>
            <p className="text-gray-900 dark:text-gray-100">{formatDate(workflow.createdAt)}</p>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Updated:</span>
            <p className="text-gray-900 dark:text-gray-100">{formatDate(workflow.updatedAt)}</p>
          </div>
          {workflow.error && (
            <div className="md:col-span-2">
              <span className="text-red-600 dark:text-red-400 font-semibold">Error:</span>
              <p className="text-red-800 dark:text-red-300 mt-1">{workflow.error}</p>
            </div>
          )}
        </div>

        {/* Input Parameters */}
        {workflow.input && Object.keys(workflow.input).length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Input Parameters:</h3>
            <pre className="text-sm bg-gray-50 dark:bg-gray-900 p-3 rounded border border-gray-200 dark:border-gray-700 overflow-x-auto text-gray-900 dark:text-gray-100">
              {JSON.stringify(workflow.input, null, 2)}
            </pre>
          </div>
        )}

        {/* Output (if completed successfully) */}
        {workflow.status === 'SUCCESS' && workflow.output && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Output:</h3>
            <pre className="text-sm bg-green-50 dark:bg-green-900/20 p-3 rounded border border-green-200 dark:border-green-800 overflow-x-auto text-gray-900 dark:text-gray-100">
              {JSON.stringify(workflow.output, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Workflow Progress Flowchart */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Workflow Progress</h2>
        <WorkflowFlowchart workflowId={workflowId} />
      </div>
    </div>
  );
}
