import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { getSession, getUserSubscription } from '../../core/api/supabase';
import Loader from './Loader';
import ProSubscriptionModal from './ProSubscriptionModal';
import toast from 'react-hot-toast';

interface ProOnlyRouteProps {
  children: React.ReactNode;
}

export default function ProOnlyRoute({ children }: ProOnlyRouteProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [hasProAccess, setHasProAccess] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkProAccess = async () => {
      try {
        // First check if user is authenticated
        const session = await getSession();
        
        if (!session) {
          setIsAuthenticated(false);
          setHasProAccess(false);
          setLoading(false);
          return;
        }
        
        setIsAuthenticated(true);
        
        // Then check if user has active Pro subscription
        const subscription = await getUserSubscription();
        
        // Check if subscription exists and is active
        const isProActive = 
          subscription && 
          subscription.subscription_status === 'active' &&
          subscription.price_id && // Has a price ID (Pro plan)
          !subscription.cancel_at_period_end; // Not scheduled for cancellation
        
        if (!isProActive) {
          toast.error('You must subscribe to Pro to use MyFutureSelf.', {
            duration: 6000,
            position: 'top-center',
            style: {
              background: '#dc2626',
              color: 'white',
              fontWeight: 'bold',
              padding: '16px',
              borderRadius: '8px'
            },
            icon: '🔒'
          });
        }
        
        setHasProAccess(isProActive);
      } catch (error) {
        console.error('Error checking Pro access:', error);
        setHasProAccess(false);
        toast.error('Error verifying subscription. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    checkProAccess();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader size="large" />
      </div>
    );
  }

  // If not authenticated, redirect to auth
  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  // If authenticated but no Pro access, show modal and redirect
  if (!hasProAccess) {
    return (
      <>
        <ProSubscriptionModal isOpen={true} />
        <Navigate to="/pricing" replace />
      </>
    );
  }

  return <>{children}</>;
}