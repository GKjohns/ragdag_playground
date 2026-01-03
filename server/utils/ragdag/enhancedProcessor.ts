import type { Plan, Artifact, Node } from './types'
import { BaseProcessor } from './baseProcessor'
import { EventEmitter } from 'events'
import { calculateNodeCost, calculateTotalCost, artifactsMapToObject, formatTime } from './utils'

export interface ExecutionMetrics {
  nodeId: string
  startTime: number
  endTime: number
  duration: number
  tokensUsed?: {
    prompt: number
    completion: number
    total: number
  }
  cost?: number
  parallelBatch?: number
  dependencies: string[]
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cached'
}

export interface EnhancedExecutionResult extends ExecutionResult {
  metrics: ExecutionMetrics[]
  parallelBatches: number
  totalDuration: number
  criticalPath: string[]
  cachingStats: {
    hits: number
    misses: number
    hitRate: number
  }
  executionGraph: {
    nodes: Array<{
      id: string
      level: number
      batch: number
      duration: number
      status: string
    }>
    edges: Array<{
      source: string
      target: string
    }>
  }
}

export interface ExecutionProgress {
  type: 'start' | 'node_start' | 'node_complete' | 'batch_complete' | 'complete' | 'error'
  nodeId?: string
  nodeName?: string
  batchNumber?: number
  batchSize?: number
  progress?: number
  totalNodes?: number
  completedNodes?: number
  message?: string
  timestamp: number
  metrics?: ExecutionMetrics
}

export class EnhancedProcessor extends BaseProcessor {
  private metrics: Map<string, ExecutionMetrics> = new Map()
  private eventEmitter: EventEmitter
  
  constructor() {
    super()
    this.eventEmitter = new EventEmitter()
  }
  
  // Proxy EventEmitter methods
  emit(event: string, ...args: any[]): boolean {
    return this.eventEmitter.emit(event, ...args)
  }
  
  on(event: string, listener: (...args: any[]) => void): this {
    this.eventEmitter.on(event, listener)
    return this
  }
  
  /**
   * Analyzes the DAG to determine optimal execution strategy
   */
  private analyzeExecutionStrategy(plan: Plan): {
    batches: Node[][]
    levels: Map<string, number>
    criticalPath: string[]
  } {
    const nodeMap = new Map(plan.nodes.map(n => [n.id, n]))
    const levels = new Map<string, number>()
    const batches: Node[][] = []
    
    // Calculate node levels (topological sort with level assignment)
    const calculateLevel = (nodeId: string, visited = new Set<string>()): number => {
      if (visited.has(nodeId)) {
        throw new Error(`Circular dependency detected at node: ${nodeId}`)
      }
      if (levels.has(nodeId)) {
        return levels.get(nodeId)!
      }
      
      visited.add(nodeId)
      const node = nodeMap.get(nodeId)!
      
      if (node.inputs.length === 0) {
        levels.set(nodeId, 0)
        return 0
      }
      
      const maxInputLevel = Math.max(
        ...node.inputs.map(inputId => calculateLevel(inputId, new Set(visited)))
      )
      const level = maxInputLevel + 1
      levels.set(nodeId, level)
      return level
    }
    
    // Calculate levels for all nodes
    plan.nodes.forEach(node => calculateLevel(node.id))
    
    // Group nodes by level for parallel execution
    const maxLevel = Math.max(...levels.values())
    for (let level = 0; level <= maxLevel; level++) {
      const batchNodes = plan.nodes.filter(n => levels.get(n.id) === level)
      if (batchNodes.length > 0) {
        batches.push(batchNodes)
      }
    }
    
    // Calculate critical path (longest path to final output)
    const criticalPath = this.calculateCriticalPath(plan, nodeMap, levels)
    
    return { batches, levels, criticalPath }
  }
  
  /**
   * Calculates the critical path through the DAG
   */
  private calculateCriticalPath(
    plan: Plan, 
    nodeMap: Map<string, Node>,
    levels: Map<string, number>
  ): string[] {
    const path: string[] = []
    let currentId = plan.finalOutput
    
    while (currentId) {
      path.unshift(currentId)
      const node = nodeMap.get(currentId)!
      
      if (node.inputs.length === 0) {
        break
      }
      
      // Follow the input with the highest level (longest path)
      currentId = node.inputs.reduce((maxId, inputId) => {
        const maxLevel = levels.get(maxId) || 0
        const inputLevel = levels.get(inputId) || 0
        return inputLevel > maxLevel ? inputId : maxId
      }, node.inputs[0])
    }
    
    return path
  }
  
