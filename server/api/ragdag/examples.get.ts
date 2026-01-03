// API endpoint to get example goals and plans
import { dummyDocuments } from '../../data/dummy-documents';

export default defineEventHandler(async (event) => {
  const examples = [
    {
      id: 'pineapple-crisis',
      title: '🍍 Pineapple Crisis Investigation',
      description: 'Investigate the Great Pineapple Crisis using 15 real documents',
      goal: 'Analyze all documents about the Tropicana Island pineapple crisis to find contradictions between official statements, identify the timeline of events, and uncover what the government was trying to hide',
      sample_inputs: {
        messages: dummyDocuments.map(doc => ({
          id: doc.id,
          text: doc.content,
          timestamp: doc.timestamp,
          author: doc.author,
          type: doc.type,
          subject: doc.subject
        }))
      },
      is_featured: true,
      tags: ['investigation', 'timeline', 'contradictions', 'sentiment']
    },
    {
      id: 'contradiction-detection',
      title: 'Find Contradictions',
      description: 'Analyze messages to find contradictory statements',
      goal: 'Find all contradictions and inconsistencies in the text messages about childcare arrangements',
      sample_inputs: {
        messages: [
          { id: 1, text: "I picked up the kids at 3pm from school", timestamp: "2024-01-15 15:00" },
          { id: 2, text: "I was in a meeting until 5pm that day", timestamp: "2024-01-15 17:30" },
          { id: 3, text: "The school called me at 3:15 saying no one picked up the children", timestamp: "2024-01-15 15:20" }
        ]
      }
    },
    {
      id: 'sentiment-analysis',
      title: 'Sentiment Timeline',
      description: 'Track emotional sentiment over time',
      goal: 'Analyze sentiment patterns and identify when conversations became angry or hostile',
      sample_inputs: {
        messages: [
          { id: 1, text: "Sure, that works for me", timestamp: "2024-01-01 10:00" },
          { id: 2, text: "I'm getting frustrated with these constant changes", timestamp: "2024-01-08 14:00" },
          { id: 3, text: "This is completely unacceptable!", timestamp: "2024-01-15 16:00" }
        ]
      }
    },
    {
      id: 'topic-clustering',
      title: 'Topic Analysis',
      description: 'Group messages by topic and theme',
      goal: 'Cluster messages into topics and identify the main themes of discussion',
      sample_inputs: {
        messages: [
          { id: 1, text: "Can you pick up groceries on your way home?" },
          { id: 2, text: "The kids have soccer practice at 4pm" },
          { id: 3, text: "We need to discuss the budget for next month" },
          { id: 4, text: "Don't forget parent-teacher conference tomorrow" }
        ]
      }
    },
    {
      id: 'timeline-reconstruction',
      title: 'Event Timeline',
      description: 'Reconstruct chronological sequence of events',
      goal: 'Create a timeline of events and identify any temporal conflicts',
      sample_inputs: {
        messages: [
          { id: 1, text: "Doctor appointment is at 2pm on Tuesday" },
          { id: 2, text: "I have a work meeting Tuesday afternoon" },
          { id: 3, text: "Kids need to be picked up at 3:30 on Tuesday" }
        ]
      }
    },
    {
      id: 'pattern-detection',
      title: 'Behavioral Patterns',
      description: 'Identify patterns in communication',
      goal: 'Find patterns in communication style, response times, and recurring issues',
      sample_inputs: {
        text: "Analyze the provided messages for behavioral patterns and communication styles"
      }
    }
  ];
  
  return {
    examples,
    total: examples.length
  };
});
