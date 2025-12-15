import { GoogleGenAI, Type } from "@google/genai";
import { PlayerEvaluation, ScoutingEvent, UserProfile, Player } from '../types';

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
  // Remove markdown code blocks markers
  clean = clean.replace(/```json/gi, '').replace(/```/g, '').trim();

  // Try to find the start and end of JSON structure
  const firstBrace = clean.indexOf('{');
  const firstBracket = clean.indexOf('[');
  
  // Determine if it's likely an object or array and extract it
  let startIdx = -1;
  let endIdx = -1;

  if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
      // It's an array
      startIdx = firstBracket;
      endIdx = clean.lastIndexOf(']');
  } else if (firstBrace !== -1) {
      // It's an object
      startIdx = firstBrace;
      endIdx = clean.lastIndexOf('}');
  }

  if (startIdx !== -1 && endIdx !== -1) {
      clean = clean.substring(startIdx, endIdx + 1);
  }

  return clean;
};

// --- PROMPT TEMPLATES ---

const buildStrategyPrompt = (context: string) => `
You are a **senior head scout and mentor at WARUBI**.

A new scout has joined the platform.

---

## Scout Profile
Here is what the scout has told us about themselves:
${context}

This can include:
- Their role (college coach, club coach, scout, analyst, agent)
- People they know (college coaches, club coaches, scouts)
- Tools they use (Hudl, Veo, recruiting software, tournament lists)
- Past experience and access points

---

## Your Job
Help the scout find players **quickly** by using what they already have.

1. Spot **Hidden Gold Mines** in their existing network or tools.
2. Give **3 very specific actions** they can do right now.
3. Keep everything:
   - Simple
   - High-impact
   - Easy to execute today

Most good ideas come from:
- Lead lists they already have
- Trusted colleagues they already know
- Players who already need help with recruiting

---

## How to Think (Use When Relevant)

- **If they are a college coach OR know college coaches**
  - Export the “Not Interested” or “Rejected” players from recruiting software.
  - Suggest replying to rejected recruit emails with the WARUBI free player evaluation tool.

- **Almost all coaches and scouts**
  - Check old tournament lists, camp lists, or recruiting software lists.
  - These players usually need help and are strong leads.

- **If they are a club coach**
  - Contact the top 2-3 players cut from ECNL, GA, NL, or academy tryouts.

- **If they use Hudl or Veo**
  - Watch last week’s opponent footage.
  - Identify the best opponent player and reach out to their coach.

- **For almost everyone**
  - Remind them they can run a showcase.
  - Keep it simple: pick a date, pick a location, confirm details with WARUBI HQ.
  - WARUBI supports the setup and marketing.

---

## Important Reminders
- WARUBI can help players at **almost any level**.
- What matters most:
  - The player is motivated
  - The player wants to improve
  - The player wants better academy, college, or pro chances
- When reaching out to new players:
  - Lead with value first
  - Use the **free player evaluation tools**
  - Help the player and family get real recruiting advice before selling anything

---

## Rules
- No generic advice.
  - No “network more”
  - No “post on social media”
- Every task must:
  - Use a **specific source** (list, tool, footage, contacts)
  - Be doable in **under 30 minutes**
  - Be clear and practical

---

## Output Format
Return **strict JSON only** in this format:

\`\`\`json
{
  "scoutPersona": "Two-word professional title",
  "welcomeMessage": "One short sentence explaining why this scout has leverage",
  "tasks": [
    {
      "title": "Short action name",
      "instruction": "Clear and simple step-by-step instruction",
      "whyItWorks": "One sentence explaining why this finds players"
    },
    {
      "title": "Short action name",
      "instruction": "Clear and simple step-by-step instruction",
      "whyItWorks": "One sentence explaining why this finds players"
    },
    {
      "title": "Short action name",
      "instruction": "Clear and simple step-by-step instruction",
      "whyItWorks": "One sentence explaining why this finds players"
    }
  ]
}
\`\`\`
`;

// --- SERVICE FUNCTIONS ---

