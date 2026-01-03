import { Processor } from '../../utils/ragdag/processor'
import type { ExecutePlanRequest } from '../../utils/ragdag/types'
import { defineApiHandler, validateRequired, validatePlanStructure } from '../../utils/ragdag/apiHelpers'

export default defineApiHandler<ExecutePlanRequest>(async (body) => {
  validateRequired(body, ['plan', 'input'])
  validatePlanStructure(body.plan)
  
  const processor = new Processor()
  const result = await processor.run(body.plan, body.input)
  
  return { result }
})