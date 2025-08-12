import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

// Use production URL as fallback if SITE_URL not configured
const siteUrl = Deno.env.get('SITE_URL') || 'https://iownmyfuture.ai';

const corsHeaders = {
  'Access-Control-Allow-Origin': siteUrl,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-csrf-token',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Credentials': 'true', // Required for cookies
};

const supabaseUrl = Deno.env.get('PROJECT_URL') ?? '';
const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY') ?? '';
const supabase = createClient(supabaseUrl, serviceRoleKey);

// Cookie configuration
const COOKIE_NAME = 'csrf_token';
const COOKIE_MAX_AGE = 24 * 60 * 60; // 24 hours in seconds
const IS_PRODUCTION = Deno.env.get('ENVIRONMENT') === 'production';

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

// Create secure httpOnly cookie
const createCSRFCookie = (token: string): string => {
  const cookieOptions = [
    `${COOKIE_NAME}=${token}`,
    `HttpOnly`,
    `Secure=${IS_PRODUCTION}`,
    `SameSite=Strict`,
    `Max-Age=${COOKIE_MAX_AGE}`,
    `Path=/`,
  ];
  
  if (IS_PRODUCTION) {
    const domain = new URL(Deno.env.get('SITE_URL') || '').hostname;
    cookieOptions.push(`Domain=${domain}`);
  }
  
  return cookieOptions.join('; ');
};

// Extract CSRF token from cookies
const extractCSRFFromCookie = (cookieHeader: string | null): string | null => {
  if (!cookieHeader) return null;
  
  const cookies = cookieHeader.split(';').map(c => c.trim());
  const csrfCookie = cookies.find(c => c.startsWith(`${COOKIE_NAME}=`));
  
  if (!csrfCookie) return null;
  
  return csrfCookie.split('=')[1];
};

// Generate a double-submit token (one for cookie, one for header/body)
const generateDoubleSubmitTokens = (): { cookieToken: string; headerToken: string } => {
  const baseToken = generateSecureToken();
  const salt = generateSecureToken().substring(0, 16); // Use first 16 chars as salt
  
  // Cookie token is the base token
  const cookieToken = baseToken;
  
  // Header token combines base token with salt
  const headerToken = `${baseToken}.${salt}`;
  
  return { cookieToken, headerToken };
};

// Validate double-submit tokens
const validateDoubleSubmitTokens = (cookieToken: string, headerToken: string): boolean => {
  // Extract base token from header token
  const [baseToken] = headerToken.split('.');
  
  // Compare base tokens
  return baseToken === cookieToken;
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authToken = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!authToken) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(authToken);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'GET') {
      // Generate new CSRF tokens
      const { cookieToken, headerToken } = generateDoubleSubmitTokens();
      const tokenHash = await hashToken(cookieToken);
      const expiresAt = new Date(Date.now() + COOKIE_MAX_AGE * 1000);

      // Clean up old tokens for this user
      await supabase
        .from('csrf_tokens')
        .delete()
        .eq('user_id', user.id)
        .or(`expires_at.lt.${new Date().toISOString()},used.eq.true`);

      // Store new token hash in database
      const { error: insertError } = await supabase
        .from('csrf_tokens')
        .insert({
          user_id: user.id,
          token_hash: tokenHash,
          expires_at: expiresAt.toISOString(),
          ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
          user_agent: req.headers.get('user-agent'),
        });

      if (insertError) {
        console.error('Failed to store CSRF token:', insertError);
        return new Response(JSON.stringify({ error: 'Failed to generate CSRF token' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Set httpOnly cookie and return header token
      const headers = new Headers(corsHeaders);
      headers.set('Content-Type', 'application/json');
      headers.set('Set-Cookie', createCSRFCookie(cookieToken));

      return new Response(JSON.stringify({ 
        csrf_token: headerToken,
        expires_at: expiresAt.toISOString()
      }), {
        headers,
      });
    }

    if (req.method === 'POST') {
      // Validate CSRF token using double-submit pattern
      const cookieToken = extractCSRFFromCookie(req.headers.get('cookie'));
      
      if (!cookieToken) {
        return new Response(JSON.stringify({ 
          valid: false, 
          error: 'CSRF cookie missing' 
        }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get header token from X-CSRF-Token header or request body
      let headerToken: string | null = req.headers.get('x-csrf-token');
      
      if (!headerToken) {
        try {
          const body = await req.clone().json();
          headerToken = body.csrf_token;
        } catch {
          // Ignore JSON parsing errors
        }
      }

      if (!headerToken) {
        return new Response(JSON.stringify({ 
          valid: false, 
          error: 'CSRF token missing from header or body' 
        }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Validate double-submit tokens
      const tokensValid = validateDoubleSubmitTokens(cookieToken, headerToken);
      
      if (!tokensValid) {
        return new Response(JSON.stringify({ 
          valid: false, 
          error: 'CSRF token mismatch' 
        }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Verify token exists in database and hasn't expired
      const tokenHash = await hashToken(cookieToken);
      const { data: storedToken, error: fetchError } = await supabase
        .from('csrf_tokens')
        .select('id, expires_at')
        .eq('user_id', user.id)
        .eq('token_hash', tokenHash)
        .eq('used', false)
        .gte('expires_at', new Date().toISOString())
        .single();

      if (fetchError || !storedToken) {
        return new Response(JSON.stringify({ 
          valid: false, 
          error: 'Invalid or expired CSRF token' 
        }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Optional: Mark token as used for single-use tokens
      // Uncomment for stricter security (requires new token for each request)
      /*
      await supabase
        .from('csrf_tokens')
        .update({ used: true })
        .eq('id', storedToken.id);
      */

      return new Response(JSON.stringify({ 
        valid: true 
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