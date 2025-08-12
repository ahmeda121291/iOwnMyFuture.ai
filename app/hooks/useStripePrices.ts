import { useState, useEffect } from 'react';
import { stripePricesService, type StripePrices } from '../services/stripePrices.service';

interface UseStripePricesReturn {
  prices: StripePrices | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  formatPrice: (amount: number, currency?: string) => string;
  getSavings: () => number;
}

export function useStripePrices(): UseStripePricesReturn {
  const [prices, setPrices] = useState<StripePrices | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPrices = async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchedPrices = await stripePricesService.fetchPrices();
      setPrices(fetchedPrices);
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error('Failed to fetch prices');
      setError(errorObj);
      console.error('Error fetching Stripe prices:', err);
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
    if (!prices) {
      return 0;
    }
    return stripePricesService.calculateSavings(
      prices.monthly.amount,
      prices.yearly.amount
    );
  };

  return {
    prices,
    loading,
    error,
    refetch: fetchPrices,
    formatPrice,
    getSavings,
  };
}