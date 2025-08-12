import { useState, useEffect, useCallback } from 'react';
import { goalsService, type Goal, type GoalMilestone, type CreateGoalInput, type UpdateGoalInput, type CreateMilestoneInput, type GoalStats } from '../services/goals.service';
import { getCurrentUser } from '../core/api/supabase';
import toast from 'react-hot-toast';

interface UseGoalsReturn {
  goals: Goal[];
  activeGoals: Goal[];
  completedGoals: Goal[];
  goalStats: GoalStats | null;
  loading: boolean;
  error: Error | null;
  createGoal: (input: CreateGoalInput) => Promise<Goal | null>;
  updateGoal: (goalId: string, input: UpdateGoalInput) => Promise<Goal | null>;
  deleteGoal: (goalId: string) => Promise<boolean>;
  completeGoal: (goalId: string) => Promise<Goal | null>;
  refetch: () => Promise<void>;
}

export function useGoals(): UseGoalsReturn {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [goalStats, setGoalStats] = useState<GoalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchGoals = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const user = await getCurrentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const [fetchedGoals, stats] = await Promise.all([
        goalsService.getGoals(user.id, { includeCompleted: true }),
        goalsService.getGoalStats(user.id)
      ]);

      setGoals(fetchedGoals);
      setGoalStats(stats);
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error('Failed to fetch goals');
      setError(errorObj);
      console.error('Error fetching goals:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const createGoal = useCallback(async (input: CreateGoalInput): Promise<Goal | null> => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        toast.error('Please log in to create goals');
        return null;
      }

      const newGoal = await goalsService.createGoal(user.id, input);
      setGoals(prev => [newGoal, ...prev]);
      toast.success('Goal created successfully!');
      
      // Refetch stats
      const stats = await goalsService.getGoalStats(user.id);
      setGoalStats(stats);
      
      return newGoal;
    } catch (err) {
      console.error('Error creating goal:', err);
      toast.error('Failed to create goal');
      return null;
    }
  }, []);

  const updateGoal = useCallback(async (goalId: string, input: UpdateGoalInput): Promise<Goal | null> => {
    try {
      const updatedGoal = await goalsService.updateGoal(goalId, input);
      setGoals(prev => prev.map(g => g.id === goalId ? updatedGoal : g));
      toast.success('Goal updated successfully!');
      
      // Refetch stats if status or progress changed
      if (input.status || input.progress !== undefined) {
        const user = await getCurrentUser();
        if (user) {
          const stats = await goalsService.getGoalStats(user.id);
          setGoalStats(stats);
        }
      }
      
      return updatedGoal;
    } catch (err) {
      console.error('Error updating goal:', err);
      toast.error('Failed to update goal');
      return null;
    }
  }, []);

  const deleteGoal = useCallback(async (goalId: string): Promise<boolean> => {
    try {
      await goalsService.deleteGoal(goalId);
      setGoals(prev => prev.filter(g => g.id !== goalId));
      toast.success('Goal deleted successfully');
      
      // Refetch stats
      const user = await getCurrentUser();
      if (user) {
        const stats = await goalsService.getGoalStats(user.id);
        setGoalStats(stats);
      }
      
      return true;
    } catch (err) {
      console.error('Error deleting goal:', err);
      toast.error('Failed to delete goal');
      return false;
    }
  }, []);

  const completeGoal = useCallback(async (goalId: string): Promise<Goal | null> => {
    return updateGoal(goalId, { status: 'completed', progress: 100 });
  }, [updateGoal]);

  const activeGoals = goals.filter(g => g.status === 'active');
  const completedGoals = goals.filter(g => g.status === 'completed');

  return {
    goals,
    activeGoals,
    completedGoals,
    goalStats,
    loading,
    error,
    createGoal,
    updateGoal,
    deleteGoal,
    completeGoal,
    refetch: fetchGoals,
  };
}

interface UseGoalMilestonesReturn {
  milestones: GoalMilestone[];
  loading: boolean;
  error: Error | null;
  createMilestone: (input: Omit<CreateMilestoneInput, 'goal_id'>) => Promise<GoalMilestone | null>;
  updateMilestone: (milestoneId: string, updates: Partial<GoalMilestone>) => Promise<GoalMilestone | null>;
  deleteMilestone: (milestoneId: string) => Promise<boolean>;
  toggleMilestone: (milestoneId: string) => Promise<GoalMilestone | null>;
  refetch: () => Promise<void>;
}

export function useGoalMilestones(goalId: string): UseGoalMilestonesReturn {
  const [milestones, setMilestones] = useState<GoalMilestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchMilestones = useCallback(async () => {
    if (!goalId) {
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const fetchedMilestones = await goalsService.getMilestones(goalId);
      setMilestones(fetchedMilestones);
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error('Failed to fetch milestones');
      setError(errorObj);
      console.error('Error fetching milestones:', err);
    } finally {
      setLoading(false);
    }
  }, [goalId]);

  useEffect(() => {
    fetchMilestones();
  }, [fetchMilestones]);

  const createMilestone = useCallback(async (input: Omit<CreateMilestoneInput, 'goal_id'>): Promise<GoalMilestone | null> => {
    try {
      const newMilestone = await goalsService.createMilestone({
        ...input,
        goal_id: goalId,
      });
      setMilestones(prev => [...prev, newMilestone]);
      toast.success('Milestone added successfully!');
      return newMilestone;
    } catch (err) {
      console.error('Error creating milestone:', err);
      toast.error('Failed to add milestone');
      return null;
    }
  }, [goalId]);

  const updateMilestone = useCallback(async (milestoneId: string, updates: Partial<GoalMilestone>): Promise<GoalMilestone | null> => {
    try {
      const updatedMilestone = await goalsService.updateMilestone(milestoneId, updates);
      setMilestones(prev => prev.map(m => m.id === milestoneId ? updatedMilestone : m));
      toast.success('Milestone updated successfully!');
      return updatedMilestone;
    } catch (err) {
      console.error('Error updating milestone:', err);
      toast.error('Failed to update milestone');
      return null;
    }
  }, []);

  const deleteMilestone = useCallback(async (milestoneId: string): Promise<boolean> => {
    try {
      await goalsService.deleteMilestone(milestoneId);
      setMilestones(prev => prev.filter(m => m.id !== milestoneId));
      toast.success('Milestone deleted successfully');
      return true;
    } catch (err) {
      console.error('Error deleting milestone:', err);
      toast.error('Failed to delete milestone');
      return false;
    }
  }, []);

  const toggleMilestone = useCallback(async (milestoneId: string): Promise<GoalMilestone | null> => {
    const milestone = milestones.find(m => m.id === milestoneId);
    if (!milestone) {
      return null;
    }
    return updateMilestone(milestoneId, { completed: !milestone.completed });
  }, [milestones, updateMilestone]);

  return {
    milestones,
    loading,
    error,
    createMilestone,
    updateMilestone,
    deleteMilestone,
    toggleMilestone,
    refetch: fetchMilestones,
  };
}