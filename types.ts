
export enum AppView {
  ONBOARDING = 'ONBOARDING',
  DASHBOARD = 'DASHBOARD',
  ADMIN = 'ADMIN'
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

export interface StrategyTask {
  id: string;
  type: 'LEAD' | 'OUTREACH' | 'EVENT' | 'ADMIN';
  title: string;
  subtitle: string;
  actionLabel: string;
  actionLink: string; // e.g. "TAB:OUTREACH:id"
  impactLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  completed: boolean;
}

export interface UserProfile {
  name: string;
  role: string;
  region: string;
  affiliation?: string;
  scoutPersona?: string; // e.g. "The Networker", "The Data Analyst", "The Field General"
  weeklyTasks: string[]; // Legacy support
  strategyTasks?: StrategyTask[]; // New Dynamic Engine
  scoutId?: string; // Unique ID for tracking referrals
  isAdmin?: boolean;
  
  // Extended Profile Fields (LinkedIn Style)
  bio?: string;
  experience?: { id: string; role: string; org: string; duration: string }[];
  certifications?: string[];
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
  notes?: string; // Free-text notes
  submittedAt: string;

  // Smart Tracking Fields
  lastActive?: string; // ISO Date string
  activityStatus?: 'viewed' | 'submitted' | 'none';
}

export type EventStatus = 'Draft' | 'Pending Approval' | 'Approved' | 'Published' | 'Completed' | 'Rejected';

export interface ScoutingEvent {
  id: string;
  isMine: boolean; // True if hosting, False if attending/viewing (Legacy/Helper)
  role?: 'HOST' | 'ATTENDEE'; // Explicit role
  status: EventStatus;
  title: string;
  date: string;
  location: string;
  type: 'ID Day' | 'Showcase' | 'Camp' | 'Tournament';
  fee: string; // e.g. "$50" or "Free"
  
  // AI Generated Assets (Only for hosted events)
  marketingCopy?: string;
  agenda?: string[];
  checklist?: { task: string; completed: boolean }[];
  
  // Stats
  registeredCount: number;
  hostName?: string; // For Admin view
}

export interface NewsItem {
    id: string;
    type: string; // e.g., 'Transfer News'
    title: string;
    summary: string;
    source: string;
    date: string;
    linkUrl?: string; // External blog post link
    categoryColor?: string; // CSS class for color
    borderColor?: string;
}

export interface AppNotification {
  id: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ALERT';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionLink?: string; // e.g. "View Player"
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
