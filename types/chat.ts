/**
 * Chat-related type definitions
 */

export type MessageRole = 'user' | 'assistant' | 'system';

export interface Message {
  id: string;
  sessionId: string;
  role: MessageRole;
  content: string;
  metadata?: MessageMetadata;
  createdAt: Date;
}

export interface MessageMetadata {
  toolCalls?: ToolCall[];
  model?: string;
  tokens?: {
    input: number;
    output: number;
  };
  [key: string]: unknown;
}

export interface ToolCall {
  id: string;
  type: string;
  name: string;
  input: Record<string, unknown>;
  output?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  error?: string;
}

export interface ChatSession {
  id: string;
  userId?: string;
  createdAt: Date;
  updatedAt: Date;
  context: SessionContext;
  status: 'active' | 'inactive' | 'archived';
}

export interface SessionContext {
  workingDirectory?: string;
  theme?: 'light' | 'dark';
  model?: string;
  [key: string]: unknown;
}

export interface ChatChunk {
  type: 'text' | 'tool_call' | 'error' | 'complete';
  content: string;
  metadata?: Record<string, unknown>;
}

export interface CreateSessionRequest {
  userId?: string;
  context?: SessionContext;
}

export interface SendMessageRequest {
  sessionId: string;
  content: string;
}

export interface SendMessageResponse {
  messageId: string;
  status: 'sent' | 'error';
  error?: string;
}
