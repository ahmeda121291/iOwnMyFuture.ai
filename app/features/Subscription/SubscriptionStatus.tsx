import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { getUserSubscription, supabase } from '../../core/api/supabase';
import { getProductByPriceId } from '../../core/api/stripeConfig';
import Button from '../../shared/components/Button';
import Modal from '../../shared/components/Modal';
import toast from 'react-hot-toast';
import { errorTracker } from '../../shared/utils/errorTracking';

// Typed Props interface
interface SubscriptionStatusProps {
  compact?: boolean;
}

// Types
interface Subscription {
  id: string;
  subscription_status: 'active' | 'canceled' | 'past_due' | 'incomplete' | 'not_started';
  current_period_start: string;
  current_period_end: string;
  price_id: string;
  quantity: number;
  cancel_at_period_end: boolean;
}

interface PlanDetails {
  name: string;
  amount: number;
  cycle: 'month' | 'year';
}

// Constants
const STATUS_STYLES = {
  active: 'text-green-600 bg-green-100',
  canceled: 'text-orange-600 bg-orange-100',
  past_due: 'text-red-600 bg-red-100',
  default: 'text-gray-600 bg-gray-100'
} as const;

const FREE_PLAN_FEATURES = [
  { text: '1 Vision Board' },
  { text: 'Basic Journaling' },
  { text: 'Limited AI Features' }
];

