// User types
export interface User {
  id: string;
  email: string;
  user_metadata?: {
    full_name?: string;
  };
  created_at: string;
}

// Journal types
export interface JournalEntry {
  id: string;
  user_id: string;
  entry_date: string;
  content: string;
  ai_summary?: string;
  created_at: string;
  updated_at?: string;
}

// Moodboard types
export interface MoodboardElement {
  id: string;
  type: 'text' | 'image' | 'goal';
  content: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  style: {
    fontSize?: number;
    color?: string;
    backgroundColor?: string;
    borderRadius?: number;
    fontWeight?: string;
  };
}

export interface Moodboard {
  id: string;
  user_id: string;
  board_data: {
    elements: MoodboardElement[];
    goals?: string;
    preferences?: string;
    last_updated: string;
  };
  created_at: string;
  updated_at: string;
}

// Subscription types
export interface Subscription {
  id: string;
  user_id: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  status: string;
  created_at: string;
}

export interface StripeSubscription {
  customer_id: string;
  subscription_id?: string;
  subscription_status: 'not_started' | 'incomplete' | 'incomplete_expired' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid' | 'paused';
  price_id?: string;
  current_period_start?: number;
  current_period_end?: number;
  cancel_at_period_end?: boolean;
  payment_method_brand?: string;
  payment_method_last4?: string;
}

// Social Integration types
export interface SocialIntegration {
  id: string;
  user_id: string;
  service_name: string;
  connected: boolean;
  auth_token?: string;
  created_at: string;
}

// API Response types
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  success: boolean;
}

// Analytics types
export interface ProgressData {
  labels: string[];
  journalEntries: number[];
  moodboardUpdates: number[];
  goalProgress: number[];
}

export interface MoodData {
  date: string;
  mood: 'positive' | 'neutral' | 'negative';
  intensity: number;
}

// OpenAI types
export interface AIVisionElement {
  title: string;
  description: string;
  category: string;
  suggested_image_prompt?: string;
}

export interface AIInsightReport {
  summary: string;
  patterns: string[];
  recommendations: string[];
  progress_score: number;
}