import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';
import { z } from 'npm:zod@3.25.76';
import { 
  SUPABASE_URL as supabaseUrl,
  SERVICE_ROLE_KEY as serviceRoleKey,
  OPENAI_API_KEY as openaiApiKey,
  getCorsHeaders 
} from '../_shared/config.ts';

const supabase = createClient(supabaseUrl, serviceRoleKey);

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

// Zod schemas for validation
const RequestDataSchema = z.object({
  entryContent: z.string().min(1).max(50000).optional(),
  userGoals: z.string().min(1).max(2000).optional(),
  preferences: z.string().max(1000).optional(),
  existingElements: z.array(z.unknown()).max(50).optional(),
  journalSummaries: z.array(z.string().max(1000)).max(100).optional(),
  moodboardData: z.unknown().optional(),
});

const RequestBodySchema = z.object({
  type: z.enum(['summarize', 'generate_moodboard', 'generate_insights', 'generate_advanced_moodboard', 'analyze_progress']),
  data: RequestDataSchema,
  csrf_token: z.string().min(32, 'CSRF token required'),
});

interface RequestBody {
  type: 'summarize' | 'generate_moodboard' | 'generate_insights' | 'generate_advanced_moodboard' | 'analyze_progress';
  data: {
    entryContent?: string;
    userGoals?: string;
    preferences?: string;
    existingElements?: unknown[];
    journalSummaries?: string[];
    moodboardData?: unknown;
  };
  csrf_token: string;
}

const validateInput = (type: string, data: Record<string, unknown>): string | null => {
  // Basic type validation
  if (!type || typeof type !== 'string') {
    return 'Invalid or missing type parameter';
  }

  const validTypes = ['summarize', 'generate_moodboard', 'generate_insights', 'generate_advanced_moodboard', 'analyze_progress'];
  if (!validTypes.includes(type)) {
    return `Invalid type. Must be one of: ${validTypes.join(', ')}`;
  }

  if (!data || typeof data !== 'object') {
    return 'Invalid or missing data parameter';
  }

  // Type-specific validation
  switch (type) {
    case 'summarize':
      if (!data.entryContent || typeof data.entryContent !== 'string') {
        return 'entryContent must be a non-empty string';
      }
      if (data.entryContent.length > 10000) {
        return 'entryContent exceeds maximum length of 10000 characters';
      }
      break;

    case 'generate_moodboard':
    case 'generate_advanced_moodboard':
      if (!data.userGoals || typeof data.userGoals !== 'string') {
        return 'userGoals must be a non-empty string';
      }
      if (data.userGoals.length > 2000) {
        return 'userGoals exceeds maximum length of 2000 characters';
      }
      if (data.preferences && typeof data.preferences !== 'string') {
        return 'preferences must be a string';
      }
      if (data.preferences && data.preferences.length > 1000) {
        return 'preferences exceeds maximum length of 1000 characters';
      }
      if (data.existingElements && !Array.isArray(data.existingElements)) {
        return 'existingElements must be an array';
      }
      if (data.existingElements && data.existingElements.length > 50) {
        return 'existingElements exceeds maximum length of 50 items';
      }
      break;

    case 'generate_insights':
      if (!data.journalSummaries || !Array.isArray(data.journalSummaries)) {
        return 'journalSummaries must be an array';
      }
      if (data.journalSummaries.length === 0) {
        return 'journalSummaries cannot be empty';
      }
      if (data.journalSummaries.length > 100) {
        return 'journalSummaries exceeds maximum length of 100 items';
      }
      for (const summary of data.journalSummaries) {
        if (typeof summary !== 'string') {
          return 'All journalSummaries items must be strings';
        }
        if (summary.length > 1000) {
          return 'journalSummary item exceeds maximum length of 1000 characters';
        }
      }
      break;

    case 'analyze_progress':
      if (!data.moodboardData) {
        return 'moodboardData is required';
      }
      if (!data.journalSummaries || !Array.isArray(data.journalSummaries)) {
        return 'journalSummaries must be an array';
      }
      if (data.journalSummaries.length > 100) {
        return 'journalSummaries exceeds maximum length of 100 items';
      }
      break;
  }

  return null;
}

