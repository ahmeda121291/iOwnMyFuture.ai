import { describe, it, expect, vi, beforeEach } from 'vitest';
import { stripePricesService } from '../app/services/stripePrices.service';
import { stripePricesServiceV2 } from '../app/services/stripePrices.service.v2';

// Mock fetch globally
global.fetch = vi.fn();

// Mock supabase
vi.mock('../app/core/api/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
    functions: {
      invoke: vi.fn().mockResolvedValue({
        data: {
          monthly: {
            priceId: 'price_monthly',
            productId: 'prod_monthly',
            amount: 1800,
            currency: 'usd',
            interval: 'month'
          },
          yearly: {
            priceId: 'price_yearly',
            productId: 'prod_yearly',
            amount: 18000,
            currency: 'usd',
            interval: 'year'
          }
        },
        error: null
      })
    }
  }
}));

describe('CORS Fixes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear service cache
    stripePricesService.clearCache();
    stripePricesServiceV2.clearCache();
  });

  describe('stripePricesService', () => {
    it('should use credentials: omit for fetch calls', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          monthly: {
            priceId: 'price_monthly',
            productId: 'prod_monthly',
            amount: 1800,
            currency: 'usd',
            interval: 'month'
          },
          yearly: {
            priceId: 'price_yearly',
            productId: 'prod_yearly',
            amount: 18000,
            currency: 'usd',
            interval: 'year'
          }
        })
      };

      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse as Response);

      await stripePricesService.fetchPrices();

      // Verify fetch was called with credentials: 'omit'
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/functions/v1/stripe-prices'),
        expect.objectContaining({
          method: 'GET',
          mode: 'cors',
          credentials: 'omit', // This is the key fix
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      );
    });

    it('should not include Authorization header', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          monthly: { priceId: 'price_1', productId: 'prod_1', amount: 1800, currency: 'usd', interval: 'month' },
          yearly: { priceId: 'price_2', productId: 'prod_2', amount: 18000, currency: 'usd', interval: 'year' }
        })
      };

      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse as Response);

      await stripePricesService.fetchPrices();

      const fetchCall = vi.mocked(global.fetch).mock.calls[0];
      const headers = fetchCall[1]?.headers as Record<string, string>;
      
      // Should NOT have Authorization header for public endpoint
      expect(headers.Authorization).toBeUndefined();
    });

    it('should handle errors gracefully and clear cache', async () => {
      vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Network error'));

      await expect(stripePricesService.fetchPrices()).rejects.toThrow('Network error');
      
      // Cache should be cleared after error
      expect(stripePricesService['cache']).toBeNull();
    });
  });

  describe('stripePricesServiceV2 (using Supabase client)', () => {
    it('should use supabase.functions.invoke instead of fetch', async () => {
      const prices = await stripePricesServiceV2.fetchPrices();

      // Should not use fetch at all
      expect(global.fetch).not.toHaveBeenCalled();
      
      // Should return correct structure
      expect(prices).toHaveProperty('monthly');
      expect(prices).toHaveProperty('yearly');
      expect(prices.monthly.amount).toBe(1800);
      expect(prices.yearly.amount).toBe(18000);
    });

    it('should handle Supabase function errors', async () => {
      const { supabase } = await import('../app/core/api/supabase');
      vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
        data: null,
        error: { message: 'Function error' }
      } as any);

      await expect(stripePricesServiceV2.fetchPrices()).rejects.toThrow('Function error');
    });
  });

  describe('Price formatting', () => {
    it('should format prices correctly', () => {
      expect(stripePricesService.formatPrice(1800)).toBe('$18');
      expect(stripePricesService.formatPrice(18000)).toBe('$180');
      expect(stripePricesService.formatPrice(1500, 'eur')).toBe('€15');
    });

    it('should calculate savings correctly', () => {
      const monthlyAmount = 1800; // $18/month
      const yearlyAmount = 18000; // $180/year
      const savings = stripePricesService.calculateSavings(monthlyAmount, yearlyAmount);
      
      // Monthly * 12 = $216, Yearly = $180, Savings = $36
      expect(savings).toBe(3600); // $36 in cents
    });
  });
});

describe('Auth Session Timing', () => {
  it('should not log "Auth session missing!" for unauthenticated users', async () => {
    const consoleSpy = vi.spyOn(console, 'warn');
    const { getCurrentUser } = await import('../app/core/api/supabase');
    
    // Mock no session
    const { supabase } = await import('../app/core/api/supabase');
    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
      data: { session: null },
      error: null
    } as any);

    const user = await getCurrentUser();
    
    expect(user).toBeNull();
    // Should not log auth session missing warning
    expect(consoleSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('Auth session missing!')
    );
    
    consoleSpy.mockRestore();
  });
});