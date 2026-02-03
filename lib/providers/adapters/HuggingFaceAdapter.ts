/**
 * HuggingFace Provider Adapter
 *
 * Implements IModelProvider interface for HuggingFace Inference API models.
 * Supports both chat completion models and text generation models.
 */

import { HfInference } from '@huggingface/inference';
import type {
  IModelProvider,
  CompletionRequest,
  CompletionResponse,
  TokenUsage,
  RateLimitInfo,
  StreamChunk,
  ProviderHealthStatus,
  Message,
} from '../types';
import type { ClientPool } from '../ClientPool';
import { ProviderError } from '../types';

/**
 * HuggingFaceAdapter - HuggingFace Inference API provider implementation
 *
 * Key features:
 * - Uses ClientPool to reuse SDK client instances
 * - Supports both chat completion and text generation models
 * - Automatic detection based on model capabilities
 * - Token usage estimation (HF doesn't always provide exact counts)
 * - Supports streaming for both model types
 * - Does NOT support function calling (most HF models lack this)
 * - Does NOT support vision (deferred for now)
 */
export class HuggingFaceAdapter implements IModelProvider {
  readonly providerName = 'huggingface';
  readonly supportsStreaming = true;
  readonly supportsFunctionCalling = false; // Most HF models don't support function calling
  readonly supportsVision = false; // Defer vision support for now

  private client: HfInference;
  private lastRateLimitInfo: RateLimitInfo | null = null;

  constructor(
    private clientPool: ClientPool,
    private apiKey: string
  ) {
    // Get client from pool to prevent memory leaks
    this.client = clientPool.getHuggingFace(apiKey);
  }

