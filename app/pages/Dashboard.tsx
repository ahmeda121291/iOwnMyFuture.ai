import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Target, BookOpen, TrendingUp, Crown, Plus, AlertCircle, Clock, ChevronRight, Activity } from 'lucide-react';
import { supabase } from '../core/api/supabase';
import { errorTracker } from '../shared/utils/errorTracking';
import { useRequireProPlan } from '../shared/hooks/useRequireProPlan';
import { safeNavigate } from '../shared/utils/navigation';
import Button from '../shared/components/Button';
import Loader from '../shared/components/Loader';
import SubscriptionStatus from '../features/Subscription/SubscriptionStatus';
import MoodAnalyticsPanelLazy from '../features/insights/MoodAnalyticsPanelLazy';
import FirstTimeChecklist from '../features/Onboarding/FirstTimeChecklist';
import GoalsDashboard from '../features/goals/GoalsDashboard';
import { useQuery } from '@tanstack/react-query';

// Types

interface Metrics {
  boardCount: number;
  entryCount: number;
  daysActive: number;
}

interface ActivityItem {
  id: string;
  type: string;
  action: string;
  reference_id: string | null;
  title: string;
  description: string;
  metadata: Record<string, any>;
  created_at: string;
  icon: string;
  color: string;
  timeAgo: string;
}

interface QuickAction {
  icon: React.ReactNode;
  title: string;
  description: string;
  action: () => void;
  color: string;
}

// Constants
const MILLISECONDS_PER_DAY = 1000 * 60 * 60 * 24;

export default function DashboardPage() {
  // Custom hooks and state at top
  const navigate = useNavigate();
  const { isProActive, isLoading: proLoading, user } = useRequireProPlan();
  const [metrics, setMetrics] = useState<Metrics>({
    boardCount: 0,
    entryCount: 0,
    daysActive: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Event handlers
  const loadUserData = useCallback(async () => {
    try {
      setError(null);
      
      // User and subscription are already handled by useRequireProPlan hook
      if (!user?.id) {
        return;
      }

      // Fetch real metrics from Supabase with proper error handling
      // Only query if we have a confirmed user ID
      if (user.id) {
        try {
          const [boardsResponse, entriesResponse] = await Promise.all([
            supabase.from('moodboards').select('id').eq('user_id', user.id),
            supabase.from('journal_entries').select('id').eq('user_id', user.id)
          ]);

          if (boardsResponse.error) throw boardsResponse.error;
          if (entriesResponse.error) throw entriesResponse.error;

          const boardCount = boardsResponse.data?.length || 0;
          const entryCount = entriesResponse.data?.length || 0;
          
          // Calculate days active since account creation
          const daysActive = Math.ceil(
            (Date.now() - new Date(user.created_at).getTime()) / MILLISECONDS_PER_DAY
          );
          
          setMetrics({
            boardCount,
            entryCount,
            daysActive
          });
        } catch (metricsError) {
          errorTracker.trackError(metricsError, { 
            component: 'Dashboard', 
            action: 'loadMetrics',
            userId: user.id 
          });
          // If metrics fail, still show the dashboard with default values
          setMetrics({
            boardCount: 0,
            entryCount: 0,
            daysActive: 0
          });
        }
      }
      
    } catch (error) {
      setError('Unable to load dashboard. Please try again.');
      
      // If auth error, redirect to auth page
      if (error instanceof Error && (error.message.includes('auth') || error.message.includes('session'))) {
        navigate('/auth');
      }
    } finally {
      setLoading(false);
    }
  }, [navigate, user?.created_at, user?.id]);

  // Effect hooks
  useEffect(() => {
    loadUserData();
  }, [user, loadUserData]);

  // Computed values
  const userName = useMemo(() => {
    return user?.email?.split('@')[0] || 'there';
  }, [user?.email]);

  const hasActiveSubscription = useMemo(() => {
    return isProActive;
  }, [isProActive]);

  const quickActions = useMemo((): QuickAction[] => [
    {
      icon: <Target className="w-6 h-6" />,
      title: 'Create Vision Board',
      description: 'Design your AI-powered vision board',
      action: () => safeNavigate(navigate, '/moodboard', { requireAuth: true, requirePro: true }),
      color: 'bg-purple-100 text-purple-600'
    },
    {
      icon: <BookOpen className="w-6 h-6" />,
      title: 'Write Journal Entry',
      description: 'Capture your thoughts and progress',
      action: () => safeNavigate(navigate, '/journal', { requireAuth: true, requirePro: true }),
      color: 'bg-blue-100 text-blue-600'
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      title: 'View Insights',
      description: 'Analyze your growth patterns',
      action: () => safeNavigate(navigate, '/insights', { requireAuth: true, requirePro: true }),
      color: 'bg-green-100 text-green-600'
    }
  ], [navigate]);

  const handleUpgradeClick = useCallback(() => {
    navigate('/pricing');
  }, [navigate]);

  const handleCreateVisionBoard = useCallback(() => {
    safeNavigate(navigate, '/moodboard', { requireAuth: true, requirePro: true });
  }, [navigate]);

  // Early returns for loading/error states
  if (loading || proLoading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={loadUserData} />;
  }

  if (!user) {
    return <LoadingState />;
  }

  // Main JSX render
  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="container mx-auto px-4 py-8">
        {/* Welcome Header */}
        <WelcomeHeader userName={userName} />

        {/* First Time Checklist */}
        <FirstTimeChecklist />

        {/* Goals Dashboard */}
        <div className="mb-8">
          <GoalsDashboard />
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Subscription Status Alert */}
            {!hasActiveSubscription && (
              <UpgradePrompt onUpgrade={handleUpgradeClick} />
            )}

            {/* Quick Actions */}
            <QuickActionsSection actions={quickActions} />

            {/* Mood Analytics */}
            <MoodAnalyticsPanelLazy />

            {/* Recent Activity */}
            <RecentActivitySection 
              hasActivity={metrics.boardCount > 0 || metrics.entryCount > 0}
              onCreateVisionBoard={handleCreateVisionBoard}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Current Plan */}
            <SubscriptionStatus />

            {/* Progress Overview */}
            <ProgressOverview metrics={metrics} />

            {/* Tips & Motivation */}
            <DailyTip />
          </div>
        </div>
      </div>
    </div>
  );
}

