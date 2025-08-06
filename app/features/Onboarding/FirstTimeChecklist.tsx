import React, { useState, useEffect, useCallback } from 'react';
import { 
  CheckCircle2, 
  Circle, 
  BookOpen, 
  Target, 
  Sparkles,
  Trophy,
  ChevronRight,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../core/api/supabase';
import Button from '../../shared/components/Button';

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  completed: boolean;
  action: () => void;
  actionLabel: string;
}

interface OnboardingProgress {
  created_first_journal: boolean;
  created_first_moodboard: boolean;
  generated_ai_summary: boolean;
  completed_at: string | null;
}

export default function FirstTimeChecklist() {
  const [progress, setProgress] = useState<OnboardingProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const navigate = useNavigate();

  const loadProgress = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {return;}

      // Check if user has dismissed the checklist
      const dismissed = localStorage.getItem(`checklist_dismissed_${user.id}`);
      if (dismissed === 'true') {
        setIsDismissed(true);
        setLoading(false);
        return;
      }

      // Fetch or create onboarding progress
      let progressData;
      const { data, error } = await supabase
        .from('onboarding_progress')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code === 'PGRST116') {
        // No record exists, create one
        const { data: newProgress, error: insertError } = await supabase
          .from('onboarding_progress')
          .insert({ user_id: user.id })
          .select()
          .single();

        if (insertError) {throw insertError;}
        progressData = newProgress;
      } else if (error) {
        throw error;
      } else {
        progressData = data;
      }

      setProgress(progressData);
    } catch (error) {
      console.error('Error loading onboarding progress:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const checkUserActivity = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {return;}

      // Check for existing journal entries
      const { data: journals } = await supabase
        .from('journal_entries')
        .select('id, ai_summary')
        .eq('user_id', user.id)
        .limit(1);

      // Check for existing moodboards
      const { data: moodboards } = await supabase
        .from('moodboards')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      // Update progress if activities are found
      if (journals?.length || moodboards?.length) {
        const updates: Partial<OnboardingProgress> = {};
        
        if (journals?.length) {
          updates.created_first_journal = true;
          if (journals[0].ai_summary) {
            updates.generated_ai_summary = true;
          }
        }

        if (moodboards?.length) {
          updates.created_first_moodboard = true;
        }

        // Check if all tasks are completed
        const allCompleted = 
          (progress?.created_first_journal || updates.created_first_journal) &&
          (progress?.created_first_moodboard || updates.created_first_moodboard) &&
          (progress?.generated_ai_summary || updates.generated_ai_summary);

        if (allCompleted && !progress?.completed_at) {
          updates.completed_at = new Date().toISOString();
        }

        if (Object.keys(updates).length > 0) {
          await updateProgress(updates);
        }
      }
    } catch (error) {
      console.error('Error checking user activity:', error);
    }
  }, [progress]);

  useEffect(() => {
    loadProgress();
    checkUserActivity();
  }, [loadProgress, checkUserActivity]);

  const updateProgress = async (updates: Partial<OnboardingProgress>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {return;}

      const { data, error } = await supabase
        .from('onboarding_progress')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {throw error;}

      setProgress(data);
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };

  const dismissChecklist = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      localStorage.setItem(`checklist_dismissed_${user.id}`, 'true');
    }
    setIsDismissed(true);
  };

  // Don't show checklist if loading, dismissed, or already completed
  if (loading || isDismissed || progress?.completed_at) {
    return <div className="hidden" aria-hidden="true"></div>;
  }

  const checklistItems: ChecklistItem[] = [
    {
      id: 'journal',
      title: 'Write Your First Journal Entry',
      description: 'Start your self-discovery journey with a reflection',
      icon: <BookOpen className="w-5 h-5" />,
      completed: progress?.created_first_journal || false,
      action: () => navigate('/journal'),
      actionLabel: 'Start Writing'
    },
    {
      id: 'moodboard',
      title: 'Create Your Vision Board',
      description: 'Visualize your dreams and aspirations',
      icon: <Target className="w-5 h-5" />,
      completed: progress?.created_first_moodboard || false,
      action: () => navigate('/moodboard'),
      actionLabel: 'Create Board'
    },
    {
      id: 'summary',
      title: 'Generate an AI Summary',
      description: 'Let AI help you gain insights from your journal',
      icon: <Sparkles className="w-5 h-5" />,
      completed: progress?.generated_ai_summary || false,
      action: () => navigate('/journal'),
      actionLabel: 'Try AI Summary'
    }
  ];

  const completedCount = checklistItems.filter(item => item.completed).length;
  const totalCount = checklistItems.length;
  const progressPercentage = (completedCount / totalCount) * 100;

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-40">
        <button
          onClick={() => setIsMinimized(false)}
          className="bg-white rounded-full shadow-lg p-4 border border-gray-200 hover:shadow-xl transition-shadow group"
        >
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Trophy className="w-6 h-6 text-amber-500" />
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-white text-xs rounded-full flex items-center justify-center font-bold">
                {completedCount}
              </div>
            </div>
            <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
              Getting Started ({completedCount}/{totalCount})
            </span>
            <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden mb-8 animate-fadeIn">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-accent p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mr-4">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Welcome to MyFutureSelf!</h2>
              <p className="text-white/90 text-sm mt-1">Complete these steps to get started on your journey</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsMinimized(true)}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
              title="Minimize"
            >
              <ChevronRight className="w-5 h-5 text-white rotate-90" />
            </button>
            <button
              onClick={dismissChecklist}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
              title="Dismiss"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-6">
          <div className="flex items-center justify-between text-white mb-2">
            <span className="text-sm font-medium">Your Progress</span>
            <span className="text-sm font-medium">{completedCount} of {totalCount} completed</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-3">
            <div 
              className="bg-white rounded-full h-3 transition-all duration-500 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Checklist Items */}
      <div className="p-6 space-y-4">
        {checklistItems.map((item) => (
          <div 
            key={item.id}
            className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
              item.completed 
                ? 'bg-green-50 border-green-200' 
                : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 ${
                item.completed
                  ? 'bg-green-500 text-white'
                  : 'bg-white border-2 border-gray-300'
              }`}>
                {item.completed ? (
                  <CheckCircle2 className="w-6 h-6" />
                ) : (
                  <Circle className="w-6 h-6 text-gray-400" />
                )}
              </div>
              <div className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${
                  item.completed
                    ? 'bg-green-100 text-green-600'
                    : 'bg-primary/10 text-primary'
                }`}>
                  {item.icon}
                </div>
                <div>
                  <h3 className={`font-semibold ${
                    item.completed ? 'text-green-700' : 'text-gray-900'
                  }`}>
                    {item.title}
                  </h3>
                  <p className={`text-sm ${
                    item.completed ? 'text-green-600' : 'text-gray-600'
                  }`}>
                    {item.description}
                  </p>
                </div>
              </div>
            </div>
            {!item.completed && (
              <Button
                onClick={item.action}
                size="small"
                className="ml-4"
              >
                {item.actionLabel}
              </Button>
            )}
            {item.completed && (
              <div className="text-green-600 font-medium text-sm">
                Completed!
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Completion Message */}
      {completedCount === totalCount && (
        <div className="px-6 pb-6">
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200">
            <div className="flex items-center">
              <Trophy className="w-8 h-8 text-amber-500 mr-3" />
              <div>
                <h3 className="font-semibold text-amber-800">Congratulations!</h3>
                <p className="text-sm text-amber-700">
                  You've completed all onboarding steps. You're ready to transform your future!
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}