// 0. Parse Player Details (Auto-Fill Form)
export const parsePlayerDetails = async (text: string): Promise<any> => {
    const ai = getAiClient();
    const prompt = `
        You are a data extraction assistant for a soccer scout.
        I will provide a block of raw text that might contain a player's bio, contact info, parents' info, and stats.

        Task: Extract specific fields to populate a submission form.
        
        Raw Text: "${text}"

        Extract these fields (use empty string if not found):
        - firstName
        - lastName
        - email (Player email)
        - phone (Player phone)
        - parentEmail (Any parent/guardian email found)
        - position (e.g. CM, ST)
        - dob (YYYY-MM-DD format if possible, otherwise string)
        - gradYear (Year only)
        - club (Club team name)
        - teamLevel (e.g. ECNL, Academy, Varsity, Regional)
        - region (City/State)
        - heightFt (Number)
        - heightIn (Number)
        - gpa (Number or String)
        
        Return strict JSON.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
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
        const text = response.text || "{}";
        const cleaned = cleanJson(text);
        return JSON.parse(cleaned);
    } catch (e) {
        console.error("Parse Error", e);
        return {};
    }
};

// 1. Evaluate Player (From Text or Image)
export const evaluatePlayer = async (
  inputData: string,
  isImage: boolean = false,
  mimeType: string = 'image/jpeg'
): Promise<PlayerEvaluation> => {
  const ai = getAiClient();
  
  const prompt = `
    You are a professional expert soccer scout for WARUBI. 
    Analyze the provided player information (which might be raw text notes, a stats list, or an image of a profile).
    
    Extract or infer the player's potential. If specific stats are missing, estimate based on the context or give a general assessment.
    
    Determine the 'scholarshipTier' based on this logic:
    - Tier 1: Top Academy, National Team youth, extremely high stats.
    - Tier 2: High level Regional, State Selection, solid stats.
    - Tier 3: Local Club, Developmental, raw talent.

    Determine the 'recommendedPathways' (can select multiple):
    - "College Pathway": Good GPA, decent level, interested in education.
    - "Development in Europe": High technical ability, elite potential, or looking for pro experience.
    - "Exposure Events": Needs visibility, unproven stats, or Tier 3/2 borderline.
    - "UEFA & German FA Coaching": If they express interest in coaching or leadership (rare).

    Return a strict JSON object with the following schema:
    {
      "score": number (0-100),
      "collegeLevel": string (e.g., "NCAA D1", "NCAA D2", "NAIA", "NCAA D3"),
      "scholarshipTier": string (Expected: "Tier 1", "Tier 2", or "Tier 3"),
      "recommendedPathways": string[] (Array of strings from the list above),
      "strengths": string[] (max 3),
      "weaknesses": string[] (max 3),
      "nextAction": string (short recommendation),
      "summary": string (1-2 sentences)
    }
  `;

  let response;
  
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

    if (isImage) {
        response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { inlineData: { mimeType, data: inputData } },
                    { text: prompt }
                ]
            },
            config
        });
    } else {
        response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `${prompt}\n\nPlayer Info:\n${inputData}`,
            config
        });
    }

    const text = response.text || "{}";
    const cleanedText = cleanJson(text);
    const parsed = JSON.parse(cleanedText) as PlayerEvaluation;

    // Normalization for Tier
    let tier = parsed.scholarshipTier;
    if (tier) {
        if (tier.toLowerCase().includes("tier 1")) tier = "Tier 1";
        else if (tier.toLowerCase().includes("tier 2")) tier = "Tier 2";
        else if (tier.toLowerCase().includes("tier 3")) tier = "Tier 3";
        else tier = "Tier 3";
    } else {
        tier = "Tier 3";
    }
    parsed.scholarshipTier = tier as "Tier 1" | "Tier 2" | "Tier 3";

    // Ensure array fields are actually arrays to prevent slice errors
    if (!Array.isArray(parsed.recommendedPathways)) parsed.recommendedPathways = ["Exposure Events"];
    if (!Array.isArray(parsed.strengths)) parsed.strengths = [];
    if (!Array.isArray(parsed.weaknesses)) parsed.weaknesses = [];

    return parsed;

  } catch (error) {
    console.error("AI Evaluation Error", error);
    // Fallback if AI fails
    return {
        score: 50,
        collegeLevel: "Unknown",
        scholarshipTier: "Tier 3",
        recommendedPathways: ["Exposure Events"],
        strengths: ["Review needed"],
        weaknesses: ["Data unclear"],
        nextAction: "Manual Review",
        summary: "AI could not process this input. Please check the data and try again."
    };
  }
};

// 2. Generate Event Plan
export const generateEventPlan = async (
    title: string,
    location: string,
    date: string,
    type: string,
    fee: string
): Promise<{ agenda: string[], marketingCopy: string, checklist: { task: string, completed: boolean }[] }> => {
    const ai = getAiClient();
    const prompt = `
        You are an event planner for WARUBI Sports.
        Create an "Event Kit" for a new soccer scouting event.

        Event Details:
        - Name: ${title}
        - Type: ${type}
        - Location: ${location}
        - Date: ${date}
        - Cost: ${fee}
        
        Generate 3 things:
        1. 'marketingCopy': A professional, exciting (but NOT aggressive) blurb suitable for WhatsApp/Instagram. 
           - Tone: Professional, welcoming, opportunity-focused.
           - Key Message: Focus on "Pathways to College Soccer, Europe, and Semi-Pro". 
           - Avoid: Do not use aggressive "sales" language like "Dream of being a pro" or "Make it big". Keep it grounded and professional.
           - Include: Mention date, location, and that spots are limited.
        
        2. 'agenda': A 5-6 item timeline. 
           - REQUIRED: You MUST include a "Pathway Presentation (Players & Families)" session. Specify that it should be in a classroom/conference room with internet access.
           - Typical flow: Arrival -> Presentation -> Warmup -> Games/Drills -> Closing.

        3. 'checklist': 5 critical tasks the scout must do before the event (e.g., Book field, Print rosters, Test Wifi for presentation).
        
        Return strict JSON.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
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
        const text = response.text || "{}";
        const cleanedText = cleanJson(text);
        const parsed = JSON.parse(cleanedText);
        
        // Defensive checks & formatting checklist
        const rawChecklist = Array.isArray(parsed.checklist) ? parsed.checklist : ["Secure Field", "Print Rosters"];
        const formattedChecklist = rawChecklist.map((task: string) => ({
            task: task,
            completed: false
        }));

        return {
            agenda: Array.isArray(parsed.agenda) ? parsed.agenda : ["09:00 AM - Arrival", "10:00 AM - Pathway Presentation", "11:00 AM - Matches"],
            marketingCopy: parsed.marketingCopy || `Join us for ${title}! ⚽️\n📍 ${location}\n📅 ${date}\nDiscover your pathway to college or pro soccer.`,
            checklist: formattedChecklist
        };
    } catch (e) {
        console.error("Event Gen Error", e);
        return {
            agenda: ["10:00 AM - Arrival", "10:30 AM - Pathway Presentation (Classroom)", "11:30 AM - Warmup", "12:00 PM - Matches", "14:00 PM - Closing"],
            marketingCopy: `⚽️ Upcoming Opportunity: ${title}\n\nJoin us at ${location} on ${date} for a professional Talent ID event.\n\nWe will be evaluating players for:\n✅ US College Scholarships\n✅ European Development Pathways\n✅ Semi-Pro Opportunities\n\nSpots are limited. Register now to secure your evaluation.`,
            checklist: [
                { task: "Confirm Field Booking", completed: false },
                { task: "Prepare Conference Room for Presentation", completed: false },
                { task: "Print Player Check-in List", completed: false },
                { task: "Check Wifi Connection", completed: false },
                { task: "Send Reminder Email to Players", completed: false }
            ]
        };
    }
};

