import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  CheckCircle, 
  Sparkles, 
  ArrowRight, 
  BookOpen, 
  Target,
  Calendar,
  Mail,
  Gift,
  CreditCard,
  Clock,
} from 'lucide-react';
import { supabase } from '../core/api/supabase';
import { useRequireProPlan } from '../shared/hooks/useRequireProPlan';
import { safeNavigate } from '../shared/utils/navigation';
import Button from '../shared/components/Button';
import Loader from '../shared/components/Loader';
import toast from 'react-hot-toast';
import { errorTracker } from '../shared/utils/errorTracking';

interface SessionDetails {
  sessionId: string;
  amount: number;
  plan: string;
  email: string;
  status?: string;
  paymentStatus?: string;
  currency?: string;
  customerName?: string;
}

export default function SuccessPage() {
  // Use Pro plan check hook - don't redirect on success page since payment was just made
  const { user } = useRequireProPlan({ 
    redirectTo: '/upgrade',
    showToast: false, // Don't show toast on success page
    skipRedirect: true // Don't auto-redirect from success page
  });
  
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [sessionDetails, setSessionDetails] = useState<SessionDetails | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [canManualRetry, setCanManualRetry] = useState(false);
  
  const sessionId = searchParams.get('session_id');
  const MAX_RETRIES = 5;

  const confirmPaymentAndUpdateSubscription = useCallback(async () => {
    if (!sessionId) {
      setLoading(false);
      toast.error('No session ID found');
      // Use safe navigation with Pro check
      await safeNavigate(navigate, '/dashboard', { requireAuth: true, requirePro: false });
      return;
    }

    try {
      // First, retrieve the Stripe session details
      const { data: stripeSession, error: sessionError } = await supabase.functions.invoke('get-stripe-session', {
        body: { session_id: sessionId }
      });

      if (sessionError) {
        throw sessionError;
      }

      if (!stripeSession) {
        throw new Error('No session data returned');
      }

      // Check if payment was successful
      const isSuccessful = stripeSession.payment_status === 'paid' || stripeSession.status === 'complete';
      
      if (isSuccessful) {
        setSessionDetails({
          sessionId,
          amount: stripeSession.amount_total ? stripeSession.amount_total / 100 : 180,
          plan: stripeSession.mode === 'subscription' ? 'Pro' : 'One-time',
          email: stripeSession.customer_email || user?.email || '',
          status: stripeSession.status,
          paymentStatus: stripeSession.payment_status,
          currency: stripeSession.currency || 'usd',
          customerName: stripeSession.customer_name || user?.user_metadata?.full_name || 'Customer'
        });
        
        // Clear the redirect path from session storage
        sessionStorage.removeItem('redirectAfterUpgrade');
        
        toast.success('Payment confirmed! Your subscription is now active.');
        
        // The webhook will send the confirmation email
        // No need to send it from here
      } else if (stripeSession.payment_status === 'unpaid' || stripeSession.status === 'expired') {
        toast.error('Payment was not completed successfully');
        setTimeout(async () => {
          await safeNavigate(navigate, '/pricing', { requireAuth: false });
        }, 3000);
      } else {
        // Payment is still processing
        if (retryCount < MAX_RETRIES) {
          toast.info(`Payment is being processed. Please wait... (Attempt ${retryCount + 1}/${MAX_RETRIES})`);
          // Retry after 3 seconds
          setRetryCount(prev => prev + 1);
          setTimeout(() => {
            confirmPaymentAndUpdateSubscription();
          }, 3000);
        } else {
          // Max retries reached
          toast.error('Payment verification is taking longer than expected. Please check your email for confirmation or contact support.');
          setSessionDetails({
            sessionId,
            amount: 0,
            plan: 'Pro',
            email: user?.email || '',
            status: 'processing',
            paymentStatus: 'processing'
          });
          setCanManualRetry(true); // Enable manual retry button
        }
      }
    } catch (error) {
      errorTracker.trackError(error, { component: 'Success', action: 'confirmPayment' });
      toast.error('Failed to retrieve payment information. Please contact support.');
      
      // Still redirect to dashboard after a delay with auth check
      setTimeout(async () => {
        await safeNavigate(navigate, '/dashboard', { requireAuth: true, requirePro: false });
      }, 3000);
    } finally {
      setLoading(false);
    }
  }, [sessionId, user?.email, user?.user_metadata?.full_name, navigate, retryCount]);

  useEffect(() => {
    if (user?.id && sessionId) {
      confirmPaymentAndUpdateSubscription();
    }
  }, [user?.id, sessionId, confirmPaymentAndUpdateSubscription]);

  const nextSteps = [
    {
      icon: <Target className="w-6 h-6" />,
      title: "Create Your First Vision Board",
      description: "Start manifesting your dreams with AI-powered vision boards",
      action: "Go to Moodboard",
      path: "/moodboard"
    },
    {
      icon: <BookOpen className="w-6 h-6" />,
      title: "Start Journaling",
      description: "Begin your daily reflection journey with AI insights",
      action: "Write First Entry",
      path: "/journal"
    },
    {
      icon: <Calendar className="w-6 h-6" />,
      title: "Set Your Goals",
      description: "Define your aspirations and track your progress",
      action: "Set Goals",
      path: "/dashboard"
    }
  ];

  const benefits = [
    "Unlimited AI-powered vision boards",
    "Smart journaling with AI summaries",
    "Advanced progress analytics",
    "Priority customer support",
    "Mobile app access",
    "Cloud sync across devices"
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader size="large" className="mb-4" />
          <p className="text-text-secondary">Processing your payment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-background to-primary/10 py-12 px-4">
      {/* Celebration Animation */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-10 left-10 w-4 h-4 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
        <div className="absolute top-20 right-20 w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.5s' }}></div>
        <div className="absolute bottom-20 left-20 w-5 h-5 bg-accent rounded-full animate-bounce" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-10 right-10 w-4 h-4 bg-primary rounded-full animate-bounce" style={{ animationDelay: '1.5s' }}></div>
      </div>

      <div className="container mx-auto max-w-4xl">
        
        {/* Success Header */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold text-text-primary mb-4">
            🎉 Welcome to Your Transformation Journey!
          </h1>
          
          <p className="text-xl text-text-secondary mb-6 max-w-2xl mx-auto">
            Your subscription is active and you're ready to start manifesting your dreams with 
            AI-powered tools and insights.
          </p>

          {sessionDetails && (
            <div className="card max-w-2xl mx-auto mb-8">
              <div className="flex items-center mb-4">
                <CreditCard className="w-5 h-5 text-green-600 mr-2" />
                <h3 className="font-semibold text-text-primary">Payment Confirmation</h3>
              </div>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-text-secondary">Plan:</span>
                  <span className="text-text-primary font-medium ml-2">{sessionDetails.plan}</span>
                </div>
                <div>
                  <span className="text-text-secondary">Amount:</span>
                  <span className="text-text-primary font-medium ml-2">
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: sessionDetails.currency?.toUpperCase() || 'USD'
                    }).format(sessionDetails.amount)}
                  </span>
                </div>
                <div>
                  <span className="text-text-secondary">Transaction ID:</span>
                  <span className="text-text-primary font-mono text-xs ml-2">{sessionDetails.sessionId.slice(0, 20)}...</span>
                </div>
                <div>
                  <span className="text-text-secondary">Billed to:</span>
                  <span className="text-text-primary font-medium ml-2">{sessionDetails.email}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-text-secondary">Status:</span>
                  <span className="inline-flex items-center ml-2">
                    {sessionDetails.status === 'processing' || sessionDetails.paymentStatus === 'processing' ? (
                      <>
                        <Clock className="w-4 h-4 text-yellow-500 mr-1 animate-pulse" />
                        <span className="text-yellow-600 font-medium">Payment Processing</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
                        <span className="text-green-600 font-medium">Payment Successful</span>
                      </>
                    )}
                  </span>
                </div>
              </div>
              {sessionDetails.status === 'processing' || sessionDetails.paymentStatus === 'processing' ? (
                <>
                  <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="flex items-center text-yellow-800">
                      <Clock className="w-4 h-4 mr-2 animate-pulse" />
                      <span className="text-sm">Your payment is still being processed. This can take a few minutes.</span>
                    </div>
                  </div>
                  {canManualRetry && (
                    <div className="mt-4 flex justify-center">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setRetryCount(0);
                          setCanManualRetry(false);
                          confirmPaymentAndUpdateSubscription();
                        }}
                        icon={<ArrowRight className="w-4 h-4" />}
                        iconPosition="right"
                      >
                        Check Payment Status
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center text-green-800">
                    <Mail className="w-4 h-4 mr-2" />
                    <span className="text-sm">A confirmation email has been sent to {sessionDetails.email}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* What You Get */}
        <div className="card mb-12">
          <div className="flex items-center mb-6">
            <Gift className="w-6 h-6 text-accent mr-3" />
            <h2 className="text-2xl font-bold text-text-primary">What You Get With Your Subscription</h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                <span className="text-text-secondary">{benefit}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Next Steps */}
        <div className="card mb-12">
          <div className="flex items-center mb-6">
            <Sparkles className="w-6 h-6 text-accent mr-3" />
            <h2 className="text-2xl font-bold text-text-primary">Your Next Steps</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {nextSteps.map((step, index) => (
              <div key={index} className="relative group">
                <div className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-xl p-6 border border-gray-100 hover:shadow-md transition-all cursor-pointer"
                     onClick={() => navigate(step.path)}>
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
                    <div className="text-accent">{step.icon}</div>
                  </div>
                  
                  <h3 className="font-semibold text-text-primary mb-2">{step.title}</h3>
                  <p className="text-sm text-text-secondary mb-4">{step.description}</p>
                  
                  <button className="text-accent font-medium text-sm flex items-center group-hover:text-accent/80">
                    {step.action}
                    <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
                
                {/* Step Number */}
                <div className="absolute -top-3 -left-3 w-8 h-8 bg-accent text-white rounded-full flex items-center justify-center text-sm font-bold">
                  {index + 1}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="text-center space-y-4 mb-12">
          <Button
            onClick={() => navigate('/dashboard')}
            className="bg-gradient-to-r from-primary to-accent text-white px-8 py-4 rounded-full font-semibold text-lg hover:shadow-lg hover:scale-105 transition-all inline-flex items-center"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            Go to Dashboard
          </Button>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              variant="secondary"
              onClick={() => navigate('/moodboard')}
              className="inline-flex items-center justify-center"
            >
              <Target className="w-5 h-5 mr-2" />
              Create Vision Board
            </Button>
            
            <Button
              variant="secondary"
              onClick={() => navigate('/journal')}
              className="inline-flex items-center justify-center"
            >
              <BookOpen className="w-5 h-5 mr-2" />
              Start Journaling
            </Button>
          </div>
        </div>

        {/* Support Info */}
        <div className="card bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
          <div className="flex items-center justify-center mb-4">
            <Mail className="w-5 h-5 text-accent mr-2" />
            <span className="font-medium text-text-primary">Need Help Getting Started?</span>
          </div>
          
          <p className="text-text-secondary mb-4 text-center">
            Our team is here to help you make the most of your subscription.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center text-sm">
            <span className="text-text-secondary">📧 support@iownmyfuture.ai</span>
            <span className="text-text-secondary">💬 Live chat available 24/7</span>
            <span className="text-text-secondary">📱 Download our mobile app</span>
          </div>
        </div>
      </div>
    </div>
  );
}