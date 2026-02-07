/**
 * Sessions API Routes
 * GET /api/sessions - List sessions
 * POST /api/sessions - Create session
 */

import { NextRequest, NextResponse } from 'next/server';
import { sessionsRepo } from '@/lib/db/repositories';
import type { SessionInsert } from '@/lib/db/types';

/**
 * GET /api/sessions
 * List sessions for a user
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameter: userId',
        },
        { status: 400 }
      );
    }

    const sessions = await sessionsRepo.listByUser(userId);

    return NextResponse.json({
      success: true,
      data: sessions,
      count: sessions.length,
    });
  } catch (error) {
    console.error('[API] Error listing sessions:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list sessions',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sessions
 * Create a new session
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.user_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required field: user_id',
        },
        { status: 400 }
      );
    }

    const sessionData: SessionInsert = {
      user_id: body.user_id,
      technology: body.technology || null,
      state: body.state || {},
      context: body.context || {},
      expires_at: body.expires_at || null,
      metadata: body.metadata || {},
      total_messages: 0,
      total_input_tokens: 0,
      total_output_tokens: 0,
      total_cache_creation_tokens: 0,
      total_cache_read_tokens: 0,
      total_cost_usd: 0,
    };

    const session = await sessionsRepo.create(sessionData);

    return NextResponse.json(
      {
        success: true,
        data: session,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[API] Error creating session:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create session',
      },
      { status: 500 }
    );
  }
}
