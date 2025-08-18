import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { User } from '@supabase/supabase-js';
import type { NavigateFunction } from 'react-router-dom';
import { 
  getUserState, 
  storePlanSelection, 
  getAndClearPlanSelection,
  handlePostAuthNavigation,
  handleUnauthenticatedNavigation,
  handlePlanSelection,
  requiresProPlan
} from '../app/shared/utils/navigationHelper';
import { createCheckoutSession } from '../app/core/api/stripeClient';
import toast from 'react-hot-toast';

// Mock dependencies
vi.mock('../app/core/api/stripeClient', () => ({
  createCheckoutSession: vi.fn()
}));

vi.mock('react-hot-toast', () => ({
  default: {
    loading: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn()
  }
}));

describe('Navigation Helper', () => {
  const mockNavigate = vi.fn() as unknown as NavigateFunction;
  const mockUser = { 
    id: 'user-123', 
    email: 'test@example.com',
    created_at: new Date().toISOString()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    // Reset window.location
    Object.defineProperty(window, 'location', {
      value: { 
        origin: 'http://localhost:3000',
        href: 'http://localhost:3000',
        search: ''
      },
      writable: true
    });
  });

  describe('getUserState', () => {
    it('should return unauthenticated when no user', () => {
      expect(getUserState(null, false)).toBe('unauthenticated');
    });

    it('should return authenticated_no_pro when user without pro', () => {
      expect(getUserState(mockUser as User, false)).toBe('authenticated_no_pro');
    });

    it('should return authenticated_pro when user has pro', () => {
      expect(getUserState(mockUser as User, true)).toBe('authenticated_pro');
    });
  });

  describe('Plan Selection Storage', () => {
    it('should store and retrieve plan selection', () => {
      const priceId = 'price_123';
      const redirectPath = '/dashboard';
      
      storePlanSelection(priceId, redirectPath);
      
      const result = getAndClearPlanSelection();
      expect(result.priceId).toBe(priceId);
      expect(result.redirectPath).toBe(redirectPath);
      
      // Should be cleared after retrieval
      const secondResult = getAndClearPlanSelection();
      expect(secondResult.priceId).toBeNull();
      expect(secondResult.redirectPath).toBeNull();
    });
  });

  describe('handlePostAuthNavigation', () => {
    it('should redirect unauthenticated users to auth', async () => {
      await handlePostAuthNavigation({
        user: null,
        hasProPlan: false,
        navigate: mockNavigate
      });
      
      expect(mockNavigate).toHaveBeenCalledWith('/auth');
    });

    it('should redirect Pro users to dashboard', async () => {
      await handlePostAuthNavigation({
        user: mockUser as User,
        hasProPlan: true,
        navigate: mockNavigate
      });
      
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });

    it('should start checkout immediately if plan was preselected', async () => {
      // Store a plan selection
      sessionStorage.setItem('redirectPriceId', 'price_123');
      window.location.search = '?redirect=upgrade';
      
      const mockCheckout = vi.mocked(createCheckoutSession);
      mockCheckout.mockResolvedValue({ url: 'https://checkout.stripe.com/pay/123' });
      
      await handlePostAuthNavigation({
        user: mockUser as User,
        hasProPlan: false,
        navigate: mockNavigate
      });
      
      expect(mockCheckout).toHaveBeenCalledWith({
        priceId: 'price_123',
        successUrl: 'http://localhost:3000/success',
        cancelUrl: 'http://localhost:3000/upgrade'
      });
    });

    it('should show welcome message for new users', async () => {
      const newUser = {
        ...mockUser,
        created_at: new Date().toISOString() // Just created
      };
      
      await handlePostAuthNavigation({
        user: newUser as User,
        hasProPlan: false,
        navigate: mockNavigate
      }, true);
      
      expect(toast.success).toHaveBeenCalledWith('Welcome! Choose a plan to get started 🚀');
      expect(mockNavigate).toHaveBeenCalledWith('/upgrade');
    });
  });

  describe('handleUnauthenticatedNavigation', () => {
    it('should redirect to auth with stored plan', () => {
      handleUnauthenticatedNavigation(mockNavigate, '/dashboard', 'price_123');
      
      expect(sessionStorage.getItem('redirectPriceId')).toBe('price_123');
      expect(sessionStorage.getItem('redirectPath')).toBe('/dashboard');
      expect(mockNavigate).toHaveBeenCalledWith('/auth?redirect=upgrade');
    });

    it('should redirect to auth without plan', () => {
      handleUnauthenticatedNavigation(mockNavigate, '/dashboard');
      
      expect(sessionStorage.getItem('redirectPath')).toBe('/dashboard');
      expect(mockNavigate).toHaveBeenCalledWith('/auth');
    });
  });

  describe('handlePlanSelection', () => {
    it('should redirect unauthenticated users to auth with plan stored', async () => {
      await handlePlanSelection('price_123', {
        user: null,
        hasProPlan: false,
        navigate: mockNavigate
      });
      
      expect(sessionStorage.getItem('redirectPriceId')).toBe('price_123');
      expect(mockNavigate).toHaveBeenCalledWith('/auth?redirect=upgrade');
    });

    it('should start checkout for authenticated users without Pro', async () => {
      const mockCheckout = vi.mocked(createCheckoutSession);
      mockCheckout.mockResolvedValue({ url: 'https://checkout.stripe.com/pay/123' });
      
      await handlePlanSelection('price_123', {
        user: mockUser as User,
        hasProPlan: false,
        navigate: mockNavigate
      });
      
      expect(mockCheckout).toHaveBeenCalledWith({
        priceId: 'price_123',
        successUrl: 'http://localhost:3000/success',
        cancelUrl: 'http://localhost:3000/upgrade'
      });
    });

    it('should inform Pro users they already have subscription', async () => {
      await handlePlanSelection('price_123', {
        user: mockUser as User,
        hasProPlan: true,
        navigate: mockNavigate
      });
      
      expect(toast.info).toHaveBeenCalledWith('You already have an active Pro subscription');
      expect(mockNavigate).toHaveBeenCalledWith('/profile');
    });
  });

  describe('requiresProPlan', () => {
    it('should return true for protected routes', () => {
      expect(requiresProPlan('/dashboard')).toBe(true);
      expect(requiresProPlan('/journal')).toBe(true);
      expect(requiresProPlan('/moodboard')).toBe(true);
      expect(requiresProPlan('/insights')).toBe(true);
      expect(requiresProPlan('/profile')).toBe(true);
    });

    it('should return false for public routes', () => {
      expect(requiresProPlan('/')).toBe(false);
      expect(requiresProPlan('/auth')).toBe(false);
      expect(requiresProPlan('/pricing')).toBe(false);
      expect(requiresProPlan('/upgrade')).toBe(false);
    });
  });
});

