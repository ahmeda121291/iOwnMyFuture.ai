import { supabase } from '../core/api/supabase';
import type { Moodboard, MoodboardElement } from '../core/types';

export interface CreateMoodboardDto {
  title: string;
  description?: string;
  elements: MoodboardElement[];
  isPublic?: boolean;
  theme?: string;
}

export interface UpdateMoodboardDto {
  title?: string;
  description?: string;
  elements?: MoodboardElement[];
  isPublic?: boolean;
  theme?: string;
}

export interface MoodboardQueryOptions {
  userId: string;
  page?: number;
  pageSize?: number;
  searchQuery?: string;
  isPublic?: boolean;
  sortBy?: 'created_at' | 'updated_at' | 'title';
  sortOrder?: 'asc' | 'desc';
}

export interface ShareMoodboardOptions {
  moodboardId: string;
  expiresIn?: number; // hours
  allowEdit?: boolean;
}

/**
 * Moodboard Service
 * Handles all moodboard/vision board operations
 */
class MoodboardService {
  /**
   * Create a new moodboard
   */
  async createMoodboard(userId: string, moodboard: CreateMoodboardDto): Promise<Moodboard> {
    try {
      const boardData = {
        elements: moodboard.elements || [],
        theme: moodboard.theme || 'default',
        preferences: {},
      };

      const { data, error } = await supabase
        .from('moodboards')
        .insert({
          user_id: userId,
          title: moodboard.title,
          description: moodboard.description,
          board_data: boardData,
          is_public: moodboard.isPublic || false,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create moodboard: ${error.message}`);
      }

      return this.transformMoodboard(data);
    } catch (error) {
      console.error('CreateMoodboard error:', error);
      throw error;
    }
  }

  /**
   * Get moodboards with pagination and filters
   */
  async getMoodboards(options: MoodboardQueryOptions): Promise<{
    data: Moodboard[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    try {
      const {
        userId,
        page = 1,
        pageSize = 9,
        searchQuery,
        isPublic,
        sortBy = 'updated_at',
        sortOrder = 'desc',
      } = options;

      let query = supabase
        .from('moodboards')
        .select('*', { count: 'exact' })
        .eq('user_id', userId);

      // Apply public filter
      if (isPublic !== undefined) {
        query = query.eq('is_public', isPublic);
      }

      // Apply search filter
      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
      }

      // Apply sorting
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Apply pagination
      const start = (page - 1) * pageSize;
      const end = start + pageSize - 1;
      query = query.range(start, end);

      const { data, error, count } = await query;

      if (error) {
        throw new Error(`Failed to fetch moodboards: ${error.message}`);
      }

      return {
        data: (data || []).map(this.transformMoodboard),
        total: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize),
      };
    } catch (error) {
      console.error('GetMoodboards error:', error);
      throw error;
    }
  }

  /**
   * Get a single moodboard
   */
  async getMoodboard(moodboardId: string): Promise<Moodboard | null> {
    try {
      const { data, error } = await supabase
        .from('moodboards')
        .select('*')
        .eq('id', moodboardId)
        .single();

      if (error) {
        console.error('GetMoodboard error:', error);
        return null;
      }

      return this.transformMoodboard(data);
    } catch (error) {
      console.error('GetMoodboard error:', error);
      return null;
    }
  }

  /**
   * Update a moodboard
   */
  async updateMoodboard(
    moodboardId: string,
    userId: string,
    updates: UpdateMoodboardDto
  ): Promise<Moodboard> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (updates.title !== undefined) {updateData.title = updates.title;}
      if (updates.description !== undefined) {updateData.description = updates.description;}
      if (updates.isPublic !== undefined) {updateData.is_public = updates.isPublic;}

      if (updates.elements !== undefined) {
        updateData.board_data = {
          elements: updates.elements,
          theme: updates.theme || 'default',
        };
      }

      const { data, error } = await supabase
        .from('moodboards')
        .update(updateData)
        .eq('id', moodboardId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update moodboard: ${error.message}`);
      }

      return this.transformMoodboard(data);
    } catch (error) {
      console.error('UpdateMoodboard error:', error);
      throw error;
    }
  }