// CSRF token validation
const validateCSRFToken = async (token: string, userId: string): Promise<boolean> => {
  try {
    // Get stored token for user
    const { data: storedTokens, error: fetchError } = await supabase
      .from('csrf_tokens')
      .select('token_hash, expires_at')
      .eq('user_id', userId)
      .eq('used', false)
      .gte('expires_at', new Date().toISOString())
      .limit(1);

    if (fetchError || !storedTokens || storedTokens.length === 0) {
      return false;
    }

    // Hash the provided token
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const tokenHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    return tokenHash === storedTokens[0].token_hash;
  } catch (error) {
    console.error('CSRF validation error:', error);
    return false;
  }
};

const sanitizeInput = (input: string): string => {
  // Remove potentially harmful content and limit length
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: URIs
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .substring(0, 50000); // Hard limit on input length
};

const checkRateLimit = async (userId: string): Promise<boolean> => {
  // Simple rate limiting: max 50 requests per hour per user
  // TODO: Replace with Redis or Supabase's rate-limit extension for production scale
  // Current implementation uses database storage which may not scale well under high load
  try {
    // For now, we'll use a simple database approach with Supabase storage
    const { data: rateLimitData } = await supabase
      .from('user_rate_limits')
      .select('request_count, last_reset')
      .eq('user_id', userId)
      .maybeSingle();

    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    if (!rateLimitData) {
      // First request for this user
      await supabase.from('user_rate_limits').insert({
        user_id: userId,
        request_count: 1,
        last_reset: now.toISOString()
      });
      return true;
    }

    const lastReset = new Date(rateLimitData.last_reset);
    
    if (lastReset < oneHourAgo) {
      // Reset the counter
      await supabase.from('user_rate_limits')
        .update({ request_count: 1, last_reset: now.toISOString() })
        .eq('user_id', userId);
      return true;
    }

    if (rateLimitData.request_count >= 50) {
      return false; // Rate limit exceeded
    }

    // Increment counter
    await supabase.from('user_rate_limits')
      .update({ request_count: rateLimitData.request_count + 1 })
      .eq('user_id', userId);
    
    return true;
  } catch (error) {
    console.error('Rate limit check error:', error);
    return true; // Allow request if rate limit check fails
  }
};

