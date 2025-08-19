# CORS Troubleshooting Guide for MyFutureSelf.ai

## Overview
This guide documents the CORS configuration for MyFutureSelf.ai and provides troubleshooting steps for common issues.

## Current Configuration

### Frontend
- **Pricing Service**: Uses `credentials: 'omit'` for public pricing endpoints
- **Other API Calls**: Use Supabase client which handles CORS automatically
- **Service Worker**: Must be cleared after deployment to avoid cached bundles

### Edge Functions
- **stripe-prices**: Public endpoint with `allowCredentials = false`
- **Other functions**: Protected endpoints with `allowCredentials = true`
- **CORS Headers**: Dynamic based on request origin (see `_shared/config.ts`)

## Common Issues and Solutions

### 1. CORS Policy Error: Wildcard Origin with Credentials

**Error Message:**
```
Access to fetch at 'https://supabase.iownmyfuture.ai/functions/v1/stripe-prices' 
from origin 'https://iownmyfuture.ai' has been blocked by CORS policy: 
The value of the 'Access-Control-Allow-Origin' header in the response must not be 
the wildcard '*' when the request's credentials mode is 'include'.
```

**Solution:**
1. Ensure frontend uses `credentials: 'omit'` for public endpoints:
```javascript
fetch(apiUrl, {
  method: 'GET',
  headers,
  mode: 'cors',
  credentials: 'omit', // Critical for public endpoints
})
```

2. Update edge function to disable credentials:
```typescript
const corsHeaders = getCorsHeaders(req, false); // false = no credentials
```

### 2. 503 Service Unavailable

**Error Message:**
```
Failed to load resource: the server responded with a status of 503 ()
```

**Common Causes:**
1. Missing environment variables
2. Invalid Stripe API keys
3. Function timeout
4. Unhandled exceptions

**Debugging Steps:**
```bash
# Check function logs
supabase functions logs --name stripe-prices

# Verify environment variables
supabase secrets list

# Test locally
supabase functions serve stripe-prices
```

### 3. Auth Session Missing

**Error Message:**
```
Error getting current user: Auth session missing!
```

**Solution:**
Check for session before calling getUser():
```javascript
const { data: { session } } = await supabase.auth.getSession();
if (!session) {
  return null; // User not logged in
}
const { data: { user } } = await supabase.auth.getUser();
```

## Deployment Checklist

### 1. Set Environment Variables
```bash
# Production
supabase secrets set ENVIRONMENT=production
supabase secrets set SITE_URL=https://iownmyfuture.ai
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
```

### 2. Deploy Functions
```bash
# Use the deployment script
./scripts/deploy-functions.sh production

# Or manually
supabase functions deploy stripe-prices --no-verify-jwt
supabase functions deploy get-stripe-session --no-verify-jwt
```

### 3. Clear Browser Cache
1. Open Chrome DevTools (F12)
2. Go to Application → Service Workers
3. Unregister all service workers
4. Go to Application → Storage
5. Click "Clear site data"
6. Hard refresh (Ctrl+Shift+R)

### 4. Verify Deployment
```bash
# Check function status
supabase functions list

# Test the endpoint
curl -X GET https://your-project.supabase.co/functions/v1/stripe-prices \
  -H "Origin: https://iownmyfuture.ai"
```

## Using Supabase Client (Recommended)

Instead of manual fetch calls, use the Supabase client for better CORS handling:

```javascript
// Old method (manual fetch)
const response = await fetch(`${SUPABASE_URL}/functions/v1/stripe-prices`, {
  headers: { 'Content-Type': 'application/json' },
  credentials: 'omit'
});

// New method (Supabase client)
const { data, error } = await supabase.functions.invoke('stripe-prices', {
  method: 'GET'
});
```

## CORS Headers Configuration

The `getCorsHeaders` function in `_shared/config.ts`:

```typescript
export function getCorsHeaders(req: Request, allowCredentials = true): Record<string, string> {
  const origin = req.headers.get('Origin') ?? '';
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  
  const headers: Record<string, string> = {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin',
  };

  if (allowCredentials) {
    headers['Access-Control-Allow-Credentials'] = 'true';
  }

  return headers;
}
```

## Testing CORS

### Local Testing
```bash
# Start local functions
supabase functions serve

# Test with curl
curl -X OPTIONS http://localhost:54321/functions/v1/stripe-prices \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: GET"
```

### Production Testing
```bash
# Test OPTIONS preflight
curl -X OPTIONS https://your-project.supabase.co/functions/v1/stripe-prices \
  -H "Origin: https://iownmyfuture.ai" \
  -H "Access-Control-Request-Method: GET" \
  -v

# Test actual request
curl -X GET https://your-project.supabase.co/functions/v1/stripe-prices \
  -H "Origin: https://iownmyfuture.ai" \
  -v
```

## Monitoring

### Set up alerts for:
1. 503 errors on stripe-prices endpoint
2. CORS errors in browser console
3. High latency on pricing fetches

### Log important events:
```javascript
// In stripePrices.service.ts
console.log('[Pricing] Fetching prices...');
console.log('[Pricing] Using fallback prices due to:', error);
```

## Contact

For persistent issues:
1. Check Supabase status: https://status.supabase.com
2. Review function logs: `supabase functions logs --name stripe-prices`
3. Contact support with:
   - Error messages
   - Browser console logs
   - Network tab screenshots
   - Function logs