  /**
   * Execute the plan with enhanced parallelization and progress tracking
   */
  async run(plan: Plan, input: string, progressCallback?: (progress: ExecutionProgress) => void): Promise<EnhancedExecutionResult> {
    const startTime = Date.now()
    const artifacts = new Map<string, Artifact>()
    
    // Reset metrics
    this.metrics.clear()
    this.cacheHits = 0
    this.cacheMisses = 0
    
    // Validate plan
    this.validatePlan(plan)
    
    // Analyze execution strategy
    const { batches, levels, criticalPath } = this.analyzeExecutionStrategy(plan)
    
    console.log(`🚀 Starting enhanced execution of plan: ${plan.goal}`)
    console.log(`📊 Execution strategy: ${batches.length} parallel batches, ${plan.nodes.length} total nodes`)
    console.log(`🔥 Critical path: ${criticalPath.join(' → ')}`)
    
    // Emit start event
    this.emit('progress', {
      type: 'start',
      totalNodes: plan.nodes.length,
      message: `Starting execution with ${batches.length} parallel batches`,
      timestamp: Date.now()
    })
    
    if (progressCallback) {
      progressCallback({
        type: 'start',
        totalNodes: plan.nodes.length,
        message: `Starting execution with ${batches.length} parallel batches`,
        timestamp: Date.now()
      })
    }
    
    // Build execution graph data
    const executionGraph = {
      nodes: plan.nodes.map(n => ({
        id: n.id,
        level: levels.get(n.id) || 0,
        batch: batches.findIndex(batch => batch.some(bn => bn.id === n.id)),
        duration: 0,
        status: 'pending'
      })),
      edges: plan.nodes.flatMap(n => 
        n.inputs.map(inputId => ({
          source: inputId,
          target: n.id
        }))
      )
    }
    
    // Execute batches in sequence, nodes within batch in parallel
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex]
      
      console.log(`\n🔄 Executing batch ${batchIndex + 1}/${batches.length} with ${batch.length} nodes in parallel`)
      
      // Emit batch start
      this.emit('progress', {
        type: 'batch_complete',
        batchNumber: batchIndex + 1,
        batchSize: batch.length,
        message: `Starting batch ${batchIndex + 1} with ${batch.length} parallel nodes`,
        timestamp: Date.now()
      })
      
      if (progressCallback) {
        progressCallback({
          type: 'batch_complete',
          batchNumber: batchIndex + 1,
          batchSize: batch.length,
          completedNodes: Array.from(artifacts.keys()).length,
          totalNodes: plan.nodes.length,
          progress: (Array.from(artifacts.keys()).length / plan.nodes.length) * 100,
          message: `Executing batch ${batchIndex + 1}/${batches.length}`,
          timestamp: Date.now()
        })
      }
      
