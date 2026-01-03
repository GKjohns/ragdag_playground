import type { Plan, Node } from './types'
import { LLMExecutor } from './executors/llm'
import { DEFAULT_MODELS, MODELS } from './constants'

export class Planner {
  private executor: LLMExecutor
  
  constructor() {
    this.executor = new LLMExecutor()
  }
  
  // Define the JSON schema for a RAGDAG plan
  private getPlanSchema() {
    return {
      type: 'object',
      properties: {
        goal: {
          type: 'string',
          description: 'The original goal provided by the user'
        },
        nodes: {
          type: 'array',
          description: 'Array of execution nodes in the DAG',
          items: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Unique snake_case identifier for the node'
              },
              description: {
                type: 'string',
                description: 'Clear description of what this step does'
              },
              inputs: {
                type: 'array',
                description: 'Array of node IDs this node depends on',
                items: {
                  type: 'string'
                }
              },
              promptTemplate: {
                type: 'string',
                description: 'The prompt template with {{placeholders}} for inputs'
              },
              outputType: {
                type: 'string',
                enum: ['text', 'json'],
                description: 'The expected output format'
              },
              model: {
                type: 'string',
                enum: [MODELS.GPT_41, MODELS.GPT_41_MINI, MODELS.GPT_41_NANO],
                description: 'The model to use for this node'
              }
            },
            required: ['id', 'description', 'inputs', 'promptTemplate', 'outputType', 'model'],
            additionalProperties: false
          }
        },
        finalOutput: {
          type: 'string',
          description: 'The ID of the node that produces the final result'
        }
      },
      required: ['goal', 'nodes', 'finalOutput'],
      additionalProperties: false
    }
  }
  
  async createPlan(goal: string): Promise<Plan> {
    const systemPrompt = `You are an expert task planner that breaks down complex goals into a sequence of LLM operations.
You create Directed Acyclic Graphs (DAGs) where each node represents a specific LLM task.

Important rules for creating plans:
1. Break the goal into 2-5 logical, focused steps
2. The first node should have an empty inputs array and use {{input}} to reference user data
3. Subsequent nodes reference previous node IDs in their inputs array and use {{node_id}} in prompts
4. Each node should perform ONE clear, focused task
5. Use "json" outputType when you need structured data for downstream processing
6. Use descriptive node IDs like "extract_themes", "prioritize_issues", "generate_summary"
7. The finalOutput should be the ID of the node that produces the final result
8. Keep prompts clear, specific, and actionable

Example patterns:
- For analysis: extract → categorize → prioritize → summarize
- For feedback: identify_themes → sentiment_analysis → recommendations → action_plan
- For research: gather_facts → analyze_relationships → draw_conclusions → create_report`

    const userPrompt = `Create a DAG execution plan for this goal: "${goal}"

Provide a plan that:
- Breaks down the goal into logical steps
- Each step builds on previous results
- Uses appropriate output types (text or json) based on the task
- Ends with a comprehensive result addressing the original goal`

    const plannerNode: Node = {
      id: '__planner__',
      description: 'Generate execution plan',
      inputs: [],
      promptTemplate: userPrompt,
      outputType: 'json',
      model: DEFAULT_MODELS.PLANNING,
      temperature: 0.7,
      jsonSchema: this.getPlanSchema(),
      systemPrompt
    } as Node
    
    try {
      const result = await this.executor.execute(plannerNode, new Map(), '')
      const plan = result.content as Plan
      
      // Validate the plan structure
      this.validatePlan(plan)
      
      // Ensure all nodes have a model specified
      plan.nodes = plan.nodes.map(node => ({
        ...node,
        model: node.model || DEFAULT_MODELS.EXECUTION
      }))
      
      return plan
    } catch (error) {
      console.error('Failed to generate plan:', error)
      
      // Return a fallback simple plan
      return this.createFallbackPlan(goal)
    }
  }
  
  private validatePlan(plan: any): void {
    if (!plan || typeof plan !== 'object') {
      throw new Error('Plan must be an object')
    }
    
    if (!plan.goal || typeof plan.goal !== 'string') {
      throw new Error('Plan must have a goal string')
    }
    
    if (!Array.isArray(plan.nodes) || plan.nodes.length === 0) {
      throw new Error('Plan must have a non-empty nodes array')
    }
    
    if (!plan.finalOutput || typeof plan.finalOutput !== 'string') {
      throw new Error('Plan must have a finalOutput string')
    }
    
    // Validate each node
    const nodeIds = new Set<string>()
    for (const node of plan.nodes) {
      if (!node.id || !node.description || !node.promptTemplate || !node.outputType) {
        throw new Error(`Invalid node structure: ${JSON.stringify(node)}`)
      }
      
      if (nodeIds.has(node.id)) {
        throw new Error(`Duplicate node ID: ${node.id}`)
      }
      nodeIds.add(node.id)
      
      if (!Array.isArray(node.inputs)) {
        throw new Error(`Node ${node.id} must have an inputs array`)
      }
      
      // Check that input references exist (except for first nodes)
      for (const input of node.inputs) {
        if (!nodeIds.has(input)) {
          throw new Error(`Node ${node.id} references non-existent input: ${input}`)
        }
      }
    }
    
    // Check that finalOutput exists
    if (!nodeIds.has(plan.finalOutput)) {
      throw new Error(`Final output references non-existent node: ${plan.finalOutput}`)
    }
  }
  
  private createFallbackPlan(goal: string): Plan {
    // Simple fallback plan that just analyzes and summarizes
    return {
      goal,
      nodes: [
        {
          id: 'analyze',
          description: 'Analyze the input data',
          inputs: [],
          promptTemplate: `Please analyze the following input and identify key points, patterns, or insights:\n\n{{input}}\n\nProvide a thorough analysis.`,
          outputType: 'text',
          model: DEFAULT_MODELS.EXECUTION
        },
        {
          id: 'summarize',
          description: 'Create a summary',
          inputs: ['analyze'],
          promptTemplate: `Based on this analysis:\n\n{{analyze}}\n\nCreate a concise summary that addresses the goal: "${goal}"`,
          outputType: 'text',
          model: MODELS.GPT_41_MINI
        }
      ],
      finalOutput: 'summarize'
    }
  }
}