export default function SubscriptionStatus({ compact = false }: SubscriptionStatusProps) {
  // Custom hooks and state at top
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showManageModal, setShowManageModal] = useState(false);

  // Effect hooks
  useEffect(() => {
    loadSubscription();
  }, [loadSubscription]);

  // Computed values
  const planDetails = useMemo((): PlanDetails => {
    if (!subscription?.price_id) {
      return { name: 'Unknown Plan', amount: 0, cycle: 'month' };
    }
    
    const product = getProductByPriceId(subscription.price_id);
    if (!product) {
      return { name: 'Unknown Plan', amount: 0, cycle: 'month' };
    }
    
    const cycle = product.price === 180 ? 'year' : 'month';
    return { name: product.name, amount: product.price, cycle };
  }, [subscription?.price_id]);

  const statusColor = useMemo(() => {
    if (!subscription) {return STATUS_STYLES.default;}
    return STATUS_STYLES[subscription.subscription_status] || STATUS_STYLES.default;
  }, [subscription]);

  const isFreePlan = useMemo(() => {
    return !subscription || subscription.subscription_status === 'not_started';
  }, [subscription]);

  const formattedEndDate = useMemo(() => {
    if (!subscription?.current_period_end) {return '';}
    return formatDate(subscription.current_period_end);
  }, [subscription?.current_period_end]);

  // Helper functions
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Event handlers
  const loadSubscription = useCallback(async () => {
    try {
      const data = await getUserSubscription();
      setSubscription(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleManageSubscription = useCallback(async () => {
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errorTracker.trackError(error, { 
        component: 'SubscriptionStatus', 
        action: 'openBillingPortal',
        errorMessage 
      });
      toast.error(`Failed to open billing portal: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleUpgrade = useCallback(() => {
    window.location.href = '/pricing';
  }, []);

  // Early returns for loading/error states
  if (loading) {
    return <LoadingState compact={compact} />;
  }

  if (error) {
    return <ErrorState compact={compact} error={error} />;
  }

  // Main JSX render
  if (isFreePlan) {
    return (
      <FreePlanView 
        compact={compact}
        onUpgrade={handleUpgrade}
      />
    );
  }

  return (
    <>
      <PaidPlanView
        subscription={subscription as Subscription}
        planDetails={planDetails}
        statusColor={statusColor}
        formattedEndDate={formattedEndDate}
        compact={compact}
        onManage={() => setShowManageModal(true)}
        onUpgrade={handleUpgrade}
      />

      {/* Manage Subscription Modal */}
      <Modal
        isOpen={showManageModal}
        onClose={() => setShowManageModal(false)}
        title="Manage Subscription"
      >
        <ManageSubscriptionContent
          subscription={subscription as Subscription}
          planDetails={planDetails}
          formattedEndDate={formattedEndDate}
          onManageSubscription={handleManageSubscription}
          onUpgrade={handleUpgrade}
        />
      </Modal>
    </>
  );
}

// Sub-components
interface LoadingStateProps {
  compact: boolean;
}

const LoadingState = React.memo(function LoadingState({ compact }: LoadingStateProps) {
  return (
    <div className={`${compact ? 'p-4' : 'p-6'} bg-white rounded-lg border border-gray-200 animate-pulse`}>
      <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
    </div>
  );
})

interface ErrorStateProps {
  compact: boolean;
  error: string;
}

const ErrorState = React.memo(function ErrorState({ compact }: ErrorStateProps) {
  return (
    <div className={`${compact ? 'p-4' : 'p-6'} bg-white rounded-lg border border-gray-200`}>
      <div className="text-center">
        <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
        <p className="text-red-600 text-sm">Failed to load subscription status</p>
      </div>
    </div>
  );
})

interface FreePlanViewProps {
  compact: boolean;
  onUpgrade: () => void;
}

function FreePlanView({ compact, onUpgrade }: FreePlanViewProps) {
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
                {FREE_PLAN_FEATURES.map((feature, index) => (
                  <div key={index} className="flex items-center text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    <span className="text-text-secondary">{feature.text}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        
        <Button
          onClick={onUpgrade}
          size={compact ? "small" : "medium"}
          className="ml-4"
        >
          <Crown className="w-4 h-4 mr-1" />
          Upgrade
        </Button>
      </div>
    </div>
  );
}

interface PaidPlanViewProps {
  subscription: Subscription;
  planDetails: PlanDetails;
  statusColor: string;
  formattedEndDate: string;
  compact: boolean;
  onManage: () => void;
  onUpgrade: () => void;
}

function PaidPlanView({ 
  subscription, 
  planDetails, 
  statusColor, 
  formattedEndDate,
  compact, 
  onManage, 
  onUpgrade 
}: PaidPlanViewProps) {
  return (
    <div className={`${compact ? 'p-4' : 'p-6'} bg-white rounded-lg border border-gray-200 shadow-sm`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center mb-2">
            <Crown className="w-5 h-5 text-accent mr-2" />
            <h3 className="font-semibold text-text-primary">{planDetails.name}</h3>
            <StatusBadge status={subscription.subscription_status} statusColor={statusColor} />
          </div>

          {!compact && (
            <SubscriptionDetails
              subscription={subscription}
              planDetails={planDetails}
              formattedEndDate={formattedEndDate}
            />
          )}
        </div>

        <SubscriptionActions
          compact={compact}
          planDetails={planDetails}
          onManage={onManage}
          onUpgrade={onUpgrade}
        />
      </div>
    </div>
  );
}

interface StatusBadgeProps {
  status: string;
  statusColor: string;
}

function StatusBadge({ status, statusColor }: StatusBadgeProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4" />;
      case 'canceled':
      case 'past_due':
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  return (
    <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium flex items-center ${statusColor}`}>
      {getStatusIcon(status)}
      <span className="ml-1 capitalize">{status}</span>
    </span>
  );
}

interface SubscriptionDetailsProps {
  subscription: Subscription;
  planDetails: PlanDetails;
  formattedEndDate: string;
}

function SubscriptionDetails({ subscription, planDetails, formattedEndDate }: SubscriptionDetailsProps) {
  return (
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
                ? `Cancels on ${formattedEndDate}`
                : `Renews on ${formattedEndDate}`
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
              Your subscription will end on {formattedEndDate}
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
  );
}

interface SubscriptionActionsProps {
  compact: boolean;
  planDetails: PlanDetails;
  onManage: () => void;
  onUpgrade: () => void;
}

function SubscriptionActions({ compact, planDetails, onManage, onUpgrade }: SubscriptionActionsProps) {
  return (
    <div className="flex space-x-2 ml-4">
      {!compact && planDetails.cycle === 'month' && (
        <Button
          variant="secondary"
          size="small"
          onClick={onUpgrade}
        >
          <Zap className="w-4 h-4 mr-1" />
          Upgrade to Yearly
        </Button>
      )}
      
      <Button
        variant="secondary"
        size={compact ? "small" : "medium"}
        onClick={onManage}
      >
        <Settings className="w-4 h-4 mr-1" />
        Manage
      </Button>
    </div>
  );
}

interface ManageSubscriptionContentProps {
  subscription: Subscription;
  planDetails: PlanDetails;
  formattedEndDate: string;
  onManageSubscription: () => void;
  onUpgrade: () => void;
}

function ManageSubscriptionContent({ 
  subscription, 
  planDetails, 
  formattedEndDate,
  onManageSubscription, 
  onUpgrade 
}: ManageSubscriptionContentProps) {
  return (
    <div className="space-y-4">
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-text-primary mb-2">Current Plan</h4>
        <p className="text-text-secondary text-sm mb-3">
          {planDetails.name} - ${planDetails.amount}/{planDetails.cycle}
        </p>
        {subscription.current_period_end && (
          <p className="text-text-secondary text-sm">
            Next billing: {formattedEndDate}
          </p>
        )}
      </div>

      <div className="space-y-3">
        <Button
          onClick={onManageSubscription}
          className="w-full justify-center"
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          Open Billing Portal
        </Button>

        {planDetails.cycle === 'month' && (
          <Button
            variant="secondary"
            onClick={onUpgrade}
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
  );
}