import { describe, it, expect, vi, beforeEach } from 'vitest';
import { testJournalEntry, generateJournalEntries } from '../../fixtures/testData';

// Mock supabase at the top level
vi.mock('@/lib/supabase', () => {
  const mockFrom = vi.fn();
  return {
    supabase: {
      from: mockFrom,
    },
    mockFrom, // Export for test access
  };
});

// Import after mocking
import { journalService } from '@/core/api/journalService';
import { mockFrom } from '@/core/api/supabase';

describe('journalService', () => {
  const testUserId = 'test-user-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createEntry', () => {
    it('creates a new journal entry successfully', async () => {
      const newEntry = {
        userId: testUserId,
        entryDate: '2024-01-20',
        content: 'New journal entry content',
      };

      const mockChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { ...testJournalEntry, ...newEntry },
          error: null,
        }),
      };

      (mockFrom as vi.MockedFunction<typeof mockFrom>).mockReturnValue(mockChain);

      const result = await journalService.createEntry(newEntry);

      expect(mockFrom).toHaveBeenCalledWith('journal_entries');
      expect(mockChain.insert).toHaveBeenCalledWith({
        user_id: newEntry.userId,
        entry_date: newEntry.entryDate,
        content: newEntry.content,
      });
      expect(result).toMatchObject(newEntry);
    });

    it('throws error on creation failure', async () => {
      const mockChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      };

      (mockFrom as vi.MockedFunction<typeof mockFrom>).mockReturnValue(mockChain);

      await expect(
        journalService.createEntry({
          userId: testUserId,
          entryDate: '2024-01-20',
          content: 'Test',
        })
      ).rejects.toThrow();
    });
  });

  describe('getEntries', () => {
    it('retrieves entries with basic filters', async () => {
      const entries = generateJournalEntries(3);
      
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: entries,
          error: null,
        }),
      };

      (mockFrom as vi.MockedFunction<typeof mockFrom>).mockReturnValue(mockChain);

      const result = await journalService.getEntries({ userId: testUserId });

      expect(mockFrom).toHaveBeenCalledWith('journal_entries');
      expect(mockChain.eq).toHaveBeenCalledWith('user_id', testUserId);
      expect(mockChain.order).toHaveBeenCalledWith('entry_date', { ascending: false });
      expect(result).toEqual(entries);
    });

    it('applies date range filters', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      (mockFrom as vi.MockedFunction<typeof mockFrom>).mockReturnValue(mockChain);

      await journalService.getEntries({
        userId: testUserId,
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      });

      expect(mockChain.gte).toHaveBeenCalledWith('entry_date', '2024-01-01');
      expect(mockChain.lte).toHaveBeenCalledWith('entry_date', '2024-01-31');
    });

    it('applies limit and ordering', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      (mockFrom as vi.MockedFunction<typeof mockFrom>).mockReturnValue(mockChain);

      await journalService.getEntries({
        userId: testUserId,
        limit: 10,
        orderBy: 'created_at',
        order: 'asc',
      });

      expect(mockChain.limit).toHaveBeenCalledWith(10);
      expect(mockChain.order).toHaveBeenCalledWith('created_at', { ascending: true });
    });
  });

  describe('getEntry', () => {
    it('retrieves a single entry', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: testJournalEntry,
          error: null,
        }),
      };

      (mockFrom as vi.MockedFunction<typeof mockFrom>).mockReturnValue(mockChain);

      const result = await journalService.getEntry('entry-123', testUserId);

      expect(result).toEqual(testJournalEntry);
      expect(mockChain.eq).toHaveBeenCalledTimes(2);
    });

    it('returns null when entry not found', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'Not found' },
        }),
      };

      (mockFrom as vi.MockedFunction<typeof mockFrom>).mockReturnValue(mockChain);

      const result = await journalService.getEntry('non-existent', testUserId);

      expect(result).toBe(null);
    });
  });

  describe('updateEntry', () => {
    it('updates entry successfully', async () => {
      const updates = { content: 'Updated content' };
      
      const mockChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { ...testJournalEntry, ...updates },
          error: null,
        }),
      };

      (mockFrom as vi.MockedFunction<typeof mockFrom>).mockReturnValue(mockChain);

      const result = await journalService.updateEntry('entry-123', testUserId, updates);

      expect(mockChain.update).toHaveBeenCalledWith(updates);
      expect(result.content).toBe('Updated content');
    });

    it('throws error on update failure', async () => {
      const mockChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Update failed' },
        }),
      };

      (mockFrom as vi.MockedFunction<typeof mockFrom>).mockReturnValue(mockChain);

      await expect(
        journalService.updateEntry('entry-123', testUserId, { content: 'test' })
      ).rejects.toThrow();
    });
  });

  describe('deleteEntry', () => {
    it('deletes entry successfully', async () => {
      const mockChain = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockImplementation(() => {
          // Return self for chaining, except on last call
          if (mockChain.eq.mock.calls.length === 2) {
            return Promise.resolve({ error: null });
          }
          return mockChain;
        }),
      };

      (mockFrom as vi.MockedFunction<typeof mockFrom>).mockReturnValue(mockChain);

      await journalService.deleteEntry('entry-123', testUserId);

      expect(mockChain.delete).toHaveBeenCalled();
      expect(mockChain.eq).toHaveBeenCalledTimes(2);
    });

    it('throws error on delete failure', async () => {
      const mockChain = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockImplementation(() => {
          // Return self for chaining, except on last call
          if (mockChain.eq.mock.calls.length === 2) {
            return Promise.resolve({ error: { message: 'Delete failed' } });
          }
          return mockChain;
        }),
      };

      (mockFrom as vi.MockedFunction<typeof mockFrom>).mockReturnValue(mockChain);

      await expect(
        journalService.deleteEntry('entry-123', testUserId)
      ).rejects.toThrow();
    });
  });

  describe('calculateStats', () => {
    it('returns empty stats for no entries', () => {
      const stats = journalService.calculateStats([]);

      expect(stats).toEqual({
        totalEntries: 0,
        currentStreak: 0,
        longestStreak: 0,
        entriesThisMonth: 0,
        averageWordCount: 0,
      });
    });

    it('calculates current streak correctly', () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const twoDaysAgo = new Date(today);
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      const entries = [
        { ...testJournalEntry, entry_date: today.toISOString().split('T')[0] },
        { ...testJournalEntry, entry_date: yesterday.toISOString().split('T')[0] },
        { ...testJournalEntry, entry_date: twoDaysAgo.toISOString().split('T')[0] },
      ];

      const stats = journalService.calculateStats(entries);

      expect(stats.currentStreak).toBe(3);
    });

    it('calculates longest streak correctly', () => {
      const entries = generateJournalEntries(10);
      const stats = journalService.calculateStats(entries);

      expect(stats.longestStreak).toBeGreaterThan(0);
    });

    it('calculates entries this month', () => {
      const now = new Date();
      const thisMonth = now.toISOString().slice(0, 7);
      const lastMonth = new Date(now.setMonth(now.getMonth() - 1)).toISOString().slice(0, 7);

      const entries = [
        { ...testJournalEntry, entry_date: `${thisMonth}-01` },
        { ...testJournalEntry, entry_date: `${thisMonth}-15` },
        { ...testJournalEntry, entry_date: `${lastMonth}-20` },
      ];

      const stats = journalService.calculateStats(entries);

      expect(stats.entriesThisMonth).toBe(2);
    });

    it('calculates average word count', () => {
      const entries = [
        { ...testJournalEntry, content: 'One two three' },
        { ...testJournalEntry, content: 'Four five six seven eight' },
      ];

      const stats = journalService.calculateStats(entries);

      expect(stats.averageWordCount).toBe(4);
    });
  });

  describe('hasEntryForDate', () => {
    it('returns true when entry exists', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'entry-123' },
          error: null,
        }),
      };

      (mockFrom as vi.MockedFunction<typeof mockFrom>).mockReturnValue(mockChain);

      const result = await journalService.hasEntryForDate(testUserId, '2024-01-20');

      expect(result).toBe(true);
    });

    it('returns false when entry does not exist', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' },
        }),
      };

      (mockFrom as vi.MockedFunction<typeof mockFrom>).mockReturnValue(mockChain);

      const result = await journalService.hasEntryForDate(testUserId, '2024-01-20');

      expect(result).toBe(false);
    });
  });
});