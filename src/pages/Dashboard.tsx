import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, BookOpen, TrendingUp, Crown, Plus } from 'lucide-react';
import { getCurrentUser, getUserSubscription } from '../lib/supabase.ts';
import { getProductByPriceId } from '../stripe-config';
import Button from '../components/Shared/Button';
import Loader from '../components/Shared/Loader';
import SubscriptionStatus from '../components/Subscription/SubscriptionStatus';

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userData = await getCurrentUser();
      if (!userData) {
        navigate('/auth');
        return;
      }
      setUser(userData);

      const subscriptionData = await getUserSubscription();
      setSubscription(subscriptionData);
    } catch (error) {
      console.error('Error loading user data:', error);
      navigate('/auth');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader size="large" />
      </div>
    );
  }

  const hasActiveSubscription = subscription && ['active', 'trialing'].includes(subscription.subscription_status);
  const currentPlan = subscription?.price_id ? getProductByPriceId(subscription.price_id) : null;

  const quickActions = [
    {
      icon: <Target className="w-6 h-6" />,
      title: 'Create Vision Board',
      description: 'Design your AI-powered vision board',
      action: () => navigate('/moodboard'),
      color: 'bg-purple-100 text-purple-600'
    },
    {
      icon: <BookOpen className="w-6 h-6" />,
      title: 'Write Journal Entry',
      description: 'Capture your thoughts and progress',
      action: () => navigate('/journal'),
      color: 'bg-blue-100 text-blue-600'
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      title: 'View Insights',
      description: 'Analyze your growth patterns',
      action: () => navigate('/insights'),
      color: 'bg-green-100 text-green-600'
    }
  ];

  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="container mx-auto px-4 py-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2">
            Welcome back, {user?.email?.split('@')[0]}!
          </h1>
          <p className="text-text-secondary">
            Ready to continue your transformation journey?
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Subscription Status Alert */}
            {!hasActiveSubscription && (
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
                  <Button onClick={() => navigate('/pricing')}>
                    Upgrade Now
                  </Button>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div>
              <h2 className="text-xl font-semibold text-text-primary mb-4">Quick Actions</h2>
              <div className="grid md:grid-cols-3 gap-4">
                {quickActions.map((action, index) => (
                  <div
                    key={index}
                    onClick={action.action}
                    className="card cursor-pointer hover:scale-105 transition-transform"
                  >
                    <div className={`w-12 h-12 rounded-full ${action.color} flex items-center justify-center mb-4`}>
                      {action.icon}
                    </div>
                    <h3 className="font-semibold text-text-primary mb-2">{action.title}</h3>
                    <p className="text-sm text-text-secondary">{action.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div>
              <h2 className="text-xl font-semibold text-text-primary mb-4">Recent Activity</h2>
              <div className="card">
                <div className="text-center py-8">
                  <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-text-primary mb-2">
                    Start Your Journey
                  </h3>
                  <p className="text-text-secondary mb-4">
                    Create your first vision board or journal entry to begin tracking your progress.
                  </p>
                  <Button onClick={() => navigate('/moodboard')}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Vision Board
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Current Plan */}
            <SubscriptionStatus />

            {/* Progress Overview */}
            <div className="card">
              <h3 className="text-lg font-semibold text-text-primary mb-4">Progress Overview</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-text-secondary">Vision Boards</span>
                  <span className="font-semibold text-text-primary">0</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-text-secondary">Journal Entries</span>
                  <span className="font-semibold text-text-primary">0</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-text-secondary">Days Active</span>
                  <span className="font-semibold text-text-primary">1</span>
                </div>
              </div>
            </div>

            {/* Tips & Motivation */}
            <div className="card bg-gradient-to-br from-primary/10 to-accent/10">
              <h3 className="text-lg font-semibold text-text-primary mb-3">💡 Daily Tip</h3>
              <p className="text-text-secondary text-sm">
                Start each day by reviewing your vision board. Visualization is a powerful tool that helps 
                align your subconscious mind with your goals, making success more achievable.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}