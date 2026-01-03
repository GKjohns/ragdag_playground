// API endpoint to get dummy documents for testing
import { dummyDocuments } from '../../data/dummy-documents';

export default defineEventHandler(async (event) => {
  return {
    title: 'The Great Pineapple Crisis of Tropicana Island',
    description: 'A collection of documents about mysterious glowing pineapples that appeared on a fictional island nation. Contains hidden patterns, contradictions, and timeline mysteries to investigate.',
    document_count: dummyDocuments.length,
    date_range: '2024-03-15 to 2024-03-19',
    themes: [
      'Government cover-up vs. transparency',
      'Scientific discovery vs. economic concerns',
      'Ancient wisdom vs. modern science',
      'Fear vs. acceptance progression',
      'Communication attempts from unknown entities'
    ],
    investigative_elements: [
      'Timeline contradictions between official statements',
      'Temperature anomaly patterns (all at 42.7°C)',
      'Frequency patterns (73 Hz, 0.7 Hz, 528 Hz)',
      'Sentiment shift from panic to acceptance',
      'Multiple competing theories about origin',
      'Cover-up attempts by Minister Santos',
      'Indigenous knowledge proving accurate'
    ],
    documents: dummyDocuments
  };
});
