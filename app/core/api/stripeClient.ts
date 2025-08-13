import { loadStripe } from '@stripe/stripe-js';
import type { Stripe } from '@stripe/stripe-js';
import { supabase } from './supabase';
import { secureFetch, createSecureJSON } from '../../shared/security/csrf';
import toast from 'react-hot-toast';

let stripePromise: Promise<Stripe | null> | null = null;

const getStripePublishableKey = async (): Promise<string> => {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    throw new Error('User not authenticated');
  }

  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-config`;
  
  // Use secureFetch which automatically includes CSRF token
  const response = await secureFetch(apiUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
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

  // Create the checkout session - CSRF token is handled by secureFetch
  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`;
  console.log('[stripeClient] Creating checkout session at:', apiUrl);
  
  // Prepare request body with CSRF token included
  let requestBody;
  try {
    requestBody = await createSecureJSON({
      price_id: params.priceId,
      mode: params.mode || 'subscription',
      success_url: params.successUrl || `${window.location.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: params.cancelUrl || `${window.location.origin}/pricing`,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[stripeClient] Failed to fetch CSRF token:', error);
    toast.error(`Could not fetch CSRF token: ${errorMessage}`);
    throw new Error(`Failed to get CSRF token: ${errorMessage}`);
  }

  console.log('[stripeClient] Sending checkout request to:', apiUrl);
  console.log('[stripeClient] Request body:', { ...requestBody, csrf_token: 'REDACTED' });
  
  // Use secureFetch which automatically adds CSRF token header and includes cookies
  const response = await secureFetch(apiUrl, {
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

interface CreateBillingPortalSessionOptions {
  returnUrl?: string;
}

export const createBillingPortalSession = async (options?: CreateBillingPortalSessionOptions) => {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    toast.error('Please sign in to manage your subscription');
    throw new Error('User not authenticated');
  }

  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-portal`;
  
  // Prepare request body with CSRF token
  let requestBody;
  try {
    requestBody = await createSecureJSON({
      return_url: options?.returnUrl || window.location.href,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[stripeClient] Failed to fetch CSRF token for billing portal:', error);
    toast.error(`Could not fetch CSRF token: ${errorMessage}`);
    throw new Error(`Failed to get CSRF token: ${errorMessage}`);
  }
  
  // Use secureFetch for CSRF protection
  const response = await secureFetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      errorData = { error: 'Failed to create billing portal session' };
    }
    throw new Error(errorData.error || 'Failed to create billing portal session');
  }

  const { url } = await response.json();
  
  if (url) {
    window.location.href = url;
  } else {
    throw new Error('No billing portal URL received');
  }
  
  return { url };
};