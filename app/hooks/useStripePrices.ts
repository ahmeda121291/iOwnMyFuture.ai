import { useState, useEffect } from 'react';
import { stripePricesService, type StripePrices } from '../services/stripePrices.service';

interface UseStripePricesReturn {
  prices: StripePrices | null;
  loading: boolean;
  error: Error | null;
  didFallback: boolean;
  refetch: () => Promise<void>;
  formatPrice: (amount: number, currency?: string) => string;
  getSavings: () => number;
}

// Default fallback prices
const FALLBACK_PRICES: StripePrices = {
  monthly: {
    priceId: 'price_fallback_monthly',
    productId: 'prod_fallback',
    amount: 1800, // $18
    currency: 'usd',
    interval: 'month',
  },
  yearly: {
    priceId: 'price_fallback_yearly',
    productId: 'prod_fallback',
    amount: 18000, // $180 (was showing $216, but $180 is mentioned in requirements)
    currency: 'usd',
    interval: 'year',
  },
};

export function useStripePrices(): UseStripePricesReturn {
  const [prices, setPrices] = useState<StripePrices | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [didFallback, setDidFallback] = useState(false);

  const fetchPrices = async () => {
    setLoading(true);
    setError(null);
    setDidFallback(false);
    try {
      const fetchedPrices = await stripePricesService.fetchPrices();
      setPrices(fetchedPrices);
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error('Failed to fetch prices');
      setError(errorObj);
      console.warn('Error fetching Stripe prices, using fallback values:', err);
      // Use fallback prices when fetch fails
      setPrices(FALLBACK_PRICES);
      setDidFallback(true);
      // Clear the service cache to ensure next attempt fetches fresh
      stripePricesService.clearCache();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrices();
  }, []);

  const formatPrice = (amount: number, currency: string = 'usd') => {
    return stripePricesService.formatPrice(amount, currency);
  };

  const getSavings = () => {
    const currentPrices = prices || FALLBACK_PRICES;
    return stripePricesService.calculateSavings(
      currentPrices.monthly.amount,
      currentPrices.yearly.amount
    );
  };

  return {
    prices: prices || FALLBACK_PRICES, // Always return prices, even if fallback
    loading,
    error,
    didFallback,
    refetch: fetchPrices,
    formatPrice,
    getSavings,
  };
}