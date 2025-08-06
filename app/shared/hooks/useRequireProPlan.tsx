import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getSession, getUserSubscription } from '../../core/api/supabase';
import { errorTracker } from '../utils/errorTracking';
import Loader from '../components/Loader';

interface UseRequireProPlanOptions {
  redirectTo?: string;
  showToast?: boolean;
  toastMessage?: string;
  skipRedirect?: boolean; // Option to skip automatic redirect
}

interface UseRequireProPlanResult {
  isProActive: boolean;
  isLoading: boolean;
  subscription: { subscription_status: string; price_id: string; cancel_at_period_end: boolean } | null;
  user: { id: string; email?: string; created_at: string } | null;
  checkProAccess: () => Promise<void>;
}

// Pages that should not trigger Pro requirement redirects
const ALLOWED_PAGES = [
  '/upgrade',
  '/pricing',
  '/success',
  '/auth',
  '/stripe-checkout',
  '/',  // Landing page
];

/**
 * Hook to enforce Pro-only access
 * Checks if the current user has an active Pro subscription
 * Redirects to pricing page if not (except on allowed pages)
 */
export function useRequireProPlan(options: UseRequireProPlanOptions = {}): UseRequireProPlanResult {
  const {
    redirectTo = '/upgrade',
    showToast = true,
    toastMessage = 'MyFutureSelf is a Pro-only platform. Subscribe to unlock all features.',
    skipRedirect = false
  } = options;
  
  const navigate = useNavigate();
  const location = useLocation();
  const [isProActive, setIsProActive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [subscription, setSubscription] = useState<{ subscription_status: string; price_id: string; cancel_at_period_end: boolean } | null>(null);
  const [user, setUser] = useState<{ id: string; email?: string; created_at: string } | null>(null);

  const checkProAccess = useCallback(async () => {
      try {
        // First check if user is authenticated
        const session = await getSession();
        
        if (!session) {
          // Not logged in - redirect to auth unless on allowed page
          if (!ALLOWED_PAGES.some(page => location.pathname.startsWith(page))) {
            navigate('/auth');
          }
          setIsLoading(false);
          return;
        }

        setUser(session.user);

        // Get user subscription status
        const userSubscription = await getUserSubscription(session.user.id);
        setSubscription(userSubscription);
        
        // Check if user has active Pro subscription
        const hasProAccess = 
          userSubscription && 
          userSubscription.subscription_status === 'active' &&
          userSubscription.price_id && // Has an active price/plan
          !userSubscription.cancel_at_period_end; // Not scheduled for cancellation
        
        setIsProActive(hasProAccess);
        
        // Check if we should redirect for non-Pro users
        const isOnAllowedPage = ALLOWED_PAGES.some(page => location.pathname.startsWith(page));
        
        if (!hasProAccess && !isOnAllowedPage && !skipRedirect) {
          // Store the intended destination for after upgrade
          sessionStorage.setItem('redirectAfterUpgrade', location.pathname);
          
          // Check if this is a new user (created within last 5 minutes)
          const userCreatedAt = new Date(session.user.created_at || Date.now());
          const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
          const isNewUser = userCreatedAt > fiveMinutesAgo;
          
          if (showToast) {
            if (isNewUser) {
              toast('Welcome! Subscribe to Pro to start your journey.', {
                icon: '🚀',
                duration: 5000
              });
            } else {
              toast.error(toastMessage);
            }
          }
          
          // Redirect to upgrade page
          navigate(redirectTo);
        }
      } catch (error) {
        errorTracker.trackError(error, {
          component: 'useRequireProPlan',
          action: 'checkProAccess',
          pathname: location.pathname
        });
        setIsProActive(false);
        
        // Only redirect on error if not on allowed page
        const isOnAllowedPage = ALLOWED_PAGES.some(page => location.pathname.startsWith(page));
        
        if (!isOnAllowedPage && !skipRedirect) {
          if (showToast) {
            toast.error('Unable to verify subscription status');
          }
          navigate(redirectTo);
        }
      } finally {
        setIsLoading(false);
      }
  }, [navigate, redirectTo, showToast, toastMessage, location.pathname, skipRedirect]);

  useEffect(() => {
    checkProAccess();
  }, [checkProAccess]);

  return {
    isProActive,
    isLoading,
    subscription,
    user,
    checkProAccess
  };
}

/**
 * HOC version for wrapping components
 */
export function withProPlan<P extends object>(
  component: React.ComponentType<P>,
  options?: UseRequireProPlanOptions
): React.FC<P> {
  return function ProPlanProtectedComponent(props: P) {
    const { isLoading, isProActive } = useRequireProPlan(options);
    
    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background pt-20">
          <div className="text-center">
            <Loader size="large" />
            <p className="mt-4 text-text-secondary">Verifying subscription...</p>
          </div>
        </div>
      );
    }
    
    if (!isProActive) {
      // Show loading while redirecting
      return (
        <div className="min-h-screen flex items-center justify-center bg-background pt-20">
          <div className="text-center">
            <Loader size="large" />
            <p className="mt-4 text-text-secondary">Redirecting to upgrade...</p>
          </div>
        </div>
      );
    }
    
    return React.createElement(component, props);
  };
}