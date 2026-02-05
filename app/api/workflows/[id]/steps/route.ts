import { NextRequest, NextResponse } from 'next/server';
import { getWorkflowEvents } from '@/lib/db/workflow-events';

interface WorkflowStep {
  functionId: string;
  name: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'ERROR';
  output?: any;
  error?: string | null;
  startedAt?: number | null;
  completedAt?: number | null;
  duration?: number | null;
}

/**
 * Transform DBOS workflow_events into WorkflowStep[] format.
 * Groups events by step name and determines status from event keys.
 */
function transformEventsToSteps(workflowId: string, events: any[]): WorkflowStep[] {
  // Group events by step name
  // Event keys are formatted as "step:{stepName}:{status}"
  const stepMap = new Map<string, {
    started?: any;
    completed?: any;
    failed?: any;
  }>();

  for (const event of events) {
    const match = event.key.match(/^step:([^:]+):(\w+)$/);
    if (!match) continue;

    const [, stepName, eventType] = match;

    if (!stepMap.has(stepName)) {
      stepMap.set(stepName, {});
    }

    const stepEvents = stepMap.get(stepName)!;
    stepEvents[eventType as 'started' | 'completed' | 'failed'] = event.value;
  }

  // Convert map to array of WorkflowStep objects
  const steps: WorkflowStep[] = [];
  let stepIndex = 0;

  for (const [stepName, stepEvents] of stepMap.entries()) {
    const { started, completed, failed } = stepEvents;

    // Determine step status
    let status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'ERROR' = 'PENDING';
    if (failed) {
      status = 'ERROR';
    } else if (completed) {
      status = 'SUCCESS';
    } else if (started) {
      status = 'RUNNING';
    }

    // Extract timestamps and duration
    const startedAt = started?.timestamp ? new Date(started.timestamp).getTime() : null;
    const completedAt = completed?.timestamp || failed?.timestamp
      ? new Date(completed?.timestamp || failed?.timestamp).getTime()
      : null;
    const duration = completed?.durationMs || failed?.durationMs || null;

    // Extract output and error
    const output = completed?.output || null;
    const error = failed?.error || null;

    steps.push({
      functionId: `${workflowId}-${stepIndex}`,
      name: stepName,
      status,
      output,
      error,
      startedAt,
      completedAt,
      duration,
    });

    stepIndex++;
  }

  return steps;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Query DBOS workflow_events table for real step data
    const events = await getWorkflowEvents(id);

    if (!events || events.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Workflow not found or no step events recorded' },
        { status: 404 }
      );
    }

    // Transform DBOS events into WorkflowStep[] format
    const transformedSteps = transformEventsToSteps(id, events);

    return NextResponse.json({
      success: true,
      data: transformedSteps,
    });
  } catch (error) {
    console.error('[API] Error fetching workflow steps:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch steps',
      },
      { status: 500 }
    );
  }
}
