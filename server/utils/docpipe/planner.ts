import type {
  Pipeline,
  PipelineOperation,
  Document,
  OperationType,
  FilterConfig,
  ClassifyConfig,
  ExtractConfig,
  TransformConfig,
  GroupConfig,
  AggregateConfig,
  SortConfig,
  LimitConfig,
  ComputeConfig
} from './types'
import { LLMExecutor } from './executor'
import { MODELS, DEFAULT_MODELS } from '../ragdag/constants'

/**
 * Plans document pipelines from natural language queries
 */
export class PipelinePlanner {
  private executor: LLMExecutor

  constructor() {
    this.executor = new LLMExecutor()
  }

  /**
   * Generate a pipeline from a natural language query
   */
  async plan(query: string, sampleDocuments?: Document[]): Promise<Pipeline> {
    const schema = this.getPipelineSchema()

    const systemPrompt = `You are a document pipeline planner. You convert natural language queries into a sequence of data operations on document collections.

Think of this like SQL for unstructured documents. Available operations:

1. **filter** - Keep documents matching a condition
   Example: "angry texts" → filter with condition "sentiment is angry or negative"

2. **classify** - Add a classification field to each document
   Example: "categorize by topic" → classify with field "topic" and categories ["tech", "business", "personal"]

3. **extract** - Extract structured data from each document
   Example: "get the main entities" → extract fields like {name: "entities", type: "array"}

4. **transform** - Transform the content of each document
   Example: "summarize each" → transform with transformation "create a one-sentence summary"

5. **group** - Group documents by a field value
   Example: "group by topic" → group with by="topic" (requires prior classify/extract that created the field)

6. **aggregate** - Compute aggregate statistics
   Example: "count by topic" → aggregate with operation="count"
   Example: "as percentages" → aggregate with operation="distribution", asPercentage=true

7. **sort** - Sort documents or results
   Example: "top topics" → sort by="count", order="desc"

8. **limit** - Take only top N results
   Example: "top 5" → limit n=5

9. **compute** - Compute a single value or answer from the data
   Example: "what's the overall sentiment" → compute with computation description

IMPORTANT RULES:
- Operations execute in sequence, each takes the output of the previous
- filter/classify/extract/transform work on individual documents (can be batched)
- group creates groups from a dataset (requires a field to group by)
- aggregate operates on a dataset or grouped data
- Always think about what fields exist after each step
- For "percentage" questions, use aggregate with asPercentage=true
- For "top N" questions, use sort + limit

Example query: "What are the top topics for angry texts, percentage wise"
Pipeline:
1. classify: Add "sentiment" field with categories ["angry", "neutral", "happy"]
2. filter: Keep docs where sentiment == "angry"
3. extract: Extract "topics" array from each document
4. group: Group by topics (this will expand arrays)
5. aggregate: Count with asPercentage=true
6. sort: By count descending
7. limit: Top 10`

    const userPrompt = `Create a pipeline for this query: "${query}"

${sampleDocuments?.length ? `Sample documents to understand the data:
${sampleDocuments.slice(0, 3).map((d, i) => `${i + 1}. ${d.content.substring(0, 200)}...`).join('\n')}` : ''}

Return a pipeline with the appropriate operations to answer the query.`

    try {
      const result = await this.executor.chat(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt + '\n\nRespond with valid JSON only.' }
        ],
        {
          model: DEFAULT_MODELS.PLANNING,
          temperature: 0.3,
          responseFormat: {
            type: 'json_object'
          }
        }
      )

      const pipelineData = JSON.parse(result.content)

      // Build the full pipeline
      const pipeline: Pipeline = {
        id: `pipe_${Date.now()}`,
        query,
        operations: this.buildOperations(pipelineData.operations),
        outputType: this.inferOutputType(pipelineData.operations),
        createdAt: Date.now()
      }