  /**
   * Execute a completion request
   */
  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    try {
      // Determine if model supports chat API (heuristic: check model name)
      const isChatModel = this.isChatModel(request.model);

      if (isChatModel) {
        return await this.completeChatModel(request);
      } else {
        return await this.completeTextModel(request);
      }
    } catch (error) {
      throw this.mapError(error);
    }
  }

  /**
   * Execute a streaming completion request
   */
  async *completeStream(request: CompletionRequest): AsyncIterable<StreamChunk> {
    try {
      const isChatModel = this.isChatModel(request.model);

      if (isChatModel) {
        yield* this.streamChatModel(request);
      } else {
        yield* this.streamTextModel(request);
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
      // Make a minimal text generation request to verify connectivity
      // Use a small, fast model for health checks
      await this.client.textGeneration({
        model: 'gpt2',
        inputs: 'test',
        parameters: {
          max_new_tokens: 5,
        },
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
    // HuggingFace rate limit headers are inconsistent
    // Return null for now
    return this.lastRateLimitInfo;
  }

  // ========================================================================
  // Private Helper Methods - Chat Model Support
  // ========================================================================

  /**
   * Complete using chat completion API
   */
  private async completeChatModel(request: CompletionRequest): Promise<CompletionResponse> {
    const messages = this.formatChatMessages(request);

    const response = await this.client.chatCompletion({
      model: request.model,
      messages,
      max_tokens: request.maxTokens || 4096,
      temperature: request.temperature ?? 0.7,
    });

    const content = response.choices[0]?.message?.content || '';

    // HuggingFace may not provide usage info - estimate if missing
    const usage: TokenUsage = response.usage
      ? {
          inputTokens: (response.usage as any).prompt_tokens || 0,
          outputTokens: (response.usage as any).completion_tokens || 0,
          totalTokens: (response.usage as any).total_tokens || 0,
        }
      : this.estimateUsage(
          this.messagesToText(request.messages, request.systemPrompt),
          content
        );

    return {
      content,
      model: request.model,
      usage,
      stopReason: response.choices[0]?.finish_reason || 'stop',
      rawResponse: response,
    };
  }

  /**
   * Stream using chat completion API
   */
  private async *streamChatModel(request: CompletionRequest): AsyncIterable<StreamChunk> {
    const messages = this.formatChatMessages(request);

    const stream = this.client.chatCompletionStream({
      model: request.model,
      messages,
      max_tokens: request.maxTokens || 4096,
      temperature: request.temperature ?? 0.7,
    });

    let fullContent = '';

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      const content = delta?.content || '';
      const finishReason = chunk.choices[0]?.finish_reason || null;

      fullContent += content;

      if (finishReason) {
        // Final chunk - include usage estimate
        const inputText = this.messagesToText(request.messages, request.systemPrompt);
        yield {
          content,
          finishReason,
          usage: this.estimateUsage(inputText, fullContent),
        };
      } else if (content) {
        yield {
          content,
          finishReason: null,
        };
      }
    }
  }

  // ========================================================================
  // Private Helper Methods - Text Generation Model Support
  // ========================================================================

  /**
   * Complete using text generation API
   */
  private async completeTextModel(request: CompletionRequest): Promise<CompletionResponse> {
    // Concatenate messages into single prompt
    const prompt = this.messagesToText(request.messages, request.systemPrompt);

    const response = await this.client.textGeneration({
      model: request.model,
      inputs: prompt,
      parameters: {
        max_new_tokens: request.maxTokens || 4096,
        temperature: request.temperature ?? 0.7,
        return_full_text: false,
      },
    });

    const content = response.generated_text;

    // Estimate token usage
    const usage = this.estimateUsage(prompt, content);

    return {
      content,
      model: request.model,
      usage,
      stopReason: 'stop',
      rawResponse: response,
    };
  }

  /**
   * Stream using text generation API
   */
  private async *streamTextModel(request: CompletionRequest): AsyncIterable<StreamChunk> {
    const prompt = this.messagesToText(request.messages, request.systemPrompt);

    const stream = this.client.textGenerationStream({
      model: request.model,
      inputs: prompt,
      parameters: {
        max_new_tokens: request.maxTokens || 4096,
        temperature: request.temperature ?? 0.7,
        return_full_text: false,
      },
    });

    let fullContent = '';

    for await (const chunk of stream) {
      const content = chunk.token?.text || '';
      fullContent += content;

      // Check if this is the last chunk
      const isLast = chunk.generated_text !== undefined;

      if (isLast) {
        // Final chunk - include usage estimate
        yield {
          content,
          finishReason: 'stop',
          usage: this.estimateUsage(prompt, fullContent),
        };
      } else if (content) {
        yield {
          content,
          finishReason: null,
        };
      }
    }
  }

  // ========================================================================
  // Private Helper Methods - Message Formatting
  // ========================================================================

  /**
   * Determine if model supports chat API
   * Heuristic: check if model name contains 'chat', 'instruct', or known chat model patterns
   */
  private isChatModel(modelName: string): boolean {
    const chatKeywords = ['chat', 'instruct', 'conversational', 'dialogue'];
    const lowerName = modelName.toLowerCase();
    return chatKeywords.some((keyword) => lowerName.includes(keyword));
  }

  /**
   * Format messages for chat completion API
   */
  private formatChatMessages(request: CompletionRequest): any[] {
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
   * Convert messages to plain text for text generation models
   */
  private messagesToText(messages: Message[], systemPrompt?: string): string {
    let text = '';

    // Add system prompt first
    if (systemPrompt) {
      text += `System: ${systemPrompt}\n\n`;
    }

    // Add all messages with role prefixes
    for (const msg of messages) {
      const rolePrefix = msg.role === 'user' ? 'User' : 'Assistant';
      text += `${rolePrefix}: ${msg.content}\n\n`;
    }

    // End with Assistant prompt for continuation
    text += 'Assistant: ';

    return text;
  }

  // ========================================================================
  // Private Helper Methods - Token Estimation
  // ========================================================================

  /**
   * Estimate token usage when not provided by API
   * Simple approximation: 1 token ≈ 4 characters
   * TODO: Use proper tokenization library for better accuracy
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Estimate usage for both input and output
   */
  private estimateUsage(inputText: string, outputText: string): TokenUsage {
    const inputTokens = this.estimateTokens(inputText);
    const outputTokens = this.estimateTokens(outputText);

    return {
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
    };
  }

  // ========================================================================
  // Private Helper Methods - Error Handling
  // ========================================================================

  /**
   * Map HuggingFace SDK errors to ProviderError
   */
  private mapError(error: unknown): Error {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      const apiError = error as any;
      return new ProviderError(
        apiError.message || 'HuggingFace API error',
        'huggingface',
        apiError.statusCode || 500,
        apiError.statusCode === 429 || (apiError.statusCode || 0) >= 500,
        undefined, // HuggingFace doesn't provide retry-after consistently
        apiError
      );
    }
    return error instanceof Error ? error : new Error(String(error));
  }
}
