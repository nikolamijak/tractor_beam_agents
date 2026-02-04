/**
 * Step output display component
 *
 * Displays agent execution output with:
 * - Syntax highlighting for JSON
 * - Truncation for very long outputs (>5000 chars)
 * - Monospace formatting
 */

'use client';

import React, { useState } from 'react';

interface StepOutputProps {
  /** Step output (usually JSON string from agent execution) */
  output: string;
}

const MAX_OUTPUT_LENGTH = 5000;

/**
 * Attempt to parse and format JSON output
 * @param output - Raw output string
 * @returns Formatted JSON or original string if not valid JSON
 */
function formatOutput(output: string): string {
  try {
    const parsed = JSON.parse(output);
    return JSON.stringify(parsed, null, 2);
  } catch {
    // Not JSON, return as-is
    return output;
  }
}

export function StepOutput({ output }: StepOutputProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const formattedOutput = formatOutput(output);
  const isTruncated = formattedOutput.length > MAX_OUTPUT_LENGTH;
  const displayOutput = isTruncated && !isExpanded
    ? formattedOutput.slice(0, MAX_OUTPUT_LENGTH) + '\n...'
    : formattedOutput;

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Step Output
        </h3>
      </div>

      <div className="bg-gray-50 dark:bg-gray-900 p-4">
        <pre className="text-xs font-mono text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words overflow-x-auto">
          {displayOutput}
        </pre>

        {isTruncated && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
          >
            {isExpanded ? 'Show less' : 'Show more'}
          </button>
        )}
      </div>
    </div>
  );
}
