import type { User, JournalEntry, Moodboard, MoodboardElement, Subscription } from '@/core/types';

export const testUser: User = {
  id: 'test-user-123',
  email: 'test@example.com',
  fullName: 'Test User',
  avatarUrl: null,
  isPro: false,
  onboardingStatus: {
    hasCompletedOnboarding: true,
    createdFirstJournal: true,
    createdFirstMoodboard: true,
    generatedAISummary: true,
  },
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

export const testProUser: User = {
  ...testUser,
  id: 'test-pro-user-123',
  email: 'pro@example.com',
  fullName: 'Pro User',
  isPro: true,
};

export const testJournalEntry: JournalEntry = {
  id: 'entry-123',
  user_id: 'test-user-123',
  entry_date: '2024-01-15',
  content: 'Today was a great day. I accomplished my goals and felt productive.',
  ai_summary: 'User had a productive day and accomplished their goals.',
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
};

export const testMoodboardElement: MoodboardElement = {
  id: 'element-123',
  type: 'text',
  content: 'My Goal: Travel to Japan',
  position: { x: 100, y: 100 },
  size: { width: 200, height: 150 },
  style: {
    fontSize: 16,
    color: '#333',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
};

export const testMoodboard: Moodboard = {
  id: 'moodboard-123',
  user_id: 'test-user-123',
  title: 'My Vision Board 2024',
  description: 'Goals and dreams for the year',
  board_data: {
    elements: [testMoodboardElement],
    goals: 'Travel, Health, Career',
    preferences: 'Minimalist style',
  },
  created_at: '2024-01-10T00:00:00Z',
  updated_at: '2024-01-10T00:00:00Z',
};

export const testSubscription: Subscription = {
  id: 'sub-123',
  user_id: 'test-user-123',
  stripe_customer_id: 'cus_123',
  stripe_subscription_id: 'sub_123',
  status: 'active',
  current_period_start: '2024-01-01T00:00:00Z',
  current_period_end: '2024-02-01T00:00:00Z',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

export const expiredSubscription: Subscription = {
  ...testSubscription,
  id: 'sub-expired-123',
  status: 'canceled',
  current_period_end: '2023-12-01T00:00:00Z',
};

// Helper function to generate multiple journal entries
export const generateJournalEntries = (count: number, userId: string): JournalEntry[] => {
  return Array.from({ length: count }, (_, index) => ({
    id: `entry-${index}`,
    user_id: userId,
    entry_date: new Date(2024, 0, index + 1).toISOString().split('T')[0],
    content: `Journal entry ${index + 1} content`,
    ai_summary: `Summary for entry ${index + 1}`,
    created_at: new Date(2024, 0, index + 1).toISOString(),
    updated_at: new Date(2024, 0, index + 1).toISOString(),
  }));
};