// 3. Generate Weekly Tasks & Personalization (Now includes Questionnaire Data)
export const generateOnboardingData = async (
    role: string, 
    region: string,
    quizAnswers?: Record<string, string>
): Promise<{ tasks: string[], welcomeMessage: string, scoutPersona: string }> => {
    const ai = getAiClient();
    
    let context = `Role: ${role}, Region: ${region}.`;
    if (quizAnswers) {
        context += `
        Additional Context from Scout Questionnaire:
        - Primary Environment: ${quizAnswers['environment']}
        - Existing Access: ${quizAnswers['access']}
        - Contact Method: ${quizAnswers['contact']}
        - Main Motivation: ${quizAnswers['motivation']}
        `;
    }

    const prompt = buildStrategyPrompt(context);
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        scoutPersona: { type: Type.STRING },
                        welcomeMessage: { type: Type.STRING },
                        tasks: { 
                            type: Type.ARRAY, 
                            items: { 
                                type: Type.OBJECT,
                                properties: {
                                    title: { type: Type.STRING },
                                    instruction: { type: Type.STRING },
                                    whyItWorks: { type: Type.STRING }
                                }
                            } 
                        }
                    }
                }
            }
        });
        const text = response.text || "{}";
        const cleanedText = cleanJson(text);
        const parsed = JSON.parse(cleanedText);

        // Map structured tasks to strings for the UI (keeping backward compatibility with UI)
        let stringTasks: string[] = [];
        if (Array.isArray(parsed.tasks)) {
             stringTasks = parsed.tasks.map((t: any) => {
                 if (typeof t === 'string') return t;
                 // Combining Title and Instruction for the string array
                 return `${t.title}: ${t.instruction}`;
             });
        }

        return {
            scoutPersona: parsed.scoutPersona || "The Scout",
            welcomeMessage: parsed.welcomeMessage || "Welcome to the team.",
            tasks: stringTasks
        };
    } catch (e) {
        console.error("Strategy Gen Error", e);
        return {
            scoutPersona: "The Scout",
            welcomeMessage: "Welcome to the team! Let's find some talent.",
            tasks: ["Check your existing contact lists", "Review past game footage", "Scout a local match"]
        };
    }
};

