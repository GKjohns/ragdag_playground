# RagDAG Playground - Simplified Prototype

## Overview

This is a simplified prototype of the RagDAG (Retrieval-Augmented Generation Directed Acyclic Graph) system. It demonstrates the core concepts of intelligent reasoning pipelines that blend LLM reasoning with deterministic computation.

## Features Implemented

### Backend Infrastructure
- **Artifacts**: Typed data objects (text, json, table, image, vector) that flow between nodes
- **Nodes**: Abstract intent specifications that define what needs to be done
- **Executors**: Pluggable backends for different types of computation:
  - **LLM Executor**: For reasoning and text generation tasks
  - **Python Executor**: For data processing and visualization
  - **Embedding Executor**: For vector operations and similarity search
- **Processor**: DAG execution engine with async parallel processing
- **Planner**: Converts natural language goals into executable DAG plans

### API Endpoints
- `POST /api/ragdag/generate-plan` - Generate a plan from a natural language goal
- `POST /api/ragdag/execute-plan` - Execute a generated plan
- `GET /api/ragdag/executors` - List available executors
- `GET /api/ragdag/examples` - Get example goals and plans

### UI Components
- Goal input with natural language processing
- Visual DAG plan representation
- Real-time execution monitoring
- Results display with artifact visualization
- Example scenarios for quick testing

## How to Use

1. **Start the server**: The application should be running on `http://localhost:3000`

2. **Try an example**:
   - Click one of the example buttons (e.g., "Find Contradictions", "Sentiment Timeline")
   - This will load a pre-configured goal and sample data

3. **Generate a plan**:
   - Click "Generate Plan" to see how the system breaks down your goal into executable steps
   - The middle panel will show the DAG with nodes and their connections

4. **Execute the plan**:
   - Click "Execute Plan" to run the generated workflow
   - Watch as results appear in the right panel

## Example Scenarios

### 1. Contradiction Detection
Analyzes messages to find contradictory statements about timing and events.

### 2. Sentiment Analysis
Tracks emotional sentiment over time and identifies patterns.

### 3. Topic Clustering
Groups messages by topic and identifies main themes of discussion.

### 4. Timeline Reconstruction
Creates a chronological sequence of events and identifies temporal conflicts.

## Technical Architecture

```
Goal (Natural Language)
    ↓
[Planner] → Plan (DAG JSON)
    ↓
[Processor] → Parallel Execution
    ↓
[Executors] → LLM / Python / Embedding
    ↓
Artifacts → Results with Full Provenance
```

## Key Innovations

1. **Abstract Intent Nodes**: Define what you want, not how to do it
2. **Smart Routing**: Automatically chooses the most efficient executor
3. **Cost Optimization**: Reduces API costs through intelligent planning
4. **Full Observability**: Track every step, transformation, and cost
5. **Parallel Processing**: Executes independent nodes simultaneously

## Limitations (Demo Version)

- Mock LLM responses (no actual API calls)
- Simplified embedding operations
- Limited Python functions
- Basic visualization (no actual charts rendered)
- No persistent storage

## Future Enhancements

For a production version, consider:
- Real LLM integration (OpenAI, Anthropic, etc.)
- Actual embedding models
- Full Python computation with pandas/matplotlib
- WebSocket support for real-time updates
- Result caching and persistence
- Advanced plan optimization
- Human-in-the-loop approval steps

## Development Notes

The system is built with:
- **Nuxt 3** for the full-stack framework
- **Nitro** for the server backend
- **Vue 3** for reactive UI
- **TypeScript** for type safety
- **Tailwind CSS** for styling

All code is modular and extensible, making it easy to add new executors, node types, and optimization strategies.
