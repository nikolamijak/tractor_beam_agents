/**
 * Anthropic Provider Adapter
 *
 * Implements IModelProvider interface for Anthropic Claude models.
 * Uses ClientPool to prevent memory leaks (fixes issue in ClaudeApiService.ts:72-74).
 */

import Anthropic from '@anthropic-ai/sdk';
import type {
  Message as AnthropicMessage,
  MessageParam,
  MessageCreateParamsNonStreaming,
  MessageCreateParamsStreaming,
  MessageStreamEvent,
} from '@anthropic-ai/sdk/resources/messages';

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
 * AnthropicAdapter - Anthropic Claude provider implementation
 *
 * Key features:
 * - Uses ClientPool to reuse SDK client instances (fixes memory leak)
 * - Parses rate limit headers from Anthropic responses
 * - Maps Anthropic token usage to unified TokenUsage format
 * - Supports streaming with proper usage tracking
 * - Compatible with existing ClaudeApiService behavior
 */
export class AnthropicAdapter implements IModelProvider {
  readonly providerName = 'anthropic';
  readonly supportsStreaming = true;
  readonly supportsFunctionCalling = true;
  readonly supportsVision = true;

  private client: Anthropic;
  private lastRateLimitInfo: RateLimitInfo | null = null;

  constructor(
    private clientPool: ClientPool,
    private apiKey: string
  ) {
    // Get client from pool - this FIXES the memory leak in ClaudeApiService
    this.client = clientPool.getAnthropic(apiKey);
  }

  /**
   * Execute a completion request
   */
  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    try {
      const params: MessageCreateParamsNonStreaming = {
        model: request.model,
        max_tokens: request.maxTokens || 4096,
        temperature: request.temperature ?? 0.7,
        messages: this.formatMessages(request.messages),
      };

      // Add system prompt if provided (Anthropic has separate system field)
      if (request.systemPrompt) {
        params.system = request.systemPrompt;
      }

      // Add tools if provided
      if (request.tools && request.tools.length > 0) {
        params.tools = this.formatTools(request.tools);
      }

      const response = await this.client.messages.create(params);

      // Extract text content
      const content = response.content
        .filter((block) => block.type === 'text')
        .map((block) => (block as any).text)
        .join('\n');

      // Map token usage to unified format
      const usage = this.mapTokenUsage(response);

      // Try to parse rate limit headers (Anthropic SDK may expose via response)
      // Note: Anthropic SDK doesn't directly expose headers, but we try
      this.lastRateLimitInfo = this.tryParseRateLimits(response);

      return {
        content,
        model: response.model,
        usage,
        stopReason: response.stop_reason,
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
      const params: MessageCreateParamsStreaming = {
        model: request.model,
        max_tokens: request.maxTokens || 4096,
        temperature: request.temperature ?? 0.7,
        messages: this.formatMessages(request.messages),
        stream: true,
      };

      // Add system prompt if provided
      if (request.systemPrompt) {
        params.system = request.systemPrompt;
      }

      // Add tools if provided
      if (request.tools && request.tools.length > 0) {
        params.tools = this.formatTools(request.tools);
      }

      const stream = await this.client.messages.create(params);

      let finalUsage: TokenUsage | undefined;

      for await (const event of stream) {
        // Handle different stream event types
        if (event.type === 'content_block_delta') {
          if (event.delta.type === 'text_delta') {
            yield {
              content: event.delta.text,
              finishReason: null,
            };
          }
        } else if (event.type === 'message_delta') {
          // Anthropic sends usage in message_delta
          if (event.usage) {
            const usage = event.usage as any;
            finalUsage = {
              inputTokens: 0, // Not included in delta
              outputTokens: usage.output_tokens || 0,
              totalTokens: usage.output_tokens || 0,
            };
          }
        } else if (event.type === 'message_stop') {
          // Final chunk with usage
          if (finalUsage) {
            yield {
              content: '',
              finishReason: 'stop',
              usage: finalUsage,
            };
          }
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
      await this.client.messages.create({
        model: 'claude-3-haiku-20240307', // Use cheapest model
        max_tokens: 10,
        messages: [{ role: 'user', content: 'ping' }],
      });

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
   * Format messages for Anthropic API
   * Anthropic uses separate system field, so we filter out system messages
   */
  private formatMessages(messages: Message[]): MessageParam[] {
    return messages
      .filter((msg) => msg.role !== 'system')
      .map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }));
  }

  /**
   * Format tools for Anthropic API
   */
  private formatTools(tools: Tool[]): any[] {
    return tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: {
        type: 'object',
        properties: tool.parameters,
      },
    }));
  }

  /**
   * Map Anthropic token usage to unified format
   */
  private mapTokenUsage(response: AnthropicMessage): TokenUsage {
    const usage = response.usage as any;

    const inputTokens = usage.input_tokens || 0;
    const outputTokens = usage.output_tokens || 0;
    const cacheCreationTokens = usage.cache_creation_input_tokens || 0;
    const cacheReadTokens = usage.cache_read_input_tokens || 0;
    const extendedThinkingTokens = usage.extended_thinking_tokens || 0;

    return {
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens + cacheCreationTokens + extendedThinkingTokens,
      cacheCreationTokens,
      cacheReadTokens,
      extendedThinkingTokens,
    };
  }

  /**
   * Try to parse rate limit headers from response
   * Note: Anthropic SDK doesn't directly expose headers in v0.32+
   * This is a best-effort attempt
   */
  private tryParseRateLimits(response: any): RateLimitInfo | null {
    try {
      // Check if response has headers (may be available via rawResponse or _headers)
      const headers = response._headers || response.headers;
      if (!headers) return null;

      // Convert headers to record format
      const headersRecord: Record<string, string> = {};
      if (typeof headers.get === 'function') {
        // Headers object with get method
        const headerNames = [
          'anthropic-ratelimit-requests-limit',
          'anthropic-ratelimit-requests-remaining',
          'anthropic-ratelimit-requests-reset',
          'anthropic-ratelimit-tokens-limit',
          'anthropic-ratelimit-tokens-remaining',
          'anthropic-ratelimit-tokens-reset',
        ];
        for (const name of headerNames) {
          const value = headers.get(name);
          if (value) headersRecord[name] = value;
        }
      } else {
        // Plain object
        Object.assign(headersRecord, headers);
      }

      return parseRateLimitHeaders('anthropic', headersRecord);
    } catch (error) {
      // Silently fail - rate limits are nice-to-have
      return null;
    }
  }

  /**
   * Map Anthropic SDK errors to ProviderError
   */
  private mapError(error: unknown): Error {
    if (error instanceof Anthropic.APIError) {
      const { ProviderError } = require('../types');
      return new ProviderError(
        error.message,
        'anthropic',
        error.status || 500,
        error.status === 429 || (error.status || 0) >= 500,
        undefined, // Anthropic doesn't provide retry-after in error
        error
      );
    }
    return error instanceof Error ? error : new Error(String(error));
  }
}
