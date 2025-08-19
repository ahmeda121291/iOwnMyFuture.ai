import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { handleCorsPreflight, corsResponse, corsError } from '../_shared/cors.ts';

interface SaveMoodboardRequest {
  moodboardId?: string;
  elements: any[];
  title?: string;
  description?: string;
  csrfToken: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  try {
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

    const requestData: SaveMoodboardRequest = await req.json();
    const { moodboardId, elements, title, description, csrfToken } = requestData;

    // Validate CSRF token
    if (!csrfToken) {
      return corsError(req, 'CSRF token required', 400);
    }

    // Verify CSRF token
    const { data: tokenData, error: tokenError } = await supabase
      .from('csrf_tokens')
      .select('*')
      .eq('token', csrfToken)
      .eq('user_id', user.id)
      .single();

    if (tokenError || !tokenData) {
      return corsError(req, 'Invalid CSRF token', 403);
    }

    // Check if token is expired (24 hours)
    const tokenAge = Date.now() - new Date(tokenData.created_at).getTime();
    if (tokenAge > 24 * 60 * 60 * 1000) {
      return corsError(req, 'CSRF token expired', 403);
    }

    // Validate elements
    if (!Array.isArray(elements)) {
      return corsError(req, 'Invalid elements format', 400);
    }

    // Sanitize and validate each element
    const sanitizedElements = elements.map(element => ({
      id: element.id,
      type: element.type,
      content: element.content?.substring(0, 5000), // Limit content length
      position: {
        x: Math.max(0, Math.min(element.position?.x || 0, 2000)),
        y: Math.max(0, Math.min(element.position?.y || 0, 2000)),
      },
      size: {
        width: Math.max(50, Math.min(element.size?.width || 200, 800)),
        height: Math.max(50, Math.min(element.size?.height || 200, 800)),
      },
      style: element.style || {},
      metadata: element.metadata || {},
    }));

    let result;

    if (moodboardId) {
      // Update existing moodboard
      const { data: existingBoard, error: fetchError } = await supabase
        .from('moodboards')
        .select('*')
        .eq('id', moodboardId)
        .eq('user_id', user.id)
        .single();

      if (fetchError || !existingBoard) {
        return corsError(req, 'Moodboard not found', 404);
      }

      // Update the moodboard
      const { data, error } = await supabase
        .from('moodboards')
        .update({
          board_data: {
            ...existingBoard.board_data,
            elements: sanitizedElements,
          },
          title: title || existingBoard.title,
          description: description || existingBoard.description,
          updated_at: new Date().toISOString(),
        })
        .eq('id', moodboardId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Failed to update moodboard:', error);
        return corsError(req, 'Failed to save moodboard', 500);
      }

      result = data;
    } else {
      // Create new moodboard
      const { data, error } = await supabase
        .from('moodboards')
        .insert({
          user_id: user.id,
          title: title || 'My Vision Board',
          description: description || '',
          board_data: {
            elements: sanitizedElements,
            theme: 'default',
          },
          is_public: false,
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to create moodboard:', error);
        return corsError(req, 'Failed to create moodboard', 500);
      }

      result = data;
    }

    // Mark CSRF token as used
    await supabase
      .from('csrf_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('token', csrfToken);

    return corsResponse(req, {
      success: true,
      moodboard: result,
    });
  } catch (error) {
    console.error('Moodboard save error:', error);
    return corsError(req, error.message || 'Internal server error', 500);
  }
});