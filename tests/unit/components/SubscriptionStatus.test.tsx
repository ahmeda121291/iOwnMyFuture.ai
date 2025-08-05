import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import SubscriptionStatus from '@/features/Subscription/SubscriptionStatus';
import { mockSupabaseClient } from '../../fixtures/mocks/supabase';
import { testSubscription, expiredSubscription, testUser, testProUser } from '../../fixtures/testData';

// Mock getCurrentUser
vi.mock('@/lib/supabase', async () => {
  const actual = await vi.importActual('@/lib/supabase');
  return {
    ...actual,
    getCurrentUser: vi.fn(),
  };
});

import { getCurrentUser } from '@/core/api/supabase';

const SubscriptionStatusWrapper = ({ compact = true }: { compact?: boolean }) => (
  <BrowserRouter>
    <SubscriptionStatus compact={compact} />
  </BrowserRouter>
);

describe('SubscriptionStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Free User State', () => {
    beforeEach(() => {
      (getCurrentUser as vi.MockedFunction<typeof getCurrentUser>).mockResolvedValue(testUser);
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' }, // Not found
        }),
      });
    });

    it('displays free plan status in compact mode', async () => {
      render(<SubscriptionStatusWrapper compact={true} />);

      await waitFor(() => {
        expect(screen.getByText('Free Plan')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /upgrade to pro/i })).toBeInTheDocument();
      });
    });

    it('displays detailed free plan info in full mode', async () => {
      render(<SubscriptionStatusWrapper compact={false} />);

      await waitFor(() => {
        expect(screen.getByText('Free Plan')).toBeInTheDocument();
        expect(screen.getByText(/unlimited journal entries/i)).toBeInTheDocument();
        expect(screen.getByText(/basic vision board/i)).toBeInTheDocument();
        expect(screen.getByText(/ai summaries/i)).toBeInTheDocument();
      });
    });

    it('shows upgrade benefits', async () => {
      render(<SubscriptionStatusWrapper compact={false} />);

      await waitFor(() => {
        expect(screen.getByText('Upgrade to unlock:')).toBeInTheDocument();
        expect(screen.getByText(/advanced ai insights/i)).toBeInTheDocument();
        expect(screen.getByText(/unlimited vision boards/i)).toBeInTheDocument();
        expect(screen.getByText(/priority support/i)).toBeInTheDocument();
      });
    });

    it('handles upgrade button click', async () => {
      const user = userEvent.setup();
      mockSupabaseClient.functions.invoke.mockResolvedValue({
        data: { sessionId: 'cs_test_123' },
        error: null,
      });

      render(<SubscriptionStatusWrapper compact={true} />);

      await waitFor(async () => {
        await user.click(screen.getByRole('button', { name: /upgrade to pro/i }));
      });

      expect(mockSupabaseClient.functions.invoke).toHaveBeenCalledWith('create-checkout', {
        body: expect.objectContaining({
          priceId: expect.any(String),
          successUrl: expect.stringContaining('/success'),
          cancelUrl: expect.stringContaining('/profile'),
        }),
      });
    });
  });

  describe('Pro User State', () => {
    beforeEach(() => {
      (getCurrentUser as vi.MockedFunction<typeof getCurrentUser>).mockResolvedValue(testProUser);
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: testSubscription,
          error: null,
        }),
      });
    });

    it('displays pro plan status', async () => {
      render(<SubscriptionStatusWrapper compact={true} />);

      await waitFor(() => {
        expect(screen.getByText('Pro Plan')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /upgrade/i })).not.toBeInTheDocument();
      });
    });

    it('shows renewal date', async () => {
      render(<SubscriptionStatusWrapper compact={false} />);

      await waitFor(() => {
        expect(screen.getByText(/renews on/i)).toBeInTheDocument();
        expect(screen.getByText(/february 1, 2024/i)).toBeInTheDocument();
      });
    });

    it('displays pro features', async () => {
      render(<SubscriptionStatusWrapper compact={false} />);

      await waitFor(() => {
        expect(screen.getByText(/everything in free/i)).toBeInTheDocument();
        expect(screen.getByText(/advanced ai insights/i)).toBeInTheDocument();
        expect(screen.getByText(/unlimited vision boards/i)).toBeInTheDocument();
        expect(screen.getByText(/mood analytics/i)).toBeInTheDocument();
      });
    });

    it('shows manage subscription button', async () => {
      render(<SubscriptionStatusWrapper compact={false} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /manage subscription/i })).toBeInTheDocument();
      });
    });

    it('handles manage subscription click', async () => {
      const user = userEvent.setup();
      mockSupabaseClient.functions.invoke.mockResolvedValue({
        data: { url: 'https://billing.stripe.com/session/123' },
        error: null,
      });

      const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

      render(<SubscriptionStatusWrapper compact={false} />);

      await waitFor(async () => {
        await user.click(screen.getByRole('button', { name: /manage subscription/i }));
      });

      expect(mockSupabaseClient.functions.invoke).toHaveBeenCalledWith('create-portal-session', {
        body: expect.objectContaining({
          returnUrl: expect.stringContaining('/profile'),
        }),
      });

      await waitFor(() => {
        expect(windowOpenSpy).toHaveBeenCalled();
      });

      windowOpenSpy.mockRestore();
    });
  });

  describe('Expired Subscription State', () => {
    beforeEach(() => {
      (getCurrentUser as vi.MockedFunction<typeof getCurrentUser>).mockResolvedValue(testProUser);
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: expiredSubscription,
          error: null,
        }),
      });
    });

    it('displays expired status', async () => {
      render(<SubscriptionStatusWrapper compact={false} />);

      await waitFor(() => {
        expect(screen.getByText(/subscription expired/i)).toBeInTheDocument();
        expect(screen.getByText(/expired on december 1, 2023/i)).toBeInTheDocument();
      });
    });

    it('shows renew button', async () => {
      render(<SubscriptionStatusWrapper compact={false} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /renew subscription/i })).toBeInTheDocument();
      });
    });

    it('handles renewal', async () => {
      const user = userEvent.setup();
      mockSupabaseClient.functions.invoke.mockResolvedValue({
        data: { sessionId: 'cs_test_renewal' },
        error: null,
      });

      render(<SubscriptionStatusWrapper compact={false} />);

      await waitFor(async () => {
        await user.click(screen.getByRole('button', { name: /renew subscription/i }));
      });

      expect(mockSupabaseClient.functions.invoke).toHaveBeenCalledWith('create-checkout', {
        body: expect.any(Object),
      });
    });
  });

  describe('Loading and Error States', () => {
    it('shows loading state', async () => {
      (getCurrentUser as vi.MockedFunction<typeof getCurrentUser>).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 1000))
      );

      render(<SubscriptionStatusWrapper />);

      expect(screen.getByRole('status')).toBeInTheDocument(); // Loader
    });

    it('handles user loading error', async () => {
      (getCurrentUser as vi.MockedFunction<typeof getCurrentUser>).mockRejectedValue(new Error('Failed to load user'));

      render(<SubscriptionStatusWrapper />);

      await waitFor(() => {
        expect(screen.queryByText(/plan/i)).not.toBeInTheDocument();
      });
    });

    it('handles subscription loading error', async () => {
      (getCurrentUser as vi.MockedFunction<typeof getCurrentUser>).mockResolvedValue(testProUser);
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      });

      render(<SubscriptionStatusWrapper />);

      await waitFor(() => {
        // Should fall back to showing as free user
        expect(screen.getByText('Free Plan')).toBeInTheDocument();
      });
    });

    it('handles checkout creation error', async () => {
      const user = userEvent.setup();
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      (getCurrentUser as vi.MockedFunction<typeof getCurrentUser>).mockResolvedValue(testUser);
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      mockSupabaseClient.functions.invoke.mockResolvedValue({
        data: null,
        error: { message: 'Payment service unavailable' },
      });

      render(<SubscriptionStatusWrapper />);

      await waitFor(async () => {
        await user.click(screen.getByRole('button', { name: /upgrade to pro/i }));
      });

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to start checkout'));
      });

      alertSpy.mockRestore();
    });
  });

  describe('Pricing Display', () => {
    beforeEach(() => {
      (getCurrentUser as vi.MockedFunction<typeof getCurrentUser>).mockResolvedValue(testUser);
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      });
    });

    it('shows pricing in upgrade button', async () => {
      render(<SubscriptionStatusWrapper compact={false} />);

      await waitFor(() => {
        expect(screen.getByText(/\$9\/month/i)).toBeInTheDocument();
      });
    });
  });
});