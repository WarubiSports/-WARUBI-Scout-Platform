
import { Player, PlayerStatus, KnowledgeItem, PathwayDef, ToolDef } from './types';

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
      score: 94,
      collegeLevel: 'Pro / Top D1',
      scholarshipTier: 'Tier 1',
      recommendedPathways: ['Development in Europe'],
      strengths: ['Elite Vision', 'Technical Dribbling', 'Game Intelligence'],
      weaknesses: ['Defensive Workrate'],
      nextAction: 'Finalize Contract',
      summary: 'The Gold Standard for the European Pathway. Immediate impact player.'
    }
  },
  {
    id: 'ref-2',
    name: 'Jordan Morris (Ref)',
    age: 18,
    position: 'ST',
    status: PlayerStatus.PLACED,
    interestedProgram: 'Stanford',
    submittedAt: new Date().toISOString(),
    outreachLogs: [],
    evaluation: {
      score: 89,
      collegeLevel: 'NCAA D1 Top 25',
      scholarshipTier: 'Tier 1',
      recommendedPathways: ['College Pathway'],
      strengths: ['Elite Speed', 'Physicality', 'Finishing'],
      weaknesses: ['Technical Consistency'],
      nextAction: 'Commit',
      summary: 'Perfect fit for College Pathway. High athletic ceiling, good grades.'
    }
  },
  {
    id: 'ref-3',
    name: 'Local Talent (Ref)',
    age: 17,
    position: 'CB',
    status: PlayerStatus.INTERESTED,
    submittedAt: new Date().toISOString(),
    outreachLogs: [],
    evaluation: {
      score: 74,
      collegeLevel: 'NCAA D2 / NAIA',
      scholarshipTier: 'Tier 3',
      recommendedPathways: ['Exposure Events'],
      strengths: ['Tackling', 'Size'],
      weaknesses: ['Speed of Play', 'Distribution'],
      nextAction: 'Attend Showcase',
      summary: 'Needs exposure. Good physical tools but needs to prove level at an Event.'
    }
  }
];

export const WARUBI_PATHWAYS: PathwayDef[] = [
    {
        id: 'europe',
        title: 'Development in Europe',
        shortDesc: 'The elite route. FC Köln ITP & Pro Trials.',
        icon: 'Globe', 
        color: 'text-red-500 border-red-500/30 bg-red-500/10',
        idealProfile: [
            'Tier 1 or High Tier 2 Talent',
            'Obsessed with becoming a pro',
            'Financially capable of investment for ROI',
            'Technically superior to US peers'
        ],
        redFlags: [
            'Homesick easily',
            'Not willing to learn language/culture',
            'Expecting a paid contract immediately without CV'
        ],
        keySellingPoints: [
            'Direct access to Bundesliga Academies',
            'Save $$ on US University costs by earning credits in Germany',
            'The only way to truly test "Pro Level"'
        ],
        scriptSnippet: '"This isn\'t a vacation. It\'s a 6-month residency at a Bundesliga club partner to see if you have what it takes. It\'s cheaper than one year of US college tuition."'
    },
    {
        id: 'college',
        title: 'College Pathway',
        shortDesc: 'Degree + Football. NCAA, NAIA, NJCAA.',
        icon: 'GraduationCap',
        color: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
        idealProfile: [
            'Strong Academics (3.0+ GPA)',
            'Tier 1, 2, or 3',
            'Values education safety net',
            'Family needs financial aid / scholarship'
        ],
        redFlags: [
            'GPA below 2.3',
            'Unrealistic expectations ("D1 or nothing")',
            'Late to the process (Senior year with no film)'
        ],
        keySellingPoints: [
            'Warubi places 200+ players annually',
            'We negotiate the scholarship package',
            'Access to "Hidden" roster spots in mid-major programs'
        ],
        scriptSnippet: '"You have the talent, but the window is closing. Let\'s use the Warubi Network to get your film directly to coaches who are still recruiting for your position."'
    },
    {
        id: 'events',
        title: 'Exposure Events',
        shortDesc: 'Showcases, ID Days, Camps.',
        icon: 'Calendar',
        color: 'text-orange-400 border-orange-500/30 bg-orange-500/10',
        idealProfile: [
            'Unknown / Unseen Talent',
            'Late Bloomers',
            'Needs video footage (Warubi records games)',
            'Budget-conscious start'
        ],
        redFlags: [
            'Injured',
            'Out of shape',
            'Poor attitude on the bench'
        ],
        keySellingPoints: [
            'Guaranteed eyes from scouts',
            'Professional video package included',
            'Direct comparison against other recruits'
        ],
        scriptSnippet: '"Coaches need to see you live. We have 15 colleges confirmed for the Miami Showcase. It\'s the fastest way to get an offer."'
    },
    {
        id: 'coaching',
        title: 'Coaching Education',
        shortDesc: 'UEFA & German FA Licenses.',
        icon: 'BookOpen',
        color: 'text-gray-300 border-gray-500/30 bg-gray-500/10',
        idealProfile: [
            'Former players transitioning',
            'Coaches wanting European credentials',
            'Students of the game'
        ],
        redFlags: [
            'Just looking for a visa',
            'No interest in theory'
        ],
        keySellingPoints: [
            'Learn the German Methodology',
            'Earn globally recognized licenses',
            'Network with Bundesliga staff'
        ],
        scriptSnippet: '"Your playing career is just chapter one. The Warubi Coaching Course gives you the credentials to build a career in the game for the next 40 years."'
    }
];

export const WARUBI_TOOLS: ToolDef[] = [
    {
        id: 'roi_calc',
        title: 'Cost & ROI Calculator',
        desc: 'Show parents the math: ITP vs. US College Debt.',
        actionLabel: 'Open Calculator',
        type: 'CALCULATOR'
    },
    {
        id: 'eval_tool',
        title: 'Player Evaluation Tool',
        desc: 'The "Hook". Free assessment to generate a lead.',
        actionLabel: 'Copy Link',
        type: 'ASSESSMENT'
    },
    {
        id: 'transfer_val',
        title: 'College Transfer Valuator',
        desc: 'For current college players looking to move up.',
        actionLabel: 'Copy Link',
        type: 'ASSESSMENT'
    }
];

export const INITIAL_KNOWLEDGE_BASE: KnowledgeItem[] = [
  {
    id: 'kb-1',
    title: 'The Recruiting Pipeline Explained',
    content: '1. Lead (Identify) -> 2. Interested (Engage) -> 3. Offered (Commit) -> 4. Placed (Sign). Keep communication clear at every step.',
    category: 'Process'
  }
];