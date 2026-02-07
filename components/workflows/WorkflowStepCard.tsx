'use client';

import { useState } from 'react';

interface WorkflowStepCardProps {
  step: {
    functionId: string;
    name: string;
    status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'ERROR';
    output?: any;
    error?: string | null;
    startedAt?: number | null;
    completedAt?: number | null;
    duration?: number | null;
  };
  index: number;
}

const statusColors = {
  PENDING: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200',
  RUNNING: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
  SUCCESS: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
  ERROR: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200',
};

const statusIcons = {
  PENDING: '⏳',
  RUNNING: '⚡',
  SUCCESS: '✓',
  ERROR: '✗',
};

export function WorkflowStepCard({ step, index }: WorkflowStepCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatDuration = (ms: number | null | undefined) => {
    if (!ms) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold text-sm">
            {index + 1}
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{step.name}</h3>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[step.status]}`}
        >
          {statusIcons[step.status]} {step.status}
        </span>
      </div>

      {/* Duration */}
      {step.duration !== null && step.duration !== undefined && (
        <div className="mb-3">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Duration: <span className="font-medium">{formatDuration(step.duration)}</span>
          </span>
        </div>
      )}

      {/* Error Display */}
      {step.status === 'ERROR' && step.error && (
        <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm font-semibold text-red-900 dark:text-red-200 mb-2">Error:</p>
          <pre className="text-sm text-red-800 dark:text-red-300 whitespace-pre-wrap font-mono overflow-x-auto">
            {step.error}
          </pre>
        </div>
      )}

      {/* Output Display (for successful steps) */}
      {step.status === 'SUCCESS' && step.output && (
        <div className="mt-4">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 mb-2"
          >
            {isExpanded ? '▼' : '▶'} {isExpanded ? 'Hide' : 'Show'} Output
          </button>

          {isExpanded && (
            <div className="mt-2 p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg max-h-96 overflow-y-auto">
              <pre className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap font-mono">
                {typeof step.output === 'string'
                  ? step.output
                  : JSON.stringify(step.output, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Running Indicator */}
      {step.status === 'RUNNING' && (
        <div className="mt-4 flex items-center gap-2 text-blue-600 dark:text-blue-400">
          <div className="animate-spin h-4 w-4 border-2 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full"></div>
          <span className="text-sm font-medium">Executing...</span>
        </div>
      )}
    </div>
  );
}
