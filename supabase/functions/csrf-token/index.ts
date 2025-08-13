import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

// Validate required environment variables
const PROJECT_URL = Deno.env.get('PROJECT_URL');
const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY');

// Use production URL as fallback if SITE_URL not configured
const SITE_URL = Deno.env.get('SITE_URL') || 'https://iownmyfuture.ai';
const ENVIRONMENT = Deno.env.get('ENVIRONMENT') || 'development';
const IS_PRODUCTION = ENVIRONMENT === 'production';

const corsHeaders = {
  'Access-Control-Allow-Origin': SITE_URL,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-csrf-token',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Credentials': 'true', // Required for cookies
} as const;

// Check if environment variables are present
if (!PROJECT_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing PROJECT_URL or SERVICE_ROLE_KEY');
  Deno.serve(() => {
    return new Response(JSON.stringify({ 
      error: 'Configuration error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  });
  // Exit early to prevent further execution
  Deno.exit(1);
}

// Initialize Supabase client with validated environment variables
const supabase = createClient(PROJECT_URL, SERVICE_ROLE_KEY);

// Cookie configuration
const COOKIE_NAME = 'csrf_token';
const COOKIE_MAX_AGE = 24 * 60 * 60; // 24 hours in seconds

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
  
  if (IS_PRODUCTION && SITE_URL) {
    try {
      const domain = new URL(SITE_URL).hostname;
      if (domain) {
        cookieOptions.push(`Domain=${domain}`);
      }
    } catch (error) {
      console.error('Invalid SITE_URL for domain extraction:', error);
    }
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
  try {
    // Extract base token from header token
    const [baseToken] = headerToken.split('.');
    
    // Compare base tokens
    return baseToken === cookieToken;
  } catch (error) {
    console.error('Error validating double-submit tokens:', error);
    return false;
  }
};

// Clean up expired or used tokens
const cleanupOldTokens = async (userId: string): Promise<void> => {
  try {
    const nowIso = new Date().toISOString();
    const { error } = await supabase
      .from('csrf_tokens')
      .delete()
      .eq('user_id', userId)
      .or(`expires_at.lt.${nowIso},used.eq.true`);
    
    if (error) {
      console.error('Error cleaning up old tokens:', error.message);
    }
  } catch (error) {
    console.error('Error in cleanup operation:', error);
  }
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authToken = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!authToken) {
      return new Response(JSON.stringify({ error: 'Unauthorized: No authentication token provided' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(authToken);
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(JSON.stringify({ error: 'Invalid authentication token' }), {
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
      await cleanupOldTokens(user.id);

      // Store new token hash in database
      try {
        const { error: insertError } = await supabase
          .from('csrf_tokens')
          .insert({
            user_id: user.id,
            token_hash: tokenHash,
            expires_at: expiresAt.toISOString(),
            ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
            user_agent: req.headers.get('user-agent') || 'unknown',
            used: false,
          });

        if (insertError) {
          console.error('Failed to store CSRF token in database:', insertError.message);
          return new Response(JSON.stringify({ 
            error: insertError.message
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      } catch (error) {
        console.error('Error inserting CSRF token:', error);
        return new Response(JSON.stringify({ 
          error: 'Failed to generate CSRF token'
        }), {
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
          error: 'CSRF cookie missing - please request a new token' 
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
        } catch (error) {
          console.error('Error parsing request body for CSRF token:', error);
        }
      }

      if (!headerToken) {
        return new Response(JSON.stringify({ 
          valid: false, 
          error: 'CSRF token missing from header (X-CSRF-Token) or request body' 
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
          error: 'CSRF token mismatch between cookie and header/body' 
        }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Verify token exists in database and hasn't expired
      const tokenHash = await hashToken(cookieToken);
      const nowIso = new Date().toISOString();
      
      try {
        const { data: storedToken, error: fetchError } = await supabase
          .from('csrf_tokens')
          .select('id, expires_at, used')
          .eq('user_id', user.id)
          .eq('token_hash', tokenHash)
          .gte('expires_at', nowIso)
          .single();

        if (fetchError) {
          console.error('Error fetching stored token:', fetchError.message);
          return new Response(JSON.stringify({ 
            valid: false, 
            error: fetchError.message
          }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (!storedToken) {
          return new Response(JSON.stringify({ 
            valid: false, 
            error: 'CSRF token not found in database - token may be expired or invalid' 
          }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Check if token has already been used (if replay protection is enabled)
        if (storedToken.used) {
          console.warn(`Attempted reuse of CSRF token for user ${user.id}`);
          return new Response(JSON.stringify({ 
            valid: false, 
            error: 'CSRF token has already been used - possible replay attack' 
          }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Mark token as used for single-use tokens (replay attack protection)
        // Enable this for stricter security
        const ENABLE_REPLAY_PROTECTION = true;
        
        if (ENABLE_REPLAY_PROTECTION) {
          try {
            const { error: updateError } = await supabase
              .from('csrf_tokens')
              .update({ used: true, used_at: new Date().toISOString() })
              .eq('id', storedToken.id);
            
            if (updateError) {
              console.error('Error marking token as used:', updateError.message);
              // Continue despite error - token validation succeeded
            }
          } catch (error) {
            console.error('Error updating token status:', error);
            // Continue despite error - token validation succeeded
          }
        }
      } catch (error) {
        console.error('Error validating CSRF token:', error);
        return new Response(JSON.stringify({ 
          valid: false, 
          error: 'Failed to validate CSRF token'
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ 
        valid: true,
        message: 'CSRF token validated successfully'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed - only GET and POST are supported' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Unexpected error in csrf-token function:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: IS_PRODUCTION ? undefined : errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});