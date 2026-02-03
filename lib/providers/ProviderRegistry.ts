/**
 * ProviderRegistry - Provider adapter factory and registry
 *
 * Central registry that maps provider names to adapter instances.
 * Handles adapter caching to prevent duplicate client instantiation.
 */

import {
  AnthropicAdapter,
  OpenAIAdapter,
  AzureOpenAIAdapter,
  GroqAdapter,
  HuggingFaceAdapter,
  type AzureOpenAIConfig,
} from './adapters';
import type { IModelProvider } from './types';
import { getClientPool, type ClientPool } from './ClientPool';
import type { ProviderHealthStatus } from './types';

// ============================================================================
// Types
// ============================================================================

export interface ProviderRegistryOptions {
  clientPool?: ClientPool;
}

// ============================================================================
// ProviderRegistry Class
// ============================================================================

export class ProviderRegistry {
  private clientPool: ClientPool;
  private adapters: Map<string, IModelProvider>;

  constructor(options: ProviderRegistryOptions = {}) {
    this.clientPool = options.clientPool || getClientPool();
    this.adapters = new Map();
  }

  /**
   * Get adapter for a provider
   * Creates adapter if not cached, otherwise returns cached instance
   *
   * @param providerName - Provider identifier (anthropic, openai, azure-openai, groq, huggingface)
   * @param apiKey - API key for the provider
   * @param config - Optional provider-specific configuration (required for Azure)
   * @returns Provider adapter instance
   */
  getAdapter(providerName: string, apiKey: string, config?: any): IModelProvider {
    // Generate cache key based on provider and configuration
    const cacheKey = this.generateCacheKey(providerName, apiKey, config);

    // Return cached adapter if exists
    const cached = this.adapters.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Create new adapter based on provider name
    let adapter: IModelProvider;

    switch (providerName.toLowerCase()) {
      case 'anthropic':
        adapter = new AnthropicAdapter(this.clientPool, apiKey);
        break;

      case 'openai':
        adapter = new OpenAIAdapter(this.clientPool, apiKey);
        break;

      case 'azure-openai':
        if (!config?.endpoint || !config?.deployment) {
          throw new Error(
            'Azure OpenAI requires config with endpoint and deployment fields'
          );
        }
        adapter = new AzureOpenAIAdapter({
          apiKey,
          endpoint: config.endpoint,
          deployment: config.deployment,
          apiVersion: config.apiVersion,
        } as AzureOpenAIConfig);
        break;

      case 'groq':
        adapter = new GroqAdapter(this.clientPool, apiKey);
        break;

      case 'huggingface':
        adapter = new HuggingFaceAdapter(this.clientPool, apiKey);
        break;

      default:
        throw new Error(
          `Unknown provider: ${providerName}. Supported providers: anthropic, openai, azure-openai, groq, huggingface`
        );
    }

    // Cache and return
    this.adapters.set(cacheKey, adapter);
    return adapter;
  }

  /**
   * Get health status for all registered providers
   * @returns Array of provider health statuses
   */
  async getAllProviderHealth(): Promise<
    Array<{ provider: string; status: ProviderHealthStatus }>
  > {
    const healthChecks: Array<{ provider: string; status: ProviderHealthStatus }> = [];

    // Get unique provider names from cached adapters
    const providerNames = new Set<string>();
    for (const [_key, adapter] of this.adapters.entries()) {
      providerNames.add(adapter.providerName);
    }

    // Run health checks in parallel
    await Promise.all(
      Array.from(providerNames).map(async (providerName) => {
        // Find first adapter for this provider
        const adapter = Array.from(this.adapters.values()).find(
          (a) => a.providerName === providerName
        );

        if (adapter) {
          try {
            const status = await adapter.healthCheck();
            healthChecks.push({ provider: providerName, status });
          } catch (error) {
            // If health check fails, return down status
            healthChecks.push({
              provider: providerName,
              status: {
                status: 'down',
                latencyMs: 0,
                checkedAt: new Date(),
                error: error instanceof Error ? error.message : String(error),
              },
            });
          }
        }
      })
    );

    return healthChecks;
  }

  /**
   * Clear all cached adapters
   * Useful for testing or forcing adapter recreation
   */
  clearCache(): void {
    this.adapters.clear();
    this.clientPool.clear();
  }

  /**
   * Get cache statistics
   * @returns Number of cached adapters
   */
  getCacheSize(): number {
    return this.adapters.size;
  }

  /**
   * Generate cache key for adapter
   * @private
   */
  private generateCacheKey(providerName: string, apiKey: string, config?: any): string {
    // For Azure, include endpoint and deployment in cache key
    if (providerName.toLowerCase() === 'azure-openai' && config) {
      return `${providerName}:${apiKey}:${config.endpoint}:${config.deployment}`;
    }

    // For other providers, just provider name and API key
    return `${providerName}:${apiKey}`;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let registryInstance: ProviderRegistry | null = null;

/**
 * Get the singleton ProviderRegistry instance
 * @param options - Optional configuration (only used on first call)
 * @returns Shared ProviderRegistry instance
 */
export function getProviderRegistry(options?: ProviderRegistryOptions): ProviderRegistry {
  if (!registryInstance) {
    registryInstance = new ProviderRegistry(options);
  }
  return registryInstance;
}
