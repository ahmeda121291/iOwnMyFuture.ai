import React from 'react';
import { products } from '../stripe-config';
import PricingCard from '../components/Pricing/PricingCard';

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-text-primary mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-text-secondary max-w-2xl mx-auto">
            Select the perfect plan to start your transformation journey with iOwnMyFuture.ai
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {products.map((product, index) => (
            <PricingCard
              key={product.id}
              product={product}
              isPopular={index === 0} // Make the first product popular
            />
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-text-secondary mb-4">
            All plans include a 30-day money-back guarantee
          </p>
          <div className="flex items-center justify-center space-x-8 text-sm text-text-secondary">
            <span>✓ Cancel anytime</span>
            <span>✓ Secure payments</span>
            <span>✓ 24/7 support</span>
          </div>
        </div>
      </div>
    </div>
  );
}