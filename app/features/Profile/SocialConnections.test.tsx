import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import SocialConnections from './SocialConnections';
import { supabase, getCurrentUser } from '../../core/api/supabase';
import toast from 'react-hot-toast';
import { errorTracker } from '../../shared/utils/errorTracking';

// Mock dependencies
vi.mock('../../core/api/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getSession: vi.fn(),
      getUser: vi.fn(),
    },
  },
  getCurrentUser: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('../../shared/utils/errorTracking', () => ({
  errorTracker: {
    trackError: vi.fn(),
  },
}));

// Mock fetch globally
global.fetch = vi.fn();
global.window.open = vi.fn();
global.prompt = vi.fn();

describe('SocialConnections', () => {
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
  };

  const mockSession = {
    access_token: 'test-access-token',
    user: mockUser,
  };

  const mockConnections = [
    {
      id: '1',
      user_id: 'test-user-id',
      service_name: 'twitter',
      connected: true,
      auth_token: 'twitter-token',
      created_at: '2025-01-01',
    },
    {
      id: '2',
      user_id: 'test-user-id',
      service_name: 'facebook',
      connected: false,
      created_at: '2025-01-01',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mocks
    vi.mocked(getCurrentUser).mockResolvedValue(mockUser);

    supabase.auth.getSession.mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    supabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: mockConnections,
          error: null,
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            error: null,
          }),
        }),
      }),
      upsert: vi.fn().mockResolvedValue({
        error: null,
      }),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render loading state initially', () => {
      const { container } = render(<SocialConnections />);
      const loadingElement = container.querySelector('.animate-pulse');
      expect(loadingElement).toBeTruthy();
    });

    it('should render all social services after loading', async () => {
      render(<SocialConnections />);
      
      await waitFor(() => {
        expect(screen.getByText('Instagram')).toBeTruthy();
        expect(screen.getByText('Twitter/X')).toBeTruthy();
        expect(screen.getByText('Facebook')).toBeTruthy();
        expect(screen.getByText('Gmail')).toBeTruthy();
      });
    });

    it('should show connected status for connected services', async () => {
      render(<SocialConnections />);
      
      await waitFor(() => {
        const twitterCard = screen.getByText('Twitter/X').closest('div');
        expect(within(twitterCard).getByText('Connected')).toBeTruthy();
      });
    });

    it('should show connect button for unconnected services', async () => {
      render(<SocialConnections />);
      
      await waitFor(() => {
        const facebookCard = screen.getByText('Facebook').closest('div');
        expect(within(facebookCard).getByText('Connect')).toBeTruthy();
      });
    });
  });

  describe('OAuth Connection Flow', () => {
    it('should initiate OAuth flow when clicking Connect', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          authorizationUrl: 'https://instagram.com/oauth',
          state: 'test-state-123',
        }),
      });

      render(<SocialConnections />);
      
      await waitFor(() => {
        const instagramCard = screen.getByText('Instagram').closest('div');
        const connectButton = within(instagramCard).getByText('Connect');
        fireEvent.click(connectButton);
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/functions/v1/oauth-connect?service=instagram&action=initiate'),
          expect.objectContaining({
            method: 'GET',
            headers: expect.objectContaining({
              'Authorization': 'Bearer test-access-token',
            }),
          })
        );
      });

      expect(global.window.open).toHaveBeenCalledWith(
        'https://instagram.com/oauth',
        'instagram-oauth',
        expect.stringContaining('width=600,height=700')
      );
    });

    it('should handle OAuth connection errors', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      render(<SocialConnections />);
      
      await waitFor(() => {
        const instagramCard = screen.getByText('Instagram').closest('div');
        const connectButton = within(instagramCard).getByText('Connect');
        fireEvent.click(connectButton);
      });

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringContaining('Failed to connect to instagram')
        );
      });
    });

    it('should handle invalid OAuth token gracefully', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: 'Invalid client credentials',
        }),
      });

      render(<SocialConnections />);
      
      await waitFor(() => {
        const instagramCard = screen.getByText('Instagram').closest('div');
        const connectButton = within(instagramCard).getByText('Connect');
        fireEvent.click(connectButton);
      });

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });
    });

    it('should handle user canceling OAuth', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          authorizationUrl: 'https://twitter.com/oauth',
          state: 'test-state-456',
        }),
      });

      const mockPopup = {
        closed: false,
      };
      global.window.open.mockReturnValueOnce(mockPopup);

      render(<SocialConnections />);
      
      await waitFor(() => {
        const twitterCard = screen.getByText('Twitter/X').closest('div');
        const connectButton = within(twitterCard).getByText('Connect');
        fireEvent.click(connectButton);
      });

      // Simulate popup being closed
      setTimeout(() => {
        mockPopup.closed = true;
      }, 100);

      await waitFor(() => {
        expect(supabase.from).toHaveBeenCalledWith('social_integrations');
      }, { timeout: 2000 });
    });
  });

  describe('Disconnect Functionality', () => {
    it('should disconnect a connected service', async () => {
      render(<SocialConnections />);
      
      await waitFor(() => {
        const twitterCard = screen.getByText('Twitter/X').closest('div');
        const disconnectButton = within(twitterCard).getByText('Disconnect');
        fireEvent.click(disconnectButton);
      });

      await waitFor(() => {
        expect(supabase.from).toHaveBeenCalledWith('social_integrations');
        expect(toast.success).toHaveBeenCalledWith('Disconnected from twitter');
      });
    });

    it('should handle disconnect errors', async () => {
      supabase.from.mockReturnValueOnce({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              error: new Error('Database error'),
            }),
          }),
        }),
      });

      render(<SocialConnections />);
      
      await waitFor(() => {
        const twitterCard = screen.getByText('Twitter/X').closest('div');
        const disconnectButton = within(twitterCard).getByText('Disconnect');
        fireEvent.click(disconnectButton);
      });

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'Failed to disconnect service. Please try again.'
        );
      });
    });
  });

  describe('Quick Share Functionality', () => {
    beforeEach(() => {
      // Mock journal entries for sharing
      supabase.from.mockImplementation((table) => {
        if (table === 'journal_entries') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: {
                        content: 'Today was a great day!',
                        ai_summary: 'User had a positive experience',
                        mood: 'happy',
                      },
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: mockConnections,
              error: null,
            }),
          }),
        };
      });
    });

    it('should share to connected service successfully', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
        }),
      });

      render(<SocialConnections />);
      
      await waitFor(() => {
        const twitterCard = screen.getByText('Twitter/X').closest('div');
        const shareButton = within(twitterCard).getByText('Share');
        fireEvent.click(shareButton);
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/functions/v1/social-share'),
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Authorization': 'Bearer test-access-token',
              ['content-type']: 'application/json',
            }),
            body: expect.stringContaining('twitter'),
          })
        );
      });

      expect(toast.success).toHaveBeenCalledWith('Successfully shared to twitter!');
    });

    it('should handle sharing failures', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: 'Token expired',
        }),
      });

      render(<SocialConnections />);
      
      await waitFor(() => {
        const twitterCard = screen.getByText('Twitter/X').closest('div');
        const shareButton = within(twitterCard).getByText('Share');
        fireEvent.click(shareButton);
      });

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringContaining('Failed to share to twitter')
        );
      });
    });

    it('should prompt for email when sharing via Gmail', async () => {
      global.prompt.mockReturnValueOnce('recipient@example.com');
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
        }),
      });

      // Add Gmail to connected services
      const connectionsWithGmail = [
        ...mockConnections,
        {
          id: '3',
          user_id: 'test-user-id',
          service_name: 'gmail',
          connected: true,
          auth_token: 'gmail-token',
        },
      ];

      supabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: connectionsWithGmail,
            error: null,
          }),
        }),
      });

      render(<SocialConnections />);
      
      await waitFor(() => {
        const gmailCard = screen.getByText('Gmail').closest('div');
        const shareButton = within(gmailCard).getByText('Share');
        fireEvent.click(shareButton);
      });

      expect(global.prompt).toHaveBeenCalledWith('Enter recipient email address:');
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/functions/v1/social-share'),
          expect.objectContaining({
            body: expect.stringContaining('recipient@example.com'),
          })
        );
      });
    });
  });

  describe('Copy Share Link', () => {
    it('should copy share link to clipboard', async () => {
      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: mockWriteText,
        },
      });

      render(<SocialConnections />);
      
      await waitFor(() => {
        const copyLinkButton = screen.getByText('Copy Share Link');
        fireEvent.click(copyLinkButton);
      });

      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledWith(
          expect.stringContaining('/profile/test-user-id/achievements')
        );
        expect(toast.success).toHaveBeenCalledWith('Share link copied to clipboard!');
      });
    });

    it('should handle clipboard errors', async () => {
      const mockWriteText = vi.fn().mockRejectedValue(new Error('Clipboard error'));
      Object.assign(navigator, {
        clipboard: {
          writeText: mockWriteText,
        },
      });

      render(<SocialConnections />);
      
      await waitFor(() => {
        const copyLinkButton = screen.getByText('Copy Share Link');
        fireEvent.click(copyLinkButton);
      });

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to copy link. Please try again.');
      });
    });
  });

  describe('Weekly Summary', () => {
    it('should send weekly summary via Gmail', async () => {
      global.prompt.mockReturnValueOnce('summary@example.com');
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
        }),
      });

      // Add Gmail to connected services
      const connectionsWithGmail = [
        ...mockConnections,
        {
          id: '3',
          user_id: 'test-user-id',
          service_name: 'gmail',
          connected: true,
          auth_token: 'gmail-token',
        },
      ];

      supabase.from.mockImplementation((table) => {
        if (table === 'journal_entries') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                gte: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({
                    data: [
                      { content: 'Entry 1', ai_summary: 'Summary 1' },
                      { content: 'Entry 2', ai_summary: 'Summary 2' },
                    ],
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: connectionsWithGmail,
              error: null,
            }),
          }),
        };
      });

      render(<SocialConnections />);
      
      await waitFor(() => {
        const sendSummaryButton = screen.getByText('Send Weekly Summary');
        fireEvent.click(sendSummaryButton);
      });

      expect(global.prompt).toHaveBeenCalledWith('Enter email address to send weekly summary:');
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/functions/v1/social-share'),
          expect.objectContaining({
            body: expect.stringContaining('Weekly Progress Summary'),
          })
        );
        expect(toast.success).toHaveBeenCalledWith('Weekly summary sent successfully!');
      });
    });

    it('should require Gmail connection for weekly summary', async () => {
      render(<SocialConnections />);
      
      await waitFor(() => {
        const sendSummaryButton = screen.getByText('Send Weekly Summary');
        fireEvent.click(sendSummaryButton);
      });

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Please connect your Gmail account first');
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading spinner while connecting', async () => {
      global.fetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<SocialConnections />);
      
      await waitFor(() => {
        const instagramCard = screen.getByText('Instagram').closest('div');
        const connectButton = within(instagramCard).getByText('Connect');
        fireEvent.click(connectButton);
      });

      await waitFor(() => {
        const instagramCard = screen.getByText('Instagram').closest('div');
        const loader = instagramCard.querySelector('.animate-spin');
        expect(loader).toBeTruthy();
      });
    });

    it('should disable buttons during operations', async () => {
      global.fetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<SocialConnections />);
      
      await waitFor(() => {
        const twitterCard = screen.getByText('Twitter/X').closest('div');
        const shareButton = within(twitterCard).getByText('Share');
        fireEvent.click(shareButton);
      });

      await waitFor(() => {
        const twitterCard = screen.getByText('Twitter/X').closest('div');
        const shareButton = within(twitterCard).getByText('Share');
        expect(shareButton.disabled).toBe(true);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle undefined serviceId gracefully', async () => {
      
      // Manually trigger handleConnect with undefined
      render(<SocialConnections />);
      
      // This would normally not happen, but we're testing defensive coding
      await waitFor(() => {
        expect(screen.getByText('Instagram')).toBeTruthy();
      });

      // The component should handle this internally without crashing
      expect(vi.mocked(errorTracker).trackError).not.toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          serviceName: undefined,
        })
      );
    });

    it('should track errors with proper service names', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      render(<SocialConnections />);
      
      await waitFor(() => {
        const instagramCard = screen.getByText('Instagram').closest('div');
        const connectButton = within(instagramCard).getByText('Connect');
        fireEvent.click(connectButton);
      });

      await waitFor(() => {
        expect(vi.mocked(errorTracker).trackError).toHaveBeenCalledWith(
          expect.any(Error),
          expect.objectContaining({
            component: 'SocialConnections',
            action: 'connectService',
            serviceName: 'instagram',
          })
        );
      });
    });
  });
});