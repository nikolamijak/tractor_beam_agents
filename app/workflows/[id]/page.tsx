'use client';

import { use } from 'react';
import Link from 'next/link';
import { WorkflowVisualization } from '@/components/workflows/WorkflowVisualization';

export default function WorkflowDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <div className="min-h-screen bg-gray-50 p-8 pt-24">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <Link
            href="/workflows"
            className="inline-block px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium mb-4"
          >
            ← Back to Workflows
          </Link>
        </div>

        <WorkflowVisualization workflowId={id} />
      </div>
    </div>
  );
}
