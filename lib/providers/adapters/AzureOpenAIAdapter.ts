/**
 * Azure OpenAI Provider Adapter
 *
 * Implements IModelProvider interface for Azure-hosted OpenAI models.
 * Handles Azure-specific configuration (endpoint, deployment, API version).
 */

import { AzureOpenAI } from 'openai';
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
import { parseRateLimitHeaders } from '../rateLimitParser';

/**
 * Azure OpenAI Configuration
 * Required fields for connecting to Azure OpenAI service
 */
export interface AzureOpenAIConfig {
  /** Azure resource endpoint (e.g., https://my-resource.openai.azure.com) */
  endpoint: string;

  /** Azure OpenAI API version (default: 2025-04-01-preview) */
  apiVersion?: string;

  /** API key for authentication (required for now - managed identity deferred) */
  apiKey: string;

  /** Deployment name (replaces model name in requests) */
  deployment: string;
}

/**
 * AzureOpenAIAdapter - Azure OpenAI provider implementation
 *
 * Key features:
 * - Handles Azure-specific configuration (endpoint, deployment, apiVersion)
 * - Uses AzureOpenAI class from openai SDK
 * - Gracefully handles Azure's rate limit -1 bug
 * - Supports streaming with usage tracking via stream_options.include_usage
 * - Maps token usage to unified format
 *
 * Note: Azure clients are NOT pooled like standard OpenAI clients because
 * they require unique endpoint + deployment configuration per instance.
 *
 * TODO: Add managed identity support using @azure/identity
 */
export class AzureOpenAIAdapter implements IModelProvider {
  readonly providerName = 'azure-openai';
  readonly supportsStreaming = true;
  readonly supportsFunctionCalling = true;
  readonly supportsVision = true;

  private client: AzureOpenAI;
  private deployment: string;
  private lastRateLimitInfo: RateLimitInfo | null = null;

  constructor(config: AzureOpenAIConfig) {
    this.deployment = config.deployment;

    // Create Azure OpenAI client with API key authentication
    // TODO: Support managed identity authentication when @azure/identity is added
    this.client = new AzureOpenAI({
      apiKey: config.apiKey,
      endpoint: config.endpoint,
      apiVersion: config.apiVersion || '2025-04-01-preview',
      deployment: config.deployment,
    });
  }

  /**
   * Execute a completion request
   */
  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.deployment, // Azure uses deployment name instead of model
        messages: this.formatMessages(request),
        max_tokens: request.maxTokens,
        temperature: request.temperature ?? 0.7,
        tools: request.tools ? this.formatTools(request.tools) : undefined,
      });

      // Extract response content
      const content = response.choices[0]?.message?.content || '';

      // Map token usage to unified format
      const usage = this.mapTokenUsage(response);

      // Try to parse rate limit headers (handles Azure -1 bug)
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
        model: this.deployment, // Azure uses deployment name
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
            // Handle reasoning tokens if available
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
      // Note: Azure may not support models.list(), so we use a minimal chat completion instead
      await this.client.chat.completions.create({
        model: this.deployment,
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 5,
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
   * Format messages for Azure OpenAI API
   * Same format as standard OpenAI
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
   * Format tools for Azure OpenAI API
   * Same format as standard OpenAI
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
   * Map Azure OpenAI token usage to unified format
   * Same as standard OpenAI
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
      reasoningTokens,
    };
  }

  /**
   * Try to parse rate limit headers from response
   * Azure has a known bug returning -1 values, so we handle gracefully
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
          'retry-after', // Azure fallback for -1 bug
        ];
        for (const name of headerNames) {
          const value = headers.get(name);
          if (value) headersRecord[name] = value;
        }
      } else {
        // Plain object
        Object.assign(headersRecord, headers);
      }

      // Parse with 'azure' provider type (handles -1 bug gracefully)
      return parseRateLimitHeaders('azure', headersRecord);
    } catch (error) {
      // Silently fail - rate limits are nice-to-have
      return null;
    }
  }

  /**
   * Map Azure OpenAI SDK errors to ProviderError
   */
  private mapError(error: unknown): Error {
    if (error && typeof error === 'object' && 'status' in error) {
      const { ProviderError } = require('../types');
      const apiError = error as any;
      return new ProviderError(
        apiError.message || 'Azure OpenAI API error',
        'azure-openai',
        apiError.status || 500,
        apiError.status === 429 || (apiError.status || 0) >= 500,
        undefined,
        apiError
      );
    }
    return error instanceof Error ? error : new Error(String(error));
  }
}
