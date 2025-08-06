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
  mode?: 'subscription' | 'payment';
  successUrl?: string;
  cancelUrl?: string;
  csrfToken?: string;
}

export const createCheckoutSession = async (options: CreateCheckoutSessionOptions | string) => {
  // Handle legacy string parameter or full options
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

  console.log('[stripeClient] Creating checkout session with params:', params);

  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    console.error('[stripeClient] No auth session found');
    throw new Error('User not authenticated');
  }

  console.log('[stripeClient] Auth session found, user:', session.user?.email);

  // Get CSRF token if not provided
  let csrfToken = params.csrfToken || '';
  
  if (!csrfToken) {
    try {
      const csrfTokenUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/csrf-token`;
      console.log('[stripeClient] Fetching CSRF token from:', csrfTokenUrl);

      const csrfResponse = await fetch(csrfTokenUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!csrfResponse.ok) {
        const errorText = await csrfResponse.text();
        console.error('[stripeClient] CSRF token fetch failed:', errorText);
        // Don't fail if CSRF fails in dev
        if (import.meta.env.MODE === 'production') {
          throw new Error(`Failed to get CSRF token: ${csrfResponse.status}`);
        } else {
          csrfToken = 'dev-mode-no-csrf';
        }
      } else {
        const csrfData = await csrfResponse.json();
        csrfToken = csrfData.csrf_token || 'dev-mode-no-csrf';
        console.log('[stripeClient] CSRF token obtained');
      }
    } catch (error) {
      console.error('[stripeClient] CSRF token error:', error);
      if (import.meta.env.MODE === 'production') {
        throw error;
      } else {
        csrfToken = 'dev-mode-no-csrf';
      }
    }
  }

  // Create the checkout session
  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`;
  
  const requestBody = {
    price_id: params.priceId,
    mode: params.mode || 'subscription',
    success_url: params.successUrl || `${window.location.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: params.cancelUrl || `${window.location.origin}/pricing`,
    csrf_token: csrfToken,
  };

  console.log('[stripeClient] Sending checkout request to:', apiUrl);
  console.log('[stripeClient] Request body:', { ...requestBody, csrf_token: 'REDACTED' });
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  console.log('[stripeClient] Checkout response status:', response.status);

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      errorData = { error: await response.text() };
    }
    console.error('[stripeClient] Checkout session creation failed:', errorData);
    throw new Error(errorData.error || `Failed to create checkout session (${response.status})`);
  }

  const result = await response.json();
  
  console.log('[stripeClient] Checkout session created successfully:', result);

  // Redirect to Stripe checkout
  if (result.url) {
    console.log('[stripeClient] Redirecting to:', result.url.substring(0, 50) + '...');
    window.location.href = result.url;
  } else {
    throw new Error('No checkout URL received from server');
  }

  return result;
};

