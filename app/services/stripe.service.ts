import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { supabase } from '../core/api/supabase';

export interface PricingPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
  stripePriceId: string;
  popular?: boolean;
}

export interface Subscription {
  id: string;
  userId: string;
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete';
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  priceId: string;
  planName: string;
}

export interface CheckoutSessionOptions {
  priceId: string;
  userId: string;
  successUrl?: string;
  cancelUrl?: string;
  customerEmail?: string;
  metadata?: Record<string, string>;
}

export interface BillingPortalOptions {
  userId: string;
  returnUrl?: string;
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'bank_account';
  card?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
  isDefault: boolean;
}

/**
 * Stripe Service
 * Handles all payment and subscription operations
 */
class StripeService {
  private stripe: Stripe | null = null;
  private readonly publishableKey: string;

  constructor() {
    this.publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';
  }

  /**
   * Initialize Stripe client
   */
  private async initStripe(): Promise<Stripe> {
    if (!this.stripe) {
      if (!this.publishableKey) {
        throw new Error('Stripe publishable key not configured');
      }
      const stripeInstance = await loadStripe(this.publishableKey);
      if (!stripeInstance) {
        throw new Error('Failed to load Stripe');
      }
      this.stripe = stripeInstance;
    }
    return this.stripe;
  }

  /**
   * Get available pricing plans
   */
  async getPricingPlans(): Promise<PricingPlan[]> {
    try {
      const { data, error } = await supabase.functions.invoke('stripe-config', {
        body: { action: 'get-pricing-plans' },
      });

      if (error) {
        throw new Error(`Failed to fetch pricing plans: ${error.message}`);
      }

      return data.plans as PricingPlan[];
    } catch (error) {
      console.error('GetPricingPlans error:', error);
      throw error;
    }
  }

  /**
   * Create a checkout session for subscription
   */
  async createCheckoutSession(options: CheckoutSessionOptions): Promise<string> {
    try {
      const {
        priceId,
        userId,
        successUrl = `${window.location.origin}/success`,
        cancelUrl = `${window.location.origin}/pricing`,
        customerEmail,
        metadata = {},
      } = options;

      const { data, error } = await supabase.functions.invoke('stripe-checkout', {
        body: {
          priceId,
          userId,
          successUrl,
          cancelUrl,
          customerEmail,
          metadata: {
            ...metadata,
            userId,
          },
        },
      });

      if (error) {
        throw new Error(`Failed to create checkout session: ${error.message}`);
      }

      if (!data.sessionId) {
        throw new Error('No session ID returned from checkout');
      }

      // Redirect to Stripe Checkout
      const stripe = await this.initStripe();
      const { error: redirectError } = await stripe.redirectToCheckout({
        sessionId: data.sessionId,
      });

      if (redirectError) {
        throw new Error(`Checkout redirect failed: ${redirectError.message}`);
      }

      return data.sessionId;
    } catch (error) {
      console.error('CreateCheckoutSession error:', error);
      throw error;
    }
  }

  /**
   * Create billing portal session for subscription management
   */
  async createBillingPortalSession(options: BillingPortalOptions): Promise<string> {
    try {
      const {
        userId,
        returnUrl = window.location.href,
      } = options;

      const { data, error } = await supabase.functions.invoke('stripe-portal', {
        body: {
          userId,
          returnUrl,
        },
      });

      if (error) {
        throw new Error(`Failed to create billing portal session: ${error.message}`);
      }

      if (!data.url) {
        throw new Error('No URL returned from billing portal');
      }

      // Redirect to Stripe Billing Portal
      window.location.href = data.url;

      return data.url;
    } catch (error) {
      console.error('CreateBillingPortalSession error:', error);
      throw error;
    }
  }

