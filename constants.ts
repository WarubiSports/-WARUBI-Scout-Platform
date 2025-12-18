
import { Player, PlayerStatus, KnowledgeItem, PathwayDef, ToolDef, NewsItem, ScoutingEvent } from './types';

export const SCOUT_POINTS = {
  PLAYER_LOG: 10,
  EVENT_ATTEND: 15,
  EVENT_HOST: 50,
  PLACEMENT: 500
};

export const MARKET_DATA = {
  GLOBAL_MARKET: "$50B+",
  TOTAL_PLAYERS: "265M",
  US_SCHOLARSHIP_FUND: "$3B",
  ANNUAL_PLACEMENTS: "200+",
  AUDIT_METRICS: [
    { label: "Agency Transparency", warubi: "Live Outreach Logs", oldWay: "Hidden Emails/No Logs" },
    { label: "Selection Basis", warubi: "AI-Verified Merit", oldWay: "Pay-To-Play Rankings" },
    { label: "Financial Model", warubi: "Simple Refund Policy", oldWay: "Complex Retainers" },
    { label: "Pathways", warubi: "Hybrid (Pro + College)", oldWay: "Single Source / Limited" }
  ]
};

export const WARUBI_PROTOCOLS = [
  {
    id: 'ownership',
    title: 'Ownership Protocol',
    principles: [
      'Scouts are owners, not employees.',
      'Regional autonomy with global infrastructure.',
      'Direct revenue attribution for every lead.'
    ],
    color: 'border-blue-500/30 text-blue-400'
  },
  {
    id: 'trust',
    title: 'Trust Protocol',
    principles: [
      'Results before revenue: Placements drive the brand.',
      'Immutable logs: Parents see every interaction.',
      'Simple refund standards eliminate legal friction.'
    ],
    color: 'border-scout-accent/30 text-scout-accent'
  },
  {
    id: 'selectivity',
    title: 'Selectivity Protocol',
    principles: [
      'No Pay-to-Play. Tier 1 talent is earned.',
      'Quality gates at every transition point.',
      'Scout reputation is a system currency.'
    ],
    color: 'border-purple-500/30 text-purple-400'
  },
  {
    id: 'integrity',
    title: 'Integrity Protocol',
    principles: [
      'UEFA methodology is the technical benchmark.',
      'FIFA verified agents handle pro transitions.',
      'Proof of placement beats theory of potential.'
    ],
    color: 'border-red-500/30 text-red-400'
  }
];

export const ITP_REFERENCE_PLAYERS: Player[] = [
  {
    id: 'ref-1',
    name: 'Tier 1: The Academy Pro',
    age: 18,
    position: 'Standard',
    status: PlayerStatus.PLACED,
    placedLocation: 'Pro Contract / Top 25 D1',
    submittedAt: new Date().toISOString(),
    outreachLogs: [],
    evaluation: {
      score: 94,
      collegeLevel: 'Pro / Top D1',
      scholarshipTier: 'Tier 1',
      recommendedPathways: ['Development in Europe'],
      strengths: ['League: MLS Next / ECNL / Bundsliga', 'Honors: Youth National Team / All-American', 'Physical: Top 1% Athlete'],
      weaknesses: [],
      nextAction: 'Finalize Contract',
      summary: 'The "Blue Chip" recruit. Plays at the highest youth level available. Physically dominant or technically flawless under high pressure.'
    }
  },
  {
    id: 'ref-2',
    name: 'Tier 2: The College Starter',
    age: 18,
    position: 'Standard',
    status: PlayerStatus.PLACED,
    interestedProgram: 'NCAA D1 / D2',
    submittedAt: new Date().toISOString(),
    outreachLogs: [],
    evaluation: {
      score: 85,
      collegeLevel: 'NCAA D1 / Top D2',
      scholarshipTier: 'Tier 2',
      recommendedPathways: ['College Pathway'],
      strengths: ['League: ECNL / GA / Varsity Captain', 'Honors: All-State / All-Conference', 'Academics: 3.5+ GPA'],
      weaknesses: [],
      nextAction: 'Commit',
      summary: 'The backbone of college soccer. Strong club pedigree, high fitness levels, and physically ready for the college game. Reliable.'
    }
  },
  {
    id: 'ref-3',
    name: 'Tier 3: The Developer',
    age: 17,
    position: 'Standard',
    status: PlayerStatus.INTERESTED,
    submittedAt: new Date().toISOString(),
    outreachLogs: [],
    evaluation: {
      score: 74,
      collegeLevel: 'NCAA D3 / NAIA / JUCO',
      scholarshipTier: 'Tier 3',
      recommendedPathways: ['Exposure Events'],
      strengths: ['League: Regional / HS Varsity', 'Potential: "Late Bloomer"', 'Needs: Exposure & S&C'],
      weaknesses: [],
      nextAction: 'Attend Showcase',
      summary: 'Raw talent. Often stuck in a lower-level environment or lacks physical maturity. Needs an ID event to prove they can play higher.'
    }
  }
];

