/**
 * Claude API Manager
 * Manages Claude API sessions using the Anthropic SDK
 * Foundation for Multi-Agent System
 */

import { EventEmitter } from "events";
import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";

/* ────────────────────────────── */
/* Types                           */
/* ────────────────────────────── */

export interface ClaudeSession {
  sessionId: string;
  messages: MessageParam[];
  createdAt: Date;
  lastActivity: Date;
  userId?: string;
  metadata?: Record<string, unknown>;
}

export interface SessionInfo {
  sessionId: string;
  messageCount: number;
  createdAt: Date;
  lastActivity: Date;
  status: "active" | "terminated";
}

export interface ChatChunkData {
  type: "text" | "tool_use" | "error" | "complete";
  content: string;
  metadata?: Record<string, unknown>;
}

export interface ClaudeApiManagerOptions {
  apiKey?: string;
  model?: string;
  maxTokens?: number;
  sessionTimeout?: number;
  maxSessions?: number;
}

/* ────────────────────────────── */
/* Manager                         */
/* ────────────────────────────── */

export class ClaudeApiManager extends EventEmitter {
  private sessions = new Map<string, ClaudeSession>();
  private anthropic: Anthropic;

  private readonly DEFAULT_MODEL = "claude-sonnet-4-5-20250929";
  private readonly DEFAULT_MAX_TOKENS = 8192;
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 min
  private readonly MAX_SESSIONS = 100;

  private model: string;
  private maxTokens: number;
  private sessionTimeout: number;
  private maxSessions: number;

  constructor(options: ClaudeApiManagerOptions = {}) {
    super();

    // Initialize Anthropic client
    this.anthropic = new Anthropic({
      apiKey: options.apiKey || process.env.ANTHROPIC_API_KEY,
    });

    // Set configuration
    this.model = options.model || this.DEFAULT_MODEL;
    this.maxTokens = options.maxTokens || this.DEFAULT_MAX_TOKENS;
    this.sessionTimeout = options.sessionTimeout || this.SESSION_TIMEOUT;
    this.maxSessions = options.maxSessions || this.MAX_SESSIONS;

    console.log(`[ClaudeApiManager] Initialized with model: ${this.model}`);

    this.setupCleanupInterval();
  }

  /* ────────────────────────────── */
  /* Session lifecycle               */
  /* ────────────────────────────── */

  public createSession(userId?: string, metadata?: Record<string, unknown>): SessionInfo {
    if (this.sessions.size >= this.maxSessions) {
      throw new Error("Maximum number of sessions reached");
    }

    const sessionId = this.generateSessionId();

    const session: ClaudeSession = {
      sessionId,
      messages: [],
      createdAt: new Date(),
      lastActivity: new Date(),
      userId,
      metadata,
    };

    this.sessions.set(sessionId, session);

    console.log(`[ClaudeApiManager] Session created: ${sessionId}`);
    this.emit("session:created", sessionId);

    return {
      sessionId,
      messageCount: 0,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity,
      status: "active",
    };
  }

  /* ────────────────────────────── */
  /* Messaging                       */
  /* ────────────────────────────── */

  public async sendMessage(sessionId: string, message: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Add user message to conversation history
    session.messages.push({
      role: "user",
      content: message,
    });

    session.lastActivity = new Date();
    this.emit("message:sent", sessionId, message);
  }

  /* ────────────────────────────── */
  /* Streaming                       */
  /* ────────────────────────────── */

  public async *streamResponse(sessionId: string): AsyncGenerator<ChatChunkData> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    try {
      // Create streaming message request
      const stream = await this.anthropic.messages.stream({
        model: this.model,
        max_tokens: this.maxTokens,
        messages: session.messages,
      });

      let assistantMessage = "";

      // Stream the response
      for await (const chunk of stream) {
        if (chunk.type === "content_block_delta") {
          if (chunk.delta.type === "text_delta") {
            const textDelta = chunk.delta.text;
            assistantMessage += textDelta;

            yield {
              type: "text",
              content: textDelta,
            };
          }
        }
      }

      // Wait for final message
      const finalMessage = await stream.finalMessage();

      // Store assistant's response in conversation history
      session.messages.push({
        role: "assistant",
        content: assistantMessage,
      });

      session.lastActivity = new Date();

      // Emit completion event with metadata
      yield {
        type: "complete",
        content: "",
        metadata: {
          usage: finalMessage.usage,
          stopReason: finalMessage.stop_reason,
        },
      };

      this.emit("message:received", sessionId, assistantMessage);
    } catch (error) {
      console.error(`[ClaudeApiManager] Error streaming response:`, error);

      yield {
        type: "error",
        content: error instanceof Error ? error.message : "Unknown error occurred",
      };

      throw error;
    }
  }

  /* ────────────────────────────── */
  /* Session Management              */
  /* ────────────────────────────── */

  public terminateSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    this.sessions.delete(sessionId);
    console.log(`[ClaudeApiManager] Session terminated: ${sessionId}`);
    this.emit("session:terminated", sessionId);
  }

  public getSessionInfo(sessionId: string): SessionInfo | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    return {
      sessionId,
      messageCount: session.messages.length,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity,
      status: "active",
    };
  }

  public getActiveSessions(): SessionInfo[] {
    return Array.from(this.sessions.values()).map((s) => ({
      sessionId: s.sessionId,
      messageCount: s.messages.length,
      createdAt: s.createdAt,
      lastActivity: s.lastActivity,
      status: "active" as const,
    }));
  }

  public getConversationHistory(sessionId: string): MessageParam[] | null {
    const session = this.sessions.get(sessionId);
    return session ? [...session.messages] : null;
  }

  public clearConversationHistory(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.messages = [];
      session.lastActivity = new Date();
      this.emit("history:cleared", sessionId);
    }
  }

  /* ────────────────────────────── */
  /* Cleanup                         */
  /* ────────────────────────────── */

  private setupCleanupInterval(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [id, session] of this.sessions) {
        if (now - session.lastActivity.getTime() > this.sessionTimeout) {
          console.log(`[ClaudeApiManager] Auto-terminating inactive session: ${id}`);
          this.terminateSession(id);
        }
      }
    }, 5 * 60 * 1000); // Check every 5 minutes
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 10)}`;
  }

  public async cleanup(): Promise<void> {
    const sessionIds = Array.from(this.sessions.keys());
    for (const id of sessionIds) {
      this.terminateSession(id);
    }
    console.log(`[ClaudeApiManager] Cleaned up ${sessionIds.length} sessions`);
  }
}

/* ────────────────────────────── */
/* Singleton                       */
/* ────────────────────────────── */

// Use globalThis to persist singleton across hot reloads in development
const globalForApi = globalThis as unknown as {
  apiManager: ClaudeApiManager | undefined;
};

export function getApiManager(): ClaudeApiManager {
  if (!globalForApi.apiManager) {
    globalForApi.apiManager = new ClaudeApiManager();
  }
  return globalForApi.apiManager;
}
