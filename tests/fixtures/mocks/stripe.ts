import { vi } from 'vitest';

export const mockStripe = {
  redirectToCheckout: vi.fn().mockResolvedValue({ error: null }),
  createPaymentMethod: vi.fn().mockResolvedValue({
    paymentMethod: { id: 'pm_test_123' },
    error: null,
  }),
};

export const mockLoadStripe = vi.fn().mockResolvedValue(mockStripe);

// Mock the Stripe module
vi.mock('@stripe/stripe-js', () => ({
  loadStripe: mockLoadStripe,
}));

// Helper to set up different Stripe states
export const setupStripeState = (state: 'success' | 'error' | 'cancelled') => {
  switch (state) {
    case 'success':
      mockStripe.redirectToCheckout.mockResolvedValue({ error: null });
      break;
    case 'error':
      mockStripe.redirectToCheckout.mockResolvedValue({
        error: { type: 'card_error', message: 'Payment failed' },
      });
      break;
    case 'cancelled':
      mockStripe.redirectToCheckout.mockResolvedValue({
        error: { type: 'cancelled', message: 'Payment cancelled' },
      });
      break;
  }
};