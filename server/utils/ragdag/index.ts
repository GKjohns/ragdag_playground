// Main export file for RagDAG
export * from './types'
export * from './processor'
export * from './planner'

// Minimal executor registry for the simplified LLM-only version
export class ExecutorRegistry {
  private executors: Set<string>

  constructor() {
    this.executors = new Set(['llm'])
  }

  register(name: string) {
    if (name) {
      this.executors.add(name)
    }
  }

  list(): string[] {
    return Array.from(this.executors)
  }

  has(name: string): boolean {
    return this.executors.has(name)
  }
}

export const globalRegistry = new ExecutorRegistry()
