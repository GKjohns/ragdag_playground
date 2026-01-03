import type {
  Pipeline,
  PipelineOperation,
  PipelineResult,
  PipelineData,
  Document,
  Dataset,
  GroupedDataset,
  AggregateResult,
  ComputedValue,
  FilterConfig,
  ClassifyConfig,
  ExtractConfig,
  TransformConfig,
  GroupConfig,
  AggregateConfig,
  SortConfig,
  LimitConfig,
  ComputeConfig,
  ExecutionProgress
} from './types'
import { LLMExecutor } from './executor'
import { DEFAULT_MODELS } from '../ragdag/constants'

export type ProgressCallback = (progress: ExecutionProgress) => void

/**
 * Executes document pipelines
 */
export class PipelineProcessor {
  private executor: LLMExecutor
  private onProgress?: ProgressCallback

  constructor(onProgress?: ProgressCallback) {
    this.executor = new LLMExecutor()
    this.onProgress = onProgress
  }

  /**
   * Execute a complete pipeline on a dataset
   */
  async execute(pipeline: Pipeline, documents: Document[]): Promise<PipelineResult> {
    const startTime = Date.now()
    const intermediates: Record<string, PipelineData> = {}

    let currentData: PipelineData = {
      documents,
      schema: {}
    } as Dataset

    let totalTokens = 0
    let totalCost = 0

    // Execute each operation in sequence
    for (const operation of pipeline.operations) {
      this.emitProgress(operation.id, operation.type, 'running')

      const opStartTime = Date.now()

      try {
        const { result, tokens, cost } = await this.executeOperation(operation, currentData)

        operation.status = 'complete'
        operation.stats = {
          inputCount: this.getCount(currentData),
          outputCount: this.getCount(result),
          duration: Date.now() - opStartTime,
          tokensUsed: tokens,
          cost
        }

        totalTokens += tokens
        totalCost += cost

        intermediates[operation.id] = result
        currentData = result

        this.emitProgress(operation.id, operation.type, 'complete')
      } catch (error) {
        operation.status = 'error'
        operation.error = String(error)
        this.emitProgress(operation.id, operation.type, 'error', String(error))
        throw error
      }
    }

    return {
      pipeline,
      input: { documents, schema: {} },
      output: currentData,
      intermediates,
      stats: {
        totalDuration: Date.now() - startTime,
        totalTokens,
        totalCost,
        documentsProcessed: documents.length
      }
    }
  }

  private emitProgress(
    operationId: string,
    operationType: PipelineOperation['type'],
    status: 'running' | 'complete' | 'error',
    message?: string
  ) {
    if (this.onProgress) {
      this.onProgress({
        operationId,
        operationType,
        status,
        message
      })
    }
  }

  private getCount(data: PipelineData): number {
    if ('documents' in data) return data.documents.length
    if ('groups' in data) return Object.keys(data.groups).length
    if ('value' in data) return 1
    return 0
  }

  private async executeOperation(
    operation: PipelineOperation,
    input: PipelineData
  ): Promise<{ result: PipelineData; tokens: number; cost: number }> {
    const config = operation.config

    switch (config.type) {
      case 'filter':
        return this.executeFilter(config, input as Dataset)

      case 'classify':
        return this.executeClassify(config, input as Dataset)

      case 'extract':
        return this.executeExtract(config, input as Dataset)

      case 'transform':
        return this.executeTransform(config, input as Dataset)

      case 'group':
        return this.executeGroup(config, input as Dataset)

      case 'aggregate':
        return this.executeAggregate(config, input)

      case 'sort':
        return this.executeSort(config, input)

      case 'limit':
        return this.executeLimit(config, input)

      case 'compute':
        return this.executeCompute(config, input)

      default:
        throw new Error(`Unknown operation type: ${(config as any).type}`)
    }
  }

