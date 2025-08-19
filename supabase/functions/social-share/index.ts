import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { handleCorsPreflight, corsResponse, corsError } from '../_shared/cors.ts';

interface ShareRequest {
  service: 'instagram' | 'twitter' | 'facebook' | 'gmail';
  message: string;
  imageUrl?: string;
  recipientEmail?: string; // For Gmail
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  try {
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

    const shareData: ShareRequest = await req.json();
    const { service, message, imageUrl, recipientEmail } = shareData;

    if (!service || !message) {
      return corsError(req, 'Service and message are required', 400);
    }

    // Get user's social integration
    const { data: integration, error: integrationError } = await supabase
      .from('social_integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('service_name', service)
      .eq('connected', true)
      .single();

    if (integrationError || !integration) {
      return corsError(req, 'Service not connected', 400);
    }

    // Check if token is expired and refresh if needed
    if (integration.token_expires_at && new Date(integration.token_expires_at) < new Date()) {
      if (!integration.refresh_token) {
        return corsError(req, 'Token expired and no refresh token available', 401);
      }

      // Refresh token logic would go here
      // For now, return error
      return corsError(req, 'Token expired, please reconnect', 401);
    }

    let result;

    switch (service) {
      case 'twitter': {
        const tweetResponse = await fetch('https://api.twitter.com/2/tweets', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${integration.auth_token}`,
            ['Content-Type']: 'application/json',
          },
          body: JSON.stringify({
            text: message,
          }),
        });

        if (!tweetResponse.ok) {
          const error = await tweetResponse.text();
          console.error('Twitter post failed:', error);
          return corsError(req, 'Failed to post to Twitter', 500);
        }

        result = await tweetResponse.json();
        break;
      }

      case 'facebook': {
        const params = new URLSearchParams({
          message,
          access_token: integration.auth_token,
        });

        if (imageUrl) {
          params.append('link', imageUrl);
        }

        const fbResponse = await fetch(
          `https://graph.facebook.com/v18.0/${integration.service_user_id}/feed`,
          {
            method: 'POST',
            body: params,
          }
        );

        if (!fbResponse.ok) {
          const error = await fbResponse.text();
          console.error('Facebook post failed:', error);
          return corsError(req, 'Failed to post to Facebook', 500);
        }

        result = await fbResponse.json();
        break;
      }

      case 'instagram': {
        // Instagram Graph API requires business account
        // For now, we'll return a message that this requires Instagram Business
        return corsResponse(req, {
          success: false,
          message: 'Instagram sharing requires a Business account. Please use the Instagram app to share.',
        });
      }

      case 'gmail': {
        if (!recipientEmail) {
          return corsError(req, 'Recipient email is required for Gmail', 400);
        }

        // Create email message
        const emailMessage = [
          `To: ${recipientEmail}`,
          'Subject: Check out my progress on MyFutureSelf!',
          'Content-Type: text/html; charset=utf-8',
          '',
          `<html>
            <body>
              <h2>My Progress Update</h2>
              <p>${message}</p>
              ${imageUrl ? `<img src="${imageUrl}" style="max-width: 600px;" />` : ''}
              <p>Sent from <a href="https://myfutureself.ai">MyFutureSelf</a></p>
            </body>
          </html>`,
        ].join('\n');

        // Encode message for Gmail API
        const encodedMessage = btoa(emailMessage).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

        const gmailResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${integration.auth_token}`,
            ['Content-Type']: 'application/json',
          },
          body: JSON.stringify({
            raw: encodedMessage,
          }),
        });

        if (!gmailResponse.ok) {
          const error = await gmailResponse.text();
          console.error('Gmail send failed:', error);
          return corsError(req, 'Failed to send email', 500);
        }

        result = await gmailResponse.json();
        break;
      }

      default:
        return corsError(req, 'Unsupported service', 400);
    }

    // Log the share activity
    await supabase
      .from('social_share_logs')
      .insert({
        user_id: user.id,
        service,
        message,
        shared_at: new Date().toISOString(),
        success: true,
      });

    return corsResponse(req, {
      success: true,
      result,
    });
  } catch (error) {
    console.error('Social share error:', error);
    return corsError(req, error.message || 'Internal server error', 500);
  }
});