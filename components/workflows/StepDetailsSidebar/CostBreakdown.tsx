/**
 * Cost breakdown component for step details sidebar
 *
 * Displays:
 * - Total cost in USD
 * - Duration in human-readable format
 * - Token usage breakdown by type (input, output, cache, reasoning)
 */

import React from 'react';

interface CostBreakdownProps {
  /** Total cost in USD */
  cost: number;

  /** Token usage breakdown by type */
  breakdown: {
    inputTokens: number;
    outputTokens: number;
    cacheTokens?: number;
    reasoningTokens?: number;
  } | null;

  /** Duration in milliseconds */
  duration: number;
}

/**
 * Format duration from milliseconds to human-readable string
 * @param ms - Duration in milliseconds
 * @returns Formatted duration (e.g., "3.42s", "125ms", "2m 15s")
 */
function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  } else if (ms < 60000) {
    return `${(ms / 1000).toFixed(2)}s`;
  } else {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }
}

export function CostBreakdown({ cost, breakdown, duration }: CostBreakdownProps) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
        Cost & Performance
      </h3>

      {/* Summary metrics */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white dark:bg-gray-900 rounded p-3 border border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Cost</div>
          <div className="text-lg font-bold text-green-600 dark:text-green-400">
            ${cost.toFixed(4)}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded p-3 border border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Duration</div>
          <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
            {formatDuration(duration)}
          </div>
        </div>
      </div>

      {/* Token breakdown table */}
      {breakdown && (
        <div>
          <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
            Token Usage
          </div>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              <tr className="bg-white dark:bg-gray-900">
                <td className="py-2 px-3 text-gray-700 dark:text-gray-300">Input tokens</td>
                <td className="py-2 px-3 text-right font-mono text-gray-900 dark:text-gray-100">
                  {breakdown.inputTokens.toLocaleString()}
                </td>
              </tr>
              <tr className="bg-gray-50 dark:bg-gray-800">
                <td className="py-2 px-3 text-gray-700 dark:text-gray-300">Output tokens</td>
                <td className="py-2 px-3 text-right font-mono text-gray-900 dark:text-gray-100">
                  {breakdown.outputTokens.toLocaleString()}
                </td>
              </tr>
              {breakdown.cacheTokens !== undefined && breakdown.cacheTokens > 0 && (
                <tr className="bg-white dark:bg-gray-900">
                  <td className="py-2 px-3 text-gray-700 dark:text-gray-300">Cache tokens</td>
                  <td className="py-2 px-3 text-right font-mono text-green-600 dark:text-green-400">
                    {breakdown.cacheTokens.toLocaleString()}
                  </td>
                </tr>
              )}
              {breakdown.reasoningTokens !== undefined && breakdown.reasoningTokens > 0 && (
                <tr className="bg-gray-50 dark:bg-gray-800">
                  <td className="py-2 px-3 text-gray-700 dark:text-gray-300">Reasoning tokens</td>
                  <td className="py-2 px-3 text-right font-mono text-purple-600 dark:text-purple-400">
                    {breakdown.reasoningTokens.toLocaleString()}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