export const DEMO_DATA = {
    players: [
        {
            id: 'demo-1',
            name: 'Leo Silva',
            age: 18,
            position: 'ST',
            status: PlayerStatus.PLACED,
            placedLocation: 'FC Köln ITP / Pro Residency',
            submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
            outreachLogs: [{ id: 'l1', date: new Date().toISOString(), method: 'WhatsApp', templateName: 'Placement Confirmation' }],
            evaluation: {
                score: 91,
                collegeLevel: 'Top 25 NCAA D1 / Pro',
                scholarshipTier: 'Tier 1',
                recommendedPathways: ['Development in Europe'],
                strengths: ['Elite Finishing', 'Pro-ready Frame', 'Top 1% Acceleration'],
                weaknesses: ['Defensive Workrate'],
                nextAction: 'Quarterly Check-in',
                summary: 'Silva is the gold standard for a modern #9. His physical data matches Regionalliga standards in Germany.'
            },
            notes: 'Successfully moved through the Germany pathway in Oct 2024.'
        },
        {
            id: 'demo-2',
            name: 'Marco Rossi',
            age: 17,
            position: 'CAM',
            status: PlayerStatus.FINAL_REVIEW,
            submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
            outreachLogs: [],
            evaluation: {
                score: 88,
                collegeLevel: 'NCAA D1 Power 5',
                scholarshipTier: 'Tier 1',
                recommendedPathways: ['College Pathway', 'Development in Europe'],
                strengths: ['Vision', 'Technical Precision', 'GPA: 3.9'],
                weaknesses: ['Strength'],
                nextAction: 'Submit to HQ',
                summary: 'Highly intelligent midfielder with elite academic profile. Ideal for Top D1 programs looking for technical superiority.'
            }
        },
        {
            id: 'demo-3',
            name: 'Elena Vance',
            age: 18,
            position: 'LB',
            status: PlayerStatus.INTERESTED,
            interestedProgram: 'West Coast D1 Programs',
            submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
            outreachLogs: [],
            evaluation: {
                score: 82,
                collegeLevel: 'NCAA D1 / Top D2',
                scholarshipTier: 'Tier 2',
                recommendedPathways: ['College Pathway'],
                strengths: ['Recovery Speed', '1v1 Defending'],
                weaknesses: ['Crossing Consistency'],
                nextAction: 'Film Review',
                summary: 'Athletic left back who dominates the wing. High ceiling if she improves her final ball delivery.'
            }
        },
        {
            id: 'demo-4',
            name: 'Tariq Bakari',
            age: 17,
            position: 'CM',
            status: PlayerStatus.LEAD,
            submittedAt: new Date().toISOString(),
            outreachLogs: [],
            evaluation: {
                score: 75,
                collegeLevel: 'NCAA D2 / NAIA',
                scholarshipTier: 'Tier 3',
                recommendedPathways: ['Exposure Events'],
                strengths: ['Engine / Stamina', 'Aerial Presence'],
                weaknesses: ['Decision Making'],
                nextAction: 'Invite to ID Day',
                summary: 'Bakari is a physical powerhouse who needs a more structured tactical environment to shine.'
            }
        },
        {
            id: 'demo-5',
            name: 'Samir Amin',
            age: 16,
            position: 'RW',
            status: PlayerStatus.PROSPECT,
            activityStatus: 'signal',
            lastActive: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
            submittedAt: new Date().toISOString(),
            outreachLogs: [],
            evaluation: null
        },
        {
            id: 'demo-6',
            name: 'Javier Hernandez',
            age: 17,
            position: 'GK',
            status: PlayerStatus.PROSPECT,
            activityStatus: 'undiscovered',
            submittedAt: new Date().toISOString(),
            outreachLogs: [],
            evaluation: null
        }
    ] as Player[],
    events: [
        {
            id: 'demo-evt-1',
            isMine: true,
            role: 'HOST',
            status: 'Draft',
            title: 'Regional Talent ID: Texas',
            date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString(),
            location: 'Round Rock Multipurpose Complex',
            type: 'ID Day',
            fee: '$45',
            registeredCount: 12,
            agenda: ['09:00 - Arrival', '10:00 - Technical Audit', '11:30 - Small Sided Games'],
            checklist: [{ task: 'Book field space', completed: true }, { task: 'Send invites to local clubs', completed: false }]
        },
        {
            id: 'demo-evt-2',
            isMine: false,
            role: 'ATTENDEE',
            status: 'Published',
            title: 'ECNL National Showcase',
            date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString(),
            location: 'Phoenix, AZ',
            type: 'Showcase',
            fee: 'N/A',
            registeredCount: 0
        }
    ] as ScoutingEvent[]
};

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

