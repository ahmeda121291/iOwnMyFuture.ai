import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { handleCorsPreflight, corsResponse, corsError } from '../_shared/cors.ts';

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  try {
    const url = new URL(req.url);
    const entryId = url.searchParams.get('entry_id');
    const limit = parseInt(url.searchParams.get('limit') || '5');

    if (!entryId) {
      return corsError(req, 'entry_id parameter is required', 400);
    }

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return corsError(req, 'Authorization header required', 401);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return corsError(req, 'Unauthorized', 401);
    }

    // Find related entries using the database function
    const { data: relatedEntries, error } = await supabase
      .rpc('find_related_journal_entries', {
        p_entry_id: entryId,
        p_user_id: user.id,
        p_limit: limit
      });

    if (error) {
      console.error('Failed to find related entries:', error);
      return corsError(req, 'Failed to find related entries', 500);
    }

    // Format the entries for the frontend
    const formattedEntries = (relatedEntries || []).map(entry => ({
      id: entry.id,
      entry_date: entry.entry_date,
      title: getEntryTitle(entry),
      excerpt: getExcerpt(entry.ai_summary || entry.content),
      mood: entry.mood,
      category: entry.category,
      tags: entry.tags || [],
      similarity_score: Math.round(entry.similarity_score * 100),
      created_at: entry.created_at
    }));

    return corsResponse(req, {
      entries: formattedEntries,
      count: formattedEntries.length
    });
  } catch (error) {
    console.error('Related entries error:', error);
    return corsError(req, error.message || 'Internal server error', 500);
  }
});

function getEntryTitle(entry: any): string {
  // Try to extract a title from the content
  const firstLine = entry.content?.split('\n')[0] || '';
  
  if (firstLine.length > 0 && firstLine.length <= 100) {
    return firstLine;
  }
  
  // Use date and mood/category as fallback
  const date = new Date(entry.entry_date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  
  if (entry.mood && entry.category) {
    return `${date} - ${entry.mood} ${entry.category}`;
  } else if (entry.mood) {
    return `${date} - ${entry.mood} entry`;
  } else if (entry.category) {
    return `${date} - ${entry.category}`;
  }
  
  return date;
}

function getExcerpt(text: string, maxLength: number = 150): string {
  if (!text) return '';
  
  const cleaned = text.replace(/\n+/g, ' ').trim();
  
  if (cleaned.length <= maxLength) {
    return cleaned;
  }
  
  // Try to cut at a word boundary
  const truncated = cleaned.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastSpace > maxLength * 0.8) {
    return truncated.substring(0, lastSpace) + '...';
  }
  
  return truncated + '...';
}