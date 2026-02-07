/**
 * Individual Session API Routes
 * GET /api/sessions/[id] - Get session details
 * PUT /api/sessions/[id] - Update session
 * DELETE /api/sessions/[id] - Delete session
 */

import { NextRequest, NextResponse } from 'next/server';
import { sessionsRepo } from '@/lib/db/repositories';
import type { SessionUpdate } from '@/lib/db/types';

/**
 * GET /api/sessions/[id]
 * Get session details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await sessionsRepo.findById(id);

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: 'Session not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: session,
    });
  } catch (error) {
    console.error('[API] Error getting session:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get session',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/sessions/[id]
 * Update session
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const updates: SessionUpdate = {
      updated_at: new Date(),
    };

    if (body.technology !== undefined) updates.technology = body.technology;
    if (body.state !== undefined) updates.state = body.state;
    if (body.context !== undefined) updates.context = body.context;
    if (body.expires_at !== undefined) updates.expires_at = body.expires_at;
    if (body.metadata !== undefined) updates.metadata = body.metadata;

    const session = await sessionsRepo.update(id, updates);

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: 'Session not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: session,
    });
  } catch (error) {
    console.error('[API] Error updating session:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update session',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/sessions/[id]
 * Delete session
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = await sessionsRepo.delete(id);

    if (!deleted) {
      return NextResponse.json(
        {
          success: false,
          error: 'Session not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Session deleted successfully',
    });
  } catch (error) {
    console.error('[API] Error deleting session:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete session',
      },
      { status: 500 }
    );
  }
}