  /**
   * Filter documents based on a condition
   */
  private async executeFilter(
    config: FilterConfig,
    input: Dataset
  ): Promise<{ result: Dataset; tokens: number; cost: number }> {
    const batchSize = config.batchSize || 10
    let totalTokens = 0
    const matchingDocs: Document[] = []

    // Process in batches
    for (let i = 0; i < input.documents.length; i += batchSize) {
      const batch = input.documents.slice(i, i + batchSize)

      // Create a batch prompt
      const prompt = `You are filtering documents based on a condition.

Condition: ${config.condition}

For each document below, determine if it matches the condition. Return a JSON object with "matches" as an array of booleans, one for each document.

Documents:
${batch.map((doc, idx) => `[${idx}] ${doc.content}`).join('\n\n')}

Return JSON: {"matches": [true/false, ...]}`

      const response = await this.executor.chat(
        [{ role: 'user', content: prompt }],
        {
          model: DEFAULT_MODELS.EXECUTION,
          temperature: 0.1,
          responseFormat: { type: 'json_object' }
        }
      )

      totalTokens += response.totalTokens

      try {
        const result = JSON.parse(response.content)
        const matches = result.matches || []

        batch.forEach((doc, idx) => {
          if (matches[idx]) {
            matchingDocs.push(doc)
          }
        })
      } catch {
        // On parse error, keep all documents
        matchingDocs.push(...batch)
      }
    }

    return {
      result: { documents: matchingDocs, schema: input.schema },
      tokens: totalTokens,
      cost: this.estimateCost(totalTokens)
    }
  }

  /**
   * Classify documents into categories
   */
  private async executeClassify(
    config: ClassifyConfig,
    input: Dataset
  ): Promise<{ result: Dataset; tokens: number; cost: number }> {
    const batchSize = config.batchSize || 10
    let totalTokens = 0
    const classifiedDocs: Document[] = []

    for (let i = 0; i < input.documents.length; i += batchSize) {
      const batch = input.documents.slice(i, i + batchSize)

      const prompt = `You are classifying documents into categories.

Field to classify: ${config.field}
Categories: ${config.categories.join(', ')}

For each document below, assign the most appropriate category. Return a JSON object with "classifications" as an array of category strings.

Documents:
${batch.map((doc, idx) => `[${idx}] ${doc.content}`).join('\n\n')}

Return JSON: {"classifications": ["category1", "category2", ...]}`

      const response = await this.executor.chat(
        [{ role: 'user', content: prompt }],
        {
          model: DEFAULT_MODELS.EXECUTION,
          temperature: 0.1,
          responseFormat: { type: 'json_object' }
        }
      )

      totalTokens += response.totalTokens

      try {
        const result = JSON.parse(response.content)
        const classifications = result.classifications || []

        batch.forEach((doc, idx) => {
          classifiedDocs.push({
            ...doc,
            metadata: {
              ...doc.metadata,
              [config.field]: classifications[idx] || config.categories[0]
            }
          })
        })
      } catch {
        // On error, assign first category
        batch.forEach((doc) => {
          classifiedDocs.push({
            ...doc,
            metadata: { ...doc.metadata, [config.field]: config.categories[0] }
          })
        })
      }
    }

    return {
      result: {
        documents: classifiedDocs,
        schema: { ...input.schema, [config.field]: 'string' }
      },
      tokens: totalTokens,
      cost: this.estimateCost(totalTokens)
    }
  }

  /**
   * Extract structured data from documents
   */
  private async executeExtract(
    config: ExtractConfig,
    input: Dataset
  ): Promise<{ result: Dataset; tokens: number; cost: number }> {
    const batchSize = config.batchSize || 5
    let totalTokens = 0
    const extractedDocs: Document[] = []

    const fieldDescriptions = config.fields
      .map(f => `- ${f.name} (${f.type}): ${f.description}`)
      .join('\n')

    for (let i = 0; i < input.documents.length; i += batchSize) {
      const batch = input.documents.slice(i, i + batchSize)

      const prompt = `Extract structured data from each document.

Fields to extract:
${fieldDescriptions}

For each document, extract the specified fields. Return a JSON object with "extractions" as an array of objects, one per document.

Documents:
${batch.map((doc, idx) => `[${idx}] ${doc.content}`).join('\n\n')}

Return JSON: {"extractions": [{field1: value, field2: value, ...}, ...]}`

      const response = await this.executor.chat(
        [{ role: 'user', content: prompt }],
        {
          model: DEFAULT_MODELS.EXECUTION,
          temperature: 0.3,
          responseFormat: { type: 'json_object' }
        }
      )

      totalTokens += response.totalTokens

      try {
        const result = JSON.parse(response.content)
        const extractions = result.extractions || []

        batch.forEach((doc, idx) => {
          const extracted = extractions[idx] || {}
          extractedDocs.push({
            ...doc,
            metadata: { ...doc.metadata, ...extracted }
          })
        })
      } catch {
        extractedDocs.push(...batch)
      }
    }

    // Update schema
    const newSchema = { ...input.schema }
    config.fields.forEach(f => {
      newSchema[f.name] = f.type
    })

    return {
      result: { documents: extractedDocs, schema: newSchema },
      tokens: totalTokens,
      cost: this.estimateCost(totalTokens)
    }
  }

