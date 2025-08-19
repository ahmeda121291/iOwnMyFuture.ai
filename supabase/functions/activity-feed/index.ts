import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { handleCorsPreflight, corsResponse, corsError } from '../_shared/cors.ts';

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  try {
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');

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

    // Get activity feed using the database function
    const { data: activities, error } = await supabase
      .rpc('get_user_activity_feed', {
        p_user_id: user.id,
        p_limit: limit,
        p_offset: offset
      });

    if (error) {
      console.error('Failed to fetch activity feed:', error);
      return corsError(req, 'Failed to fetch activity feed', 500);
    }

    // Enrich activity data with additional context if needed
    const enrichedActivities = await Promise.all((activities || []).map(async (activity) => {
      // Add icon and color based on type and action
      const iconMap: Record<string, string> = {
        'journal_entry': '📝',
        'moodboard': '🎨',
        'goal': '🎯',
        'milestone': '🏁',
        'subscription': '💳',
        'profile': '👤',
        'snapshot': '📸'
      };

      const colorMap: Record<string, string> = {
        'created': 'text-green-600',
        'updated': 'text-blue-600',
        'deleted': 'text-red-600',
        'completed': 'text-purple-600',
        'shared': 'text-indigo-600',
        'upgraded': 'text-green-600',
        'downgraded': 'text-orange-600'
      };

      return {
        ...activity,
        icon: iconMap[activity.type] || '📌',
        color: colorMap[activity.action] || 'text-gray-600',
        timeAgo: getTimeAgo(new Date(activity.created_at))
      };
    }));

    return corsResponse(req, {
      activities: enrichedActivities,
      hasMore: activities?.length === limit
    });
  } catch (error) {
    console.error('Activity feed error:', error);
    return corsError(req, error.message || 'Internal server error', 500);
  }
});

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 604800)}w ago`;
  if (seconds < 31536000) return `${Math.floor(seconds / 2592000)}mo ago`;
  return `${Math.floor(seconds / 31536000)}y ago`;
}