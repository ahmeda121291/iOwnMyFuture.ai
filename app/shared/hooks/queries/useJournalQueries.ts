import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../core/api/supabase';
import { type JournalEntry, type PaginatedResponse } from '../../../core/types';

// Types
interface JournalFilters {
  userId: string;
  page?: number;
  pageSize?: number;
  startDate?: Date;
  endDate?: Date;
  searchQuery?: string;
}

interface CreateJournalData {
  content: string;
  mood?: string;
  tags?: string[];
}

interface UpdateJournalData extends CreateJournalData {
  id: string;
}

// Query Keys
export const journalKeys = {
  all: ['journals'] as const,
  lists: () => [...journalKeys.all, 'list'] as const,
  list: (filters: JournalFilters) => [...journalKeys.lists(), filters] as const,
  details: () => [...journalKeys.all, 'detail'] as const,
  detail: (id: string) => [...journalKeys.details(), id] as const,
};

// Fetch journal entries with pagination
async function fetchJournalEntries({
  userId,
  page = 1,
  pageSize = 10,
  startDate,
  endDate,
  searchQuery,
}: JournalFilters): Promise<PaginatedResponse<JournalEntry>> {
  let query = supabase
    .from('journal_entries')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('entry_date', { ascending: false });

  // Apply filters
  if (startDate) {
    query = query.gte('entry_date', startDate.toISOString());
  }
  if (endDate) {
    query = query.lte('entry_date', endDate.toISOString());
  }
  if (searchQuery) {
    query = query.ilike('content', `%${searchQuery}%`);
  }

  // Apply pagination
  const start = (page - 1) * pageSize;
  const end = start + pageSize - 1;
  query = query.range(start, end);

  const { data, error, count } = await query;

  if (error) {throw error;}

  return {
    data: data || [],
    total: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  };
}

// Fetch single journal entry
async function fetchJournalEntry(id: string): Promise<JournalEntry> {
  const { data, error } = await supabase
    .from('journal_entries')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {throw error;}
  return data;
}

// Create journal entry
async function createJournalEntry(userId: string, data: CreateJournalData): Promise<JournalEntry> {
  const { data: newEntry, error } = await supabase
    .from('journal_entries')
    .insert({
      user_id: userId,
      content: data.content,
      mood: data.mood,
      tags: data.tags,
      entry_date: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {throw error;}
  return newEntry;
}

// Update journal entry
async function updateJournalEntry(data: UpdateJournalData): Promise<JournalEntry> {
  const { data: updatedEntry, error } = await supabase
    .from('journal_entries')
    .update({
      content: data.content,
      mood: data.mood,
      tags: data.tags,
    })
    .eq('id', data.id)
    .select()
    .single();

  if (error) {throw error;}
  return updatedEntry;
}

// Delete journal entry
async function deleteJournalEntry(id: string): Promise<void> {
  const { error } = await supabase
    .from('journal_entries')
    .delete()
    .eq('id', id);

  if (error) {throw error;}
}

// Hooks
export function useJournalEntries(filters: JournalFilters) {
  return useQuery({
    queryKey: journalKeys.list(filters),
    queryFn: () => fetchJournalEntries(filters),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

export function useJournalEntry(id: string) {
  return useQuery({
    queryKey: journalKeys.detail(id),
    queryFn: () => fetchJournalEntry(id),
    enabled: !!id,
  });
}

export function useCreateJournalEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: CreateJournalData }) =>
      createJournalEntry(userId, data),
    onSuccess: () => {
      // Invalidate all journal lists
      queryClient.invalidateQueries({ queryKey: journalKeys.lists() });
    },
  });
}

export function useUpdateJournalEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateJournalEntry,
    onSuccess: (data) => {
      // Update the specific entry in cache
      queryClient.setQueryData(journalKeys.detail(data.id), data);
      // Invalidate all journal lists
      queryClient.invalidateQueries({ queryKey: journalKeys.lists() });
    },
  });
}

export function useDeleteJournalEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteJournalEntry,
    onSuccess: (_, id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: journalKeys.detail(id) });
      // Invalidate all journal lists
      queryClient.invalidateQueries({ queryKey: journalKeys.lists() });
    },
  });
}