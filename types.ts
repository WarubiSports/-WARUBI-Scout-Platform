
export enum AppView {
  LOGIN = 'LOGIN',
  ONBOARDING = 'ONBOARDING',
  DASHBOARD = 'DASHBOARD',
  ADMIN = 'ADMIN'
}

export enum DashboardTab {
  PLAYERS = 'PLAYERS',
  EVENTS = 'EVENTS',
  KNOWLEDGE = 'KNOWLEDGE',
  PROFILE = 'PROFILE',
  OUTREACH = 'OUTREACH'
}

// Simplified 5-stage pipeline: Lead → Contacted → Interested → Offered → Placed
export enum PlayerStatus {
  LEAD = 'Lead',
  CONTACTED = 'Contacted',
  INTERESTED = 'Interested',
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
  actionLink: string;
  impactLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  completed: boolean;
}

export interface UserProfile {
  name: string;
  roles: string[];
  region: string;
  affiliation?: string;
  scoutPersona?: string;
  weeklyTasks: string[];
  strategyTasks?: StrategyTask[];
  scoutId?: string;
  isAdmin?: boolean;
  bio?: string;
  experience?: { id: string; role: string; org: string; duration: string }[];
  certifications?: string[];
  leadMagnetActive?: boolean;
}

export interface PlayerEvaluation {
  score: number;
  collegeLevel: string;
  scholarshipTier: 'Tier 1' | 'Tier 2' | 'Tier 3';
  recommendedPathways: string[];
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
  secondaryPosition?: string;
  dominantFoot?: 'Left' | 'Right' | 'Both';
  nationality?: string;
  hasEuPassport?: boolean;
  height?: string;
  weight?: string;
  // Performance Audit Traits
  pace?: number;
  physical?: number;
  technical?: number;
  tactical?: number;
  coachable?: number;
  status: PlayerStatus;
  email?: string;
  phone?: string;
  parentEmail?: string;
  parentPhone?: string;
  parentName?: string;
  gpa?: string;
  gradYear?: string;
  satAct?: string;
  videoLink?: string;
  club?: string;
  teamLevel?: string;
  interestedProgram?: string;
  offeredPathway?: 'europe' | 'college' | 'events' | 'coaching';
  placedLocation?: string;
  evaluation: PlayerEvaluation | null;
  outreachLogs: OutreachLog[];
  notes?: string;
  submittedAt: string;
  lastActive?: string;
  lastContactedAt?: string;
  activityStatus?: 'signal' | 'spotlight' | 'spark' | 'undiscovered';
  isRecalibrating?: boolean;
  previousScore?: number;
  dateOfBirth?: string;
  trialProspectId?: string;
}

export type EventStatus = 'Draft' | 'Pending Approval' | 'Approved' | 'Published' | 'Completed' | 'Rejected';

export interface ScoutingEvent {
  id: string;
  isMine: boolean;
  role?: 'HOST' | 'ATTENDEE';
  status: EventStatus;
  title: string;
  date: string;
  time?: string;
  endDate?: string; // For multi-day events
  location: string;
  type: 'ID Day' | 'ID Camp' | 'Showcase' | 'Camp' | 'Tournament' | 'Training' | 'Tryout';
  fee?: string | number;
  marketingCopy?: string;
  agenda?: string[];
  checklist?: { task: string; completed: boolean }[];
  registeredCount?: number;
  hostName?: string;
  isGlobal?: boolean; // Admin-created events visible to all scouts
}

export interface NewsItem {
    id: string;
    type: string;
    title: string;
    summary: string;
    source: string;
    date: string;
    linkUrl?: string;
    categoryColor?: string;
    borderColor?: string;
}

export interface AppNotification {
  id: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ALERT';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionLink?: string;
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
    icon: any;
    color: string;
    idealProfile: string[];
    redFlags: string[];
    keySellingPoints: string[];
    scriptSnippet: string;
    videoUrl?: string; // YouTube or Vimeo embed URL
    websiteUrl?: string; // Link to warubi-sports.com pathway page
}

export interface ToolDef {
    id: string;
    title: string;
    desc: string;
    actionLabel: string;
    type: 'CALCULATOR' | 'ASSESSMENT' | 'COMPARE';
}

// Bug Report Types
export type BugReportStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type BugReportPriority = 'low' | 'medium' | 'high' | 'critical';

export interface BugReport {
    id: string;
    title: string;
    description?: string;
    pageUrl?: string;
    reporterId?: string;
    reporterName?: string;
    screenshotUrl?: string;
    status: BugReportStatus;
    priority: BugReportPriority;
    adminNotes?: string;
    createdAt: string;
    updatedAt: string;
}