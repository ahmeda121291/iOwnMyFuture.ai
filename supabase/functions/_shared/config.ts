import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

/**
 * Centralized configuration for Supabase Edge Functions
 * All environment variables should be accessed through this module
 */

// Supabase configuration
export const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || Deno.env.get('PROJECT_URL') || '';
export const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';
export const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY') || '';

// API Keys
export const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || '';
export const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY') || '';
export const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';
export const STRIPE_PUBLISHABLE_KEY = Deno.env.get('STRIPE_PUBLISHABLE_KEY') || '';

// Site configuration
export const SITE_URL = Deno.env.get('SITE_URL') || 'https://iownmyfuture.ai';
export const ENVIRONMENT = Deno.env.get('ENVIRONMENT') || 'development';
export const IS_PRODUCTION = ENVIRONMENT === 'production';

// Allowed origins for CORS
export const ALLOWED_ORIGINS = [
  'https://iownmyfuture.ai',
  'https://www.iownmyfuture.ai',
];

// Add localhost for development
if (!IS_PRODUCTION) {
  ALLOWED_ORIGINS.push('http://localhost:3000');
  ALLOWED_ORIGINS.push('http://localhost:5173');
}

/**
 * Helper function to generate CORS headers based on request origin
 * @param req - The incoming request
 * @param allowCredentials - Whether to allow credentials (default: true)
 * @returns CORS headers object
 */
export function getCorsHeaders(req: Request, allowCredentials = true): Record<string, string> {
  const origin = req.headers.get('Origin') ?? '';
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  
  const headers: Record<string, string> = {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-csrf-token',
    'Vary': 'Origin',
  };

  if (allowCredentials) {
    headers['Access-Control-Allow-Credentials'] = 'true';
  }

  return headers;
}

/**
 * Validate that required environment variables are set
 * @param required - Array of required environment variable names
 * @throws Error if any required variables are missing
 */
export function validateConfig(required: string[]): void {
  const missing: string[] = [];
  
  for (const key of required) {
    const value = Deno.env.get(key);
    if (!value || value.trim() === '') {
      missing.push(key);
    }
  }
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

/**
 * Get a configuration value with a fallback
 * @param key - The environment variable key
 * @param fallback - The fallback value if not set
 * @returns The configuration value
 */
export function getConfig(key: string, fallback = ''): string {
  return Deno.env.get(key) || fallback;
}