  /**
   * Update moodboard elements only
   */
  async updateElements(
    moodboardId: string,
    userId: string,
    elements: MoodboardElement[]
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('moodboards')
        .update({
          board_data: { elements },
          updated_at: new Date().toISOString(),
        })
        .eq('id', moodboardId)
        .eq('user_id', userId);

      if (error) {
        throw new Error(`Failed to update moodboard elements: ${error.message}`);
      }
    } catch (error) {
      console.error('UpdateElements error:', error);
      throw error;
    }
  }

  /**
   * Delete a moodboard
   */
  async deleteMoodboard(moodboardId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('moodboards')
        .delete()
        .eq('id', moodboardId)
        .eq('user_id', userId);

      if (error) {
        throw new Error(`Failed to delete moodboard: ${error.message}`);
      }
    } catch (error) {
      console.error('DeleteMoodboard error:', error);
      throw error;
    }
  }

  /**
   * Share a moodboard publicly
   */
  async shareMoodboard(userId: string, options: ShareMoodboardOptions): Promise<string> {
    try {
      const { moodboardId, expiresIn = 168, allowEdit = false } = options; // Default 7 days

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + expiresIn);

      const { data, error } = await supabase
        .from('public_snapshots')
        .insert({
          moodboard_id: moodboardId,
          user_id: userId,
          expires_at: expiresAt.toISOString(),
          allow_edit: allowEdit,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create share link: ${error.message}`);
      }

      const shareUrl = `${window.location.origin}/share/${data.id}`;
      return shareUrl;
    } catch (error) {
      console.error('ShareMoodboard error:', error);
      throw error;
    }
  }

  /**
   * Get public moodboard by share ID
   */
  async getPublicMoodboard(shareId: string): Promise<Moodboard | null> {
    try {
      const { data: snapshot, error: snapshotError } = await supabase
        .from('public_snapshots')
        .select('*, moodboards(*)')
        .eq('id', shareId)
        .single();

      if (snapshotError) {
        console.error('GetPublicMoodboard error:', snapshotError);
        return null;
      }

      // Check if expired
      if (snapshot.expires_at && new Date(snapshot.expires_at) < new Date()) {
        return null;
      }

      return this.transformMoodboard(snapshot.moodboards);
    } catch (error) {
      console.error('GetPublicMoodboard error:', error);
      return null;
    }
  }

  /**
   * Duplicate a moodboard
   */
  async duplicateMoodboard(moodboardId: string, userId: string): Promise<Moodboard> {
    try {
      const original = await this.getMoodboard(moodboardId);
      if (!original) {
        throw new Error('Original moodboard not found');
      }

      return await this.createMoodboard(userId, {
        title: `${original.title} (Copy)`,
        description: original.description,
        elements: original.elements || [],
        theme: original.board_data?.theme,
      });
    } catch (error) {
      console.error('DuplicateMoodboard error:', error);
      throw error;
    }
  }

  /**
   * Generate AI-powered moodboard elements
   */
  async generateAIElements(
    goals: string,
    preferences?: string,
    mode: 'basic' | 'advanced' = 'basic'
  ): Promise<MoodboardElement[]> {
    try {
      const { data, error } = await supabase.functions.invoke('generate-moodboard', {
        body: {
          goals,
          preferences,
          mode,
        },
      });

      if (error) {
        throw new Error(`Failed to generate AI elements: ${error.message}`);
      }

      return data.elements as MoodboardElement[];
    } catch (error) {
      console.error('GenerateAIElements error:', error);
      throw error;
    }
  }

  /**
   * Get moodboard statistics
   */
  async getMoodboardStats(userId: string): Promise<{
    totalMoodboards: number;
    totalElements: number;
    publicMoodboards: number;
    lastUpdated?: Date;
  }> {
    try {
      const { data, error } = await supabase
        .from('moodboards')
        .select('board_data, is_public, updated_at')
        .eq('user_id', userId);

      if (error) {
        throw new Error(`Failed to fetch moodboard stats: ${error.message}`);
      }

      const stats = {
        totalMoodboards: data?.length || 0,
        totalElements: data?.reduce((sum, board) => 
          sum + (board.board_data?.elements?.length || 0), 0
        ) || 0,
        publicMoodboards: data?.filter(board => board.is_public).length || 0,
        lastUpdated: data?.[0]?.updated_at ? new Date(data[0].updated_at) : undefined,
      };

      return stats;
    } catch (error) {
      console.error('GetMoodboardStats error:', error);
      throw error;
    }
  }

  /**
   * Export moodboard as JSON
   */
  async exportMoodboard(moodboardId: string, userId: string): Promise<any> {
    try {
      const moodboard = await this.getMoodboard(moodboardId);
      
      if (!moodboard || moodboard.user_id !== userId) {
        throw new Error('Moodboard not found or unauthorized');
      }

      return {
        title: moodboard.title,
        description: moodboard.description,
        elements: moodboard.elements,
        theme: moodboard.board_data?.theme,
        created_at: moodboard.created_at,
        updated_at: moodboard.updated_at,
      };
    } catch (error) {
      console.error('ExportMoodboard error:', error);
      throw error;
    }
  }

  /**
   * Import moodboard from JSON
   */
  async importMoodboard(userId: string, data: any): Promise<Moodboard> {
    try {
      return await this.createMoodboard(userId, {
        title: data.title || 'Imported Moodboard',
        description: data.description,
        elements: data.elements || [],
        theme: data.theme,
      });
    } catch (error) {
      console.error('ImportMoodboard error:', error);
      throw error;
    }
  }

  // Private helper method to transform database record to Moodboard type
  private transformMoodboard(data: any): Moodboard {
    return {
      id: data.id,
      user_id: data.user_id,
      title: data.title,
      description: data.description,
      board_data: data.board_data,
      elements: data.board_data?.elements || [],
      is_public: data.is_public,
      created_at: data.created_at,
      updated_at: data.updated_at,
    } as Moodboard;
  }
}

// Export singleton instance
export const moodboardService = new MoodboardService();

// Export type for dependency injection
export type IMoodboardService = MoodboardService;