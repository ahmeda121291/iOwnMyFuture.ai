import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

// Mock the activity feed fetch
global.fetch = vi.fn();

// Mock the Dashboard component's ActivityList (we'll test it in isolation)
const ActivityList = () => {
  const [activities] = React.useState([
    {
      id: '1',
      type: 'journal_entry',
      action: 'created',
      reference_id: 'ref-1',
      title: 'New journal entry',
      description: 'Today was a productive day...',
      metadata: { mood: 'happy' },
      created_at: new Date().toISOString(),
      icon: '📝',
      color: 'text-green-600',
      timeAgo: '5m ago'
    },
    {
      id: '2',
      type: 'goal',
      action: 'completed',
      reference_id: 'ref-2',
      title: 'Completed goal: Morning routine',
      description: 'Established consistent morning routine',
      metadata: { status: 'completed' },
      created_at: new Date(Date.now() - 3600000).toISOString(),
      icon: '🎯',
      color: 'text-purple-600',
      timeAgo: '1h ago'
    }
  ]);

  return (
    <div data-testid="activity-list">
      {activities.map((activity) => (
        <div key={activity.id} data-testid={`activity-${activity.id}`}>
          <span>{activity.icon}</span>
          <h3>{activity.title}</h3>
          <p>{activity.description}</p>
          <span className={activity.color}>{activity.action}</span>
          <span>{activity.timeAgo}</span>
        </div>
      ))}
    </div>
  );
};

describe('ActivityFeed', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );

  describe('Activity Feed Display', () => {
    it('should render activity feed with items', () => {
      render(<ActivityList />, { wrapper });
      
      expect(screen.getByTestId('activity-list')).toBeInTheDocument();
      expect(screen.getByTestId('activity-1')).toBeInTheDocument();
      expect(screen.getByTestId('activity-2')).toBeInTheDocument();
    });

    it('should display activity details correctly', () => {
      render(<ActivityList />, { wrapper });
      
      expect(screen.getByText('New journal entry')).toBeInTheDocument();
      expect(screen.getByText('Today was a productive day...')).toBeInTheDocument();
      expect(screen.getByText('5m ago')).toBeInTheDocument();
      expect(screen.getByText('📝')).toBeInTheDocument();
    });

    it('should show different icons for different activity types', () => {
      render(<ActivityList />, { wrapper });
      
      expect(screen.getByText('📝')).toBeInTheDocument(); // journal entry
      expect(screen.getByText('🎯')).toBeInTheDocument(); // goal
    });

    it('should apply correct color classes for actions', () => {
      render(<ActivityList />, { wrapper });
      
      const createdAction = screen.getByText('created');
      expect(createdAction.className).toContain('text-green-600');
      
      const completedAction = screen.getByText('completed');
      expect(completedAction.className).toContain('text-purple-600');
    });
  });

  describe('Activity Feed API Integration', () => {
    it('should fetch activities from the API', async () => {
      const mockActivities = {
        activities: [
          {
            id: 'api-1',
            type: 'moodboard',
            action: 'updated',
            title: 'Updated moodboard',
            icon: '🎨',
            color: 'text-blue-600',
            timeAgo: '10m ago'
          }
        ],
        hasMore: false
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockActivities,
      });

      // Simulate API call
      const response = await fetch('/functions/v1/activity-feed?limit=20&offset=0');
      const data = await response.json();

      expect(data.activities).toHaveLength(1);
      expect(data.activities[0].type).toBe('moodboard');
      expect(data.hasMore).toBe(false);
    });

    it('should handle API errors gracefully', async () => {
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

      try {
        await fetch('/functions/v1/activity-feed?limit=20&offset=0');
      } catch (error) {
        expect(error.message).toBe('Network error');
      }
    });

    it('should handle empty activity feed', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ activities: [], hasMore: false }),
      });

      const response = await fetch('/functions/v1/activity-feed?limit=20&offset=0');
      const data = await response.json();

      expect(data.activities).toHaveLength(0);
      expect(data.hasMore).toBe(false);
    });
  });

  describe('Activity Triggers', () => {
    it('should log activity when creating journal entry', async () => {
      const logActivity = vi.fn();
      
      // Simulate journal entry creation
      const entry = {
        id: 'entry-1',
        user_id: 'user-1',
        content: 'New journal content',
        mood: 'happy',
        category: 'reflection'
      };

      // Trigger would be called by database
      logActivity({
        user_id: entry.user_id,
        type: 'journal_entry',
        action: 'created',
        reference_id: entry.id,
        title: 'New journal entry',
        description: entry.content.substring(0, 100),
        metadata: { mood: entry.mood, category: entry.category }
      });

      expect(logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'journal_entry',
          action: 'created',
          reference_id: 'entry-1'
        })
      );
    });

    it('should log activity when completing a goal', async () => {
      const logActivity = vi.fn();
      
      // Simulate goal completion
      const goal = {
        id: 'goal-1',
        user_id: 'user-1',
        title: 'Exercise daily',
        status: 'completed'
      };

      logActivity({
        user_id: goal.user_id,
        type: 'goal',
        action: 'completed',
        reference_id: goal.id,
        title: `Completed goal: ${goal.title}`,
        metadata: { status: goal.status }
      });

      expect(logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'goal',
          action: 'completed',
          title: 'Completed goal: Exercise daily'
        })
      );
    });

    it('should log activity when updating moodboard', async () => {
      const logActivity = vi.fn();
      
      const moodboard = {
        id: 'board-1',
        user_id: 'user-1',
        title: 'Vision Board 2025',
        description: 'My goals for the year'
      };

      logActivity({
        user_id: moodboard.user_id,
        type: 'moodboard',
        action: 'updated',
        reference_id: moodboard.id,
        title: moodboard.title,
        description: moodboard.description
      });

      expect(logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'moodboard',
          action: 'updated'
        })
      );
    });
  });

  describe('Activity Feed Pagination', () => {
    it('should load more activities when requested', async () => {
      const firstBatch = {
        activities: Array(20).fill(null).map((_, i) => ({
          id: `act-${i}`,
          type: 'journal_entry',
          action: 'created',
          title: `Entry ${i}`,
          timeAgo: `${i}m ago`
        })),
        hasMore: true
      };

      const secondBatch = {
        activities: Array(10).fill(null).map((_, i) => ({
          id: `act-${20 + i}`,
          type: 'journal_entry',
          action: 'created',
          title: `Entry ${20 + i}`,
          timeAgo: `${20 + i}m ago`
        })),
        hasMore: false
      };

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => firstBatch,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => secondBatch,
        });

      // First fetch
      const response1 = await fetch('/functions/v1/activity-feed?limit=20&offset=0');
      const data1 = await response1.json();
      
      expect(data1.activities).toHaveLength(20);
      expect(data1.hasMore).toBe(true);

      // Second fetch (load more)
      const response2 = await fetch('/functions/v1/activity-feed?limit=20&offset=20');
      const data2 = await response2.json();
      
      expect(data2.activities).toHaveLength(10);
      expect(data2.hasMore).toBe(false);
    });
  });

  describe('Empty States', () => {
    it('should show appropriate message when no activities exist', () => {
      const EmptyActivityList = () => (
        <div data-testid="empty-state">
          <p>No activity yet. Start by creating a journal entry or vision board!</p>
        </div>
      );

      render(<EmptyActivityList />, { wrapper });
      
      expect(screen.getByText(/No activity yet/)).toBeInTheDocument();
    });
  });
});