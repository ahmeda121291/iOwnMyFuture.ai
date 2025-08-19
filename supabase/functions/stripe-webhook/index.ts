import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';
import { 
  STRIPE_SECRET_KEY as stripeSecret,
  STRIPE_WEBHOOK_SECRET as stripeWebhookSecret,
  SUPABASE_URL as supabaseUrl,
  SERVICE_ROLE_KEY as serviceRoleKey
} from '../_shared/config.ts';

// Get environment variables for email
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'noreply@iownmyfuture.ai';
const APP_URL = Deno.env.get('APP_URL') || 'https://iownmyfuture.ai';

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
  
  // Extract price information from line items if available
  let priceId: string | null = null;
  let planName = 'Pro';
  const amount = session.amount_total ? session.amount_total / 100 : 0;
  
  // Try to get price ID from line items
  if (session.line_items?.data?.[0]?.price?.id) {
    priceId = session.line_items.data[0].price.id;
  }
  
  // Determine plan name based on amount or price ID
  if (priceId === 'price_1QS0vnRqrkWBY7xJP77VQkUP' || amount === 180) {
    planName = 'Pro Annual';
  } else if (priceId === 'price_1QS0uQRqrkWBY7xJQnRLMhvL' || amount === 18) {
    planName = 'Pro Monthly';
  }
  
  if (!customerId || typeof customerId !== 'string') {
    throw new Error('No customer ID found in checkout session');
  }
  
  console.info(`Processing ${mode} checkout session for customer: ${customerId}`);
  
  // Send confirmation email
  await sendConfirmationEmail(session);
  
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
          subscription_status: 'pending',
          price_id: priceId,
          plan_name: planName,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id',
        });
        
      if (linkError) {
        console.error('Error linking user to Stripe customer:', linkError);
        // Try using the sync function as fallback
        try {
          const { error: syncError } = await supabase.rpc('sync_subscription_from_stripe', {
            p_user_id: userId,
            p_stripe_customer_id: customerId,
            p_stripe_subscription_id: null,
            p_status: 'pending',
            p_price_id: priceId,
            p_plan_name: planName
          });
          
          if (syncError) {
            console.error('Failed to sync via function:', syncError);
            throw new Error(`Failed to link user ${userId} to Stripe customer ${customerId}`);
          }
        } catch (funcError) {
          console.error('Error calling sync function:', funcError);
          throw new Error(`Failed to link user ${userId} to Stripe customer ${customerId}`);
        }
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
          .update({ 
            status: 'active',
            subscription_status: 'active',
            updated_at: new Date().toISOString()
          })
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
      .order('created_at', { ascending: false })
      .limit(1);
      
    if (userLinkError || !userLink || userLink.length === 0) {
      console.warn(`No user linked to Stripe customer ${customerId}`);
      return;
    }
    
    const userSubscription = userLink[0];
    
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
      if (userSubscription?.user_id) {
        const { error: statusError } = await supabase
          .from('subscriptions')
          .update({ 
            status: 'inactive',
            subscription_status: 'inactive',
            stripe_subscription_id: null,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userSubscription.user_id);
          
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
    if (userSubscription?.user_id) {
      const mappedStatus = mapStripeStatusToAppStatus(subscription.status);
      const priceId = subscription.items.data[0]?.price.id;
      const { error: linkUpdateError } = await supabase
        .from('subscriptions')
        .update({ 
          stripe_subscription_id: subscription.id,
          status: mappedStatus,
          subscription_status: subscription.status,
          price_id: priceId,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userSubscription.user_id);
        
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

async function sendConfirmationEmail(session: Stripe.Checkout.Session) {
  if (!RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not configured, skipping email');
    return;
  }

  const customerEmail = session.customer_details?.email;
  const customerName = session.customer_details?.name || 'Customer';
  const amountTotal = session.amount_total || 0;
  const currency = session.currency || 'usd';
  
  if (!customerEmail) {
    console.error('No customer email found in session');
    return;
  }

  // Format amount for display
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amountTotal / 100);

  const emailData = {
    from: `MyFutureSelf <${FROM_EMAIL}>`,
    to: customerEmail,
    subject: 'Payment Confirmation - MyFutureSelf',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Payment Confirmation</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
          .amount { font-size: 32px; color: #667eea; font-weight: bold; margin: 20px 0; }
          .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
          .detail-row:last-child { border-bottom: none; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Payment Successful!</h1>
          </div>
          <div class="content">
            <p>Hi ${customerName},</p>
            <p>Thank you for your purchase! Your payment has been successfully processed.</p>
            
            <div class="amount">${formattedAmount}</div>
            
            <div class="details">
              <div class="detail-row">
                <span><strong>Transaction ID:</strong></span>
                <span>${session.id}</span>
              </div>
              <div class="detail-row">
                <span><strong>Date:</strong></span>
                <span>${new Date().toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</span>
              </div>
              <div class="detail-row">
                <span><strong>Payment Method:</strong></span>
                <span>${session.payment_method_types?.[0] || 'Card'}</span>
              </div>
              ${session.mode === 'subscription' ? `
              <div class="detail-row">
                <span><strong>Subscription:</strong></span>
                <span>Active</span>
              </div>
              ` : ''}
            </div>
            
            <p>You can access your account and all premium features immediately.</p>
            
            <center>
              <a href="${APP_URL}/dashboard" class="button">Go to Dashboard</a>
            </center>
          </div>
          <div class="footer">
            <p>If you have any questions, please contact our support team.</p>
            <p>&copy; ${new Date().getFullYear()} MyFutureSelf. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailData),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error('Failed to send confirmation email:', errorText);
    } else {
      const emailResult = await emailResponse.json();
      console.log('Confirmation email sent:', emailResult.id);
    }
  } catch (error) {
    console.error('Error sending email:', error);
  }
}
