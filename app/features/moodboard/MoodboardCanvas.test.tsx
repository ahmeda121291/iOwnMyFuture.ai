import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import MoodboardCanvas from './MoodboardCanvas';
import { useCSRFToken } from '../../shared/security/csrf';
import toast from 'react-hot-toast';

// Mock dependencies
vi.mock('../../shared/security/csrf', () => ({
  useCSRFToken: vi.fn(),
  createSecureFormData: vi.fn(),
}));

vi.mock('../../core/api/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
  },
}));

vi.mock('html2canvas', () => ({
  default: vi.fn(() => Promise.resolve({
    toBlob: (callback: (blob: Blob) => void) => {
      callback(new Blob(['mock-image'], { type: 'image/png' }));
    },
  })),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock fetch globally
global.fetch = vi.fn();

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = vi.fn();

describe('MoodboardCanvas', () => {
  const mockElements = [
    {
      id: '1',
      type: 'text' as const,
      content: 'Test Element',
      position: { x: 100, y: 100 },
      size: { width: 200, height: 150 },
      style: {},
    },
  ];

  const mockProps = {
    elements: mockElements,
    onElementsChange: vi.fn(),
    onSave: vi.fn(),
    isEditable: true,
    moodboardId: 'test-board-id',
    title: 'Test Vision Board',
    description: 'Test Description',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mocks
    (useCSRFToken as any).mockReturnValue({
      getToken: vi.fn().mockResolvedValue('test-csrf-token'),
    });

    const { supabase } = require('../../core/api/supabase');
    supabase.auth.getSession.mockResolvedValue({
      data: {
        session: {
          access_token: 'test-access-token',
        },
      },
    });

    const { createSecureFormData } = require('../../shared/security/csrf');
    createSecureFormData.mockResolvedValue({
      csrfToken: 'test-csrf-token',
      data: 'secure-data',
    });
  });

  describe('Secure Save Functionality', () => {
    it('should render save button', () => {
      render(<MoodboardCanvas {...mockProps} />);
      
      expect(screen.getByText('Save Board')).toBeInTheDocument();
    });

    it('should handle secure save with CSRF token', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          success: true, 
          moodboard: { id: 'test-board-id' } 
        }),
      });

      render(<MoodboardCanvas {...mockProps} />);
      
      const saveButton = screen.getByText('Save Board');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/functions/v1/moodboard-save'),
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Authorization': 'Bearer test-access-token',
              'Content-Type': 'application/json',
            }),
            body: expect.stringContaining('test-csrf-token'),
          })
        );
      });

      expect(mockProps.onSave).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('Moodboard saved securely!');
    });

    it('should show loading state while saving', async () => {
      global.fetch = vi.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ success: true }),
        }), 100))
      );

      render(<MoodboardCanvas {...mockProps} />);
      
      const saveButton = screen.getByText('Save Board');
      fireEvent.click(saveButton);

      expect(screen.getByText('Saving...')).toBeInTheDocument();
      expect(saveButton).toBeDisabled();

      await waitFor(() => {
        expect(screen.getByText('Save Board')).toBeInTheDocument();
      });
    });

    it('should handle save errors gracefully', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Failed to save' }),
      });

      render(<MoodboardCanvas {...mockProps} />);
      
      const saveButton = screen.getByText('Save Board');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to save');
      });
    });

    it('should validate elements before saving', async () => {
      const invalidElements = [
        {
          id: '1',
          type: 'invalid' as any,
          content: '',
          position: { x: -100, y: -100 },
          size: { width: 0, height: 0 },
          style: {},
        },
      ];

      render(<MoodboardCanvas {...mockProps} elements={invalidElements} />);
      
      const saveButton = screen.getByText('Save Board');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Please fix validation errors before saving.');
      });
    });

    it('should handle CSRF token failure', async () => {
      const { getToken } = useCSRFToken();
      (getToken as any).mockResolvedValueOnce(null);

      render(<MoodboardCanvas {...mockProps} />);
      
      const saveButton = screen.getByText('Save Board');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to get CSRF token');
      });
    });
  });

  describe('Export Functionality', () => {
    it('should render export button with dropdown', () => {
      render(<MoodboardCanvas {...mockProps} />);
      
      expect(screen.getByText('Export')).toBeInTheDocument();
    });

    it('should export as PNG using html2canvas', async () => {
      const createElementSpy = vi.spyOn(document, 'createElement');
      const appendChildSpy = vi.spyOn(document.body, 'appendChild');
      const removeChildSpy = vi.spyOn(document.body, 'removeChild');

      render(<MoodboardCanvas {...mockProps} />);
      
      const exportButton = screen.getByText('Export');
      fireEvent.mouseOver(exportButton.parentElement);
      
      const pngOption = screen.getByText('As PNG');
      fireEvent.click(pngOption);

      await waitFor(() => {
        expect(createElementSpy).toHaveBeenCalledWith('a');
        expect(appendChildSpy).toHaveBeenCalled();
        expect(removeChildSpy).toHaveBeenCalled();
        expect(toast.success).toHaveBeenCalledWith('Moodboard exported as PNG!');
      });
    });

    it('should export as JSON via Edge Function', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        blob: async () => new Blob(['{"test": "data"}'], { type: 'application/json' }),
      });

      render(<MoodboardCanvas {...mockProps} />);
      
      const exportButton = screen.getByText('Export');
      fireEvent.mouseOver(exportButton.parentElement);
      
      const jsonOption = screen.getByText('As JSON');
      fireEvent.click(jsonOption);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/functions/v1/moodboard-export?moodboardId=test-board-id&format=json'),
          expect.objectContaining({
            headers: expect.objectContaining({
              'Authorization': 'Bearer test-access-token',
            }),
          })
        );
        expect(toast.success).toHaveBeenCalledWith('Moodboard exported as JSON!');
      });
    });

    it('should export as HTML via Edge Function', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        blob: async () => new Blob(['<html>test</html>'], { type: 'text/html' }),
      });

      render(<MoodboardCanvas {...mockProps} />);
      
      const exportButton = screen.getByText('Export');
      fireEvent.mouseOver(exportButton.parentElement);
      
      const htmlOption = screen.getByText('As HTML');
      fireEvent.click(htmlOption);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/functions/v1/moodboard-export?moodboardId=test-board-id&format=html'),
          expect.objectContaining({
            headers: expect.objectContaining({
              'Authorization': 'Bearer test-access-token',
            }),
          })
        );
        expect(toast.success).toHaveBeenCalledWith('Moodboard exported as HTML!');
      });
    });

    it('should show loading state while exporting', async () => {
      global.fetch = vi.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          blob: async () => new Blob(['data']),
        }), 100))
      );

      render(<MoodboardCanvas {...mockProps} />);
      
      const exportButton = screen.getByText('Export');
      fireEvent.mouseOver(exportButton.parentElement);
      
      const jsonOption = screen.getByText('As JSON');
      fireEvent.click(jsonOption);

      expect(exportButton).toBeDisabled();

      await waitFor(() => {
        expect(exportButton).not.toBeDisabled();
      });
    });

    it('should handle export errors gracefully', async () => {
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Export failed'));

      render(<MoodboardCanvas {...mockProps} />);
      
      const exportButton = screen.getByText('Export');
      fireEvent.mouseOver(exportButton.parentElement);
      
      const jsonOption = screen.getByText('As JSON');
      fireEvent.click(jsonOption);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to export moodboard');
      });
    });

    it('should require moodboard to be saved before export', async () => {
      const propsWithoutId = { ...mockProps, moodboardId: undefined };
      
      render(<MoodboardCanvas {...propsWithoutId} />);
      
      const exportButton = screen.getByText('Export');
      fireEvent.mouseOver(exportButton.parentElement);
      
      const jsonOption = screen.getByText('As JSON');
      fireEvent.click(jsonOption);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Please save the moodboard first');
      });
    });
  });

  describe('Share Functionality', () => {
    it('should render share button', () => {
      render(<MoodboardCanvas {...mockProps} />);
      
      expect(screen.getByText('Share')).toBeInTheDocument();
    });

    it('should use Web Share API if available', async () => {
      const mockShare = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'share', {
        value: mockShare,
        writable: true,
      });

      render(<MoodboardCanvas {...mockProps} />);
      
      const shareButton = screen.getByText('Share');
      fireEvent.click(shareButton);

      expect(mockShare).toHaveBeenCalledWith({
        title: 'Test Vision Board',
        text: 'Check out my vision board - visualizing my future goals and dreams!',
        url: window.location.href,
      });
    });

    it('should fallback to clipboard if Web Share API not available', async () => {
      Object.defineProperty(navigator, 'share', {
        value: undefined,
        writable: true,
      });

      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: mockWriteText },
        writable: true,
      });

      render(<MoodboardCanvas {...mockProps} />);
      
      const shareButton = screen.getByText('Share');
      fireEvent.click(shareButton);

      expect(mockWriteText).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('Vision board details copied to clipboard!');
    });
  });

  describe('Loading States', () => {
    it('should disable buttons during operations', async () => {
      global.fetch = vi.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ success: true }),
        }), 100))
      );

      render(<MoodboardCanvas {...mockProps} />);
      
      const saveButton = screen.getByText('Save Board');
      fireEvent.click(saveButton);

      expect(saveButton).toBeDisabled();
      expect(screen.getByText('Export')).not.toBeDisabled(); // Other buttons should still work

      await waitFor(() => {
        expect(saveButton).not.toBeDisabled();
      });
    });
  });
});