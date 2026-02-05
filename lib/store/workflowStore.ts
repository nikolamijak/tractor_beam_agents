import { create } from 'zustand';
import { Node, Edge } from '@xyflow/react';

interface WorkflowState {
  // Canvas state
  nodes: Node[];
  edges: Edge[];

  // Selection state
  selectedStepName: string | null;

  // Cost tracking
  cumulativeCost: number;
  stepCosts: Record<string, number>;

  // Progress tracking
  completedStepCount: number;
  totalStepCount: number;

  // Actions
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  updateNodeStatus: (
    stepName: string,
    status: 'pending' | 'running' | 'completed' | 'failed'
  ) => void;
  setSelectedStep: (stepName: string | null) => void;
  recordStepCost: (stepName: string, cost: number) => void;
  setTotalStepCount: (count: number) => void;
  incrementCompletedSteps: () => void;
  reset: () => void;
}

export const useWorkflowStore = create<WorkflowState>((set) => ({
  nodes: [],
  edges: [],
  selectedStepName: null,
  cumulativeCost: 0,
  stepCosts: {},
  completedStepCount: 0,
  totalStepCount: 0,

  setNodes: (nodes) => set({ nodes }),

  setEdges: (edges) => set({ edges }),

  updateNodeStatus: (stepName, status) =>
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.data.stepName === stepName
          ? { ...node, data: { ...node.data, status } }
          : node
      ),
    })),

  setSelectedStep: (stepName) => set({ selectedStepName: stepName }),

  recordStepCost: (stepName, cost) =>
    set((state) => {
      const previousCost = state.stepCosts[stepName] || 0;
      return {
        stepCosts: { ...state.stepCosts, [stepName]: cost },
        cumulativeCost: state.cumulativeCost - previousCost + cost,
      };
    }),

  setTotalStepCount: (count) => set({ totalStepCount: count }),

  incrementCompletedSteps: () =>
    set((state) => ({
      completedStepCount: state.completedStepCount + 1,
    })),

  reset: () =>
    set({
      nodes: [],
      edges: [],
      selectedStepName: null,
      cumulativeCost: 0,
      stepCosts: {},
      completedStepCount: 0,
      totalStepCount: 0,
    }),
}));

// Selector for cumulative cost to prevent re-renders on node changes
export const selectCumulativeCost = (state: WorkflowState) =>
  state.cumulativeCost;

// Selector for progress percentage to prevent re-renders
export const selectProgress = (state: WorkflowState) => ({
  completed: state.completedStepCount,
  total: state.totalStepCount,
  percentage:
    state.totalStepCount > 0
      ? Math.round((state.completedStepCount / state.totalStepCount) * 100)
      : 0,
});
