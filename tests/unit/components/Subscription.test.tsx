import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProOnlyRoute from '../../../app/shared/components/ProOnlyRoute';
import { useRequireProPlan } from '../../../app/shared/hooks/useRequireProPlan';
import * as supabaseApi from '../../../app/core/api/supabase';
import toast from 'react-hot-toast';

// Mock modules
vi.mock('../../../app/core/api/supabase');
vi.mock('react-hot-toast');

// Mock components
vi.mock('../../../app/shared/components/Loader', () => ({
  default: () => <div data-testid="loader">Loading...</div>
}));

vi.mock('../../../app/shared/components/ProSubscriptionModal', () => ({
  default: ({ isOpen }: { isOpen: boolean }) => 
    isOpen ? <div data-testid="pro-modal">Pro Subscription Required</div> : null
}));

describe('Pro Access Gating', () => {
  const mockNavigate = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    
    // Mock react-router-dom navigate
    vi.mock('react-router-dom', async () => {
      const actual = await vi.importActual('react-router-dom');
      return {
        ...actual,
        useNavigate: () => mockNavigate
      };
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('ProOnlyRoute Component', () => {
    it('should redirect unauthenticated users to /auth', async () => {
      // Mock no session
      vi.mocked(supabaseApi.getSession).mockResolvedValue(null);
      
      const TestComponent = () => (
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route path="/dashboard" element={
              <ProOnlyRoute>
                <div data-testid="protected-content">Dashboard</div>
              </ProOnlyRoute>
            } />
            <Route path="/auth" element={<div data-testid="auth-page">Auth Page</div>} />
          </Routes>
        </MemoryRouter>
      );
      
      render(<TestComponent />);
      
      // Should show loader initially
      expect(screen.getByTestId('loader')).toBeInTheDocument();
      
      // Wait for redirect
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/auth');
      });
    });

    it('should redirect users without Pro subscription to /pricing', async () => {
      // Mock authenticated session
      vi.mocked(supabaseApi.getSession).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' }
      } as any);
      
      // Mock no subscription
      vi.mocked(supabaseApi.getUserSubscription).mockResolvedValue(null);
      
      const TestComponent = () => (
        <MemoryRouter initialEntries={['/journal']}>
          <Routes>
            <Route path="/journal" element={
              <ProOnlyRoute>
                <div data-testid="protected-content">Journal</div>
              </ProOnlyRoute>
            } />
            <Route path="/pricing" element={<div data-testid="pricing-page">Pricing Page</div>} />
          </Routes>
        </MemoryRouter>
      );
      
      render(<TestComponent />);
      
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/pricing');
        expect(toast.error).toHaveBeenCalledWith('You must subscribe to Pro to use MyFutureSelf.');
      });
      
      // Should show Pro modal
      expect(screen.getByTestId('pro-modal')).toBeInTheDocument();
    });

    it('should redirect users with cancelled subscription to /pricing', async () => {
      // Mock authenticated session
      vi.mocked(supabaseApi.getSession).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' }
      } as any);
      
      // Mock subscription that is set to cancel
      vi.mocked(supabaseApi.getUserSubscription).mockResolvedValue({
        subscription_status: 'active',
        price_id: 'price_123',
        cancel_at_period_end: true // Scheduled for cancellation
      } as any);
      
      const TestComponent = () => (
        <MemoryRouter initialEntries={['/moodboard']}>
          <Routes>
            <Route path="/moodboard" element={
              <ProOnlyRoute>
                <div data-testid="protected-content">Moodboard</div>
              </ProOnlyRoute>
            } />
            <Route path="/pricing" element={<div data-testid="pricing-page">Pricing Page</div>} />
          </Routes>
        </MemoryRouter>
      );
      
      render(<TestComponent />);
      
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/pricing');
      });
    });

    it('should allow Pro users to access protected content', async () => {
      // Mock authenticated session
      vi.mocked(supabaseApi.getSession).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' }
      } as any);
      
      // Mock active Pro subscription
      vi.mocked(supabaseApi.getUserSubscription).mockResolvedValue({
        subscription_status: 'active',
        price_id: 'price_pro_monthly',
        cancel_at_period_end: false
      } as any);
      
      const TestComponent = () => (
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route path="/dashboard" element={
              <ProOnlyRoute>
                <div data-testid="protected-content">Dashboard</div>
              </ProOnlyRoute>
            } />
          </Routes>
        </MemoryRouter>
      );
      
      render(<TestComponent />);
      
      await waitFor(() => {
        expect(screen.getByTestId('protected-content')).toBeInTheDocument();
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
      });
      
      // Should not redirect
      expect(mockNavigate).not.toHaveBeenCalled();
      
      // Should not show error toast
      expect(toast.error).not.toHaveBeenCalled();
    });

    it('should store intended destination for redirect after upgrade', async () => {
      // Mock authenticated session
      vi.mocked(supabaseApi.getSession).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' }
      } as any);
      
      // Mock no subscription
      vi.mocked(supabaseApi.getUserSubscription).mockResolvedValue(null);
      
      // Set current location
      Object.defineProperty(window, 'location', {
        value: { pathname: '/insights' },
        writable: true
      });
      
      const TestComponent = () => (
        <MemoryRouter initialEntries={['/insights']}>
          <Routes>
            <Route path="/insights" element={
              <ProOnlyRoute>
                <div data-testid="protected-content">Insights</div>
              </ProOnlyRoute>
            } />
            <Route path="/pricing" element={<div data-testid="pricing-page">Pricing Page</div>} />
          </Routes>
        </MemoryRouter>
      );
      
      render(<TestComponent />);
      
      await waitFor(() => {
        expect(sessionStorage.getItem('redirectAfterUpgrade')).toBe('/insights');
      });
    });
  });

  describe('useRequireProPlan Hook', () => {
    it('should return loading state initially', () => {
      const TestComponent = () => {
        const { isLoading, isProActive } = useRequireProPlan();
        return (
          <div>
            <div data-testid="loading">{isLoading ? 'true' : 'false'}</div>
            <div data-testid="pro-active">{isProActive ? 'true' : 'false'}</div>
          </div>
        );
      };
      
      render(
        <MemoryRouter>
          <TestComponent />
        </MemoryRouter>
      );
      
      expect(screen.getByTestId('loading').textContent).toBe('true');
      expect(screen.getByTestId('pro-active').textContent).toBe('false');
    });

    it('should handle subscription check errors gracefully', async () => {
      // Mock authenticated session
      vi.mocked(supabaseApi.getSession).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' }
      } as any);
      
      // Mock error in subscription check
      vi.mocked(supabaseApi.getUserSubscription).mockRejectedValue(
        new Error('Network error')
      );
      
      const TestComponent = () => {
        const { isLoading, isProActive } = useRequireProPlan();
        return (
          <div>
            <div data-testid="loading">{isLoading ? 'true' : 'false'}</div>
            <div data-testid="pro-active">{isProActive ? 'true' : 'false'}</div>
          </div>
        );
      };
      
      render(
        <MemoryRouter>
          <TestComponent />
        </MemoryRouter>
      );
      
      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
        expect(screen.getByTestId('pro-active').textContent).toBe('false');
        expect(toast.error).toHaveBeenCalledWith('Unable to verify subscription status');
        expect(mockNavigate).toHaveBeenCalledWith('/pricing');
      });
    });

    it('should accept custom redirect and toast options', async () => {
      // Mock authenticated session
      vi.mocked(supabaseApi.getSession).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' }
      } as any);
      
      // Mock no subscription
      vi.mocked(supabaseApi.getUserSubscription).mockResolvedValue(null);
      
      const TestComponent = () => {
        useRequireProPlan({
          redirectTo: '/custom-pricing',
          showToast: true,
          toastMessage: 'Custom upgrade message'
        });
        return <div>Test</div>;
      };
      
      render(
        <MemoryRouter>
          <TestComponent />
        </MemoryRouter>
      );
      
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Custom upgrade message');
        expect(mockNavigate).toHaveBeenCalledWith('/custom-pricing');
      });
    });

    it('should not show toast when showToast is false', async () => {
      // Mock authenticated session
      vi.mocked(supabaseApi.getSession).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' }
      } as any);
      
      // Mock no subscription
      vi.mocked(supabaseApi.getUserSubscription).mockResolvedValue(null);
      
      const TestComponent = () => {
        useRequireProPlan({
          showToast: false
        });
        return <div>Test</div>;
      };
      
      render(
        <MemoryRouter>
          <TestComponent />
        </MemoryRouter>
      );
      
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/pricing');
        expect(toast.error).not.toHaveBeenCalled();
      });
    });
  });

  describe('Protected Routes Integration', () => {
    const protectedRoutes = [
      '/dashboard',
      '/journal',
      '/moodboard',
      '/insights',
      '/profile'
    ];

    protectedRoutes.forEach(route => {
      it(`should protect ${route} route from non-Pro users`, async () => {
        // Mock authenticated session
        vi.mocked(supabaseApi.getSession).mockResolvedValue({
          user: { id: 'user-123', email: 'test@example.com' }
        } as any);
        
        // Mock inactive subscription
        vi.mocked(supabaseApi.getUserSubscription).mockResolvedValue({
          subscription_status: 'canceled',
          price_id: null,
          cancel_at_period_end: false
        } as any);
        
        const TestComponent = () => (
          <MemoryRouter initialEntries={[route]}>
            <Routes>
              <Route path={route} element={
                <ProOnlyRoute>
                  <div data-testid="protected-content">{route}</div>
                </ProOnlyRoute>
              } />
              <Route path="/pricing" element={<div data-testid="pricing-page">Pricing</div>} />
            </Routes>
          </MemoryRouter>
        );
        
        render(<TestComponent />);
        
        await waitFor(() => {
          expect(mockNavigate).toHaveBeenCalledWith('/pricing');
          expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
        });
      });
    });
  });
});