import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
} as const;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();
  const checks: Record<string, { status: 'healthy' | 'unhealthy'; message?: string; latency?: number }> = {};

  try {
    // 1. Check Supabase connection
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      checks.supabase = { 
        status: 'unhealthy', 
        message: 'Missing environment variables' 
      };
    } else {
      const supabaseStart = Date.now();
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      try {
        // Simple query to test database connection
        const { error } = await supabase
          .from('user_profiles')
          .select('count')
          .limit(1)
          .single();
        
        checks.database = {
          status: error ? 'unhealthy' : 'healthy',
          message: error?.message,
          latency: Date.now() - supabaseStart
        };
      } catch (dbError) {
        checks.database = {
          status: 'unhealthy',
          message: dbError instanceof Error ? dbError.message : 'Unknown error',
          latency: Date.now() - supabaseStart
        };
      }
    }

    // 2. Check Stripe configuration
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    checks.stripe = {
      status: stripeKey ? 'healthy' : 'unhealthy',
      message: stripeKey ? 'Configured' : 'Missing API key'
    };

    // 3. Check OpenAI configuration
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    checks.openai = {
      status: openaiKey ? 'healthy' : 'unhealthy',
      message: openaiKey ? 'Configured' : 'Missing API key'
    };

    // 4. Check Edge Function environment
    checks.edgeFunction = {
      status: 'healthy',
      message: `Deno ${Deno.version.deno}`,
      latency: Date.now() - startTime
    };

    // 5. Memory usage
    const memoryUsage = (performance as any).memory;
    if (memoryUsage) {
      checks.memory = {
        status: memoryUsage.usedJSHeapSize < memoryUsage.jsHeapSizeLimit * 0.9 ? 'healthy' : 'unhealthy',
        message: `${Math.round(memoryUsage.usedJSHeapSize / 1024 / 1024)}MB / ${Math.round(memoryUsage.jsHeapSizeLimit / 1024 / 1024)}MB`
      };
    }

    // Overall health status
    const allHealthy = Object.values(checks).every(check => check.status === 'healthy');
    const totalLatency = Date.now() - startTime;

    return new Response(
      JSON.stringify({
        status: allHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        latency: totalLatency,
        checks,
        version: '1.0.0'
      }),
      {
        status: allHealthy ? 200 : 503,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
      }
    );
  } catch (error) {
    console.error('Health check failed:', error);
    
    return new Response(
      JSON.stringify({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        checks
      }),
      {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});