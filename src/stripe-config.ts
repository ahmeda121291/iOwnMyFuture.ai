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
    id: 'prod_SlmIZrU6E29IYr',
    priceId: 'price_1RqEjnEwnX1Z4pWbM32uVqWK',
    name: 'iOwnMyFutureAI',
    description: 'Essential AI-powered vision board and journaling platform to help you achieve your goals.',
    price: 18.00,
    mode: 'subscription'
  },
  {
    id: 'prod_SlmIrtY1LuVNsA',
    priceId: 'price_1RqEk8EwnX1Z4pWbxLPMDaGk',
    name: 'iOwnMyFutureAI',
    description: 'Premium AI-powered vision board and journaling platform to transform your dreams into reality.',
    price: 180.00,
    mode: 'subscription'
  }
];

export const getProductByPriceId = (priceId: string): Product | undefined => {
  return products.find(product => product.priceId === priceId);
};