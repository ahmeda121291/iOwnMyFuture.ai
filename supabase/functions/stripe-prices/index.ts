import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { 
  STRIPE_SECRET_KEY as stripeSecret,
  getCorsHeaders
} from '../_shared/config.ts';
const stripe = new Stripe(stripeSecret, {
  appInfo: { name: 'I Own My Future', version: '1.0.0' },
});

// Product IDs from Stripe Dashboard
const MONTHLY_PRODUCT_ID = 'prod_SlmIZrU6E29IYr';
const YEARLY_PRODUCT_ID = 'prod_SlmIrtY1LuVNsA';

Deno.serve(async (req: Request) => {
  // Don't allow credentials for public pricing endpoint
  const corsHeaders = getCorsHeaders(req, false);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // This is a public endpoint - no authentication needed
    // Prices are the same for all users
    console.log('Fetching public pricing information');

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