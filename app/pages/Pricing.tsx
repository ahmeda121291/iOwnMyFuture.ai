import React, { useState, useEffect } from 'react';
import { Check, Shield, Clock, ArrowRight, Sparkles, Target, Brain, BarChart3, HeadphonesIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser } from '../core/api/supabase';
import toast from 'react-hot-toast';
import { useStripePrices } from '../hooks/useStripePrices';
import Loader from '../shared/components/Loader';
import { handlePlanSelection } from '../shared/utils/navigationHelper';
import { useRequireProPlan } from '../shared/hooks/useRequireProPlan';

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();
  const { hasProPlan } = useRequireProPlan({ skipRedirect: true });
  const { prices, loading: pricesLoading, error: pricesError, formatPrice, getSavings } = useStripePrices();

  // Check user state on mount
  useEffect(() => {
    const checkUser = async () => {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error('Error checking user:', error as Error);
      }
    };
    checkUser();
  }, []);

  // Update page meta tags
  useEffect(() => {
    document.title = 'Pricing - MyFutureSelf.ai | Transform Your Life with AI'
    const metaDescription = document.querySelector('meta[name="description"]')
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Choose the Pro plan that fits your journey. Monthly at $18 or yearly with discount. Unlimited AI vision boards, smart journaling, and progress analytics.')
    } else {
      const meta = document.createElement('meta')
      meta.name = 'description'
      meta.content = 'Choose the Pro plan that fits your journey. Monthly at $18 or yearly with discount. Unlimited AI vision boards, smart journaling, and progress analytics.'
      document.head.appendChild(meta)
    }
  }, []);

  const handleChoosePlan = async (priceId: string) => {
    setLoading(true);
    
    try {
      // Use centralized navigation helper
      await handlePlanSelection(priceId, {
        user,
        hasProPlan,
        navigate
      });
    } catch (error) {
      console.error('[Pricing] Plan selection error:', error);
      // Error handling is done in the helper
    } finally {
      setLoading(false);
    }
  };

  const features = [
    'AI-Powered Vision Boards',
    'Smart Journaling with AI Insights',
    'Goal Tracking & Achievement',
    'Progress Analytics & Reports',
    'Personalized Recommendations',
    'Mobile & Desktop Access',
    'Cloud Sync & Backup',
    '24/7 Customer Support'
  ];

  // Get price IDs from fetched prices
  const monthlyPriceId = prices?.monthly.priceId;
  const yearlyPriceId = prices?.yearly.priceId;
  const monthlyAmount = prices?.monthly.amount || 1800; // Fallback to $18
  const yearlyAmount = prices?.yearly.amount || 21600; // Fallback to $216
  const savings = getSavings();

  // Show loader while fetching prices
  if (pricesLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-[#F5F5FA] to-[#C3B1E1] pt-20 flex items-center justify-center">
        <Loader size="large" />
      </main>
    );
  }

  // Show error if prices failed to load
  if (pricesError) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-[#F5F5FA] to-[#C3B1E1] pt-20">
        <div className="container mx-auto px-6 py-16">
          <div className="text-center">
            <p className="text-xl text-red-600 mb-4">Unable to load pricing information</p>
            <p className="text-gray-700">Please try refreshing the page or contact support.</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#F5F5FA] to-[#C3B1E1] pt-20">
      <div className="container mx-auto px-6 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-6 py-2 bg-white/30 backdrop-blur-sm border border-white/20 rounded-full text-sm font-medium text-gray-800 mb-8">
            <Sparkles className="w-4 h-4 mr-2 text-accent-600" />
            Transform Your Life with AI
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Choose Your
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-accent-600"> Journey</span>
          </h1>
          
          <p className="text-xl text-gray-700 max-w-3xl mx-auto leading-relaxed">
            Unlock the full power of AI-driven personal development. One plan, unlimited possibilities.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center mb-16">
          <div className="flex items-center bg-white/60 backdrop-blur-sm rounded-full p-1 border border-white/30">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-3 rounded-full font-medium transition-all duration-300 ${
                billingCycle === 'monthly'
                  ? 'bg-white text-gray-900 shadow-lg'
                  : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-6 py-3 rounded-full font-medium transition-all duration-300 flex items-center ${
                billingCycle === 'yearly'
                  ? 'bg-white text-gray-900 shadow-lg'
                  : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              Yearly
              {savings > 0 && (
                <span className="ml-2 px-2 py-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs rounded-full">
                  Save {formatPrice(savings)}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Pricing Card */}
        <div className="max-w-md mx-auto">
          <div className="relative bg-gradient-to-br from-white to-[#F5F5FA] rounded-3xl p-8 border border-white/50 shadow-2xl backdrop-blur-sm">
            {/* Best Value Badge for Yearly */}
            {billingCycle === 'yearly' && (
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <div className="bg-gradient-to-r from-accent-500 to-primary-500 text-white px-6 py-2 rounded-full text-sm font-bold flex items-center shadow-lg">
                  <Target className="w-4 h-4 mr-2" />
                  Best Value
                </div>
              </div>
            )}

            <div className="text-center mb-8 mt-4">
              <h3 className="text-3xl font-bold text-gray-900 mb-2">Pro</h3>
              <div className="mb-4">
                <span className="text-6xl font-bold text-gray-900">
                  {formatPrice(billingCycle === 'monthly' ? monthlyAmount : yearlyAmount)}
                </span>
                <span className="text-xl text-gray-600 ml-1">
                  /{billingCycle === 'monthly' ? 'month' : 'year'}
                </span>
              </div>
              {billingCycle === 'yearly' && savings > 0 && (
                <div className="bg-gradient-to-r from-primary-100 to-accent-100 rounded-full px-4 py-2 inline-block mb-4">
                  <span className="text-sm font-medium text-primary-800">
                    Billed annually ({formatPrice(yearlyAmount)}) • Save {formatPrice(savings)}/year
                  </span>
                </div>
              )}
              <p className="text-gray-700">Everything you need to transform your life with AI</p>
            </div>

            {/* Features List */}
            <ul className="space-y-4 mb-8">
              {features.map((feature, idx) => (
                <li key={idx} className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-700 font-medium">{feature}</span>
                </li>
              ))}
            </ul>

            {/* CTA Button */}
            <button
              onClick={() => {
                const priceId = billingCycle === 'yearly' ? yearlyPriceId : monthlyPriceId;
                if (priceId) {
                  handleChoosePlan(priceId);
                } else {
                  toast.error('Pricing information not available. Please refresh the page.');
                }
              }}
              disabled={loading || !monthlyPriceId || !yearlyPriceId}
              className="w-full bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 text-white py-4 rounded-2xl font-semibold text-lg transition-all duration-300 flex items-center justify-center group shadow-2xl hover:shadow-accent-500/25 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  Choose Plan
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Features Showcase */}
        <section className="mt-32">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              Everything You Need to
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-accent-600"> Succeed</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">AI Vision Creation</h4>
              <p className="text-gray-700 text-sm">Transform your dreams into vivid, actionable vision boards</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Target className="w-8 h-8 text-white" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Smart Goal Tracking</h4>
              <p className="text-gray-700 text-sm">AI-powered insights to keep you on track to your goals</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-8 h-8 text-white" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Progress Analytics</h4>
              <p className="text-gray-700 text-sm">Detailed charts and insights into your personal growth</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <HeadphonesIcon className="w-8 h-8 text-white" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Priority Support</h4>
              <p className="text-gray-700 text-sm">Get help when you need it from our expert team</p>
            </div>
          </div>
        </section>

        {/* Guarantee Section */}
        <section className="mt-32 text-center">
          <div className="bg-white/60 backdrop-blur-sm rounded-3xl p-12 border border-white/50 max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row items-center justify-center gap-8 mb-8">
              <div className="flex items-center space-x-3 text-gray-700">
                <Shield className="w-8 h-8 text-green-600" />
                <div className="text-left">
                  <div className="font-semibold">30-Day Money-Back Guarantee</div>
                  <div className="text-sm text-gray-600">Try risk-free with our full refund policy</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 text-gray-700">
                <Clock className="w-8 h-8 text-blue-600" />
                <div className="text-left">
                  <div className="font-semibold">Cancel Anytime</div>
                  <div className="text-sm text-gray-600">No long-term commitments or hidden fees</div>
                </div>
              </div>
            </div>
            
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Your Privacy is Our Priority</h3>
            <p className="text-gray-700 leading-relaxed max-w-2xl mx-auto">
              We use enterprise-grade encryption to protect your personal data. Your dreams, goals, and progress 
              are stored securely and never shared with third parties. Our AI processes your data locally whenever 
              possible to ensure maximum privacy.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
