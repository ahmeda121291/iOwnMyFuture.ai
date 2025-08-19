import { stripePricesService } from '../../services/stripePrices.service';

export interface Product {
  id: string;
  productId: string; // Stripe Product ID
  priceId: string;   // Stripe Price ID
  name: string;
  description: string;
  price: number;
  mode: 'subscription' | 'payment';
}

// Product IDs from Stripe Dashboard (these are stable and don't change)
export const PRODUCT_IDS = {
  MONTHLY: 'prod_SlmIZrU6E29IYr',
  YEARLY: 'prod_SlmIrtY1LuVNsA'
} as const;

// This function dynamically creates the products array from fetched prices
export const getProducts = async (): Promise<Product[]> => {
  try {
    const prices = await stripePricesService.fetchPrices();
    
    return [
      {
        id: 'pro_monthly',
        productId: prices.monthly.productId,
        priceId: prices.monthly.priceId,
        name: 'I Own My Future Pro Monthly',
        description: 'Essential AI-powered vision board and journaling platform to help you achieve your goals.',
        price: prices.monthly.amount / 100, // Convert from cents to dollars
        mode: 'subscription'
      },
      {
        id: 'pro_annual',
        productId: prices.yearly.productId,
        priceId: prices.yearly.priceId,
        name: 'I Own My Future Pro Annual',
        description: 'Premium AI-powered vision board and journaling platform to transform your dreams into reality.',
        price: prices.yearly.amount / 100, // Convert from cents to dollars
        mode: 'subscription'
      }
    ];
  } catch (error) {
    console.error('Failed to fetch products:', error);
    // Return empty array if fetch fails - let the UI handle the error
    return [];
  }
};

export const getProductByPriceId = async (priceId: string): Promise<Product | undefined> => {
  const products = await getProducts();
  return products.find(product => product.priceId === priceId);
};