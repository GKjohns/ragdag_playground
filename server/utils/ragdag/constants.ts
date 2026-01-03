/**
 * Centralized constants and configuration for RagDAG
 */

// Available models
export const MODELS = {
  GPT_4: 'gpt-4',
  GPT_4_TURBO: 'gpt-4-turbo-preview',
  GPT_4O: 'gpt-4o',
  GPT_4O_MINI: 'gpt-4o-mini',
  GPT_4O_2024: 'gpt-4o-2024-08-06',
  GPT_41: 'gpt-4.1',
  GPT_41_MINI: 'gpt-4.1-mini',
  GPT_41_NANO: 'gpt-4.1-nano',
  GPT_35_TURBO: 'gpt-3.5-turbo'
} as const

export type ModelName = typeof MODELS[keyof typeof MODELS]

// Default model for different use cases
export const DEFAULT_MODELS = {
  PLANNING: MODELS.GPT_41,
  ASSET_GENERATION: MODELS.GPT_41_MINI,
  EXECUTION: MODELS.GPT_41_NANO,
  FALLBACK: MODELS.GPT_35_TURBO
}

// Model pricing in USD per 1M tokens
export const MODEL_PRICING: Record<string, { prompt: number, completion: number }> = {
  [MODELS.GPT_35_TURBO]: { prompt: 0.5, completion: 1.5 },
  [MODELS.GPT_4]: { prompt: 30, completion: 60 },
  [MODELS.GPT_4_TURBO]: { prompt: 10, completion: 30 },
  [MODELS.GPT_41]: { prompt: 2.5, completion: 10 },
  [MODELS.GPT_41_MINI]: { prompt: 0.15, completion: 0.6 },
  [MODELS.GPT_41_NANO]: { prompt: 0.075, completion: 0.3 },
  [MODELS.GPT_4O]: { prompt: 2.5, completion: 10 },
  [MODELS.GPT_4O_MINI]: { prompt: 0.15, completion: 0.6 }
}

// Default parameters
export const DEFAULT_PARAMETERS = {
  temperature: 0.7,
  maxTokens: 1000,
  topP: 1.0,
  frequencyPenalty: 0,
  presencePenalty: 0
}

// Estimation constants
export const ESTIMATION = {
  CHARS_PER_TOKEN: 4, // Rough estimate: 1 token ≈ 4 characters
  AVG_COMPLETION_TOKENS: 500 // Rough average for estimations
}

// Node validation constants
export const NODE_LIMITS = {
  MIN_NODES: 2,
  MAX_NODES: 10,
  MIN_NODE_ID_LENGTH: 3,
  MAX_NODE_ID_LENGTH: 50,
  MAX_PROMPT_LENGTH: 10000,
  MAX_DESCRIPTION_LENGTH: 200
}

// Cache configuration
export const CACHE_CONFIG = {
  KEY_TRUNCATE_LENGTH: 100, // How much of input/content to use for cache keys
  MAX_CACHE_SIZE: 100 // Maximum number of cached results
}
