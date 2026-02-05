/**
 * Workflow Start API Route
 * POST /api/workflows/start - Start a workflow execution
 */

import { NextRequest, NextResponse } from 'next/server';
import { getWorkflowStarters } from '@/lib/dbos';

/**
 * POST /api/workflows/start
 * Start a workflow execution in the background
 */
export async function POST(request: NextRequest) {
  try {
    // DBOS is initialized at application startup via instrumentation.ts
    // Get workflow starters from registry (avoids re-importing workflow modules)
    const {
      startDocumentToStoriesWorkflow,
      startStoryImplementationWorkflow,
      startCodeReviewWorkflow,
      startPrototypeWorkflow
    } = getWorkflowStarters();

    const body = await request.json();

    // Validate workflow name
    if (!body.workflowName) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required field: workflowName',
        },
        { status: 400 }
      );
    }

    // Route to appropriate workflow
    switch (body.workflowName) {
      case 'DocumentToStories':
        // Validate required inputs
        const required = ['userId', 'documentPath', 'documentContent'];
        for (const field of required) {
          if (!body.input?.[field]) {
            return NextResponse.json(
              {
                success: false,
                error: `Missing required input field: ${field}`,
              },
              { status: 400 }
            );
          }
        }

        // Start workflow
        const handle = await startDocumentToStoriesWorkflow({
          userId: body.input.userId,
          documentPath: body.input.documentPath,
          documentContent: body.input.documentContent,
          technology: body.input.technology,
        });

        return NextResponse.json({
          success: true,
          data: {
            workflowId: handle.workflowID,
            workflowName: body.workflowName,
            status: 'PENDING',
            startedAt: new Date().toISOString(),
          },
        });

      case 'StoryImplementation': {
        const requiredFields = ['userId', 'storyId', 'storyTitle', 'storyDescription', 'acceptanceCriteria', 'technology'];
        for (const field of requiredFields) {
          if (!body.input?.[field]) {
            return NextResponse.json(
              { success: false, error: `Missing required input field: ${field}` },
              { status: 400 }
            );
          }
        }

        const handle = await startStoryImplementationWorkflow({
          userId: body.input.userId,
          storyId: body.input.storyId,
          storyTitle: body.input.storyTitle,
          storyDescription: body.input.storyDescription,
          acceptanceCriteria: body.input.acceptanceCriteria,
          technology: body.input.technology,
        });

        return NextResponse.json({
          success: true,
          data: {
            workflowId: handle.workflowID,
            workflowName: body.workflowName,
            status: 'PENDING',
            startedAt: new Date().toISOString(),
          },
        });
      }

      case 'CodeReview': {
        const requiredFields = ['userId', 'code', 'filePath', 'language'];
        for (const field of requiredFields) {
          if (!body.input?.[field]) {
            return NextResponse.json(
              { success: false, error: `Missing required input field: ${field}` },
              { status: 400 }
            );
          }
        }

        const handle = await startCodeReviewWorkflow({
          userId: body.input.userId,
          code: body.input.code,
          filePath: body.input.filePath,
          language: body.input.language,
          context: body.input.context,
        });

        return NextResponse.json({
          success: true,
          data: {
            workflowId: handle.workflowID,
            workflowName: body.workflowName,
            status: 'PENDING',
            startedAt: new Date().toISOString(),
          },
        });
      }

      case 'Prototype': {
        const requiredFields = ['userId', 'idea', 'technology'];
        for (const field of requiredFields) {
          if (!body.input?.[field]) {
            return NextResponse.json(
              { success: false, error: `Missing required input field: ${field}` },
              { status: 400 }
            );
          }
        }

        const handle = await startPrototypeWorkflow({
          userId: body.input.userId,
          idea: body.input.idea,
          technology: body.input.technology,
          targetMarket: body.input.targetMarket,
          constraints: body.input.constraints,
        });

        return NextResponse.json({
          success: true,
          data: {
            workflowId: handle.workflowID,
            workflowName: body.workflowName,
            status: 'PENDING',
            startedAt: new Date().toISOString(),
          },
        });
      }

      default:
        return NextResponse.json(
          {
            success: false,
            error: `Unknown workflow: ${body.workflowName}`,
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[API] Error starting workflow:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start workflow',
      },
      { status: 500 }
    );
  }
}
