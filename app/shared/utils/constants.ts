// Application constants
export const APP_NAME = 'MoodBoard.ai';
export const APP_DESCRIPTION = 'Empowering your journey to achieve your dreams through AI-powered vision boards and mindful journaling.';

// API Constants
export const API_ENDPOINTS = {
  OPENAI: 'https://api.openai.com/v1/chat/completions',
  STRIPE_CHECKOUT: '/api/stripe/checkout',
  STRIPE_WEBHOOK: '/api/stripe/webhook'
} as const;

// Local Storage Keys
export const STORAGE_KEYS = {
  USER_PREFERENCES: 'moodboard_user_preferences',
  THEME: 'moodboard_theme',
  LAST_JOURNAL_DATE: 'moodboard_last_journal_date',
  ONBOARDING_COMPLETED: 'moodboard_onboarding_completed'
} as const;

// UI Constants
export const BREAKPOINTS = {
  SM: '640px',
  MD: '768px',
  LG: '1024px',
  XL: '1280px',
  '2XL': '1536px'
} as const;

export const ANIMATION_DURATIONS = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500
} as const;

// Business Logic Constants
export const LIMITS = {
  MAX_JOURNAL_ENTRY_LENGTH: 10000,
  MAX_MOODBOARD_ELEMENTS: 50,
  MAX_GOALS_PER_BOARD: 10,
  FREE_JOURNAL_ENTRIES: 5,
  FREE_MOODBOARDS: 1
} as const;

export const SUBSCRIPTION_PLANS = {
  FREE: 'free',
  MONTHLY: 'monthly',
  YEARLY: 'yearly'
} as const;

// Social Integration Services
export const SOCIAL_SERVICES = {
  INSTAGRAM: 'instagram',
  TWITTER: 'twitter',
  FACEBOOK: 'facebook',
  GMAIL: 'gmail'
} as const;

// Mood Types
export const MOOD_TYPES = {
  POSITIVE: 'positive',
  NEUTRAL: 'neutral',
  NEGATIVE: 'negative'
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection and try again.',
  UNAUTHORIZED: 'You need to be logged in to perform this action.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  SERVER_ERROR: 'An unexpected error occurred. Please try again later.',
  STRIPE_ERROR: 'Payment processing failed. Please try again.',
  OPENAI_ERROR: 'AI service is temporarily unavailable. Please try again later.'
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  ENTRY_SAVED: 'Journal entry saved successfully!',
  MOODBOARD_SAVED: 'Vision board saved successfully!',
  PROFILE_UPDATED: 'Profile updated successfully!',
  SUBSCRIPTION_CREATED: 'Subscription created successfully!',
  SOCIAL_CONNECTED: 'Social account connected successfully!',
  PASSWORD_UPDATED: 'Password updated successfully!'
} as const;