// Simplified RAGDAG Types - LLM-only version

export interface Artifact {
  type: 'text' | 'json'
  content: string | any // string for text, any for json objects
  metadata: {
    nodeId: string
    model?: string
    promptTokens?: number
    completionTokens?: number
    totalTokens?: number
    timestamp: number
  }
}

export interface ExecutionAsset {
  generatedPrompt?: string // The fully generated prompt ready for execution
  systemPrompt?: string // System prompt for the LLM
  parameters?: {
    temperature?: number
    maxTokens?: number
    topP?: number
    frequencyPenalty?: number
    presencePenalty?: number
  }
  outputSchema?: any // JSON schema for structured output
  estimatedCost?: number // Estimated cost in USD
  estimatedTokens?: {
    prompt: number
    completion: number
  }
}

export interface Node {
  id: string
  description: string
  inputs: string[] // node IDs this depends on
  promptTemplate: string // template with {{input}} or {{nodeId}} placeholders
  outputType: 'text' | 'json'
  jsonSchema?: any // JSON schema if outputType is json
  model?: 'gpt-4' | 'gpt-3.5-turbo' | 'gpt-4-turbo-preview' | 'gpt-4o' | 'gpt-4o-mini' | 'gpt-4o-2024-08-06' | 'gpt-4.1' | 'gpt-4.1-mini' | 'gpt-4.1-nano'
  temperature?: number
  systemPrompt?: string // Optional system prompt for more complex instructions
  // Asset generation fields
  asset?: ExecutionAsset // Generated execution asset
  assetStatus?: 'pending' | 'generating' | 'ready' | 'error' // Asset generation status
  assetError?: string // Error message if asset generation failed
}

export interface Plan {
  goal: string
  nodes: Node[]
  finalOutput: string // ID of the final node
}

export interface ExecutionResult {
  plan: Plan
  artifacts: Record<string, Artifact>
  finalOutput: Artifact
  executionTime: number
  totalCost?: number
}

export interface PlanGenerationRequest {
  goal: string
  inputData?: string
}

export interface ExecutePlanRequest {
  plan: Plan
  input: string
}

export interface GenerateAssetsRequest {
  plan: Plan
  sampleInput?: string // Optional sample input to help generate better prompts
}

export interface GenerateAssetsResponse {
  plan: Plan // Updated plan with generated assets
  totalEstimatedCost: number
  totalEstimatedTokens: {
    prompt: number
    completion: number
  }
}