// Sub-components
function LoadingState() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <Loader size="large" />
        <p className="mt-4 text-text-secondary">Loading your data...</p>
      </div>
    </div>
  );
}

interface ErrorStateProps {
  error: string;
  onRetry: () => void;
}

function ErrorState({ error, onRetry }: ErrorStateProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-text-primary mb-2">Error Loading Dashboard</h2>
        <p className="text-text-secondary mb-4">{error}</p>
        <Button onClick={onRetry}>Try Again</Button>
      </div>
    </div>
  );
}

interface WelcomeHeaderProps {
  userName: string;
}

function WelcomeHeader({ userName }: WelcomeHeaderProps) {
  return (
    <div className="mb-8">
      <h1 className="text-3xl font-bold text-text-primary mb-2">
        Welcome back, {userName}!
      </h1>
      <p className="text-text-secondary">
        Ready to continue your transformation journey?
      </p>
    </div>
  );
}

interface UpgradePromptProps {
  onUpgrade: () => void;
}

function UpgradePrompt({ onUpgrade }: UpgradePromptProps) {
  return (
    <div className="card bg-gradient-to-r from-accent/10 to-primary/10 border border-accent/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Crown className="w-8 h-8 text-accent mr-4" />
          <div>
            <h3 className="text-lg font-semibold text-text-primary">
              Unlock Your Full Potential
            </h3>
            <p className="text-text-secondary">
              Subscribe to access all AI-powered features and transform your dreams into reality.
            </p>
          </div>
        </div>
        <Button onClick={onUpgrade}>
          Upgrade Now
        </Button>
      </div>
    </div>
  );
}

interface QuickActionsSectionProps {
  actions: QuickAction[];
}

function QuickActionsSection({ actions }: QuickActionsSectionProps) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-text-primary mb-4">Quick Actions</h2>
      <div className="grid md:grid-cols-3 gap-4">
        {actions.map((action, index) => (
          <QuickActionCard key={index} action={action} />
        ))}
      </div>
    </div>
  );
}

interface QuickActionCardProps {
  action: QuickAction;
}

function QuickActionCard({ action }: QuickActionCardProps) {
  return (
    <div
      onClick={action.action}
      className="card cursor-pointer hover:scale-105 transition-transform"
    >
      <div className={`w-12 h-12 rounded-full ${action.color} flex items-center justify-center mb-4`}>
        {action.icon}
      </div>
      <h3 className="font-semibold text-text-primary mb-2">{action.title}</h3>
      <p className="text-sm text-text-secondary">{action.description}</p>
    </div>
  );
}

interface RecentActivitySectionProps {
  hasActivity: boolean;
  onCreateVisionBoard: () => void;
}

function RecentActivitySection({ hasActivity, onCreateVisionBoard }: RecentActivitySectionProps) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-text-primary mb-4">Recent Activity</h2>
      <div className="card">
        {hasActivity ? (
          <ActivityList />
        ) : (
          <EmptyActivityState onCreateVisionBoard={onCreateVisionBoard} />
        )}
      </div>
    </div>
  );
}

