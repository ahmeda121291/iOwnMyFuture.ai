import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getSession, getUserSubscription } from '../core/api/supabase';
import AuthForm from '../features/auth/AuthForm';
import Loader from '../shared/components/Loader';
import { handlePostAuthNavigation } from '../shared/utils/navigationHelper';

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const _location = useLocation();

  const checkUser = useCallback(async () => {
    try {
      const session = await getSession();
      if (session) {
        // If already logged in, redirect to dashboard
        navigate('/dashboard');
      }
    } catch (_error) {
      // User not authenticated, stay on auth page
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    checkUser();
  }, [checkUser]);

  const handleAuthSuccess = async () => {
    // Add a small delay to ensure auth state is propagated
    setTimeout(async () => {
      try {
        // Get current session and subscription
        const session = await getSession();
        if (!session) {
          console.error('No session after auth success');
          return;
        }

        // Check if user has Pro subscription
        const subscription = await getUserSubscription(session.user.id);
        const hasProPlan = 
          subscription && 
          subscription.subscription_status === 'active' &&
          subscription.price_id &&
          !subscription.cancel_at_period_end;

        // Check if this is a new user (created within last 5 minutes)
        const userCreatedAt = new Date(session.user.created_at || Date.now());
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const isNewUser = userCreatedAt > fiveMinutesAgo;

        // Use centralized navigation helper
        await handlePostAuthNavigation(
          {
            user: session.user,
            hasProPlan,
            navigate
          },
          isNewUser
        );
      } catch (error) {
        console.error('Error in post-auth navigation:', error);
        // Fallback to upgrade page on error
        navigate('/upgrade');
      }
    }, 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader size="large" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/30 via-background to-accent/20 flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <AuthForm
          mode={mode}
          onSuccess={handleAuthSuccess}
          onModeChange={setMode}
        />
      </div>
    </div>
  );
}