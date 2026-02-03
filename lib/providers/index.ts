/**
 * Provider Module - Multi-Provider AI Model Support
 *
 * This module provides the foundational infrastructure for supporting
 * multiple AI providers (Anthropic, OpenAI, Groq, HuggingFace, Azure).
 *
 * Key exports:
 * - IModelProvider interface and related types
 * - ClientPool for managing SDK client instances
 * - Singleton accessor for shared ClientPool
 */

// Re-export all types
export type {
  IModelProvider,
  CompletionRequest,
  CompletionResponse,
  TokenUsage,
  RateLimitInfo,
  StreamChunk,
  ProviderHealthStatus,
  Message,
  Tool,
} from './types';

// Re-export ProviderError class
export { ProviderError } from './types';

// Re-export ClientPool
export { ClientPool, getClientPool } from './ClientPool';
export type { ClientPoolOptions } from './ClientPool';
