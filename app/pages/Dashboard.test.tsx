import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Dashboard from './Dashboard';
import { useRequireProPlan } from '../shared/hooks/useRequireProPlan';
import { supabase } from '../core/api/supabase';
import * as navigation from '../shared/utils/navigation';

// Mock dependencies
vi.mock('../shared/hooks/useRequireProPlan');
vi.mock('../core/api/supabase');
vi.mock('../shared/utils/errorTracking', () => ({
  errorTracker: {
    trackError: vi.fn()
  }
}));

// Mock navigation utilities
vi.mock('../shared/utils/navigation', () => ({
  safeNavigate: vi.fn()
}));

// Mock lazy-loaded components
vi.mock('../features/insights/MoodAnalyticsPanelLazy', () => ({
  default: () => <div>Mood Analytics Panel</div>
}));

vi.mock('../features/Onboarding/FirstTimeChecklist', () => ({
  default: () => <div>First Time Checklist</div>
}));

vi.mock('../features/goals/GoalsDashboard', () => ({
  default: () => <div>Goals Dashboard</div>
}));

vi.mock('../features/Subscription/SubscriptionStatus', () => ({
  default: () => <div>Subscription Status</div>
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    Link: ({ children, to }: any) => <a href={to}>{children}</a>
  };
});

describe('Dashboard', () => {
  let queryClient: QueryClient;
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    created_at: new Date().toISOString(),
    user_metadata: {
      name: 'Test User'
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    // Setup default mocks
    (useRequireProPlan as any).mockReturnValue({
      isProActive: true,
      isLoading: false,
      user: mockUser,
      hasActiveSubscription: true
    });

    (supabase.from as any).mockImplementation((table: string) => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      data: [],
      error: null
    }));
  });

  const renderDashboard = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      </QueryClientProvider>
    );
  };

  describe('Quick Actions', () => {
    it('should render all three quick actions with correct icons', async () => {
      renderDashboard();

      await waitFor(() => {
        // Check for Vision Board action
        expect(screen.getByText('Create Vision Board')).toBeTruthy();
        expect(screen.getByText('Design your AI-powered vision board')).toBeTruthy();

        // Check for Journal Entry action
        expect(screen.getByText('Write Journal Entry')).toBeTruthy();
        expect(screen.getByText('Capture your thoughts and progress')).toBeTruthy();

        // Check for Insights action
        expect(screen.getByText('View Insights')).toBeTruthy();
        expect(screen.getByText('Analyze your growth patterns')).toBeTruthy();
      });
    });

    it('should navigate to moodboard when Create Vision Board is clicked', async () => {
      renderDashboard();

      await waitFor(() => {
        const visionBoardCard = screen.getByText('Create Vision Board').closest('div[class*="card"]');
        expect(visionBoardCard).toBeTruthy();
        fireEvent.click(visionBoardCard!);
      });

      expect(navigation.safeNavigate).toHaveBeenCalledWith(
        mockNavigate,
        '/moodboard',
        { requireAuth: true, requirePro: true }
      );
    });

    it('should navigate to journal when Write Journal Entry is clicked', async () => {
      renderDashboard();

      await waitFor(() => {
        const journalCard = screen.getByText('Write Journal Entry').closest('div[class*="card"]');
        expect(journalCard).toBeTruthy();
        fireEvent.click(journalCard!);
      });

      expect(navigation.safeNavigate).toHaveBeenCalledWith(
        mockNavigate,
        '/journal',
        { requireAuth: true, requirePro: true }
      );
    });

    it('should navigate to insights when View Insights is clicked', async () => {
      renderDashboard();

      await waitFor(() => {
        const insightsCard = screen.getByText('View Insights').closest('div[class*="card"]');
        expect(insightsCard).toBeTruthy();
        fireEvent.click(insightsCard!);
      });

      expect(navigation.safeNavigate).toHaveBeenCalledWith(
        mockNavigate,
        '/insights',
        { requireAuth: true, requirePro: true }
      );
    });

    it('should apply correct color classes to quick action icons', async () => {
      renderDashboard();

      await waitFor(() => {
        // Check for color classes
        const visionBoardCard = screen.getByText('Create Vision Board').closest('div[class*="card"]');
        const iconContainer = visionBoardCard?.querySelector('div[class*="bg-purple-100"]');
        expect(iconContainer).toBeTruthy();

        const journalCard = screen.getByText('Write Journal Entry').closest('div[class*="card"]');
        const journalIconContainer = journalCard?.querySelector('div[class*="bg-blue-100"]');
        expect(journalIconContainer).toBeTruthy();

        const insightsCard = screen.getByText('View Insights').closest('div[class*="card"]');
        const insightsIconContainer = insightsCard?.querySelector('div[class*="bg-green-100"]');
        expect(insightsIconContainer).toBeTruthy();
      });
    });

    it('should have hover effect on quick action cards', async () => {
      renderDashboard();

      await waitFor(() => {
        const visionBoardCard = screen.getByText('Create Vision Board').closest('div[class*="card"]');
        expect(visionBoardCard?.className).toContain('hover:scale-105');
        expect(visionBoardCard?.className).toContain('transition-transform');
        expect(visionBoardCard?.className).toContain('cursor-pointer');
      });
    });
  });

  describe('Activity Feed', () => {
    beforeEach(() => {
      // Mock fetch for activity feed
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          activities: [
            {
              id: '1',
              type: 'journal_entry',
              action: 'created',
              reference_id: 'journal-1',
              title: 'Created a new journal entry',
              description: 'Reflected on daily progress',
              metadata: {},
              created_at: new Date().toISOString(),
              icon: '📝',
              color: 'text-green-600',
              timeAgo: '2h ago'
            },
            {
              id: '2',
              type: 'moodboard',
              action: 'updated',
              reference_id: 'board-1',
              title: 'Updated vision board',
              description: 'Added new goals',
              metadata: {},
              created_at: new Date().toISOString(),
              icon: '🎨',
              color: 'text-blue-600',
              timeAgo: '5h ago'
            },
            {
              id: '3',
              type: 'goal',
              action: 'completed',
              reference_id: 'goal-1',
              title: 'Completed a goal',
              description: 'Finished morning routine challenge',
              metadata: {},
              created_at: new Date().toISOString(),
              icon: '🎯',
              color: 'text-purple-600',
              timeAgo: '1d ago'
            }
          ],
          hasMore: false
        })
      });

      // Mock supabase auth session
      (supabase.auth.getSession as any).mockResolvedValue({
        data: {
          session: {
            access_token: 'test-token'
          }
        }
      });
    });

    it('should render activity items with proper Lucide icons instead of emojis', async () => {
      // Set up mocks to show we have activity
      (supabase.from as any).mockImplementation((table: string) => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        data: table === 'journal_entries' ? [{ id: '1' }] : [],
        error: null
      }));

      renderDashboard();

      await waitFor(() => {
        // Activities should be rendered with proper titles
        expect(screen.getByText('Created a new journal entry')).toBeTruthy();
        expect(screen.getByText('Updated vision board')).toBeTruthy();
        expect(screen.getByText('Completed a goal')).toBeTruthy();
      });

      // Check that icon containers exist with proper gradient backgrounds
      await waitFor(() => {
        const activityItems = screen.getAllByText(/ago$/).map(el => el.closest('div[class*="flex items-start"]'));
        
        activityItems.forEach(item => {
          const iconContainer = item?.querySelector('div[class*="rounded-full"]');
          expect(iconContainer).toBeTruthy();
          // Should have gradient background classes
          expect(iconContainer?.className).toMatch(/bg-gradient-to-br|from-.*to-.*/);
        });
      });
    });

    it('should navigate to correct pages when activity items are clicked', async () => {
      (supabase.from as any).mockImplementation((table: string) => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        data: table === 'journal_entries' ? [{ id: '1' }] : [],
        error: null
      }));

      renderDashboard();

      await waitFor(() => {
        const journalActivity = screen.getByText('Created a new journal entry').closest('div[class*="cursor-pointer"]');
        expect(journalActivity).toBeTruthy();
        fireEvent.click(journalActivity!);
      });

      expect(mockNavigate).toHaveBeenCalledWith('/journal/journal-1');
    });

    it('should apply correct color classes based on activity action', async () => {
      (supabase.from as any).mockImplementation((table: string) => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        data: table === 'journal_entries' ? [{ id: '1' }] : [],
        error: null
      }));

      renderDashboard();

      await waitFor(() => {
        // Check that activities are rendered
        expect(screen.getByText('Created a new journal entry')).toBeTruthy();
      });

      // Activity items should have action-specific colors
      const activityContainers = screen.getAllByText(/ago$/).map(el => 
        el.closest('div[class*="flex items-start"]')?.querySelector('div[class*="rounded-full"]')
      );

      // At least one should have color classes
      const hasColorClasses = activityContainers.some(container => 
        container?.className.includes('text-') || 
        container?.className.includes('from-') ||
        container?.className.includes('to-')
      );
      expect(hasColorClasses).toBe(true);
    });

    it('should show empty state when no activities exist', async () => {
      // Mock no activities
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          activities: [],
          hasMore: false
        })
      });

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(/Start your journey/i)).toBeTruthy();
        expect(screen.getByText('Create Your First Vision Board')).toBeTruthy();
      });
    });
  });

  describe('Loading and Error States', () => {
    it('should show loading state initially', () => {
      (useRequireProPlan as any).mockReturnValue({
        isProActive: false,
        isLoading: true,
        user: null,
        hasActiveSubscription: false
      });

      renderDashboard();

      expect(screen.getByText('Loading your data...')).toBeTruthy();
    });

    it('should show error state when data fails to load', async () => {
      (supabase.from as any).mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        data: null,
        error: new Error('Failed to fetch')
      }));

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('Error Loading Dashboard')).toBeTruthy();
        expect(screen.getByText('Try Again')).toBeTruthy();
      });
    });
  });

  describe('Upgrade Prompt', () => {
    it('should show upgrade prompt for non-Pro users', async () => {
      (useRequireProPlan as any).mockReturnValue({
        isProActive: false,
        isLoading: false,
        user: mockUser,
        hasActiveSubscription: false
      });

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(/Unlock Premium Features/i)).toBeTruthy();
        expect(screen.getByText('Upgrade to Pro')).toBeTruthy();
      });
    });

    it('should navigate to pricing when upgrade is clicked', async () => {
      (useRequireProPlan as any).mockReturnValue({
        isProActive: false,
        isLoading: false,
        user: mockUser,
        hasActiveSubscription: false
      });

      renderDashboard();

      await waitFor(() => {
        const upgradeButton = screen.getByText('Upgrade to Pro');
        fireEvent.click(upgradeButton);
      });

      expect(mockNavigate).toHaveBeenCalledWith('/pricing');
    });
  });
});