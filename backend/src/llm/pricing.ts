// USD per 1M tokens. Update as OpenAI changes prices.
// Source: https://openai.com/api/pricing/

export interface ModelPrice {
  inUsdPer1M: number;
  outUsdPer1M: number;
}

const PRICES: Record<string, ModelPrice> = {
  // Completions
  'gpt-4o-mini': { inUsdPer1M: 0.15, outUsdPer1M: 0.6 },
  'gpt-4o': { inUsdPer1M: 2.5, outUsdPer1M: 10 },
  'gpt-4.1-mini': { inUsdPer1M: 0.4, outUsdPer1M: 1.6 },
  'gpt-4.1': { inUsdPer1M: 2.0, outUsdPer1M: 8.0 },

  // Embeddings (output tokens are always 0 for embeddings; we just track input)
  'text-embedding-3-small': { inUsdPer1M: 0.02, outUsdPer1M: 0 },
  'text-embedding-3-large': { inUsdPer1M: 0.13, outUsdPer1M: 0 },
};

// Conservative fallback when we get a model we don't know the price for.
const FALLBACK: ModelPrice = { inUsdPer1M: 5, outUsdPer1M: 15 };

export function priceFor(model: string): ModelPrice {
  return PRICES[model] ?? FALLBACK;
}

export function computeUsdCost(model: string, promptTokens: number, completionTokens: number): number {
  const p = priceFor(model);
  return (promptTokens / 1_000_000) * p.inUsdPer1M + (completionTokens / 1_000_000) * p.outUsdPer1M;
}

export const DEFAULT_COMPLETE_MODEL = 'gpt-4o-mini';
export const DEFAULT_EMBED_MODEL = 'text-embedding-3-small';
