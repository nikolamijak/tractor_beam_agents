/**
 * Agent Executor
 * Generic executor that works with ALL agents loaded from database
 * Core component that connects agents, database, and Claude API
 */

import type { MessageParam } from '@anthropic-ai/sdk/resources/messages';
import { ClaudeApiService, getClaudeApiService } from '../services/ClaudeApiService';
import { CostCalculatorService } from '../services/CostCalculatorService';
import {
  agentDefinitionsRepo,
  modelsRepo,
  sessionsRepo,
  messagesRepo,
  agentHealthRepo,
} from '../db/repositories';
import type { AgentDefinition, AgentMessage, ModelWithProvider, TokenUsage } from '../db/types';
import { getProviderRegistry } from '../providers';
import type { IModelProvider, CompletionRequest, Message } from '../providers';

export interface AgentExecutionContext {
  sessionId: string;
  userId?: string;
  includeHistory?: boolean;
  maxHistoryMessages?: number;
  metadata?: Record<string, any>;
}

export interface AgentExecutionResult {
  success: boolean;
  output: any;
  tokensUsed: number;
  costUsd: number;
  model: string;
  agentName: string;
  executionTime: number;
  error?: string;
}

interface AgentWithModel {
  agent: AgentDefinition;
  modelInfo: ModelWithProvider;
}

export class AgentExecutor {
  private claudeApi: ClaudeApiService;

  constructor(claudeApi?: ClaudeApiService) {
    this.claudeApi = claudeApi || getClaudeApiService();
  }

  /**
   * Execute an agent by name with input
   * This is the main entry point for agent execution
   */
  async execute(
    agentName: string,
    input: string,
    context: AgentExecutionContext
  ): Promise<AgentExecutionResult> {
    const startTime = Date.now();

    try {
      // 1. Load agent definition from database with model info
      const { agent, modelInfo } = await this.loadAgent(agentName);

      // 2. Build messages array (optionally including conversation history)
      const messagesArray = await this.buildMessages(input, context);

      // 3. Get provider adapter from registry
      const registry = getProviderRegistry();
      const providerName = modelInfo.provider.provider_name; // e.g., 'anthropic', 'openai'

      // Get API key from provider settings or environment variable
      const apiKey = modelInfo.provider.api_key ||
        process.env[`${providerName.toUpperCase()}_API_KEY`] ||
        process.env.ANTHROPIC_API_KEY; // Fallback for backward compatibility

      if (!apiKey) {
        throw new Error(
          `No API key configured for provider "${modelInfo.provider.display_name}". ` +
            `Please set an API key in the provider settings or ${providerName.toUpperCase()}_API_KEY environment variable.`
        );
      }

      // Get adapter (handle Azure config if needed)
      let adapter: IModelProvider;
      if (providerName === 'azure-openai') {
        adapter = registry.getAdapter(providerName, apiKey, {
          endpoint: process.env.AZURE_OPENAI_ENDPOINT,
          deployment: modelInfo.model_name, // Use model_name as deployment
          apiVersion: process.env.AZURE_OPENAI_API_VERSION,
        });
      } else {
        adapter = registry.getAdapter(providerName, apiKey);
      }

      // 4. Convert messages to provider-agnostic format
      const providerMessages: Message[] = messagesArray.map((msg: MessageParam) => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
      }));

      // Build CompletionRequest
      const completionRequest: CompletionRequest = {
        model: modelInfo.model_name,
        messages: providerMessages,
        systemPrompt: agent.system_prompt, // ★ FROM DATABASE!
        maxTokens: agent.max_tokens,
        temperature: Number(agent.temperature),
        tools: agent.tools.length > 0 ? (agent.tools as any) : undefined, // Type assertion for JSONB
      };

      // 5. Execute via provider adapter
      const response = await adapter.complete(completionRequest);

      // 5. Calculate cost if model pricing is available
      let totalCost = 0;
      if (modelInfo?.pricing) {
        const tokenUsage: TokenUsage = {
          input_tokens: response.usage.inputTokens,
          output_tokens: response.usage.outputTokens,
          cache_creation_tokens: response.usage.cacheCreationTokens || 0,
          cache_read_tokens: response.usage.cacheReadTokens || 0,
          extended_thinking_tokens: response.usage.extendedThinkingTokens || 0,
        };

        const costBreakdown = CostCalculatorService.calculateCost(tokenUsage, modelInfo.pricing);
        totalCost = costBreakdown.total_cost;
      }

