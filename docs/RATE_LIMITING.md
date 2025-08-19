# Rate Limiting Strategy

## Overview

The application implements a **sliding window rate limiting algorithm** using PostgreSQL for scalable API throttling. This replaces the previous simple counter-based approach with a more robust and production-ready solution.

## Architecture

### Components

1. **RateLimiter Class** (`supabase/functions/_shared/rate-limiter.ts`)
   - Core rate limiting logic
   - Sliding window algorithm implementation
   - HTTP header generation for rate limit information

2. **Database Schema** (`rate_limit_requests` table)
   - Stores individual request timestamps
   - Supports multiple buckets for different rate limit types
   - Automatic cleanup of old records

3. **PostgreSQL Functions**
   - `check_rate_limit()`: Atomic rate limit checking and updating
   - `cleanup_old_rate_limit_records()`: Removes records older than 24 hours

## Rate Limits

### AI Generation Endpoints (`/generate-summary`)
- **User-based**: 50 requests per hour per authenticated user
- **IP-based**: 200 requests per hour per IP address
- **Bucket**: `ai-generation` and `ai-generation-ip`

### General API Endpoints
- **User-based**: 100 requests per hour per authenticated user
- **Bucket**: `api-general`

## Implementation Details

### Sliding Window Algorithm

The sliding window algorithm counts requests within a rolling time window, providing more accurate rate limiting than fixed window approaches:

1. When a request arrives, count all requests from the same identifier within the last `windowMs` milliseconds
2. If count < `maxRequests`, allow the request and record it
3. If count >= `maxRequests`, reject the request with HTTP 429

### Rate Limit Headers

All responses include rate limit information headers:

```
X-RateLimit-Limit: 50        # Maximum requests allowed
X-RateLimit-Remaining: 47    # Requests remaining in current window
X-RateLimit-Reset: 1735689600 # Unix timestamp when window resets
Retry-After: 3600            # Seconds to wait (only on 429 responses)
```

### Multiple Buckets

Different endpoints can have different rate limits using buckets:

```typescript
const limiter = new RateLimiter({
  identifier: userId,
  maxRequests: 50,
  windowMs: 3600000,
  bucket: 'ai-generation' // Separate bucket for AI endpoints
});
```

## Usage Examples

### Basic Usage

```typescript
import { RateLimiter } from '../_shared/rate-limiter.ts';

const limiter = new RateLimiter({
  identifier: userId,
  maxRequests: 50,
  windowMs: 60 * 60 * 1000, // 1 hour
  bucket: 'api'
});

const result = await limiter.checkLimit();
if (!result.allowed) {
  return new Response('Rate limit exceeded', {
    status: 429,
    headers: limiter.createHeaders(result)
  });
}
```

### Convenience Functions

```typescript
import { checkUserRateLimit, checkIPRateLimit } from '../_shared/rate-limiter.ts';

// User-based rate limiting
const userResult = await checkUserRateLimit(userId, {
  maxRequests: 100,
  windowMs: 3600000,
  bucket: 'api'
});

// IP-based rate limiting
const ipResult = await checkIPRateLimit(clientIP, {
  maxRequests: 200,
  windowMs: 3600000,
  bucket: 'api-ip'
});
```

## Database Maintenance

### Automatic Cleanup

Old rate limit records are automatically cleaned up to prevent table bloat. Records older than 24 hours are removed.

To set up automatic cleanup (requires pg_cron extension):

```sql
SELECT cron.schedule(
  'cleanup-rate-limits', 
  '0 * * * *', -- Every hour
  'SELECT cleanup_old_rate_limit_records();'
);
```

### Manual Cleanup

```sql
SELECT cleanup_old_rate_limit_records();
```

## Monitoring

### Check Current Rate Limits

```sql
-- View rate limits for a specific user
SELECT 
  bucket,
  COUNT(*) as request_count,
  MAX(requested_at) as last_request
FROM rate_limit_requests
WHERE identifier = 'USER_ID'
  AND requested_at >= NOW() - INTERVAL '1 hour'
GROUP BY bucket;
```

### View Top API Consumers

```sql
SELECT 
  identifier,
  bucket,
  COUNT(*) as requests_last_hour
FROM rate_limit_requests
WHERE requested_at >= NOW() - INTERVAL '1 hour'
GROUP BY identifier, bucket
ORDER BY requests_last_hour DESC
LIMIT 10;
```

## Testing

### Unit Tests

Run rate limiter unit tests:

```bash
deno test supabase/functions/_tests/rate-limiter.test.ts
```

### Integration Tests

Run integration tests with actual Edge Functions:

```bash
deno test supabase/functions/_tests/generate-summary-rate-limit.test.ts
```

### Manual Testing

Test rate limiting with curl:

```bash
# Get auth token and CSRF token first
TOKEN="your-auth-token"
CSRF="your-csrf-token"

# Make multiple requests to trigger rate limit
for i in {1..51}; do
  curl -X POST \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"type\":\"summarize\",\"data\":{\"entryContent\":\"test\"},\"csrf_token\":\"$CSRF\"}" \
    https://your-project.supabase.co/functions/v1/generate-summary \
    -w "\nStatus: %{http_code}\n"
done
```

## Migration from Old System

The new rate limiting system coexists with the old `user_rate_limits` table during migration. Once stable:

1. Monitor both systems to ensure new system is working
2. Stop writing to `user_rate_limits` table
3. Drop old table and related functions
4. Update all endpoints to use new rate limiter

## Performance Considerations

1. **Indexing**: Proper indexes on `identifier`, `bucket`, and `requested_at` ensure fast queries
2. **Cleanup**: Regular cleanup prevents unbounded table growth
3. **Caching**: Consider adding Redis cache layer for extremely high traffic

## Future Improvements

1. **Redis Integration**: For even higher performance at scale
2. **Distributed Rate Limiting**: For multi-region deployments
3. **Dynamic Rate Limits**: Adjust limits based on user tier or API key
4. **Rate Limit Bypassing**: Allow certain IPs or API keys to bypass limits
5. **Webhook Notifications**: Alert when users hit rate limits frequently