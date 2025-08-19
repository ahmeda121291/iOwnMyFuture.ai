import type { NavigateFunction } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import { createCheckoutSession } from '../../core/api/stripeClient';
import toast from 'react-hot-toast';

// Storage keys
const STORAGE_KEYS = {
  redirectPriceId: 'redirectPriceId',
  redirectPath: 'redirectPath',
  isNewUser: 'isNewUser'
} as const;

// User types
export type UserState = 'unauthenticated' | 'authenticated_no_pro' | 'authenticated_pro';

interface NavigationContext {
  user: User | null;
  hasProPlan: boolean;
  navigate: NavigateFunction;
}

/**
 * Determines the user's subscription state
 */
export function getUserState(user: User | null, hasProPlan: boolean): UserState {
  if (!user) { return 'unauthenticated'; }
  if (hasProPlan) { return 'authenticated_pro'; }
  return 'authenticated_no_pro';
}

/**
 * Stores the intended plan selection for unauthenticated users
 */
export function storePlanSelection(priceId: string, redirectPath?: string): void {
  sessionStorage.setItem(STORAGE_KEYS.redirectPriceId, priceId);
  if (redirectPath) {
    sessionStorage.setItem(STORAGE_KEYS.redirectPath, redirectPath);
  }
}

/**
 * Retrieves and clears the stored plan selection
 */
export function getAndClearPlanSelection(): { priceId: string | null; redirectPath: string | null } {
  const priceId = sessionStorage.getItem(STORAGE_KEYS.redirectPriceId);
  const redirectPath = sessionStorage.getItem(STORAGE_KEYS.redirectPath);
  
  // Clear after retrieval
  sessionStorage.removeItem(STORAGE_KEYS.redirectPriceId);
  sessionStorage.removeItem(STORAGE_KEYS.redirectPath);
  
  return { priceId, redirectPath };
}

/**
 * Marks a user as new (for showing welcome messages)
 */
export function markAsNewUser(): void {
  sessionStorage.setItem(STORAGE_KEYS.isNewUser, 'true');
}

/**
 * Checks and clears new user flag
 */
export function checkAndClearNewUserFlag(): boolean {
  const isNew = sessionStorage.getItem(STORAGE_KEYS.isNewUser) === 'true';
  sessionStorage.removeItem(STORAGE_KEYS.isNewUser);
  return isNew;
}

/**
 * Handles navigation after authentication based on user state
 */
export async function handlePostAuthNavigation(
  context: NavigationContext,
  isNewUser: boolean = false
): Promise<void> {
  const { user, hasProPlan, navigate } = context;
  
  if (!user) {
    navigate('/auth');
    return;
  }

  // Check for stored plan selection (user clicked a plan while logged out)
  const { priceId, redirectPath } = getAndClearPlanSelection();
  
  // Get URL params for redirect handling
  const urlParams = new URLSearchParams(window.location.search);
  const redirectParam = urlParams.get('redirect');
  
  try {
    // If user already has Pro, send them to dashboard or redirect path
    if (hasProPlan) {
      if (redirectPath && redirectPath !== '/upgrade') {
        navigate(redirectPath);
      } else {
        navigate('/dashboard');
      }
      
      if (isNewUser) {
        toast.success('Welcome to I Own My Future Pro! 🎉');
      }
      return;
    }

    // Handle stored plan selection - immediately start checkout
    if (priceId && (redirectParam === 'upgrade' || redirectPath === '/upgrade')) {
      toast.loading('Preparing checkout...');
      
      try {
        const result = await createCheckoutSession({
          priceId,
          successUrl: `${window.location.origin}/success`,
          cancelUrl: `${window.location.origin}/upgrade`
        });

        if (result.url) {
          window.location.href = result.url;
          return;
        } else {
          throw new Error('No checkout URL received');
        }
      } catch (error) {
        console.error('Checkout session creation failed:', error);
        toast.error('Failed to start checkout. Please try again.');
        // Fall back to upgrade page
        navigate('/upgrade');
      }
      return;
    }

    // For new users without Pro, mark them and redirect to upgrade
    if (isNewUser) {
      markAsNewUser();
      toast.success('Welcome! Choose a plan to get started 🚀');
      navigate('/upgrade');
      return;
    }

    // Default behavior for authenticated users without Pro
    if (redirectPath) {
      // If they were trying to access a specific page, remember it
      sessionStorage.setItem(STORAGE_KEYS.redirectPath, redirectPath);
    }
    navigate('/upgrade');
    
  } catch (error) {
    console.error('Navigation error:', error);
    toast.error('Navigation failed. Please try again.');
    navigate('/upgrade');
  }
}

/**
 * Handles navigation for unauthenticated users trying to access protected routes
 */
export function handleUnauthenticatedNavigation(
  navigate: NavigateFunction,
  intendedPath?: string,
  priceId?: string
): void {
  // Store the intended destination
  if (intendedPath) {
    sessionStorage.setItem(STORAGE_KEYS.redirectPath, intendedPath);
  }
  
  // Store plan selection if provided
  if (priceId) {
    storePlanSelection(priceId, intendedPath);
    navigate('/auth?redirect=upgrade');
  } else {
    navigate('/auth');
  }
}

/**
 * Handles plan selection clicks based on user state
 */
export async function handlePlanSelection(
  priceId: string,
  context: NavigationContext
): Promise<void> {
  const userState = getUserState(context.user, context.hasProPlan);
  
  switch (userState) {
    case 'unauthenticated':
      // Store selection and redirect to auth
      storePlanSelection(priceId, '/upgrade');
      context.navigate('/auth?redirect=upgrade');
      break;
      
    case 'authenticated_no_pro':
      // Start checkout immediately
      toast.loading('Preparing checkout...');
      try {
        const result = await createCheckoutSession({
          priceId,
          successUrl: `${window.location.origin}/success`,
          cancelUrl: `${window.location.origin}/upgrade`
        });

        if (result.url) {
          window.location.href = result.url;
        } else {
          throw new Error('No checkout URL received');
        }
      } catch (error) {
        console.error('Checkout session creation failed:', error);
        toast.error('Failed to start checkout. Please try again.');
      }
      break;
      
    case 'authenticated_pro':
      // Already has Pro - maybe show manage subscription option
      toast.info('You already have an active Pro subscription');
      context.navigate('/profile');
      break;
  }
}

/**
 * Checks if user needs Pro plan for a specific route
 */
export function requiresProPlan(pathname: string): boolean {
  const protectedRoutes = [
    '/dashboard',
    '/journal',
    '/moodboard',
    '/insights',
    '/profile'
  ];
  
  return protectedRoutes.some(route => pathname.startsWith(route));
}