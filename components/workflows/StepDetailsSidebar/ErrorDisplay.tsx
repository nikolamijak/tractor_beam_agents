/**
 * Error display component for step details sidebar
 *
 * Displays error messages with:
 * - Red-tinted error box for visual prominence
 * - Stack trace formatting (monospace font for "at " patterns)
 * - Preserves newlines and formatting
 */

import React from 'react';

interface ErrorDisplayProps {
  /** Error message (may include stack trace) */
  error: string;
}

/**
 * Check if error string contains a stack trace
 * @param error - Error message
 * @returns True if error contains stack trace patterns
 */
function hasStackTrace(error: string): boolean {
  return error.includes('\n    at ') || error.includes('\n  at ');
}

export function ErrorDisplay({ error }: ErrorDisplayProps) {
  const isStackTrace = hasStackTrace(error);

  return (
    <div className="border border-red-200 dark:border-red-800 rounded-lg overflow-hidden">
      <div className="bg-red-100 dark:bg-red-900/30 px-4 py-2 border-b border-red-200 dark:border-red-800">
        <h3 className="text-sm font-semibold text-red-900 dark:text-red-100 flex items-center">
          <span className="mr-2">⚠️</span>
          Error Details
        </h3>
      </div>

      <div className="bg-red-50 dark:bg-red-900/20 p-4">
        {isStackTrace ? (
          // Stack trace: use monospace font for better readability
          <pre className="text-xs font-mono text-red-900 dark:text-red-100 whitespace-pre-wrap break-words">
            {error}
          </pre>
        ) : (
          // Simple error message: use regular font
          <p className="text-sm text-red-900 dark:text-red-100 whitespace-pre-wrap break-words">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
