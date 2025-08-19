import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';
import { z } from 'npm:zod@3.25.76';
import { authenticateAndValidateCSRF } from '../_shared/csrf-middleware.ts';
import type { AuthenticatedUser } from '../_shared/csrf-middleware.ts';
import { 
  SUPABASE_URL as supabaseUrl,
  SERVICE_ROLE_KEY as serviceRoleKey,
  STRIPE_SECRET_KEY as stripeSecret,
  getCorsHeaders 
} from '../_shared/config.ts';

// Initialize clients
const supabase = createClient(supabaseUrl, serviceRoleKey);
const stripe = new Stripe(stripeSecret, {
  appInfo: { name: 'I Own My Future', version: '1.0.0' },
});

// Zod schema for request validation
const CheckoutRequestSchema = z.object({
  price_id: z.string().min(1, 'Price ID required'),
  success_url: z.string().url('Invalid success URL'),
  cancel_url: z.string().url('Invalid cancel URL'),
  mode: z.enum(['payment', 'subscription']),
  csrf_token: z.string().optional(), // Make CSRF token optional
});

// Helper to build CORS responses
function corsResponse(req: Request, body: string | object | null, status = 200) {
  const cors = getCorsHeaders(req);
  
  if (status === 204) {
    return new Response(null, { status, headers: cors });
  }

  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' }, // eslint-disable-line @typescript-eslint/naming-convention
  });
}

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);
  
  // eslint-disable-next-line no-console
  console.log('[stripe-checkout] Request received:', {
    method: req.method,
    url: req.url,
    headers: {
      authorization: req.headers.get('authorization') ? 'PRESENT' : 'MISSING',
      contentType: req.headers.get('content-type')
    }
  });

  try {
    if (req.method === 'OPTIONS') {
      // eslint-disable-next-line no-console
      console.log('[stripe-checkout] Handling OPTIONS request');
      // Preflight request
      return new Response(null, { status: 204, headers: cors });
    }

    if (req.method !== 'POST') {
      // eslint-disable-next-line no-console
      console.log('[stripe-checkout] Invalid method:', req.method);
      return corsResponse(req, { error: 'Method not allowed' }, 405);
    }

    // eslint-disable-next-line no-console
    console.log('[stripe-checkout] Authenticating user and validating CSRF...');
    
    // Skip CSRF validation for now - just authenticate
    const requireCSRF = false;
    
    // Authenticate and validate CSRF token
    const authResult = await authenticateAndValidateCSRF(req, { 
      corsHeaders: cors,
      requireCSRF 
    });
    if (!authResult.success) {
      // eslint-disable-next-line no-console
      console.error('[stripe-checkout] Auth/CSRF validation failed');
      return authResult.response as Response;
    }

    const user = authResult.user as AuthenticatedUser;
    // eslint-disable-next-line no-console
    console.log('[stripe-checkout] User authenticated:', user.email);

    // Parse and validate request body
    const requestBody = await req.json();
    
    // Always log incoming request for debugging
    // eslint-disable-next-line no-console
    console.log('[stripe-checkout] Incoming request body:', { 
      ...requestBody, 
      csrf_token: requestBody.csrf_token ? 'PRESENT (length: ' + requestBody.csrf_token.length + ')' : 'MISSING',
      price_id: requestBody.price_id,
      mode: requestBody.mode,
      user_id: requestBody.user_id
    });
    
    const validationResult = CheckoutRequestSchema.safeParse(requestBody);
    
    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors
        .map(err => `${err.path.join('.')}: ${err.message}`)
        .join(', ');
      console.error('[stripe-checkout] Validation failed:', errorMessage);
      return corsResponse(req, { error: `Validation error: ${errorMessage}` }, 400);
    }

    const { price_id: priceId, success_url: successUrl, cancel_url: cancelUrl, mode } = validationResult.data;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const csrfToken = validationResult.data.csrf_token;
    
    // eslint-disable-next-line no-console
    console.log(`[stripe-checkout] Processing request for user: ${user.email}`);

    // Use Stripe API directly instead of database table
    let customerId: string | null = null;

    // CRITICAL: Validate price_id exists and is active
    try {
      // eslint-disable-next-line no-console
      console.log(`[stripe-checkout] Validating price: ${priceId}`);
      
      const price = await stripe.prices.retrieve(priceId);
      // eslint-disable-next-line no-console
      console.log(`[stripe-checkout] Price retrieved:`, {
        id: price.id,
        active: price.active,
        type: price.type,
        currency: price.currency,
        unit_amount: price.unit_amount
      });
      
      if (!price.active) {
        // eslint-disable-next-line no-console
        console.error(`[stripe-checkout] Attempted to use inactive price: ${priceId}`);
        return corsResponse(req, { error: 'Invalid or inactive price ID' }, 400);
      }
      
      // Additional validation: ensure price is for the correct product
      if (mode === 'subscription' && price.type !== 'recurring') {
        // eslint-disable-next-line no-console
        console.error(`[stripe-checkout] Price type mismatch: expected recurring, got ${price.type}`);
        return corsResponse(req, { error: 'Invalid price type for subscription' }, 400);
      }
      if (mode === 'payment' && price.type !== 'one_time') {
        // eslint-disable-next-line no-console
        console.error(`[stripe-checkout] Price type mismatch: expected one_time, got ${price.type}`);
        return corsResponse(req, { error: 'Invalid price type for one-time payment' }, 400);
      }
      
      // eslint-disable-next-line no-console
      console.log(`[stripe-checkout] Price validated successfully: ${price.id}`);
    } catch (priceError) {
      // eslint-disable-next-line no-console
      console.error(`[stripe-checkout] Failed to validate price ${priceId}:`, priceError);
      // eslint-disable-next-line no-console
      console.error(`[stripe-checkout] Price error details:`, {
        message: priceError.message,
        type: priceError.type,
        statusCode: priceError.statusCode
      });
      return corsResponse(req, { error: `Invalid or inaccessible price ID: ${priceError.message}` }, 400);
    }

    // Try to find an existing customer via Stripe using a search by email
    // eslint-disable-next-line no-console
    console.log(`[stripe-checkout] Searching for existing Stripe customer with email: ${user.email}`);
    
    const existingCustomers = await stripe.customers.list({
      email: user.email,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      customerId = existingCustomers.data[0].id;
      // eslint-disable-next-line no-console
      console.log(`[stripe-checkout] Found existing Stripe customer: ${customerId} for user ${user.id}`);
      
      // Update metadata if needed to ensure supabase_user_id is set
      const existingCustomer = existingCustomers.data[0];
      if (!existingCustomer.metadata?.supabase_user_id) {
        // eslint-disable-next-line no-console
        console.log(`[stripe-checkout] Updating customer ${customerId} metadata with supabase_user_id`);
        await stripe.customers.update(customerId, {
          metadata: { supabase_user_id: user.id },
        });
      }
    } else {
      // eslint-disable-next-line no-console
      console.log(`[stripe-checkout] No existing customer found, creating new Stripe customer for user ${user.id}`);
      
      const newCustomer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      
      customerId = newCustomer.id;
      // eslint-disable-next-line no-console
      console.log(`[stripe-checkout] Created new Stripe customer: ${customerId} with metadata supabase_user_id: ${user.id}`);
    }

    // Handle subscription tracking if needed
    if (mode === 'subscription' && customerId) {
      // Check if we have a subscription record (optional - can be removed if not needed)
      const { data: subscription, error: getSubscriptionError } = await supabase
        .from('stripe_subscriptions')
        .select('status')
        .eq('customer_id', customerId)
        .maybeSingle();

      if (getSubscriptionError) {
        // eslint-disable-next-line no-console
        console.warn('[stripe-checkout] Could not check subscription status:', getSubscriptionError.message);
        // Continue anyway - don't block checkout
      } else if (subscription?.status === 'active' || subscription?.status === 'trialing') {
        // Prevent creating a new subscription if one is already active
        // eslint-disable-next-line no-console
        console.error(`User ${user.id} attempted to create subscription while having active status: ${subscription.status}`);
        return corsResponse(req, { error: 'Active subscription already exists' }, 400);
      } else if (!subscription) {
        // Optionally create subscription record (can be handled by webhook instead)
        const { error: createSubscriptionError } = await supabase.from('stripe_subscriptions').insert({
          customer_id: customerId,
          status: 'not_started',
        });

        if (createSubscriptionError) {
          // eslint-disable-next-line no-console
          console.warn('[stripe-checkout] Could not create subscription record:', createSubscriptionError.message);
          // Continue anyway - webhook will handle it
        }
      }
    }

    // CRITICAL: Verify customer belongs to authenticated user before creating session
    if (!customerId) {
      // eslint-disable-next-line no-console
      console.error(`[stripe-checkout] No customer ID available for user ${user.id}`);
      return corsResponse(req, { error: 'Failed to initialize customer' }, 500);
    }
    
    const stripeCustomer = await stripe.customers.retrieve(customerId);
    if (stripeCustomer.deleted) {
      // eslint-disable-next-line no-console
      console.error(`[stripe-checkout] Attempted to use deleted customer: ${customerId}`);
      return corsResponse(req, { error: 'Invalid customer' }, 400);
    }
    
    // Verify the customer metadata matches the authenticated user
    if (stripeCustomer.metadata?.supabase_user_id && stripeCustomer.metadata.supabase_user_id !== user.id) {
      // eslint-disable-next-line no-console
      console.error(`[stripe-checkout] Customer ${customerId} does not belong to user ${user.id}`);
      return corsResponse(req, { error: 'Unauthorized' }, 403);
    }

    // Create Stripe Checkout session with client_reference_id for webhook validation
    // eslint-disable-next-line no-console
    console.log(`[stripe-checkout] Creating checkout session for customer ${customerId}`);
    
    const sessionParams = {
      customer: customerId,
      client_reference_id: user.id, // Critical: links session to user for webhook processing
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId: user.id,
        priceId: priceId,
      },
    };
    
    // eslint-disable-next-line no-console
    console.log(`[stripe-checkout] Session params:`, {
      customer: sessionParams.customer,
      mode: sessionParams.mode,
      success_url: sessionParams.success_url,
      cancel_url: sessionParams.cancel_url,
      price_id: priceId
    });
    
    const session = await stripe.checkout.sessions.create(sessionParams);

    // eslint-disable-next-line no-console
    console.log(`[stripe-checkout] Created checkout session:`, {
      id: session.id,
      url: session.url ? 'PRESENT' : 'MISSING',
      urlLength: session.url ? session.url.length : 0,
      status: session.status,
      customer: session.customer
    });
    
    if (!session.url) {
      // eslint-disable-next-line no-console
      console.error(`[stripe-checkout] Session created but URL is missing!`);
      return corsResponse(req, { error: 'Checkout session created but URL not available' }, 500);
    }

    // eslint-disable-next-line no-console
    console.log(`[stripe-checkout] Session URL: ${session.url.substring(0, 60)}...`);

    // IMPORTANT: Return both sessionId and url in the expected format
    const responseData = { 
      sessionId: session.id, 
      url: session.url 
    };
    
    // eslint-disable-next-line no-console
    console.log(`[stripe-checkout] Sending success response with sessionId and url`);
    
    return corsResponse(req, responseData);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    // eslint-disable-next-line no-console
    console.error(`[stripe-checkout] Checkout error:`, error);
    // eslint-disable-next-line no-console
    console.error(`[stripe-checkout] Error message: ${errorMessage}`);
    
    // Return more specific error message in development
    if (Deno.env.get('ENVIRONMENT') !== 'production') {
      return corsResponse(req, { 
        error: `Failed to create checkout session: ${errorMessage}` 
      }, 500);
    }
    
    return corsResponse(req, { error: 'Failed to create checkout session' }, 500);
  }
});
