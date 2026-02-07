/**
 * React hook for managing chat sessions
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  toolCalls?: unknown[];
}

export interface UseChatOptions {
  sessionId?: string;
  onError?: (error: Error) => void;
}

export interface UseChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  sessionId: string | null;
  createSession: () => Promise<void>;
  sendMessage: (message: string) => Promise<void>;
  clearMessages: () => void;
  terminateSession: () => Promise<void>;
}

export function useChat(options: UseChatOptions = {}): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(
    options.sessionId || null
  );
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Create a new chat session
   */
  const createSession = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error('Failed to create session');
      }

      const data = await response.json();
      setSessionId(data.session.cliSessionId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      if (options.onError) {
        options.onError(new Error(errorMessage));
      }
    } finally {
      setIsLoading(false);
    }
  }, [options]);

  /**
   * Send a message and stream the response
   */
  const sendMessage = useCallback(
    async (message: string) => {
      if (!sessionId) {
        setError('No active session. Please create a session first.');
        return;
      }

      if (!message.trim()) {
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Add user message immediately
        const userMessage: ChatMessage = {
          id: `user_${Date.now()}`,
          role: 'user',
          content: message,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, userMessage]);

        // Create abort controller for this request
        abortControllerRef.current = new AbortController();

        // Send message and stream response
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, message }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error('Failed to send message');
        }

        // Read the stream
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No response body');
        }

        const decoder = new TextDecoder();
        let assistantMessageContent = '';
        const assistantMessageId = `assistant_${Date.now()}`;

        // Add empty assistant message that will be updated
        setMessages(prev => [
          ...prev,
          {
            id: assistantMessageId,
            role: 'assistant',
            content: '',
            timestamp: new Date(),
          },
        ]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          // Decode the chunk
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              try {
                const parsed = JSON.parse(data);

                if (parsed.type === 'text') {
                  assistantMessageContent += parsed.content;

                  // Update the assistant message
                  setMessages(prev =>
                    prev.map(msg =>
                      msg.id === assistantMessageId
                        ? { ...msg, content: assistantMessageContent }
                        : msg
                    )
                  );
                } else if (parsed.type === 'error') {
                  throw new Error(parsed.content);
                }
              } catch (e) {
                // Ignore parsing errors for incomplete chunks
                if (e instanceof Error && e.message !== 'Unexpected end of JSON input') {
                  throw e;
                }
              }
            }
          }
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          // Request was aborted, ignore
          return;
        }

        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        if (options.onError) {
          options.onError(new Error(errorMessage));
        }
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    [sessionId, options]
  );

  /**
   * Clear all messages
   */
  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  /**
   * Terminate the current session
   */
  const terminateSession = useCallback(async () => {
    if (!sessionId) return;

    try {
      // Abort any ongoing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      await fetch(`/api/sessions/${sessionId}`, {
        method: 'DELETE',
      });

      setSessionId(null);
      clearMessages();
    } catch (err) {
      console.error('Error terminating session:', err);
    }
  }, [sessionId, clearMessages]);

  // TODO: Load existing messages when sessionId changes (currently disabled - no database)
  // useEffect(() => {
  //   if (!sessionId) return;

  //   const loadMessages = async () => {
  //     try {
  //       const response = await fetch(`/api/chat?sessionId=${sessionId}`);
  //       if (response.ok) {
  //         const data = await response.json();
  //         if (data.success && data.messages) {
  //           setMessages(
  //             data.messages.map((msg: unknown) => ({
  //               ...(msg as ChatMessage),
  //               timestamp: new Date((msg as ChatMessage).timestamp),
  //             }))
  //           );
  //         }
  //       }
  //     } catch (err) {
  //       console.error('Error loading messages:', err);
  //     }
  //   };

  //   loadMessages();
  // }, [sessionId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    messages,
    isLoading,
    error,
    sessionId,
    createSession,
    sendMessage,
    clearMessages,
    terminateSession,
  };
}
