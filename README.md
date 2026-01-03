# RagDAG Playground

**An experimental framework for orchestrating multi-step LLM reasoning as executable DAGs.**

> **Status: Half-baked and experimental.** This is a playground for exploring ideas around LLM orchestration. Things are rough, APIs will change, and there's plenty that doesn't work yet. That said, the core idea is promising and contributions are very welcome.

## What is this?

RagDAG is an attempt to solve a common problem: complex tasks often require multiple LLM calls that build on each other. Instead of writing brittle, imperative chains of prompts, what if you could:

1. **Describe your goal in natural language**
2. **Let an LLM generate an execution plan** (a DAG of dependent operations)
3. **Execute nodes in parallel** where possible, with full observability
4. **Get structured results** with provenance tracking

The "DAG" part is key—by modeling the work as a directed acyclic graph, we can identify independent operations that can run in parallel, track exactly how each result was derived, and potentially optimize/cache intermediate results.

## Quick Example

```
Goal: "Analyze customer feedback to identify top issues and suggest improvements"

Generated Plan:
┌─────────────────┐
│ extract_themes  │ ← First pass: pull out recurring topics
└────────┬────────┘
         │
┌────────▼────────┐
│ sentiment_analysis │ ← Assess sentiment per theme
└────────┬────────┘
         │
┌────────▼────────┐
│ prioritize      │ ← Rank by frequency + negativity
└────────┬────────┘
         │
┌────────▼────────┐
│ recommendations │ ← Generate actionable suggestions
└─────────────────┘
```

Each node is an LLM call with a prompt template that can reference outputs from upstream nodes.

## Running It

```bash
pnpm install
pnpm dev
```

Then open `http://localhost:3000`. You'll need an OpenAI API key in your `.env`:

```
OPENAI_API_KEY=sk-...
```

## The Vision

This playground is exploring a few ideas:

**1. Plans as first-class artifacts**
The execution plan itself is a structured object you can inspect, modify, save, and replay. This opens the door to plan optimization, caching, and human-in-the-loop approval before expensive operations run.

**2. Smart executor routing**
Not every node needs GPT-4. A well-designed system could automatically route simple extraction tasks to smaller/cheaper models and reserve the heavy hitters for complex reasoning.

**3. Hybrid execution**
Some operations don't need an LLM at all—embedding lookups, regex extraction, Python data transforms. The node abstraction could support multiple executor types with the planner choosing the right tool for each job.

**4. Cost and latency awareness**
By modeling the full execution graph upfront, you can estimate costs before running, identify bottlenecks, and make informed tradeoffs.

**5. Observability by default**
Every node produces an artifact with metadata: which model, how many tokens, what the actual prompt was. Debug complex pipelines by inspecting the full trace.

## What Works (Mostly)

- Natural language → DAG plan generation
- Sequential and parallel node execution
- Basic UI for visualizing plans and results
- Structured JSON outputs with schema validation
- Token/cost tracking per node

## What Doesn't (Yet)

- Non-LLM executors (embeddings, code execution)
- Plan caching and replay
- Streaming responses
- Robust error handling and retries
- Plan optimization passes
- The UI is... functional

## Contributing

This is a playground—poke around, break things, try wild ideas. If you're interested in:

- Adding new executor types
- Improving the planner's plan quality
- Building better visualization
- Exploring plan optimization strategies
- Making the architecture cleaner

...open an issue or PR. No contribution is too small, and half-baked ideas are on-brand here.

## Tech Stack

- **Nuxt 3** - Full-stack framework
- **Vue 3** - Reactive UI
- **TypeScript** - Type safety
- **OpenAI API** - LLM execution
- **Tailwind CSS** - Styling

## License

MIT - do whatever you want with it.
