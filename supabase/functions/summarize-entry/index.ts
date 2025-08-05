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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
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

    // Get request body
    const { entryContent, entryId } = await req.json();

    if (!entryContent || typeof entryContent !== 'string') {
      return new Response(JSON.stringify({ error: 'Invalid entry content' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Limit content length to prevent abuse
    const maxLength = 5000;
    const truncatedContent = entryContent.slice(0, maxLength);

    // Generate summary using OpenAI
    const prompt = `Summarize this journal entry in 2-3 sentences, focusing on key emotions, insights, and progress toward goals: "${truncatedContent}"`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 150,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'OpenAI API request failed');
    }

    const data: OpenAIResponse = await response.json();
    const summary = data.choices[0]?.message?.content || '';

    // If entryId is provided, update the journal entry with the summary
    if (entryId) {
      // Verify the entry belongs to the user
      const { data: entry, error: entryError } = await supabase
        .from('journal_entries')
        .select('id')
        .eq('id', entryId)
        .eq('user_id', user.id)
        .single();

      if (entryError || !entry) {
        return new Response(JSON.stringify({ error: 'Entry not found or unauthorized' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Update the entry with the AI summary
      const { error: updateError } = await supabase
        .from('journal_entries')
        .update({ ai_summary: summary })
        .eq('id', entryId)
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Error updating journal entry:', updateError);
      }
    }

    return new Response(
      JSON.stringify({ summary }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: unknown) {
    console.error('Error in summarize-entry function:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate summary' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});