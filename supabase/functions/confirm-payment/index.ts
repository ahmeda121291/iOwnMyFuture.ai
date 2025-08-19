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
  appInfo: { name: 'MyFutureSelf', version: '1.0.0' },
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
      
      // Update subscription in database using proper schema
      const { error: updateError } = await supabase
        .from('subscriptions')
        .upsert({
          user_id: user.id,
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: subscription.id,
          status: subscription.status,
          subscription_status: subscription.status,
          price_id: subscription.items.data[0]?.price.id,
          quantity: subscription.items.data[0]?.quantity || 1,
          cancel_at_period_end: subscription.cancel_at_period_end,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          plan_name: planName,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id' // Use user_id as the unique constraint
        });

      if (updateError) {
        console.error('Failed to update subscription:', updateError);
        // Try using the sync function as fallback
        try {
          const { error: syncError } = await supabase.rpc('sync_subscription_from_stripe', {
            p_user_id: user.id,
            p_stripe_customer_id: session.customer as string,
            p_stripe_subscription_id: subscription.id,
            p_status: subscription.status,
            p_price_id: subscription.items.data[0]?.price.id,
            p_current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            p_current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            p_cancel_at_period_end: subscription.cancel_at_period_end,
            p_quantity: subscription.items.data[0]?.quantity || 1,
            p_plan_name: planName
          });
          
          if (syncError) {
            console.error('Failed to sync subscription via function:', syncError);
          } else {
            console.log(`Successfully synced subscription ${subscription.id} for user ${user.id} via function`);
          }
        } catch (funcError) {
          console.error('Error calling sync function:', funcError);
        }
      } else {
        console.log(`Successfully confirmed subscription ${subscription.id} for user ${user.id}`);
      }
    }

    // For one-time payments, create a subscription record
    if (session.mode === 'payment') {
      // Calculate period end based on plan
      const periodDays = planName.includes('Annual') ? 365 : 30;
      const periodEnd = new Date(Date.now() + periodDays * 24 * 60 * 60 * 1000);
      
      const { error: updateError } = await supabase
        .from('subscriptions')
        .upsert({
          user_id: user.id,
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: null, // No subscription ID for one-time payments
          status: 'active',
          subscription_status: 'active',
          price_id: priceId,
          plan_name: planName,
          current_period_start: new Date().toISOString(),
          current_period_end: periodEnd.toISOString(),
          cancel_at_period_end: false,
          quantity: 1,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id' // Use user_id as the unique constraint
        });

      if (updateError) {
        console.error('Failed to create subscription record:', updateError);
        // Try using the sync function as fallback
        try {
          const { error: syncError } = await supabase.rpc('sync_subscription_from_stripe', {
            p_user_id: user.id,
            p_stripe_customer_id: session.customer as string,
            p_stripe_subscription_id: null,
            p_status: 'active',
            p_price_id: priceId,
            p_current_period_start: new Date().toISOString(),
            p_current_period_end: periodEnd.toISOString(),
            p_cancel_at_period_end: false,
            p_quantity: 1,
            p_plan_name: planName
          });
          
          if (syncError) {
            console.error('Failed to sync payment via function:', syncError);
          } else {
            console.log(`Successfully synced one-time payment for user ${user.id} via function`);
          }
        } catch (funcError) {
          console.error('Error calling sync function:', funcError);
        }
      } else {
        console.log(`Successfully created subscription record for one-time payment for user ${user.id}`);
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