const makeOpenAIRequest = async (messages: Array<{ role: string; content: string }>, maxTokens: number = 1000): Promise<string> => {
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  // Sanitize all message content
  const sanitizedMessages = messages.map(msg => ({
    ...msg,
    content: sanitizeInput(msg.content)
  }));

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: sanitizedMessages,
        max_tokens: Math.min(maxTokens, 2000), // Hard limit on tokens
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      // Log detailed error for debugging
      console.error('OpenAI API Error - Status:', response.status);
      console.error('OpenAI API Error - Details:', errorData);
      // Return generic error to client
      throw new Error('An internal error occurred while generating content');
    }

    const data: OpenAIResponse = await response.json();
    return data.choices[0]?.message?.content || '';
  } catch (error) {
    // Log detailed error for debugging
    console.error('OpenAI API Error:', error);
    // Throw generic error to client
    throw new Error('An internal error occurred while generating content');
  }
};

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check rate limiting
    const rateLimitOk = await checkRateLimit(user.id);
    if (!rateLimitOk) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const requestBody = await req.json();

    // Validate request body with Zod
    try {
      const validatedBody = RequestBodySchema.parse(requestBody);
      const { type, data, csrf_token } = validatedBody;

      // Validate CSRF token
      const csrfValid = await validateCSRFToken(csrf_token, user.id);
      if (!csrfValid) {
        return new Response(JSON.stringify({ error: 'Invalid CSRF token' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      let result: unknown;

      switch (type) {
      case 'summarize': {
        const { entryContent } = data;
        const prompt = `Summarize this journal entry in 2-3 sentences, focusing on key emotions, insights, and progress toward goals: "${entryContent}"`;
        
        const summary = await makeOpenAIRequest([
          { role: 'user', content: prompt }
        ], 150);
        
        result = { summary };
        break;
      }

      case 'generate_moodboard': {
        const { userGoals, preferences } = data;
        const prompt = `Generate a personalized vision board for someone with these goals: ${userGoals}. 
        Preferences: ${preferences}. 
        Return a JSON object with an array of vision elements, each containing: title, description, category, and suggested_image_prompt.
        Focus on empowering, motivating imagery and text that aligns with achieving these specific goals.`;
        
        const content = await makeOpenAIRequest([
          { role: 'user', content: prompt }
        ], 1000);
        
        result = JSON.parse(content);
        break;
      }

      case 'generate_insights': {
        const { journalSummaries } = data;
        const prompt = `Based on these journal entry summaries from the past month: ${journalSummaries?.join('. ') || ''}, 
        generate an insightful report about the user's progress, patterns, emotional trends, and recommendations for achieving their goals.
        Make it encouraging and actionable.`;
        
        const report = await makeOpenAIRequest([
          { role: 'user', content: prompt }
        ], 800);
        
        result = { report };
        break;
      }

      case 'generate_advanced_moodboard': {
        const { userGoals, preferences, existingElements = [] } = data;
        const existingContext = existingElements.length > 0 
          ? `Existing elements: ${existingElements.map((el) => {
              if (typeof el === 'object' && el !== null && 'content' in el) {
                return el.content;
              }
              return '';
            }).join(', ')}. ` 
          : '';
        
        const prompt = `${existingContext}Generate an enhanced, personalized vision board for someone with these goals: ${userGoals}. 
        Preferences: ${preferences}. 
        
        Return a JSON object with:
        1. "affirmations" array - 5 powerful, personalized affirmations
        2. "visual_elements" array - 8 specific visual elements with titles, descriptions, and image prompts
        3. "goal_cards" array - 3 specific, measurable goals with deadlines
        4. "inspiration_quotes" array - 3 motivational quotes relevant to their goals
        5. "action_steps" array - 5 concrete action steps they can take
        
        Make everything highly specific and personalized to their unique goals and situation.`;
        
        const content = await makeOpenAIRequest([
          { role: 'user', content: prompt }
        ], 1500);
        
        result = JSON.parse(content);
        break;
      }

      case 'analyze_progress': {
        const { moodboardData, journalSummaries } = data;
        const prompt = `Analyze this user's vision board progress:
        
        Vision Board Elements: ${JSON.stringify(moodboardData)}
        Recent Journal Summaries: ${journalSummaries?.join('. ') || ''}
        
        Provide an analysis of:
        1. How well their daily actions align with their vision board goals
        2. Specific recommendations to bridge any gaps
        3. Celebration of progress made
        4. Suggested adjustments to their vision board
        
        Keep it encouraging, specific, and actionable.`;
        
        const analysis = await makeOpenAIRequest([
          { role: 'user', content: prompt }
        ], 1000);
        
        result = { analysis };
        break;
      }

        default:
          return new Response(JSON.stringify({ error: 'Invalid request type' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
      }

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (error: unknown) {
      // Handle Zod validation errors
      if (error && typeof error === 'object' && 'issues' in error) {
        const zodError = error as { issues: Array<{ path: string[]; message: string }> };
        const errorMessage = zodError.issues.map(issue => 
          `${issue.path.join('.')}: ${issue.message}`
        ).join(', ');
        
        return new Response(JSON.stringify({ error: `Validation error: ${errorMessage}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.error('Error in generate-summary function:', error);
      // Check if this is our generic OpenAI error
      if (error instanceof Error && error.message === 'An internal error occurred while generating content') {
        return new Response(JSON.stringify({ error: 'An internal error occurred while generating content' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      // For other errors, still return a generic message to the client
      return new Response(JSON.stringify({ error: 'An internal error occurred' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (outerError: unknown) {
    console.error('Outer error in generate-summary function:', outerError);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});