import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, 
  Check, 
  ArrowRight, 
  Shield,
  Zap,
  Brain,
  Target,
  BookOpen,
  TrendingUp,
  Lock
} from 'lucide-react';
import { motion } from 'framer-motion';
import { getCurrentUser, getSession } from '../core/api/supabase';
import { createCheckoutSession } from '../core/api/stripeClient';
import Button from '../shared/components/Button';
import Loader from '../shared/components/Loader';
import toast from 'react-hot-toast';
import { errorTracker } from '../shared/utils/errorTracking';
import { useStripePrices } from '../hooks/useStripePrices';

export default function UpgradePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [checkingSubscription, setCheckingSubscription] = useState(true);
  const [_preselectedPriceId, setPreselectedPriceId] = useState<string | null>(null);
  const { prices, loading: pricesLoading, didFallback, formatPrice, getSavings } = useStripePrices();

  const checkAccess = useCallback(async () => {
    try {
      const session = await getSession();
      
      if (!session) {
        // Not authenticated, redirect to auth
        navigate('/auth');
        return;
      }

      const userData = await getCurrentUser();
      setUser(userData);

      // Check if they already have a subscription
      const { getUserSubscription } = await import('../core/api/supabase');
      const subscription = await getUserSubscription(session.user.id);
      
      if (subscription && 
          subscription.subscription_status === 'active' && 
          subscription.price_id &&
          !subscription.cancel_at_period_end) {
        // Already subscribed, redirect to dashboard
        toast.success('You already have an active Pro subscription!');
        navigate('/dashboard');
        return;
      }
    } catch (_error) {
      // Error checking access
    } finally {
      setCheckingSubscription(false);
    }
  }, [navigate]);

  useEffect(() => {
    checkAccess();
    
    // Check for preselected plan from sessionStorage
    const storedPriceId = sessionStorage.getItem('redirectPriceId');
    if (storedPriceId) {
      setPreselectedPriceId(storedPriceId);
      sessionStorage.removeItem('redirectPriceId');
      
      // Auto-scroll to pricing section after a short delay
      setTimeout(() => {
        const pricingSection = document.getElementById('pricing-plans');
        if (pricingSection) {
          pricingSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 500);
    }
    
    // Check if this is a new user
    const isNewUser = sessionStorage.getItem('isNewUser') === 'true';
    if (isNewUser) {
      sessionStorage.removeItem('isNewUser');
      toast('Welcome! Choose a plan to start your journey 🚀', {
        duration: 5000,
        icon: '✨'
      });
    }
  }, [checkAccess]);

  const handleUpgrade = async (priceId: string) => {
    // Dev logging - Starting checkout with params

    if (!user) {
      toast.error('Please log in to continue');
      navigate('/auth');
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading('Preparing secure checkout...');
    
    try {
      // Get the redirect URL after successful payment
      const redirectAfterUpgrade = sessionStorage.getItem('redirectAfterUpgrade') || '/dashboard';
      
      // Prepare checkout session params
      const checkoutParams = {
        priceId,
        userId: user.id,
        email: user.email,
        successUrl: `${window.location.origin}/success?session_id={CHECKOUT_SESSION_ID}&redirect=${encodeURIComponent(redirectAfterUpgrade)}`,
        cancelUrl: `${window.location.origin}/upgrade`,
        mode: 'subscription' as const
      };

      // Dev logging
      // Creating checkout session

      // Update loading message
      toast.loading('Connecting to payment processor...', { id: loadingToast });

      // Create Stripe checkout session - function handles CSRF and redirects
      await createCheckoutSession(checkoutParams);

      // If we get here, redirect didn't happen
      toast.dismiss(loadingToast);
      toast.success('Redirecting to checkout...');
    } catch (error) {
      // Log full error details
      // Full checkout error
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      // Check for specific error types
      if (errorMessage.includes('CSRF')) {
        // CSRF token error - may need to refresh page
        toast.error('Session expired. Please refresh the page and try again.');
      } else if (errorMessage.includes('Unauthorized') || errorMessage.includes('authenticated')) {
        // Authentication error
        toast.error('Please log in again to continue');
        navigate('/auth');
      } else if (errorMessage.includes('price')) {
        // Price ID error
        toast.error('Invalid pricing plan. Please contact support.');
      } else {
        toast.error(`Failed to start checkout: ${errorMessage}`);
      }

      errorTracker.trackError(error, {
        component: 'Upgrade',
        action: 'handleUpgrade',
        priceId,
        userId: user?.id,
        errorMessage,
        userAgent: navigator.userAgent
      });
      
      toast.dismiss(loadingToast);
      setLoading(false);
    }
  };

  if (checkingSubscription || pricesLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F5F5FA] to-[#C3B1E1] flex items-center justify-center">
        <Loader size="large" />
      </div>
    );
  }

  // Don't show error page if we have fallback prices
  // The pricing will be shown with a warning banner instead

  // Unified features list for both monthly and yearly plans
  const features = [
    { icon: <Brain className="w-5 h-5" />, text: "AI-Powered Vision Boards" },
    { icon: <BookOpen className="w-5 h-5" />, text: "Smart Journaling with AI Insights" },
    { icon: <Target className="w-5 h-5" />, text: "Goal Tracking & Achievement" },
    { icon: <TrendingUp className="w-5 h-5" />, text: "Progress Analytics & Reports" },
    { icon: <Sparkles className="w-5 h-5" />, text: "Personalized Recommendations" },
    { icon: <Shield className="w-5 h-5" />, text: "Mobile & Desktop Access" },
    { icon: <Lock className="w-5 h-5" />, text: "Cloud Sync & Backup" },
    { icon: <Zap className="w-5 h-5" />, text: "24/7 Customer Support" }
  ];

  // Get price IDs and amounts from fetched prices
  const MONTHLY_PRICE_ID = prices?.monthly.priceId || '';
  const YEARLY_PRICE_ID = prices?.yearly.priceId || '';
  const monthlyAmount = prices?.monthly.amount || 1500; // Fallback to $15
  const yearlyAmount = prices?.yearly.amount || 18000; // Fallback to $180
  const savings = getSavings();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F5FA] to-[#C3B1E1]">
      <div className="container mx-auto px-4 py-12">
        {/* Show warning banner if using fallback prices */}
        {didFallback && (
          <div className="max-w-4xl mx-auto mb-8">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  We had trouble fetching live prices. Displaying default values. The actual prices will be confirmed at checkout.
                </p>
              </div>
              <button
                onClick={() => window.location.reload()}
                className="ml-auto flex-shrink-0 text-yellow-500 hover:text-yellow-600"
              >
                <span className="sr-only">Retry</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-primary-500 to-accent-500 rounded-full mb-6">
            <Lock className="w-10 h-10 text-white" />
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Unlock Your Future with Pro
          </h1>
          
          <p className="text-xl text-gray-700 max-w-2xl mx-auto">
            MyFutureSelf is a Pro-only platform designed to help you manifest your dreams and achieve your goals with AI-powered tools.
          </p>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-12">
          {/* Monthly Plan */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl shadow-xl p-8 relative"
          >
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Monthly Pro</h2>
              <div className="flex items-baseline">
                <span className="text-5xl font-bold text-gray-900">{formatPrice(monthlyAmount)}</span>
                <span className="text-gray-600 ml-2">/month</span>
              </div>
              <p className="text-gray-600 mt-2">Perfect for trying out the platform</p>
            </div>

            <ul className="space-y-4 mb-8">
              {features.map((feature, index) => (
                <li key={index} className="flex items-center">
                  <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mr-3">
                    <Check className="w-4 h-4 text-green-600" />
                  </div>
                  <span className="text-gray-700">{feature.text}</span>
                </li>
              ))}
            </ul>

            <Button
              onClick={() => {
                // Monthly plan button clicked
                if (MONTHLY_PRICE_ID) {
                  handleUpgrade(MONTHLY_PRICE_ID);
                } else {
                  toast.error('Pricing information not available. Please refresh the page.');
                }
              }}
              disabled={loading || !MONTHLY_PRICE_ID}
              className="w-full bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 text-white py-3 rounded-lg font-semibold flex items-center justify-center"
            >
              {loading ? (
                <Loader size="small" />
              ) : (
                <>
                  Start Monthly Plan
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>

            <p className="text-center text-sm text-gray-500 mt-4">
              Cancel anytime, no questions asked
            </p>
          </motion.div>

          {/* Annual Plan */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-primary-50 to-accent-50 rounded-2xl shadow-xl p-8 relative border-2 border-primary-500"
          >
            {/* Best Value Badge */}
            {savings > 0 && (
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-gradient-to-r from-primary-500 to-accent-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                  BEST VALUE - Save {formatPrice(savings)}
                </span>
              </div>
            )}

            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Annual Pro</h2>
              <div className="flex items-baseline">
                <span className="text-5xl font-bold text-gray-900">{formatPrice(yearlyAmount)}</span>
                <span className="text-gray-600 ml-2">/year</span>
              </div>
              {savings > 0 && (
                <p className="text-gray-600 mt-2">
                  <span className="line-through text-gray-400">{formatPrice(monthlyAmount * 12)}</span>
                  <span className="text-green-600 font-semibold ml-2">Save {formatPrice(savings)}/year</span>
                </p>
              )}
            </div>

            <ul className="space-y-4 mb-8">
              {features.map((feature, index) => (
                <li key={index} className="flex items-center">
                  <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mr-3">
                    <Check className="w-4 h-4 text-green-600" />
                  </div>
                  <span className="text-gray-700 font-medium">{feature.text}</span>
                </li>
              ))}
            </ul>

            <Button
              onClick={() => {
                // Annual plan button clicked
                if (YEARLY_PRICE_ID) {
                  handleUpgrade(YEARLY_PRICE_ID);
                } else {
                  toast.error('Pricing information not available. Please refresh the page.');
                }
              }}
              disabled={loading || !YEARLY_PRICE_ID}
              className="w-full bg-gradient-to-r from-primary-600 to-accent-600 hover:from-primary-700 hover:to-accent-700 text-white py-3 rounded-lg font-semibold flex items-center justify-center shadow-lg"
            >
              {loading ? (
                <Loader size="small" />
              ) : (
                <>
                  Get Annual Plan
                  <Zap className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>

            <p className="text-center text-sm text-gray-600 mt-4 font-medium">
              30-day money-back guarantee
            </p>
          </motion.div>
        </div>

        {/* Trust Indicators */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center"
        >
          <div className="flex items-center justify-center space-x-8 mb-8">
            <div className="flex items-center space-x-2 text-gray-600">
              <Shield className="w-5 h-5" />
              <span>Secure Payment</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-600">
              <Lock className="w-5 h-5" />
              <span>SSL Encrypted</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-600">
              <Check className="w-5 h-5" />
              <span>Instant Access</span>
            </div>
          </div>

          <p className="text-sm text-gray-500">
            Questions? Email us at support@iownmyfuture.ai
          </p>

          {/* Skip for now option */}
          {user && (
            <button
              onClick={() => {
                // Clear any stored plan selection or redirect flags
                sessionStorage.removeItem('redirectPriceId');
                sessionStorage.removeItem('redirectPath');
                sessionStorage.removeItem('isNewUser');
                sessionStorage.removeItem('redirectAfterUpgrade');
                navigate('/');
              }}
              className="mt-4 text-gray-500 hover:text-gray-700 underline text-sm"
            >
              Maybe later
            </button>
          )}
        </motion.div>
      </div>
    </div>
  );
}