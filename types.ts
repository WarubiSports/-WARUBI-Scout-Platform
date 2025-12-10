
export enum AppView {
  ONBOARDING = 'ONBOARDING',
  DASHBOARD = 'DASHBOARD'
}

export enum DashboardTab {
  PLAYERS = 'PLAYERS',
  EVENTS = 'EVENTS',
  KNOWLEDGE = 'KNOWLEDGE',
  PROFILE = 'PROFILE',
  OUTREACH = 'OUTREACH'
}

export enum PlayerStatus {
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
  weeklyTasks: string[];
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
  interestedProgram?: string; // e.g. "UCLA"
  placedLocation?: string;    // e.g. "Signed with FC Dallas"
  evaluation: PlayerEvaluation | null;
  outreachLogs: OutreachLog[];
  submittedAt: string;
}

export interface ScoutingEvent {
  id: string;
  name: string;
  date: string;
  location: string;
  plan: {
    agenda: string[];
    marketingCopy: string;
    checklist: string[];
  } | null;
}

export interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  category: 'Process' | 'Template' | 'Q&A';
}