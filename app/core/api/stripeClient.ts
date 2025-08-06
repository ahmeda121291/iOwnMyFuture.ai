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

interface CreateCheckoutSessionOptions {
  priceId: string;
  userId?: string;
  email?: string;
  successUrl?: string;
  cancelUrl?: string;
  mode?: 'subscription' | 'payment';
}

export const createCheckoutSession = async (options: CreateCheckoutSessionOptions | string) => {
  // Handle legacy string parameter
  let params: CreateCheckoutSessionOptions;
  if (typeof options === 'string') {
    params = {
      priceId: options,
      mode: 'subscription',
      successUrl: `${window.location.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${window.location.origin}/pricing`
    };
  } else {
    params = {
      mode: 'subscription',
      successUrl: `${window.location.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${window.location.origin}/pricing`,
      ...options
    };
  }

  // Dev logging
  if (import.meta.env.MODE !== 'production') {
    console.log('[stripeClient] Creating checkout session with params:', params);
  }

  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    throw new Error('User not authenticated');
  }

  // First, get a CSRF token
  const csrfTokenUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/csrf-token`;
  
  if (import.meta.env.MODE !== 'production') {
    console.log('[stripeClient] Fetching CSRF token from:', csrfTokenUrl);
  }

  const csrfResponse = await fetch(csrfTokenUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      'content-type': 'application/json',
    },
  });

  if (!csrfResponse.ok) {
    const errorText = await csrfResponse.text();
    if (import.meta.env.MODE !== 'production') {
      console.error('[stripeClient] CSRF token fetch failed:', errorText);
    }
    throw new Error('Failed to get CSRF token');
  }

  const { csrf_token: csrfToken } = await csrfResponse.json();

  // Now create the checkout session with CSRF token
  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`;
  
  const requestBody = {
    price_id: params.priceId,
    mode: params.mode,
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    user_id: params.userId || session.user?.id,
    email: params.email || session.user?.email,
    csrf_token: csrfToken,
  };

  if (import.meta.env.MODE !== 'production') {
    console.log('[stripeClient] Sending checkout request to:', apiUrl);
    console.log('[stripeClient] Request body:', { ...requestBody, csrf_token: 'REDACTED' });
  }
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      'content-type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorData = await response.json();
    if (import.meta.env.MODE !== 'production') {
      console.error('[stripeClient] Checkout session creation failed:', errorData);
    }
    throw new Error(errorData.error || 'Failed to create checkout session');
  }

  const result = await response.json();
  
  if (import.meta.env.MODE !== 'production') {
    console.log('[stripeClient] Checkout session created successfully:', result);
  }

  return result;
};

