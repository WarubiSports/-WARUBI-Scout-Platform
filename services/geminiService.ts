
import { PlayerEvaluation, ScoutingEvent, UserProfile, Player, StrategyTask } from '../types';
import { canPerformOperation, recordOperation, AIOperationType } from './aiUsageService';
import { toast } from 'sonner';

// Custom error for AI usage limits
export class AIUsageLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AIUsageLimitError';
  }
}

// Check and record AI usage, throws if limit exceeded
const checkAndRecordUsage = (operationType: AIOperationType): void => {
  const check = canPerformOperation(operationType);
  if (!check.allowed) {
    throw new AIUsageLimitError(check.reason || 'AI usage limit reached');
  }
  recordOperation(operationType);
};

// Helper to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Proxy helper - calls the Supabase Edge Function with retry and graceful error handling
const callGeminiProxy = async (operation: string, payload: Record<string, any>): Promise<any> => {
  const proxyUrl = import.meta.env.VITE_GEMINI_PROXY_URL;
  if (!proxyUrl) {
    console.warn('VITE_GEMINI_PROXY_URL is not configured');
    toast.error('AI temporarily unavailable', {
      description: 'Service not configured. Using fallback.',
      duration: 3000
    });
    return null;
  }

  const attemptRequest = async (): Promise<any> => {
    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ operation, payload }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `Proxy request failed: ${response.status}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Operation failed');
    }

    return result.data;
  };

  // First attempt
  try {
    return await attemptRequest();
  } catch (firstError) {
    console.warn(`Gemini API first attempt failed for ${operation}:`, firstError);

    // Retry after 2s delay
    await delay(2000);

    try {
      return await attemptRequest();
    } catch (secondError) {
      // Both attempts failed - show toast and return null
      console.error(`Gemini API failed after retry for ${operation}:`, secondError);
      toast.error('AI temporarily unavailable', {
        description: 'Please try again in a moment.',
        duration: 4000
      });
      return null;
    }
  }
};

export const generateDailyStrategy = (players: Player[], events: ScoutingEvent[]): StrategyTask[] => {
    const tasks: StrategyTask[] = [];
    const topLead = players
        .filter(p => p.status === 'Lead' || p.status === 'Interested')
        .sort((a, b) => (b.evaluation?.score || 0) - (a.evaluation?.score || 0))[0];

    if (topLead) {
        tasks.push({
            id: 'task-lead',
            type: 'LEAD',
            title: 'Top Target',
            subtitle: `Convert ${topLead.name} (${topLead.evaluation?.score || 0})`,
            actionLabel: 'Message',
            actionLink: `TAB:OUTREACH:${topLead.id}`,
            impactLevel: 'HIGH',
            completed: false
        });
    } else {
        tasks.push({
            id: 'task-lead-new',
            type: 'LEAD',
            title: 'Pipeline Empty',
            subtitle: 'Add 3 new prospects to start.',
            actionLabel: 'Add Player',
            actionLink: 'MODAL:ADD_PLAYER',
            impactLevel: 'HIGH',
            completed: false
        });
    }

    const upcomingEvent = events
        .filter(e => new Date(e.date) >= new Date())
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

    if (upcomingEvent) {
        const daysAway = Math.ceil((new Date(upcomingEvent.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        tasks.push({
            id: 'task-event',
            type: 'EVENT',
            title: 'Event Prep',
            subtitle: `${upcomingEvent.title} is in ${daysAway} days.`,
            actionLabel: 'View Plan',
            actionLink: `TAB:EVENTS:${upcomingEvent.id}`,
            impactLevel: 'MEDIUM',
            completed: false
        });
    } else {
        tasks.push({
            id: 'task-outreach',
            type: 'OUTREACH',
            title: 'Expand Network',
            subtitle: 'Contact 3 club directors this week.',
            actionLabel: 'Open Templates',
            actionLink: 'TAB:OUTREACH',
            impactLevel: 'MEDIUM',
            completed: false
        });
    }

    const incompletePlayer = players.find(p => !p.evaluation || !p.position || p.position === 'Unknown');
    if (incompletePlayer) {
        tasks.push({
            id: 'task-cleanup',
            type: 'ADMIN',
            title: 'Data Hygiene',
            subtitle: `Update profile for ${incompletePlayer.name}.`,
            actionLabel: 'Edit',
            actionLink: `TAB:PLAYERS:${incompletePlayer.id}`,
            impactLevel: 'LOW',
            completed: false
        });
    } else {
        tasks.push({
            id: 'task-knowledge',
            type: 'ADMIN',
            title: 'Sharpen Skills',
            subtitle: 'Review the ITP pricing model.',
            actionLabel: 'Learn',
            actionLink: 'TAB:KNOWLEDGE',
            impactLevel: 'LOW',
            completed: false
        });
    }

    return tasks;
};

export const parsePlayerDetails = async (text: string): Promise<any> => {
    checkAndRecordUsage('player_parse');
    const result = await callGeminiProxy('parsePlayerDetails', { text });
    return result ?? {};
};

export const evaluatePlayer = async (inputData: string, isImage: boolean = false, mimeType: string = 'image/jpeg'): Promise<PlayerEvaluation> => {
  checkAndRecordUsage('player_evaluation');
  const result = await callGeminiProxy('evaluatePlayer', { inputData, isImage, mimeType });
  return result ?? {
      score: 50,
      collegeLevel: "Unknown",
      scholarshipTier: "Tier 3",
      recommendedPathways: ["Exposure Events"],
      strengths: ["Review needed"],
      weaknesses: ["Data unclear"],
      nextAction: "Manual Review",
      summary: "AI could not process this input."
  };
};

export const generateEventPlan = async (title: string, location: string, date: string, type: string, fee: string): Promise<{ agenda: string[], marketingCopy: string, checklist: { task: string, completed: boolean }[] }> => {
    checkAndRecordUsage('event_plan');
    const result = await callGeminiProxy('generateEventPlan', { title, location, date, type, fee });
    return result ?? { agenda: [], marketingCopy: "", checklist: [] };
};

export const extractPlayersFromBulkData = async (inputData: string, isImage: boolean = false, mimeType: string = 'image/jpeg'): Promise<Partial<Player>[]> => {
  checkAndRecordUsage('bulk_import');
  const result = await callGeminiProxy('extractPlayersFromBulkData', { inputData, isImage, mimeType });
  return result ?? [];
};

export const extractRosterFromPhoto = async (imageBase64: string, mimeType: string = 'image/jpeg'): Promise<Partial<Player>[]> => {
    checkAndRecordUsage('roster_extraction');
    const result = await callGeminiProxy('extractRosterFromPhoto', { imageBase64, mimeType });
    return result ?? [];
};

export const draftScoutBio = async (profileData: Partial<UserProfile>): Promise<string> => {
    checkAndRecordUsage('scout_bio');
    const result = await callGeminiProxy('draftScoutBio', {
        name: profileData.name,
        region: profileData.region
    });
    return result ?? "";
};

export const askScoutAI = async (question: string): Promise<string> => {
    checkAndRecordUsage('scout_ai_chat');
    const result = await callGeminiProxy('askScoutAI', { question });
    return result ?? "I'm having trouble connecting right now.";
};

export interface OutreachOptions {
    scoutBio?: string;
    language?: string;
}

export const generateOutreachMessage = async (
    scoutName: string,
    player: Player,
    templateType: string,
    assessmentLink?: string,
    options?: OutreachOptions
): Promise<string> => {
    checkAndRecordUsage('outreach_message');
    const result = await callGeminiProxy('generateOutreachMessage', {
        scoutName,
        player,
        templateType,
        assessmentLink,
        scoutBio: options?.scoutBio,
        language: options?.language || 'en'
    });
    return result ?? generateFallbackMessage(scoutName, player, templateType, assessmentLink, options);
};

// Check if scout bio mentions college/university experience
const hasCollegeExperience = (bio?: string): boolean => {
    if (!bio) return false;
    const collegePhrases = [
        'college', 'university', 'ncaa', 'naia', 'juco', 'd1', 'd2', 'd3',
        'division', 'played at', 'played for', 'student-athlete', 'student athlete',
        'scholarship', 'varsity'
    ];
    const lowerBio = bio.toLowerCase();
    return collegePhrases.some(phrase => lowerBio.includes(phrase));
};

const generateFallbackMessage = (
    scoutName: string,
    player: Player,
    templateType: string,
    assessmentLink?: string,
    options?: OutreachOptions
): string => {
    const position = player.position || 'player';
    const name = player.name || 'there';
    const hasCollege = hasCollegeExperience(options?.scoutBio);
    const eval_ = player.evaluation as any;
    const isEE = eval_?.source === 'exposure_engine';
    const bestFit = isEE ? eval_?.best_fit : null;
    const strengths = isEE && eval_?.key_strengths?.length ? eval_.key_strengths.slice(0, 2).join(' and ') : null;

    // WARM INTRO — for players who came through ExposureEngine
    if (isEE && bestFit && templateType === 'First Spark') {
        return `Hey ${name},

I saw you completed the ExposureEngine analysis — your results show ${bestFit} as your best fit.${strengths ? ` Key strengths: ${strengths}.` : ''}

I'm ${scoutName} with Warubi Sports. I work directly with programs at that level and think there are real opportunities for you.

Want to hop on a quick call to talk next steps?

Best,
${scoutName}`;
    }

    // ENGLISH TEMPLATES
    if (templateType === 'First Spark') {
        if (hasCollege) {
            return `Hey ${name},

I'm ${scoutName} and I work with Warubi Sports. I played college soccer in the US and now help players like you find the right path there.

I came across your profile and think you've got real potential as a ${position}. If playing in the US or at a European academy is something you're interested in, I'd love to chat about what that could look like for you.

${assessmentLink ? `Take 2 minutes to complete your free talent assessment here:\n${assessmentLink}\n` : ''}No pressure - just want to see if it's a good fit.

Best,
${scoutName}`;
        } else {
            return `Hey ${name},

I'm ${scoutName} with Warubi Sports. I work with European academies like FC Köln's ITP, Bundesliga programs, and 200+ college programs in the US to help players find the right opportunity.

I came across your profile and think you've got real potential as a ${position}. If playing in the US or at a European academy is something you're interested in, I'd love to chat about what that could look like for you.

${assessmentLink ? `Take 2 minutes to complete your free talent assessment here:\n${assessmentLink}\n` : ''}No pressure - just want to see if it's a good fit.

Best,
${scoutName}`;
        }
    }

    if (templateType === 'Follow-up') {
        return `Hey ${name},

Just following up on my last message. I know these things can get lost in the shuffle.

Still interested in chatting about opportunities in the US or Europe if you are. Happy to answer any questions you might have about the process.

${scoutName}`;
    }

    if (templateType === 'Invite to ID') {
        return `Hey ${name},

We're hosting an ID Day soon. It's a chance for players to showcase their abilities in front of US college coaches, European academy scouts, and recruiters.

Based on what I've seen, I think you'd do well. No commitment needed - just come play and see what doors it opens.

Interested?

${scoutName}`;
    }

    if (templateType === 'Request Video') {
        return `Hey ${name},

Do you have any recent game footage or highlights I could take a look at? Doesn't need to be professional quality - phone recordings work fine.

It would help me get a better sense of your game and see which programs might be the best fit.

${scoutName}`;
    }

    // Default English
    return `Hey ${name},

I'm ${scoutName} with Warubi Sports. I'd love to connect about your football future and discuss some pathways that could be a great fit.

${assessmentLink ? `Start here: ${assessmentLink}` : 'Let me know if you have a few minutes to chat.'}

Best,
${scoutName}`;
};

export interface BulkOutreachResult {
  id: string
  message: string
}

export const bulkGenerateOutreach = async (
  scoutName: string,
  players: Array<{ id: string; name: string; position: string; age: number; club: string }>,
  templateType: string,
  options?: OutreachOptions
): Promise<BulkOutreachResult[]> => {
  // Chunk into batches of 10
  const chunks: (typeof players)[] = []
  for (let i = 0; i < players.length; i += 10) {
    chunks.push(players.slice(i, i + 10))
  }
  const results: BulkOutreachResult[] = []
  for (const chunk of chunks) {
    checkAndRecordUsage('bulk_outreach')
    const chunkResult = await callGeminiProxy('bulkGenerateOutreach', {
      scoutName,
      scoutBio: options?.scoutBio,
      language: options?.language || 'en',
      players: chunk,
      templateType,
    })
    if (Array.isArray(chunkResult)) {
      results.push(...chunkResult)
    }
  }
  return results
}

export const checkPlayerDuplicates = async (candidate: Partial<Player>, existingPlayers: Player[]): Promise<{ id: string; name: string; reason: string; confidence: string }[]> => {
    checkAndRecordUsage('duplicate_check');
    const result = await callGeminiProxy('checkPlayerDuplicates', {
        candidate,
        existingPlayers
    });
    return result ?? [];
};

export const generateOnboardingData = async (role: string, region: string, quizAnswers?: Record<string, string>): Promise<{ tasks: string[], welcomeMessage: string, scoutPersona: string }> => {
    checkAndRecordUsage('onboarding');
    const result = await callGeminiProxy('generateOnboardingData', {
        role,
        region,
        quizAnswers
    });
    return result ?? { scoutPersona: "The Scout", welcomeMessage: "Welcome", tasks: [] };
};
