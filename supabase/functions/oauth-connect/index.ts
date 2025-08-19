import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { handleCorsPreflight, corsResponse, corsError } from '../_shared/cors.ts';

const OAUTH_CONFIGS = {
  instagram: {
    authUrl: 'https://api.instagram.com/oauth/authorize',
    tokenUrl: 'https://api.instagram.com/oauth/access_token',
    scopes: 'user_profile,user_media',
    clientId: Deno.env.get('INSTAGRAM_CLIENT_ID'),
    clientSecret: Deno.env.get('INSTAGRAM_CLIENT_SECRET'),
  },
  twitter: {
    authUrl: 'https://twitter.com/i/oauth2/authorize',
    tokenUrl: 'https://api.twitter.com/2/oauth2/token',
    scopes: 'tweet.read tweet.write users.read offline.access',
    clientId: Deno.env.get('TWITTER_CLIENT_ID'),
    clientSecret: Deno.env.get('TWITTER_CLIENT_SECRET'),
  },
  facebook: {
    authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token',
    scopes: 'public_profile,email,publish_to_groups',
    clientId: Deno.env.get('FACEBOOK_CLIENT_ID'),
    clientSecret: Deno.env.get('FACEBOOK_CLIENT_SECRET'),
  },
  gmail: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email',
    clientId: Deno.env.get('GOOGLE_CLIENT_ID'),
    clientSecret: Deno.env.get('GOOGLE_CLIENT_SECRET'),
  },
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  try {
    const url = new URL(req.url);
    const service = url.searchParams.get('service') as keyof typeof OAUTH_CONFIGS;
    const action = url.searchParams.get('action');
    const redirectUri = url.searchParams.get('redirect_uri') || `${Deno.env.get('PROJECT_URL')}/oauth/callback`;

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return corsError(req, 'Authorization header required', 401);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return corsError(req, 'Unauthorized', 401);
    }

    if (!service || !OAUTH_CONFIGS[service]) {
      return corsError(req, 'Invalid service', 400);
    }

    const config = OAUTH_CONFIGS[service];

    if (action === 'initiate') {
      // Generate state token for CSRF protection
      const state = crypto.randomUUID();
      
      // Store state in database for verification
      const { error: stateError } = await supabase
        .from('oauth_states')
        .insert({
          user_id: user.id,
          state,
          service,
          redirect_uri: redirectUri,
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
        });

      if (stateError) {
        console.error('Failed to store OAuth state:', stateError);
        return corsError(req, 'Failed to initiate OAuth flow', 500);
      }

      // Build OAuth authorization URL
      const params = new URLSearchParams({
        client_id: config.clientId || '',
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: config.scopes,
        state,
      });

      // Add service-specific parameters
      if (service === 'twitter') {
        params.append('code_challenge', 'challenge'); // Would need PKCE implementation
        params.append('code_challenge_method', 'S256');
      }

      const authorizationUrl = `${config.authUrl}?${params.toString()}`;

      return corsResponse(req, { 
        authorizationUrl,
        state,
      });
    }

    if (action === 'callback') {
      // Handle OAuth callback
      const { code, state } = await req.json();

      if (!code || !state) {
        return corsError(req, 'Missing code or state', 400);
      }

      // Verify state token
      const { data: stateData, error: stateError } = await supabase
        .from('oauth_states')
        .select('*')
        .eq('state', state)
        .eq('user_id', user.id)
        .eq('service', service)
        .single();

      if (stateError || !stateData) {
        return corsError(req, 'Invalid or expired state', 400);
      }

      // Delete used state
      await supabase
        .from('oauth_states')
        .delete()
        .eq('state', state);

      // Exchange code for access token
      const tokenParams = new URLSearchParams({
        client_id: config.clientId || '',
        client_secret: config.clientSecret || '',
        grant_type: 'authorization_code',
        code,
        redirect_uri: stateData.redirect_uri,
      });

      const tokenResponse = await fetch(config.tokenUrl, {
        method: 'POST',
        headers: {
          ['Content-Type']: 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: tokenParams.toString(),
      });

      if (!tokenResponse.ok) {
        const error = await tokenResponse.text();
        console.error('Token exchange failed:', error);
        return corsError(req, 'Failed to exchange code for token', 400);
      }

      const tokenData = await tokenResponse.json();

      // Fetch user profile from service
      let profileData = {};
      let serviceUserId = '';

      if (service === 'instagram') {
        const profileResponse = await fetch(`https://graph.instagram.com/me?fields=id,username&access_token=${tokenData.access_token}`);
        profileData = await profileResponse.json();
        serviceUserId = profileData.id;
      } else if (service === 'facebook') {
        const profileResponse = await fetch(`https://graph.facebook.com/me?access_token=${tokenData.access_token}`);
        profileData = await profileResponse.json();
        serviceUserId = profileData.id;
      } else if (service === 'twitter') {
        const profileResponse = await fetch('https://api.twitter.com/2/users/me', {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
          },
        });
        const profile = await profileResponse.json();
        profileData = profile.data;
        serviceUserId = profile.data?.id;
      } else if (service === 'gmail') {
        const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
          },
        });
        profileData = await profileResponse.json();
        serviceUserId = profileData.id;
      }

      // Store tokens in database
      const { error: upsertError } = await supabase
        .from('social_integrations')
        .upsert({
          user_id: user.id,
          service_name: service,
          service_user_id: serviceUserId,
          connected: true,
          auth_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          token_expires_at: tokenData.expires_in 
            ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
            : null,
          profile_data: profileData,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,service_name',
        });

      if (upsertError) {
        console.error('Failed to store tokens:', upsertError);
        return corsError(req, 'Failed to save connection', 500);
      }

      return corsResponse(req, { 
        success: true,
        profile: profileData,
      });
    }

    return corsError(req, 'Invalid action', 400);
  } catch (error) {
    console.error('OAuth error:', error);
    return corsError(req, error.message || 'Internal server error', 500);
  }
});