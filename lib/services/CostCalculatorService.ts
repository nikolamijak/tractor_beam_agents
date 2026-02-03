import type { TokenUsage, CostBreakdown, ModelPricing } from '@/lib/db/types';

/**
 * Cost Calculator Service
 * Calculates AI model usage costs based on token usage and pricing
 */
export class CostCalculatorService {
  /**
   * Calculate total cost from token usage and model pricing
   */
  static calculateCost(usage: TokenUsage, pricing: ModelPricing): CostBreakdown {
    const inputCost = this.calculateInputCost(usage.input_tokens, pricing);
    const outputCost = this.calculateOutputCost(usage.output_tokens, pricing);
    const cacheCreationCost = this.calculateCacheCreationCost(
      usage.cache_creation_tokens || 0,
      pricing
    );
    const cacheReadCost = this.calculateCacheReadCost(
      usage.cache_read_tokens || 0,
      pricing
    );
    const extendedThinkingCost = this.calculateExtendedThinkingCost(
      usage.extended_thinking_tokens || 0,
      pricing
    );

    const totalCost = this.roundCost(
      inputCost + outputCost + cacheCreationCost + cacheReadCost + extendedThinkingCost
    );

    return {
      input_cost: this.roundCost(inputCost),
      output_cost: this.roundCost(outputCost),
      cache_creation_cost: this.roundCost(cacheCreationCost),
      cache_read_cost: this.roundCost(cacheReadCost),
      extended_thinking_cost: this.roundCost(extendedThinkingCost),
      total_cost: totalCost,
    };
  }

  /**
   * Calculate input cost with context pricing tiers support
   */
  private static calculateInputCost(tokens: number, pricing: ModelPricing): number {
    if (tokens === 0) return 0;

    // Check if context pricing tiers exist
    if (pricing.context_pricing_tiers && pricing.context_pricing_tiers.length > 0) {
      return this.calculateTieredCost(tokens, pricing.context_pricing_tiers);
    }

    // Use flat rate
    return (tokens / 1_000_000) * pricing.input_per_mtok;
  }

  /**
   * Calculate output cost
   */
  private static calculateOutputCost(tokens: number, pricing: ModelPricing): number {
    if (tokens === 0) return 0;
    return (tokens / 1_000_000) * pricing.output_per_mtok;
  }

  /**
   * Calculate cache creation cost
   */
  private static calculateCacheCreationCost(tokens: number, pricing: ModelPricing): number {
    if (tokens === 0 || !pricing.cache_creation_per_mtok) return 0;
    return (tokens / 1_000_000) * pricing.cache_creation_per_mtok;
  }

  /**
   * Calculate cache read cost
   */
  private static calculateCacheReadCost(tokens: number, pricing: ModelPricing): number {
    if (tokens === 0 || !pricing.cache_read_per_mtok) return 0;
    return (tokens / 1_000_000) * pricing.cache_read_per_mtok;
  }

  /**
   * Calculate extended thinking cost (typically same as output pricing)
   */
  private static calculateExtendedThinkingCost(tokens: number, pricing: ModelPricing): number {
    if (tokens === 0) return 0;
    // Extended thinking tokens are typically priced the same as output tokens
    return (tokens / 1_000_000) * pricing.output_per_mtok;
  }

  /**
   * Calculate cost with tiered pricing
   * Example: First 200k tokens at $3/MTok, tokens above 200k at $6/MTok
   */
  private static calculateTieredCost(
    tokens: number,
    tiers: Array<{ min_tokens: number; max_tokens: number | null; input_per_mtok: number }>
  ): number {
    let totalCost = 0;
    let remainingTokens = tokens;

    // Sort tiers by min_tokens to ensure correct order
    const sortedTiers = [...tiers].sort((a, b) => a.min_tokens - b.min_tokens);

    for (const tier of sortedTiers) {
      if (remainingTokens <= 0) break;

      const tierStart = tier.min_tokens;
      const tierEnd = tier.max_tokens || Infinity;
      const tokensInThisTier = Math.min(
        remainingTokens,
        Math.max(0, tierEnd - tierStart + 1)
      );

      if (tokensInThisTier > 0 && tokens > tierStart) {
        const applicableTokens = Math.min(tokensInThisTier, tokens - tierStart);
        totalCost += (applicableTokens / 1_000_000) * tier.input_per_mtok;
        remainingTokens -= applicableTokens;
      }
    }

    return totalCost;
  }

  /**
   * Round cost to 6 decimal places (micro-cents precision)
   */
  private static roundCost(cost: number): number {
    return Math.round(cost * 1_000_000) / 1_000_000;
  }

  /**
   * Estimate cost for a given number of tokens (useful for UI previews)
   */
  static estimateCost(
    inputTokens: number,
    outputTokens: number,
    pricing: ModelPricing
  ): number {
    const usage: TokenUsage = {
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cache_creation_tokens: 0,
      cache_read_tokens: 0,
      extended_thinking_tokens: 0,
    };

    const breakdown = this.calculateCost(usage, pricing);
    return breakdown.total_cost;
  }

  /**
   * Calculate cost savings from prompt caching
   */
  static calculateCacheSavings(
    cacheReadTokens: number,
    pricing: ModelPricing
  ): number {
    if (cacheReadTokens === 0 || !pricing.cache_read_per_mtok) return 0;

    const costWithoutCache = (cacheReadTokens / 1_000_000) * pricing.input_per_mtok;
    const costWithCache = (cacheReadTokens / 1_000_000) * pricing.cache_read_per_mtok;

    return this.roundCost(costWithoutCache - costWithCache);
  }
}

/**
 * Get singleton CostCalculatorService instance
 * Note: Service uses static methods, singleton is for API consistency
 */
let calculatorInstance: CostCalculatorService | null = null;

export function getCostCalculator(): CostCalculatorService {
  if (!calculatorInstance) {
    calculatorInstance = new CostCalculatorService();
  }
  return calculatorInstance;
}