// 4. Q&A
export const askScoutAI = async (question: string): Promise<string> => {
    const ai = getAiClient();
    const prompt = `
      You are a specialized expert mentor for soccer scouts at WARUBI.
      
      YOUR EXPERTISE:
      - 4 Flagship Pathways: College Pathway, Development in Europe (ITP), Exposure Events, Coaching Education.
      - Tools: ROI Calculator, Transfer Valuator, Free Assessments.

      ROLE:
      Be concise, direct, professional, and encouraging.
      
      RULES:
      1. Keep answers SHORT (max 150 words usually).
      2. Use bullet points for lists to make them easy to read.
      3. Always guide the scout to use the specific Warubi Tools (ROI Calculator, Assessment Link) when relevant.
      4. If asked about prices or specifics, refer to the "Pathways" tab.
      
      Question/Context: ${question}
    `;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text || "I couldn't find an answer to that.";
    } catch (e) {
        return "Service unavailable. Please try again.";
    }
};

// 5. Generate Outreach Message
export const generateOutreachMessage = async (
    scoutName: string,
    player: Player,
    templateType: string,
    assessmentLink?: string
): Promise<string> => {
    const ai = getAiClient();
    const prompt = `
        You are an assistant for a soccer scout named ${scoutName} working for WARUBI.
        Draft a ${templateType} message to a player named ${player.name}.
        
        Player Details:
        - Position: ${player.position}
        - Age: ${player.age}
        - Status: ${player.status}
        - Key Strengths: ${player.evaluation?.strengths.join(', ') || 'N/A'}
        - College Projection: ${player.evaluation?.collegeLevel || 'N/A'}
        
        The message should be:
        1. Professional but approachable.
        2. Short and concise (suitable for WhatsApp or Email).
        3. Mention specific strengths if available to show we did our homework.
        4. Include a clear call to action.
        ${assessmentLink ? `5. IMPORTANT: You MUST include this specific link for them to take a free assessment: ${assessmentLink}. Frame it as a "free evaluation" to see where they stand and get into our database.` : ''}
        
        Do not include subject lines, just the body.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        });
        return response.text || "Hi, I'd like to connect.";
    } catch (e) {
        return `Hi ${player.name}, this is ${scoutName} from WARUBI. I've reviewed your profile and see great potential. Let's connect!`;
    }
};

// 6. Bulk Extraction
export const extractPlayersFromBulkData = async (
  inputData: string,
  isImage: boolean = false,
  mimeType: string = 'image/jpeg'
): Promise<Partial<Player>[]> => {
  const ai = getAiClient();
  
  const prompt = `
    You are a high-speed data extraction engine for a soccer scouting platform.
    I have provided a roster, stats sheet, or list of players. 
    
    TASK:
    Extract each player into a structured JSON object.
    
    FIELDS TO EXTRACT:
    - name (string): The player's full name.
    - age (number): Default to 17 if not found.
    - position (string): e.g., "CM", "ST", "GK". Default "Unknown" if missing.
    - club (string): Current team or school.
    
    ESTIMATION (Based on context, league, or stats provided):
    - score (number): 0-100 recruitability score.
    - scholarshipTier (string): "Tier 1", "Tier 2", or "Tier 3".
    - recommendedPathways (string[]): "College Pathway", "Development in Europe", "Exposure Events".
    - summary (string): 1 brief sentence justifying the score/tier.

    OUTPUT:
    Return ONLY a JSON Array of objects. No markdown. No comments.
  `;

  // Strict Schema for Bulk Extraction to avoid parsing errors
  const bulkSchema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        age: { type: Type.NUMBER },
        position: { type: Type.STRING },
        club: { type: Type.STRING },
        evaluation: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            scholarshipTier: { type: Type.STRING },
            recommendedPathways: { type: Type.ARRAY, items: { type: Type.STRING } },
            summary: { type: Type.STRING },
          },
        },
      },
    },
  };

  try {
     let response;
     if (isImage) {
        response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { inlineData: { mimeType, data: inputData } },
                    { text: prompt }
                ]
            },
            config: { 
                responseMimeType: 'application/json',
                responseSchema: bulkSchema
            }
        });
     } else {
        response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `${prompt}\n\nDATA:\n${inputData}`,
            config: { 
                responseMimeType: 'application/json',
                responseSchema: bulkSchema
            }
        });
     }

     const text = response.text || "[]";
     const cleaned = cleanJson(text);
     
     try {
        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed)) {
            return parsed;
        } else {
            console.error("Parsed result is not an array:", parsed);
            return [];
        }
     } catch (parseError) {
        console.error("JSON Parse Error:", parseError, "\nCleaned Text:", cleaned);
        return [];
     }

  } catch (error) {
      console.error("Bulk extraction failed", error);
      return [];
  }
};

// 7. Draft Scout Bio
export const draftScoutBio = async (profileData: Partial<UserProfile>): Promise<string> => {
    const ai = getAiClient();
    
    // Construct experience string
    const expString = profileData.experience 
        ? profileData.experience.map(e => `${e.role} at ${e.org} (${e.duration})`).join(', ') 
        : 'None specified';

    const prompt = `
        You are a professional LinkedIn profile writer specializing in sports and scouting.
        Write a concise, professional bio (approx 3-4 sentences) for a soccer scout using this info:
        
        Name: ${profileData.name}
        Current Role: ${profileData.role}
        Region: ${profileData.region}
        Affiliation: ${profileData.affiliation || 'Independent'}
        Past Experience: ${expString}
        
        Tone: Authoritative, experienced, trustworthy. 
        Focus on their eye for talent and network.
        
        Return ONLY the bio text.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        });
        return response.text?.trim() || "";
    } catch (e) {
        return "Professional scout with experience in identifying talent and player development.";
    }
};