      // 6. Save conversation to database with detailed token tracking
      await this.saveMessages(
        context.sessionId,
        agent.id,
        input,
        response.content,
        {
          inputTokens: response.usage.inputTokens,
          outputTokens: response.usage.outputTokens,
          cacheCreationTokens: response.usage.cacheCreationTokens || 0,
          cacheReadTokens: response.usage.cacheReadTokens || 0,
          extendedThinkingTokens: response.usage.extendedThinkingTokens || 0,
          totalTokens: response.usage.totalTokens,
        },
        totalCost,
        modelInfo,
        context.metadata
      );

      // 7. Update session cost aggregates
      await this.updateSessionCosts(
        context.sessionId,
        {
          inputTokens: response.usage.inputTokens,
          outputTokens: response.usage.outputTokens,
          cacheCreationTokens: response.usage.cacheCreationTokens || 0,
          cacheReadTokens: response.usage.cacheReadTokens || 0,
        },
        totalCost
      );

      // 8. Update agent health metrics
      await this.updateAgentHealth(agent.id, response.usage.totalTokens, false);

      // 9. Parse and return output
      const output = this.parseOutput(response.content);
      const executionTime = Date.now() - startTime;

      return {
        success: true,
        output,
        tokensUsed: response.usage.totalTokens,
        costUsd: totalCost,
        model: response.model,
        agentName: agent.agent_name,
        executionTime,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      console.error(`[AgentExecutor] Error executing agent "${agentName}":`, error);

      // Try to update health metrics even on failure
      try {
        const agent = await agentDefinitionsRepo.findByName(agentName);
        if (agent) {
          await this.updateAgentHealth(agent.id, 0, true);
        }
      } catch (healthError) {
        console.error('[AgentExecutor] Failed to update health metrics:', healthError);
      }

      return {
        success: false,
        output: null,
        tokensUsed: 0,
        costUsd: 0,
        model: '',
        agentName,
        executionTime,
        error: errorMessage,
      };
    }
  }

  /**
   * Load agent definition from database with model information
   * @private
   */
  private async loadAgent(agentName: string): Promise<AgentWithModel> {
    const agent = await agentDefinitionsRepo.findByName(agentName);

    if (!agent) {
      throw new Error(`Agent "${agentName}" not found in database`);
    }

    if (!agent.is_enabled) {
      throw new Error(`Agent "${agentName}" is disabled`);
    }

    // Load model information via model_id
    if (!agent.model_id) {
      throw new Error(`Agent "${agentName}" has no model_id configured`);
    }

    const modelInfo = await modelsRepo.findByIdWithProvider(agent.model_id);
    if (!modelInfo) {
      throw new Error(`Model ID ${agent.model_id} not found for agent ${agentName}`);
    }

    return { agent, modelInfo };
  }

  /**
   * Build messages array for Claude API
   * Optionally includes conversation history from database
   * @private
   */
  private async buildMessages(
    input: string,
    context: AgentExecutionContext
  ): Promise<MessageParam[]> {
    const messages: MessageParam[] = [];

    // Include conversation history if requested
    if (context.includeHistory) {
      const maxMessages = context.maxHistoryMessages || 10;
      const history = await messagesRepo.getRecentBySession(context.sessionId, maxMessages);

      // Add historical messages
      for (const msg of history) {
        messages.push({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        });
      }
    }

    // Add current user message
    messages.push({
      role: 'user',
      content: input,
    });

    return messages;
  }

  /**
   * Save messages to database with detailed token tracking
   * @private
   */
  private async saveMessages(
    sessionId: string,
    agentId: string,
    userInput: string,
    assistantOutput: string,
    usage: {
      inputTokens: number;
      outputTokens: number;
      cacheCreationTokens: number;
      cacheReadTokens: number;
      extendedThinkingTokens: number;
      totalTokens: number;
    },
    totalCost: number,
    modelInfo: ModelWithProvider | null,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const modelName = modelInfo?.model_name || 'unknown';
      const pricingSnapshot = modelInfo?.pricing || { input_per_mtok: 0, output_per_mtok: 0 };

      // Calculate input cost (for user message)
      let inputCost = 0;
      if (modelInfo?.pricing) {
        const inputUsage: TokenUsage = {
          input_tokens: usage.inputTokens,
          output_tokens: 0,
          cache_creation_tokens: usage.cacheCreationTokens,
          cache_read_tokens: usage.cacheReadTokens,
        };
        const breakdown = CostCalculatorService.calculateCost(inputUsage, modelInfo.pricing);
        inputCost = breakdown.input_cost + breakdown.cache_creation_cost + breakdown.cache_read_cost;
      }

      // Calculate output cost (for assistant message)
      const outputCost = totalCost - inputCost;

      // Save user message
      await messagesRepo.create({
        session_id: sessionId,
        agent_definition_id: agentId,
        role: 'user',
        content: userInput,
        tokens_used: usage.inputTokens + usage.cacheCreationTokens + usage.cacheReadTokens,
        input_tokens: usage.inputTokens,
        output_tokens: 0,
        cache_creation_tokens: usage.cacheCreationTokens,
        cache_read_tokens: usage.cacheReadTokens,
        extended_thinking_tokens: 0,
        total_cost_usd: inputCost,
        pricing_snapshot: pricingSnapshot,
        model: modelName,
        metadata: metadata || {},
      });

      // Save assistant message
      await messagesRepo.create({
        session_id: sessionId,
        agent_definition_id: agentId,
        role: 'assistant',
        content: assistantOutput,
        tokens_used: usage.outputTokens + usage.extendedThinkingTokens,
        input_tokens: 0,
        output_tokens: usage.outputTokens,
        cache_creation_tokens: 0,
        cache_read_tokens: 0,
        extended_thinking_tokens: usage.extendedThinkingTokens,
        total_cost_usd: outputCost,
        pricing_snapshot: pricingSnapshot,
        model: modelName,
        metadata: metadata || {},
      });
    } catch (error) {
      console.error('[AgentExecutor] Failed to save messages:', error);
      // Don't throw - message saving failures shouldn't break agent execution
    }
  }

  /**
   * Update session cost aggregates
   * @private
   */
  private async updateSessionCosts(
    sessionId: string,
    usage: {
      inputTokens: number;
      outputTokens: number;
      cacheCreationTokens: number;
      cacheReadTokens: number;
    },
    costUsd: number
  ): Promise<void> {
    try {
      await sessionsRepo.updateCosts(sessionId, {
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        cacheCreationTokens: usage.cacheCreationTokens,
        cacheReadTokens: usage.cacheReadTokens,
        costUsd,
      });
    } catch (error) {
      console.error('[AgentExecutor] Failed to update session costs:', error);
      // Don't throw - cost update failures shouldn't break agent execution
    }
  }

  /**
   * Update agent health metrics
   * @private
   */
  private async updateAgentHealth(
    agentId: string,
    tokensUsed: number,
    failed: boolean
  ): Promise<void> {
    try {
      await agentHealthRepo.incrementRequests(agentId, tokensUsed, failed);

      // Update status based on recent failures
      if (failed) {
        const health = await agentHealthRepo.getOrCreate(agentId);
        const failureRate = health.failed_requests / Math.max(health.total_requests, 1);

        let status: 'healthy' | 'degraded' | 'down' = 'healthy';
        if (failureRate > 0.5) {
          status = 'down';
        } else if (failureRate > 0.2) {
          status = 'degraded';
        }

        await agentHealthRepo.update(agentId, { status });
      }
    } catch (error) {
      console.error('[AgentExecutor] Failed to update health metrics:', error);
      // Don't throw - health metric failures shouldn't break agent execution
    }
  }

  /**
   * Parse agent output
   * Attempts to parse JSON, falls back to raw text
   * @private
   */
  private parseOutput(content: string): any {
    try {
      // Try to parse as JSON
      return JSON.parse(content);
    } catch {
      // If not JSON, check if it contains JSON in markdown code blocks
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[1]);
        } catch {
          // Fall through to return raw content
        }
      }

      // Return raw content if not parseable
      return content;
    }
  }

  /**
   * Test agent execution with a simple ping
   */
  async testAgent(agentName: string): Promise<boolean> {
    try {
      // Create a test session
      const testSession = await sessionsRepo.create({
        user_id: 'system_test',
        technology: null,
        state: {},
        context: { test: true },
        total_messages: 0,
        total_input_tokens: 0,
        total_output_tokens: 0,
        total_cache_creation_tokens: 0,
        total_cache_read_tokens: 0,
        total_cost_usd: 0,
        expires_at: null,
        metadata: { test: true },
      });

      const result = await this.execute(agentName, 'Test ping', {
        sessionId: testSession.id,
        userId: 'system_test',
        includeHistory: false,
      });

      // Clean up test session
      await sessionsRepo.delete(testSession.id);

      return result.success;
    } catch (error) {
      console.error(`[AgentExecutor] Agent test failed:`, error);
      return false;
    }
  }
}

// Singleton instance
let agentExecutorInstance: AgentExecutor | null = null;

/**
 * Get or create AgentExecutor instance
 */
export function getAgentExecutor(claudeApi?: ClaudeApiService): AgentExecutor {
  if (!agentExecutorInstance) {
    agentExecutorInstance = new AgentExecutor(claudeApi);
  }
  return agentExecutorInstance;
}
