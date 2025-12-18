
import { GoogleGenAI, Type } from "@google/genai";
import { PlayerEvaluation, ScoutingEvent, UserProfile, Player, StrategyTask } from '../types';

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing. Please check your environment variables.");
  }
  return new GoogleGenAI({ apiKey });
};

// Helper to strip Markdown code blocks and find JSON structure
const cleanJson = (text: string) => {
  let clean = text.trim();
  clean = clean.replace(/```json/gi, '').replace(/```/g, '').trim();

  const firstBrace = clean.indexOf('{');
  const firstBracket = clean.indexOf('[');
  
  let startIdx = -1;
  let endIdx = -1;

  if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
      startIdx = firstBracket;
      endIdx = clean.lastIndexOf(']');
  } else if (firstBrace !== -1) {
      startIdx = firstBrace;
      endIdx = clean.lastIndexOf('}');
  }

  if (startIdx !== -1 && endIdx !== -1) {
      clean = clean.substring(startIdx, endIdx + 1);
  }

  return clean;
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
    const ai = getAiClient();
    const prompt = `Extract specific fields from this text to populate a soccer scout's submission form: "${text}"`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        firstName: { type: Type.STRING },
                        lastName: { type: Type.STRING },
                        email: { type: Type.STRING },
                        phone: { type: Type.STRING },
                        parentEmail: { type: Type.STRING },
                        position: { type: Type.STRING },
                        dob: { type: Type.STRING },
                        gradYear: { type: Type.STRING },
                        club: { type: Type.STRING },
                        teamLevel: { type: Type.STRING },
                        region: { type: Type.STRING },
                        heightFt: { type: Type.STRING },
                        heightIn: { type: Type.STRING },
                        gpa: { type: Type.STRING },
                    }
                }
            }
        });
        const textResponse = response.text || "{}";
        const cleaned = cleanJson(textResponse);
        return JSON.parse(cleaned);
    } catch (e) {
        return {};
    }
};

export const evaluatePlayer = async (inputData: string, isImage: boolean = false, mimeType: string = 'image/jpeg'): Promise<PlayerEvaluation> => {
  const ai = getAiClient();
  const prompt = `Analyze the player info. Determine score (0-100), scholarshipTier (Tier 1-3), and recommendedPathways. Return strict JSON.`;
  try {
    const config = {
        responseMimeType: 'application/json',
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                score: { type: Type.NUMBER },
                collegeLevel: { type: Type.STRING },
                scholarshipTier: { type: Type.STRING }, 
                recommendedPathways: { type: Type.ARRAY, items: { type: Type.STRING } },
                strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
                nextAction: { type: Type.STRING },
                summary: { type: Type.STRING }
            }
        }
    };
    let response;
    if (isImage) {
        response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: { parts: [{ inlineData: { mimeType, data: inputData } }, { text: prompt }] },
            config
        });
    } else {
        response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: `${prompt}\n\nPlayer Info:\n${inputData}`,
            config
        });
    }
    const textResponse = response.text || "{}";
    const cleanedText = cleanJson(textResponse);
    return JSON.parse(cleanedText) as PlayerEvaluation;
  } catch (error) {
    return {
        score: 50,
        collegeLevel: "Unknown",
        scholarshipTier: "Tier 3",
        recommendedPathways: ["Exposure Events"],
        strengths: ["Review needed"],
        weaknesses: ["Data unclear"],
        nextAction: "Manual Review",
        summary: "AI could not process this input."
    };
  }
};

export const generateEventPlan = async (title: string, location: string, date: string, type: string, fee: string): Promise<{ agenda: string[], marketingCopy: string, checklist: { task: string, completed: boolean }[] }> => {
    const ai = getAiClient();
    const prompt = `Create an "Event Kit" for ${title} at ${location}. Return strict JSON.`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        agenda: { type: Type.ARRAY, items: { type: Type.STRING } },
                        marketingCopy: { type: Type.STRING },
                        checklist: { type: Type.ARRAY, items: { type: Type.STRING } }
                    }
                }
            }
        });
        const textResponse = response.text || "{}";
        const cleanedText = cleanJson(textResponse);
        const parsed = JSON.parse(cleanedText);
        return {
            agenda: parsed.agenda || [],
            marketingCopy: parsed.marketingCopy || "",
            checklist: (parsed.checklist || []).map((t: string) => ({ task: t, completed: false }))
        };
    } catch (e) {
        return { agenda: [], marketingCopy: "", checklist: [] };
    }
};

export const extractPlayersFromBulkData = async (inputData: string, isImage: boolean = false, mimeType: string = 'image/jpeg'): Promise<Partial<Player>[]> => {
  const ai = getAiClient();
  const prompt = `Extract each player into a structured JSON array.`;
  const bulkSchema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        age: { type: Type.NUMBER },
        position: { type: Type.STRING },
        club: { type: Type.STRING },
        evaluation: { type: Type.OBJECT, properties: { score: { type: Type.NUMBER }, scholarshipTier: { type: Type.STRING }, summary: { type: Type.STRING } } }
      }
    }
  };
  try {
     let response;
     if (isImage) {
        response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts: [{ inlineData: { mimeType, data: inputData } }, { text: prompt }] },
            config: { responseMimeType: 'application/json', responseSchema: bulkSchema }
        });
     } else {
        response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `${prompt}\n\nDATA:\n${inputData}`,
            config: { responseMimeType: 'application/json', responseSchema: bulkSchema }
        });
     }
     const textResponse = response.text || "[]";
     const cleaned = cleanJson(textResponse);
     return JSON.parse(cleaned);
  } catch (error) {
      return [];
  }
};

