/**
 * Claude API Service
 * Wrapper for Anthropic SDK tailored for Tractor Beam agent execution
 * Handles API calls, error handling, and rate limiting
 */

import Anthropic from '@anthropic-ai/sdk';
import type {
  Message,
  MessageParam,
  MessageCreateParamsNonStreaming,
} from '@anthropic-ai/sdk/resources/messages';

export interface ClaudeApiConfig {
  apiKey?: string;
  defaultModel?: string;
  defaultMaxTokens?: number;
  defaultTemperature?: number;
}

export interface SendMessageOptions {
  system: string;
  messages: MessageParam[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
  tools?: any[];
  apiKey?: string; // Optional API key to override default
}

export interface ClaudeResponse {
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    cacheCreationTokens: number;
    cacheReadTokens: number;
    extendedThinkingTokens: number;
    totalTokens: number;
  };
  model: string;
  stopReason: string | null;
  rawResponse: Message;
}

export class ClaudeApiService {
  private client: Anthropic;
  private defaultModel: string;
  private defaultMaxTokens: number;
  private defaultTemperature: number;

  constructor(config: ClaudeApiConfig = {}) {
    // Initialize Anthropic client
    this.client = new Anthropic({
      apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY,
    });

    // Set defaults
    this.defaultModel = config.defaultModel || 'claude-sonnet-4-20250514';
    this.defaultMaxTokens = config.defaultMaxTokens || 4096;
    this.defaultTemperature = config.defaultTemperature || 0.7;

    console.log(`[ClaudeApiService] Initialized with model: ${this.defaultModel}`);
  }

  /**
   * Send a message to Claude API
   */
  async sendMessage(options: SendMessageOptions): Promise<ClaudeResponse> {
    try {
      // Use provided API key or fall back to instance client
      const client = options.apiKey
        ? new Anthropic({ apiKey: options.apiKey })
        : this.client;

      const params: MessageCreateParamsNonStreaming = {
        model: options.model || this.defaultModel,
        max_tokens: options.maxTokens || this.defaultMaxTokens,
        temperature: options.temperature ?? this.defaultTemperature,
        system: options.system,
        messages: options.messages,
      };

      // Add tools if provided
      if (options.tools && options.tools.length > 0) {
        params.tools = options.tools;
      }

      // Call API with the appropriate client (instance or per-request)
      const response = await client.messages.create(params);

      // Extract text content
      const textContent = response.content
        .filter((block) => block.type === 'text')
        .map((block) => (block as any).text)
        .join('\n');

      // Extract detailed token usage (Anthropic API returns these in usage object)
      const usage = response.usage as any;
      const inputTokens = usage.input_tokens || 0;
      const outputTokens = usage.output_tokens || 0;
      const cacheCreationTokens = usage.cache_creation_input_tokens || 0;
      const cacheReadTokens = usage.cache_read_input_tokens || 0;
      const extendedThinkingTokens = usage.extended_thinking_tokens || 0;

      // Return formatted response
      return {
        content: textContent,
        usage: {
          inputTokens,
          outputTokens,
          cacheCreationTokens,
          cacheReadTokens,
          extendedThinkingTokens,
          totalTokens: inputTokens + outputTokens + cacheCreationTokens + extendedThinkingTokens,
        },
        model: response.model,
        stopReason: response.stop_reason,
        rawResponse: response,
      };
    } catch (error) {
      // Handle API errors
      if (error instanceof Anthropic.APIError) {
        console.error('[ClaudeApiService] API Error:', {
          status: error.status,
          message: error.message,
          type: error.name,
        });

        throw new Error(`Claude API Error (${error.status}): ${error.message}`);
      }

      // Handle other errors
      console.error('[ClaudeApiService] Unexpected error:', error);
      throw error;
    }
  }

  /**
   * Send a simple text message (convenience method)
   */
  async sendSimpleMessage(
    systemPrompt: string,
    userMessage: string,
    options: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
    } = {}
  ): Promise<ClaudeResponse> {
    return this.sendMessage({
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userMessage,
        },
      ],
      model: options.model,
      maxTokens: options.maxTokens,
      temperature: options.temperature,
    });
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.sendSimpleMessage(
        'You are a test assistant. Respond with "OK".',
        'Test connection',
        {
          maxTokens: 10,
        }
      );
      console.log('[ClaudeApiService] ✅ API connection successful');
      return true;
    } catch (error) {
      console.error('[ClaudeApiService] ❌ API connection failed:', error);
      return false;
    }
  }

  /**
   * Get default model name
   */
  getDefaultModel(): string {
    return this.defaultModel;
  }

  /**
   * Get default max tokens
   */
  getDefaultMaxTokens(): number {
    return this.defaultMaxTokens;
  }
}

// Singleton instance
let claudeApiServiceInstance: ClaudeApiService | null = null;

/**
 * Get or create Claude API service instance
 */
export function getClaudeApiService(config?: ClaudeApiConfig): ClaudeApiService {
  if (!claudeApiServiceInstance) {
    claudeApiServiceInstance = new ClaudeApiService(config);
  }
  return claudeApiServiceInstance;
}