// 8. Check for Duplicates (AI)
export const checkPlayerDuplicates = async (
    candidate: Partial<Player>,
    existingPlayers: Player[]
): Promise<{ id: string; name: string; reason: string; confidence: string }[]> => {
    const ai = getAiClient();
    
    // Optimization: Filter existing players to a lighter format to save tokens
    const dbContext = existingPlayers.map(p => ({
        id: p.id,
        name: p.name,
        age: p.age,
        position: p.position,
        // Extract region/club from context if available
        meta: p.evaluation?.summary || p.interestedProgram || ""
    }));

    const prompt = `
        You are a data integrity agent for a player database.
        
        NEW CANDIDATE:
        Name: ${candidate.name}
        Age: ${candidate.age}
        Position: ${candidate.position}
        Region/Context: ${candidate.evaluation?.summary || candidate.interestedProgram || "N/A"}

        EXISTING DATABASE:
        ${JSON.stringify(dbContext)}

        TASK:
        Identify if this candidate is likely a DUPLICATE of anyone in the database.
        Look for:
        - Exact matches
        - Nicknames (Jon vs Jonathan, Mike vs Michael)
        - Typos (Thomson vs Thompson)
        - Same person, new entry
        
        Return a JSON Array of matches (empty if none):
        [{ "id": "existing_id", "name": "existing_name", "reason": "why it matches", "confidence": "High" | "Medium" }]
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            id: { type: Type.STRING },
                            name: { type: Type.STRING },
                            reason: { type: Type.STRING },
                            confidence: { type: Type.STRING }
                        }
                    }
                }
            }
        });
        
        const text = response.text || "[]";
        return JSON.parse(text);
    } catch (e) {
        console.error("Duplicate Check Error", e);
        return [];
    }
}