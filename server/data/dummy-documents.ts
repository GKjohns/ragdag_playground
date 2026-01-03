// Dummy documents for testing RagDAG - The Great Pineapple Crisis of Tropicana Island
// A completely fictional event with hidden patterns, contradictions, and investigative elements

export interface Document {
  id: string;
  type: 'email' | 'memo' | 'news' | 'social' | 'transcript' | 'report';
  author: string;
  recipient?: string;
  timestamp: string;
  subject?: string;
  content: string;
  metadata?: Record<string, any>;
}

export const dummyDocuments: Document[] = [
  // Day 1 - The Discovery
  {
    id: 'doc_001',
    type: 'report',
    author: 'Dr. Marina Flores',
    timestamp: '2024-03-15T08:30:00Z',
    subject: 'Urgent: Anomalous Pineapple Behavior Observed',
    content: `Initial observations at the Tropicana Agricultural Research Station indicate unprecedented behavior in our pineapple crops. At approximately 06:00 this morning, field workers reported that several pineapples in Sector 7 appeared to be glowing with a faint purple luminescence. Upon closer inspection, these specimens were found to be approximately 15°C warmer than ambient temperature. No changes in soil composition or irrigation have been made. Requesting immediate investigation team.`
  },
  {
    id: 'doc_002',
    type: 'email',
    author: 'Minister Jorge Santos',
    recipient: 'President Maria Rodriguez',
    timestamp: '2024-03-15T10:15:00Z',
    subject: 'RE: Agricultural Station Report',
    content: `Madam President, I've reviewed Dr. Flores' report. This appears to be an isolated incident, likely caused by a fungal infection. I recommend we keep this quiet to avoid market panic. Our pineapple exports represent 47% of GDP. Let's handle this internally.`
  },
  {
    id: 'doc_003',
    type: 'social',
    author: '@IslandLife22',
    timestamp: '2024-03-15T11:45:00Z',
    content: `Anyone else see those weird purple lights in the pineapple fields last night? My cousin works at the plantation and says the government trucks showed up at dawn... 🍍👀 #TropicanaIsland #WhatAreTheyHiding`
  },

  // Day 2 - Escalation
  {
    id: 'doc_004',
    type: 'news',
    author: 'Tropicana Daily Herald',
    timestamp: '2024-03-16T07:00:00Z',
    subject: 'Government Denies "Glowing Pineapple" Rumors',
    content: `The Ministry of Agriculture yesterday dismissed social media reports of unusual activity at pineapple plantations across the island. Minister Santos stated, "These are baseless rumors. Our agricultural sector remains strong and productive." However, multiple witnesses claim to have seen military vehicles near the Research Station. Local farmer Roberto Chen told reporters, "I've grown pineapples for 30 years. What I saw yesterday... those weren't normal pineapples."`
  },
  {
    id: 'doc_005',
    type: 'memo',
    author: 'General Patricia Vega',
    timestamp: '2024-03-16T09:30:00Z',
    subject: 'CLASSIFIED: Operation Golden Crown',
    content: `All units are to maintain perimeter around affected zones. No civilians permitted within 2km radius. Cover story: routine agricultural inspection. Reality: 37 specimens now showing anomalous properties. Temperature readings averaging 42°C. Three specimens have begun emitting low-frequency humming (73 Hz). Dr. Flores' team reports the affected pineapples are growing at 300% normal rate. Containment is priority one.`
  },
  {
    id: 'doc_006',
    type: 'email',
    author: 'Dr. James Wellington',
    recipient: 'Dr. Marina Flores',
    timestamp: '2024-03-16T14:20:00Z',
    subject: 'Soil Sample Analysis',
    content: `Marina, the results are... impossible. The soil samples from Sector 7 contain isotopes that don't match any known terrestrial composition. Silicon-30 levels are 400% above normal. More disturbing: we found traces of element 113 (Nihonium), which should decay in milliseconds. Yet it's stable. This isn't agricultural contamination. Where did these pineapples come from?`
  },

  // Day 3 - The Revelation
  {
    id: 'doc_007',
    type: 'social',
    author: '@ScienceNerd99',
    timestamp: '2024-03-17T06:30:00Z',
    content: `BREAKING: Leaked photo from inside the quarantine zone! The pineapples are MOVING. They're literally pulsing like they're breathing! My source says the government is calling in international experts. This is bigger than they're telling us! 🍍😱 [PHOTO REMOVED BY MODERATORS]`
  },
  {
    id: 'doc_008',
    type: 'transcript',
    author: 'Emergency Cabinet Meeting',
    timestamp: '2024-03-17T10:00:00Z',
    subject: 'Transcript: Emergency Session 17-03-2024',
    content: `PRESIDENT RODRIGUEZ: How many are affected now?
DR. FLORES: 147 specimens across three plantations.
MINISTER SANTOS: Madam President, I must object to Dr. Flores' alarmist—
GENERAL VEGA: [INTERRUPTING] With respect, Minister, we're past denials. Satellite imagery shows heat signatures spreading. 
DR. FLORES: The growth rate is exponential. At current progression, the entire eastern plantation will be affected within 72 hours.
PRESIDENT RODRIGUEZ: Options?
DR. WELLINGTON: We could try freezing them. Preliminary tests show activity stops below -20°C.
MINISTER SANTOS: Do you realize what this will do to our economy? We export 2 million tons annually!
GENERAL VEGA: Better than whatever these things become if we don't stop them.
[CLASSIFIED PORTION REDACTED]
PRESIDENT RODRIGUEZ: Implement Protocol Seven. God help us all.`
  },
  {
    id: 'doc_009',
    type: 'email',
    author: 'Anonymous Whistleblower',
    recipient: 'Tropicana Daily Herald',
    timestamp: '2024-03-17T15:45:00Z',
    subject: 'The Truth About the Pineapples',
    content: `I work at the Research Station. What the government isn't telling you: these pineapples appeared overnight on March 14th. They weren't planted. They just... were there. Dr. Flores found symbols carved into their cores - symbols that match carvings found in the ancient caves on the north shore, the ones that predate human settlement by 10,000 years. The pineapples aren't infected or contaminated. They're returning.`
  },

  // Day 4 - The Crisis
  {
    id: 'doc_010',
    type: 'news',
    author: 'International Press Agency',
    timestamp: '2024-03-18T08:00:00Z',
    subject: 'Tropicana Island Declares Agricultural Emergency',
    content: `The small island nation of Tropicana has declared a state of emergency following what officials now acknowledge as an "unprecedented agricultural phenomenon." President Rodriguez, in a televised address, urged calm while announcing a temporary halt to all pineapple exports. International scientists from WHO and FAO are en route. Unconfirmed reports suggest the affected pineapples exhibit bioluminescence and anomalous thermal properties. Stock markets across Asia have responded with sharp drops in agricultural futures.`
  },
  {
    id: 'doc_011',
    type: 'report',
    author: 'Dr. Yuki Tanaka, WHO Special Investigator',
    timestamp: '2024-03-18T16:00:00Z',
    subject: 'Preliminary Assessment - Tropicana Phenomenon',
    content: `After initial examination, I can confirm the specimens demonstrate characteristics that challenge our understanding of plant biology. Key observations:
1. Core temperature maintained at 42.7°C without external energy source
2. Rhythmic pulsation at 0.7 Hz (matching human resting heart rate)
3. Electromagnetic field generation (low intensity, 50 microTesla)
4. Apparent response to human proximity (luminescence increases)
5. Cellular structure shows non-plant organelles of unknown function

Recommendation: These entities (I hesitate to call them pineapples) should be studied, not destroyed. They may represent a form of life we've never encountered.`
  },
  {
    id: 'doc_012',
    type: 'social',
    author: '@IslandElder88',
    timestamp: '2024-03-18T19:30:00Z',
    content: `My grandmother always told stories about the "Star Fruit" that would return when the island needed them most. She said they weren't from Earth, but were gifts from the Sky Farmers who visited our ancestors. Everyone laughed at her stories. Nobody's laughing now. 🌟🍍 #AncientWisdom #TheyHaveReturned`
  },

  // Day 5 - The Resolution?
  {
    id: 'doc_013',
    type: 'memo',
    author: 'President Maria Rodriguez',
    timestamp: '2024-03-19T09:00:00Z',
    subject: 'Executive Order 2024-319',
    content: `Effective immediately:
1. All affected specimens to be preserved and studied, not destroyed
2. International research coalition to be formed under UN oversight
3. Full transparency policy - all findings to be published publicly
4. Economic aid package for affected farmers
5. Investigation into historical records and indigenous legends regarding similar phenomena

Personal note: Dr. Tanaka has shown me something remarkable. When approached calmly, without fear, the pineapples' glow shifts from purple to gold. They're not a threat. They're trying to communicate.`
  },
  {
    id: 'doc_014',
    type: 'email',
    author: 'Dr. Marina Flores',
    recipient: 'Global Scientific Community',
    timestamp: '2024-03-19T14:00:00Z',
    subject: 'A New Chapter in Biology',
    content: `Colleagues, what we've discovered here transcends agriculture, biology, perhaps even our understanding of life itself. The "pineapples" have begun arranging themselves in complex patterns when left undisturbed - patterns that match mathematical constants like phi and pi. They respond to music, particularly frequencies at 528 Hz. Most remarkably, their DNA (if we can call it that) contains encoded information that appears to be... a message. We're on the verge of something extraordinary.`
  },
  {
    id: 'doc_015',
    type: 'news',
    author: 'Tropicana Daily Herald - Final Update',
    timestamp: '2024-03-19T20:00:00Z',
    subject: 'The Pineapples Have Stopped Glowing - But the Mystery Deepens',
    content: `As suddenly as it began, the "Great Pineapple Crisis" appears to have stabilized. The anomalous specimens have ceased their glowing and heating, though they remain structurally unique. However, scientists report a final mystery: each pineapple's core now contains a small, crystalline seed unlike anything in terrestrial botany. When planted, these seeds produce normal pineapples - but with one difference. They grow in perfect golden ratio spirals and taste, according to all who've tried them, "like sunshine itself." 

The government has announced plans to cultivate these new pineapples, potentially revolutionizing agriculture. But questions remain: Where did they come from? Why now? And what message were they trying to convey?

As one elderly farmer told us, "Sometimes the island provides what we need, not what we expect. These pineapples aren't a crisis - they're a gift."

The investigation continues.`
  }
];

// Hidden patterns and investigative elements:
// 1. Timeline contradiction: Minister Santos claims fungal infection (Day 1) but General Vega reveals military was already involved
// 2. Cover-up: Government denies rumors while simultaneously implementing containment
// 3. Sentiment shift: Fear → Curiosity → Acceptance
// 4. Multiple theories: Contamination vs. Ancient return vs. Extraterrestrial
// 5. Temperature consistency: All affected specimens maintain exactly 42.7°C
// 6. Frequency patterns: 73 Hz humming, 0.7 Hz pulsing, 528 Hz response
// 7. Economic concerns repeatedly override scientific investigation
// 8. Indigenous knowledge proves more accurate than scientific assumptions
