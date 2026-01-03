import { EnhancedProcessor } from '../../utils/ragdag/enhancedProcessor'
import type { ExecutePlanRequest } from '../../utils/ragdag/types'
import { defineApiHandler, validateRequired, validatePlanStructure } from '../../utils/ragdag/apiHelpers'

export default defineApiHandler<ExecutePlanRequest>(async (body) => {
  validateRequired(body, ['plan', 'input'])
  validatePlanStructure(body.plan)
  
  const processor = new EnhancedProcessor()
  
  // Execute with enhanced metrics
  const result = await processor.run(body.plan, body.input)
  
  return {
    result,
    // Include enhanced metrics in response
    analytics: {
      parallelBatches: result.parallelBatches,
      criticalPath: result.criticalPath,
      cachingStats: result.cachingStats,
      executionGraph: result.executionGraph,
      metrics: result.metrics
    }
  }
})

