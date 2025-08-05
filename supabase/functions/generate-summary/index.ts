import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openaiApiKey = Deno.env.get('OPENAI_API_KEY') ?? '';
const supabaseUrl = Deno.env.get('PROJECT_URL') ?? '';
const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY') ?? '';

const supabase = createClient(supabaseUrl, serviceRoleKey);

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

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
}

const makeOpenAIRequest = async (messages: Array<{ role: string; content: string }>, maxTokens: number = 1000): Promise<string> => {
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages,
        max_tokens: maxTokens,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'OpenAI API request failed');
    }

    const data: OpenAIResponse = await response.json();
    return data.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('OpenAI API Error:', error);
    throw error;
  }
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
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

    const requestBody: RequestBody = await req.json();
    const { type, data } = requestBody;

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
    console.error('Error in generate-summary function:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});