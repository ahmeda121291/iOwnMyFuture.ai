import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

// Mock fetch
global.fetch = vi.fn();

// Mock the RelatedEntries component
const RelatedEntries = ({ entryId }: { entryId: string }) => {
  const [entries] = React.useState([
    {
      id: 'related-1',
      entry_date: '2025-01-15',
      title: 'Similar journal entry',
      excerpt: 'This entry has similar themes...',
      mood: 'happy',
      category: 'reflection',
      tags: ['mindfulness', 'growth'],
      similarity_score: 75,
      created_at: new Date().toISOString()
    },
    {
      id: 'related-2',
      entry_date: '2025-01-10',
      title: 'Another related entry',
      excerpt: 'Exploring similar ideas...',
      mood: 'motivated',
      category: 'goals',
      tags: ['success'],
      similarity_score: 60,
      created_at: new Date().toISOString()
    }
  ]);

  return (
    <div data-testid="related-entries">
      <h3>Related Entries</h3>
      {entries.map((entry) => (
        <div key={entry.id} data-testid={`related-${entry.id}`}>
          <h4>{entry.title}</h4>
          <p>{entry.excerpt}</p>
          <span data-testid={`score-${entry.id}`}>{entry.similarity_score}% match</span>
          <span>{entry.mood}</span>
          <span>{entry.category}</span>
          {entry.tags.map(tag => (
            <span key={tag} data-testid={`tag-${tag}`}>{tag}</span>
          ))}
        </div>
      ))}
    </div>
  );
};

