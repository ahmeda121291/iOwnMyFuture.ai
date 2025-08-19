import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// CORS headers for browser requests
/* eslint-disable @typescript-eslint/naming-convention */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
/* eslint-enable @typescript-eslint/naming-convention */

interface OAuthExchangeRequest {
  action: 'exchange' | 'tweet';
  code?: string;
  redirect_uri?: string;
  text?: string;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in?: number;
  scope?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get environment variables
    const X_CLIENT_ID = Deno.env.get('X_CLIENT_ID');
    const X_CLIENT_SECRET = Deno.env.get('X_CLIENT_SECRET');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!X_CLIENT_ID || !X_CLIENT_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables');
    }

    // Initialize Supabase client with service role key for admin operations
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get the authorization header to identify the user
    const authorization = req.headers.get('Authorization');
    if (!authorization) {
      throw new Error('No authorization header');
    }

    // Verify the JWT and get user
    const token = authorization.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Invalid authorization token');
    }

    // Parse request body
    const body: OAuthExchangeRequest = await req.json();

    if (body.action === 'exchange') {
      // Exchange authorization code for access token
      if (!body.code || !body.redirect_uri) {
        throw new Error('Missing code or redirect_uri');
      }

      // Prepare token exchange request
      const tokenUrl = 'https://api.twitter.com/2/oauth2/token';
      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        code: body.code,
        redirect_uri: body.redirect_uri,
        code_verifier: 'challenge', // If using PKCE, this would be the actual verifier
      });

      // Create Basic Auth header with client credentials
      const credentials = btoa(`${X_CLIENT_ID}:${X_CLIENT_SECRET}`);

      // Exchange code for tokens
      const tokenResponse = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('Token exchange failed:', errorText);
        throw new Error(`Token exchange failed: ${tokenResponse.status}`);
      }

      const tokens: TokenResponse = await tokenResponse.json();

      // Store tokens in database
      // First, check if a record exists
      const { data: existingIntegration } = await supabaseAdmin
        .from('social_integrations')
        .select('*')
        .eq('user_id', user.id)
        .eq('platform', 'twitter')
        .single();

      if (existingIntegration) {
        // Update existing record
        const { error: updateError } = await supabaseAdmin
          .from('social_integrations')
          .update({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token || existingIntegration.refresh_token,
            token_expiry: tokens.expires_in 
              ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
              : null,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id)
          .eq('platform', 'twitter');

        if (updateError) {
          console.error('Failed to update tokens:', updateError);
          throw new Error('Failed to store tokens');
        }
      } else {
        // Insert new record
        const { error: insertError } = await supabaseAdmin
          .from('social_integrations')
          .insert({
            user_id: user.id,
            platform: 'twitter',
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token || null,
            token_expiry: tokens.expires_in 
              ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
              : null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

        if (insertError) {
          console.error('Failed to insert tokens:', insertError);
          throw new Error('Failed to store tokens');
        }
      }

      // Return success response
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'X OAuth tokens stored successfully',
          scopes: tokens.scope,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, // eslint-disable-line @typescript-eslint/naming-convention
          status: 200,
        }
      );

    } else if (body.action === 'tweet') {
      // Post a tweet on behalf of the user
      if (!body.text) {
        throw new Error('Missing tweet text');
      }

      // Retrieve user's X access token from database
      const { data: integration, error: fetchError } = await supabaseAdmin
        .from('social_integrations')
        .select('access_token, refresh_token, token_expiry')
        .eq('user_id', user.id)
        .eq('platform', 'twitter')
        .single();

      if (fetchError || !integration) {
        throw new Error('No X integration found for user');
      }

      // Check if token is expired and refresh if needed
      if (integration.token_expiry && new Date(integration.token_expiry) < new Date()) {
        // Token is expired, attempt to refresh
        if (!integration.refresh_token) {
          throw new Error('Access token expired and no refresh token available');
        }

        // Refresh the access token
        const refreshUrl = 'https://api.twitter.com/2/oauth2/token';
        const refreshParams = new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: integration.refresh_token,
        });

        const credentials = btoa(`${X_CLIENT_ID}:${X_CLIENT_SECRET}`);
        const refreshResponse = await fetch(refreshUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${credentials}`,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: refreshParams.toString(),
        });

        if (!refreshResponse.ok) {
          throw new Error('Failed to refresh access token');
        }

        const newTokens: TokenResponse = await refreshResponse.json();

        // Update tokens in database
        const { error: updateError } = await supabaseAdmin
          .from('social_integrations')
          .update({
            access_token: newTokens.access_token,
            refresh_token: newTokens.refresh_token || integration.refresh_token,
            token_expiry: newTokens.expires_in 
              ? new Date(Date.now() + newTokens.expires_in * 1000).toISOString()
              : null,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id)
          .eq('platform', 'twitter');

        if (updateError) {
          console.error('Failed to update refreshed tokens:', updateError);
        }

        // Use the new access token
        integration.access_token = newTokens.access_token;
      }

      // Post tweet using X API v2
      const tweetUrl = 'https://api.twitter.com/2/tweets';
      const tweetResponse = await fetch(tweetUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${integration.access_token}`,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: body.text }),
      });

      if (!tweetResponse.ok) {
        const errorText = await tweetResponse.text();
        console.error('Tweet posting failed:', errorText);
        throw new Error(`Failed to post tweet: ${tweetResponse.status}`);
      }

      const tweetData = await tweetResponse.json();

      // Return tweet data
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Tweet posted successfully',
          tweet: tweetData.data,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, // eslint-disable-line @typescript-eslint/naming-convention
          status: 200,
        }
      );

    } else {
      throw new Error('Invalid action specified');
    }

  } catch (error) {
    console.error('Edge Function error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        success: false,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, // eslint-disable-line @typescript-eslint/naming-convention
        status: error.message?.includes('No authorization') ? 401 : 400,
      }
    );
  }
});