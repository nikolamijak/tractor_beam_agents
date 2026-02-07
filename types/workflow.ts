/**
 * Workflow-related type definitions
 */

export type WorkflowStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type WorkflowType =
  | 'code_generation'
  | 'refactoring'
  | 'documentation'
  | 'testing'
  | 'code_review'
  | 'custom';

export interface Workflow {
  id: string;
  sessionId?: string;
  workflowType: WorkflowType;
  status: WorkflowStatus;
  input: WorkflowInput;
  output?: WorkflowOutput;
  errorMessage?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface WorkflowInput {
  prompt?: string;
  files?: string[];
  parameters?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface WorkflowOutput {
  result?: unknown;
  files?: FileChange[];
  summary?: string;
  [key: string]: unknown;
}

export interface FileChange {
  path: string;
  action: 'create' | 'update' | 'delete';
  content?: string;
  diff?: string;
}

export interface WorkflowStep {
  id: string;
  workflowId: string;
  stepName: string;
  stepOrder: number;
  status: WorkflowStatus;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  errorMessage?: string;
  startedAt?: Date;
  completedAt?: Date;
}

export interface CreateWorkflowRequest {
  workflowType: WorkflowType;
  sessionId?: string;
  input: WorkflowInput;
}

export interface CreateWorkflowResponse {
  workflowId: string;
  status: WorkflowStatus;
}

export interface WorkflowStatusResponse {
  workflow: Workflow;
  steps: WorkflowStep[];
}

export interface WorkflowListQuery {
  status?: WorkflowStatus;
  workflowType?: WorkflowType;
  sessionId?: string;
  limit?: number;
  offset?: number;
}

export interface WorkflowMetrics {
  total: number;
  active: number;
  completed: number;
  failed: number;
  averageDuration: number;
}
