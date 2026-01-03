import OpenAI from 'openai'
import { useRuntimeConfig } from '#imports'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatOptions {
  model?: string
  temperature?: number
  maxTokens?: number
  responseFormat?: {
    type: 'json_schema' | 'json_object' | 'text'
    schema?: any
  }
}

export interface ChatResult {
  content: string
  promptTokens: number
  completionTokens: number
  totalTokens: number
  model: string
}

/**
 * LLM executor for document pipeline operations
 */
export class LLMExecutor {
  private openai: OpenAI | null
  private isSimulationMode: boolean

  constructor() {
    const config = useRuntimeConfig()
    const apiKey = config.openaiApiKey

    if (!apiKey || apiKey === 'SIMULATION_MODE') {
      console.warn('OPENAI_API_KEY not found. Using simulation mode.')
      this.openai = null
      this.isSimulationMode = true
    } else {
      this.openai = new OpenAI({ apiKey })
      this.isSimulationMode = false
    }
  }

  /**
   * Execute a chat completion
   */
  async chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<ChatResult> {
    const model = options.model || 'gpt-4.1-nano'

    if (this.isSimulationMode) {
      return this.simulateChat(messages, options)
    }

    const params: any = {
      model,
      messages,
      temperature: options.temperature ?? 0.7
    }

    if (options.maxTokens) {
      params.max_tokens = options.maxTokens
    }

    if (options.responseFormat) {
      if (options.responseFormat.type === 'json_schema' && options.responseFormat.schema) {
        params.response_format = {
          type: 'json_schema',
          json_schema: {
            name: 'response',
            strict: true,
            schema: options.responseFormat.schema
          }
        }
      } else if (options.responseFormat.type === 'json_object') {
        params.response_format = { type: 'json_object' }
      }
    }

    const response = await this.openai!.chat.completions.create(params)

    return {
      content: response.choices[0]?.message?.content || '',
      promptTokens: response.usage?.prompt_tokens || 0,
      completionTokens: response.usage?.completion_tokens || 0,
      totalTokens: response.usage?.total_tokens || 0,
      model
    }
  }

  /**
   * Batch process documents with the same prompt template
   */
  async batchProcess<T>(
    documents: Array<{ id: string; content: string }>,
    promptTemplate: string,
    options: ChatOptions & { parseJson?: boolean } = {}
  ): Promise<Array<{ id: string; result: T; tokens: number }>> {
    const results: Array<{ id: string; result: T; tokens: number }> = []

    // Process in parallel with concurrency limit
    const BATCH_SIZE = 5
    for (let i = 0; i < documents.length; i += BATCH_SIZE) {
      const batch = documents.slice(i, i + BATCH_SIZE)

      const batchResults = await Promise.all(
        batch.map(async (doc) => {
          const prompt = promptTemplate.replace('{{content}}', doc.content).replace('{{id}}', doc.id)

          const response = await this.chat(
            [{ role: 'user', content: prompt }],
            options
          )

          let result: T
          if (options.parseJson) {
            try {
              result = JSON.parse(response.content)
            } catch {
              result = response.content as T
            }
          } else {
            result = response.content as T
          }

          return {
            id: doc.id,
            result,
            tokens: response.totalTokens
          }
        })
      )

      results.push(...batchResults)
    }

    return results
  }

  private async simulateChat(messages: ChatMessage[], options: ChatOptions): Promise<ChatResult> {
    const lastMessage = messages[messages.length - 1]
    const content = lastMessage?.content || ''

    // Estimate tokens
    const promptTokens = Math.floor(messages.reduce((acc, m) => acc + m.content.length, 0) / 4)

    let responseContent: string

    // Check if this is a pipeline planning request
    if (content.includes('Create a pipeline') || content.includes('pipeline for this query')) {
      responseContent = this.simulatePipelinePlan(content)
    }
    // Check for classification requests
    else if (content.includes('classify') || content.includes('categorize') || content.includes('sentiment')) {
      responseContent = this.simulateClassification(content)
    }
    // Check for extraction requests
    else if (content.includes('extract') || content.includes('topics')) {
      responseContent = this.simulateExtraction(content)
    }
    // Check for filter requests
    else if (content.includes('filter') || content.includes('match')) {
      responseContent = this.simulateFilter(content)
    }
    // Default response
    else {
      responseContent = JSON.stringify({
        result: 'Simulated response',
        data: { processed: true }
      })
    }

    const completionTokens = Math.floor(responseContent.length / 4)

    return {
      content: responseContent,
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      model: 'simulation'
    }
  }

