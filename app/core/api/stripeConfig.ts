export interface Product {
  id: string;
  priceId: string;
  name: string;
  description: string;
  price: number;
  mode: 'subscription' | 'payment';
}

export const products: Product[] = [
  {
    id: 'prod_monthly',
    priceId: 'price_1QS0uQRqrkWBY7xJQnRLMhvL', // Monthly Pro - $18/month
    name: 'MyFutureSelf Pro Monthly',
    description: 'Essential AI-powered vision board and journaling platform to help you achieve your goals.',
    price: 18.00,
    mode: 'subscription'
  },
  {
    id: 'prod_annual',
    priceId: 'price_1QS0vnRqrkWBY7xJP77VQkUP', // Annual Pro - $180/year
    name: 'MyFutureSelf Pro Annual',
    description: 'Premium AI-powered vision board and journaling platform to transform your dreams into reality.',
    price: 180.00,
    mode: 'subscription'
  }
];

export const getProductByPriceId = (priceId: string): Product | undefined => {
  return products.find(product => product.priceId === priceId);
};