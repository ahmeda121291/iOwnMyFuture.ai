import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VisionSnap from '@/features/moodboard/VisionSnap';
import { mockSupabaseClient } from '../../fixtures/mocks/supabase';
import { testMoodboardElement } from '../../fixtures/testData';

describe('VisionSnap', () => {
  const mockOnAddElement = vi.fn();
  const testMoodboardId = 'moodboard-123';
  const testMoodboardData = {
    elements: [testMoodboardElement],
    goals: 'Travel, Health, Career',
    preferences: 'Minimalist style',
    title: 'My Vision Board 2024',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock clipboard is already set up in vitest-setup.ts
  });

  describe('Component Rendering', () => {
    it('renders add element section', () => {
      render(
        <VisionSnap
          onAddElement={mockOnAddElement}
          moodboardId={testMoodboardId}
          moodboardData={testMoodboardData}
        />
      );

      expect(screen.getByText('Add to Board')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add text/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add goal/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add affirmation/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add quote/i })).toBeInTheDocument();
    });

    it('renders sharing section', () => {
      render(
        <VisionSnap
          onAddElement={mockOnAddElement}
          moodboardId={testMoodboardId}
          moodboardData={testMoodboardData}
        />
      );

      expect(screen.getByText('Share Your Vision')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /share to x\/twitter/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /copy link/i })).toBeInTheDocument();
    });
  });

  describe('Add Element Functionality', () => {
    it('opens text input modal when Add Text clicked', async () => {
      const user = userEvent.setup();
      render(
        <VisionSnap
          onAddElement={mockOnAddElement}
          moodboardId={testMoodboardId}
          moodboardData={testMoodboardData}
        />
      );

      await user.click(screen.getByRole('button', { name: /add text/i }));

      expect(screen.getByText('Add Text Element')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/enter your text/i)).toBeInTheDocument();
    });

    it('adds text element with custom content', async () => {
      const user = userEvent.setup();
      render(
        <VisionSnap
          onAddElement={mockOnAddElement}
          moodboardId={testMoodboardId}
          moodboardData={testMoodboardData}
        />
      );

      await user.click(screen.getByRole('button', { name: /add text/i }));
      await user.type(screen.getByPlaceholderText(/enter your text/i), 'My custom text');
      await user.click(screen.getByRole('button', { name: /add to board/i }));

      expect(mockOnAddElement).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'text',
          content: 'My custom text',
          position: expect.any(Object),
          size: expect.any(Object),
          style: expect.any(Object),
        })
      );
    });

    it('adds goal element', async () => {
      const user = userEvent.setup();
      render(
        <VisionSnap
          onAddElement={mockOnAddElement}
          moodboardId={testMoodboardId}
          moodboardData={testMoodboardData}
        />
      );

      await user.click(screen.getByRole('button', { name: /add goal/i }));
      await user.type(screen.getByPlaceholderText(/what.*goal/i), 'Learn Spanish');
      await user.click(screen.getByRole('button', { name: /add to board/i }));

      expect(mockOnAddElement).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'goal',
          content: 'Learn Spanish',
        })
      );
    });

    it('cancels adding element', async () => {
      const user = userEvent.setup();
      render(
        <VisionSnap
          onAddElement={mockOnAddElement}
          moodboardId={testMoodboardId}
          moodboardData={testMoodboardData}
        />
      );

      await user.click(screen.getByRole('button', { name: /add text/i }));
      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(mockOnAddElement).not.toHaveBeenCalled();
      expect(screen.queryByText('Add Text Element')).not.toBeInTheDocument();
    });

    it('requires content before adding', async () => {
      const user = userEvent.setup();
      render(
        <VisionSnap
          onAddElement={mockOnAddElement}
          moodboardId={testMoodboardId}
          moodboardData={testMoodboardData}
        />
      );

      await user.click(screen.getByRole('button', { name: /add text/i }));
      
      const addButton = screen.getByRole('button', { name: /add to board/i });
      expect(addButton).toBeDisabled();

      await user.type(screen.getByPlaceholderText(/enter your text/i), 'Content');
      expect(addButton).not.toBeDisabled();
    });
  });

  describe('Sharing Functionality', () => {
    const _mockShareUrl = 'https://app.com/share/snapshot-123';

    beforeEach(() => {
      mockSupabaseClient.from.mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'snapshot-123' },
          error: null,
        }),
      });
    });

    it('creates public snapshot and shares to Twitter', async () => {
      const user = userEvent.setup();
      const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

      render(
        <VisionSnap
          onAddElement={mockOnAddElement}
          moodboardId={testMoodboardId}
          moodboardData={testMoodboardData}
        />
      );

      await user.click(screen.getByRole('button', { name: /share to x\/twitter/i }));

      await waitFor(() => {
        expect(mockSupabaseClient.from).toHaveBeenCalledWith('public_snapshots');
        expect(windowOpenSpy).toHaveBeenCalledWith(
          expect.stringContaining('https://twitter.com/intent/tweet'),
          '_blank'
        );
      });

      windowOpenSpy.mockRestore();
    });

    it('copies share link to clipboard', async () => {
      const user = userEvent.setup();
      
      render(
        <VisionSnap
          onAddElement={mockOnAddElement}
          moodboardId={testMoodboardId}
          moodboardData={testMoodboardData}
        />
      );

      await user.click(screen.getByRole('button', { name: /copy link/i }));

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
          expect.stringContaining('/share/')
        );
        expect(screen.getByText('Link copied!')).toBeInTheDocument();
      });
    });

    it('shows sharing state while creating snapshot', async () => {
      const user = userEvent.setup();
      
      // Make the API call hang
      mockSupabaseClient.from.mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockImplementation(
          () => new Promise(resolve => setTimeout(resolve, 1000))
        ),
      });

      render(
        <VisionSnap
          onAddElement={mockOnAddElement}
          moodboardId={testMoodboardId}
          moodboardData={testMoodboardData}
        />
      );

      await user.click(screen.getByRole('button', { name: /share to x\/twitter/i }));

      expect(screen.getByRole('button', { name: /sharing/i })).toBeDisabled();
    });

    it('handles sharing error gracefully', async () => {
      const user = userEvent.setup();
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      mockSupabaseClient.from.mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Failed to create snapshot' },
        }),
      });

      render(
        <VisionSnap
          onAddElement={mockOnAddElement}
          moodboardId={testMoodboardId}
          moodboardData={testMoodboardData}
        />
      );

      await user.click(screen.getByRole('button', { name: /share to x\/twitter/i }));

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Failed to create share link. Please try again.');
      });

      alertSpy.mockRestore();
    });

    it('includes moodboard data in snapshot', async () => {
      const user = userEvent.setup();
      
      let capturedData: unknown;
      mockSupabaseClient.from.mockReturnValue({
        insert: vi.fn().mockImplementation((data) => {
          capturedData = data;
          return {
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: 'snapshot-123' },
              error: null,
            }),
          };
        }),
      });

      render(
        <VisionSnap
          onAddElement={mockOnAddElement}
          moodboardId={testMoodboardId}
          moodboardData={testMoodboardData}
        />
      );

      await user.click(screen.getByRole('button', { name: /copy link/i }));

      await waitFor(() => {
        expect(capturedData).toMatchObject({
          moodboard_id: testMoodboardId,
          snapshot_data: testMoodboardData,
          title: 'My Vision Board 2024',
        });
      });
    });
  });

  describe('Quick Add Templates', () => {
    it('provides preset options for different element types', async () => {
      const user = userEvent.setup();
      render(
        <VisionSnap
          onAddElement={mockOnAddElement}
          moodboardId={testMoodboardId}
          moodboardData={testMoodboardData}
        />
      );

      // Check affirmation
      await user.click(screen.getByRole('button', { name: /add affirmation/i }));
      expect(screen.getByText('Add Affirmation')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/i am/i)).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: /cancel/i }));

      // Check quote
      await user.click(screen.getByRole('button', { name: /add quote/i }));
      expect(screen.getByText('Add Quote')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/inspiring quote/i)).toBeInTheDocument();
    });

    it('applies appropriate styling for each element type', async () => {
      const user = userEvent.setup();
      render(
        <VisionSnap
          onAddElement={mockOnAddElement}
          moodboardId={testMoodboardId}
          moodboardData={testMoodboardData}
        />
      );

      // Add affirmation
      await user.click(screen.getByRole('button', { name: /add affirmation/i }));
      await user.type(screen.getByPlaceholderText(/i am/i), 'I am confident');
      await user.click(screen.getByRole('button', { name: /add to board/i }));

      expect(mockOnAddElement).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'affirmation',
          content: 'I am confident',
          style: expect.objectContaining({
            backgroundColor: expect.stringContaining('rgba'),
          }),
        })
      );
    });
  });
});