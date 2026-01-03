import type { Artifact, Node } from '../types'
import OpenAI from 'openai'
import { useRuntimeConfig } from '#imports'

export class LLMExecutor {
  private openai: OpenAI | null
  private apiKey: string | undefined
  private isSimulationMode: boolean
  
  constructor() {
    const config = useRuntimeConfig()
    const apiKey = config.openaiApiKey
    
    if (!apiKey || apiKey === 'SIMULATION_MODE') {
      console.warn('OPENAI_API_KEY not found or in simulation mode. Using simulated responses.')
      this.openai = null
      this.apiKey = undefined
      this.isSimulationMode = true
    } else {
      this.openai = new OpenAI({ apiKey })
      this.apiKey = apiKey
      this.isSimulationMode = false
    }
  }
  
  async execute(
    node: Node, 
    inputs: Map<string, Artifact>,
    initialInput?: string
  ): Promise<Artifact> {
    // Build prompt from template
    let prompt = node.promptTemplate
    
    // Replace placeholders with input artifacts
    for (const inputId of node.inputs) {
      const artifact = inputs.get(inputId)
      if (!artifact) {
        throw new Error(`Missing input artifact: ${inputId}`)
      }
      
      const content = typeof artifact.content === 'string' 
        ? artifact.content 
        : JSON.stringify(artifact.content, null, 2)
      
      // Replace all occurrences of {{nodeId}} with the content
      const placeholder = `{{${inputId}}}`
      prompt = prompt.split(placeholder).join(content)
    }
    
    // Replace {{input}} with initial input if provided
    if (initialInput) {
      prompt = prompt.replace(/\{\{input\}\}/g, initialInput)
    }
    
    try {
      let rawContent: string
      let promptTokens: number | undefined
      let completionTokens: number | undefined
      let totalTokens: number | undefined
      
      if (this.isSimulationMode) {
        // Generate simulated response
        rawContent = await this.generateSimulatedResponse(node, prompt, initialInput)
        // Simulate token counts
        promptTokens = Math.floor(prompt.length / 4)
        completionTokens = Math.floor(rawContent.length / 4)
        totalTokens = promptTokens + completionTokens
      } else {
        // Use standard Chat Completions API
        const messages: any[] = []
        
        // Add system message if provided
        if ((node as any).systemPrompt) {
          messages.push({
            role: 'system',
            content: (node as any).systemPrompt
          })
        } else if (node.outputType === 'json') {
          messages.push({
            role: 'system',
            content: 'You must respond with valid JSON only. No additional text or markdown formatting.'
          })
        }
        
        // Add user message
        messages.push({
          role: 'user',
          content: prompt
        })
        
        // Prepare the chat completion parameters
        const completionParams: any = {
          model: node.model || 'gpt-4.1-nano',
          messages: messages
        }
        
        // Add temperature if specified
        if (node.temperature !== undefined) {
          completionParams.temperature = node.temperature
        }
        
        // Add structured output support for JSON
        if (node.outputType === 'json') {
          if ((node as any).jsonSchema) {
            completionParams.response_format = {
              type: 'json_schema',
              json_schema: {
                name: 'response',
                strict: true,
                schema: (node as any).jsonSchema
              }
            }
          } else {
            completionParams.response_format = { type: 'json_object' }
          }
        }
        
        // Call OpenAI Chat Completions API
        const response = await this.openai!.chat.completions.create(completionParams)
        
        rawContent = response.choices[0]?.message?.content || ''
        promptTokens = response.usage?.prompt_tokens
        completionTokens = response.usage?.completion_tokens
        totalTokens = response.usage?.total_tokens
      }
      
      // Parse content based on output type
      let content: string | any = rawContent
      if (node.outputType === 'json') {
        try {
          content = JSON.parse(rawContent)
          
          // If the schema was wrapped for OpenAI compatibility, unwrap the response
          const schema = (node as any).jsonSchema
          if (schema && schema.type === 'object') {
            // Check if this was a wrapped array schema
            if (schema.properties?.items && Object.keys(schema.properties).length === 1) {
              content = content.items
              console.log(`Unwrapped array response for node ${node.id}`)
            }
            // Check if this was a wrapped primitive schema
            else if (schema.properties?.value && Object.keys(schema.properties).length === 1) {
              content = content.value
              console.log(`Unwrapped value response for node ${node.id}`)
            }
          }
        } catch (e) {
          console.error(`Failed to parse JSON from node ${node.id}:`, rawContent)
          throw new Error(`Failed to parse JSON response from ${node.id}: ${e}`)
        }
      }
      
      return {
        type: node.outputType,
        content,
        metadata: {
          nodeId: node.id,
          model: this.isSimulationMode ? 'simulation' : (node.model || 'gpt-4.1-nano'),
          promptTokens,
          completionTokens,
          totalTokens,
          timestamp: Date.now()
        }
      }
    } catch (error) {
      console.error(`Error executing node ${node.id}:`, error)
      throw new Error(`Failed to execute node ${node.id}: ${error}`)
    }
  }
  
