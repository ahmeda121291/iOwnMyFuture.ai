import { assertEquals, assertExists } from 'https://deno.land/std@0.168.0/testing/asserts.ts';
import { RateLimiter, checkUserRateLimit, checkIPRateLimit, getClientIP } from '../_shared/rate-limiter.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

// Mock Supabase client for testing
const supabaseUrl = Deno.env.get('PROJECT_URL') ?? 'http://localhost:54321';
const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY') ?? 'test-key';
const supabase = createClient(supabaseUrl, serviceRoleKey);

Deno.test('RateLimiter - should allow requests under limit', async () => {
  const limiter = new RateLimiter({
    identifier: 'test-user-1',
    maxRequests: 5,
    windowMs: 60000, // 1 minute
    bucket: 'test'
  });

  // First request should be allowed
  const result = await limiter.checkLimit();
  assertEquals(result.allowed, true);
  assertEquals(result.remaining, 4);
  assertExists(result.resetAt);
});

Deno.test('RateLimiter - should block requests over limit', async () => {
  const limiter = new RateLimiter({
    identifier: 'test-user-2',
    maxRequests: 2,
    windowMs: 60000, // 1 minute
    bucket: 'test-blocking'
  });

  // Make requests up to limit
  const result1 = await limiter.checkLimit();
  assertEquals(result1.allowed, true);
  
  const result2 = await limiter.checkLimit();
  assertEquals(result2.allowed, true);
  
  // Next request should be blocked
  const result3 = await limiter.checkLimit();
  assertEquals(result3.allowed, false);
  assertEquals(result3.remaining, 0);
  assertExists(result3.retryAfter);
});

Deno.test('RateLimiter - should create proper headers', () => {
  const limiter = new RateLimiter({
    identifier: 'test-user',
    maxRequests: 10,
    windowMs: 3600000,
    bucket: 'test'
  });

  const result = {
    allowed: true,
    remaining: 7,
    resetAt: new Date(Date.now() + 3600000),
    retryAfter: undefined
  };

  const headers = limiter.createHeaders(result);
  
  assertEquals(headers['X-RateLimit-Limit'], '10');
  assertEquals(headers['X-RateLimit-Remaining'], '7');
  assertExists(headers['X-RateLimit-Reset']);
  assertEquals(headers['Retry-After'], undefined);
});

Deno.test('RateLimiter - should include Retry-After when blocked', () => {
  const limiter = new RateLimiter({
    identifier: 'test-user',
    maxRequests: 10,
    windowMs: 3600000,
    bucket: 'test'
  });

  const result = {
    allowed: false,
    remaining: 0,
    resetAt: new Date(Date.now() + 3600000),
    retryAfter: 3600
  };

  const headers = limiter.createHeaders(result);
  
  assertEquals(headers['Retry-After'], '3600');
});

Deno.test('checkUserRateLimit - should use default values', async () => {
  const result = await checkUserRateLimit('test-user-default');
  
  assertExists(result);
  assertExists(result.allowed);
  assertExists(result.remaining);
  assertExists(result.resetAt);
});

Deno.test('checkIPRateLimit - should use IP-specific defaults', async () => {
  const result = await checkIPRateLimit('192.168.1.1');
  
  assertExists(result);
  assertExists(result.allowed);
  assertExists(result.remaining);
  assertExists(result.resetAt);
});

Deno.test('getClientIP - should extract IP from various headers', () => {
  // Test X-Forwarded-For
  const req1 = new Request('http://example.com', {
    headers: {
      'x-forwarded-for': '203.0.113.1, 198.51.100.2'
    }
  });
  assertEquals(getClientIP(req1), '203.0.113.1');

  // Test X-Real-IP
  const req2 = new Request('http://example.com', {
    headers: {
      'x-real-ip': '203.0.113.2'
    }
  });
  assertEquals(getClientIP(req2), '203.0.113.2');

  // Test CF-Connecting-IP (Cloudflare)
  const req3 = new Request('http://example.com', {
    headers: {
      'cf-connecting-ip': '203.0.113.3'
    }
  });
  assertEquals(getClientIP(req3), '203.0.113.3');

  // Test fallback
  const req4 = new Request('http://example.com');
  assertEquals(getClientIP(req4), '127.0.0.1');
});

Deno.test('RateLimiter - different buckets should have separate limits', async () => {
  const userId = 'test-user-buckets';
  
  const limiter1 = new RateLimiter({
    identifier: userId,
    maxRequests: 2,
    windowMs: 60000,
    bucket: 'bucket1'
  });

  const limiter2 = new RateLimiter({
    identifier: userId,
    maxRequests: 2,
    windowMs: 60000,
    bucket: 'bucket2'
  });

  // Use up bucket1
  await limiter1.checkLimit();
  await limiter1.checkLimit();
  const result1 = await limiter1.checkLimit();
  assertEquals(result1.allowed, false);

  // Bucket2 should still allow requests
  const result2 = await limiter2.checkLimit();
  assertEquals(result2.allowed, true);
});