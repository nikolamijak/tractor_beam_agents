import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { useWorkflowStore } from '@/lib/store/workflowStore';

interface StepNodeData {
  stepName: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

interface StepNodeProps {
  data: StepNodeData;
}

const statusStyles = {
  pending: {
    bg: 'bg-gray-100',
    text: 'text-gray-800',
    border: 'border-gray-300',
    icon: '⏳',
  },
  running: {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    border: 'border-blue-400',
    icon: '⚙️',
    animation: 'animate-pulse',
  },
  completed: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    border: 'border-green-400',
    icon: '✓',
  },
  failed: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    border: 'border-red-400',
    icon: '✕',
  },
};

const StepNodeComponent = React.memo(({ data }: StepNodeProps) => {
  const { selectedStepName, setSelectedStep } = useWorkflowStore();
  const style = statusStyles[data.status];
  const isSelected = selectedStepName === data.stepName;

  return (
    <div
      onClick={() => setSelectedStep(isSelected ? null : data.stepName)}
      className={`w-48 px-4 py-3 rounded-lg border-2 ${style.bg} ${style.text} ${
        style.border
      } cursor-pointer transition-all hover:shadow-md ${
        style.animation || ''
      } ${isSelected ? 'ring-2 ring-blue-500 shadow-lg' : ''}`}
    >
      <Handle type="target" position={Position.Top} />

      <div className="flex items-center justify-between mb-1">
        <div className="font-medium text-sm truncate flex-1 mr-2">{data.stepName}</div>
        <span className="text-lg flex-shrink-0">{style.icon}</span>
      </div>

      <div className="text-xs font-semibold text-center capitalize opacity-75">
        {data.status}
      </div>

      <Handle type="source" position={Position.Bottom} />
    </div>
  );
});

StepNodeComponent.displayName = 'StepNode';

export const StepNode = StepNodeComponent;
