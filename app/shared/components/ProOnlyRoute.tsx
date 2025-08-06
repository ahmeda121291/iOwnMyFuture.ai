import React from 'react';
import { useRequireProPlan } from '../hooks/useRequireProPlan';
import Loader from './Loader';
import ProSubscriptionModal from './ProSubscriptionModal';

interface ProOnlyRouteProps {
  children: React.ReactNode;
}

export default function ProOnlyRoute({ children }: ProOnlyRouteProps) {
  const { isLoading, isProActive } = useRequireProPlan({
    showToast: true,
    toastMessage: 'You must subscribe to Pro to use MyFutureSelf.'
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader size="large" />
      </div>
    );
  }

  // If not Pro, the hook will redirect automatically
  if (!isProActive) {
    return <ProSubscriptionModal isOpen={true} />;
  }

  return <>{children}</>;
}