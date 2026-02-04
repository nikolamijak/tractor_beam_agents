'use client';

import { useEffect, useMemo } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  Controls,
  MiniMap,
  Background,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { StepNode } from './WorkflowFlowchart/StepNode';
import { StepDetailsSidebar } from './StepDetailsSidebar';
import { useWorkflowLayout } from '@/lib/hooks/useWorkflowLayout';
import { useWorkflowStore } from '@/lib/store/workflowStore';
import { useWorkflowSteps } from '@/lib/hooks/useWorkflowSteps';
import { useWorkflowVisualization } from '@/lib/hooks/useWorkflowVisualization';

interface WorkflowFlowchartProps {
  workflowId: string;
}

const nodeTypes = {
  step: StepNode,
};

export function WorkflowFlowchart({ workflowId }: WorkflowFlowchartProps) {
  // Subscribe to real-time SSE events (updates Zustand store automatically)
  const { isLoading: sseLoading, mode } = useWorkflowVisualization(workflowId);

  const { data: steps, loading, error } = useWorkflowSteps(workflowId);
  const { setNodes: setStoreNodes, setEdges: setStoreEdges } = useWorkflowStore();

  // Transform workflow steps into React Flow nodes
  const rawNodes: Node[] = useMemo(() => {
    if (!steps || steps.length === 0) return [];

    return steps.map((step) => ({
      id: step.functionId,
      type: 'step',
      data: {
        stepName: step.functionName,
        status: step.status.toLowerCase() as 'pending' | 'running' | 'completed' | 'failed',
      },
      position: { x: 0, y: 0 }, // Placeholder, will be updated by layout
    }));
  }, [steps]);

  // Create edges from sequential steps
  const rawEdges: Edge[] = useMemo(() => {
    if (!steps || steps.length < 2) return [];

    const edges: Edge[] = [];
    for (let i = 1; i < steps.length; i++) {
      edges.push({
        id: `e${steps[i - 1].functionId}-${steps[i].functionId}`,
        source: steps[i - 1].functionId,
        target: steps[i].functionId,
        type: 'smoothstep',
      });
    }
    return edges;
  }, [steps]);

  // Apply Dagre layout to nodes
  const layoutedNodes = useWorkflowLayout(rawNodes, rawEdges);

  // React Flow internal state management
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Update React Flow nodes/edges when layout changes
  useEffect(() => {
    if (layoutedNodes.length > 0) {
      setNodes(layoutedNodes);
      setEdges(rawEdges);
      // Also update Zustand store for other components
      setStoreNodes(layoutedNodes);
      setStoreEdges(rawEdges);
    }
  }, [layoutedNodes, rawEdges, setNodes, setEdges, setStoreNodes, setStoreEdges]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[600px] bg-gray-50 dark:bg-gray-900 rounded-lg">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
        <span className="ml-3 text-gray-600 dark:text-gray-400">Loading workflow...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[600px] bg-red-50 dark:bg-red-900/20 rounded-lg">
        <div className="text-center">
          <p className="text-red-800 dark:text-red-300 font-semibold mb-2">Error loading workflow steps</p>
          <p className="text-red-600 dark:text-red-400 text-sm">{error.message}</p>
        </div>
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-[600px] bg-gray-50 dark:bg-gray-900 rounded-lg">
        <p className="text-gray-600 dark:text-gray-400">No workflow steps available</p>
      </div>
    );
  }

  return (
    <>
      <div className="w-full h-[600px] bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 relative">
        {/* Connection mode indicator */}
        {mode === 'sse' && (
          <div className="absolute top-4 right-4 bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-semibold z-10">
            🟢 Live
          </div>
        )}
        {mode === 'polling' && (
          <div className="absolute top-4 right-4 bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-semibold z-10">
            🔄 Polling
          </div>
        )}

        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          fitView
          minZoom={0.1}
          maxZoom={2}
          defaultEdgeOptions={{
            type: 'smoothstep',
            animated: false,
          }}
        >
          <Controls showFitView />
          <MiniMap
            nodeColor={(node) => {
              const status = node.data?.status;
              if (status === 'completed') return '#86efac';
              if (status === 'running') return '#93c5fd';
              if (status === 'failed') return '#fca5a5';
              return '#e5e7eb';
            }}
            maskColor="rgba(0, 0, 0, 0.1)"
          />
          <Background color="#aaa" gap={16} />
        </ReactFlow>
      </div>

      {/* Step details sidebar (overlays canvas when step selected) */}
      <StepDetailsSidebar />
    </>
  );
}
