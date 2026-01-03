import type { Plan, Artifact, ExecutionResult } from './types'
import { BaseProcessor } from './baseProcessor'
import { calculateTotalCost, artifactsMapToObject } from './utils'

export class Processor extends BaseProcessor {
  constructor() {
    super()
  }
  
  async run(plan: Plan, input: string): Promise<ExecutionResult> {
    const startTime = Date.now()
    const artifacts = new Map<string, Artifact>()
    const completed = new Set<string>()
    
    // Reset cache stats
    this.cacheHits = 0
    this.cacheMisses = 0
    
    // Validate plan
    this.validatePlan(plan)
    
    console.log(`Starting execution of plan: ${plan.goal}`)
    console.log(`Total nodes: ${plan.nodes.length}`)
    
    // Build node map for quick lookup
    const nodeMap = new Map(plan.nodes.map(n => [n.id, n]))
    
    // Execute nodes with dependency resolution
    while (completed.size < plan.nodes.length) {
      // Find nodes that are ready to run
      const ready = plan.nodes.filter(node => 
        !completed.has(node.id) &&
        node.inputs.every(dep => completed.has(dep))
      )
      
      if (ready.length === 0) {
        const remaining = plan.nodes.filter(n => !completed.has(n.id))
        throw new Error(`Circular dependency or invalid references detected. Remaining nodes: ${remaining.map(n => n.id).join(', ')}`)
      }
      
      console.log(`Executing ${ready.length} nodes in parallel: ${ready.map(n => n.id).join(', ')}`)
      
      // Execute ready nodes in parallel
      const promises = ready.map(async (node) => {
        try {
          console.log(`  Starting: ${node.id} - ${node.description}`)
          
          // Execute with caching
          const artifact = await this.executeNodeWithCache(node, artifacts, input)
          
          console.log(`  Completed: ${node.id}`)
          return { node, artifact }
        } catch (error) {
          console.error(`  Failed: ${node.id}`, error)
          throw new Error(`Failed to execute node ${node.id}: ${error}`)
        }
      })
      
      // Wait for all parallel executions to complete
      const results = await Promise.all(promises)
      
      // Store results
      for (const { node, artifact } of results) {
        artifacts.set(node.id, artifact)
        completed.add(node.id)
      }
    }
    
    // Get final output
    const finalArtifact = artifacts.get(plan.finalOutput)
    if (!finalArtifact) {
      throw new Error(`Final output node not found: ${plan.finalOutput}`)
    }
    
    // Calculate execution time
    const executionTime = Date.now() - startTime
    
    // Calculate total cost
    const totalCost = calculateTotalCost(artifacts)
    
    // Convert artifacts map to plain object for response
    const artifactsObj = artifactsMapToObject(artifacts)
    
    // Log cache stats
    const cacheStats = this.getCacheStats()
    console.log(`Cache hit rate: ${(cacheStats.hitRate * 100).toFixed(1)}% (${cacheStats.hits} hits, ${cacheStats.misses} misses)`)
    console.log(`Plan execution completed in ${executionTime}ms`)
    
    return {
      plan,
      artifacts: artifactsObj,
      finalOutput: finalArtifact,
      executionTime,
      totalCost
    }
  }
}