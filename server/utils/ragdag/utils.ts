/**
 * Shared utility functions for RagDAG
 */

import type { Artifact } from './types'
import { MODEL_PRICING, ESTIMATION, CACHE_CONFIG } from './constants'

/**
 * Calculate the cost for a single artifact based on token usage
 */
export function calculateNodeCost(artifact: Artifact): number {
  const model = artifact.metadata.model || 'gpt-3.5-turbo'
  const prices = MODEL_PRICING[model] || MODEL_PRICING['gpt-3.5-turbo']
  
  let cost = 0
  if (artifact.metadata.promptTokens) {
    cost += (artifact.metadata.promptTokens / 1_000_000) * prices.prompt
  }
  if (artifact.metadata.completionTokens) {
    cost += (artifact.metadata.completionTokens / 1_000_000) * prices.completion
  }
  
  return Math.round(cost * 10000) / 10000
}

/**
 * Calculate total cost for all artifacts
 */
export function calculateTotalCost(artifacts: Map<string, Artifact>): number {
  let totalCost = 0
  artifacts.forEach(artifact => {
    totalCost += calculateNodeCost(artifact)
  })
  return totalCost
}

/**
 * Format milliseconds to human-readable time
 */
export function formatTime(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${(ms / 60000).toFixed(1)}min`
}

/**
 * Estimate token count from text (rough approximation)
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / ESTIMATION.CHARS_PER_TOKEN)
}

/**
 * Estimate costs and tokens for a prompt
 */
export function estimateCostsAndTokens(
  prompt: string,
  systemPrompt: string | undefined,
  model: string
): { cost: number, tokens: { prompt: number, completion: number } } {
  const promptTokens = estimateTokens(prompt + (systemPrompt || ''))
  const completionTokens = ESTIMATION.AVG_COMPLETION_TOKENS
  
  const modelPricing = MODEL_PRICING[model] || MODEL_PRICING['gpt-4.1-nano']
  const cost = (
    (promptTokens * modelPricing.prompt / 1_000_000) +
    (completionTokens * modelPricing.completion / 1_000_000)
  )
  
  return {
    cost: Math.round(cost * 10000) / 10000,
    tokens: {
      prompt: promptTokens,
      completion: completionTokens
    }
  }
}

/**
 * Parse a string value to number with fallback
 */
export function parseNumberWithFallback(str: string | undefined, defaultValue: number): number {
  if (!str || str === '') return defaultValue
  const parsed = parseFloat(str)
  return isNaN(parsed) ? defaultValue : parsed
}

/**
 * Convert artifacts Map to plain object for API responses
 */
export function artifactsMapToObject(artifacts: Map<string, Artifact>): Record<string, Artifact> {
  const artifactsObj: Record<string, Artifact> = {}
  artifacts.forEach((artifact, key) => {
    artifactsObj[key] = artifact
  })
  return artifactsObj
}

/**
 * Truncate string for cache key generation
 */
export function truncateForCache(str: string): string {
  return str.substring(0, CACHE_CONFIG.KEY_TRUNCATE_LENGTH)
}