  private simulatePipelinePlan(content: string): string {
    // Extract the query from the content
    const queryMatch = content.match(/query[:\s]+"([^"]+)"/i)
    const query = queryMatch ? queryMatch[1].toLowerCase() : content.toLowerCase()

    // Determine operations based on query patterns
    const operations: any[] = []

    // Check for sentiment-related queries
    if (query.includes('angry') || query.includes('sentiment') || query.includes('happy') || query.includes('sad')) {
      operations.push({
        type: 'classify',
        description: 'Classify documents by sentiment',
        field: 'sentiment',
        categories: ['angry', 'happy', 'sad', 'neutral']
      })
    }

    // Check for filtering
    if (query.includes('angry texts') || query.includes('positive') || query.includes('negative')) {
      const sentiment = query.includes('angry') ? 'angry' : query.includes('positive') ? 'happy' : 'sad'
      operations.push({
        type: 'filter',
        description: `Keep only ${sentiment} documents`,
        condition: `sentiment equals ${sentiment}`
      })
    }

    // Check for topic extraction
    if (query.includes('topic') || query.includes('themes')) {
      operations.push({
        type: 'extract',
        description: 'Extract topics from each document',
        fields: [
          { name: 'topics', description: 'Main topics discussed', fieldType: 'array' }
        ]
      })
    }

    // Check for grouping
    if (query.includes('by topic') || query.includes('group')) {
      operations.push({
        type: 'group',
        description: 'Group documents by topic',
        by: 'topics'
      })
    }

    // Check for counting/aggregation
    if (query.includes('count') || query.includes('how many') || query.includes('distribution') || query.includes('percentage') || query.includes('top')) {
      operations.push({
        type: 'aggregate',
        description: 'Count documents in each group',
        operation: 'count',
        asPercentage: query.includes('percentage') || query.includes('%')
      })
    }

    // Check for sorting
    if (query.includes('top') || query.includes('most') || query.includes('highest')) {
      operations.push({
        type: 'sort',
        description: 'Sort by count descending',
        by: 'count',
        order: 'desc'
      })
    }

    // Check for limit
    const limitMatch = query.match(/top\s*(\d+)/i)
    if (limitMatch) {
      operations.push({
        type: 'limit',
        description: `Take top ${limitMatch[1]} results`,
        n: parseInt(limitMatch[1])
      })
    } else if (query.includes('top')) {
      operations.push({
        type: 'limit',
        description: 'Take top 10 results',
        n: 10
      })
    }

    // If no operations detected, create a simple compute
    if (operations.length === 0) {
      operations.push({
        type: 'compute',
        description: 'Analyze and answer the query',
        computation: query
      })
    }

    return JSON.stringify({ operations })
  }

  private simulateClassification(content: string): string {
    // Simulate classification results
    const sentiments = ['angry', 'happy', 'neutral', 'sad']
    const sentiment = sentiments[Math.floor(Math.random() * sentiments.length)]

    return JSON.stringify({
      sentiment,
      confidence: 0.85 + Math.random() * 0.1
    })
  }

  private simulateExtraction(content: string): string {
    const topics = [
      ['technology', 'innovation'],
      ['business', 'finance'],
      ['politics', 'policy'],
      ['health', 'wellness'],
      ['environment', 'climate']
    ]
    const selectedTopics = topics[Math.floor(Math.random() * topics.length)]

    return JSON.stringify({
      topics: selectedTopics,
      entities: ['Example Entity 1', 'Example Entity 2']
    })
  }

  private simulateFilter(content: string): string {
    // Return whether document matches (random for simulation)
    return JSON.stringify({
      matches: Math.random() > 0.5
    })
  }

  get simulationMode(): boolean {
    return this.isSimulationMode
  }
}
