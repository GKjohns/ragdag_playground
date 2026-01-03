import { Planner } from '../../utils/ragdag/planner'
import type { PlanGenerationRequest } from '../../utils/ragdag/types'
import { defineApiHandler, validateRequired } from '../../utils/ragdag/apiHelpers'

export default defineApiHandler<PlanGenerationRequest>(async (body) => {
  validateRequired(body, ['goal'])
  
  const planner = new Planner()
  const plan = await planner.createPlan(body.goal)
  
  return { plan }
})