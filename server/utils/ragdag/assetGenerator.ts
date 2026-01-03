import type { Plan, Node, ExecutionAsset } from './types'
import { LLMExecutor } from './executors/llm'
import { validateAndRepairSchema } from './schemaValidator'
import { parseNumberWithFallback, estimateCostsAndTokens } from './utils'
import { DEFAULT_MODELS, DEFAULT_PARAMETERS } from './constants'

export class AssetGenerator {
  private executor: LLMExecutor
  
  constructor() {
    this.executor = new LLMExecutor()
  }
  
  /**
   * Generate execution assets for all nodes in a plan
   */
  async generateAssets(plan: Plan, sampleInput?: string): Promise<Plan> {
    const updatedNodes: Node[] = []
    
    // Process nodes in topological order to have context from dependencies
    const processedAssets = new Map<string, ExecutionAsset>()
    
    for (const node of plan.nodes) {
      try {
        console.log(`Generating assets for node: ${node.id}`)
        
        // Mark as generating
        const nodeWithStatus = { ...node, assetStatus: 'generating' as const }
        
        // Generate the asset for this node
        const asset = await this.generateNodeAsset(
          node, 
          plan, 
          processedAssets,
          sampleInput
        )
        
        // Store for future nodes to reference
        processedAssets.set(node.id, asset)
        
        // Update node with generated asset
        updatedNodes.push({
          ...nodeWithStatus,
          asset,
          assetStatus: 'ready'
        })
        
        console.log(`✓ Generated assets for: ${node.id}`)
      } catch (error) {
        console.error(`Failed to generate assets for node ${node.id}:`, error)
        updatedNodes.push({
          ...node,
          assetStatus: 'error',
          assetError: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }
    
    return {
      ...plan,
      nodes: updatedNodes
    }
  }
  
  /**
   * Generate execution asset for a single node
   */
  private async generateNodeAsset(
    node: Node,
    plan: Plan,
    previousAssets: Map<string, ExecutionAsset>,
    sampleInput?: string
  ): Promise<ExecutionAsset> {
    // Build context about dependencies
    const dependencyContext = this.buildDependencyContext(node, plan, previousAssets)
    
    // Create a meta-prompt to generate the actual execution prompt
    const metaPrompt = this.buildAssetGenerationPrompt(
      node,
      dependencyContext,
      sampleInput
    )
    
    // Use a small model to generate the asset
    const generatorNode: Node = {
      id: '__asset_generator__',
      description: 'Generate execution asset',
      inputs: [],
      promptTemplate: metaPrompt,
      outputType: 'json',
      model: DEFAULT_MODELS.ASSET_GENERATION,
      temperature: 0.3, // Lower temperature for consistent generation
      jsonSchema: this.getAssetSchema(node.outputType === 'json'),
      systemPrompt: 'You are an expert prompt engineer. Create precise, effective prompts that accomplish the specified task.'
    }
    
    // Generate the asset
    const result = await this.executor.execute(generatorNode, new Map(), '')
    const generatedAsset = result.content as any
    
    // Parse string values back to numbers/objects using utility
    
    // Parse output schema if it exists
    let outputSchema = undefined
    if (node.outputType === 'json') {
      if (generatedAsset.outputSchemaJson && generatedAsset.outputSchemaJson !== '') {
        try {
          let parsedSchema = JSON.parse(generatedAsset.outputSchemaJson)
          // Use the validator to ensure schema compliance
          outputSchema = validateAndRepairSchema(parsedSchema, `${node.id}_generated`)
          console.log(`✅ Validated generated schema for node ${node.id}`)
        } catch (e) {
          console.warn('Failed to parse output schema JSON:', e)
          // Fallback to node's original schema
          if (node.jsonSchema) {
            outputSchema = validateAndRepairSchema(node.jsonSchema, `${node.id}_fallback`)
          }
        }
      } else if (node.jsonSchema) {
        // Use the node's original schema if no generated schema
        outputSchema = validateAndRepairSchema(node.jsonSchema, `${node.id}_original`)
      }
    }
    
    // Calculate estimated costs and tokens
    const systemPrompt = generatedAsset.systemPrompt && generatedAsset.systemPrompt !== '' 
      ? generatedAsset.systemPrompt 
      : node.systemPrompt
    
    const estimates = estimateCostsAndTokens(
      generatedAsset.prompt,
      systemPrompt,
      node.model || DEFAULT_MODELS.EXECUTION
    )
    
    // Build the final asset
    const asset: ExecutionAsset = {
      generatedPrompt: generatedAsset.prompt,
      systemPrompt: systemPrompt,
      parameters: {
        temperature: parseNumberWithFallback(generatedAsset.temperature, node.temperature ?? DEFAULT_PARAMETERS.temperature),
        maxTokens: Math.round(parseNumberWithFallback(generatedAsset.maxTokens, DEFAULT_PARAMETERS.maxTokens)),
        topP: parseNumberWithFallback(generatedAsset.topP, DEFAULT_PARAMETERS.topP),
        frequencyPenalty: parseNumberWithFallback(generatedAsset.frequencyPenalty, DEFAULT_PARAMETERS.frequencyPenalty),
        presencePenalty: parseNumberWithFallback(generatedAsset.presencePenalty, DEFAULT_PARAMETERS.presencePenalty)
      },
      outputSchema: outputSchema,
      estimatedCost: estimates.cost,
      estimatedTokens: estimates.tokens
    }
    
    return asset
  }
  
  /**
   * Build context about node dependencies for better prompt generation
   */
  private buildDependencyContext(
    node: Node,
    plan: Plan,
    previousAssets: Map<string, ExecutionAsset>
  ): string {
    if (node.inputs.length === 0) {
      return "This is the first node in the pipeline. It will receive raw user input."
    }
    
    const contexts: string[] = []
    for (const inputId of node.inputs) {
      const inputNode = plan.nodes.find(n => n.id === inputId)
      if (inputNode) {
        const asset = previousAssets.get(inputId)
        const outputInfo = inputNode.outputType === 'json' ? 
          'structured JSON data' : 'text output'
        contexts.push(
          `- ${inputId}: ${inputNode.description} (produces ${outputInfo})`
        )
        if (asset?.outputSchema) {
          contexts.push(`  Schema: ${JSON.stringify(asset.outputSchema, null, 2)}`)
        }
      }
    }
    
    return "This node depends on:\n" + contexts.join('\n')
  }
  
  /**
   * Build the meta-prompt to generate execution assets
   */
  private buildAssetGenerationPrompt(
    node: Node,
    dependencyContext: string,
    sampleInput?: string
  ): string {
    const sampleSection = sampleInput ? 
      `\nSample Input Data:\n${sampleInput.substring(0, 500)}...` : ''
    
    return `Generate an optimized execution asset for this RAGDAG node:

Node ID: ${node.id}
Description: ${node.description}
Output Type: ${node.outputType}
Model: ${node.model || DEFAULT_MODELS.EXECUTION}

Original Prompt Template:
${node.promptTemplate}

${dependencyContext}
${sampleSection}

Your task is to generate:
1. A clear, specific prompt that accomplishes the node's goal
2. A system prompt for complex instructions (use empty string "" if not needed)
3. Optimal parameters as strings: temperature (e.g., "0.7"), maxTokens (e.g., "1000"), etc.
4. ${node.outputType === 'json' ? 'A JSON schema as a JSON string in outputSchemaJson field (use empty string "" if not needed)' : 'Text output guidance'}

IMPORTANT: All fields are required. Use empty strings "" for fields that aren't needed, never null or undefined.
- For systemPrompt: Use empty string "" if no system prompt is needed
- For parameters: Provide as strings like "0.7" for temperature, "1000" for maxTokens
- For outputSchemaJson: Use empty string "" if no schema is needed, or a valid JSON string
  Note: If your schema has type "array" at the root, mention in the prompt that the response should be wrapped in an object with "items" property

The prompt should:
- Be specific and actionable
- Handle edge cases gracefully
- Use the input placeholders correctly ({{input}} for first nodes, {{node_id}} for dependencies)
- Produce output that downstream nodes can consume
- Be optimized for the specified model (${node.model || DEFAULT_MODELS.EXECUTION})

Focus on making the prompt efficient and cost-effective while maintaining quality.`
  }
  
  /**
   * Get JSON schema for asset generation
   */
  private getAssetSchema(includeOutputSchema: boolean) {
    // For OpenAI structured outputs, we need a simpler schema
    // All fields must be in the required array, so we'll make them all strings
    // and handle null/undefined values in the response
    const schema: any = {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'The optimized execution prompt'
        },
        systemPrompt: {
          type: 'string',
          description: 'System prompt for complex instructions (use empty string if not needed)'
        },
        temperature: {
          type: 'string',
          description: 'Temperature parameter as string (e.g. "0.7")'
        },
        maxTokens: {
          type: 'string', 
          description: 'Maximum tokens as string (e.g. "1000")'
        },
        topP: {
          type: 'string',
          description: 'Top-p sampling parameter as string (e.g. "1.0")'
        },
        frequencyPenalty: {
          type: 'string',
          description: 'Frequency penalty as string (e.g. "0")'
        },
        presencePenalty: {
          type: 'string',
          description: 'Presence penalty as string (e.g. "0")'
        }
      },
      required: ['prompt', 'systemPrompt', 'temperature', 'maxTokens', 'topP', 'frequencyPenalty', 'presencePenalty'],
      additionalProperties: false
    }
    
    if (includeOutputSchema) {
      // For outputSchema, we'll use a JSON string representation
      schema.properties.outputSchemaJson = {
        type: 'string',
        description: 'JSON schema as a string (empty string if not needed)'
      }
      schema.required.push('outputSchemaJson')
    }
    
    return schema
  }
  
  /**
   * Calculate total estimated costs for a plan
   */
  calculateTotalEstimates(plan: Plan): { 
    totalCost: number, 
    totalTokens: { prompt: number, completion: number } 
  } {
    let totalCost = 0
    let totalPromptTokens = 0
    let totalCompletionTokens = 0
    
    for (const node of plan.nodes) {
      if (node.asset?.estimatedCost) {
        totalCost += node.asset.estimatedCost
      }
      if (node.asset?.estimatedTokens) {
        totalPromptTokens += node.asset.estimatedTokens.prompt
        totalCompletionTokens += node.asset.estimatedTokens.completion
      }
    }
    
    return {
      totalCost: Math.round(totalCost * 10000) / 10000,
      totalTokens: {
        prompt: totalPromptTokens,
        completion: totalCompletionTokens
      }
    }
  }
}