  /**
   * Transform document content
   */
  private async executeTransform(
    config: TransformConfig,
    input: Dataset
  ): Promise<{ result: Dataset; tokens: number; cost: number }> {
    const batchSize = config.batchSize || 5
    let totalTokens = 0
    const transformedDocs: Document[] = []

    for (let i = 0; i < input.documents.length; i += batchSize) {
      const batch = input.documents.slice(i, i + batchSize)

      const prompt = `Transform each document according to these instructions: ${config.transformation}

For each document, apply the transformation. Return a JSON object with "transformations" as an array of strings (transformed content).

Documents:
${batch.map((doc, idx) => `[${idx}] ${doc.content}`).join('\n\n')}

Return JSON: {"transformations": ["transformed content 1", "transformed content 2", ...]}`

      const response = await this.executor.chat(
        [{ role: 'user', content: prompt }],
        {
          model: DEFAULT_MODELS.EXECUTION,
          temperature: 0.5,
          responseFormat: { type: 'json_object' }
        }
      )

      totalTokens += response.totalTokens

      try {
        const result = JSON.parse(response.content)
        const transformations = result.transformations || []

        batch.forEach((doc, idx) => {
          const transformed = transformations[idx] || doc.content
          if (config.outputField) {
            transformedDocs.push({
              ...doc,
              metadata: { ...doc.metadata, [config.outputField]: transformed }
            })
          } else {
            transformedDocs.push({ ...doc, content: transformed })
          }
        })
      } catch {
        transformedDocs.push(...batch)
      }
    }

    return {
      result: { documents: transformedDocs, schema: input.schema },
      tokens: totalTokens,
      cost: this.estimateCost(totalTokens)
    }
  }

  /**
   * Group documents by a field
   */
  private async executeGroup(
    config: GroupConfig,
    input: Dataset
  ): Promise<{ result: GroupedDataset; tokens: number; cost: number }> {
    const groups: Record<string, Document[]> = {}

    for (const doc of input.documents) {
      const value = doc.metadata[config.by]

      // Handle array values (expand)
      const values = Array.isArray(value) ? value : [value || 'unknown']

      for (const v of values) {
        const key = String(v)
        if (!groups[key]) {
          groups[key] = []
        }
        groups[key].push(doc)
      }
    }

    return {
      result: { type: 'grouped', groups },
      tokens: 0,
      cost: 0
    }
  }

  /**
   * Aggregate data
   */
  private async executeAggregate(
    config: AggregateConfig,
    input: PipelineData
  ): Promise<{ result: AggregateResult; tokens: number; cost: number }> {
    let value: number | Record<string, number>

    if ('groups' in input) {
      // Aggregate grouped data
      const groupedInput = input as GroupedDataset
      const counts: Record<string, number> = {}

      for (const [key, docs] of Object.entries(groupedInput.groups)) {
        switch (config.operation) {
          case 'count':
            counts[key] = docs.length
            break
          case 'sum':
            counts[key] = docs.reduce((acc, d) => acc + (Number(d.metadata[config.field!]) || 0), 0)
            break
          case 'avg':
            const sum = docs.reduce((acc, d) => acc + (Number(d.metadata[config.field!]) || 0), 0)
            counts[key] = docs.length > 0 ? sum / docs.length : 0
            break
          default:
            counts[key] = docs.length
        }
      }

      const total = Object.values(counts).reduce((a, b) => a + b, 0)

      if (config.asPercentage && total > 0) {
        for (const key of Object.keys(counts)) {
          counts[key] = Math.round((counts[key] / total) * 1000) / 10 // One decimal place
        }
      }

      value = counts
    } else if ('documents' in input) {
      // Aggregate dataset
      const docs = (input as Dataset).documents
      switch (config.operation) {
        case 'count':
          value = docs.length
          break
        case 'sum':
          value = docs.reduce((acc, d) => acc + (Number(d.metadata[config.field!]) || 0), 0)
          break
        case 'avg':
          const sum = docs.reduce((acc, d) => acc + (Number(d.metadata[config.field!]) || 0), 0)
          value = docs.length > 0 ? sum / docs.length : 0
          break
        default:
          value = docs.length
      }
    } else {
      value = 0
    }

    return {
      result: {
        type: 'aggregate',
        value,
        total: typeof value === 'number' ? value : Object.values(value).reduce((a, b) => a + b, 0),
        asPercentage: config.asPercentage
      },
      tokens: 0,
      cost: 0
    }
  }

