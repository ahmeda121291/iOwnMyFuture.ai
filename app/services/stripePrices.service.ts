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

class StripePricesService {
  private cache: StripePrices | null = null;
  private cacheTimestamp: number | null = null;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private fetchPromise: Promise<StripePrices> | null = null;

  async fetchPrices(): Promise<StripePrices> {
    // Return cached prices if still valid
    if (this.cache && this.cacheTimestamp && 
        Date.now() - this.cacheTimestamp < this.CACHE_DURATION) {
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
        throw error;
      });

    return this.fetchPromise;
  }

  private async fetchPricesFromAPI(): Promise<StripePrices> {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-prices`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to fetch prices' }));
      throw new Error(errorData.error || `Failed to fetch prices (${response.status})`);
    }

    const data = await response.json();
    
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

export const stripePricesService = new StripePricesService();