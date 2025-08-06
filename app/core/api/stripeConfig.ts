export interface Product {
  id: string;
  productId: string; // Stripe Product ID
  priceId: string;   // Stripe Price ID
  name: string;
  description: string;
  price: number;
  mode: 'subscription' | 'payment';
}

// NOTE: These price IDs need to be retrieved from Stripe API
// Using product IDs: prod_SlmIZrU6E29IYr (monthly), prod_SlmIrtY1LuVNsA (yearly)
export const products: Product[] = [
  {
    id: 'pro_monthly',
    productId: 'prod_SlmIZrU6E29IYr',
    priceId: 'price_1QS0uQRqrkWBY7xJQnRLMhvL', // TODO: Update with actual price ID from Stripe
    name: 'MyFutureSelf Pro Monthly',
    description: 'Essential AI-powered vision board and journaling platform to help you achieve your goals.',
    price: 15.00, // $15/month as per requirements
    mode: 'subscription'
  },
  {
    id: 'pro_annual',
    productId: 'prod_SlmIrtY1LuVNsA',
    priceId: 'price_1QS0vnRqrkWBY7xJP77VQkUP', // TODO: Update with actual price ID from Stripe
    name: 'MyFutureSelf Pro Annual',
    description: 'Premium AI-powered vision board and journaling platform to transform your dreams into reality.',
    price: 180.00, // $180/year (saves $36)
    mode: 'subscription'
  }
];

export const getProductByPriceId = (priceId: string): Product | undefined => {
  return products.find(product => product.priceId === priceId);
};