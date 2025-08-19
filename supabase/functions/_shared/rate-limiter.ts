import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const supabaseUrl = Deno.env.get('PROJECT_URL') ?? '';
const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY') ?? '';
const supabase = createClient(supabaseUrl, serviceRoleKey);

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  identifier: string; // user_id or ip_address
  bucket?: string; // optional bucket name for different rate limit types
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfter?: number; // seconds to wait before retry
}

/**
 * Implements a sliding window rate limiter using PostgreSQL
 * This is more scalable than the simple counter approach
 */
export class RateLimiter {
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = {
      ...config,
      bucket: config.bucket || 'default'
    };
  }

  /**
   * Check if request is allowed and update rate limit
   */
  async checkLimit(): Promise<RateLimitResult> {
    const now = new Date();
    const windowStart = new Date(now.getTime() - this.config.windowMs);
    
    try {
      // Use a transaction to ensure atomic operations
      const { data, error } = await supabase.rpc('check_rate_limit', {
        p_identifier: this.config.identifier,
        p_bucket: this.config.bucket,
        p_max_requests: this.config.maxRequests,
        p_window_ms: this.config.windowMs,
        p_now: now.toISOString(),
        p_window_start: windowStart.toISOString()
      });

      if (error) {
        console.error('Rate limit check error:', error);
        // On error, be permissive to avoid blocking legitimate users
        return {
          allowed: true,
          remaining: this.config.maxRequests,
          resetAt: new Date(now.getTime() + this.config.windowMs)
        };
      }

      const allowed = data.allowed;
      const requestCount = data.request_count;
      const remaining = Math.max(0, this.config.maxRequests - requestCount);
      const resetAt = new Date(now.getTime() + this.config.windowMs);
      
      const result: RateLimitResult = {
        allowed,
        remaining,
        resetAt
      };

      if (!allowed) {
        result.retryAfter = Math.ceil(this.config.windowMs / 1000);
      }

      return result;
    } catch (error) {
      console.error('Rate limiter error:', error);
      // On error, be permissive
      return {
        allowed: true,
        remaining: this.config.maxRequests,
        resetAt: new Date(now.getTime() + this.config.windowMs)
      };
    }
  }

  /**
   * Create rate limit headers for HTTP response
   */
  createHeaders(result: RateLimitResult): Record<string, string> {
    const headers: Record<string, string> = {
      'X-RateLimit-Limit': String(this.config.maxRequests),
      'X-RateLimit-Remaining': String(result.remaining),
      'X-RateLimit-Reset': String(Math.floor(result.resetAt.getTime() / 1000))
    };

    if (result.retryAfter) {
      headers['Retry-After'] = String(result.retryAfter);
    }

    return headers;
  }
}

/**
 * Convenience function for standard user rate limiting
 */
export async function checkUserRateLimit(
  userId: string,
  options: {
    maxRequests?: number;
    windowMs?: number;
    bucket?: string;
  } = {}
): Promise<RateLimitResult> {
  const limiter = new RateLimiter({
    identifier: userId,
    maxRequests: options.maxRequests || 50,
    windowMs: options.windowMs || 60 * 60 * 1000, // 1 hour default
    bucket: options.bucket || 'api'
  });

  return limiter.checkLimit();
}

/**
 * Convenience function for IP-based rate limiting
 */
export async function checkIPRateLimit(
  ipAddress: string,
  options: {
    maxRequests?: number;
    windowMs?: number;
    bucket?: string;
  } = {}
): Promise<RateLimitResult> {
  const limiter = new RateLimiter({
    identifier: ipAddress,
    maxRequests: options.maxRequests || 100,
    windowMs: options.windowMs || 60 * 60 * 1000, // 1 hour default
    bucket: options.bucket || 'ip'
  });

  return limiter.checkLimit();
}

/**
 * Extract client IP from request headers
 */
export function getClientIP(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
         request.headers.get('x-real-ip') ||
         request.headers.get('cf-connecting-ip') || // Cloudflare
         '127.0.0.1';
}