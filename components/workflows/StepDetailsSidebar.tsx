/**
 * Step details sidebar component
 *
 * Animated sidebar that slides in from right when user clicks a step node.
 * Displays:
 * - Cost breakdown (tokens, duration, dollar cost)
 * - Step output (JSON or text)
 * - Error details (if step failed)
 *
 * Closes on:
 * - Overlay click (dark background)
 * - Close button click (X icon)
 * - Escape key press
 */

'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';

import { useWorkflowStore } from '@/lib/store/workflowStore';
import { useStepDetails } from '@/lib/hooks/useStepDetails';
import { CostBreakdown } from './StepDetailsSidebar/CostBreakdown';
import { StepOutput } from './StepDetailsSidebar/StepOutput';
import { ErrorDisplay } from './StepDetailsSidebar/ErrorDisplay';

export function StepDetailsSidebar() {
  const { selectedStepName, setSelectedStep } = useWorkflowStore();
  const stepDetails = useStepDetails(selectedStepName);

  const isOpen = selectedStepName !== null;

  // Close sidebar on Escape key press
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedStep(null);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, setSelectedStep]);

  // Prevent body scroll when sidebar is open (optional UX improvement)
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Don't render anything if sidebar is closed
  if (!isOpen) return null;

  return (
    <>
      {/* Overlay (click to close) */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300"
        onClick={() => setSelectedStep(null)}
        aria-label="Close sidebar"
      />

      {/* Sidebar */}
      <aside
        className={`fixed right-0 top-0 h-full w-full md:w-96 bg-white dark:bg-gray-900 shadow-2xl z-50 transform transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header (sticky) */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate flex-1 mr-4">
            {selectedStepName}
          </h2>
          <button
            onClick={() => setSelectedStep(null)}
            className="flex-shrink-0 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto h-[calc(100%-73px)] p-6 space-y-4">
          {stepDetails ? (
            <>
              {/* Cost breakdown section */}
              <CostBreakdown
                cost={stepDetails.costUsd}
                breakdown={stepDetails.costBreakdown}
                duration={stepDetails.duration}
              />

              {/* Output section (if available) */}
              {stepDetails.output && <StepOutput output={stepDetails.output} />}

              {/* Error section (if step failed) */}
              {stepDetails.error && <ErrorDisplay error={stepDetails.error} />}
            </>
          ) : (
            // Loading or no details available
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-3"></div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Loading step details...
                </p>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
