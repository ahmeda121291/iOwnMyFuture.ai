import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const supabaseUrl = Deno.env.get('PROJECT_URL') ?? '';
const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY') ?? '';
const supabase = createClient(supabaseUrl, serviceRoleKey);

export interface CSRFValidationResult {
  valid: boolean;
  error?: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
}

export interface CSRFMiddlewareOptions {
  requireCSRF?: boolean;
  corsHeaders?: Record<string, string>;
}

// Hash token for comparison
const hashToken = async (token: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// Validate CSRF token against stored hash
export const validateCSRFToken = async (
  token: string, 
  userId: string
): Promise<CSRFValidationResult> => {
  try {
    if (!token || typeof token !== 'string') {
      return { valid: false, error: 'CSRF token missing or invalid format' };
    }

    if (token.length !== 64) { // 32 bytes * 2 hex chars
      return { valid: false, error: 'Invalid CSRF token format' };
    }

    // Get stored token for user
    const { data: storedTokens, error: fetchError } = await supabase
      .from('csrf_tokens')
      .select('token_hash, expires_at')
      .eq('user_id', userId)
      .eq('used', false)
      .gte('expires_at', new Date().toISOString())
      .limit(1);

    if (fetchError) {
      console.error('CSRF token fetch error:', fetchError);
      return { valid: false, error: 'CSRF validation failed' };
    }

    if (!storedTokens || storedTokens.length === 0) {
      return { valid: false, error: 'No valid CSRF token found' };
    }

    // Hash the provided token and compare
    const tokenHash = await hashToken(token);
    const isValid = tokenHash === storedTokens[0].token_hash;

    if (!isValid) {
      return { valid: false, error: 'Invalid CSRF token' };
    }

    return { valid: true };
  } catch (error) {
    console.error('CSRF validation error:', error);
    return { valid: false, error: 'CSRF validation failed' };
  }
};

// Authenticate user and optionally validate CSRF token
export const authenticateAndValidateCSRF = async (
  request: Request,
  options: CSRFMiddlewareOptions = {}
): Promise<{
  success: boolean;
  user?: AuthenticatedUser;
  response?: Response;
}> => {
  const { requireCSRF = true, corsHeaders = {} } = options;

  try {
    // Extract auth token
    const authToken = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!authToken) {
      return {
        success: false,
        response: new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }),
      };
    }

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser(authToken);
    if (authError || !user) {
      return {
        success: false,
        response: new Response(JSON.stringify({ error: 'Invalid token' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }),
      };
    }

    // Check rate limiting
    const rateLimitOk = await checkRateLimit(user.id);
    if (!rateLimitOk) {
      return {
        success: false,
        response: new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }),
      };
    }

    // Validate CSRF token if required
    if (requireCSRF) {
      let csrfToken: string | null = null;

      // Extract CSRF token from header or body
      csrfToken = request.headers.get('x-csrf-token');
      
      if (!csrfToken) {
        try {
          const body = await request.clone().json();
          csrfToken = body.csrf_token;
        } catch {
          // Ignore JSON parsing errors
        }
      }

      if (!csrfToken) {
        return {
          success: false,
          response: new Response(JSON.stringify({ error: 'CSRF token required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }),
        };
      }

      const csrfValidation = await validateCSRFToken(csrfToken, user.id);
      if (!csrfValidation.valid) {
        return {
          success: false,
          response: new Response(JSON.stringify({ error: csrfValidation.error }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }),
        };
      }
    }

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email!,
      },
    };
  } catch (error) {
    console.error('Authentication/CSRF validation error:', error);
    return {
      success: false,
      response: new Response(JSON.stringify({ error: 'Authentication failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }),
    };
  }
};

// Rate limiting check (reused from previous implementation)
const checkRateLimit = async (userId: string): Promise<boolean> => {
  try {
    const { data: rateLimitData } = await supabase
      .from('user_rate_limits')
      .select('request_count, last_reset')
      .eq('user_id', userId)
      .maybeSingle();

    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    if (!rateLimitData) {
      await supabase.from('user_rate_limits').insert({
        user_id: userId,
        request_count: 1,
        last_reset: now.toISOString()
      });
      return true;
    }

    const lastReset = new Date(rateLimitData.last_reset);
    
    if (lastReset < oneHourAgo) {
      await supabase.from('user_rate_limits')
        .update({ request_count: 1, last_reset: now.toISOString() })
        .eq('user_id', userId);
      return true;
    }

    if (rateLimitData.request_count >= 50) {
      return false;
    }

    await supabase.from('user_rate_limits')
      .update({ request_count: rateLimitData.request_count + 1 })
      .eq('user_id', userId);
    
    return true;
  } catch (error) {
    console.error('Rate limit check error:', error);
    return true;
  }
};

// Helper function to handle CORS preflight
export const handleCORS = (corsHeaders: Record<string, string>) => {
  return new Response(null, { headers: corsHeaders });
};