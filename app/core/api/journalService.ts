import { supabase } from '@/core/api/supabase';
import type { JournalEntry } from '@/core/types';

export interface JournalFilters {
  userId: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  orderBy?: 'created_at' | 'entry_date';
  order?: 'asc' | 'desc';
}

export interface JournalStats {
  totalEntries: number;
  currentStreak: number;
  longestStreak: number;
  entriesThisMonth: number;
  averageWordCount: number;
}

export const journalService = {
  // Create a new journal entry
  async createEntry(data: {
    userId: string;
    entryDate: string;
    content: string;
  }): Promise<JournalEntry> {
    const { data: entry, error } = await supabase
      .from('journal_entries')
      .insert({
        user_id: data.userId,
        entry_date: data.entryDate,
        content: data.content,
      })
      .select()
      .single();

    if (error) {throw error;}
    return entry;
  },

  // Get journal entries with filters
  async getEntries(filters: JournalFilters): Promise<JournalEntry[]> {
    let query = supabase
      .from('journal_entries')
      .select('*')
      .eq('user_id', filters.userId);

    if (filters.startDate) {
      query = query.gte('entry_date', filters.startDate);
    }
    if (filters.endDate) {
      query = query.lte('entry_date', filters.endDate);
    }
    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    const orderBy = filters.orderBy || 'entry_date';
    const order = filters.order || 'desc';
    query = query.order(orderBy, { ascending: order === 'asc' });

    const { data, error } = await query;
    if (error) {throw error;}
    return data || [];
  },

  // Get a single entry
  async getEntry(entryId: string, userId: string): Promise<JournalEntry | null> {
    const { data, error } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('id', entryId)
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {throw error;}
    return data;
  },

  // Update an entry
  async updateEntry(
    entryId: string,
    userId: string,
    updates: Partial<JournalEntry>
  ): Promise<JournalEntry> {
    const { data, error } = await supabase
      .from('journal_entries')
      .update(updates)
      .eq('id', entryId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {throw error;}
    return data;
  },

  // Delete an entry
  async deleteEntry(entryId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('journal_entries')
      .delete()
      .eq('id', entryId)
      .eq('user_id', userId);

    if (error) {throw error;}
  },

  // Calculate journal statistics
  calculateStats(entries: JournalEntry[]): JournalStats {
    if (entries.length === 0) {
      return {
        totalEntries: 0,
        currentStreak: 0,
        longestStreak: 0,
        entriesThisMonth: 0,
        averageWordCount: 0,
      };
    }

    // Sort entries by date
    const sortedEntries = [...entries].sort(
      (a, b) => new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime()
    );

    // Calculate current streak
    let currentStreak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const mostRecent = new Date(sortedEntries[0].entry_date);
    mostRecent.setHours(0, 0, 0, 0);

    const daysDiff = Math.floor((today.getTime() - mostRecent.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff <= 1) {
      const checkDate = new Date(mostRecent);
      for (const entry of sortedEntries) {
        const entryDate = new Date(entry.entry_date);
        entryDate.setHours(0, 0, 0, 0);

        if (entryDate.getTime() === checkDate.getTime()) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
    }

    // Calculate longest streak
    let longestStreak = 0;
    let tempStreak = 0;
    for (let i = 0; i < sortedEntries.length; i++) {
      if (i === 0) {
        tempStreak = 1;
      } else {
        const currentDate = new Date(sortedEntries[i].entry_date);
        const previousDate = new Date(sortedEntries[i - 1].entry_date);
        const diffTime = previousDate.getTime() - currentDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          tempStreak++;
        } else {
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
        }
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);

    // Calculate entries this month
    const now = new Date();
    const thisMonth = entries.filter(entry => {
      const entryDate = new Date(entry.entry_date);
      return (
        entryDate.getMonth() === now.getMonth() &&
        entryDate.getFullYear() === now.getFullYear()
      );
    });

    // Calculate average word count
    const totalWords = entries.reduce(
      (sum, entry) => sum + entry.content.split(/\s+/).filter(Boolean).length,
      0
    );
    const averageWordCount = Math.round(totalWords / entries.length);

    return {
      totalEntries: entries.length,
      currentStreak,
      longestStreak,
      entriesThisMonth: thisMonth.length,
      averageWordCount,
    };
  },

  // Check if entry exists for a date
  async hasEntryForDate(userId: string, date: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('journal_entries')
      .select('id')
      .eq('user_id', userId)
      .eq('entry_date', date)
      .single();

    if (error && error.code !== 'PGRST116') {throw error;}
    return !!data;
  },
};