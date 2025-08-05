import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import SubscriptionStatus from './SubscriptionStatus';
import { getUserSubscription, supabase } from '../../lib/supabase';

// Mock dependencies
vi.mock('../../lib/supabase', () => ({
  getUserSubscription: vi.fn(),
  supabase: {
    functions: {
      invoke: vi.fn()
    }
  }
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

describe('SubscriptionStatus', () => {
  const renderSubscriptionStatus = () => {
    return render(
      <BrowserRouter>
        <SubscriptionStatus />
      </BrowserRouter>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading State', () => {
    it('shows loading state initially', () => {
      vi.mocked(getUserSubscription).mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );

      renderSubscriptionStatus();

      expect(screen.getByTestId('subscription-loading')).toBeInTheDocument();
    });
  });

  describe('Free Plan', () => {
    it('renders free plan status correctly', async () => {
      vi.mocked(getUserSubscription).mockResolvedValueOnce(null);

      renderSubscriptionStatus();

      await waitFor(() => {
        expect(screen.getByText('Current Plan')).toBeInTheDocument();
        expect(screen.getByText('Free Plan')).toBeInTheDocument();
        expect(screen.getByText('Basic Features')).toBeInTheDocument();
        expect(screen.getByText('Upgrade to Pro')).toBeInTheDocument();
      });
    });

    it('navigates to pricing when upgrade button is clicked', async () => {
      const user = userEvent.setup();
      vi.mocked(getUserSubscription).mockResolvedValueOnce(null);

      renderSubscriptionStatus();

      await waitFor(() => {
        expect(screen.getByText('Upgrade to Pro')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Upgrade to Pro'));
      expect(mockNavigate).toHaveBeenCalledWith('/pricing');
    });
  });

  describe('Active Subscription', () => {
    it('renders active subscription correctly', async () => {
      const mockSubscription = {
        id: '123',
        user_id: 'user-123',
        stripe_customer_id: 'cus_123',
        stripe_subscription_id: 'sub_123',
        subscription_status: 'active',
        price_id: 'price_123',
        current_period_end: '2024-02-15T00:00:00Z',
        cancel_at_period_end: false,
        created_at: '2024-01-15T00:00:00Z',
        updated_at: '2024-01-15T00:00:00Z'
      };

      vi.mocked(getUserSubscription).mockResolvedValueOnce(mockSubscription);

      renderSubscriptionStatus();

      await waitFor(() => {
        expect(screen.getByText('Current Plan')).toBeInTheDocument();
        expect(screen.getByText('Pro Plan')).toBeInTheDocument();
        expect(screen.getByText('Unlimited Features')).toBeInTheDocument();
        expect(screen.getByText('Renews on Feb 15, 2024')).toBeInTheDocument();
        expect(screen.getByText('Manage Subscription')).toBeInTheDocument();
      });
    });

    it('shows cancelled status when subscription is set to cancel', async () => {
      const mockSubscription = {
        id: '123',
        user_id: 'user-123',
        stripe_customer_id: 'cus_123',
        stripe_subscription_id: 'sub_123',
        subscription_status: 'active',
        price_id: 'price_123',
        current_period_end: '2024-02-15T00:00:00Z',
        cancel_at_period_end: true,
        created_at: '2024-01-15T00:00:00Z',
        updated_at: '2024-01-15T00:00:00Z'
      };

      vi.mocked(getUserSubscription).mockResolvedValueOnce(mockSubscription);

      renderSubscriptionStatus();

      await waitFor(() => {
        expect(screen.getByText('Expires on Feb 15, 2024')).toBeInTheDocument();
      });
    });

    it('handles manage subscription click', async () => {
      const user = userEvent.setup();
      const mockSubscription = {
        id: '123',
        user_id: 'user-123',
        stripe_customer_id: 'cus_123',
        stripe_subscription_id: 'sub_123',
        subscription_status: 'active',
        price_id: 'price_123',
        current_period_end: '2024-02-15T00:00:00Z',
        cancel_at_period_end: false,
        created_at: '2024-01-15T00:00:00Z',
        updated_at: '2024-01-15T00:00:00Z'
      };

      vi.mocked(getUserSubscription).mockResolvedValueOnce(mockSubscription);
      vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
        data: { url: 'https://billing.stripe.com/portal/session' },
        error: null
      });

      // Mock window.location.href
      delete (window as Window).location;
      window.location = { href: '' } as Location;

      renderSubscriptionStatus();

      await waitFor(() => {
        expect(screen.getByText('Manage Subscription')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Manage Subscription'));

      await waitFor(() => {
        expect(vi.mocked(supabase.functions.invoke)).toHaveBeenCalledWith('stripe-portal', {
          body: { returnUrl: expect.stringContaining('/dashboard') }
        });
        expect(window.location.href).toBe('https://billing.stripe.com/portal/session');
      });
    });

    it('shows loading state while redirecting to billing portal', async () => {
      const user = userEvent.setup();
      const mockSubscription = {
        id: '123',
        user_id: 'user-123',
        stripe_customer_id: 'cus_123',
        stripe_subscription_id: 'sub_123',
        subscription_status: 'active',
        price_id: 'price_123',
        current_period_end: '2024-02-15T00:00:00Z',
        cancel_at_period_end: false,
        created_at: '2024-01-15T00:00:00Z',
        updated_at: '2024-01-15T00:00:00Z'
      };

      vi.mocked(getUserSubscription).mockResolvedValueOnce(mockSubscription);
      vi.mocked(supabase.functions.invoke).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          data: { url: 'https://billing.stripe.com/portal/session' },
          error: null
        }), 100))
      );

      renderSubscriptionStatus();

      await waitFor(() => {
        expect(screen.getByText('Manage Subscription')).toBeInTheDocument();
      });

      const manageButton = screen.getByText('Manage Subscription');
      await user.click(manageButton);

      expect(manageButton).toBeDisabled();
      expect(manageButton).toHaveTextContent('Redirecting...');

      await waitFor(() => {
        expect(manageButton).not.toBeDisabled();
      });
    });

    it('handles billing portal error', async () => {
      const user = userEvent.setup();
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      const mockSubscription = {
        id: '123',
        user_id: 'user-123',
        stripe_customer_id: 'cus_123',
        stripe_subscription_id: 'sub_123',
        subscription_status: 'active',
        price_id: 'price_123',
        current_period_end: '2024-02-15T00:00:00Z',
        cancel_at_period_end: false,
        created_at: '2024-01-15T00:00:00Z',
        updated_at: '2024-01-15T00:00:00Z'
      };

      vi.mocked(getUserSubscription).mockResolvedValueOnce(mockSubscription);
      vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
        data: null,
        error: new Error('Portal generation failed')
      });

      renderSubscriptionStatus();

      await waitFor(() => {
        expect(screen.getByText('Manage Subscription')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Manage Subscription'));

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Failed to open billing portal. Please try again.');
      });

      alertSpy.mockRestore();
    });
  });

  describe('Trialing Status', () => {
    it('renders trial status correctly', async () => {
      const mockSubscription = {
        id: '123',
        user_id: 'user-123',
        stripe_customer_id: 'cus_123',
        stripe_subscription_id: 'sub_123',
        subscription_status: 'trialing',
        price_id: 'price_123',
        current_period_end: '2024-01-22T00:00:00Z',
        cancel_at_period_end: false,
        created_at: '2024-01-15T00:00:00Z',
        updated_at: '2024-01-15T00:00:00Z'
      };

      vi.mocked(getUserSubscription).mockResolvedValueOnce(mockSubscription);

      renderSubscriptionStatus();

      await waitFor(() => {
        expect(screen.getByText('Pro Plan (Trial)')).toBeInTheDocument();
        expect(screen.getByText('Trial ends on Jan 22, 2024')).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles error loading subscription data', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(getUserSubscription).mockRejectedValueOnce(new Error('Failed to load'));

      renderSubscriptionStatus();

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error loading subscription:', expect.any(Error));
        // Should show free plan as fallback
        expect(screen.getByText('Free Plan')).toBeInTheDocument();
      });

      consoleErrorSpy.mockRestore();
    });

    it('handles missing stripe customer ID', async () => {
      const user = userEvent.setup();
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      const mockSubscription = {
        id: '123',
        user_id: 'user-123',
        stripe_customer_id: null, // Missing customer ID
        stripe_subscription_id: 'sub_123',
        subscription_status: 'active',
        price_id: 'price_123',
        current_period_end: '2024-02-15T00:00:00Z',
        cancel_at_period_end: false,
        created_at: '2024-01-15T00:00:00Z',
        updated_at: '2024-01-15T00:00:00Z'
      };

      vi.mocked(getUserSubscription).mockResolvedValueOnce(mockSubscription);

      renderSubscriptionStatus();

      await waitFor(() => {
        expect(screen.getByText('Manage Subscription')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Manage Subscription'));

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('No billing information found. Please contact support.');
      });

      alertSpy.mockRestore();
    });

    it('handles invalid subscription status', async () => {
      const mockSubscription = {
        id: '123',
        user_id: 'user-123',
        stripe_customer_id: 'cus_123',
        stripe_subscription_id: 'sub_123',
        subscription_status: 'past_due' as const,
        price_id: 'price_123',
        current_period_end: '2024-02-15T00:00:00Z',
        cancel_at_period_end: false,
        created_at: '2024-01-15T00:00:00Z',
        updated_at: '2024-01-15T00:00:00Z'
      };

      vi.mocked(getUserSubscription).mockResolvedValueOnce(mockSubscription);

      renderSubscriptionStatus();

      await waitFor(() => {
        // Should still show pro plan but not as active
        expect(screen.getByText('Pro Plan')).toBeInTheDocument();
        expect(screen.queryByText('Unlimited Features')).not.toBeInTheDocument();
      });
    });

    it('handles null current period end date', async () => {
      const mockSubscription = {
        id: '123',
        user_id: 'user-123',
        stripe_customer_id: 'cus_123',
        stripe_subscription_id: 'sub_123',
        subscription_status: 'active',
        price_id: 'price_123',
        current_period_end: null,
        cancel_at_period_end: false,
        created_at: '2024-01-15T00:00:00Z',
        updated_at: '2024-01-15T00:00:00Z'
      };

      vi.mocked(getUserSubscription).mockResolvedValueOnce(mockSubscription);

      renderSubscriptionStatus();

      await waitFor(() => {
        expect(screen.getByText('Pro Plan')).toBeInTheDocument();
        // Should not show renewal date
        expect(screen.queryByText(/Renews on/)).not.toBeInTheDocument();
        expect(screen.queryByText(/Expires on/)).not.toBeInTheDocument();
      });
    });

    it('refreshes subscription data when component remounts', async () => {
      const mockSubscription = {
        id: '123',
        user_id: 'user-123',
        stripe_customer_id: 'cus_123',
        stripe_subscription_id: 'sub_123',
        subscription_status: 'active',
        price_id: 'price_123',
        current_period_end: '2024-02-15T00:00:00Z',
        cancel_at_period_end: false,
        created_at: '2024-01-15T00:00:00Z',
        updated_at: '2024-01-15T00:00:00Z'
      };

      vi.mocked(getUserSubscription).mockResolvedValue(mockSubscription);

      const { unmount } = renderSubscriptionStatus();

      await waitFor(() => {
        expect(screen.getByText('Pro Plan')).toBeInTheDocument();
      });

      expect(vi.mocked(getUserSubscription)).toHaveBeenCalledTimes(1);

      unmount();

      renderSubscriptionStatus();

      await waitFor(() => {
        expect(screen.getByText('Pro Plan')).toBeInTheDocument();
      });

      expect(vi.mocked(getUserSubscription)).toHaveBeenCalledTimes(2);
    });
  });
});