  /**
   * Sort data
   */
  private async executeSort(
    config: SortConfig,
    input: PipelineData
  ): Promise<{ result: PipelineData; tokens: number; cost: number }> {
    if ('documents' in input) {
      const sorted = [...(input as Dataset).documents].sort((a, b) => {
        const aVal = a.metadata[config.by] ?? 0
        const bVal = b.metadata[config.by] ?? 0
        return config.order === 'asc' ? (aVal > bVal ? 1 : -1) : (bVal > aVal ? 1 : -1)
      })
      return {
        result: { documents: sorted, schema: (input as Dataset).schema },
        tokens: 0,
        cost: 0
      }
    }

    if ('value' in input && typeof (input as AggregateResult).value === 'object') {
      const aggResult = input as AggregateResult
      const entries = Object.entries(aggResult.value as Record<string, number>)
      entries.sort((a, b) => config.order === 'asc' ? a[1] - b[1] : b[1] - a[1])
      return {
        result: {
          ...aggResult,
          value: Object.fromEntries(entries)
        },
        tokens: 0,
        cost: 0
      }
    }

    return { result: input, tokens: 0, cost: 0 }
  }

  /**
   * Limit results
   */
  private async executeLimit(
    config: LimitConfig,
    input: PipelineData
  ): Promise<{ result: PipelineData; tokens: number; cost: number }> {
    if ('documents' in input) {
      return {
        result: {
          documents: (input as Dataset).documents.slice(0, config.n),
          schema: (input as Dataset).schema
        },
        tokens: 0,
        cost: 0
      }
    }

    if ('value' in input && typeof (input as AggregateResult).value === 'object') {
      const aggResult = input as AggregateResult
      const entries = Object.entries(aggResult.value as Record<string, number>).slice(0, config.n)
      return {
        result: {
          ...aggResult,
          value: Object.fromEntries(entries)
        },
        tokens: 0,
        cost: 0
      }
    }

    return { result: input, tokens: 0, cost: 0 }
  }

  /**
   * Compute a value from the data
   */
  private async executeCompute(
    config: ComputeConfig,
    input: PipelineData
  ): Promise<{ result: ComputedValue; tokens: number; cost: number }> {
    // Serialize the input data for the LLM
    let dataDescription: string

    if ('documents' in input) {
      const docs = (input as Dataset).documents
      dataDescription = `Dataset with ${docs.length} documents:\n` +
        docs.slice(0, 20).map((d, i) =>
          `[${i}] Content: ${d.content.substring(0, 200)}...\n    Metadata: ${JSON.stringify(d.metadata)}`
        ).join('\n')
    } else if ('groups' in input) {
      const groups = (input as GroupedDataset).groups
      dataDescription = `Grouped data with ${Object.keys(groups).length} groups:\n` +
        Object.entries(groups).map(([key, docs]) =>
          `${key}: ${docs.length} documents`
        ).join('\n')
    } else if ('value' in input) {
      dataDescription = `Aggregate value: ${JSON.stringify((input as AggregateResult).value)}`
    } else {
      dataDescription = JSON.stringify(input)
    }

    const prompt = `Based on this data, compute/answer: ${config.computation}

Data:
${dataDescription}

Provide a clear, concise answer. Return as JSON: {"value": <the answer>, "explanation": "<brief explanation>"}`

    const response = await this.executor.chat(
      [{ role: 'user', content: prompt }],
      {
        model: DEFAULT_MODELS.ASSET_GENERATION, // Use a smarter model for computation
        temperature: 0.3,
        responseFormat: { type: 'json_object' }
      }
    )

    try {
      const result = JSON.parse(response.content)
      return {
        result: {
          type: 'computed',
          value: result.value,
          explanation: result.explanation
        },
        tokens: response.totalTokens,
        cost: this.estimateCost(response.totalTokens)
      }
    } catch {
      return {
        result: {
          type: 'computed',
          value: response.content,
          explanation: 'Raw response'
        },
        tokens: response.totalTokens,
        cost: this.estimateCost(response.totalTokens)
      }
    }
  }

  private estimateCost(tokens: number): number {
    // Rough estimate: $0.075/1M input + $0.30/1M output for nano
    // Assume 70% input, 30% output
    const inputTokens = tokens * 0.7
    const outputTokens = tokens * 0.3
    return (inputTokens * 0.000000075) + (outputTokens * 0.0000003)
  }
}
