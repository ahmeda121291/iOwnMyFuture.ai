# 2025-08-15 – CSRF token upsert strategy

## Latest Update - Two-Step Token Creation

Replaced single insert with two-step mark-used+insert strategy:
1. **UPDATE used=true** for any existing unused tokens (user-scoped)
2. **INSERT new unused token** with token_hash, expires_at, used=false
3. **Retry logic** - Single retry on duplicate key to handle race conditions
4. **IP address fallback** - Handles IP parsing errors gracefully

This ensures only one unused CSRF token per user at any time. Tokens are considered "active" when `used = FALSE` and `expires_at > NOW()`, satisfying the unique partial index:
```sql
CREATE UNIQUE INDEX idx_csrf_tokens_user_id_active ON csrf_tokens (user_id) WHERE used = false AND expires_at > NOW();
```

### Technical Implementation

```typescript
// Two-step function ensures one unused token per user
async function createFreshTokenForUser(...) {
  // Step 1: Mark existing unused tokens as used
  await update({ used: true, used_at: now }).eq('user_id', userId).eq('used', false)
  
  // Step 2: Insert new unused token
  await insert({ user_id, token_hash, expires_at, used: false })
  
  // Handle race: retry once if duplicate key
  if (duplicateKeyError) {
    // Mark as used again and retry insert
  }
}
```

### Production Verification
- ✅ Multiple rapid clicks on "Choose Plan" return 200 with valid CSRF token
- ✅ No duplicate key errors in production logs
- ✅ Stripe checkout session creates successfully
- ✅ CORS headers remain strict (allowlisted origins, credentials allowed)

---

# 2025-08-15 – CORS hardening for Supabase Edge Functions

## Changes Made

### 1. Implemented strict, allowlisted CORS for csrf-token & stripe-checkout

Both edge functions now implement proper CORS handling with:
- **Exact origin echoing** from allowlist (https://iownmyfuture.ai, https://www.iownmyfuture.ai)
- **Access-Control-Allow-Credentials: true** for credentialed requests
- **OPTIONS preflight** returns 204 with matching headers
- **All responses** include proper CORS headers (success and error cases)
- **Vary: Origin** header for proper caching

### 2. CSRF Token RLS Fix (Previous)

The csrf-token edge function uses anon key + forwarded user JWT to satisfy RLS policies:
- Uses `SUPABASE_ANON_KEY` with user's JWT instead of SERVICE_ROLE_KEY
- Each request creates a Supabase client with forwarded Authorization header
- This ensures `auth.uid()` properly matches `user_id` in RLS policies
- No security degradation - RLS policies remain fully enforced

## Technical Implementation

### CORS Helper Function
```typescript
const allowedOrigins = [
  'https://iownmyfuture.ai',
  'https://www.iownmyfuture.ai',
];

function corsHeadersFor(req: Request) {
  const origin = req.headers.get('Origin') ?? '';
  const allowOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-csrf-token',
    'Access-Control-Allow-Credentials': 'true',
    'Vary': 'Origin',
  } as const;
}
```

## Production Verification

✅ Preflight OPTIONS returns 204 with exact origin, credentials allowed, headers listed, Vary: Origin
✅ POST /functions/v1/csrf-token returns 200 with proper CORS headers
✅ POST /functions/v1/stripe-checkout returns success with same CORS headers
✅ No "must not be wildcard '*' when credentials is 'include'" errors
✅ Checkout redirects to Stripe successfully
✅ RLS remains enforced - no bypass needed

## Environment Variables Required

Edge functions need these environment variables set in Supabase Dashboard → Functions → Env Vars:
- `SUPABASE_URL` or `PROJECT_URL`
- `SUPABASE_ANON_KEY`
- `STRIPE_SECRET_KEY` (for stripe-checkout)

## Security Considerations

- Strict origin allowlist prevents unauthorized cross-origin requests
- Credentials support maintained for cookie-based CSRF protection
- RLS policies remain enforced - no bypass needed
- Each user can only create/access their own CSRF tokens
- Double-submit cookie pattern remains intact