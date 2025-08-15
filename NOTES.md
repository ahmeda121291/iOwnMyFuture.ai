# CSRF Token RLS Fix - Implementation Notes

## Issue
The csrf-token edge function was throwing "new row violates row-level security policy for table csrf_tokens" because it was using the SERVICE_ROLE_KEY to bypass RLS, but the insert operation was still subject to RLS policies.

## Solution
Modified the csrf-token edge function to use the user's JWT with the anon key instead of the service role key. This ensures:
1. The authenticated user's ID is properly recognized by RLS policies
2. The INSERT operation satisfies the RLS policy: `auth.uid() = user_id`
3. No service role bypass is needed, maintaining security

## Changes Made

### 1. `/supabase/functions/csrf-token/index.ts`
- Removed SERVICE_ROLE_KEY dependency
- Changed to use SUPABASE_URL and SUPABASE_ANON_KEY environment variables
- Modified to create Supabase client per request with user's JWT forwarded via Authorization header
- This ensures auth.uid() is properly set for RLS validation

### 2. Client-side Code
- No changes needed - already using `supabase.functions.invoke()` which automatically forwards the user's JWT
- The `/app/shared/security/csrf.ts` properly includes Authorization header with user's session token

### 3. Deployment
- Deployed updated csrf-token function to production
- Function now respects RLS policies while maintaining security

## Technical Details

### Before (causing RLS error):
```typescript
// Global client with service role - bypasses RLS but insert still checked
const supabase = createClient(supabaseUrl, serviceRoleKey);
```

### After (RLS compliant):
```typescript
// Per-request client with user's JWT - respects RLS
const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
  global: { headers: { Authorization: authHeader } },
});
```

## Verification
- The csrf-token edge function now properly authenticates users
- CSRF tokens are inserted with the authenticated user's ID
- RLS policies are satisfied: `auth.uid() = user_id`
- Stripe checkout flow continues to work (has requireCSRF: false currently)

## Environment Variables Required
Edge functions need these environment variables set in Supabase Dashboard:
- `SUPABASE_URL` or `PROJECT_URL`
- `SUPABASE_ANON_KEY`

## Security Considerations
- RLS policies remain enforced - no bypass needed
- Each user can only create/access their own CSRF tokens
- Double-submit cookie pattern remains intact
- No security degradation from the changes