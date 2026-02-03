/**
 * Groq Provider Adapter
 *
 * Implements IModelProvider interface for Groq LPU inference models.
 * Groq uses OpenAI-compatible API, so this follows the OpenAI pattern.
 */

import Groq from 'groq-sdk';
import type {
  IModelProvider,
  CompletionRequest,
  CompletionResponse,
  TokenUsage,
  RateLimitInfo,
  StreamChunk,
  ProviderHealthStatus,
  Message,
  Tool,
} from '../types';
import type { ClientPool } from '../ClientPool';
import { parseRateLimitHeaders } from '../rateLimitParser';
import { ProviderError } from '../types';

/**
 * GroqAdapter - Groq LPU inference provider implementation
 *
 * Key features:
 * - Uses ClientPool to reuse SDK client instances
 * - Groq API is OpenAI-compatible (same message format)
 * - Parses rate limit headers using OpenAI format (x-ratelimit-*)
 * - Supports streaming with proper usage tracking
 * - Does NOT support vision inputs (Groq limitation)
 */
export class GroqAdapter implements IModelProvider {
  readonly providerName = 'groq';
  readonly supportsStreaming = true;
  readonly supportsFunctionCalling = true;
  readonly supportsVision = false; // Groq doesn't support vision

  private client: Groq;
  private lastRateLimitInfo: RateLimitInfo | null = null;

  constructor(
    private clientPool: ClientPool,
    private apiKey: string
  ) {
    // Get client from pool to prevent memory leaks
    this.client = clientPool.getGroq(apiKey);
  }

  /**
   * Execute a completion request
   */
  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    try {
      const messages = this.formatMessages(request);

      const params: any = {
        model: request.model,
        messages,
        max_tokens: request.maxTokens || 4096,
        temperature: request.temperature ?? 0.7,
      };

      // Add tools if provided and supported
      if (request.tools && request.tools.length > 0) {
        params.tools = this.formatTools(request.tools);
      }

      const response = await this.client.chat.completions.create(params);

      // Extract response content
      const content = response.choices[0]?.message?.content || '';

      // Map token usage
      const usage: TokenUsage = {
        inputTokens: response.usage?.prompt_tokens || 0,
        outputTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      };

      // Parse rate limit headers (Groq uses OpenAI format)
      this.lastRateLimitInfo = this.tryParseRateLimits(response);

      return {
        content,
        model: response.model,
        usage,
        stopReason: response.choices[0]?.finish_reason || null,
        rateLimitInfo: this.lastRateLimitInfo || undefined,
        rawResponse: response,
      };
    } catch (error) {
      throw this.mapError(error);
    }
  }

  /**
   * Execute a streaming completion request
   */
  async *completeStream(request: CompletionRequest): AsyncIterable<StreamChunk> {
    try {
      const messages = this.formatMessages(request);

      const params: any = {
        model: request.model,
        messages,
        max_tokens: request.maxTokens || 4096,
        temperature: request.temperature ?? 0.7,
        stream: true,
        stream_options: { include_usage: true },
      };

      // Add tools if provided
      if (request.tools && request.tools.length > 0) {
        params.tools = this.formatTools(request.tools);
      }

      const stream = await this.client.chat.completions.create(params) as any;

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        const content = delta?.content || '';
        const finishReason = chunk.choices[0]?.finish_reason || null;

        // Groq includes usage in final chunk when stream_options.include_usage is true
        if (chunk.usage) {
          yield {
            content,
            finishReason,
            usage: {
              inputTokens: chunk.usage.prompt_tokens || 0,
              outputTokens: chunk.usage.completion_tokens || 0,
              totalTokens: chunk.usage.total_tokens || 0,
            },
          };
        } else if (content || finishReason) {
          yield {
            content,
            finishReason,
          };
        }
      }
    } catch (error) {
      throw this.mapError(error);
    }
  }

  /**
   * Check provider health
   */
  async healthCheck(): Promise<ProviderHealthStatus> {
    const start = Date.now();
    try {
      // Make a minimal request to verify connectivity
      // Groq SDK has models.list() for checking availability
      await this.client.models.list();

      return {
        status: 'healthy',
        latencyMs: Date.now() - start,
        checkedAt: new Date(),
      };
    } catch (error) {
      return {
        status: 'down',
        latencyMs: Date.now() - start,
        checkedAt: new Date(),
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get rate limit info from last request
   */
  getRateLimitInfo(): RateLimitInfo | null {
    return this.lastRateLimitInfo;
  }

  // ========================================================================
  // Private Helper Methods
  // ========================================================================

  /**
   * Format messages for Groq API (OpenAI-compatible format)
   * If systemPrompt exists, add it as first message with role 'system'
   */
  private formatMessages(request: CompletionRequest): any[] {
    const messages: any[] = [];

    // Add system prompt as first message if provided
    if (request.systemPrompt) {
      messages.push({
        role: 'system',
        content: request.systemPrompt,
      });
    }

    // Add all other messages
    for (const msg of request.messages) {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    }

    return messages;
  }

  /**
   * Format tools for Groq API (OpenAI-compatible format)
   */
  private formatTools(tools: Tool[]): any[] {
    return tools.map((tool) => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));
  }

  /**
   * Try to parse rate limit headers from response
   * Groq uses OpenAI-compatible rate limit headers (x-ratelimit-*)
   */
  private tryParseRateLimits(response: any): RateLimitInfo | null {
    try {
      // Check if response has headers
      const headers = response._headers || response.headers;
      if (!headers) return null;

      // Convert headers to record format
      const headersRecord: Record<string, string> = {};
      if (typeof headers.get === 'function') {
        // Headers object with get method
        const headerNames = [
          'x-ratelimit-limit-requests',
          'x-ratelimit-remaining-requests',
          'x-ratelimit-reset-requests',
          'x-ratelimit-limit-tokens',
          'x-ratelimit-remaining-tokens',
          'x-ratelimit-reset-tokens',
        ];
        for (const name of headerNames) {
          const value = headers.get(name);
          if (value) headersRecord[name] = value;
        }
      } else {
        // Plain object
        Object.assign(headersRecord, headers);
      }

      return parseRateLimitHeaders('groq', headersRecord);
    } catch (error) {
      // Silently fail - rate limits are nice-to-have
      return null;
    }
  }

  /**
   * Map Groq SDK errors to ProviderError
   */
  private mapError(error: unknown): Error {
    // Groq SDK uses similar error structure to OpenAI
    if (error && typeof error === 'object' && 'status' in error) {
      const apiError = error as any;
      return new ProviderError(
        apiError.message || 'Groq API error',
        'groq',
        apiError.status || 500,
        apiError.status === 429 || (apiError.status || 0) >= 500,
        apiError.headers?.['retry-after']
          ? parseInt(apiError.headers['retry-after'], 10) * 1000
          : undefined,
        apiError
      );
    }
    return error instanceof Error ? error : new Error(String(error));
  }
}