      // Execute all nodes in this batch in parallel
      const batchPromises = batch.map(async (node) => {
        const nodeStartTime = Date.now()
        
        // Initialize metrics
        const metric: ExecutionMetrics = {
          nodeId: node.id,
          startTime: nodeStartTime,
          endTime: 0,
          duration: 0,
          dependencies: node.inputs,
          status: 'running',
          parallelBatch: batchIndex
        }
        this.metrics.set(node.id, metric)
        
        // Update execution graph
        const graphNode = executionGraph.nodes.find(n => n.id === node.id)
        if (graphNode) {
          graphNode.status = 'running'
        }
        
        try {
          console.log(`  ⚡ Starting: ${node.id} - ${node.description}`)
          
          // Emit node start
          this.emit('progress', {
            type: 'node_start',
            nodeId: node.id,
            nodeName: node.description,
            message: `Starting: ${node.description}`,
            timestamp: Date.now()
          })
          
          if (progressCallback) {
            progressCallback({
              type: 'node_start',
              nodeId: node.id,
              nodeName: node.description,
              message: `Processing: ${node.description}`,
              timestamp: Date.now()
            })
          }
          
          // Execute with caching
          const wasCached = this.cache.has(this.getCacheKey(node, artifacts, input))
          const artifact = await this.executeNodeWithCache(node, artifacts, input)
          
          metric.status = wasCached ? 'cached' : 'completed'
          
          // Update metrics
          const nodeEndTime = Date.now()
          metric.endTime = nodeEndTime
          metric.duration = nodeEndTime - nodeStartTime
          metric.tokensUsed = {
            prompt: artifact.metadata.promptTokens || 0,
            completion: artifact.metadata.completionTokens || 0,
            total: artifact.metadata.totalTokens || 0
          }
          metric.cost = calculateNodeCost(artifact)
          
          // Update execution graph
          if (graphNode) {
            graphNode.duration = metric.duration
            graphNode.status = metric.status
          }
          
          console.log(`  ✅ Completed: ${node.id} (${metric.duration}ms, ${metric.status})`)
          
          // Emit node complete
          this.emit('progress', {
            type: 'node_complete',
            nodeId: node.id,
            nodeName: node.description,
            message: `Completed: ${node.description}`,
            timestamp: Date.now(),
            metrics: metric
          })
          
          if (progressCallback) {
            progressCallback({
              type: 'node_complete',
              nodeId: node.id,
              nodeName: node.description,
              completedNodes: Array.from(artifacts.keys()).length + 1,
              totalNodes: plan.nodes.length,
              progress: ((Array.from(artifacts.keys()).length + 1) / plan.nodes.length) * 100,
              message: `Completed: ${node.description}`,
              timestamp: Date.now(),
              metrics: metric
            })
          }
          
          return { node, artifact }
        } catch (error) {
          console.error(`  ❌ Failed: ${node.id}`, error)
          metric.status = 'failed'
          metric.endTime = Date.now()
          metric.duration = metric.endTime - metric.startTime
          
          if (graphNode) {
            graphNode.status = 'failed'
          }
          
          throw new Error(`Failed to execute node ${node.id}: ${error}`)
        }
      })
      
      // Wait for all parallel executions in this batch
      const results = await Promise.all(batchPromises)
      
      // Store results
      for (const { node, artifact } of results) {
        artifacts.set(node.id, artifact)
      }
      
      console.log(`✔️  Batch ${batchIndex + 1} complete`)
    }
    
    // Get final output
    const finalArtifact = artifacts.get(plan.finalOutput)
    if (!finalArtifact) {
      throw new Error(`Final output node not found: ${plan.finalOutput}`)
    }
    
    // Calculate execution metrics
    const totalDuration = Date.now() - startTime
    const totalCost = calculateTotalCost(artifacts)
    const metricsArray = Array.from(this.metrics.values())
    
    // Convert artifacts map to plain object
    const artifactsObj = artifactsMapToObject(artifacts)
    
    // Get cache stats
    const cacheStats = this.getCacheStats()
    
    console.log(`\n🎉 Execution complete!`)
    console.log(`⏱️  Total time: ${totalDuration}ms`)
    console.log(`💰 Total cost: $${totalCost.toFixed(4)}`)
    console.log(`💾 Cache hit rate: ${(cacheStats.hitRate * 100).toFixed(1)}% (${cacheStats.hits} hits, ${cacheStats.misses} misses)`)
    console.log(`🔀 Parallel batches: ${batches.length}`)
    console.log(`🔥 Critical path: ${criticalPath.join(' → ')}`)
    
    // Emit completion
    this.emit('progress', {
      type: 'complete',
      message: `Execution complete in ${totalDuration}ms`,
      timestamp: Date.now()
    })
    
    if (progressCallback) {
      progressCallback({
        type: 'complete',
        completedNodes: plan.nodes.length,
        totalNodes: plan.nodes.length,
        progress: 100,
        message: `Execution complete in ${formatTime(totalDuration)}`,
        timestamp: Date.now()
      })
    }
    
    return {
      plan,
      artifacts: artifactsObj,
      finalOutput: finalArtifact,
      executionTime: totalDuration,
      totalCost,
      metrics: metricsArray,
      parallelBatches: batches.length,
      totalDuration,
      criticalPath,
      cachingStats: cacheStats,
      executionGraph
    }
  }
}
