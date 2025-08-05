import { createClient } from '@supabase/supabase-js';
import { type UserProfile } from '../core/types/database';

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
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {throw error;}
  
  if (!user) {return null;}
  
  // Map Supabase User to our UserProfile type
  return {
    id: user.id,
    email: user.email || '',
    full_name: user.user_metadata?.full_name,
    is_admin: user.user_metadata?.is_admin || false,
    created_at: user.created_at || new Date().toISOString(),
    user_metadata: user.user_metadata
  };
};

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {throw error;}
  return data;
};

export const signUp = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) {throw error;}
  return data;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) {throw error;}
};

// Stripe helpers (unchanged)
export const getUserSubscription = async () => {
  const { data, error } = await supabase
    .from('stripe_user_subscriptions')
    .select('*')
    .maybeSingle();
  if (error) {throw error;}
  return data;
};

export const getUserOrders = async () => {
  const { data, error } = await supabase
    .from('stripe_user_orders')
    .select('*')
    .order('order_date', { ascending: false });
  if (error) {throw error;}
  return data;
};
