import { defineEventHandler } from 'h3'
import { useRuntimeConfig } from '#imports'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const apiKey = config.openaiApiKey || process.env.OPENAI_API_KEY
  
  // Check if we have a real API key (not empty and not simulation mode)
  const hasApiKey = !!(apiKey && apiKey !== '' && apiKey !== 'SIMULATION_MODE')
  
  return {
    hasApiKey,
    mode: hasApiKey ? 'active' : 'simulation'
  }
})


