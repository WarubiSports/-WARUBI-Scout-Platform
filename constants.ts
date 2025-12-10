
import { Player, PlayerStatus, KnowledgeItem } from './types';

export const ITP_REFERENCE_PLAYERS: Player[] = [
  {
    id: 'ref-1',
    name: 'Julian Brandt (Ref)',
    age: 19,
    position: 'CAM',
    status: PlayerStatus.PLACED,
    placedLocation: 'Professional Contract',
    submittedAt: new Date().toISOString(),
    outreachLogs: [],
    evaluation: {
      score: 92,
      collegeLevel: 'D1 Top 25 / Pro',
      scholarshipTier: 'Tier 1',
      recommendedPathways: ['Development in Europe', 'College Pathway'],
      strengths: ['Vision', 'Technical Dribbling', 'Passing Range'],
      weaknesses: ['Defensive Workrate'],
      nextAction: 'Finalize Contract',
      summary: 'Top tier talent suitable for high-level programs.'
    }
  },
  {
    id: 'ref-2',
    name: 'Kevin Volland (Ref)',
    age: 20,
    position: 'ST',
    status: PlayerStatus.OFFERED,
    interestedProgram: 'D1 Mid-Major',
    submittedAt: new Date().toISOString(),
    outreachLogs: [],
    evaluation: {
      score: 88,
      collegeLevel: 'D1 Mid-Major',
      scholarshipTier: 'Tier 2',
      recommendedPathways: ['College Pathway'],
      strengths: ['Finishing', 'Physicality', 'Hold-up Play'],
      weaknesses: ['Speed', 'Agility'],
      nextAction: 'Negotiate Terms',
      summary: 'Strong target man, fits specific systems.'
    }
  }
];

export const INITIAL_KNOWLEDGE_BASE: KnowledgeItem[] = [
  {
    id: 'kb-1',
    title: 'The Recruiting Pipeline Explained',
    content: '1. Lead (Identify) -> 2. Interested (Engage) -> 3. Offered (Commit) -> 4. Placed (Sign). Keep communication clear at every step.',
    category: 'Process'
  },
  {
    id: 'kb-2',
    title: 'First Contact Template',
    content: 'Hi [Name], I saw you play at [Location]. I am a scout for WARUBI and see potential in your profile for US College Scholarships...',
    category: 'Template'
  }
];
