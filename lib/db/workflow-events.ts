/**
 * Database queries for DBOS workflow events and status
 * Provides functions to query dbos.workflow_events and dbos.workflow_status tables
 */

import { db } from './client';
/**
 * Workflow event from dbos.workflow_events table
 */
export interface WorkflowEvent {
  workflow_uuid: string;
  key: string;
  value: any; // JSON parsed
  created_at: Date;
}

/**
 * Workflow status from dbos.workflow_status table
 */
export interface WorkflowStatus {
  workflow_uuid: string;
  name: string;
  status: 'PENDING' | 'SUCCESS' | 'ERROR' | 'ENQUEUED' | 'CANCELLED' | 'RETRIES_EXCEEDED';
  created_at: number;
  updated_at: number;
  output: any | null;
  error: string | null;
}

/**
 * Get all events for a workflow execution from dbos.workflow_events table.
 * Events are returned in chronological order.
 *
 * Note: The dbos.workflow_events table stores current event state (one row per key).
 * The key is typically formatted as "step:{stepName}:{status}" (e.g., "step:intakeStep:started").
 */
export async function getWorkflowEvents(workflowId: string): Promise<WorkflowEvent[]> {
  const rows = await db('dbos.workflow_events')
    .where('workflow_uuid', workflowId)
    .orderBy('workflow_uuid')
    .select('workflow_uuid', 'key', 'value');

  // Parse JSON value field
  // DBOS stores values as strings, need to parse them
  return rows.map(row => ({
    ...row,
    value: typeof row.value === 'string' ? JSON.parse(row.value) : row.value,
    created_at: row.value && typeof row.value === 'string'
      ? new Date(JSON.parse(row.value).timestamp || Date.now())
      : new Date()
  }));
}

/**
 * Get workflow execution status from dbos.workflow_status table.
 * Returns null if workflow not found.
 */
export async function getWorkflowStatus(workflowId: string): Promise<WorkflowStatus | null> {
  const row = await db('dbos.workflow_status')
    .where('workflow_uuid', workflowId)
    .first();

  if (!row) return null;

  // Parse JSON output field if present
  // Convert epoch milliseconds to Date objects
  return {
    workflow_uuid: row.workflow_uuid,
    name: row.name,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
    output: row.output ? (typeof row.output === 'string' ? JSON.parse(row.output) : row.output) : null,
    error: row.error || null
  };
}

/**
 * Get all workflow executions from dbos.workflow_status table.
 * Returns workflows ordered by created_at DESC (most recent first).
 *
 * @param limit - Maximum number of workflows to return (default: 50)
 * @param offset - Number of workflows to skip (default: 0)
 */
export async function getAllWorkflows(limit: number = 50, offset: number = 0): Promise<WorkflowStatus[]> {
  const rows = await db('dbos.workflow_status')
    .orderBy('created_at', 'desc')
    .limit(limit)
    .offset(offset)
    .select('workflow_uuid', 'name', 'status', 'created_at', 'updated_at', 'output', 'error');

  return rows.map(row => ({
    workflow_uuid: row.workflow_uuid,
    name: row.name,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
    output: row.output ? (typeof row.output === 'string' ? JSON.parse(row.output) : row.output) : null,
    error: row.error || null
  }));
}

/**
 * Get historical event changes from dbos.workflow_events_history table.
 * Useful for seeing how event values changed over time.
 *
 * @param workflowId - Workflow UUID
 * @param eventKey - Optional filter for specific event key (e.g., "step:intakeStep:started")
 */
export async function getWorkflowEventsHistory(
  workflowId: string,
  eventKey?: string
): Promise<WorkflowEvent[]> {
  let query = db('dbos.workflow_events_history')
    .where('workflow_uuid', workflowId);

  if (eventKey) {
    query = query.where('key', eventKey);
  }

  const rows = await query
    .orderBy('function_id', 'asc')
    .select('workflow_uuid', 'key', 'value', 'function_id');

  return rows.map(row => ({
    ...row,
    value: typeof row.value === 'string' ? JSON.parse(row.value) : row.value,
    created_at: row.value && typeof row.value === 'string'
      ? new Date(JSON.parse(row.value).timestamp || Date.now())
      : new Date()
  }));
}
