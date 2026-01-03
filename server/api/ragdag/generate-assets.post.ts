import { AssetGenerator } from '../../utils/ragdag/assetGenerator'
import type { GenerateAssetsRequest, GenerateAssetsResponse } from '../../utils/ragdag/types'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody<GenerateAssetsRequest>(event)
    
    if (!body.plan) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Plan is required'
      })
    }
    
    // Initialize asset generator
    const generator = new AssetGenerator()
    
    // Generate assets for all nodes
    console.log('Generating assets for plan:', body.plan.goal)
    const updatedPlan = await generator.generateAssets(
      body.plan,
      body.sampleInput
    )
    
    // Calculate total estimates
    const estimates = generator.calculateTotalEstimates(updatedPlan)
    
    const response: GenerateAssetsResponse = {
      plan: updatedPlan,
      totalEstimatedCost: estimates.totalCost,
      totalEstimatedTokens: estimates.totalTokens
    }
    
    return response
  } catch (error: any) {
    console.error('Asset generation error:', error)
    
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Failed to generate assets'
    })
  }
})
