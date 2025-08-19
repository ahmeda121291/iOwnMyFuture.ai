import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@13.5.0?target=deno';

/* eslint-disable @typescript-eslint/naming-convention */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
/* eslint-enable @typescript-eslint/naming-convention */

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get environment variables
    const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');
    
    if (!STRIPE_SECRET_KEY) {
      throw new Error('Missing STRIPE_SECRET_KEY environment variable');
    }

    // Initialize Stripe
    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Parse request body or URL params
    let sessionId: string | null = null;
    
    if (req.method === 'POST') {
      const body = await req.json();
      sessionId = body.session_id;
    } else if (req.method === 'GET') {
      const url = new URL(req.url);
      sessionId = url.searchParams.get('session_id');
    }

    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: 'session_id is required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, // eslint-disable-line @typescript-eslint/naming-convention
        }
      );
    }

    // Retrieve the Checkout Session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent', 'subscription', 'customer'],
    });

    // Extract relevant information
    const sessionData = {
      id: session.id,
      status: session.status,
      payment_status: session.payment_status,
      customer_email: session.customer_details?.email,
      customer_name: session.customer_details?.name,
      amount_total: session.amount_total,
      amount_subtotal: session.amount_subtotal,
      currency: session.currency,
      mode: session.mode,
      success_url: session.success_url,
      created: session.created,
      expires_at: session.expires_at,
      payment_method_types: session.payment_method_types,
      // Include subscription details if it's a subscription
      subscription: session.subscription ? {
        id: typeof session.subscription === 'string' ? session.subscription : session.subscription.id,
        status: typeof session.subscription !== 'string' ? session.subscription.status : undefined,
      } : null,
      // Include payment intent details if it's a one-time payment
      payment_intent: session.payment_intent ? {
        id: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent.id,
        status: typeof session.payment_intent !== 'string' ? session.payment_intent.status : undefined,
      } : null,
    };

    return new Response(
      JSON.stringify(sessionData),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, // eslint-disable-line @typescript-eslint/naming-convention
      }
    );

  } catch (error) {
    console.error('Error retrieving Stripe session:', error);
    
    // Check if it's a Stripe error
    if (error instanceof Stripe.errors.StripeError) {
      return new Response(
        JSON.stringify({ 
          error: error.message,
          type: error.type,
          code: error.code,
        }),
        { 
          status: error.statusCode || 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, // eslint-disable-line @typescript-eslint/naming-convention
        }
      );
    }
    
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, // eslint-disable-line @typescript-eslint/naming-convention
      }
    );
  }
});