function ActivityList() {
  const navigate = useNavigate();
  const { user } = useRequireProPlan();
  const [offset, setOffset] = useState(0);
  const limit = 20;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['activity-feed', user?.id, offset],
    queryFn: async () => {
      if (!user?.id) return { activities: [], hasMore: false };

      const { data: session } = await supabase.auth.getSession();
      if (!session?.session) throw new Error('No session');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/activity-feed?limit=${limit}&offset=${offset}`,
        {
          headers: {
            'Authorization': `Bearer ${session.session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch activity feed');
      }

      return await response.json();
    },
    enabled: !!user?.id,
    staleTime: 30000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  const handleActivityClick = (activity: ActivityItem) => {
    if (!activity.reference_id) return;

    switch (activity.type) {
      case 'journal_entry':
        navigate(`/journal/${activity.reference_id}`);
        break;
      case 'moodboard':
        navigate('/moodboard');
        break;
      case 'goal':
      case 'milestone':
        navigate('/dashboard#goals');
        break;
      default:
        break;
    }
  };

  if (isLoading && offset === 0) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-text-secondary">Failed to load activity feed</p>
        <Button onClick={() => refetch()} size="small" variant="secondary" className="mt-2">
          Retry
        </Button>
      </div>
    );
  }

  const activities = data?.activities || [];

  if (activities.length === 0 && offset === 0) {
    return (
      <div className="text-center py-8">
        <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-text-secondary">No activity yet. Start by creating a journal entry or vision board!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activities.map((activity: ActivityItem) => (
        <div
          key={activity.id}
          onClick={() => handleActivityClick(activity)}
          className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group"
        >
          <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-primary/10 to-accent/10 rounded-full flex items-center justify-center text-lg">
            {activity.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-text-primary">
                  {activity.title}
                </p>
                {activity.description && (
                  <p className="text-xs text-text-secondary mt-1 line-clamp-2">
                    {activity.description}
                  </p>
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity ml-2 flex-shrink-0" />
            </div>
            <div className="flex items-center mt-2 space-x-2">
              <span className={`text-xs font-medium ${activity.color}`}>
                {activity.action}
              </span>
              <span className="text-xs text-text-secondary flex items-center">
                <Clock className="w-3 h-3 mr-1" />
                {activity.timeAgo}
              </span>
            </div>
          </div>
        </div>
      ))}
      {data?.hasMore && (
        <div className="text-center pt-4">
          <Button
            onClick={() => setOffset(offset + limit)}
            size="small"
            variant="secondary"
            loading={isLoading}
          >
            Load More
          </Button>
        </div>
      )}
    </div>
  );
}

interface EmptyActivityStateProps {
  onCreateVisionBoard: () => void;
}

function EmptyActivityState({ onCreateVisionBoard }: EmptyActivityStateProps) {
  return (
    <div className="text-center py-8">
      <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-text-primary mb-2">
        Start Your Journey
      </h3>
      <p className="text-text-secondary mb-4">
        Create your first vision board or journal entry to begin tracking your progress.
      </p>
      <Button onClick={onCreateVisionBoard}>
        <Plus className="w-4 h-4 mr-2" />
        Create Vision Board
      </Button>
    </div>
  );
}

interface ProgressOverviewProps {
  metrics: Metrics;
}

function ProgressOverview({ metrics }: ProgressOverviewProps) {
  const progressItems = [
    { label: 'Vision Boards', value: metrics.boardCount },
    { label: 'Journal Entries', value: metrics.entryCount },
    { label: 'Days Active', value: metrics.daysActive }
  ];

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-text-primary mb-4">Progress Overview</h3>
      <div className="space-y-4">
        {progressItems.map((item, index) => (
          <div key={index} className="flex justify-between items-center">
            <span className="text-text-secondary">{item.label}</span>
            <span className="font-semibold text-text-primary">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DailyTip() {
  const tips = [
    "Start each day by reviewing your vision board. Visualization is a powerful tool that helps align your subconscious mind with your goals, making success more achievable.",
    "Journal for just 5 minutes daily. Consistency beats perfection when building transformative habits.",
    "Update your vision board monthly to reflect your evolving goals and celebrate achieved milestones.",
    "Review your AI summaries weekly to identify patterns and track your personal growth journey."
  ];

  // Rotate tip based on day of year
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / MILLISECONDS_PER_DAY);
  const currentTip = tips[dayOfYear % tips.length];

  return (
    <div className="card bg-gradient-to-br from-primary/10 to-accent/10">
      <h3 className="text-lg font-semibold text-text-primary mb-3">💡 Daily Tip</h3>
      <p className="text-text-secondary text-sm">{currentTip}</p>
    </div>
  );
}