export const extractRosterFromPhoto = async (imageBase64: string, mimeType: string = 'image/jpeg'): Promise<Partial<Player>[]> => {
    const ai = getAiClient();
    const prompt = `Extract player details from this tournament roster photo. Find: Full Name, Jersey #, Email, and Phone. Return a strict JSON Array.`;
    const schema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                name: { type: Type.STRING },
                position: { type: Type.STRING, description: "Jersey # or Pos" },
                email: { type: Type.STRING },
                phone: { type: Type.STRING },
                notes: { type: Type.STRING }
            },
            required: ["name"]
        }
    };
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: {
                parts: [
                    { inlineData: { mimeType, data: imageBase64 } },
                    { text: prompt }
                ]
            },
            config: {
                responseMimeType: 'application/json',
                responseSchema: schema
            }
        });
        const textResponse = response.text || "[]";
        const cleaned = cleanJson(textResponse);
        return JSON.parse(cleaned);
    } catch (error) {
        throw error;
    }
};

export const draftScoutBio = async (profileData: Partial<UserProfile>): Promise<string> => {
    const ai = getAiClient();
    const prompt = `Write a professional LinkedIn bio for scout ${profileData.name} from ${profileData.region}.`;
    try {
        const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
        return response.text?.trim() || "";
    } catch (e) {
        return "";
    }
};

export const askScoutAI = async (question: string): Promise<string> => {
    const ai = getAiClient();
    try {
        const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: question });
        return response.text || "";
    } catch (e) {
        return "I'm having trouble connecting right now.";
    }
};

export const generateOutreachMessage = async (scoutName: string, player: Player, templateType: string, assessmentLink?: string): Promise<string> => {
    const ai = getAiClient();
    const prompt = `You are an elite soccer scout. Write a single, concise, professional ${templateType} message to player ${player.name} from scout ${scoutName}.
    
    Rules:
    1. Tone: Professional, authoritative, yet encouraging.
    2. Context: ${player.position} player, ${player.age} years old.
    3. Call to Action: ${assessmentLink ? `Naturally integrate this mandatory link for their performance profile: ${assessmentLink}` : 'Do not include any links. Focus on setting up a discovery call.'}
    4. Format: Return ONLY the message body. No subject line, no conversational filler like "Here is your message", and NO multiple options. One perfect message.
    5. Platform: The message will be sent via WhatsApp or Email. Use line breaks for readability.`;
    
    try {
        const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
        return response.text?.trim() || `Hi ${player.name}, this is ${scoutName}. I've been watching your progress and would like to discuss some potential pathways for you. ${assessmentLink ? `Please start by filling out your profile here: ${assessmentLink}` : ''}`;
    } catch (e) {
        return `Hi ${player.name}, I'm ${scoutName} with Warubi Scout. Let's discuss your football future.`;
    }
};

export const checkPlayerDuplicates = async (candidate: Partial<Player>, existingPlayers: Player[]): Promise<{ id: string; name: string; reason: string; confidence: string }[]> => {
    const ai = getAiClient();
    const prompt = `Identify if this candidate is a duplicate of any existing player. candidate: ${JSON.stringify(candidate)}, existing: ${JSON.stringify(existingPlayers.slice(0, 20))}. Return JSON Array.`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: { id: { type: Type.STRING }, name: { type: Type.STRING }, reason: { type: Type.STRING }, confidence: { type: Type.STRING } }
                    }
                }
            }
        });
        const textResponse = response.text || "[]";
        const cleaned = cleanJson(textResponse);
        return JSON.parse(cleaned);
    } catch (e) {
        return [];
    }
};

export const generateOnboardingData = async (role: string, region: string, quizAnswers?: Record<string, string>): Promise<{ tasks: string[], welcomeMessage: string, scoutPersona: string }> => {
    const ai = getAiClient();
    const prompt = `Generate onboarding strategy for a ${role} in ${region} with these goals: ${JSON.stringify(quizAnswers)}. Return JSON.`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        scoutPersona: { type: Type.STRING },
                        welcomeMessage: { type: Type.STRING },
                        tasks: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, instruction: { type: Type.STRING } } } }
                    }
                }
            }
        });
        const textResponse = response.text || "{}";
        const cleanedText = cleanJson(textResponse);
        const parsed = JSON.parse(cleanedText);
        return {
            scoutPersona: parsed.scoutPersona || "The Scout",
            welcomeMessage: parsed.welcomeMessage || "Welcome to Warubi.",
            tasks: (parsed.tasks || []).map((t: any) => `${t.title}: ${t.instruction}`)
        };
    } catch (e) {
        return { scoutPersona: "The Scout", welcomeMessage: "Welcome", tasks: [] };
    }
};