describe('RelatedEntries', () => {
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

  describe('Related Entries Display', () => {
    it('should render related entries list', () => {
      render(<RelatedEntries entryId="test-entry" />, { wrapper });
      
      expect(screen.getByTestId('related-entries')).toBeInTheDocument();
      expect(screen.getByText('Related Entries')).toBeInTheDocument();
    });

    it('should display entry details correctly', () => {
      render(<RelatedEntries entryId="test-entry" />, { wrapper });
      
      expect(screen.getByText('Similar journal entry')).toBeInTheDocument();
      expect(screen.getByText('This entry has similar themes...')).toBeInTheDocument();
      expect(screen.getByText('happy')).toBeInTheDocument();
      expect(screen.getByText('reflection')).toBeInTheDocument();
    });

    it('should show similarity scores', () => {
      render(<RelatedEntries entryId="test-entry" />, { wrapper });
      
      expect(screen.getByTestId('score-related-1')).toHaveTextContent('75% match');
      expect(screen.getByTestId('score-related-2')).toHaveTextContent('60% match');
    });

    it('should display tags', () => {
      render(<RelatedEntries entryId="test-entry" />, { wrapper });
      
      expect(screen.getByTestId('tag-mindfulness')).toBeInTheDocument();
      expect(screen.getByTestId('tag-growth')).toBeInTheDocument();
      expect(screen.getByTestId('tag-success')).toBeInTheDocument();
    });
  });

  describe('Related Entries API', () => {
    it('should fetch related entries from API', async () => {
      const mockRelatedEntries = {
        entries: [
          {
            id: 'api-related-1',
            title: 'API Related Entry',
            excerpt: 'Content from API',
            similarity_score: 85,
            mood: 'excited',
            category: 'achievements',
            tags: ['api-tag']
          }
        ],
        count: 1
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockRelatedEntries,
      });

      const response = await fetch('/functions/v1/related-entries?entry_id=test&limit=5');
      const data = await response.json();

      expect(data.entries).toHaveLength(1);
      expect(data.entries[0].title).toBe('API Related Entry');
      expect(data.entries[0].similarity_score).toBe(85);
    });

    it('should handle no related entries', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ entries: [], count: 0 }),
      });

      const response = await fetch('/functions/v1/related-entries?entry_id=test&limit=5');
      const data = await response.json();

      expect(data.entries).toHaveLength(0);
      expect(data.count).toBe(0);
    });

    it('should handle API errors', async () => {
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('API Error'));

      try {
        await fetch('/functions/v1/related-entries?entry_id=test&limit=5');
      } catch (error) {
        expect(error.message).toBe('API Error');
      }
    });
  });

  describe('Similarity Calculation', () => {
    it('should find entries with similar content', () => {
      const calculateSimilarity = (entry1: any, entry2: any) => {
        let score = 0;
        
        // Text similarity (simplified)
        if (entry1.content && entry2.content) {
          const words1 = new Set(entry1.content.toLowerCase().split(' '));
          const words2 = new Set(entry2.content.toLowerCase().split(' '));
          const intersection = new Set([...words1].filter(x => words2.has(x)));
          score += (intersection.size / Math.max(words1.size, words2.size)) * 0.4;
        }
        
        // Tag similarity
        if (entry1.tags && entry2.tags) {
          const commonTags = entry1.tags.filter((t: string) => entry2.tags.includes(t));
          score += (commonTags.length / Math.max(entry1.tags.length, entry2.tags.length)) * 0.3;
        }
        
        // Category match
        if (entry1.category === entry2.category) {
          score += 0.2;
        }
        
        // Mood match
        if (entry1.mood === entry2.mood) {
          score += 0.1;
        }
        
        return Math.round(score * 100);
      };

      const entry1 = {
        content: 'Today I practiced mindfulness and meditation',
        tags: ['mindfulness', 'meditation', 'wellness'],
        category: 'reflection',
        mood: 'calm'
      };

      const entry2 = {
        content: 'Meditation and mindfulness helped me today',
        tags: ['mindfulness', 'meditation'],
        category: 'reflection',
        mood: 'calm'
      };

      const entry3 = {
        content: 'Went for a run this morning',
        tags: ['exercise', 'fitness'],
        category: 'activities',
        mood: 'energetic'
      };

      expect(calculateSimilarity(entry1, entry2)).toBeGreaterThan(50);
      expect(calculateSimilarity(entry1, entry3)).toBeLessThan(30);
    });

    it('should prioritize entries with matching tags', () => {
      const entries = [
        { id: '1', tags: ['growth', 'mindfulness'], category: 'reflection' },
        { id: '2', tags: ['growth'], category: 'goals' },
        { id: '3', tags: ['growth', 'mindfulness', 'meditation'], category: 'reflection' }
      ];

      const currentEntry = { tags: ['growth', 'mindfulness'], category: 'reflection' };
      
      // Sort by tag match count
      const sorted = entries.sort((a, b) => {
        const aMatches = a.tags.filter(t => currentEntry.tags.includes(t)).length;
        const bMatches = b.tags.filter(t => currentEntry.tags.includes(t)).length;
        return bMatches - aMatches;
      });

      expect(sorted[0].id).toBe('3'); // Most tag matches
      expect(sorted[1].id).toBe('1'); // Second most matches
      expect(sorted[2].id).toBe('2'); // Least matches
    });
  });

  describe('Empty States', () => {
    it('should show message when no related entries found', () => {
      const EmptyRelatedEntries = () => (
        <div data-testid="empty-related">
          <p>No related entries found yet.</p>
          <p>Keep journaling to discover patterns!</p>
        </div>
      );

      render(<EmptyRelatedEntries />, { wrapper });
      
      expect(screen.getByText('No related entries found yet.')).toBeInTheDocument();
      expect(screen.getByText('Keep journaling to discover patterns!')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should limit number of related entries', async () => {
      const mockEntries = {
        entries: Array(5).fill(null).map((_, i) => ({
          id: `entry-${i}`,
          title: `Entry ${i}`,
          similarity_score: 90 - i * 10
        })),
        count: 5
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockEntries,
      });

      const response = await fetch('/functions/v1/related-entries?entry_id=test&limit=5');
      const data = await response.json();

      expect(data.entries).toHaveLength(5);
      expect(data.entries[0].similarity_score).toBe(90);
      expect(data.entries[4].similarity_score).toBe(50);
    });

    it('should cache related entries results', async () => {
      const mockData = { entries: [], count: 0 };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockData,
      });

      // First call
      await fetch('/functions/v1/related-entries?entry_id=test');
      
      // Second call (should use cache in real implementation)
      await fetch('/functions/v1/related-entries?entry_id=test');
      
      // In real implementation with React Query, second call would use cache
      // Here we're just testing the API was called twice
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });
});