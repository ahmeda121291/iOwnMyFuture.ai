import { getSession, getUserSubscription } from '../../core/api/supabase';
import type { Session } from '@supabase/supabase-js';

interface NavigationGuardOptions {
  requireAuth?: boolean;
  requirePro?: boolean;
  fallbackUrl?: string;
}

interface Subscription {
  subscription_status: string;
  price_id: string;
  cancel_at_period_end: boolean;
}

/**
 * Centralized navigation guard to check authentication and subscription status
 * before allowing navigation to protected routes
 */
export async function checkNavigationGuards(
  options: NavigationGuardOptions = {}
): Promise<{
  canNavigate: boolean;
  redirectTo: string | null;
  session: Session | null;
  subscription: Subscription | null;
}> {
  const { 
    requireAuth = true, 
    requirePro = true,
    fallbackUrl = null 
  } = options;

  try {
    // Check authentication
    const session = await getSession();
    
    if (requireAuth && !session) {
      // Not authenticated, redirect to auth
      return {
        canNavigate: false,
        redirectTo: '/auth',
        session: null,
        subscription: null
      };
    }

    // If no auth required and no session, allow navigation
    if (!requireAuth && !session) {
      return {
        canNavigate: true,
        redirectTo: null,
        session: null,
        subscription: null
      };
    }

    // Check subscription if authenticated and Pro is required
    if (session && requirePro) {
      const subscription = await getUserSubscription(session.user.id);
      
      // Check if subscription is valid (include multiple statuses)
      const validStatuses = ['active', 'trialing', 'past_due', 'incomplete'];
      const hasProAccess = 
        subscription && 
        validStatuses.includes(subscription.subscription_status || subscription.status) &&
        subscription.price_id;
      // Note: We don't check cancel_at_period_end - users keep access until period ends

      if (!hasProAccess) {
        // No Pro subscription, redirect to upgrade
        return {
          canNavigate: false,
          redirectTo: '/upgrade',
          session,
          subscription
        };
      }

      // Has Pro access
      return {
        canNavigate: true,
        redirectTo: null,
        session,
        subscription
      };
    }

    // Authenticated but Pro not required
    return {
      canNavigate: true,
      redirectTo: null,
      session,
      subscription: null
    };

  } catch (error) {
    console.error('Error checking navigation guards:', error);
    
    // On error, redirect to fallback or auth
    return {
      canNavigate: false,
      redirectTo: fallbackUrl || '/auth',
      session: null,
      subscription: null
    };
  }
}

/**
 * Safe navigation helper that checks guards before navigating
 */
export async function safeNavigate(
  navigate: (path: string) => void,
  targetPath: string,
  options: NavigationGuardOptions = {}
): Promise<void> {
  const { canNavigate, redirectTo } = await checkNavigationGuards(options);
  
  if (canNavigate) {
    navigate(targetPath);
  } else if (redirectTo) {
    navigate(redirectTo);
  }
}

/**
 * Check if user can access Pro features
 */
export async function canAccessProFeatures(): Promise<boolean> {
  try {
    const session = await getSession();
    if (!session) return false;

    const subscription = await getUserSubscription(session.user.id);
    
    // Check if subscription is valid (include multiple statuses)
    const validStatuses = ['active', 'trialing', 'past_due', 'incomplete'];
    return !!(
      subscription && 
      validStatuses.includes(subscription.subscription_status || subscription.status) &&
      subscription.price_id
    );
    // Note: We don't check cancel_at_period_end - users keep access until period ends
  } catch {
    return false;
  }
}

/**
 * Get the appropriate redirect path based on user status
 */
export async function getRedirectPath(): Promise<string> {
  try {
    const session = await getSession();
    
    if (!session) {
      return '/auth';
    }

    const hasProAccess = await canAccessProFeatures();
    
    if (!hasProAccess) {
      return '/upgrade';
    }

    // Check for stored redirect path (e.g., after upgrade)
    const storedRedirect = sessionStorage.getItem('redirectAfterUpgrade');
    if (storedRedirect) {
      sessionStorage.removeItem('redirectAfterUpgrade');
      return storedRedirect;
    }

    return '/dashboard';
  } catch {
    return '/auth';
  }
}