import { PipelinePlanner } from '../../utils/docpipe'
import type { GeneratePipelineRequest, Document } from '../../utils/docpipe/types'
import { defineApiHandler, validateRequired } from '../../utils/ragdag/apiHelpers'

export default defineApiHandler<GeneratePipelineRequest>(async (body) => {
  validateRequired(body, ['query'])

  const planner = new PipelinePlanner()
  const pipeline = await planner.plan(body.query, body.sampleDocuments)

  return { pipeline }
})
