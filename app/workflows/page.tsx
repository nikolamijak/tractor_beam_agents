'use client';

import Link from 'next/link';
import WorkflowList from '@/components/workflows/WorkflowList';
import { WorkflowLauncher } from '@/components/workflows/WorkflowLauncher';

export default function WorkflowsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-8 pt-24">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="text-center flex-1">
              <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Workflows
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-300">
                Launch and manage multi-agent workflows for your SDLC processes
              </p>
            </div>
          </div>
          <div className="text-center mt-4">
            <Link
              href="/dashboard"
              className="inline-block px-6 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:shadow-lg transition-all duration-300 font-medium border border-gray-200 dark:border-gray-700"
            >
              ← Dashboard
            </Link>
          </div>
        </div>

        {/* Workflow Executions List */}
        <div className="mb-8">
          <WorkflowList />
        </div>

        {/* Workflow Launcher */}
        <div className="mb-8">
          <WorkflowLauncher />
        </div>
      </div>
    </div>
  );
}
