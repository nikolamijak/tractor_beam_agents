'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DynamicWorkflowForm } from './DynamicWorkflowForm';

interface Workflow {
  name: string;
  description: string;
  requiredInputs: string[];
  optionalInputs: string[];
  estimatedDuration?: string;
}

// Hardcoded workflow definitions (source of truth for launcher UI)
// These match the actual workflow implementations in lib/dbos/workflows/
const WORKFLOW_DEFINITIONS: Workflow[] = [
  {
    name: 'DocumentToStoriesWorkflow',
    description: 'Parse project documents and generate user stories with acceptance criteria',
    requiredInputs: ['documentContent'],
    optionalInputs: ['projectContext', 'existingStories'],
    estimatedDuration: '2-5 minutes',
  },
  {
    name: 'StoryImplementationWorkflow',
    description: 'Implement a user story with code generation, testing, and review',
    requiredInputs: ['storyId', 'storyDescription'],
    optionalInputs: ['technicalContext', 'constraints'],
    estimatedDuration: '5-15 minutes',
  },
  {
    name: 'CodeReviewWorkflow',
    description: 'Automated code review with security, performance, and style analysis',
    requiredInputs: ['repositoryUrl', 'branch'],
    optionalInputs: ['filePaths', 'reviewDepth'],
    estimatedDuration: '3-8 minutes',
  },
  {
    name: 'PrototypeWorkflow',
    description: 'Rapid prototyping from concept to working MVP with architecture decisions',
    requiredInputs: ['concept', 'requirements'],
    optionalInputs: ['techStack', 'constraints'],
    estimatedDuration: '10-20 minutes',
  },
];

export function WorkflowLauncher() {
  const [workflows] = useState<Workflow[]>(WORKFLOW_DEFINITIONS);
  const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null);
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLaunch = async (values: Record<string, string>) => {
    if (!selectedWorkflow) return;

    setLaunching(true);
    setError(null);

    try {
      const response = await fetch('/api/workflows/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflowName: selectedWorkflow,
          input: values,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Redirect to workflow detail page
        router.push(`/workflows/${result.data.workflowId}`);
      } else {
        setError(result.error || 'Failed to launch workflow');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to launch workflow');
    } finally {
      setLaunching(false);
    }
  };

  const selectedWorkflowData = workflows.find((w) => w.name === selectedWorkflow);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Launch Workflow</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Select a workflow and provide the required inputs to start execution
        </p>
      </div>

      <div className="p-6">
        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <p className="text-sm text-red-800 dark:text-red-200">
              <strong>Error:</strong> {error}
            </p>
          </div>
        )}

        <div className="mb-6">
          <label htmlFor="workflow-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Select Workflow <span className="text-red-500">*</span>
          </label>
          <select
            id="workflow-select"
            value={selectedWorkflow || ''}
            onChange={(e) => setSelectedWorkflow(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Choose a workflow...</option>
            {workflows.map((w) => (
              <option key={w.name} value={w.name}>
                {w.name} - {w.description}
              </option>
            ))}
          </select>
        </div>

        {selectedWorkflowData && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {selectedWorkflowData.name}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{selectedWorkflowData.description}</p>
              {selectedWorkflowData.estimatedDuration && (
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  Estimated duration: {selectedWorkflowData.estimatedDuration}
                </p>
              )}
            </div>

            <DynamicWorkflowForm
              workflow={selectedWorkflowData}
              onSubmit={handleLaunch}
              loading={launching}
            />
          </div>
        )}

        {!selectedWorkflowData && workflows.length > 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <svg
              className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600 mb-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            <p className="text-sm">Select a workflow from the dropdown to begin</p>
          </div>
        )}

        {workflows.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p className="text-sm">No workflows available</p>
          </div>
        )}
      </div>
    </div>
  );
}
