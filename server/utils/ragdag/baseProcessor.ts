/**
 * Base processor class with shared functionality for RagDAG execution
 */

import type { Plan, Node, Artifact } from './types'
import { LLMExecutor } from './executors/llm'
import { validateAndRepairSchema } from './schemaValidator'
import { truncateForCache } from './utils'
import { CACHE_CONFIG } from './constants'

export abstract class BaseProcessor {
  protected executor: LLMExecutor
  protected cache: Map<string, Artifact> = new Map()
  protected cacheHits = 0
  protected cacheMisses = 0
  
  constructor() {
    this.executor = new LLMExecutor()
  }
  
  /**
   * Validate plan structure
   */
  protected validatePlan(plan: Plan): void {
    // Check that finalOutput exists
    const finalNode = plan.nodes.find(n => n.id === plan.finalOutput)
    if (!finalNode) {
      throw new Error(`Final output node '${plan.finalOutput}' not found in plan`)
    }
    
    // Check that all input references exist
    const nodeIds = new Set(plan.nodes.map(n => n.id))
    for (const node of plan.nodes) {
      for (const input of node.inputs) {
        if (!nodeIds.has(input)) {
          throw new Error(`Node '${node.id}' references non-existent input '${input}'`)
        }
      }
    }
    
    // Check for duplicate node IDs
    if (nodeIds.size !== plan.nodes.length) {
      throw new Error('Duplicate node IDs detected in plan')
    }
  }
  
  /**
   * Generate cache key for a node execution
   */
  protected getCacheKey(node: Node, artifacts: Map<string, Artifact>, input: string): string {
    const parts = [node.id]
    
    // Add input hashes
    if (node.inputs.length === 0) {
      parts.push(truncateForCache(input))
    } else {
      for (const inputId of node.inputs) {
        const artifact = artifacts.get(inputId)
        if (artifact) {
          const contentStr = typeof artifact.content === 'string'
            ? artifact.content
            : JSON.stringify(artifact.content)
          parts.push(truncateForCache(contentStr))
        }
      }
    }
    
    // Add prompt template
    parts.push(truncateForCache(node.promptTemplate))
    
    return parts.join('::')
  }
  
  /**
   * Prepare a node for execution with proper schema validation and wrapping
   */
  protected prepareNodeForExecution(node: Node): Node {
    let jsonSchema = node.jsonSchema
    let promptTemplate = node.promptTemplate
    let systemPrompt = node.systemPrompt
    
    // If the node has generated assets, use them
    if (node.asset && node.assetStatus === 'ready') {
      console.log(`  🎯 Using optimized assets for node: ${node.id}`)
      
      jsonSchema = node.outputType === 'json'
        ? (node.asset.outputSchema || node.jsonSchema)
        : undefined
      
      promptTemplate = node.asset.generatedPrompt || node.promptTemplate
      systemPrompt = node.asset.systemPrompt || node.systemPrompt
    }
    
    // Validate and repair the schema if present
    if (jsonSchema) {
      console.log(`  🔧 Validating schema for node: ${node.id}`)
      const repairedSchema = validateAndRepairSchema(jsonSchema, node.id)
      
      // Check if schema was wrapped (array or primitive at root)
      if (repairedSchema.properties?.items && Object.keys(repairedSchema.properties).length === 1) {
        promptTemplate += '\n\nIMPORTANT: Return your array response wrapped in an object with "items" property, like: {"items": [...]}'
      } else if (repairedSchema.properties?.value && Object.keys(repairedSchema.properties).length === 1) {
        promptTemplate += '\n\nIMPORTANT: Return your response wrapped in an object with "value" property, like: {"value": ...}'
      }
      
      jsonSchema = repairedSchema
    }
    
    return {
      ...node,
      promptTemplate,
      systemPrompt,
      temperature: node.asset?.parameters?.temperature ?? node.temperature,
      jsonSchema
    }
  }
  
  /**
   * Execute a node with caching support
   */
  protected async executeNodeWithCache(
    node: Node,
    artifacts: Map<string, Artifact>,
    input: string
  ): Promise<Artifact> {
    const cacheKey = this.getCacheKey(node, artifacts, input)
    
    // Check cache
    if (this.cache.has(cacheKey)) {
      console.log(`  💾 Cache hit for: ${node.id}`)
      this.cacheHits++
      return this.cache.get(cacheKey)!
    }
    
    // Execute node
    const execNode = this.prepareNodeForExecution(node)
    const artifact = await this.executor.execute(
      execNode,
      artifacts,
      node.inputs.length === 0 ? input : undefined
    )
    
    // Cache the result (with size limit)
    if (this.cache.size >= CACHE_CONFIG.MAX_CACHE_SIZE) {
      // Remove oldest entry
      const firstKey = this.cache.keys().next().value
      if (firstKey) this.cache.delete(firstKey)
    }
    this.cache.set(cacheKey, artifact)
    this.cacheMisses++
    
    return artifact
  }
  
  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear()
    this.cacheHits = 0
    this.cacheMisses = 0
  }
  
  /**
   * Get cache statistics
   */
  getCacheStats(): { hits: number, misses: number, hitRate: number } {
    const total = this.cacheHits + this.cacheMisses
    return {
      hits: this.cacheHits,
      misses: this.cacheMisses,
      hitRate: total > 0 ? this.cacheHits / total : 0
    }
  }
  
  /**
   * Abstract run method to be implemented by subclasses
   */
  abstract run(plan: Plan, input: string, progressCallback?: any): Promise<any>
}
