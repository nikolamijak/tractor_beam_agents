/**
 * Rate Limit Header Parser
 * Parses rate limit information from different AI provider response headers
 */

import type { RateLimitInfo } from './types';

/**
 * Parse reset time from various formats used by different providers
 * @param resetValue - Reset time value from header (can be "10s", "1m", ISO timestamp, or undefined)
 * @returns Milliseconds until reset, or -1 if unknown
 */
export function parseResetTime(resetValue: string | undefined): number {
  if (!resetValue) return -1;

  // Handle seconds format: "10s"
  if (resetValue.endsWith('s')) {
    const seconds = parseInt(resetValue.slice(0, -1), 10);
    if (isNaN(seconds)) return -1;
    return seconds * 1000;
  }

  // Handle minutes format: "1m"
  if (resetValue.endsWith('m')) {
    const minutes = parseInt(resetValue.slice(0, -1), 10);
    if (isNaN(minutes)) return -1;
    return minutes * 60 * 1000;
  }

  // Handle ISO timestamp format
  const timestamp = new Date(resetValue).getTime();
  if (!isNaN(timestamp)) {
    const msUntilReset = timestamp - Date.now();
    return msUntilReset > 0 ? msUntilReset : 0;
  }

  // Try parsing as raw number of seconds
  const seconds = parseInt(resetValue, 10);
  if (!isNaN(seconds)) {
    return seconds * 1000;
  }

  return -1;
}

/**
 * Parse rate limit headers from provider response
 * @param provider - Provider name (openai, anthropic, groq, azure)
 * @param headers - Response headers as record
 * @returns Parsed rate limit information
 */
export function parseRateLimitHeaders(
  provider: 'openai' | 'anthropic' | 'groq' | 'azure',
  headers: Record<string, string>
): RateLimitInfo {
  switch (provider) {
    case 'anthropic':
      return {
        requestsLimit: parseInt(headers['anthropic-ratelimit-requests-limit'] || '-1', 10),
        requestsRemaining: parseInt(headers['anthropic-ratelimit-requests-remaining'] || '-1', 10),
        requestsResetMs: parseResetTime(headers['anthropic-ratelimit-requests-reset']),
        tokensLimit: parseInt(headers['anthropic-ratelimit-tokens-limit'] || '-1', 10),
        tokensRemaining: parseInt(headers['anthropic-ratelimit-tokens-remaining'] || '-1', 10),
        tokensResetMs: parseResetTime(headers['anthropic-ratelimit-tokens-reset']),
      };

    case 'openai':
    case 'groq':
      // OpenAI and Groq use the same header format
      return {
        requestsLimit: parseInt(headers['x-ratelimit-limit-requests'] || '-1', 10),
        requestsRemaining: parseInt(headers['x-ratelimit-remaining-requests'] || '-1', 10),
        requestsResetMs: parseResetTime(headers['x-ratelimit-reset-requests']),
        tokensLimit: parseInt(headers['x-ratelimit-limit-tokens'] || '-1', 10),
        tokensRemaining: parseInt(headers['x-ratelimit-remaining-tokens'] || '-1', 10),
        tokensResetMs: parseResetTime(headers['x-ratelimit-reset-tokens']),
      };

    case 'azure':
      // Azure uses same format as OpenAI but has a known bug returning -1 values
      // Check for retry-after header as fallback
      const retryAfter = headers['retry-after'];
      const retryAfterMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : -1;

      return {
        requestsLimit: parseInt(headers['x-ratelimit-limit-requests'] || '-1', 10),
        requestsRemaining: parseInt(headers['x-ratelimit-remaining-requests'] || '-1', 10),
        requestsResetMs: parseResetTime(headers['x-ratelimit-reset-requests']) || retryAfterMs,
        tokensLimit: parseInt(headers['x-ratelimit-limit-tokens'] || '-1', 10),
        tokensRemaining: parseInt(headers['x-ratelimit-remaining-tokens'] || '-1', 10),
        tokensResetMs: parseResetTime(headers['x-ratelimit-reset-tokens']) || retryAfterMs,
      };

    default:
      // Return empty rate limit info for unknown providers
      return {
        requestsLimit: -1,
        requestsRemaining: -1,
        requestsResetMs: -1,
        tokensLimit: -1,
        tokensRemaining: -1,
        tokensResetMs: -1,
      };
  }
}
