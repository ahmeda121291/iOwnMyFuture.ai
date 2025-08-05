import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const supabaseUrl = Deno.env.get('PROJECT_URL') ?? '';
const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY') ?? '';
const supabase = createClient(supabaseUrl, serviceRoleKey);

// Generate a cryptographically secure random token
const generateSecureToken = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

// Hash token for secure storage
const hashToken = async (token: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// Validate token against stored hash
const validateTokenHash = async (token: string, hash: string): Promise<boolean> => {
  const tokenHash = await hashToken(token);
  return tokenHash === hash;
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
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

    if (req.method === 'GET') {
      // Generate new CSRF token
      const csrfToken = generateSecureToken();
      const tokenHash = await hashToken(csrfToken);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Invalidate any existing tokens for this user
      await supabase
        .from('csrf_tokens')
        .update({ used: true })
        .eq('user_id', user.id)
        .eq('used', false);

      // Store new token hash
      const { error: insertError } = await supabase
        .from('csrf_tokens')
        .insert({
          user_id: user.id,
          token_hash: tokenHash,
          expires_at: expiresAt.toISOString(),
        });

      if (insertError) {
        console.error('Failed to store CSRF token:', insertError);
        return new Response(JSON.stringify({ error: 'Failed to generate CSRF token' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ 
        csrf_token: csrfToken,
        expires_at: expiresAt.toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'POST') {
      // Validate CSRF token
      const { csrf_token: providedToken } = await req.json();

      if (!providedToken || typeof providedToken !== 'string') {
        return new Response(JSON.stringify({ 
          valid: false, 
          error: 'CSRF token missing or invalid format' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get stored token for user
      const { data: storedTokens, error: fetchError } = await supabase
        .from('csrf_tokens')
        .select('token_hash, expires_at')
        .eq('user_id', user.id)
        .eq('used', false)
        .gte('expires_at', new Date().toISOString())
        .limit(1);

      if (fetchError) {
        console.error('Failed to fetch CSRF token:', fetchError);
        return new Response(JSON.stringify({ 
          valid: false, 
          error: 'CSRF validation failed' 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!storedTokens || storedTokens.length === 0) {
        return new Response(JSON.stringify({ 
          valid: false, 
          error: 'No valid CSRF token found' 
        }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Validate token
      const isValid = await validateTokenHash(providedToken, storedTokens[0].token_hash);

      if (isValid) {
        // Mark token as used for one-time use (optional, can be removed for reusable tokens)
        await supabase
          .from('csrf_tokens')
          .update({ used: true })
          .eq('user_id', user.id)
          .eq('token_hash', storedTokens[0].token_hash);
      }

      return new Response(JSON.stringify({ 
        valid: isValid,
        error: isValid ? undefined : 'Invalid CSRF token'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error in csrf-token function:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});