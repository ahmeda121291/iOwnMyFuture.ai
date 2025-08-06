import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getSession, getUserSubscription } from '../../core/api/supabase';

interface UseRequireProPlanOptions {
  redirectTo?: string;
  showToast?: boolean;
  toastMessage?: string;
}

interface UseRequireProPlanResult {
  isProActive: boolean;
  isLoading: boolean;
  subscription: any;
}

/**
 * Hook to enforce Pro-only access
 * Checks if the current user has an active Pro subscription
 * Redirects to pricing page if not
 */
export function useRequireProPlan(options: UseRequireProPlanOptions = {}): UseRequireProPlanResult {
  const {
    redirectTo = '/upgrade',
    showToast = true,
    toastMessage = 'MyFutureSelf is a Pro-only platform. Subscribe to unlock all features.'
  } = options;
  
  const navigate = useNavigate();
  const [isProActive, setIsProActive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [subscription, setSubscription] = useState<any>(null);

  useEffect(() => {
    const checkProAccess = async () => {
      try {
        // First check if user is authenticated
        const session = await getSession();
        
        if (!session) {
          navigate('/auth');
          return;
        }

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
        
        if (!hasProAccess) {
          // Store the intended destination for after upgrade
          sessionStorage.setItem('redirectAfterUpgrade', window.location.pathname);
          
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
      } catch (_error) {
        setIsProActive(false);
        
        if (showToast) {
          toast.error('Unable to verify subscription status');
        }
        
        navigate(redirectTo);
      } finally {
        setIsLoading(false);
      }
    };

    checkProAccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    isProActive,
    isLoading,
    subscription
  };
}

/**
 * HOC version for wrapping components
 */
export function withProPlan<P extends object>(
  Component: React.ComponentType<P>,
  options?: UseRequireProPlanOptions
): React.FC<P> {
  return function ProPlanProtectedComponent(props: P) {
    const { isLoading, isProActive } = useRequireProPlan(options);
    
    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      );
    }
    
    if (!isProActive) {
      return null; // Will redirect via the hook
    }
    
    return <Component {...props} />;
  };
}