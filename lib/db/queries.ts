/**
 * Database queries for chat sessions, messages, and workflows
 */

import { query, queryOne, transaction } from './client';
import type { ChatSession, Message } from '@/types/chat';
import type { Workflow, WorkflowStep } from '@/types/workflow';

// ============================================================================
// Chat Sessions
// ============================================================================

export async function createChatSession(
  userId?: string,
  context?: Record<string, unknown>
): Promise<ChatSession> {
  const result = await queryOne<ChatSession>(
    `INSERT INTO chat_sessions (user_id, context)
     VALUES ($1, $2)
     RETURNING *`,
    [userId || null, JSON.stringify(context || {})]
  );

  if (!result) {
    throw new Error('Failed to create chat session');
  }

  return result;
}

export async function getChatSession(
  sessionId: string
): Promise<ChatSession | null> {
  return queryOne<ChatSession>(
    'SELECT * FROM chat_sessions WHERE id = $1',
    [sessionId]
  );
}

export async function updateChatSession(
  sessionId: string,
  updates: Partial<ChatSession>
): Promise<ChatSession | null> {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (updates.context !== undefined) {
    setClauses.push(`context = $${paramIndex++}`);
    values.push(JSON.stringify(updates.context));
  }

  if (updates.status !== undefined) {
    setClauses.push(`status = $${paramIndex++}`);
    values.push(updates.status);
  }

  if (setClauses.length === 0) {
    return getChatSession(sessionId);
  }

  values.push(sessionId);

  return queryOne<ChatSession>(
    `UPDATE chat_sessions
     SET ${setClauses.join(', ')}
     WHERE id = $${paramIndex}
     RETURNING *`,
    values
  );
}

// ============================================================================
// Chat Messages
// ============================================================================

export async function createMessage(
  sessionId: string,
  role: string,
  content: string,
  metadata?: Record<string, unknown>
): Promise<Message> {
  const result = await queryOne<Message>(
    `INSERT INTO chat_messages (session_id, role, content, metadata)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [sessionId, role, content, JSON.stringify(metadata || {})]
  );

  if (!result) {
    throw new Error('Failed to create message');
  }

  return result;
}

export async function getMessages(sessionId: string): Promise<Message[]> {
  return query<Message>(
    `SELECT * FROM chat_messages
     WHERE session_id = $1
     ORDER BY created_at ASC`,
    [sessionId]
  );
}

// ============================================================================
// Workflows
// ============================================================================

export async function createWorkflow(
  workflowType: string,
  input: Record<string, unknown>,
  sessionId?: string
): Promise<Workflow> {
  const result = await queryOne<Workflow>(
    `INSERT INTO workflows (session_id, workflow_type, input, status)
     VALUES ($1, $2, $3, 'pending')
     RETURNING *`,
    [sessionId || null, workflowType, JSON.stringify(input)]
  );

  if (!result) {
    throw new Error('Failed to create workflow');
  }

  return result;
}

export async function getWorkflow(workflowId: string): Promise<Workflow | null> {
  return queryOne<Workflow>(
    'SELECT * FROM workflows WHERE id = $1',
    [workflowId]
  );
}

export async function updateWorkflow(
  workflowId: string,
  updates: Partial<Workflow>
): Promise<Workflow | null> {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (updates.status !== undefined) {
    setClauses.push(`status = $${paramIndex++}`);
    values.push(updates.status);

    if (updates.status === 'running' && !updates.startedAt) {
      setClauses.push(`started_at = NOW()`);
    } else if (
      (updates.status === 'completed' || updates.status === 'failed') &&
      !updates.completedAt
    ) {
      setClauses.push(`completed_at = NOW()`);
    }
  }

  if (updates.output !== undefined) {
    setClauses.push(`output = $${paramIndex++}`);
    values.push(JSON.stringify(updates.output));
  }

  if (updates.errorMessage !== undefined) {
    setClauses.push(`error_message = $${paramIndex++}`);
    values.push(updates.errorMessage);
  }

  if (setClauses.length === 0) {
    return getWorkflow(workflowId);
  }

  values.push(workflowId);

  return queryOne<Workflow>(
    `UPDATE workflows
     SET ${setClauses.join(', ')}
     WHERE id = $${paramIndex}
     RETURNING *`,
    values
  );
}

export async function listWorkflows(filters?: {
  status?: string;
  workflowType?: string;
  sessionId?: string;
  limit?: number;
  offset?: number;
}): Promise<Workflow[]> {
  const whereClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (filters?.status) {
    whereClauses.push(`status = $${paramIndex++}`);
    values.push(filters.status);
  }

  if (filters?.workflowType) {
    whereClauses.push(`workflow_type = $${paramIndex++}`);
    values.push(filters.workflowType);
  }

  if (filters?.sessionId) {
    whereClauses.push(`session_id = $${paramIndex++}`);
    values.push(filters.sessionId);
  }

  const whereClause =
    whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const limit = filters?.limit || 50;
  const offset = filters?.offset || 0;

  return query<Workflow>(
    `SELECT * FROM workflows
     ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...values, limit, offset]
  );
}

// ============================================================================
// Workflow Steps
// ============================================================================

export async function createWorkflowStep(
  workflowId: string,
  stepName: string,
  stepOrder: number,
  input: Record<string, unknown>
): Promise<WorkflowStep> {
  const result = await queryOne<WorkflowStep>(
    `INSERT INTO workflow_steps (workflow_id, step_name, step_order, input)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [workflowId, stepName, stepOrder, JSON.stringify(input)]
  );

  if (!result) {
    throw new Error('Failed to create workflow step');
  }

  return result;
}

export async function updateWorkflowStep(
  stepId: string,
  updates: Partial<WorkflowStep>
): Promise<WorkflowStep | null> {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (updates.status !== undefined) {
    setClauses.push(`status = $${paramIndex++}`);
    values.push(updates.status);

    if (updates.status === 'running' && !updates.startedAt) {
      setClauses.push(`started_at = NOW()`);
    } else if (
      (updates.status === 'completed' || updates.status === 'failed') &&
      !updates.completedAt
    ) {
      setClauses.push(`completed_at = NOW()`);
    }
  }

  if (updates.output !== undefined) {
    setClauses.push(`output = $${paramIndex++}`);
    values.push(JSON.stringify(updates.output));
  }

  if (updates.errorMessage !== undefined) {
    setClauses.push(`error_message = $${paramIndex++}`);
    values.push(updates.errorMessage);
  }

  if (setClauses.length === 0) {
    return null;
  }

  values.push(stepId);

  return queryOne<WorkflowStep>(
    `UPDATE workflow_steps
     SET ${setClauses.join(', ')}
     WHERE id = $${paramIndex}
     RETURNING *`,
    values
  );
}

export async function getWorkflowSteps(
  workflowId: string
): Promise<WorkflowStep[]> {
  return query<WorkflowStep>(
    `SELECT * FROM workflow_steps
     WHERE workflow_id = $1
     ORDER BY step_order ASC`,
    [workflowId]
  );
}
