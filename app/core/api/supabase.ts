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
    // First try the user_subscription_view which has all the fields we need
    const { data: viewData, error: viewError } = await supabase
      .from('user_subscription_view')
      .select('*')
      .maybeSingle();
    
    if (!viewError && viewData) {
      // Check if subscription is active and current
      const isActive = viewData.status === 'active' || viewData.status === 'trialing';
      const isCurrent = viewData.current_period_end ? new Date(viewData.current_period_end) > new Date() : false;
      
      // Return the subscription if it's active and current
      if (isActive && isCurrent) {
        return viewData;
      }
    }
    
    // Fallback to direct query with proper handling of multiple rows
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (error) {
      if (error.code === 'PGRST116') {
        // No subscription found - this is expected for new users
        return null;
      }
      console.warn('Error getting user subscription:', error);
      return null;
    }
    
    if (!data || data.length === 0) {
      return null;
    }
    
    // Get the most recent subscription
    const subscription = data[0];
    
    // Check if subscription is valid
    const isActive = subscription.status === 'active' || subscription.status === 'trialing';
    const isCurrent = subscription.current_period_end ? new Date(subscription.current_period_end) > new Date() : false;
    
    return (isActive && isCurrent) ? subscription : null;
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
