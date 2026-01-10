// Supabase Edge Function: Gemini API Proxy
// This function proxies all Gemini AI calls to keep the API key secure on the server

import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.21.0";

// CORS headers for allowed origins
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Will be restricted in production
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Get allowed origins based on environment
const getAllowedOrigins = (): string[] => {
  return [
    'http://localhost:5200',
    'http://localhost:5173',
    'https://warubi-scout.vercel.app',
    'https://warubi-scout-platform.vercel.app',
  ];
};

// Validate origin
const isOriginAllowed = (origin: string | null): boolean => {
  if (!origin) return false;
  const allowed = getAllowedOrigins();
  return allowed.some(o => origin.startsWith(o));
};

// Helper to strip Markdown code blocks and find JSON structure
const cleanJson = (text: string): string => {
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

// Initialize Gemini client
const getAiClient = () => {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }
  return new GoogleGenerativeAI(apiKey);
};

// Operation handlers
const operations: Record<string, (payload: any) => Promise<any>> = {
  // Parse player details from text
  async parsePlayerDetails(payload: { text: string }) {
    const ai = getAiClient();
    const model = ai.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
      }
    });

    const prompt = `Extract specific fields from this text to populate a soccer scout's submission form: "${payload.text}"

    Return a JSON object with these fields (use empty string if not found):
    - firstName: string
    - lastName: string
    - email: string
    - phone: string
    - parentEmail: string
    - position: string
    - dob: string
    - gradYear: string
    - club: string
    - teamLevel: string
    - region: string
    - heightFt: string
    - heightIn: string
    - gpa: string`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return JSON.parse(cleanJson(text));
  },

  // Evaluate a player
  async evaluatePlayer(payload: { inputData: string; isImage?: boolean; mimeType?: string }) {
    const ai = getAiClient();
    const model = ai.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
      }
    });

    const prompt = `Analyze the player info. Determine score (0-100), scholarshipTier (Tier 1-3), and recommendedPathways.

    Return a JSON object with:
    - score: number (0-100)
    - collegeLevel: string
    - scholarshipTier: string (Tier 1, Tier 2, or Tier 3)
    - recommendedPathways: string[]
    - strengths: string[]
    - weaknesses: string[]
    - nextAction: string
    - summary: string`;

    let result;
    if (payload.isImage) {
      result = await model.generateContent([
        { inlineData: { mimeType: payload.mimeType || 'image/jpeg', data: payload.inputData } },
        { text: prompt }
      ]);
    } else {
      result = await model.generateContent(`${prompt}\n\nPlayer Info:\n${payload.inputData}`);
    }

    const text = result.response.text();
    return JSON.parse(cleanJson(text));
  },

  // Generate event plan
  async generateEventPlan(payload: { title: string; location: string; date: string; type: string; fee: string }) {
    const ai = getAiClient();
    const model = ai.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
      }
    });

    const prompt = `Create an "Event Kit" for ${payload.title} at ${payload.location} on ${payload.date}. Event type: ${payload.type}, Fee: ${payload.fee}.

    Return a JSON object with:
    - agenda: string[] (list of agenda items with times)
    - marketingCopy: string (compelling description for social media)
    - checklist: string[] (list of tasks to prepare)`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = JSON.parse(cleanJson(text));

    return {
      agenda: parsed.agenda || [],
      marketingCopy: parsed.marketingCopy || "",
      checklist: (parsed.checklist || []).map((t: string) => ({ task: t, completed: false }))
    };
  },

  // Extract players from bulk data
  async extractPlayersFromBulkData(payload: { inputData: string; isImage?: boolean; mimeType?: string }) {
    const ai = getAiClient();
    const model = ai.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
      }
    });

    const prompt = `Extract each player into a structured JSON array.

    Return an array of objects, each with:
    - name: string
    - age: number (if available)
    - position: string
    - club: string
    - evaluation: { score: number, scholarshipTier: string, summary: string } (optional)`;

    let result;
    if (payload.isImage) {
      result = await model.generateContent([
        { inlineData: { mimeType: payload.mimeType || 'image/jpeg', data: payload.inputData } },
        { text: prompt }
      ]);
    } else {
      result = await model.generateContent(`${prompt}\n\nDATA:\n${payload.inputData}`);
    }

    const text = result.response.text();
    return JSON.parse(cleanJson(text));
  },

  // Extract roster from photo
  async extractRosterFromPhoto(payload: { imageBase64: string; mimeType?: string }) {
    const ai = getAiClient();
    const model = ai.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
      }
    });

    const prompt = `Extract player details from this tournament roster photo. Find: Full Name, Jersey #, Email, and Phone.

    Return a JSON array of objects, each with:
    - name: string (required)
    - position: string (Jersey # or Position)
    - email: string
    - phone: string
    - notes: string`;

    const result = await model.generateContent([
      { inlineData: { mimeType: payload.mimeType || 'image/jpeg', data: payload.imageBase64 } },
      { text: prompt }
    ]);

    const text = result.response.text();
    return JSON.parse(cleanJson(text));
  },

  // Draft scout bio
  async draftScoutBio(payload: { name: string; region: string }) {
    const ai = getAiClient();
    const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `Write a professional LinkedIn bio (3-4 sentences) for scout ${payload.name} from ${payload.region}. Focus on soccer scouting expertise, talent identification, and connecting players with opportunities.`;

    const result = await model.generateContent(prompt);
    return result.response.text()?.trim() || "";
  },

  // Ask Scout AI (chat)
  async askScoutAI(payload: { question: string }) {
    const ai = getAiClient();
    const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const result = await model.generateContent(payload.question);
    return result.response.text() || "";
  },

  // Generate outreach message
  async generateOutreachMessage(payload: { scoutName: string; player: any; templateType: string; assessmentLink?: string }) {
    const ai = getAiClient();
    const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const templateContext: Record<string, string> = {
      'First Spark': `This is the FIRST contact with the player. Introduce yourself, explain who Warubi Scout is (an elite scouting network connected to FC Köln's International Talent Program and 200+ US college programs), why you noticed them, and what opportunities exist. Create urgency but be genuine.`,
      'Invite to ID': `Invite them to an upcoming ID Day or Showcase event. Explain what happens at these events (professional evaluation, video footage, direct exposure to coaches). Include specific benefits of attending.`,
      'Request Video': `Ask them to submit highlight footage. Explain why video is essential for the evaluation process and what coaches look for. Be specific about what to include (game footage, position-specific clips).`,
      'Follow-up': `This is a follow-up after no response. Reference your previous outreach, add new value (recent placement news, upcoming deadline, limited spots). Create gentle urgency without being pushy.`
    };

    const prompt = `You are ${payload.scoutName}, an elite soccer scout for Warubi Sports, which connects talented players to FC Köln's International Talent Program in Germany and 200+ college programs in the US.

Write a compelling ${payload.templateType} message to ${payload.player.name}.

PLAYER CONTEXT:
- Position: ${payload.player.position || 'Unknown'}
- Age: ${payload.player.age || 'Unknown'} years old
- Club: ${payload.player.club || 'Unknown'}
${payload.player.evaluation ? `- Scout Score: ${payload.player.evaluation.score}/100` : ''}

MESSAGE TYPE: ${templateContext[payload.templateType] || 'Professional introduction and next steps.'}

REQUIREMENTS:
1. LENGTH: 4-6 sentences minimum. This needs to be substantive enough to build trust.
2. PERSONALIZATION: Reference their position specifically (what scouts look for in a ${payload.player.position}).
3. CREDIBILITY: Mention Warubi's track record (200+ annual placements, FC Köln partnership, NCAA network).
4. VALUE: Explain what's in it for THEM (free evaluation, exposure, pathway options).
5. ${payload.assessmentLink ? `CALL TO ACTION: Include this link naturally for their free talent assessment: ${payload.assessmentLink}` : 'CALL TO ACTION: Suggest a quick call or ask them to reply with questions.'}
6. FORMAT: Use line breaks for WhatsApp/text readability. Start with a personalized greeting.

Return ONLY the message body. No "Here's your message" intro. One polished message ready to send.`;

    const result = await model.generateContent(prompt);
    return result.response.text()?.trim() || "";
  },

  // Check for duplicate players
  async checkPlayerDuplicates(payload: { candidate: any; existingPlayers: any[] }) {
    const ai = getAiClient();
    const model = ai.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
      }
    });

    const prompt = `Identify if this candidate is a duplicate of any existing player.

    Candidate: ${JSON.stringify(payload.candidate)}

    Existing Players (first 20): ${JSON.stringify(payload.existingPlayers.slice(0, 20))}

    Return a JSON array of potential matches, each with:
    - id: string (ID of the matching existing player)
    - name: string (name of the matching player)
    - reason: string (why this might be a duplicate)
    - confidence: string ("high", "medium", or "low")

    Return empty array [] if no duplicates found.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return JSON.parse(cleanJson(text));
  },

  // Generate onboarding data
  async generateOnboardingData(payload: { role: string; region: string; quizAnswers?: Record<string, string> }) {
    const ai = getAiClient();
    const model = ai.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
      }
    });

    const prompt = `Generate onboarding strategy for a ${payload.role} in ${payload.region} with these goals: ${JSON.stringify(payload.quizAnswers || {})}.

    Return a JSON object with:
    - scoutPersona: string (a catchy title like "The Connector" or "The Analyst")
    - welcomeMessage: string (personalized welcome message)
    - tasks: array of { title: string, instruction: string }`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = JSON.parse(cleanJson(text));

    return {
      scoutPersona: parsed.scoutPersona || "The Scout",
      welcomeMessage: parsed.welcomeMessage || "Welcome to Warubi.",
      tasks: (parsed.tasks || []).map((t: any) => `${t.title}: ${t.instruction}`)
    };
  },
};

// Main handler
Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Validate origin in production
  const origin = req.headers.get('origin');
  const responseHeaders = {
    ...corsHeaders,
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': origin && isOriginAllowed(origin) ? origin : corsHeaders['Access-Control-Allow-Origin'],
  };

  try {
    const { operation, payload } = await req.json();

    // Validate operation
    if (!operation || typeof operation !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid operation' }),
        { status: 400, headers: responseHeaders }
      );
    }

    // Check if operation exists
    const handler = operations[operation];
    if (!handler) {
      return new Response(
        JSON.stringify({ error: `Unknown operation: ${operation}` }),
        { status: 400, headers: responseHeaders }
      );
    }

    // Execute operation
    const result = await handler(payload || {});

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { status: 200, headers: responseHeaders }
    );

  } catch (error) {
    console.error('Gemini proxy error:', error);

    // Return error response
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
        success: false
      }),
      { status: 500, headers: responseHeaders }
    );
  }
});
