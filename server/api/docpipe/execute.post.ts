import { PipelineProcessor } from '../../utils/docpipe'
import type { ExecutePipelineRequest } from '../../utils/docpipe/types'
import { defineApiHandler, validateRequired } from '../../utils/ragdag/apiHelpers'

export default defineApiHandler<ExecutePipelineRequest>(async (body) => {
  validateRequired(body, ['pipeline', 'documents'])

  const processor = new PipelineProcessor()
  const result = await processor.execute(body.pipeline, body.documents)

  return { result }
})
