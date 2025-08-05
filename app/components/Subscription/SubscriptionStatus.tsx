import React, { useState, useEffect } from 'react';
import { 
  Crown, 
  Calendar, 
  CreditCard, 
  AlertCircle, 
  CheckCircle, 
  Settings,
  ExternalLink,
  Sparkles,
  Zap
} from 'lucide-react';
import { getUserSubscription, supabase } from '../../lib/supabase';
import { getProductByPriceId } from '../../lib/stripeConfig';
import Button from '../Shared/Button';
import Modal from '../Shared/Modal';
import Loader from '../Shared/Loader';

interface Subscription {
  id: string;
  subscription_status: 'active' | 'canceled' | 'past_due' | 'incomplete' | 'not_started';
  current_period_start: string;
  current_period_end: string;
  price_id: string;
  quantity: number;
  cancel_at_period_end: boolean;
}

interface SubscriptionStatusProps {
  userId?: string;
  compact?: boolean;
}

export default function SubscriptionStatus({ userId, compact = false }: SubscriptionStatusProps) {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showManageModal, setShowManageModal] = useState(false);

  useEffect(() => {
    loadSubscription();
  }, [userId]);

  const loadSubscription = async () => {
    try {
      const data = await getUserSubscription();
      setSubscription(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-100';
      case 'canceled':
        return 'text-orange-600 bg-orange-100';
      case 'past_due':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4" />;
      case 'canceled':
        return <AlertCircle className="w-4 h-4" />;
      case 'past_due':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleManageSubscription = async () => {
    try {
      setLoading(true);
      
      const { data: result, error } = await supabase.functions.invoke('stripe-portal', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (error) {
        throw error;
      }

      if (result?.url) {
        window.location.href = result.url;
      } else {
        throw new Error('No billing portal URL received');
      }
    } catch (error: unknown) {
      console.error('Error opening billing portal:', error);
      alert(
        `Failed to open billing portal: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = () => {
    // Navigate to pricing page
    window.location.href = '/pricing';
  };

  const getPlanDetails = () => {
    if (!subscription?.price_id) {
      return { name: 'Unknown Plan', amount: 0, cycle: 'month' };
    }
    
    const product = getProductByPriceId(subscription.price_id);
    if (!product) {
      return { name: 'Unknown Plan', amount: 0, cycle: 'month' };
    }
    
    const cycle = product.price === 180 ? 'year' : 'month';
    return { name: product.name, amount: product.price, cycle };
  };

  if (loading) {
    return (
      <div className={`${compact ? 'p-4' : 'p-6'} bg-white rounded-lg border border-gray-200 animate-pulse`}>
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${compact ? 'p-4' : 'p-6'} bg-white rounded-lg border border-gray-200`}>
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-600 text-sm">Failed to load subscription status</p>
        </div>
      </div>
    );
  }

  // Free user (no subscription)
  if (!subscription || subscription.subscription_status === 'not_started') {
    return (
      <div className={`${compact ? 'p-4' : 'p-6'} bg-gradient-to-br from-primary/5 to-accent/5 rounded-lg border border-primary/20`}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center mb-2">
              <Sparkles className="w-5 h-5 text-accent mr-2" />
              <h3 className="font-semibold text-text-primary">Free Plan</h3>
            </div>
            
            {!compact && (
              <>
                <p className="text-text-secondary text-sm mb-4">
                  You're currently using the free plan with limited features.
                </p>
                
                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    <span className="text-text-secondary">1 Vision Board</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    <span className="text-text-secondary">Basic Journaling</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    <span className="text-text-secondary">Limited AI Features</span>
                  </div>
                </div>
              </>
            )}
          </div>
          
          <Button
            onClick={handleUpgrade}
            size={compact ? "sm" : "md"}
            className="ml-4"
          >
            <Crown className="w-4 h-4 mr-1" />
            Upgrade
          </Button>
        </div>
      </div>
    );
  }

  // Paid subscription
  const planDetails = getPlanDetails();

  return (
    <>
      <div className={`${compact ? 'p-4' : 'p-6'} bg-white rounded-lg border border-gray-200 shadow-sm`}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center mb-2">
              <Crown className="w-5 h-5 text-accent mr-2" />
              <h3 className="font-semibold text-text-primary">{planDetails.name}</h3>
              <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium flex items-center ${getStatusColor(subscription.subscription_status)}`}>
                {getStatusIcon(subscription.subscription_status)}
                <span className="ml-1 capitalize">{subscription.subscription_status}</span>
              </span>
            </div>

            {!compact && (
              <>
                <div className="space-y-2 mb-4 text-sm text-text-secondary">
                  <div className="flex items-center">
                    <CreditCard className="w-4 h-4 mr-2" />
                    <span>${planDetails.amount}/{planDetails.cycle}</span>
                  </div>
                  
                  {subscription.current_period_end && (
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2" />
                      <span>
                        {subscription.cancel_at_period_end 
                          ? `Cancels on ${formatDate(subscription.current_period_end)}`
                          : `Renews on ${formatDate(subscription.current_period_end)}`
                        }
                      </span>
                    </div>
                  )}
                </div>

                {subscription.cancel_at_period_end && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
                    <div className="flex items-center">
                      <AlertCircle className="w-4 h-4 text-orange-600 mr-2" />
                      <span className="text-sm text-orange-800">
                        Your subscription will end on {formatDate(subscription.current_period_end)}
                      </span>
                    </div>
                  </div>
                )}

                {subscription.subscription_status === 'past_due' && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                    <div className="flex items-center">
                      <AlertCircle className="w-4 h-4 text-red-600 mr-2" />
                      <span className="text-sm text-red-800">
                        Payment failed. Please update your payment method.
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex space-x-2 ml-4">
            {!compact && planDetails.cycle === 'month' && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleUpgrade}
              >
                <Zap className="w-4 h-4 mr-1" />
                Upgrade to Yearly
              </Button>
            )}
            
            <Button
              variant="secondary"
              size={compact ? "sm" : "md"}
              onClick={() => setShowManageModal(true)}
            >
              <Settings className="w-4 h-4 mr-1" />
              Manage
            </Button>
          </div>
        </div>
      </div>

      {/* Manage Subscription Modal */}
      <Modal
        isOpen={showManageModal}
        onClose={() => setShowManageModal(false)}
        title="Manage Subscription"
      >
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-text-primary mb-2">Current Plan</h4>
            <p className="text-text-secondary text-sm mb-3">
              {planDetails.name} - ${planDetails.amount}/{planDetails.cycle}
            </p>
            {subscription.current_period_end && (
              <p className="text-text-secondary text-sm">
                Next billing: {formatDate(subscription.current_period_end)}
              </p>
            )}
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleManageSubscription}
              className="w-full justify-center"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open Billing Portal
            </Button>

            {planDetails.cycle === 'month' && (
              <Button
                variant="secondary"
                onClick={handleUpgrade}
                className="w-full justify-center"
              >
                <Zap className="w-4 h-4 mr-2" />
                Switch to Yearly (Save 17%)
              </Button>
            )}
          </div>

          <div className="text-center pt-4 border-t border-gray-200">
            <p className="text-text-secondary text-sm">
              Need help? Contact <a href="mailto:support@iownmyfuture.ai" className="text-accent hover:underline">support@iownmyfuture.ai</a>
            </p>
          </div>
        </div>
      </Modal>
    </>
  );
}