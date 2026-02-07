/**
 * Session Messages API Route
 * GET /api/sessions/[id]/messages - Get conversation history
 */

import { NextRequest, NextResponse } from 'next/server';
import { sessionsRepo, messagesRepo } from '@/lib/db/repositories';

/**
 * GET /api/sessions/[id]/messages
 * Get conversation history for a session
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const limitStr = searchParams.get('limit');
    const limit = limitStr ? parseInt(limitStr, 10) : undefined;

    // Verify session exists
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

    // Get messages
    const messages = await messagesRepo.getBySession(id, limit);

    return NextResponse.json({
      success: true,
      data: {
        sessionId: id,
        messages,
        count: messages.length,
      },
    });
  } catch (error) {
    console.error('[API] Error getting session messages:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get messages',
      },
      { status: 500 }
    );
  }
}
