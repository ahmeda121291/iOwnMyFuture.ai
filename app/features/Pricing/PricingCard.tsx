import React, { useState, useMemo } from 'react';
import { Zap, Brain, BookOpen, Target, TrendingUp, Sparkles, Shield, Cloud, HeadphonesIcon } from 'lucide-react';
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
    const loadingToast = toast.loading('Preparing checkout...');
    
    try {
      // Get current user for the checkout session
      const user = await getCurrentUser();
      if (!user) {
        toast.dismiss(loadingToast);
        toast.error('Please log in to subscribe');
        window.location.href = '/auth';
        return;
      }
      
      // Always log for debugging payment issues
      console.log('[PricingCard] Starting checkout for:', {
        priceId: product.priceId,
        productId: product.productId,
        userId: user.id,
        mode: product.mode,
        price: product.price
      });
      
      // Create checkout session via Edge Function
      const response = await createCheckoutSession({
        priceId: product.priceId,
        mode: product.mode || 'subscription',
        userId: user.id,
        email: user.email,
        successUrl: `${window.location.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${window.location.origin}/pricing`
      });
      
      // Validate response
      if (!response || typeof response !== 'object') {
        throw new Error('Invalid response from checkout service');
      }
      
      const { url, sessionId } = response;
      
      if (!url) {
        throw new Error('No checkout URL received from Stripe');
      }
      
      if (!sessionId) {
        throw new Error('No session ID received from Stripe');
      }
      
      // Store session for verification
      sessionStorage.setItem('checkoutSessionId', sessionId);
      toast.dismiss(loadingToast);
      
      // Dev logging
      if (import.meta.env.MODE !== 'production') {
        console.log('[PricingCard] Redirecting to checkout:', url);
      }
      
      // Redirect immediately to Stripe Checkout
      window.location.href = url;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      if (import.meta.env.MODE !== 'production') {
        console.error('[PricingCard] Checkout error:', error);
      }
      
      errorTracker.trackError(error, {
        component: 'PricingCard',
        action: 'handleSubscribe',
        productId: product.priceId,
        errorMessage
      });
      
      toast.dismiss(loadingToast);
      toast.error(`Failed to start checkout: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // Unified features array with icons shared across all pricing displays
  const features = useMemo(() => [
    { icon: Brain, text: 'AI-Powered Vision Boards' },
    { icon: BookOpen, text: 'Smart Journaling with AI Insights' },
    { icon: Target, text: 'Goal Tracking & Achievement' },
    { icon: TrendingUp, text: 'Progress Analytics & Reports' },
    { icon: Sparkles, text: 'Personalized Recommendations' },
    { icon: Shield, text: 'Mobile & Desktop Access' },
    { icon: Cloud, text: 'Cloud Sync & Backup' },
    { icon: HeadphonesIcon, text: '24/7 Customer Support' }
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
        {features.map((feature, index) => {
          const IconComponent = feature.icon;
          return (
            <li key={index} className="flex items-center">
              <IconComponent className="w-5 h-5 text-accent mr-3 flex-shrink-0" />
              <span className="text-text-secondary">{feature.text}</span>
            </li>
          );
        })}
      </ul>

      <Button
        onClick={handleSubscribe}
        loading={loading}
        fullWidth
        variant={isPopular ? 'gradient' : 'primary'}
        size="lg"
        icon={<Zap className="w-4 h-4" />}
        iconPosition="left"
      >
        {product.mode === 'subscription' ? 'Start Subscription' : 'Buy Now'}
      </Button>
    </div>
  );
})

export default PricingCard