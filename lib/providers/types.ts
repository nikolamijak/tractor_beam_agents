/**
 * Provider Adapter Types
 *
 * Core abstraction layer for multi-provider AI model support.
 * Normalizes different SDK APIs (Anthropic, OpenAI, Groq, HuggingFace) into a unified interface.
 */

// ============================================================================
// Message Types
// ============================================================================

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// ============================================================================
// Tool/Function Calling Types
// ============================================================================

export interface Tool {
  name: string;
  description: string;
  parameters: Record<string, any>;
}

// ============================================================================
// Token Usage & Cost Types
// ============================================================================

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  // Provider-specific optional fields
  cacheCreationTokens?: number;  // Anthropic prompt caching
  cacheReadTokens?: number;       // Anthropic prompt caching
  extendedThinkingTokens?: number; // Anthropic extended thinking
  reasoningTokens?: number;       // OpenAI o1/o3 reasoning
}

// ============================================================================
// Rate Limit Types
// ============================================================================

export interface RateLimitInfo {
  requestsLimit: number;
  requestsRemaining: number;
  requestsResetMs: number;
  tokensLimit: number;
  tokensRemaining: number;
  tokensResetMs: number;
}

// ============================================================================
// Request/Response Types
// ============================================================================

export interface CompletionRequest {
  model: string;
  messages: Message[];
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  tools?: Tool[];
  stream?: boolean;
}

export interface CompletionResponse {
  content: string;
  model: string;
  usage: TokenUsage;
  stopReason: string | null;
  rateLimitInfo?: RateLimitInfo;
  rawResponse?: unknown;
}

export interface StreamChunk {
  content: string;
  finishReason: string | null;
  usage?: TokenUsage;
}

// ============================================================================
// Health Check Types
// ============================================================================

export interface ProviderHealthStatus {
  status: 'healthy' | 'degraded' | 'down';
  latencyMs: number;
  checkedAt: Date;
  error?: string;
}

// ============================================================================
// Error Types
// ============================================================================

export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly statusCode: number,
    public readonly isRetryable: boolean,
    public readonly retryAfterMs?: number,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'ProviderError';

    // Restore prototype chain for proper instanceof checks
    Object.setPrototypeOf(this, ProviderError.prototype);
  }
}

// ============================================================================
// Provider Interface
// ============================================================================

/**
 * IModelProvider - Unified interface for all AI model providers
 *
 * This interface normalizes the different SDK APIs (Anthropic, OpenAI, Groq, etc.)
 * into a common contract. Each provider adapter implements this interface.
 *
 * Capability flags (supportsStreaming, supportsFunctionCalling, supportsVision)
 * allow the application to gracefully handle provider differences without
 * runtime errors.
 */
export interface IModelProvider {
  /** Provider identifier (e.g., 'anthropic', 'openai', 'groq') */
  readonly providerName: string;

  /** Whether provider supports streaming responses */
  readonly supportsStreaming: boolean;

  /** Whether provider supports function/tool calling */
  readonly supportsFunctionCalling: boolean;

  /** Whether provider supports vision/image inputs */
  readonly supportsVision: boolean;

  /**
   * Execute a completion request
   * @param request - The completion request parameters
   * @returns Response with content, usage, and metadata
   * @throws ProviderError on API failures
   */
  complete(request: CompletionRequest): Promise<CompletionResponse>;

  /**
   * Execute a streaming completion request
   * @param request - The completion request parameters (stream will be set to true)
   * @returns AsyncIterable yielding chunks as they arrive
   * @throws ProviderError on API failures
   */
  completeStream(request: CompletionRequest): AsyncIterable<StreamChunk>;

  /**
   * Check provider health/connectivity
   * @returns Health status with latency and any errors
   */
  healthCheck(): Promise<ProviderHealthStatus>;

  /**
   * Get rate limit info from last request
   * @returns Rate limit information or null if not available
   */
  getRateLimitInfo(): RateLimitInfo | null;
}
