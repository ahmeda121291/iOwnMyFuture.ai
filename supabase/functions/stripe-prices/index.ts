import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

// Get the site URL from environment or use production URL as fallback
const siteUrl = Deno.env.get('SITE_URL') || 'https://iownmyfuture.ai';

const corsHeaders = {
  'Access-Control-Allow-Origin': siteUrl,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Credentials': 'true',
};

const supabaseUrl = Deno.env.get('PROJECT_URL') ?? '';
const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY') ?? '';
const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY') ?? '';

const supabase = createClient(supabaseUrl, serviceRoleKey);
const stripe = new Stripe(stripeSecret, {
  appInfo: { name: 'MyFutureSelf', version: '1.0.0' },
});

// Product IDs from Stripe Dashboard
const MONTHLY_PRODUCT_ID = 'prod_SlmIZrU6E29IYr';
const YEARLY_PRODUCT_ID = 'prod_SlmIrtY1LuVNsA';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Authentication is optional for fetching prices
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    let user = null;
    
    if (token) {
      const { data, error: authError } = await supabase.auth.getUser(token);
      user = data?.user;
      if (authError) {
        console.warn('stripe-prices auth error (non-fatal):', authError);
      }
    }
    
    // Log whether user is authenticated (for debugging)
    console.log('Fetching prices for:', user ? `user ${user.id}` : 'anonymous user');

    // Retrieve prices for both products
    const [monthlyPrices, yearlyPrices] = await Promise.all([
      stripe.prices.list({ 
        product: MONTHLY_PRODUCT_ID, 
        active: true,
        limit: 1,
        type: 'recurring'
      }),
      stripe.prices.list({ 
        product: YEARLY_PRODUCT_ID, 
        active: true,
        limit: 1,
        type: 'recurring'
      })
    ]);

    const monthlyPrice = monthlyPrices.data[0];
    const yearlyPrice = yearlyPrices.data[0];

    if (!monthlyPrice || !yearlyPrice) {
      console.error('Missing prices:', { 
        monthly: monthlyPrice?.id, 
        yearly: yearlyPrice?.id 
      });
      return new Response(JSON.stringify({ 
        error: 'Pricing configuration not found' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Return price information
    return new Response(JSON.stringify({ 
      monthly: {
        priceId: monthlyPrice.id,
        productId: MONTHLY_PRODUCT_ID,
        amount: monthlyPrice.unit_amount,
        currency: monthlyPrice.currency,
        interval: monthlyPrice.recurring?.interval
      },
      yearly: {
        priceId: yearlyPrice.id,
        productId: YEARLY_PRODUCT_ID,
        amount: yearlyPrice.unit_amount,
        currency: yearlyPrice.currency,
        interval: yearlyPrice.recurring?.interval
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error in stripe-prices function:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});