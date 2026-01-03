import { dummyDocuments } from '../../data/dummy-documents'
import type { Document } from '../../utils/docpipe/types'

export default defineEventHandler(async () => {
  // Convert dummy documents to our Document format
  const documents: Document[] = dummyDocuments.map(doc => ({
    id: doc.id,
    content: doc.content,
    metadata: {
      type: doc.type,
      author: doc.author,
      timestamp: doc.timestamp,
      subject: doc.subject || '',
      recipient: doc.recipient || ''
    }
  }))

  return {
    documents,
    count: documents.length,
    description: 'The Great Pineapple Crisis of Tropicana Island - a collection of fictional documents with hidden patterns and investigative elements'
  }
})
