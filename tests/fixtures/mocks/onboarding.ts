import { vi } from 'vitest';

vi.mock('@/core/api/onboarding', () => ({
  updateOnboardingProgress: vi.fn().mockResolvedValue({
    hasCompletedOnboarding: true,
    createdFirstJournal: true,
    createdFirstMoodboard: false,
    generatedAISummary: false,
  }),
  getOnboardingStatus: vi.fn().mockResolvedValue({
    hasCompletedOnboarding: false,
    createdFirstJournal: false,
    createdFirstMoodboard: false,
    generatedAISummary: false,
  }),
}));