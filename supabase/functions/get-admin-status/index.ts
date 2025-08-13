import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://iownmyfuture.ai',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Credentials': 'true',
  'Content-Type': 'application/json',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // Get environment variables with proper error handling
    const projectUrl = Deno.env.get('PROJECT_URL');
    const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY');
    
    if (!projectUrl || !serviceRoleKey) {
      throw new Error('Missing required environment variables: PROJECT_URL or SERVICE_ROLE_KEY');
    }

    // Create Supabase client with service role for admin operations
    const supabaseAdmin = createClient(
      projectUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get the JWT from the Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Verify the JWT and get the user
    const token = authHeader.replace('Bearer ', '');
    let user;
    
    try {
      const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
      
      if (authError || !authData?.user) {
        return new Response(
          JSON.stringify({ error: 'Invalid token' }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      user = authData.user;
    } catch (error) {
      console.error('Error verifying token:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to verify authentication' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get the user ID from the request body (optional)
    // If not provided, check the authenticated user's admin status
    const body = await req.json().catch(() => ({}));
    const targetUserId = body.userId || user.id;

    // Only allow users to check their own admin status
    // unless they are already an admin (for admin dashboard functionality)
    if (targetUserId !== user.id) {
      try {
        // First check if the requesting user is an admin
        const { data: requestingUserProfile, error: requestingUserError } = await supabaseAdmin
          .from('user_profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single();

        if (requestingUserError || !requestingUserProfile?.is_admin) {
          return new Response(
            JSON.stringify({ error: 'Unauthorized to check other users' }),
            {
              status: 403,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }
      } catch (error) {
        console.error('Error checking requesting user admin status:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to verify admin permissions' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // Get the user's admin status from the database
    try {
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .select('is_admin')
        .eq('id', targetUserId)
        .single();

      if (profileError) {
        console.error('Error fetching user profile:', profileError);
        return new Response(
          JSON.stringify({ error: 'User profile not found' }),
          {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Return the admin status
      return new Response(
        JSON.stringify({ 
          isAdmin: profile?.is_admin === true,
          userId: targetUserId 
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch user profile' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  } catch (error) {
    console.error('Error in get-admin-status function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});