describe('Navigation Flow Integration Tests', () => {
  const mockNavigate = vi.fn() as unknown as NavigateFunction;
  
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  describe('Flow: Unauthenticated → Click Plan → Login → Checkout', () => {
    it('should complete the full flow', async () => {
      // Step 1: User clicks a plan while logged out
      handleUnauthenticatedNavigation(mockNavigate, undefined, 'price_monthly');
      expect(sessionStorage.getItem('redirectPriceId')).toBe('price_monthly');
      expect(mockNavigate).toHaveBeenCalledWith('/auth?redirect=upgrade');
      
      // Step 2: User logs in (simulate auth success)
      const mockUser = { 
        id: 'user-123', 
        email: 'test@example.com',
        created_at: new Date().toISOString()
      };
      
      // Mock checkout session creation
      const mockCheckout = vi.mocked(createCheckoutSession);
      mockCheckout.mockResolvedValue({ url: 'https://checkout.stripe.com/pay/123' });
      
      // Simulate URL params from auth redirect
      window.location.search = '?redirect=upgrade';
      
      // Step 3: Post-auth navigation should trigger checkout
      await handlePostAuthNavigation({
        user: mockUser as User,
        hasProPlan: false,
        navigate: mockNavigate
      });
      
      // Verify checkout was initiated with the stored plan
      expect(mockCheckout).toHaveBeenCalledWith(
        expect.objectContaining({
          priceId: 'price_monthly'
        })
      );
      
      // Verify storage was cleared
      expect(sessionStorage.getItem('redirectPriceId')).toBeNull();
    });
  });

  describe('Flow: Authenticated without Pro → Protected Page → Upgrade', () => {
    it('should redirect to upgrade page', async () => {
      const mockUser = { 
        id: 'user-123', 
        email: 'test@example.com',
        created_at: '2024-01-01T00:00:00Z' // Existing user
      };
      
      // User tries to access protected route
      await handlePostAuthNavigation({
        user: mockUser as User,
        hasProPlan: false,
        navigate: mockNavigate
      });
      
      expect(mockNavigate).toHaveBeenCalledWith('/upgrade');
    });
  });

  describe('Flow: New Pro Subscriber → Login → Dashboard', () => {
    it('should land on dashboard with welcome message', async () => {
      const mockUser = { 
        id: 'user-123', 
        email: 'test@example.com',
        created_at: new Date().toISOString() // New user
      };
      
      await handlePostAuthNavigation({
        user: mockUser as User,
        hasProPlan: true,
        navigate: mockNavigate
      }, true);
      
      expect(toast.success).toHaveBeenCalledWith('Welcome to MyFutureSelf Pro! 🎉');
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });
});