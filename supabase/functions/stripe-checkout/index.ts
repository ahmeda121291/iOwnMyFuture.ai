import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';
import { z } from 'npm:zod@3.25.76';
import { authenticateAndValidateCSRF, handleCORS } from '../_shared/csrf-middleware.ts';

// Read environment variables from the Edge Function secrets
const supabaseUrl = Deno.env.get('PROJECT_URL') ?? '';
const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY') ?? '';
const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY') ?? '';

// Initialize clients
const supabase = createClient(supabaseUrl, serviceRoleKey);
const stripe = new Stripe(stripeSecret, {
  appInfo: { name: 'MyFutureSelf', version: '1.0.0' },
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': '*',
};

// Zod schema for request validation
const CheckoutRequestSchema = z.object({
  price_id: z.string().min(1, 'Price ID required'),
  success_url: z.string().url('Invalid success URL'),
  cancel_url: z.string().url('Invalid cancel URL'),
  mode: z.enum(['payment', 'subscription']),
  csrf_token: z.string().min(32, 'CSRF token required'),
  user_id: z.string().optional(), // Optional, will use authenticated user if not provided
  email: z.string().email().optional(), // Optional email override
});

// Helper to build CORS responses
function corsResponse(body: string | object | null, status = 200) {
  if (status === 204) {
    return new Response(null, { status, headers: corsHeaders });
  }

  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return handleCORS(corsHeaders);
    }

    if (req.method !== 'POST') {
      return corsResponse({ error: 'Method not allowed' }, 405);
    }

    // Authenticate and validate CSRF token
    const authResult = await authenticateAndValidateCSRF(req, { corsHeaders });
    if (!authResult.success) {
      return authResult.response!;
    }

    const user = authResult.user!;

    // Parse and validate request body
    const requestBody = await req.json();
    
    // Log incoming request in dev
    if (Deno.env.get('ENVIRONMENT') !== 'production') {
      console.log('[stripe-checkout] Incoming request body:', { 
        ...requestBody, 
        csrf_token: requestBody.csrf_token ? 'PRESENT' : 'MISSING' 
      });
    }
    
    const validationResult = CheckoutRequestSchema.safeParse(requestBody);
    
    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors
        .map(err => `${err.path.join('.')}: ${err.message}`)
        .join(', ');
      console.error('[stripe-checkout] Validation failed:', errorMessage);
      return corsResponse({ error: `Validation error: ${errorMessage}` }, 400);
    }

    const { price_id, success_url, cancel_url, mode, user_id, email } = validationResult.data;
    
    // Validate that userId from request matches authenticated user if provided
    if (user_id && user_id !== user.id) {
      console.error(`[stripe-checkout] User ID mismatch: request=${user_id}, auth=${user.id}`);
      return corsResponse({ error: 'Unauthorized: user ID mismatch' }, 403);
    }
    
    // Use provided email or fall back to user's email
    const customerEmail = email || user.email;

    const { data: customer, error: getCustomerError } = await supabase
      .from('stripe_customers')
      .select('customer_id')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .maybeSingle();

    if (getCustomerError) {
      console.error('Failed to fetch customer information from the database', getCustomerError);
      return corsResponse({ error: 'Failed to fetch customer information' }, 500);
    }

    let customerId: string;

    // CRITICAL: Validate price_id exists and is active
    try {
      if (Deno.env.get('ENVIRONMENT') !== 'production') {
        console.log(`[stripe-checkout] Validating price: ${price_id}`);
      }
      
      const price = await stripe.prices.retrieve(price_id);
      if (!price.active) {
        console.error(`[stripe-checkout] Attempted to use inactive price: ${price_id}`);
        return corsResponse({ error: 'Invalid or inactive price ID' }, 400);
      }
      
      // Additional validation: ensure price is for the correct product
      if (mode === 'subscription' && price.type !== 'recurring') {
        console.error(`[stripe-checkout] Price type mismatch: expected recurring, got ${price.type}`);
        return corsResponse({ error: 'Invalid price type for subscription' }, 400);
      }
      if (mode === 'payment' && price.type !== 'one_time') {
        console.error(`[stripe-checkout] Price type mismatch: expected one_time, got ${price.type}`);
        return corsResponse({ error: 'Invalid price type for one-time payment' }, 400);
      }
      
      if (Deno.env.get('ENVIRONMENT') !== 'production') {
        console.log(`[stripe-checkout] Price validated successfully: ${price.id}`);
      }
    } catch (priceError) {
      console.error(`[stripe-checkout] Failed to validate price ${price_id}:`, priceError);
      return corsResponse({ error: 'Invalid or inaccessible price ID' }, 400);
    }

    // Create Stripe customer mapping if none exists
    if (!customer || !customer.customer_id) {
      const newCustomer = await stripe.customers.create({
        email: customerEmail || user.email,
        metadata: { userId: user.id },
      });

      console.log(`[stripe-checkout] Created new Stripe customer ${newCustomer.id} for user ${user.id}`);

      const { error: createCustomerError } = await supabase.from('stripe_customers').insert({
        user_id: user.id,
        customer_id: newCustomer.id,
      });

      if (createCustomerError) {
        console.error('Failed to save customer information in the database', createCustomerError);
        try {
          await stripe.customers.del(newCustomer.id);
          await supabase.from('stripe_subscriptions').delete().eq('customer_id', newCustomer.id);
        } catch (deleteError) {
          console.error('Failed to clean up after customer mapping error:', deleteError);
        }
        return corsResponse({ error: 'Failed to create customer mapping' }, 500);
      }

      if (mode === 'subscription') {
        const { error: createSubscriptionError } = await supabase.from('stripe_subscriptions').insert({
          customer_id: newCustomer.id,
          status: 'not_started',
        });

        if (createSubscriptionError) {
          console.error('Failed to save subscription in the database', createSubscriptionError);
          try {
            await stripe.customers.del(newCustomer.id);
          } catch (deleteError) {
            console.error('Failed to delete Stripe customer after subscription creation error:', deleteError);
          }
          return corsResponse({ error: 'Unable to save the subscription in the database' }, 500);
        }
      }

      customerId = newCustomer.id;
      console.log(`Successfully set up new customer ${customerId} with subscription record`);
    } else {
      customerId = customer.customer_id;

      if (mode === 'subscription') {
        // Verify subscription exists for existing customer
        const { data: subscription, error: getSubscriptionError } = await supabase
          .from('stripe_subscriptions')
          .select('status')
          .eq('customer_id', customerId)
          .maybeSingle();

        if (getSubscriptionError) {
          console.error('Failed to fetch subscription information from the database', getSubscriptionError);
          return corsResponse({ error: 'Failed to fetch subscription information' }, 500);
        }

        if (!subscription) {
          // Create subscription record for existing customer if missing
          const { error: createSubscriptionError } = await supabase.from('stripe_subscriptions').insert({
            customer_id: customerId,
            status: 'not_started',
          });

          if (createSubscriptionError) {
            console.error('Failed to create subscription record for existing customer', createSubscriptionError);
            return corsResponse({ error: 'Failed to create subscription record for existing customer' }, 500);
          }
        } else if (subscription.status === 'active' || subscription.status === 'trialing') {
          // Prevent creating a new subscription if one is already active
          console.error(`User ${user.id} attempted to create subscription while having active status: ${subscription.status}`);
          return corsResponse({ error: 'Active subscription already exists' }, 400);
        }
      }
    }

    // CRITICAL: Verify customer belongs to authenticated user before creating session
    const stripeCustomer = await stripe.customers.retrieve(customerId);
    if (stripeCustomer.deleted) {
      console.error(`Attempted to use deleted customer: ${customerId}`);
      return corsResponse({ error: 'Invalid customer' }, 400);
    }
    
    // Verify the customer metadata matches the authenticated user
    if (stripeCustomer.metadata?.userId && stripeCustomer.metadata.userId !== user.id) {
      console.error(`Customer ${customerId} does not belong to user ${user.id}`);
      return corsResponse({ error: 'Unauthorized' }, 403);
    }

    // Create Stripe Checkout session with client_reference_id for webhook validation
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      client_reference_id: user.id, // Critical: links session to user for webhook processing
      payment_method_types: ['card'],
      line_items: [{ price: price_id, quantity: 1 }],
      mode,
      success_url,
      cancel_url,
      metadata: {
        userId: user.id,
        priceId: price_id,
      },
    });

    console.log(`[stripe-checkout] Created checkout session ${session.id} for customer ${customerId}`);
    
    if (Deno.env.get('ENVIRONMENT') !== 'production') {
      console.log(`[stripe-checkout] Session URL: ${session.url}`);
    }

    // IMPORTANT: Return both sessionId and url in the expected format
    return corsResponse({ 
      sessionId: session.id, 
      url: session.url 
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[stripe-checkout] Checkout error:`, error);
    console.error(`[stripe-checkout] Error message: ${errorMessage}`);
    
    // Return more specific error message in development
    if (Deno.env.get('ENVIRONMENT') !== 'production') {
      return corsResponse({ 
        error: `Failed to create checkout session: ${errorMessage}` 
      }, 500);
    }
    
    return corsResponse({ error: 'Failed to create checkout session' }, 500);
  }
});
