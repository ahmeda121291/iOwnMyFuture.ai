import { supabase } from '../core/api/supabase';
import type { JournalEntry } from '../core/types';
import { errorTracker } from '../shared/utils/errorTracking';
import toast from 'react-hot-toast';

export interface CreateJournalEntryDto {
  content: string;
  mood?: string;
  category?: string;
  tags?: string[];
  entry_date?: string;
}

export interface UpdateJournalEntryDto {
  content?: string;
  mood?: string;
  category?: string;
  tags?: string[];
  ai_summary?: string;
}

export interface JournalQueryOptions {
  userId: string;
  page?: number;
  pageSize?: number;
  startDate?: Date;
  endDate?: Date;
  searchQuery?: string;
  mood?: string;
  category?: string;
  sortBy?: 'entry_date' | 'created_at';
  sortOrder?: 'asc' | 'desc';
}

export interface JournalStats {
  totalEntries: number;
  currentStreak: number;
  longestStreak: number;
  entriesThisMonth: number;
  averageWordCount: number;
  mostCommonMood?: string;
  favoriteCategory?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Journal Service
 * Handles all journal-related operations
 */
class JournalService {
  /**
   * Create a new journal entry
   */
  async createEntry(userId: string, entry: CreateJournalEntryDto): Promise<JournalEntry> {
    try {
      const entryDate = entry.entry_date || new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('journal_entries')
        .insert({
          user_id: userId,
          content: entry.content,
          mood: entry.mood,
          category: entry.category,
          tags: entry.tags,
          entry_date: entryDate,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data as JournalEntry;
    } catch (error) {
      errorTracker.trackError(error, { 
        component: 'JournalService', 
        action: 'createEntry',
        userId 
      });
      toast.error('Couldn\'t save journal entry. Please try again.');
      throw new Error('Failed to create journal entry');
    }
  }

  /**
   * Get journal entries with pagination and filters
   */
  async getEntries(options: JournalQueryOptions): Promise<PaginatedResponse<JournalEntry>> {
    try {
      const {
        userId,
        page = 1,
        pageSize = 10,
        startDate,
        endDate,
        searchQuery,
        mood,
        category,
        sortBy = 'entry_date',
        sortOrder = 'desc',
      } = options;

      let query = supabase
        .from('journal_entries')
        .select('*', { count: 'exact' })
        .eq('user_id', userId);

      // Apply date filters
      if (startDate) {
        query = query.gte('entry_date', startDate.toISOString().split('T')[0]);
      }
      if (endDate) {
        query = query.lte('entry_date', endDate.toISOString().split('T')[0]);
      }

      // Apply search filter
      if (searchQuery) {
        query = query.or(`content.ilike.%${searchQuery}%,ai_summary.ilike.%${searchQuery}%`);
      }

      // Apply mood filter
      if (mood) {
        query = query.eq('mood', mood);
      }

      // Apply category filter
      if (category) {
        query = query.eq('category', category);
      }

      // Apply sorting
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Apply pagination
      const start = (page - 1) * pageSize;
      const end = start + pageSize - 1;
      query = query.range(start, end);

      const { data, error, count } = await query;

      if (error) {
        throw error;
      }

      return {
        data: data as JournalEntry[],
        total: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize),
      };
    } catch (error) {
      errorTracker.trackError(error, { 
        component: 'JournalService', 
        action: 'getEntries',
        userId: options.userId 
      });
      toast.error('Couldn\'t fetch journal entries. Try again later.');
      // Return empty result instead of throwing
      return {
        data: [],
        total: 0,
        page: options.page || 1,
        pageSize: options.pageSize || 10,
        totalPages: 0,
      };
    }
  }

  /**
   * Get a single journal entry
   */
  async getEntry(entryId: string, userId: string): Promise<JournalEntry | null> {
    try {
      const { data, error } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('id', entryId)
        .eq('user_id', userId)
        .single();

      if (error) {
        throw error;
      }

      return data as JournalEntry;
    } catch (error) {
      errorTracker.trackError(error, { 
        component: 'JournalService', 
        action: 'getEntry',
        entryId,
        userId 
      });
      toast.error('Couldn\'t load journal entry. Please try again.');
      return null;
    }
  }

  /**
   * Update a journal entry
   */
  async updateEntry(entryId: string, userId: string, updates: UpdateJournalEntryDto): Promise<JournalEntry> {
    try {
      const { data, error } = await supabase
        .from('journal_entries')
        .update(updates)
        .eq('id', entryId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data as JournalEntry;
    } catch (error) {
      errorTracker.trackError(error, { 
        component: 'JournalService', 
        action: 'updateEntry',
        entryId,
        userId 
      });
      toast.error('Couldn\'t update journal entry. Please try again.');
      throw new Error('Failed to update journal entry');
    }
  }

  /**
   * Delete a journal entry
   */
  async deleteEntry(entryId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('journal_entries')
        .delete()
        .eq('id', entryId)
        .eq('user_id', userId);

      if (error) {
        throw error;
      }
    } catch (error) {
      errorTracker.trackError(error, { 
        component: 'JournalService', 
        action: 'deleteEntry',
        entryId,
        userId 
      });
      toast.error('Couldn\'t delete journal entry. Please try again.');
      throw new Error('Failed to delete journal entry');
    }
  }

  /**
   * Check if user has an entry for a specific date
   */
  async hasEntryForDate(userId: string, date: Date): Promise<boolean> {
    try {
      const dateStr = date.toISOString().split('T')[0];
      
      const { count, error } = await supabase
        .from('journal_entries')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('entry_date', dateStr);

      if (error) {
        throw error;
      }

      return (count || 0) > 0;
    } catch (error) {
      errorTracker.trackError(error, { 
        component: 'JournalService', 
        action: 'hasEntryForDate',
        userId,
        date: date.toISOString() 
      });
      // Return false on error to not block user flow
      return false;
    }
  }

  /**
   * Calculate journal statistics
   */
  async getStats(userId: string): Promise<JournalStats> {
    try {
      // Fetch all entries for stats calculation
      const { data: entries, error } = await supabase
        .from('journal_entries')
        .select('entry_date, content, mood, category')
        .eq('user_id', userId)
        .order('entry_date', { ascending: false });

      if (error) {
        throw error;
      }

      if (!entries || entries.length === 0) {
        return {
          totalEntries: 0,
          currentStreak: 0,
          longestStreak: 0,
          entriesThisMonth: 0,
          averageWordCount: 0,
        };
      }

      // Calculate current streak
      const currentStreak = this.calculateCurrentStreak(entries);
      
      // Calculate longest streak
      const longestStreak = this.calculateLongestStreak(entries);
      
      // Calculate entries this month
      const now = new Date();
      const entriesThisMonth = entries.filter(entry => {
        const entryDate = new Date(entry.entry_date);
        return entryDate.getMonth() === now.getMonth() && 
               entryDate.getFullYear() === now.getFullYear();
      }).length;

      // Calculate average word count
      const totalWords = entries.reduce((sum, entry) => 
        sum + (entry.content?.split(/\s+/).length || 0), 0
      );
      const averageWordCount = Math.round(totalWords / entries.length);

      // Find most common mood
      const moodCounts = entries.reduce((acc, entry) => {
        if (entry.mood) {
          acc[entry.mood] = (acc[entry.mood] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);
      
      const mostCommonMood = Object.entries(moodCounts)
        .sort(([, a], [, b]) => b - a)[0]?.[0];

      // Find favorite category
      const categoryCounts = entries.reduce((acc, entry) => {
        if (entry.category) {
          acc[entry.category] = (acc[entry.category] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);
      
      const favoriteCategory = Object.entries(categoryCounts)
        .sort(([, a], [, b]) => b - a)[0]?.[0];

      return {
        totalEntries: entries.length,
        currentStreak,
        longestStreak,
        entriesThisMonth,
        averageWordCount,
        mostCommonMood,
        favoriteCategory,
      };
    } catch (error) {
      errorTracker.trackError(error, { 
        component: 'JournalService', 
        action: 'getStats',
        userId 
      });
      // Return empty stats instead of throwing
      return {
        totalEntries: 0,
        currentStreak: 0,
        longestStreak: 0,
        entriesThisMonth: 0,
        averageWordCount: 0,
      };
    }
  }

  /**
   * Generate AI summary for an entry
   */
  async generateSummary(entryId: string, userId: string): Promise<string> {
    try {
      const entry = await this.getEntry(entryId, userId);
      if (!entry) {
        throw new Error('Entry not found');
      }

      // Call the Edge Function to generate summary
      const { data, error } = await supabase.functions.invoke('generate-summary', {
        body: { 
          entryId,
          content: entry.content 
        },
      });

      if (error) {
        throw error;
      }

      // Update the entry with the summary
      await this.updateEntry(entryId, userId, { ai_summary: data.summary });

      return data.summary;
    } catch (error) {
      errorTracker.trackError(error, { 
        component: 'JournalService', 
        action: 'generateSummary',
        entryId,
        userId 
      });
      toast.error('Couldn\'t generate AI summary. Please try again later.');
      throw new Error('Failed to generate summary');
    }
  }

  /**
   * Get entries for calendar view
   */
  async getCalendarEntries(userId: string, year: number, month: number): Promise<Map<string, boolean>> {
    try {
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);

      const { data, error } = await supabase
        .from('journal_entries')
        .select('entry_date')
        .eq('user_id', userId)
        .gte('entry_date', startDate.toISOString().split('T')[0])
        .lte('entry_date', endDate.toISOString().split('T')[0]);

      if (error) {
        throw error;
      }

      const entriesMap = new Map<string, boolean>();
      data?.forEach(entry => {
        entriesMap.set(entry.entry_date, true);
      });

      return entriesMap;
    } catch (error) {
      errorTracker.trackError(error, { 
        component: 'JournalService', 
        action: 'getCalendarEntries',
        userId,
        year,
        month 
      });
      // Return empty map on error to not break calendar view
      return new Map();
    }
  }

  /**
   * Export entries to JSON
   */
  async exportEntries(userId: string): Promise<JournalEntry[]> {
    try {
      const { data, error } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('user_id', userId)
        .order('entry_date', { ascending: true });

      if (error) {
        throw error;
      }

      return data as JournalEntry[];
    } catch (error) {
      errorTracker.trackError(error, { 
        component: 'JournalService', 
        action: 'exportEntries',
        userId 
      });
      toast.error('Couldn\'t export journal entries. Please try again.');
      throw new Error('Failed to export entries');
    }
  }

  // Private helper methods
  private calculateCurrentStreak(entries: Array<{ entry_date: string }>): number {
    if (entries.length === 0) {return 0;}

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const mostRecent = new Date(entries[0].entry_date);
    mostRecent.setHours(0, 0, 0, 0);

    const daysDiff = Math.floor((today.getTime() - mostRecent.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff > 1) {return 0;} // Streak is broken

    const checkDate = new Date(mostRecent);
    
    for (const entry of entries) {
      const entryDate = new Date(entry.entry_date);
      entryDate.setHours(0, 0, 0, 0);
      
      if (entryDate.getTime() === checkDate.getTime()) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (entryDate.getTime() < checkDate.getTime()) {
        // Gap in dates, streak is broken
        break;
      }
    }

    return streak;
  }

  private calculateLongestStreak(entries: Array<{ entry_date: string }>): number {
    if (entries.length === 0) {return 0;}

    let maxStreak = 1;
    let currentStreak = 1;

    for (let i = 1; i < entries.length; i++) {
      const prevDate = new Date(entries[i - 1].entry_date);
      const currDate = new Date(entries[i].entry_date);
      
      const diffTime = prevDate.getTime() - currDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 1;
      }
    }

    return maxStreak;
  }
}

// Export singleton instance
export const journalService = new JournalService();

// Export type for dependency injection
export type IJournalService = JournalService;