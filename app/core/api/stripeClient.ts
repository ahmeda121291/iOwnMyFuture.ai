import { loadStripe } from '@stripe/stripe-js';
import type { Stripe } from '@stripe/stripe-js';
import { supabase } from './supabase';

let stripePromise: Promise<Stripe | null> | null = null;

const getStripePublishableKey = async (): Promise<string> => {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    throw new Error('User not authenticated');
  }

  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-config`;
  
  const response = await fetch(apiUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      'content-type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch Stripe configuration');
  }

  const { publishableKey } = await response.json();
  return publishableKey;
};

const getStripe = async () => {
  if (!stripePromise) {
    stripePromise = (async () => {
      const publishableKey = await getStripePublishableKey();
      return loadStripe(publishableKey);
    })();
  }
  return stripePromise;
};

export default getStripe;

export const createCheckoutSession = async (priceId: string, mode: 'subscription' | 'payment' = 'subscription') => {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    throw new Error('User not authenticated');
  }

  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`;
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      price_id: priceId,
      mode,
      success_url: `${window.location.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${window.location.origin}/pricing`,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to create checkout session');
  }

  return response.json();
};

