import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';
import { 
  STRIPE_SECRET_KEY as stripeSecret,
  STRIPE_WEBHOOK_SECRET as stripeWebhookSecret,
  SUPABASE_URL as supabaseUrl,
  SERVICE_ROLE_KEY as serviceRoleKey
} from '../_shared/config.ts';

// Initialize clients
const stripe = new Stripe(stripeSecret, {
  appInfo: { name: 'MyFutureSelf', version: '1.0.0' },
});
const supabase = createClient(supabaseUrl, serviceRoleKey);

Deno.serve(async (req: Request) => {
  try {
    // Handle OPTIONS request for CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204 });
    }

    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // get the signature from the header
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      return new Response('No signature found', { status: 400 });
    }

    // get the raw body
    const body = await req.text();

    // verify the webhook signature
    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, stripeWebhookSecret);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Webhook signature verification failed: ${message}`);
      return new Response(`Webhook signature verification failed: ${message}`, { status: 400 });
    }

    try {
      await handleEvent(event);
      return new Response(JSON.stringify({ received: true }), { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error handling webhook event:', error);
      return new Response(JSON.stringify({ error: message }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error processing webhook:', error);
    return new Response(JSON.stringify({ error: message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

async function handleEvent(event: Stripe.Event) {
  console.info(`Processing webhook event: ${event.type}`);
  
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
      break;
      
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      await syncCustomerFromStripe(subscription.customer as string);
      break;
    }
      
    case 'invoice.payment_succeeded':
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      if (invoice.subscription) {
        await syncCustomerFromStripe(invoice.customer as string);
      }
      break;
    }
      
    default:
      console.info(`Unhandled event type: ${event.type}`);
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const { customer: customerId, client_reference_id: userId, mode, payment_status } = session;
  
  if (!customerId || typeof customerId !== 'string') {
    throw new Error('No customer ID found in checkout session');
  }
  
  console.info(`Processing ${mode} checkout session for customer: ${customerId}`);
  
  try {
    // First, link the Stripe customer to the user if we have a userId
    if (userId) {
      const { error: linkError } = await supabase
        .from('subscriptions')
        .upsert({
          user_id: userId,
          stripe_customer_id: customerId,
          stripe_subscription_id: null,
          status: 'pending',
        }, {
          onConflict: 'user_id',
        });
        
      if (linkError) {
        console.error('Error linking user to Stripe customer:', linkError);
        throw new Error(`Failed to link user ${userId} to Stripe customer ${customerId}`);
      }
      
      console.info(`Successfully linked user ${userId} to Stripe customer ${customerId}`);
    }
    
    // Handle subscription checkout
    if (mode === 'subscription') {
      await syncCustomerFromStripe(customerId);
      
      // Update the subscription status in the subscriptions table
      if (userId) {
        const { error: statusError } = await supabase
          .from('subscriptions')
          .update({ status: 'active' })
          .eq('user_id', userId);
          
        if (statusError) {
          console.error('Error updating subscription status:', statusError);
        }
      }
    } 
    // Handle one-time payment
    else if (mode === 'payment' && payment_status === 'paid') {
      const {
        id: checkout_session_id,
        payment_intent,
        amount_subtotal,
        amount_total,
        currency,
      } = session;

      // Check if stripe_orders table exists before inserting
      const { error: orderError } = await supabase
        .from('stripe_orders')
        .insert({
          checkout_session_id,
          payment_intent_id: payment_intent,
          customer_id: customerId,
          amount_subtotal,
          amount_total,
          currency,
          payment_status,
          status: 'completed',
        });

      if (orderError) {
        // Log but don't throw - stripe_orders table might not exist
        console.warn('Warning: Could not insert order (table might not exist):', orderError);
      } else {
        console.info(`Successfully processed one-time payment for session: ${checkout_session_id}`);
      }
    }
  } catch (error) {
    console.error('Error handling checkout session:', error);
    throw error;
  }
}

async function syncCustomerFromStripe(customerId: string) {
  try {
    // First, get the user_id from the subscriptions table
    const { data: userLink, error: userLinkError } = await supabase
      .from('subscriptions')
      .select('user_id, stripe_subscription_id')
      .eq('stripe_customer_id', customerId)
      .single();
      
    if (userLinkError || !userLink) {
      console.warn(`No user linked to Stripe customer ${customerId}`);
    }
    
    // Fetch latest subscription data from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 1,
      status: 'all',
      expand: ['data.default_payment_method'],
    });

    // If no subscription is found, record a not_started state
    if (subscriptions.data.length === 0) {
      console.info(`No active subscriptions found for customer: ${customerId}`);
      
      // Update stripe_subscriptions table
      const { error: noSubError } = await supabase.from('stripe_subscriptions').upsert(
        {
          customer_id: customerId,
          subscription_status: 'not_started',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'customer_id' },
      );
      
      if (noSubError) {
        console.error('Error updating subscription status:', noSubError);
        throw new Error('Failed to update subscription status in database');
      }
      
      // Update subscriptions table status
      if (userLink?.user_id) {
        const { error: statusError } = await supabase
          .from('subscriptions')
          .update({ 
            status: 'inactive',
            stripe_subscription_id: null,
          })
          .eq('user_id', userLink.user_id);
          
        if (statusError) {
          console.error('Error updating user subscription status:', statusError);
        }
      }
      
      return;
    }

    // Get the first (and presumably only) subscription
    const subscription = subscriptions.data[0];

    // Store subscription state in stripe_subscriptions table
    const { error: subError } = await supabase.from('stripe_subscriptions').upsert(
      {
        customer_id: customerId,
        subscription_id: subscription.id,
        price_id: subscription.items.data[0].price.id,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        cancel_at_period_end: subscription.cancel_at_period_end,
        ...(subscription.default_payment_method && typeof subscription.default_payment_method !== 'string'
          ? {
              payment_method_brand: subscription.default_payment_method.card?.brand ?? null,
              payment_method_last4: subscription.default_payment_method.card?.last4 ?? null,
            }
          : {}),
        status: subscription.status,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'customer_id' },
    );

    if (subError) {
      console.error('Error syncing subscription:', subError);
      throw new Error('Failed to sync subscription in database');
    }
    
    // Update subscriptions table with subscription ID and status
    if (userLink?.user_id) {
      const mappedStatus = mapStripeStatusToAppStatus(subscription.status);
      const { error: linkUpdateError } = await supabase
        .from('subscriptions')
        .update({ 
          stripe_subscription_id: subscription.id,
          status: mappedStatus,
        })
        .eq('user_id', userLink.user_id);
        
      if (linkUpdateError) {
        console.error('Error updating subscription link:', linkUpdateError);
      }
    }
    
    console.info(`Successfully synced subscription for customer: ${customerId}`);
  } catch (error) {
    console.error(`Failed to sync subscription for customer ${customerId}:`, error);
    throw error;
  }
}

function mapStripeStatusToAppStatus(stripeStatus: string): string {
  switch (stripeStatus) {
    case 'active':
      return 'active';
    case 'past_due':
      return 'past_due';
    case 'canceled':
      return 'canceled';
    case 'incomplete':
    case 'incomplete_expired':
      return 'incomplete';
    case 'trialing':
      return 'trialing';
    case 'unpaid':
      return 'unpaid';
    default:
      return 'inactive';
  }
}
