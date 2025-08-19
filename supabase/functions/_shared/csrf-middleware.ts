import { createClient } from 'npm:@supabase/supabase-js@2.49.1';
import { RateLimiter, getClientIP } from './rate-limiter.ts';

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

// Cookie configuration
const COOKIE_NAME = 'csrf_token';

// Extract CSRF token from cookies
const extractCSRFFromCookie = (cookieHeader: string | null): string | null => {
  if (!cookieHeader) return null;
  
  const cookies = cookieHeader.split(';').map(c => c.trim());
  const csrfCookie = cookies.find(c => c.startsWith(`${COOKIE_NAME}=`));
  
  if (!csrfCookie) return null;
  
  return csrfCookie.split('=')[1];
};

// Hash token for comparison
const hashToken = async (token: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// Validate double-submit tokens
const validateDoubleSubmitTokens = (cookieToken: string, headerToken: string): boolean => {
  // Extract base token from header token (format: baseToken.salt)
  const [baseToken] = headerToken.split('.');
  
  // Compare base tokens
  return baseToken === cookieToken;
};

// Validate CSRF token with double-submit cookie pattern
export const validateCSRFToken = async (
  request: Request,
  userId: string
): Promise<CSRFValidationResult> => {
  try {
    // Extract cookie token
    const cookieToken = extractCSRFFromCookie(request.headers.get('cookie'));
    
    if (!cookieToken) {
      return { valid: false, error: 'CSRF cookie missing' };
    }

    // Extract header token from X-CSRF-Token header
    let headerToken: string | null = request.headers.get('x-csrf-token');
    
    // If not in header, try to extract from body
    if (!headerToken) {
      const contentType = request.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        try {
          const body = await request.clone().json();
          headerToken = body.csrf_token;
        } catch {
          // Ignore JSON parsing errors
        }
      } else if (contentType?.includes('multipart/form-data')) {
        try {
          const formData = await request.clone().formData();
          headerToken = formData.get('csrf_token') as string;
        } catch {
          // Ignore form parsing errors
        }
      }
    }

    if (!headerToken) {
      return { valid: false, error: 'CSRF token missing from header or body' };
    }

    // Validate token format
    if (!headerToken.includes('.') || headerToken.length < 65) { // 64 chars for token + dot + salt
      return { valid: false, error: 'Invalid CSRF token format' };
    }

    // Validate double-submit tokens match
    if (!validateDoubleSubmitTokens(cookieToken, headerToken)) {
      return { valid: false, error: 'CSRF token mismatch' };
    }

    // Verify token exists in database and hasn't expired
    const tokenHash = await hashToken(cookieToken);
    const { data: storedToken, error: fetchError } = await supabase
      .from('csrf_tokens')
      .select('id, expires_at, ip_address')
      .eq('user_id', userId)
      .eq('token_hash', tokenHash)
      .eq('used', false)
      .gte('expires_at', new Date().toISOString())
      .single();

    if (fetchError || !storedToken) {
      console.error('CSRF token database validation failed:', fetchError);
      return { valid: false, error: 'Invalid or expired CSRF token' };
    }

    // Optional: Verify IP address hasn't changed (can be strict in production)
    const requestIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip');
    if (storedToken.ip_address && requestIp && storedToken.ip_address !== requestIp) {
      console.warn('CSRF token used from different IP:', { 
        original: storedToken.ip_address, 
        current: requestIp 
      });
      // You can return false here for stricter security
      // return { valid: false, error: 'CSRF token IP mismatch' };
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
  const { 
    requireCSRF = true, 
    corsHeaders = {
      'Access-Control-Allow-Origin': Deno.env.get('SITE_URL') || 'http://localhost:5173',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-csrf-token',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Credentials': 'true',
    }
  } = options;

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

    // Check rate limiting with the new scalable implementation
    const rateLimiter = new RateLimiter({
      identifier: user.id,
      maxRequests: 100, // More lenient for general API calls
      windowMs: 60 * 60 * 1000, // 1 hour window
      bucket: 'api-general'
    });

    const rateLimitResult = await rateLimiter.checkLimit();
    if (!rateLimitResult.allowed) {
      const rateLimitHeaders = rateLimiter.createHeaders(rateLimitResult);
      return {
        success: false,
        response: new Response(JSON.stringify({ 
          error: 'Rate limit exceeded. Please try again later.',
          retryAfter: rateLimitResult.retryAfter
        }), {
          status: 429,
          headers: { 
            ...corsHeaders, 
            ...rateLimitHeaders,
            'Content-Type': 'application/json' 
          },
        }),
      };
    }

    // Validate CSRF token if required (skip for safe methods)
    const method = request.method.toUpperCase();
    const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
    
    if (requireCSRF && !safeMethods.includes(method)) {
      const csrfValidation = await validateCSRFToken(request, user.id);
      
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


// Helper function to handle CORS preflight
export const handleCORS = (corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': Deno.env.get('SITE_URL') || 'http://localhost:5173',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-csrf-token',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Credentials': 'true',
}) => {
  return new Response(null, { headers: corsHeaders });
};