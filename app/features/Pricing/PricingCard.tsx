import React, { useState, useMemo } from 'react';
import { Check, Zap } from 'lucide-react';
import { type Product } from '../../core/api/stripeConfig';
import { createCheckoutSession } from '../../core/api/stripeClient';
import Button from '../../shared/components/Button';
import toast from 'react-hot-toast';
import { errorTracker } from '../../shared/utils/errorTracking';
import { getCurrentUser } from '../../core/api/supabase';

interface PricingCardProps {
  product: Product;
  isPopular?: boolean;
  billingInfo?: string;
  savings?: string;
}

const PricingCard = React.memo(function PricingCard({ product, isPopular = false, billingInfo, savings }: PricingCardProps) {
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    setLoading(true);
    toast.loading('Preparing checkout...');
    
    try {
      // Get current user for the checkout session
      const user = await getCurrentUser();
      if (!user) {
        toast.dismiss();
        toast.error('Please log in to subscribe');
        window.location.href = '/auth';
        return;
      }
      
      // Create checkout session via Edge Function
      const { url, sessionId } = await createCheckoutSession({
        priceId: product.priceId,
        mode: product.mode || 'subscription',
        userId: user.id,
        email: user.email,
        successUrl: `${window.location.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${window.location.origin}/pricing`
      });
      
      if (url) {
        // Store session for verification
        sessionStorage.setItem('checkoutSessionId', sessionId);
        toast.dismiss();
        // Redirect immediately to Stripe Checkout
        window.location.href = url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      errorTracker.trackError(error, {
        component: 'PricingCard',
        action: 'handleSubscribe',
        productId: product.priceId
      });
      toast.dismiss();
      toast.error(error instanceof Error ? error.message : 'Failed to start checkout');
    } finally {
      setLoading(false);
    }
  };

  // Memoize static features array and price formatting
  const features = useMemo(() => [
    'AI-Powered Vision Boards',
    'Smart Journaling with AI Summaries',
    'Progress Analytics & Insights',
    'Goal Tracking & Reminders',
    'Personalized Recommendations',
    'Mobile & Desktop Access',
    'Cloud Sync & Backup',
    '24/7 Customer Support'
  ], []);

  const formattedPrice = useMemo(() => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(product.price);
  }, [product.price]);

  return (
    <div className={`card relative ${isPopular ? 'ring-2 ring-accent transform scale-105' : ''}`}>
      {isPopular && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <span className="bg-accent text-white px-4 py-1 rounded-full text-sm font-medium">
            Most Popular
          </span>
        </div>
      )}

      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-text-primary mb-2">{product.name}</h3>
        <p className="text-text-secondary mb-4">{product.description}</p>
        
        <div className="mb-4">
          <span className="text-4xl font-bold text-accent">{formattedPrice}</span>
          <span className="text-text-secondary ml-1">
            {billingInfo ? `/${billingInfo}` : (product.mode === 'subscription' ? '/month' : ' one-time')}
          </span>
        </div>

        {savings && (
          <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium inline-block mb-4">
            {savings}
          </div>
        )}
      </div>

      <ul className="space-y-3 mb-8">
        {features.map((feature, index) => (
          <li key={index} className="flex items-center">
            <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
            <span className="text-text-secondary">{feature}</span>
          </li>
        ))}
      </ul>

      <Button
        onClick={handleSubscribe}
        loading={loading}
        className="w-full"
        variant={isPopular ? 'primary' : 'secondary'}
      >
        <Zap className="w-4 h-4 mr-2" />
        {product.mode === 'subscription' ? 'Start Subscription' : 'Buy Now'}
      </Button>
    </div>
  );
})

export default PricingCard