  private async generateSimulatedResponse(
    node: Node, 
    prompt: string, 
    initialInput?: string
  ): Promise<string> {
    // Simulate different types of responses based on the node ID and prompt
    
    // Special handling for the planner node
    if (node.id === '__planner__') {
      // Extract goal from prompt
      const goalMatch = prompt.match(/goal[:\s]+"([^"]+)"/i) || prompt.match(/goal[:\s]+([^\n]+)/i)
      const goal = goalMatch ? goalMatch[1] : 'Analyze data and provide insights'
      
      // Generate a realistic plan based on the goal
      const plan = this.generateSimulatedPlan(goal)
      return JSON.stringify(plan, null, 2)
    }
    
    // For other nodes, generate contextual responses
    if (node.outputType === 'json') {
      // Generate appropriate JSON based on node description
      if (node.description.toLowerCase().includes('extract')) {
        return JSON.stringify({
          themes: [
            { name: 'Performance', sentiment: 'positive', examples: ['Fast response', 'Quick loading'], count: 15 },
            { name: 'UI Design', sentiment: 'negative', examples: ['Confusing layout', 'Hard to navigate'], count: 8 },
            { name: 'Features', sentiment: 'neutral', examples: ['More options needed', 'Good but could be better'], count: 12 }
          ]
        })
      } else if (node.description.toLowerCase().includes('analyze')) {
        return JSON.stringify({
          analysis: {
            summary: 'The data shows mixed sentiment with positive performance feedback but UI concerns.',
            key_findings: [
              'Users appreciate the speed and performance',
              'Navigation and UI need improvement',
              'Feature requests indicate engaged user base'
            ],
            metrics: {
              positive_ratio: 0.45,
              negative_ratio: 0.25,
              neutral_ratio: 0.30
            }
          }
        })
      } else {
        return JSON.stringify({
          result: 'Simulated JSON response',
          status: 'success',
          data: {
            processed: true,
            timestamp: Date.now()
          }
        })
      }
    } else {
      // Generate text responses based on node description
      if (node.description.toLowerCase().includes('summarize')) {
        return `## Executive Summary\n\nBased on the analysis, here are the key findings:\n\n1. **Positive Aspects**: Users consistently praise the application's performance and speed.\n\n2. **Areas for Improvement**: The user interface needs refinement, particularly in navigation and layout clarity.\n\n3. **Opportunities**: User engagement is high, with many constructive feature requests indicating an invested user base.\n\n### Recommendations\n- Prioritize UI/UX improvements in the next sprint\n- Maintain current performance standards\n- Create a roadmap for requested features`
      } else if (node.description.toLowerCase().includes('prioritize')) {
        return `### Priority List\n\n1. **High Priority**: Fix navigation issues (Impact: High, Effort: Medium)\n2. **Medium Priority**: Improve visual hierarchy (Impact: Medium, Effort: Low)\n3. **Low Priority**: Add advanced features (Impact: Low, Effort: High)\n\nFocus on quick wins in UI improvements while planning for longer-term feature additions.`
      } else if (node.description.toLowerCase().includes('action')) {
        return `### Action Plan\n\n**Immediate Actions (This Week)**\n- Conduct UI/UX audit\n- Create navigation improvement mockups\n- Gather more specific user feedback\n\n**Short-term (Next Month)**\n- Implement navigation fixes\n- A/B test new UI elements\n- Release incremental improvements\n\n**Long-term (Quarter)**\n- Full UI refresh based on learnings\n- Develop and release top requested features\n- Establish regular user feedback cycles`
      } else {
        // Generic text response
        const contextInfo = initialInput ? `regarding: "${initialInput?.substring(0, 100)}..."` : ''
        return `This is a simulated response for ${node.description} ${contextInfo}\n\nThe analysis shows interesting patterns that warrant further investigation. Key observations include variability in the data and several notable trends that align with expected outcomes.`
      }
    }
  }
  
  private generateSimulatedPlan(goal: string): any {
    // Generate a realistic plan structure based on the goal
    const goalLower = goal.toLowerCase()
    
    // Determine the type of plan based on keywords in the goal
    if (goalLower.includes('customer') || goalLower.includes('feedback')) {
      return {
        goal,
        nodes: [
          {
            id: 'extract_themes',
            description: 'Extract main themes and patterns from customer feedback',
            inputs: [],
            promptTemplate: 'Analyze the following customer feedback and extract key themes, sentiments, and patterns:\n\n{{input}}\n\nReturn as JSON with themes, sentiment analysis, and frequency counts.',
            outputType: 'json',
            model: 'gpt-4.1-nano'
          },
          {
            id: 'prioritize_issues',
            description: 'Prioritize issues based on impact and frequency',
            inputs: ['extract_themes'],
            promptTemplate: 'Based on these extracted themes:\n{{extract_themes}}\n\nPrioritize the issues by business impact, considering frequency, severity, and ease of resolution.',
            outputType: 'text',
            model: 'gpt-4.1-nano'
          },
          {
            id: 'generate_recommendations',
            description: 'Generate actionable recommendations',
            inputs: ['prioritize_issues'],
            promptTemplate: 'Based on these prioritized issues:\n{{prioritize_issues}}\n\nGenerate specific, actionable recommendations with timeline and resource estimates.',
            outputType: 'text',
            model: 'gpt-4.1-mini'
          },
          {
            id: 'create_report',
            description: 'Create comprehensive report with executive summary',
            inputs: ['extract_themes', 'generate_recommendations'],
            promptTemplate: 'Create an executive report combining:\n\nThemes and data:\n{{extract_themes}}\n\nRecommendations:\n{{generate_recommendations}}\n\nFormat as a professional report with summary, findings, and action items.',
            outputType: 'text',
            model: 'gpt-4.1-mini'
          }
        ],
        finalOutput: 'create_report'
      }
    } else if (goalLower.includes('analyz') || goalLower.includes('data')) {
      return {
        goal,
        nodes: [
          {
            id: 'initial_analysis',
            description: 'Perform initial data analysis and identify patterns',
            inputs: [],
            promptTemplate: 'Analyze the following data and identify key patterns, trends, and anomalies:\n\n{{input}}\n\nProvide a structured analysis.',
            outputType: 'text',
            model: 'gpt-4.1-nano'
          },
          {
            id: 'deep_insights',
            description: 'Extract deeper insights and correlations',
            inputs: ['initial_analysis'],
            promptTemplate: 'Based on this initial analysis:\n{{initial_analysis}}\n\nIdentify deeper insights, correlations, and potential causations. Consider business implications.',
            outputType: 'text',
            model: 'gpt-4.1'
          },
          {
            id: 'recommendations',
            description: 'Generate strategic recommendations',
            inputs: ['deep_insights'],
            promptTemplate: 'Based on these insights:\n{{deep_insights}}\n\nProvide strategic recommendations with clear action items and expected outcomes.',
            outputType: 'text',
            model: 'gpt-4.1-mini'
          },
          {
            id: 'final_summary',
            description: 'Create executive summary',
            inputs: ['initial_analysis', 'recommendations'],
            promptTemplate: 'Create a concise executive summary combining:\n\nAnalysis:\n{{initial_analysis}}\n\nRecommendations:\n{{recommendations}}\n\nFocus on key findings and top 3-5 action items.',
            outputType: 'text',
            model: 'gpt-4.1-mini'
          }
        ],
        finalOutput: 'final_summary'
      }
    } else {
      // Generic plan for other types of goals
      return {
        goal,
        nodes: [
          {
            id: 'understand_context',
            description: 'Understand and analyze the input context',
            inputs: [],
            promptTemplate: `Analyze the following input in the context of: "${goal}"\n\n{{input}}\n\nProvide a comprehensive understanding of the key elements.`,
            outputType: 'text',
            model: 'gpt-4.1-nano'
          },
          {
            id: 'process_information',
            description: 'Process and structure the information',
            inputs: ['understand_context'],
            promptTemplate: 'Based on this context:\n{{understand_context}}\n\nProcess and structure the information to address the goal. Identify key points and relationships.',
            outputType: 'text',
            model: 'gpt-4.1-nano'
          },
          {
            id: 'generate_output',
            description: 'Generate final output addressing the goal',
            inputs: ['process_information'],
            promptTemplate: `Based on the processed information:\n{{process_information}}\n\nGenerate a comprehensive response that fully addresses: "${goal}"`,
            outputType: 'text',
            model: 'gpt-4.1-mini'
          }
        ],
        finalOutput: 'generate_output'
      }
    }
  }
}