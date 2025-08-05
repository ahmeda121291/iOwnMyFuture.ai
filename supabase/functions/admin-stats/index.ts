import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';
import Stripe from 'npm:stripe@14.34.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('PROJECT_URL') ?? '';
const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY') ?? '';
const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') ?? '';

const supabase = createClient(supabaseUrl, serviceRoleKey);
const stripe = new Stripe(stripeKey, {
  apiVersion: '2024-12-18.acacia',
  httpClient: Stripe.createFetchHttpClient(),
});

interface AdminStats {
  totalUsers: number;
  monthlyRevenue: number;
  totalEntries: number;
  aiTokensUsed: number;
  activeSubscriptions: number;
  trialSubscriptions: number;
  recentActivity: {
    newUsersToday: number;
    entriesCreatedToday: number;
    revenueToday: number;
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.is_admin) {
      return new Response(JSON.stringify({ error: 'Access denied. Admin privileges required.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch total users
    const { count: totalUsers, error: usersError } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true });

    if (usersError) throw usersError;

    // Fetch journal entries count
    const { count: totalEntries, error: entriesError } = await supabase
      .from('journal_entries')
      .select('*', { count: 'exact', head: true });

    if (entriesError) throw entriesError;

    // Fetch active and trial subscriptions
    const { data: subscriptions, error: subsError } = await supabase
      .from('subscriptions')
      .select('subscription_status')
      .in('subscription_status', ['active', 'trialing']);

    if (subsError) throw subsError;

    const activeSubscriptions = subscriptions?.filter(s => s.subscription_status === 'active').length || 0;
    const trialSubscriptions = subscriptions?.filter(s => s.subscription_status === 'trialing').length || 0;

    // Calculate monthly revenue from Stripe
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    let monthlyRevenue = 0;
    try {
      // Fetch successful charges for the current month
      const charges = await stripe.charges.list({
        created: {
          gte: Math.floor(startOfMonth.getTime() / 1000),
          lte: Math.floor(endOfMonth.getTime() / 1000),
        },
        limit: 100,
      });

      monthlyRevenue = charges.data
        .filter(charge => charge.status === 'succeeded' && !charge.refunded)
        .reduce((sum, charge) => sum + (charge.amount / 100), 0);
    } catch (stripeError) {
      console.error('Error fetching Stripe data:', stripeError);
    }

    // Fetch AI tokens used (if tracked)
    // For now, we'll calculate based on journal entries with AI summaries
    const { count: aiSummaries, error: aiError } = await supabase
      .from('journal_entries')
      .select('*', { count: 'exact', head: true })
      .not('ai_summary', 'is', null);

    if (aiError) throw aiError;

    // Estimate tokens (rough approximation: ~150 tokens per summary)
    const aiTokensUsed = (aiSummaries || 0) * 150;

    // Fetch recent activity (today's stats)
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // New users today
    const { count: newUsersToday, error: newUsersError } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfToday.toISOString());

    if (newUsersError) throw newUsersError;

    // Entries created today
    const { count: entriesCreatedToday, error: todayEntriesError } = await supabase
      .from('journal_entries')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfToday.toISOString());

    if (todayEntriesError) throw todayEntriesError;

    // Revenue today from Stripe
    let revenueToday = 0;
    try {
      const todayCharges = await stripe.charges.list({
        created: {
          gte: Math.floor(startOfToday.getTime() / 1000),
        },
        limit: 100,
      });

      revenueToday = todayCharges.data
        .filter(charge => charge.status === 'succeeded' && !charge.refunded)
        .reduce((sum, charge) => sum + (charge.amount / 100), 0);
    } catch (stripeError) {
      console.error('Error fetching today\'s Stripe data:', stripeError);
    }

    const stats: AdminStats = {
      totalUsers: totalUsers || 0,
      monthlyRevenue,
      totalEntries: totalEntries || 0,
      aiTokensUsed,
      activeSubscriptions,
      trialSubscriptions,
      recentActivity: {
        newUsersToday: newUsersToday || 0,
        entriesCreatedToday: entriesCreatedToday || 0,
        revenueToday,
      },
    };

    return new Response(
      JSON.stringify(stats),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: unknown) {
    console.error('Error in admin-stats function:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch admin statistics' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});