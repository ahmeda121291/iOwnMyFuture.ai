import { supabase } from '../core/api/supabase';

export interface StripePrice {
  priceId: string;
  productId: string;
  amount: number;
  currency: string;
  interval: 'month' | 'year';
}

export interface StripePrices {
  monthly: StripePrice;
  yearly: StripePrice;
}

class StripePricesServiceV2 {
  private cache: StripePrices | null = null;
  private cacheTimestamp: number | null = null;
  private readonly cacheDuration = 5 * 60 * 1000; // 5 minutes
  private fetchPromise: Promise<StripePrices> | null = null;

  async fetchPrices(): Promise<StripePrices> {
    // Return cached prices if still valid
    if (this.cache && this.cacheTimestamp && 
        Date.now() - this.cacheTimestamp < this.cacheDuration) {
      return this.cache;
    }

    // If already fetching, return the existing promise to avoid duplicate requests
    if (this.fetchPromise) {
      return this.fetchPromise;
    }

    // Start new fetch
    this.fetchPromise = this.fetchPricesFromAPI()
      .then(prices => {
        this.cache = prices;
        this.cacheTimestamp = Date.now();
        this.fetchPromise = null;
        return prices;
      })
      .catch(error => {
        this.fetchPromise = null;
        // Clear cache on error so next attempt will retry
        this.clearCache();
        throw error;
      });

    return this.fetchPromise;
  }

  private async fetchPricesFromAPI(): Promise<StripePrices> {
    try {
      // Use Supabase client to call the function
      // This handles CORS and authentication automatically
      const { data, error } = await supabase.functions.invoke('stripe-prices', {
        method: 'GET',
      });

      if (error) {
        console.error('Error fetching prices from Supabase function:', error);
        throw new Error(error.message || 'Failed to fetch prices');
      }

      if (!data) {
        throw new Error('No data returned from stripe-prices function');
      }

      // Validate the response structure
      if (!data.monthly || !data.yearly) {
        throw new Error('Invalid price data received from server');
      }

      return {
        monthly: {
          priceId: data.monthly.priceId,
          productId: data.monthly.productId,
          amount: data.monthly.amount,
          currency: data.monthly.currency,
          interval: data.monthly.interval as 'month',
        },
        yearly: {
          priceId: data.yearly.priceId,
          productId: data.yearly.productId,
          amount: data.yearly.amount,
          currency: data.yearly.currency,
          interval: data.yearly.interval as 'year',
        },
      };
    } catch (error) {
      console.error('Failed to fetch prices:', error);
      throw error instanceof Error ? error : new Error('Failed to fetch prices');
    }
  }

  clearCache(): void {
    this.cache = null;
    this.cacheTimestamp = null;
  }

  // Helper methods for formatting prices
  formatPrice(amount: number, currency: string = 'usd'): string {
    // Stripe amounts are in cents
    const dollars = amount / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(dollars);
  }

  calculateSavings(monthlyAmount: number, yearlyAmount: number): number {
    // Calculate annual savings
    const yearlyFromMonthly = monthlyAmount * 12;
    return yearlyFromMonthly - yearlyAmount;
  }
}

export const stripePricesServiceV2 = new StripePricesServiceV2();