import { supabase } from '../core/api/supabase';

export type GoalCategory = 'personal' | 'career' | 'health' | 'financial' | 'relationships' | 'education' | 'other';
export type GoalStatus = 'active' | 'completed' | 'paused' | 'cancelled';
export type GoalPriority = 1 | 2 | 3 | 4 | 5;

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  category?: GoalCategory;
  target_date?: string;
  priority: GoalPriority;
  status: GoalStatus;
  progress: number;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface GoalMilestone {
  id: string;
  goal_id: string;
  title: string;
  description?: string;
  due_date?: string;
  completed: boolean;
  completed_at?: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface GoalUpdate {
  id: string;
  goal_id: string;
  milestone_id?: string;
  update_text: string;
  progress_change: number;
  created_at: string;
}

export interface CreateGoalInput {
  title: string;
  description?: string;
  category?: GoalCategory;
  target_date?: string;
  priority?: GoalPriority;
}

export interface UpdateGoalInput {
  title?: string;
  description?: string;
  category?: GoalCategory;
  target_date?: string;
  priority?: GoalPriority;
  status?: GoalStatus;
  progress?: number;
}

export interface CreateMilestoneInput {
  goal_id: string;
  title: string;
  description?: string;
  due_date?: string;
  order_index?: number;
}

export interface GoalStats {
  totalGoals: number;
  activeGoals: number;
  completedGoals: number;
  completedThisMonth: number;
  completedThisYear: number;
  averageProgress: number;
  categoryDistribution: Record<GoalCategory, number>;
}

class GoalsService {
  /**
   * Create a new goal
   */
  async createGoal(userId: string, input: CreateGoalInput): Promise<Goal> {
    const { data, error } = await supabase
      .from('goals')
      .insert({
        user_id: userId,
        title: input.title,
        description: input.description,
        category: input.category,
        target_date: input.target_date,
        priority: input.priority || 3,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create goal: ${error.message}`);
    }

    return data;
  }

  /**
   * Get all goals for a user
   */
  async getGoals(
    userId: string,
    filters?: {
      status?: GoalStatus;
      category?: GoalCategory;
      includeCompleted?: boolean;
    }
  ): Promise<Goal[]> {
    let query = supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.category) {
      query = query.eq('category', filters.category);
    }

    if (!filters?.includeCompleted) {
      query = query.neq('status', 'completed');
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch goals: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get a single goal by ID
   */
  async getGoal(goalId: string): Promise<Goal | null> {
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('id', goalId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch goal: ${error.message}`);
    }

    return data;
  }

  /**
   * Update a goal
   */
  async updateGoal(goalId: string, input: UpdateGoalInput): Promise<Goal> {
    const updateData: any = { ...input };
    
    // If marking as completed, set completed_at
    if (input.status === 'completed' && input.progress !== 100) {
      updateData.progress = 100;
      updateData.completed_at = new Date().toISOString();
    } else if (input.progress === 100) {
      updateData.status = 'completed';
      updateData.completed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('goals')
      .update(updateData)
      .eq('id', goalId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update goal: ${error.message}`);
    }

    return data;
  }

  /**
   * Delete a goal
   */
  async deleteGoal(goalId: string): Promise<void> {
    const { error } = await supabase
      .from('goals')
      .delete()
      .eq('id', goalId);

    if (error) {
      throw new Error(`Failed to delete goal: ${error.message}`);
    }
  }

  /**
   * Create a milestone for a goal
   */
  async createMilestone(input: CreateMilestoneInput): Promise<GoalMilestone> {
    const { data, error } = await supabase
      .from('goal_milestones')
      .insert({
        goal_id: input.goal_id,
        title: input.title,
        description: input.description,
        due_date: input.due_date,
        order_index: input.order_index || 0,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create milestone: ${error.message}`);
    }

    return data;
  }

  /**
   * Get milestones for a goal
   */
  async getMilestones(goalId: string): Promise<GoalMilestone[]> {
    const { data, error } = await supabase
      .from('goal_milestones')
      .select('*')
      .eq('goal_id', goalId)
      .order('order_index', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch milestones: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Update a milestone
   */
  async updateMilestone(
    milestoneId: string,
    updates: {
      title?: string;
      description?: string;
      due_date?: string;
      completed?: boolean;
      order_index?: number;
    }
  ): Promise<GoalMilestone> {
    const updateData: any = { ...updates };
    
    // If marking as completed, set completed_at
    if (updates.completed === true) {
      updateData.completed_at = new Date().toISOString();
    } else if (updates.completed === false) {
      updateData.completed_at = null;
    }

    const { data, error } = await supabase
      .from('goal_milestones')
      .update(updateData)
      .eq('id', milestoneId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update milestone: ${error.message}`);
    }

    return data;
  }

  /**
   * Delete a milestone
   */
  async deleteMilestone(milestoneId: string): Promise<void> {
    const { error } = await supabase
      .from('goal_milestones')
      .delete()
      .eq('id', milestoneId);

    if (error) {
      throw new Error(`Failed to delete milestone: ${error.message}`);
    }
  }

  /**
   * Add a progress update to a goal
   */
  async addGoalUpdate(
    goalId: string,
    updateText: string,
    progressChange: number = 0,
    milestoneId?: string
  ): Promise<GoalUpdate> {
    const { data, error } = await supabase
      .from('goal_updates')
      .insert({
        goal_id: goalId,
        milestone_id: milestoneId,
        update_text: updateText,
        progress_change: progressChange,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to add goal update: ${error.message}`);
    }

    // Update goal progress if there's a change
    if (progressChange !== 0) {
      const goal = await this.getGoal(goalId);
      if (goal) {
        const newProgress = Math.max(0, Math.min(100, goal.progress + progressChange));
        await this.updateGoal(goalId, { progress: newProgress });
      }
    }

    return data;
  }

  /**
   * Get updates for a goal
   */
  async getGoalUpdates(goalId: string, limit: number = 10): Promise<GoalUpdate[]> {
    const { data, error } = await supabase
      .from('goal_updates')
      .select('*')
      .eq('goal_id', goalId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch goal updates: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Link a goal with a journal entry
   */
  async linkGoalToJournalEntry(goalId: string, journalEntryId: string): Promise<void> {
    const { error } = await supabase
      .from('goal_journal_entries')
      .insert({
        goal_id: goalId,
        journal_entry_id: journalEntryId,
      });

    if (error && !error.message.includes('duplicate')) {
      throw new Error(`Failed to link goal to journal entry: ${error.message}`);
    }
  }

  /**
   * Get goals linked to a journal entry
   */
  async getGoalsForJournalEntry(journalEntryId: string): Promise<Goal[]> {
    const { data, error } = await supabase
      .from('goal_journal_entries')
      .select('goals(*)')
      .eq('journal_entry_id', journalEntryId);

    if (error) {
      throw new Error(`Failed to fetch goals for journal entry: ${error.message}`);
    }

    return data?.map(item => (item as any).goals).filter(Boolean) || [];
  }

  /**
   * Link a goal with a moodboard
   */
  async linkGoalToMoodboard(goalId: string, moodboardId: string): Promise<void> {
    const { error } = await supabase
      .from('goal_moodboards')
      .insert({
        goal_id: goalId,
        moodboard_id: moodboardId,
      });

    if (error && !error.message.includes('duplicate')) {
      throw new Error(`Failed to link goal to moodboard: ${error.message}`);
    }
  }

  /**
   * Get goals linked to a moodboard
   */
  async getGoalsForMoodboard(moodboardId: string): Promise<Goal[]> {
    const { data, error } = await supabase
      .from('goal_moodboards')
      .select('goals(*)')
      .eq('moodboard_id', moodboardId);

    if (error) {
      throw new Error(`Failed to fetch goals for moodboard: ${error.message}`);
    }

    return data?.map(item => (item as any).goals).filter(Boolean) || [];
  }

  /**
   * Get goal statistics for a user
   */
  async getGoalStats(userId: string): Promise<GoalStats> {
    const goals = await this.getGoals(userId, { includeCompleted: true });
    
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const totalGoals = goals.length;
    const activeGoals = goals.filter(g => g.status === 'active').length;
    const completedGoals = goals.filter(g => g.status === 'completed').length;
    
    const completedThisMonth = goals.filter(g => 
      g.status === 'completed' && 
      g.completed_at && 
      new Date(g.completed_at) >= startOfMonth
    ).length;
    
    const completedThisYear = goals.filter(g => 
      g.status === 'completed' && 
      g.completed_at && 
      new Date(g.completed_at) >= startOfYear
    ).length;

    const activeGoalsProgress = goals
      .filter(g => g.status === 'active')
      .reduce((sum, g) => sum + g.progress, 0);
    
    const averageProgress = activeGoals > 0 ? activeGoalsProgress / activeGoals : 0;

    const categoryDistribution: Record<GoalCategory, number> = {
      personal: 0,
      career: 0,
      health: 0,
      financial: 0,
      relationships: 0,
      education: 0,
      other: 0,
    };

    goals.forEach(goal => {
      if (goal.category) {
        categoryDistribution[goal.category]++;
      }
    });

    return {
      totalGoals,
      activeGoals,
      completedGoals,
      completedThisMonth,
      completedThisYear,
      averageProgress,
      categoryDistribution,
    };
  }

  /**
   * Get upcoming goal deadlines
   */
  async getUpcomingDeadlines(userId: string, daysAhead: number = 30): Promise<Goal[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .not('target_date', 'is', null)
      .lte('target_date', futureDate.toISOString())
      .gte('target_date', new Date().toISOString())
      .order('target_date', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch upcoming deadlines: ${error.message}`);
    }

    return data || [];
  }
}

export const goalsService = new GoalsService();