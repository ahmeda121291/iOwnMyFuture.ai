import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../core/api/supabase';
import { type Moodboard, type MoodboardElement, type PaginatedResponse } from '../../../core/types';

// Types
interface MoodboardFilters {
  userId: string;
  page?: number;
  pageSize?: number;
  searchQuery?: string;
}

interface CreateMoodboardData {
  title: string;
  description?: string;
  elements?: MoodboardElement[];
}

interface UpdateMoodboardData extends CreateMoodboardData {
  id: string;
}

// Query Keys
export const moodboardKeys = {
  all: ['moodboards'] as const,
  lists: () => [...moodboardKeys.all, 'list'] as const,
  list: (filters: MoodboardFilters) => [...moodboardKeys.lists(), filters] as const,
  details: () => [...moodboardKeys.all, 'detail'] as const,
  detail: (id: string) => [...moodboardKeys.details(), id] as const,
};

// Fetch moodboards with pagination
async function fetchMoodboards({
  userId,
  page = 1,
  pageSize = 9, // 3x3 grid
  searchQuery,
}: MoodboardFilters): Promise<PaginatedResponse<Moodboard>> {
  let query = supabase
    .from('moodboards')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  // Apply search filter
  if (searchQuery) {
    query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
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

// Fetch single moodboard
async function fetchMoodboard(id: string): Promise<Moodboard> {
  const { data, error } = await supabase
    .from('moodboards')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {throw error;}
  return data;
}

// Create moodboard
async function createMoodboard(userId: string, data: CreateMoodboardData): Promise<Moodboard> {
  const { data: newMoodboard, error } = await supabase
    .from('moodboards')
    .insert({
      user_id: userId,
      title: data.title,
      description: data.description,
      elements: data.elements || [],
    })
    .select()
    .single();

  if (error) {throw error;}
  return newMoodboard;
}

// Update moodboard
async function updateMoodboard(data: UpdateMoodboardData): Promise<Moodboard> {
  const { data: updatedMoodboard, error } = await supabase
    .from('moodboards')
    .update({
      title: data.title,
      description: data.description,
      elements: data.elements,
      updated_at: new Date().toISOString(),
    })
    .eq('id', data.id)
    .select()
    .single();

  if (error) {throw error;}
  return updatedMoodboard;
}

// Update moodboard elements only
async function updateMoodboardElements(id: string, elements: MoodboardElement[]): Promise<Moodboard> {
  const { data: updatedMoodboard, error } = await supabase
    .from('moodboards')
    .update({
      elements,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {throw error;}
  return updatedMoodboard;
}

// Delete moodboard
async function deleteMoodboard(id: string): Promise<void> {
  const { error } = await supabase
    .from('moodboards')
    .delete()
    .eq('id', id);

  if (error) {throw error;}
}

// Share moodboard
async function shareMoodboard(id: string, isPublic: boolean): Promise<{ shareUrl?: string }> {
  const { data, error } = await supabase
    .from('moodboards')
    .update({
      is_public: isPublic,
      share_id: isPublic ? crypto.randomUUID() : null,
    })
    .eq('id', id)
    .select('share_id')
    .single();

  if (error) {throw error;}

  return {
    shareUrl: data?.share_id ? `${window.location.origin}/share/${data.share_id}` : undefined,
  };
}

// Hooks
export function useMoodboards(filters: MoodboardFilters) {
  return useQuery({
    queryKey: moodboardKeys.list(filters),
    queryFn: () => fetchMoodboards(filters),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

export function useMoodboard(id: string) {
  return useQuery({
    queryKey: moodboardKeys.detail(id),
    queryFn: () => fetchMoodboard(id),
    enabled: !!id,
  });
}

export function useCreateMoodboard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: CreateMoodboardData }) =>
      createMoodboard(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: moodboardKeys.lists() });
    },
  });
}

export function useUpdateMoodboard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateMoodboard,
    onSuccess: (data) => {
      queryClient.setQueryData(moodboardKeys.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: moodboardKeys.lists() });
    },
  });
}

export function useUpdateMoodboardElements() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, elements }: { id: string; elements: MoodboardElement[] }) =>
      updateMoodboardElements(id, elements),
    onSuccess: (data) => {
      queryClient.setQueryData(moodboardKeys.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: moodboardKeys.lists() });
    },
  });
}

export function useDeleteMoodboard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteMoodboard,
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: moodboardKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: moodboardKeys.lists() });
    },
  });
}

export function useShareMoodboard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isPublic }: { id: string; isPublic: boolean }) =>
      shareMoodboard(id, isPublic),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: moodboardKeys.detail(variables.id) });
    },
  });
}