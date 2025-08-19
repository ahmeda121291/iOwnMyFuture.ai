import { supabase } from '../lib/supabase';

/**
 * Initiates Google OAuth sign-in flow
 * Redirects user to Google's OAuth page and handles the callback
 * @param redirectTo - Optional URL to redirect after successful auth
 * @returns Promise with error if sign-in fails
 */
export const signInWithGoogle = async (redirectTo?: string) => {
  try {
    // Get the current URL for redirect after OAuth
    const redirectUrl = redirectTo || `${window.location.origin}/dashboard`;
    
    // Initiate OAuth flow with Google provider
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        // Add any scopes you need here
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      console.error('Google OAuth error:', error);
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    console.error('Failed to initiate Google sign-in:', error);
    return { data: null, error };
  }
};

/**
 * Initiates X (Twitter) OAuth sign-in flow
 * First signs in with Supabase Auth, then calls Edge Function to complete OAuth
 * @param redirectTo - Optional URL to redirect after successful auth
 * @returns Promise with error if sign-in fails
 */
export const signInWithX = async (redirectTo?: string) => {
  try {
    // Get the current URL for redirect after OAuth
    const redirectUrl = redirectTo || `${window.location.origin}/dashboard`;
    
    // Initiate OAuth flow with Twitter provider
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'twitter',
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          // Twitter OAuth 2.0 scopes
          scope: 'tweet.read tweet.write users.read offline.access',
        },
      },
    });

    if (error) {
      console.error('X OAuth error:', error);
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    console.error('Failed to initiate X sign-in:', error);
    return { data: null, error };
  }
};

/**
 * Completes X OAuth flow by exchanging code for tokens
 * Calls the Edge Function to handle token exchange and storage
 * @param code - Authorization code from X OAuth callback
 * @param redirectUri - The redirect URI used in the initial OAuth request
 * @returns Promise with tokens or error
 */
export const completeXOAuthFlow = async (code: string, redirectUri: string) => {
  try {
    // Get current session to authenticate the Edge Function call
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('No authenticated session found');
    }

    // Call Edge Function to exchange code for tokens
    const { data, error } = await supabase.functions.invoke('x-oauth', {
      body: {
        action: 'exchange',
        code,
        redirect_uri: redirectUri,
      },
    });

    if (error) {
      console.error('X OAuth exchange error:', error);
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    console.error('Failed to complete X OAuth flow:', error);
    return { data: null, error };
  }
};

/**
 * Posts a tweet on behalf of the authenticated user
 * Uses the stored X access token to post to Twitter API
 * @param text - The text content of the tweet
 * @returns Promise with tweet data or error
 */
export const postTweet = async (text: string) => {
  try {
    // Get current session to authenticate the Edge Function call
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('No authenticated session found');
    }

    // Call Edge Function to post tweet
    const { data, error } = await supabase.functions.invoke('x-oauth', {
      body: {
        action: 'tweet',
        text,
      },
    });

    if (error) {
      console.error('Tweet posting error:', error);
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    console.error('Failed to post tweet:', error);
    return { data: null, error };
  }
};

/**
 * Handles OAuth callback for X (Twitter)
 * Extracts code from URL parameters and completes the OAuth flow
 * @returns Promise with tokens or error
 */
export const handleXOAuthCallback = async () => {
  try {
    // Get URL parameters
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const _state = params.get('state');
    
    if (!code) {
      throw new Error('No authorization code found in callback');
    }

    // The redirect URI must match exactly what was used in the initial request
    const redirectUri = `${window.location.origin}${window.location.pathname}`;
    
    // Complete the OAuth flow
    return await completeXOAuthFlow(code, redirectUri);
  } catch (error) {
    console.error('Failed to handle X OAuth callback:', error);
    return { data: null, error };
  }
};