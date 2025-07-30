import React, { useState, useEffect } from 'react';
import { Crown, Calendar, CreditCard } from 'lucide-react';
import { getUserSubscription } from '../../lib/supabase';
import { getProductByPriceId } from '../../lib/stripeConfig';
import Loader from '../Shared/Loader';

export default function SubscriptionStatus() {
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadSubscription();
  }, []);

  const loadSubscription = async () => {
    try {
      const data = await getUserSubscription();
      setSubscription(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="card">
        <div className="flex items-center justify-center py-8">
          <Loader />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="text-center py-8">
          <p className="text-red-600">Failed to load subscription status</p>
        </div>
      </div>
    );
  }

  if (!subscription || subscription.subscription_status === 'not_started') {
    return (
      <div className="card">
        <div className="text-center py-8">
          <Crown className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-text-primary mb-2">No Active Subscription</h3>
          <p className="text-text-secondary">Upgrade to unlock all features</p>
        </div>
      </div>
    );
  }

  const product = getProductByPriceId(subscription.price_id);
  const isActive = ['active', 'trialing'].includes(subscription.subscription_status);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-600';
      case 'trialing':
        return 'text-blue-600';
      case 'past_due':
        return 'text-yellow-600';
      case 'canceled':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'trialing':
        return 'Trial';
      case 'past_due':
        return 'Past Due';
      case 'canceled':
        return 'Canceled';
      case 'incomplete':
        return 'Incomplete';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  return (
    <div className="card">
      <div className="flex items-center mb-4">
        <Crown className={`w-6 h-6 mr-3 ${isActive ? 'text-accent' : 'text-gray-400'}`} />
        <h3 className="text-lg font-semibold text-text-primary">Subscription Status</h3>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-text-secondary">Plan:</span>
          <span className="font-medium text-text-primary">
            {product?.name || 'Unknown Plan'}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-text-secondary">Status:</span>
          <span className={`font-medium ${getStatusColor(subscription.subscription_status)}`}>
            {getStatusText(subscription.subscription_status)}
          </span>
        </div>

        {subscription.current_period_end && (
          <div className="flex justify-between items-center">
            <span className="text-text-secondary">
              {subscription.cancel_at_period_end ? 'Expires:' : 'Renews:'}
            </span>
            <div className="flex items-center">
              <Calendar className="w-4 h-4 mr-1 text-text-secondary" />
              <span className="font-medium text-text-primary">
                {formatDate(subscription.current_period_end)}
              </span>
            </div>
          </div>
        )}

        {subscription.payment_method_brand && subscription.payment_method_last4 && (
          <div className="flex justify-between items-center">
            <span className="text-text-secondary">Payment Method:</span>
            <div className="flex items-center">
              <CreditCard className="w-4 h-4 mr-1 text-text-secondary" />
              <span className="font-medium text-text-primary">
                {subscription.payment_method_brand.toUpperCase()} ****{subscription.payment_method_last4}
              </span>
            </div>
          </div>
        )}

        {subscription.cancel_at_period_end && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 text-sm">
              Your subscription will not renew and will end on {formatDate(subscription.current_period_end)}.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}