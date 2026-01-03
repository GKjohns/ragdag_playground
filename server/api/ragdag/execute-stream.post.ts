import { defineEventHandler, readBody } from 'h3'
import { EnhancedProcessor } from '../../utils/ragdag/enhancedProcessor'
import type { ExecutePlanRequest } from '../../utils/ragdag/types'
import { validateRequired, validatePlanStructure, setupSSE, sendSSEMessage, closeSSE } from '../../utils/ragdag/apiHelpers'

export default defineEventHandler(async (event) => {
  const body = await readBody<ExecutePlanRequest>(event)
  
  validateRequired(body, ['plan', 'input'])
  validatePlanStructure(body.plan)
  
  // Set up Server-Sent Events
  setupSSE(event)
  
  const processor = new EnhancedProcessor()
  
  try {
    // Execute with progress callback
    const result = await processor.run(body.plan, body.input, (progress) => {
      // Send progress update as SSE
      sendSSEMessage(event.node.res, 'progress', progress)
    })
    
    // Send final result
    sendSSEMessage(event.node.res, 'complete', result)
    
  } catch (error: any) {
    console.error('Error executing plan:', error)
    
    // Send error event
    sendSSEMessage(event.node.res, 'error', {
      message: error.message || 'Failed to execute plan',
      timestamp: Date.now()
    })
  } finally {
    // Close the stream
    closeSSE(event.node.res)
  }
})

