// Database table types matching Supabase schema

// User profile extended from Supabase auth.users
export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  is_admin?: boolean;
  created_at: string;
  updated_at?: string;
  // From auth.users().user_metadata
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
  };
}

// Journal entries table
export interface JournalEntry {
  id: string;
  user_id: string;
  entry_date: string;
  content: string;
  mood?: 'happy' | 'sad' | 'neutral' | 'excited' | 'anxious' | 'grateful' | 'stressed' | 'motivated';
  category?: 'gratitude' | 'goals' | 'reflection' | 'dreams' | 'challenges' | 'achievements' | 'general';
  ai_summary?: string;
  ai_insights?: string;
  tags?: string[];
  created_at: string;
  updated_at?: string;
}

// Moodboard elements
export interface MoodboardElement {
  id: string;
  type: 'text' | 'image' | 'goal' | 'affirmation' | 'quote';
  content: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  style: {
    fontSize?: number;
    color?: string;
    backgroundColor?: string;
    borderRadius?: number;
    fontWeight?: string;
    opacity?: number;
    transform?: string;
    textAlign?: 'left' | 'center' | 'right';
    border?: string;
    fontStyle?: 'normal' | 'italic';
    padding?: number;
  };
  metadata?: {
    imageUrl?: string;
    completed?: boolean;
    priority?: 'low' | 'medium' | 'high';
    dueDate?: string;
  };
}

// Moodboards table
export interface Moodboard {
  id: string;
  user_id: string;
  title?: string;
  description?: string;
  board_data: {
    elements: MoodboardElement[];
    goals?: string;
    preferences?: string;
    theme?: 'light' | 'dark' | 'custom';
    background?: string;
  };
  is_public?: boolean;
  created_at: string;
  updated_at: string;
}

// Public snapshots table
export interface PublicSnapshot {
  id: string;
  user_id: string;
  moodboard_id: string;
  snapshot_data: {
    elements: MoodboardElement[];
    goals?: string;
    preferences?: string;
    title?: string;
    description?: string;
  };
  title?: string;
  description?: string;
  views: number;
  created_at: string;
  expires_at?: string;
  is_active: boolean;
}

// Subscriptions table
export interface Subscription {
  id: string;
  user_id: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  stripe_price_id?: string;
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete' | 'incomplete_expired' | 'unpaid' | 'paused';
  current_period_start?: string;
  current_period_end?: string;
  cancel_at_period_end?: boolean;
  payment_method_brand?: string;
  payment_method_last4?: string;
  created_at: string;
  updated_at?: string;
}

// Social integrations table
export interface SocialIntegration {
  id: string;
  user_id: string;
  service_name: 'facebook' | 'instagram' | 'twitter' | 'linkedin' | 'pinterest' | 'gmail';
  service_user_id?: string;
  connected: boolean;
  auth_token?: string;
  refresh_token?: string;
  token_expires_at?: string;
  permissions?: string[];
  profile_data?: Record<string, unknown>;
  created_at: string;
  updated_at?: string;
}

// Onboarding progress table
export interface OnboardingProgress {
  id: string;
  user_id: string;
  step: number;
  completed_steps: string[];
  preferences?: {
    journaling_frequency?: 'daily' | 'weekly' | 'occasional';
    primary_goals?: string[];
    interests?: string[];
  };
  completed: boolean;
  created_at: string;
  updated_at?: string;
}

// Analytics and aggregated data types
export interface UserStats {
  totalJournalEntries: number;
  currentStreak: number;
  longestStreak: number;
  totalMoodboards: number;
  totalGoals: number;
  completedGoals: number;
  lastActiveDate: string;
  memberSince: string;
}

export interface MoodAnalytics {
  date: string;
  mood: string;
  count: number;
  average_sentiment?: number;
}

export interface JournalAnalytics {
  entriesThisMonth: number;
  entriesThisWeek: number;
  averageWordCount: number;
  topCategories: Array<{ category: string; count: number }>;
  topMoods: Array<{ mood: string; count: number }>;
  writingStreak: number;
}

// Supabase response types
export interface SupabaseResponse<T> {
  data: T | null;
  error: {
    message: string;
    details?: string;
    hint?: string;
    code?: string;
  } | null;
}

// Pagination types
export interface PaginationOptions {
  page?: number;
  limit?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
}