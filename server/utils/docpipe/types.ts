// Document Pipeline Types - SQL-like operations on documents

/**
 * A single document in the pipeline
 */
export interface Document {
  id: string
  content: string
  metadata: Record<string, any>
}

/**
 * A collection of documents (like a SQL table)
 */
export interface Dataset {
  documents: Document[]
  schema?: Record<string, string> // field name -> type description
}

/**
 * Operation types - SQL-like operations on document collections
 */
export type OperationType =
  | 'filter'      // Dataset -> Dataset (keep docs matching condition)
  | 'classify'    // Dataset -> Dataset (add classification field to each doc)
  | 'extract'     // Dataset -> Dataset (extract structured data from each doc)
  | 'transform'   // Dataset -> Dataset (transform content of each doc)
  | 'group'       // Dataset -> GroupedDataset (group by some attribute)
  | 'aggregate'   // Dataset | GroupedDataset -> AggregateResult
  | 'sort'        // Dataset -> Dataset (order by some field)
  | 'limit'       // Dataset -> Dataset (top N)
  | 'compute'     // Dataset -> ComputedValue (compute a single value)

/**
 * A single operation in the pipeline
 */
export interface PipelineOperation {
  id: string
  type: OperationType
  description: string // Human-readable description of what this step does

  // AI prompt configuration
  aiPrompt?: string // The prompt to send to AI for this operation

  // Operation-specific config
  config: OperationConfig

  // Execution metadata
  status?: 'pending' | 'running' | 'complete' | 'error'
  error?: string
  stats?: {
    inputCount: number
    outputCount: number
    duration: number
    tokensUsed: number
    cost: number
  }
}

/**
 * Configuration for different operation types
 */
export type OperationConfig =
  | FilterConfig
  | ClassifyConfig
  | ExtractConfig
  | TransformConfig
  | GroupConfig
  | AggregateConfig
  | SortConfig
  | LimitConfig
  | ComputeConfig

export interface FilterConfig {
  type: 'filter'
  condition: string // Natural language condition, e.g., "sentiment is angry"
  batchSize?: number
}

export interface ClassifyConfig {
  type: 'classify'
  field: string // Field name to add, e.g., "sentiment"
  categories: string[] // Possible values, e.g., ["positive", "negative", "neutral"]
  batchSize?: number
}

export interface ExtractConfig {
  type: 'extract'
  fields: Array<{
    name: string
    description: string
    type: 'string' | 'number' | 'boolean' | 'array' | 'object'
  }>
  batchSize?: number
}

export interface TransformConfig {
  type: 'transform'
  transformation: string // What to do, e.g., "summarize", "translate to Spanish"
  outputField?: string // If set, store in this field instead of replacing content
  batchSize?: number
}

export interface GroupConfig {
  type: 'group'
  by: string // Field to group by
}

export interface AggregateConfig {
  type: 'aggregate'
  operation: 'count' | 'sum' | 'avg' | 'min' | 'max' | 'list' | 'distribution'
  field?: string // Field to aggregate (for sum, avg, etc.)
  asPercentage?: boolean // Return as percentage instead of raw count
}

export interface SortConfig {
  type: 'sort'
  by: string // Field to sort by
  order: 'asc' | 'desc'
}

export interface LimitConfig {
  type: 'limit'
  n: number
}

export interface ComputeConfig {
  type: 'compute'
  computation: string // Natural language description, e.g., "find the most common themes"
}

/**
 * The complete pipeline definition
 */
export interface Pipeline {
  id: string
  query: string // The original natural language query
  operations: PipelineOperation[]
  outputType: 'dataset' | 'grouped' | 'aggregate' | 'value'
  createdAt: number
}

/**
 * Grouped dataset result
 */
export interface GroupedDataset {
  type: 'grouped'
  groups: Record<string, Document[]>
}

/**
 * Aggregate result
 */
export interface AggregateResult {
  type: 'aggregate'
  value: number | Record<string, number> // Single value or distribution
  total?: number
  asPercentage?: boolean
}

/**
 * Computed value result
 */
export interface ComputedValue {
  type: 'computed'
  value: any
  explanation?: string
}

/**
 * Union type for all possible intermediate results
 */
export type PipelineData = Dataset | GroupedDataset | AggregateResult | ComputedValue

/**
 * Pipeline execution result
 */
export interface PipelineResult {
  pipeline: Pipeline
  input: Dataset
  output: PipelineData
  intermediates: Record<string, PipelineData> // Results after each step
  stats: {
    totalDuration: number
    totalTokens: number
    totalCost: number
    documentsProcessed: number
  }
}

/**
 * Request to generate a pipeline from a query
 */
export interface GeneratePipelineRequest {
  query: string
  sampleDocuments?: Document[] // Help AI understand the data
}

/**
 * Request to execute a pipeline
 */
export interface ExecutePipelineRequest {
  pipeline: Pipeline
  documents: Document[]
}

/**
 * Progress update during execution
 */
export interface ExecutionProgress {
  operationId: string
  operationType: OperationType
  status: 'running' | 'complete' | 'error'
  progress?: {
    current: number
    total: number
  }
  message?: string
}
