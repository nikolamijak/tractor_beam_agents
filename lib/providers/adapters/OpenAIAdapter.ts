/**
 * OpenAI Provider Adapter
 *
 * Implements IModelProvider interface for OpenAI GPT models.
 * Uses ClientPool to prevent memory leaks and enable client reuse.
 */

import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

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

/**
 * OpenAIAdapter - OpenAI GPT provider implementation
 *
 * Key features:
 * - Uses ClientPool to reuse SDK client instances
 * - Supports streaming with usage tracking via stream_options.include_usage
 * - Maps OpenAI token usage (prompt_tokens, completion_tokens) to unified format
 * - Parses x-ratelimit-* headers
 * - Handles reasoning tokens for o1/o3 models
 */
export class OpenAIAdapter implements IModelProvider {
  readonly providerName = 'openai';
  readonly supportsStreaming = true;
  readonly supportsFunctionCalling = true;
  readonly supportsVision = true;

  private client: OpenAI;
  private lastRateLimitInfo: RateLimitInfo | null = null;

  constructor(
    private clientPool: ClientPool,
    private apiKey: string
  ) {
    // Get client from pool - prevents memory leaks
    this.client = clientPool.getOpenAI(apiKey);
  }

  /**
   * Execute a completion request
   */
  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    try {
      const response = await this.client.chat.completions.create({
        model: request.model,
        messages: this.formatMessages(request),
        max_tokens: request.maxTokens,
        temperature: request.temperature ?? 0.7,
        tools: request.tools ? this.formatTools(request.tools) : undefined,
      });

      // Extract response content
      const content = response.choices[0]?.message?.content || '';

      // Map token usage to unified format
      const usage = this.mapTokenUsage(response);

      // Try to parse rate limit headers
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
      const stream = await this.client.chat.completions.create({
        model: request.model,
        messages: this.formatMessages(request),
        max_tokens: request.maxTokens,
        temperature: request.temperature ?? 0.7,
        tools: request.tools ? this.formatTools(request.tools) : undefined,
        stream: true,
        // CRITICAL: include_usage is required to get token counts in streaming
        stream_options: { include_usage: true },
      });

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        const finishReason = chunk.choices[0]?.finish_reason || null;

        // Extract content from delta
        const content = delta?.content || '';

        // Usage is only included in the final chunk
        let usage: TokenUsage | undefined;
        if (chunk.usage) {
          usage = {
            inputTokens: chunk.usage.prompt_tokens || 0,
            outputTokens: chunk.usage.completion_tokens || 0,
            totalTokens: chunk.usage.total_tokens || 0,
            // Handle reasoning tokens for o1/o3 models
            reasoningTokens: (chunk.usage as any).completion_tokens_details?.reasoning_tokens,
          };
        }

        yield {
          content,
          finishReason,
          usage,
        };
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
      // Make minimal API call to check connectivity
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
   * Format messages for OpenAI API
   * OpenAI accepts system messages inline as first message
   */
  private formatMessages(request: CompletionRequest): ChatCompletionMessageParam[] {
    const messages: ChatCompletionMessageParam[] = [];

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
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
      });
    }

    return messages;
  }

  /**
   * Format tools for OpenAI API
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
   * Map OpenAI token usage to unified format
   */
  private mapTokenUsage(response: any): TokenUsage {
    const usage = response.usage || {};

    const inputTokens = usage.prompt_tokens || 0;
    const outputTokens = usage.completion_tokens || 0;
    const reasoningTokens = usage.completion_tokens_details?.reasoning_tokens;

    return {
      inputTokens,
      outputTokens,
      totalTokens: usage.total_tokens || inputTokens + outputTokens,
      reasoningTokens, // For o1/o3 models
    };
  }

  /**
   * Try to parse rate limit headers from response
   * OpenAI SDK may expose headers via response object
   */
  private tryParseRateLimits(response: any): RateLimitInfo | null {
    try {
      // Check if response has headers (may be available via _headers or headers)
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

      return parseRateLimitHeaders('openai', headersRecord);
    } catch (error) {
      // Silently fail - rate limits are nice-to-have
      return null;
    }
  }

  /**
   * Map OpenAI SDK errors to ProviderError
   */
  private mapError(error: unknown): Error {
    if (error && typeof error === 'object' && 'status' in error) {
      const { ProviderError } = require('../types');
      const apiError = error as any;
      return new ProviderError(
        apiError.message || 'OpenAI API error',
        'openai',
        apiError.status || 500,
        apiError.status === 429 || (apiError.status || 0) >= 500,
        undefined,
        apiError
      );
    }
    return error instanceof Error ? error : new Error(String(error));
  }
}
