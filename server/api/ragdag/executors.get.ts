// API endpoint to list available executors
import { globalRegistry } from '../../utils/ragdag';

export default defineEventHandler(async (event) => {
  const executors = globalRegistry.list();
  
  // Provide detailed information about each executor
  const executorInfo = executors.map(name => {
    let description = '';
    let capabilities = [];
    
    switch (name) {
      case 'llm':
        description = 'Language Model executor for reasoning and text generation tasks';
        capabilities = [
          'Extract information from text',
          'Classify and categorize content',
          'Summarize findings',
          'Identify contradictions',
          'Generate reports'
        ];
        break;
      case 'python':
        description = 'Python executor for computational and data processing tasks';
        capabilities = [
          'Convert data to tabular format',
          'Generate visualizations and charts',
          'Compute statistics',
          'Filter and transform data',
          'Cluster messages'
        ];
        break;
      case 'embedding':
        description = 'Embedding executor for vector operations and similarity search';
        capabilities = [
          'Convert text to embeddings',
          'Compute similarity scores',
          'Perform clustering',
          'Semantic search',
          'Find similar content'
        ];
        break;
    }
    
    return {
      name,
      description,
      capabilities
    };
  });
  
  return {
    executors: executorInfo,
    total: executors.length
  };
});
