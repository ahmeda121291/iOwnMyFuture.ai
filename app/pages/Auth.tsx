import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSession } from '../core/api/supabase';
import AuthForm from '../features/auth/AuthForm';
import Loader from '../shared/components/Loader';

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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
      // Check if user has Pro subscription
      const session = await getSession();
      if (session) {
        const { getUserSubscription } = await import('../core/api/supabase');
        const subscription = await getUserSubscription(session.user.id);
        
        // Check if they have an active subscription
        const hasProAccess = 
          subscription && 
          subscription.subscription_status === 'active' &&
          subscription.price_id &&
          !subscription.cancel_at_period_end;
        
        if (hasProAccess) {
          // Has Pro, go to dashboard
          navigate('/dashboard');
        } else {
          // No Pro subscription, redirect to upgrade page
          navigate('/upgrade');
        }
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