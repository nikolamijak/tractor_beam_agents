/**
 * ClientPool - LRU-based SDK client pooling
 *
 * Manages SDK client instances with automatic eviction to prevent memory leaks.
 * Each provider type has its own cache to prevent cross-contamination.
 *
 * Why pooling is critical:
 * - Per-request client instantiation causes memory leaks (identified in ClaudeApiService:72-74)
 * - SDK clients maintain connection pools that should be reused
 * - LRU eviction prevents unbounded memory growth with many API keys
 */

import { LRUCache } from 'lru-cache';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import Groq from 'groq-sdk';
import { HfInference } from '@huggingface/inference';

// ============================================================================
// Types
// ============================================================================

interface ClientCacheEntry<T> {
  client: T;
  createdAt: number;
  lastUsed: number;
}

export interface ClientPoolOptions {
  maxSize?: number;  // Max clients per provider type (default: 100)
  ttlMs?: number;    // Time-to-live in milliseconds (default: 30 minutes)
}

// ============================================================================
// ClientPool Class
// ============================================================================

export class ClientPool {
  private openaiClients: LRUCache<string, ClientCacheEntry<OpenAI>>;
  private anthropicClients: LRUCache<string, ClientCacheEntry<Anthropic>>;
  private groqClients: LRUCache<string, ClientCacheEntry<Groq>>;
  private huggingfaceClients: LRUCache<string, ClientCacheEntry<HfInference>>;

  constructor(options: ClientPoolOptions = {}) {
    const cacheOptions = {
      max: options.maxSize || 100,
      ttl: options.ttlMs || 1000 * 60 * 30, // 30 minutes default
      updateAgeOnGet: true, // Extend TTL on access
    };

    this.openaiClients = new LRUCache(cacheOptions);
    this.anthropicClients = new LRUCache(cacheOptions);
    this.groqClients = new LRUCache(cacheOptions);
    this.huggingfaceClients = new LRUCache(cacheOptions);
  }

  /**
   * Get or create an OpenAI client
   * @param apiKey - OpenAI API key
   * @param options - Optional configuration (baseURL for custom endpoints)
   * @returns Cached or new OpenAI client instance
   */
  getOpenAI(apiKey: string, options?: { baseURL?: string }): OpenAI {
    const cacheKey = `${apiKey}:${options?.baseURL || 'default'}`;
    let entry = this.openaiClients.get(cacheKey);

    if (!entry) {
      entry = {
        client: new OpenAI({ apiKey, ...options }),
        createdAt: Date.now(),
        lastUsed: Date.now(),
      };
      this.openaiClients.set(cacheKey, entry);
    }

    entry.lastUsed = Date.now();
    return entry.client;
  }

  /**
   * Get or create an Anthropic client
   * @param apiKey - Anthropic API key
   * @returns Cached or new Anthropic client instance
   */
  getAnthropic(apiKey: string): Anthropic {
    const cacheKey = apiKey;
    let entry = this.anthropicClients.get(cacheKey);

    if (!entry) {
      entry = {
        client: new Anthropic({ apiKey }),
        createdAt: Date.now(),
        lastUsed: Date.now(),
      };
      this.anthropicClients.set(cacheKey, entry);
    }

    entry.lastUsed = Date.now();
    return entry.client;
  }

  /**
   * Get or create a Groq client
   * @param apiKey - Groq API key
   * @returns Cached or new Groq client instance
   */
  getGroq(apiKey: string): Groq {
    const cacheKey = apiKey;
    let entry = this.groqClients.get(cacheKey);

    if (!entry) {
      entry = {
        client: new Groq({ apiKey }),
        createdAt: Date.now(),
        lastUsed: Date.now(),
      };
      this.groqClients.set(cacheKey, entry);
    }

    entry.lastUsed = Date.now();
    return entry.client;
  }

  /**
   * Get or create a HuggingFace Inference client
   * @param apiKey - HuggingFace API key
   * @returns Cached or new HfInference client instance
   */
  getHuggingFace(apiKey: string): HfInference {
    const cacheKey = apiKey;
    let entry = this.huggingfaceClients.get(cacheKey);

    if (!entry) {
      entry = {
        client: new HfInference(apiKey),
        createdAt: Date.now(),
        lastUsed: Date.now(),
      };
      this.huggingfaceClients.set(cacheKey, entry);
    }

    entry.lastUsed = Date.now();
    return entry.client;
  }

  /**
   * Get pool statistics
   * @returns Number of cached clients per provider
   */
  getStats(): {
    openai: number;
    anthropic: number;
    groq: number;
    huggingface: number;
  } {
    return {
      openai: this.openaiClients.size,
      anthropic: this.anthropicClients.size,
      groq: this.groqClients.size,
      huggingface: this.huggingfaceClients.size,
    };
  }

  /**
   * Clear all cached clients
   * Useful for testing or forcing client recreation
   */
  clear(): void {
    this.openaiClients.clear();
    this.anthropicClients.clear();
    this.groqClients.clear();
    this.huggingfaceClients.clear();
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let clientPoolInstance: ClientPool | null = null;

/**
 * Get the singleton ClientPool instance
 * @param options - Optional configuration (only used on first call)
 * @returns Shared ClientPool instance
 */
export function getClientPool(options?: ClientPoolOptions): ClientPool {
  if (!clientPoolInstance) {
    clientPoolInstance = new ClientPool(options);
  }
  return clientPoolInstance;
}
