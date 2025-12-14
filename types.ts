
export enum AppView {
  ONBOARDING = 'ONBOARDING',
  DASHBOARD = 'DASHBOARD'
}

export enum DashboardTab {
  PLAYERS = 'PLAYERS',
  EVENTS = 'EVENTS',
  KNOWLEDGE = 'KNOWLEDGE',
  PROFILE = 'PROFILE',
  OUTREACH = 'OUTREACH',
  NEWS = 'NEWS'
}

export enum PlayerStatus {
  PROSPECT = 'Prospect', // Hidden state for Shadow Pipeline
  LEAD = 'Lead',
  INTERESTED = 'Interested',
  FINAL_REVIEW = 'Final Review',
  OFFERED = 'Offered',
  PLACED = 'Placed',
  ARCHIVED = 'Archived'
}

export interface UserProfile {
  name: string;
  role: string;
  region: string;
  affiliation?: string;
  scoutPersona?: string; // e.g. "The Networker", "The Data Analyst", "The Field General"
  weeklyTasks: string[]; // These will now be "Power Moves"
  scoutId?: string; // Unique ID for tracking referrals
}

export interface PlayerEvaluation {
  score: number; // 0-100
  collegeLevel: string;
  scholarshipTier: 'Tier 1' | 'Tier 2' | 'Tier 3';
  recommendedPathways: string[]; // e.g., "College Pathway", "Development in Europe"
  strengths: string[];
  weaknesses: string[];
  nextAction: string;
  summary: string;
}

export interface OutreachLog {
  id: string;
  date: string;
  method: 'Email' | 'WhatsApp' | 'Clipboard';
  templateName: string;
  note?: string;
}

export interface Player {
  id: string;
  name: string;
  age: number;
  position: string;
  status: PlayerStatus;
  
  // Contact Info
  email?: string;
  phone?: string;
  parentEmail?: string;

  interestedProgram?: string; // e.g. "UCLA"
  placedLocation?: string;    // e.g. "Signed with FC Dallas"
  evaluation: PlayerEvaluation | null;
  outreachLogs: OutreachLog[];
  submittedAt: string;

  // Smart Tracking Fields
  lastActive?: string; // ISO Date string
  activityStatus?: 'viewed' | 'submitted' | 'none';
}

export type EventStatus = 'Draft' | 'Pending Approval' | 'Approved' | 'Published' | 'Completed' | 'Rejected';

export interface ScoutingEvent {
  id: string;
  isMine: boolean; // True if hosting, False if attending/viewing
  status: EventStatus;
  title: string;
  date: string;
  location: string;
  type: 'ID Day' | 'Showcase' | 'Camp' | 'Tournament';
  fee: string; // e.g. "$50" or "Free"
  
  // AI Generated Assets (Only for hosted events)
  marketingCopy?: string;
  agenda?: string[];
  checklist?: string[];
  
  // Stats
  registeredCount: number;
}

export interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  category: 'Process' | 'Template' | 'Q&A';
}

export interface PathwayDef {
    id: string;
    title: string;
    shortDesc: string;
    icon: any; // Lucide icon name or component
    color: string;
    idealProfile: string[];
    redFlags: string[];
    keySellingPoints: string[];
    scriptSnippet: string;
}

export interface ToolDef {
    id: string;
    title: string;
    desc: string;
    actionLabel: string;
    type: 'CALCULATOR' | 'ASSESSMENT' | 'COMPARE';
}