export const INITIAL_NEWS_ITEMS: NewsItem[] = [
    {
        id: '1',
        type: 'Transfer News',
        title: '3 Warubi Players Sign Pro Contracts in Germany',
        summary: 'Following the successful Munich Showcase, three players from the 2005 age group have signed development contracts with Regionalliga clubs. "This validates our tiering system," says Head of Scouting.',
        source: 'FC Köln ITP',
        date: '2 hours ago',
        categoryColor: 'text-green-400',
        borderColor: 'border-green-500/30'
    },
    {
        id: '2',
        type: 'Network Milestone',
        title: 'Athletes USA surpasses 5,000 Scholarships Awarded',
        summary: 'Our partner network Athletes USA has reached a historic milestone, securing over $200M in scholarship funding for student-athletes globally in 2024 alone.',
        source: 'Athletes USA',
        date: '1 day ago',
        categoryColor: 'text-blue-400',
        borderColor: 'border-blue-500/30'
    },
    {
        id: '3',
        type: 'Platform Update',
        title: 'New AI Scouting Tools Now Live',
        summary: 'The new "Scout DNA" personalization engine is now active for all users. Log in to see your custom strategy and hidden gold mines.',
        source: 'WARUBI Tech',
        date: '2 days ago',
        categoryColor: 'text-scout-accent',
        borderColor: 'border-scout-accent/30'
    },
    {
        id: '4',
        type: 'Event Recap',
        title: 'Highlights: Florida Winter ID Camp',
        summary: 'Over 150 players attended our sold-out event in Miami. Top scouts from 12 D1 universities were present. Check out the top rated players in the database now.',
        source: 'Warubi Events',
        date: '3 days ago',
        categoryColor: 'text-orange-400',
        borderColor: 'border-orange-500/30'
    }
];

export const INITIAL_TICKER_ITEMS = [
    "BREAKING: FC Köln U19s to scout at Dallas Cup 2025",
    "REMINDER: Q2 Scouting Reports due next Friday",
    "NEW PARTNERSHIP: Warubi x Nike Football announced for Berlin Event",
    "STATS: 42 new placements confirmed this week across the network"
];
