/**
 * Common helpers for API endpoints
 */

import { defineEventHandler, readBody, createError, H3Event } from 'h3'
import type { Plan } from './types'

/**
 * Wrapper for API handlers with consistent error handling
 */
export function defineApiHandler<TBody = any, TResult = any>(
  handler: (body: TBody, event: H3Event) => Promise<TResult>
) {
  return defineEventHandler(async (event) => {
    try {
      const body = await readBody<TBody>(event)
      const result = await handler(body, event)
      
      return {
        success: true,
        ...result
      }
    } catch (error: any) {
      console.error('API Error:', error)
      
      // If it's already an H3 error, re-throw it
      if (error.statusCode) {
        throw error
      }
      
      // Otherwise create a generic 500 error
      throw createError({
        statusCode: 500,
        statusMessage: error.message || 'Internal server error'
      })
    }
  })
}

/**
 * Validate required fields in request body
 */
export function validateRequired<T extends Record<string, any>>(
  body: T,
  required: (keyof T)[]
): void {
  for (const field of required) {
    if (!body[field]) {
      throw createError({
        statusCode: 400,
        statusMessage: `${String(field)} is required`
      })
    }
  }
}

/**
 * Validate plan structure
 */
export function validatePlanStructure(plan: Plan): void {
  if (!plan || typeof plan !== 'object') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Plan must be a valid object'
    })
  }
  
  if (!Array.isArray(plan.nodes) || plan.nodes.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Plan must have at least one node'
    })
  }
  
  if (!plan.finalOutput) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Plan must specify a final output node'
    })
  }
  
  // Check that final output exists
  const nodeIds = new Set(plan.nodes.map(n => n.id))
  if (!nodeIds.has(plan.finalOutput)) {
    throw createError({
      statusCode: 400,
      statusMessage: `Final output node '${plan.finalOutput}' not found in plan`
    })
  }
}

/**
 * Setup Server-Sent Events response
 */
export function setupSSE(event: H3Event): void {
  event.node.res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no' // Disable Nginx buffering
  })
}

/**
 * Send SSE message
 */
export function sendSSEMessage(
  res: any,
  type: string,
  data: any
): void {
  const message = JSON.stringify({ type, data })
  res.write(`data: ${message}\n\n`)
}

/**
 * Close SSE connection
 */
export function closeSSE(res: any): void {
  res.end()
}
