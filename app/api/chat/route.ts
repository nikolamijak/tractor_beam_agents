/**
 * Chat API Routes
 * POST /api/chat - Send a message and stream the response
 */

import { NextRequest, NextResponse } from 'next/server';
import { getApiManager } from '@/lib/claude/api-manager';
// import { createMessage, getMessages } from '@/lib/db/queries';
import { isNonEmptyString } from '@/lib/utils/validation';

/**
 * POST /api/chat - Send a message to Claude and stream the response
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, message } = body;

    // Validate input
    if (!isNonEmptyString(sessionId)) {
      return NextResponse.json(
        { success: false, error: 'sessionId is required' },
        { status: 400 }
      );
    }

    if (!isNonEmptyString(message)) {
      return NextResponse.json(
        { success: false, error: 'message is required' },
        { status: 400 }
      );
    }

    // TODO: Store user message in database (currently disabled)
    // await createMessage(sessionId, 'user', message);

    // Get API manager and check if session exists
    const apiManager = getApiManager();
    const sessionInfo = apiManager.getSessionInfo(sessionId);

    if (!sessionInfo) {
      console.error(`[Chat API] Session ${sessionId} not found`);
      return NextResponse.json(
        {
          success: false,
          error: 'Session not found or has expired. Please create a new session.'
        },
        { status: 404 }
      );
    }

    // Send message to Claude API
    await apiManager.sendMessage(sessionId, message);

    // Create a streaming response
    const encoder = new TextEncoder();
    let assistantMessageContent = '';

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Stream response from Claude API
          for await (const chunk of apiManager.streamResponse(sessionId)) {
            // Send chunk to client
            const data = JSON.stringify(chunk) + '\n';
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));

            // Accumulate assistant message content
            if (chunk.type === 'text') {
              assistantMessageContent += chunk.content;
            }

            // TODO: If complete, store assistant message in database (currently disabled)
            // if (chunk.type === 'complete') {
            //   if (assistantMessageContent.trim()) {
            //     await createMessage(
            //       sessionId,
            //       'assistant',
            //       assistantMessageContent,
            //       {
            //         metadata: chunk.metadata || {},
            //       }
            //     );
            //   }
            // }
          }

          controller.close();
        } catch (error) {
          console.error('Error streaming response:', error);
          const errorData = JSON.stringify({
            type: 'error',
            content: error instanceof Error ? error.message : 'Unknown error',
          }) + '\n';
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process message',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/chat?sessionId=xxx - Get chat history for a session
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'sessionId is required' },
        { status: 400 }
      );
    }

    // TODO: Get messages from database (currently disabled)
    // const messages = await getMessages(sessionId);

    return NextResponse.json({
      success: true,
      messages: [], // Return empty array for now
    });
  } catch (error) {
    console.error('Error getting chat history:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get chat history',
      },
      { status: 500 }
    );
  }
}
