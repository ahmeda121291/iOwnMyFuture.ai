import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

// Read environment variables from the Edge Function secrets
const supabaseUrl = Deno.env.get('PROJECT_URL') ?? '';
const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY') ?? '';
const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY') ?? '';

// Initialize clients
const supabase = createClient(supabaseUrl, serviceRoleKey);
const stripe = new Stripe(stripeSecret, {
  appInfo: { name: 'I Own My Future', version: '1.0.0' },
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify JWT and get user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { sessionId, userId } = await req.json();
    
    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: 'Session ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the userId matches the authenticated user
    if (userId && userId !== user.id) {
      console.error(`User ID mismatch: ${userId} !== ${user.id}`);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Confirming payment for session ${sessionId} and user ${user.id}`);

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'payment_intent', 'line_items']
    });

    // Verify the session is completed
    if (session.payment_status !== 'paid') {
      console.error(`Session ${sessionId} payment status: ${session.payment_status}`);
      return new Response(
        JSON.stringify({ error: 'Payment not completed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the session belongs to this user
    if (session.client_reference_id !== user.id && session.metadata?.userId !== user.id) {
      console.error(`Session ${sessionId} does not belong to user ${user.id}`);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get price information
    const priceId = session.line_items?.data[0]?.price?.id || session.metadata?.priceId || '';
    const amount = session.amount_total ? session.amount_total / 100 : 0;
    
    // Determine plan name based on price
    let planName = 'Pro';
    if (priceId === 'price_1QS0vnRqrkWBY7xJP77VQkUP' || amount === 180) {
      planName = 'Pro Annual';
    } else if (priceId === 'price_1QS0uQRqrkWBY7xJQnRLMhvL' || amount === 18) {
      planName = 'Pro Monthly';
    }

    // Update subscription in database for subscription mode
    if (session.mode === 'subscription' && session.subscription) {
      const subscription = typeof session.subscription === 'string' 
        ? await stripe.subscriptions.retrieve(session.subscription)
        : session.subscription as Stripe.Subscription;
      
      // First, ensure stripe_customers table has the user linked
      const { error: customerError } = await supabase
        .from('stripe_customers')
        .upsert({
          user_id: user.id,
          customer_id: session.customer as string,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });
      
      if (customerError) {
        console.error('Failed to link customer:', customerError);
      }
      
      // Update stripe_subscriptions table with subscription data
      const subscriptionStatus = subscription.status === 'active' ? 'active' : 
                                subscription.status === 'trialing' ? 'trialing' : 
                                subscription.status as any;
      
      const { error: updateError } = await supabase
        .from('stripe_subscriptions')
        .upsert({
          customer_id: session.customer as string,
          subscription_id: subscription.id,
          price_id: subscription.items.data[0]?.price.id,
          status: subscriptionStatus,
          current_period_start: subscription.current_period_start,
          current_period_end: subscription.current_period_end,
          cancel_at_period_end: subscription.cancel_at_period_end,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'customer_id' // stripe_subscriptions uses customer_id as unique
        });

      if (updateError) {
        console.error('Failed to update stripe_subscriptions:', updateError);
      } else {
        console.log(`Successfully confirmed subscription ${subscription.id} for customer ${session.customer}`);
      }
      
      // Also update the legacy subscriptions table for backward compatibility
      const { error: legacyError } = await supabase
        .from('subscriptions')
        .upsert({
          user_id: user.id,
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: subscription.id,
          status: subscription.status,
          created_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });
      
      if (legacyError) {
        console.error('Failed to update legacy subscriptions table:', legacyError);
      }
    }

    // For one-time payments, create a subscription record
    if (session.mode === 'payment') {
      // Calculate period end based on plan
      const periodDays = planName.includes('Annual') ? 365 : 30;
      const periodEndTimestamp = Math.floor(Date.now() / 1000) + (periodDays * 24 * 60 * 60);
      
      // First, ensure stripe_customers table has the user linked
      const { error: customerError } = await supabase
        .from('stripe_customers')
        .upsert({
          user_id: user.id,
          customer_id: session.customer as string,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });
      
      if (customerError) {
        console.error('Failed to link customer:', customerError);
      }
      
      // Create a pseudo-subscription in stripe_subscriptions for one-time payments
      const { error: updateError } = await supabase
        .from('stripe_subscriptions')
        .upsert({
          customer_id: session.customer as string,
          subscription_id: `one_time_${session.id}`, // Use session ID as pseudo subscription ID
          price_id: priceId,
          status: 'active' as any,
          current_period_start: Math.floor(Date.now() / 1000),
          current_period_end: periodEndTimestamp,
          cancel_at_period_end: false,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'customer_id'
        });

      if (updateError) {
        console.error('Failed to create subscription record in stripe_subscriptions:', updateError);
      } else {
        console.log(`Successfully created one-time payment record for customer ${session.customer}`);
      }
      
      // Also update the legacy subscriptions table
      const { error: legacyError } = await supabase
        .from('subscriptions')
        .upsert({
          user_id: user.id,
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: null,
          status: 'active',
          created_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });
      
      if (legacyError) {
        console.error('Failed to update legacy subscriptions table:', legacyError);
      }
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        sessionId: session.id,
        amount: amount,
        plan: planName,
        status: session.payment_status,
        subscriptionId: session.subscription,
        customerId: session.customer
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error confirming payment:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to confirm payment' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});