  /**
   * Get user's current subscription
   */
  async getCurrentSubscription(userId: string): Promise<Subscription | null> {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No subscription found
          return null;
        }
        throw new Error(`Failed to fetch subscription: ${error.message}`);
      }

      return {
        id: data.id,
        userId: data.user_id,
        status: data.status,
        currentPeriodEnd: new Date(data.current_period_end),
        cancelAtPeriodEnd: data.cancel_at_period_end,
        priceId: data.price_id,
        planName: data.plan_name || 'Pro',
      } as Subscription;
    } catch (error) {
      console.error('GetCurrentSubscription error:', error);
      return null;
    }
  }

  /**
   * Cancel subscription at period end
   */
  async cancelSubscription(userId: string): Promise<void> {
    try {
      const { error } = await supabase.functions.invoke('stripe-cancel', {
        body: { userId },
      });

      if (error) {
        throw new Error(`Failed to cancel subscription: ${error.message}`);
      }
    } catch (error) {
      console.error('CancelSubscription error:', error);
      throw error;
    }
  }

  /**
   * Resume a canceled subscription
   */
  async resumeSubscription(userId: string): Promise<void> {
    try {
      const { error } = await supabase.functions.invoke('stripe-resume', {
        body: { userId },
      });

      if (error) {
        throw new Error(`Failed to resume subscription: ${error.message}`);
      }
    } catch (error) {
      console.error('ResumeSubscription error:', error);
      throw error;
    }
  }

  /**
   * Get subscription history
   */
  async getSubscriptionHistory(userId: string): Promise<Subscription[]> {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch subscription history: ${error.message}`);
      }

      return data.map(sub => ({
        id: sub.id,
        userId: sub.user_id,
        status: sub.status,
        currentPeriodEnd: new Date(sub.current_period_end),
        cancelAtPeriodEnd: sub.cancel_at_period_end,
        priceId: sub.price_id,
        planName: sub.plan_name || 'Pro',
      })) as Subscription[];
    } catch (error) {
      console.error('GetSubscriptionHistory error:', error);
      throw error;
    }
  }

  /**
   * Get payment methods
   */
  async getPaymentMethods(userId: string): Promise<PaymentMethod[]> {
    try {
      const { data, error } = await supabase.functions.invoke('stripe-payment-methods', {
        body: { userId },
      });

      if (error) {
        throw new Error(`Failed to fetch payment methods: ${error.message}`);
      }

      return data.paymentMethods as PaymentMethod[];
    } catch (error) {
      console.error('GetPaymentMethods error:', error);
      throw error;
    }
  }

  /**
   * Update default payment method
   */
  async updateDefaultPaymentMethod(userId: string, paymentMethodId: string): Promise<void> {
    try {
      const { error } = await supabase.functions.invoke('stripe-update-payment', {
        body: { 
          userId,
          paymentMethodId,
        },
      });

      if (error) {
        throw new Error(`Failed to update payment method: ${error.message}`);
      }
    } catch (error) {
      console.error('UpdateDefaultPaymentMethod error:', error);
      throw error;
    }
  }

  /**
   * Check if user has active subscription
   */
  async hasActiveSubscription(userId: string): Promise<boolean> {
    try {
      const subscription = await this.getCurrentSubscription(userId);
      return subscription !== null && subscription.status === 'active';
    } catch (error) {
      console.error('HasActiveSubscription error:', error);
      return false;
    }
  }

  /**
   * Get subscription status
   */
  async getSubscriptionStatus(userId: string): Promise<'free' | 'pro' | 'canceled' | 'past_due'> {
    try {
      const subscription = await this.getCurrentSubscription(userId);
      
      if (!subscription) {
        return 'free';
      }

      if (subscription.status === 'active' && !subscription.cancelAtPeriodEnd) {
        return 'pro';
      }

      if (subscription.status === 'active' && subscription.cancelAtPeriodEnd) {
        return 'canceled';
      }

      if (subscription.status === 'past_due') {
        return 'past_due';
      }

      return 'free';
    } catch (error) {
      console.error('GetSubscriptionStatus error:', error);
      return 'free';
    }
  }

  /**
   * Handle successful payment webhook
   */
  async handlePaymentSuccess(sessionId: string): Promise<void> {
    try {
      // This would typically be handled by the webhook endpoint
      // but can be used for client-side confirmation
      const { error } = await supabase.functions.invoke('stripe-confirm-payment', {
        body: { sessionId },
      });

      if (error) {
        console.error('Payment confirmation error:', error);
      }
    } catch (error) {
      console.error('HandlePaymentSuccess error:', error);
    }
  }

  /**
   * Get upcoming invoice
   */
  async getUpcomingInvoice(userId: string): Promise<any> {
    try {
      const { data, error } = await supabase.functions.invoke('stripe-upcoming-invoice', {
        body: { userId },
      });

      if (error) {
        throw new Error(`Failed to fetch upcoming invoice: ${error.message}`);
      }

      return data.invoice;
    } catch (error) {
      console.error('GetUpcomingInvoice error:', error);
      return null;
    }
  }

  /**
   * Apply coupon code
   */
  async applyCoupon(userId: string, couponCode: string): Promise<void> {
    try {
      const { error } = await supabase.functions.invoke('stripe-apply-coupon', {
        body: { 
          userId,
          couponCode,
        },
      });

      if (error) {
        throw new Error(`Failed to apply coupon: ${error.message}`);
      }
    } catch (error) {
      console.error('ApplyCoupon error:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const stripeService = new StripeService();

// Export type for dependency injection
export type IStripeService = StripeService;