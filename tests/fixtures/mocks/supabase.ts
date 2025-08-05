import { vi } from 'vitest';
import type { User } from '@supabase/supabase-js';

export const mockUser: User = {
  id: 'test-user-id',
  email: 'test@example.com',
  app_metadata: {},
  user_metadata: { fullName: 'Test User' },
  aud: 'authenticated',
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
  role: 'authenticated',
  confirmed_at: '2024-01-01T00:00:00.000Z',
};

const createQueryBuilder = () => {
  const builder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    then: vi.fn((resolve) => resolve({ data: null, error: null })),
  };
  return builder;
};

export const mockSupabaseClient = {
  auth: {
    getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    onAuthStateChange: vi.fn().mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    }),
  },
  from: vi.fn((table: string) => createQueryBuilder()),
  rpc: vi.fn(),
  functions: {
    invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
};

// Helper to set up different auth states
export const setupAuthState = (authState: 'authenticated' | 'unauthenticated' | 'error') => {
  switch (authState) {
    case 'authenticated':
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: { access_token: 'test-token', refresh_token: 'test-refresh' } },
        error: null,
      });
      break;
    case 'unauthenticated':
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });
      break;
    case 'error':
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Auth error', name: 'AuthError' },
      });
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid credentials', name: 'AuthError' },
      });
      break;
  }
};

// Mock the supabase client creation
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}));

// Mock the actual supabase module
vi.mock('@/core/api/supabase', () => ({
  supabase: mockSupabaseClient,
  getCurrentUser: vi.fn().mockResolvedValue({
    id: 'test-user-id',
    email: 'test@example.com',
    fullName: 'Test User',
    avatarUrl: null,
    isPro: false,
    onboardingStatus: {
      hasCompletedOnboarding: true,
      createdFirstJournal: false,
      createdFirstMoodboard: false,
      generatedAISummary: false,
    },
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  }),
  signOut: vi.fn().mockResolvedValue(undefined),
  signIn: vi.fn().mockImplementation((email: string, password: string) => 
    mockSupabaseClient.auth.signInWithPassword({ email, password })
  ),
  signUp: vi.fn().mockImplementation((email: string, password: string) => 
    mockSupabaseClient.auth.signUp({ email, password })
  ),
}));