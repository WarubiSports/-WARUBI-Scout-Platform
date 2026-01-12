/**
 * AI Usage Tracking Service
 *
 * Tracks and limits Gemini API usage to control costs.
 * Free tier scouts get generous but bounded limits.
 */

// Different AI operations have different costs (based on model + complexity)
export type AIOperationType =
  | 'player_evaluation'      // High cost - uses gemini-3-pro
  | 'outreach_message'       // Medium cost - uses gemini-3-flash
  | 'event_plan'             // Medium cost
  | 'roster_extraction'      // Medium cost (image processing)
  | 'bulk_import'            // Medium cost
  | 'player_parse'           // Low cost
  | 'duplicate_check'        // Low cost
  | 'scout_bio'              // Low cost
  | 'scout_ai_chat'          // Low cost
  | 'onboarding';            // Low cost (one-time)

// Credit costs per operation type
const OPERATION_COSTS: Record<AIOperationType, number> = {
  player_evaluation: 5,      // Most expensive - pro model + complex analysis
  outreach_message: 2,       // Medium - personalized content generation
  event_plan: 3,             // Medium - generates agenda + copy
  roster_extraction: 3,      // Medium - image OCR + parsing
  bulk_import: 2,            // Medium - multiple player parsing
  player_parse: 1,           // Low - simple field extraction
  duplicate_check: 1,        // Low - comparison logic
  scout_bio: 1,              // Low - short text generation
  scout_ai_chat: 1,          // Low - general Q&A
  onboarding: 2,             // Low - one-time per scout
};

// Limits for free tier scouts
export const FREE_TIER_LIMITS = {
  dailyCredits: 50,          // ~10 evaluations or 25 messages per day
  monthlyCredits: 500,       // ~100 evaluations or 250 messages per month
};

export interface AIUsageRecord {
  date: string;              // YYYY-MM-DD
  month: string;             // YYYY-MM
  operations: Partial<Record<AIOperationType, number>>;
  totalCredits: number;
}

export interface AIUsageStats {
  today: {
    used: number;
    limit: number;
    remaining: number;
    percentage: number;
  };
  month: {
    used: number;
    limit: number;
    remaining: number;
    percentage: number;
  };
  recentOperations: Array<{
    type: AIOperationType;
    credits: number;
    timestamp: string;
  }>;
}

const STORAGE_KEY = 'warubi_ai_usage';

// Get today's date string
const getTodayString = (): string => {
  return new Date().toISOString().split('T')[0];
};

// Get current month string
const getMonthString = (): string => {
  return new Date().toISOString().slice(0, 7);
};

// Load usage data from storage
const loadUsageData = (): { daily: AIUsageRecord; monthly: AIUsageRecord } => {
  const today = getTodayString();
  const month = getMonthString();

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored);

      // Reset daily if different day
      const daily = data.daily?.date === today
        ? data.daily
        : { date: today, month, operations: {}, totalCredits: 0 };

      // Reset monthly if different month
      const monthly = data.monthly?.month === month
        ? data.monthly
        : { date: today, month, operations: {}, totalCredits: 0 };

      return { daily, monthly };
    }
  } catch (e) {
    console.error('Failed to load AI usage data:', e);
  }

  return {
    daily: { date: today, month, operations: {}, totalCredits: 0 },
    monthly: { date: today, month, operations: {}, totalCredits: 0 }
  };
};

// Save usage data to storage
const saveUsageData = (daily: AIUsageRecord, monthly: AIUsageRecord): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      daily,
      monthly,
      lastUpdated: new Date().toISOString()
    }));
  } catch (e) {
    console.error('Failed to save AI usage data:', e);
  }
};

/**
 * Check if an operation can be performed within limits
 * NOTE: Limits disabled for admin/testing - always allows operations
 */
export const canPerformOperation = (operationType: AIOperationType): {
  allowed: boolean;
  reason?: string;
  creditsNeeded: number;
  creditsRemaining: { daily: number; monthly: number };
} => {
  const cost = OPERATION_COSTS[operationType];

  // Limits disabled - always allow
  return {
    allowed: true,
    creditsNeeded: cost,
    creditsRemaining: { daily: Infinity, monthly: Infinity }
  };
};

/**
 * Record an AI operation usage
 */
export const recordOperation = (operationType: AIOperationType): void => {
  const cost = OPERATION_COSTS[operationType];
  const { daily, monthly } = loadUsageData();

  // Update daily
  daily.operations[operationType] = (daily.operations[operationType] || 0) + 1;
  daily.totalCredits += cost;

  // Update monthly
  monthly.operations[operationType] = (monthly.operations[operationType] || 0) + 1;
  monthly.totalCredits += cost;

  saveUsageData(daily, monthly);
};

/**
 * Get current usage statistics
 */
export const getUsageStats = (): AIUsageStats => {
  const { daily, monthly } = loadUsageData();

  const dailyUsed = daily.totalCredits;
  const monthlyUsed = monthly.totalCredits;

  // Build recent operations list from daily data
  const recentOperations: AIUsageStats['recentOperations'] = [];
  for (const [type, count] of Object.entries(daily.operations)) {
    if (count && count > 0) {
      recentOperations.push({
        type: type as AIOperationType,
        credits: OPERATION_COSTS[type as AIOperationType] * count,
        timestamp: daily.date
      });
    }
  }

  return {
    today: {
      used: dailyUsed,
      limit: FREE_TIER_LIMITS.dailyCredits,
      remaining: Math.max(0, FREE_TIER_LIMITS.dailyCredits - dailyUsed),
      percentage: Math.min(100, (dailyUsed / FREE_TIER_LIMITS.dailyCredits) * 100)
    },
    month: {
      used: monthlyUsed,
      limit: FREE_TIER_LIMITS.monthlyCredits,
      remaining: Math.max(0, FREE_TIER_LIMITS.monthlyCredits - monthlyUsed),
      percentage: Math.min(100, (monthlyUsed / FREE_TIER_LIMITS.monthlyCredits) * 100)
    },
    recentOperations
  };
};

/**
 * Get human-readable operation name
 */
export const getOperationLabel = (type: AIOperationType): string => {
  const labels: Record<AIOperationType, string> = {
    player_evaluation: 'Player Evaluation',
    outreach_message: 'Outreach Message',
    event_plan: 'Event Plan',
    roster_extraction: 'Roster Scan',
    bulk_import: 'Bulk Import',
    player_parse: 'Player Details',
    duplicate_check: 'Duplicate Check',
    scout_bio: 'Scout Bio',
    scout_ai_chat: 'AI Chat',
    onboarding: 'Onboarding'
  };
  return labels[type] || type;
};

/**
 * Get credit cost for an operation
 */
export const getOperationCost = (type: AIOperationType): number => {
  return OPERATION_COSTS[type];
};

/**
 * Reset usage (for testing/admin)
 */
export const resetUsage = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};
