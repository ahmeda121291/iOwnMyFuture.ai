import { createClient } from '@supabase/supabase-js';
import { type UserProfile } from '../types/database';

// Pull the values from your build environment (Vite prefixes client‑exposed variables with VITE_)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.'
  );
}

// Create the client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Auth helpers
export const getCurrentUser = async (): Promise<UserProfile | null> => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.warn('Error getting current user:', error.message);
      return null;
    }
    
    if (!user) {
      return null;
    }
    
    // Map Supabase User to our UserProfile type
    return {
      id: user.id,
      email: user.email || '',
      full_name: user.user_metadata?.full_name,
      is_admin: user.user_metadata?.is_admin || false,
      created_at: user.created_at || new Date().toISOString(),
      user_metadata: user.user_metadata
    };
  } catch (error) {
    console.warn('Unexpected error in getCurrentUser:', error);
    return null;
  }
};

// Get session helper
export const getSession = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.warn('Error getting session:', error.message);
      return null;
    }
    return session;
  } catch (error) {
    console.warn('Unexpected error in getSession:', error);
    return null;
  }
};

export const signIn = async (email: string, password: string) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      throw error;
    }
    return data;
  } catch (error) {
    console.error('Sign in error:', error);
    throw error;
  }
};

export const signUp = async (email: string, password: string) => {
  try {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      throw error;
    }
    return data;
  } catch (error) {
    console.error('Sign up error:', error);
    throw error;
  }
};

export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Sign out error:', error);
    throw error;
  }
};

// Stripe helpers
export const getUserSubscription = async (_userId?: string) => {
  try {
    // Query the stripe_user_subscriptions view which has all the fields we need
    // Don't use maybeSingle() as it fails with multiple rows
    const { data: allSubs, error } = await supabase
      .from('stripe_user_subscriptions')
      .select('*')
      .order('current_period_end', { ascending: false });
    
    if (error) {
      console.warn('Error getting user subscription:', error);
      return null;
    }
    
    if (!allSubs || allSubs.length === 0) {
      return null;
    }
    
    // Find the best valid subscription
    // Valid statuses include: active, trialing, past_due, incomplete (still processing)
    const validStatuses = ['active', 'trialing', 'past_due', 'incomplete'];
    
    // Find a subscription that:
    // 1. Has a valid status
    // 2. Has current_period_end in the future (or no end date yet)
    // Note: We DON'T exclude based on cancel_at_period_end - users keep access until period ends
    const validSub = allSubs.find(sub => {
      const hasValidStatus = validStatuses.includes(sub.subscription_status || sub.status);
      const isCurrentPeriod = !sub.current_period_end || new Date(sub.current_period_end) > new Date();
      return hasValidStatus && isCurrentPeriod;
    });
    
    // Return the subscription even if cancelled, as long as it's still within the period
    // The UI can check cancel_at_period_end to show a warning
    return validSub || null;
  } catch (error) {
    console.warn('Unexpected error in getUserSubscription:', error);
    return null;
  }
};

export const getUserOrders = async () => {
  try {
    const { data, error } = await supabase
      .from('stripe_user_orders')
      .select('*')
      .order('order_date', { ascending: false });
    if (error) {
      console.warn('Error getting user orders:', error);
      return [];
    }
    return data || [];
  } catch (error) {
    console.warn('Unexpected error in getUserOrders:', error);
    return [];
  }
};
