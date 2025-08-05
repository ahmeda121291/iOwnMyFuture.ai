import { supabase } from './supabase';

export interface OnboardingProgress {
  created_first_journal: boolean;
  created_first_moodboard: boolean;
  generated_ai_summary: boolean;
  completed_at: string | null;
}

export async function updateOnboardingProgress(
  field: keyof Omit<OnboardingProgress, 'completed_at'>,
  value: boolean = true
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {return;}

    // First, get current progress
    const { data: currentProgress } = await supabase
      .from('onboarding_progress')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Prepare update
    const updates: Partial<OnboardingProgress> = {
      [field]: value
    };

    // Check if all tasks will be completed after this update
    if (currentProgress) {
      const willBeCompleted = 
        (field === 'created_first_journal' ? value : currentProgress.created_first_journal) &&
        (field === 'created_first_moodboard' ? value : currentProgress.created_first_moodboard) &&
        (field === 'generated_ai_summary' ? value : currentProgress.generated_ai_summary);

      if (willBeCompleted && !currentProgress.completed_at) {
        updates.completed_at = new Date().toISOString();
      }
    }

    // Update or insert
    if (currentProgress) {
      await supabase
        .from('onboarding_progress')
        .update(updates)
        .eq('user_id', user.id);
    } else {
      await supabase
        .from('onboarding_progress')
        .insert({
          user_id: user.id,
          ...updates
        });
    }
  } catch (error) {
    console.error('Error updating onboarding progress:', error);
  }
}

export async function checkOnboardingComplete(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {return true;} // Don't show checklist if not logged in

    const { data: progress } = await supabase
      .from('onboarding_progress')
      .select('completed_at')
      .eq('user_id', user.id)
      .single();

    return !!progress?.completed_at;
  } catch (error) {
    console.error('Error checking onboarding status:', error);
    return true; // Default to not showing checklist on error
  }
}