      return pipeline
    } catch (error) {
      console.error('Failed to generate pipeline:', error)
      return this.createFallbackPipeline(query)
    }
  }

  private getPipelineSchema() {
    return {
      type: 'object',
      properties: {
        operations: {
          type: 'array',
          description: 'The sequence of operations in the pipeline',
          items: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: ['filter', 'classify', 'extract', 'transform', 'group', 'aggregate', 'sort', 'limit', 'compute'],
                description: 'The type of operation'
              },
              description: {
                type: 'string',
                description: 'Human-readable description of what this step does'
              },
              // Filter config
              condition: {
                type: 'string',
                description: 'For filter: the condition to match'
              },
              // Classify config
              field: {
                type: 'string',
                description: 'For classify/group/aggregate/sort: the field name'
              },
              categories: {
                type: 'array',
                items: { type: 'string' },
                description: 'For classify: the possible categories'
              },
              // Extract config
              fields: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    description: { type: 'string' },
                    fieldType: { type: 'string', enum: ['string', 'number', 'boolean', 'array', 'object'] }
                  },
                  required: ['name', 'description', 'fieldType'],
                  additionalProperties: false
                },
                description: 'For extract: fields to extract'
              },
              // Transform config
              transformation: {
                type: 'string',
                description: 'For transform: what transformation to apply'
              },
              outputField: {
                type: 'string',
                description: 'For transform: optional field to store result'
              },
              // Group config
              by: {
                type: 'string',
                description: 'For group/sort: field to group/sort by'
              },
              // Aggregate config
              operation: {
                type: 'string',
                enum: ['count', 'sum', 'avg', 'min', 'max', 'list', 'distribution'],
                description: 'For aggregate: the aggregation operation'
              },
              asPercentage: {
                type: 'boolean',
                description: 'For aggregate: return as percentage'
              },
              // Sort config
              order: {
                type: 'string',
                enum: ['asc', 'desc'],
                description: 'For sort: sort order'
              },
              // Limit config
              n: {
                type: 'number',
                description: 'For limit: number of items to take'
              },
              // Compute config
              computation: {
                type: 'string',
                description: 'For compute: what to compute'
              }
            },
            required: ['type', 'description'],
            additionalProperties: false
          }
        }
      },
      required: ['operations'],
      additionalProperties: false
    }
  }

  private buildOperations(rawOperations: any[]): PipelineOperation[] {
    return rawOperations.map((op, index) => {
      const baseOp: Partial<PipelineOperation> = {
        id: `op_${index}`,
        type: op.type as OperationType,
        description: op.description,
        status: 'pending'
      }

      // Build config based on operation type
      switch (op.type) {
        case 'filter':
          baseOp.config = {
            type: 'filter',
            condition: op.condition || op.description,
            batchSize: 10
          } as FilterConfig
          break

        case 'classify':
          baseOp.config = {
            type: 'classify',
            field: op.field || 'category',
            categories: op.categories || [],
            batchSize: 10
          } as ClassifyConfig
          break

        case 'extract':
          baseOp.config = {
            type: 'extract',
            fields: (op.fields || []).map((f: any) => ({
              name: f.name,
              description: f.description,
              type: f.fieldType || f.type || 'string'
            })),
            batchSize: 10
          } as ExtractConfig
          break

        case 'transform':
          baseOp.config = {
            type: 'transform',
            transformation: op.transformation || op.description,
            outputField: op.outputField,
            batchSize: 10
          } as TransformConfig
          break

        case 'group':
          baseOp.config = {
            type: 'group',
            by: op.by || op.field || 'group'
          } as GroupConfig
          break

        case 'aggregate':
          baseOp.config = {
            type: 'aggregate',
            operation: op.operation || 'count',
            field: op.field,
            asPercentage: op.asPercentage || false
          } as AggregateConfig
          break

        case 'sort':
          baseOp.config = {
            type: 'sort',
            by: op.by || op.field || 'count',
            order: op.order || 'desc'
          } as SortConfig
          break

        case 'limit':
          baseOp.config = {
            type: 'limit',
            n: op.n || 10
          } as LimitConfig
          break

        case 'compute':
          baseOp.config = {
            type: 'compute',
            computation: op.computation || op.description
          } as ComputeConfig
          break

        default:
          throw new Error(`Unknown operation type: ${op.type}`)
      }

      return baseOp as PipelineOperation
    })
  }

  private inferOutputType(operations: any[]): Pipeline['outputType'] {
    if (operations.length === 0) return 'dataset'

    const lastOp = operations[operations.length - 1]
    switch (lastOp.type) {
      case 'group':
        return 'grouped'
      case 'aggregate':
        return 'aggregate'
      case 'compute':
        return 'value'
      default:
        return 'dataset'
    }
  }

  private createFallbackPipeline(query: string): Pipeline {
    // Simple fallback that just extracts and summarizes
    return {
      id: `pipe_${Date.now()}`,
      query,
      operations: [
        {
          id: 'op_0',
          type: 'extract',
          description: 'Extract key information from each document',
          config: {
            type: 'extract',
            fields: [
              { name: 'summary', description: 'Brief summary of the document', type: 'string' },
              { name: 'topics', description: 'Main topics mentioned', type: 'array' }
            ],
            batchSize: 10
          } as ExtractConfig,
          status: 'pending'
        },
        {
          id: 'op_1',
          type: 'compute',
          description: `Answer the query: ${query}`,
          config: {
            type: 'compute',
            computation: query
          } as ComputeConfig,
          status: 'pending'
        }
      ],
      outputType: 'value',
      createdAt: Date.now()
    }
  }
}
