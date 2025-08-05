// Re-export database types
export {
  UserProfile as User,
  JournalEntry,
  MoodboardElement,
  Moodboard,
  Subscription,
  SocialIntegration,
  PublicSnapshot,
  OnboardingProgress,
  UserStats,
  MoodAnalytics,
  JournalAnalytics,
  SupabaseResponse,
  PaginationOptions,
  PaginatedResponse
} from './database';

// Additional non-database types
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

// API Response types
export interface ApiResponse<T> {
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