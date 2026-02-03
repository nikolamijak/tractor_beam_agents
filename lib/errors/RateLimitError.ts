/**
 * RateLimitError - User-friendly rate limit error
 *
 * Thrown when provider API rate limit is exceeded.
 * Contains detailed quota information and retry timing.
 */

import type { RateLimitInfo } from '@/lib/providers/types';

export class RateLimitError extends Error {
  public readonly provider: string;
  public readonly rateLimitInfo: RateLimitInfo;
  public readonly retryAfterMs: number;

  constructor(provider: string, rateLimitInfo: RateLimitInfo) {
    const resetMinutes = Math.ceil(rateLimitInfo.requestsResetMs / 60000);
    const message = `Rate limit exceeded for ${provider}. ${rateLimitInfo.requestsRemaining} requests remaining. Resets in ${resetMinutes} minutes.`;

    super(message);
    this.name = 'RateLimitError';
    this.provider = provider;
    this.rateLimitInfo = rateLimitInfo;
    this.retryAfterMs = rateLimitInfo.requestsResetMs;

    // Restore prototype chain for proper instanceof checks
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }

  /**
   * Convert error to JSON for API responses
   */
  toJSON() {
    return {
      error: 'rate_limit_exceeded',
      message: this.message,
      provider: this.provider,
      requestsRemaining: this.rateLimitInfo.requestsRemaining,
      requestsLimit: this.rateLimitInfo.requestsLimit,
      tokensRemaining: this.rateLimitInfo.tokensRemaining,
      tokensLimit: this.rateLimitInfo.tokensLimit,
      retryAfterMs: this.retryAfterMs,
      retryAfterMinutes: Math.ceil(this.retryAfterMs / 60000),
      retryAfterSeconds: Math.ceil(this.retryAfterMs / 1000),
    };
  }
}
