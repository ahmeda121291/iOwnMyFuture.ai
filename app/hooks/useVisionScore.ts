import { useMemo } from 'react';

export interface VisionScoreColors {
  from: string;
  to: string;
}

export interface VisionScoreData {
  score: number;
  scoreColor: string;
  scoreLabel: string;
  gradientColors: VisionScoreColors;
}

/**
 * Hook to calculate vision score styling and labels
 */
export const useVisionScore = (score: number): VisionScoreData => {
  return useMemo(() => {
    const getScoreColor = (s: number) => {
      if (s >= 80) {
        return 'text-green-600';
      }
      if (s >= 60) {
        return 'text-blue-600';
      }
      if (s >= 40) {
        return 'text-yellow-600';
      }
      return 'text-red-600';
    };

    const getScoreLabel = (s: number) => {
      if (s >= 80) {
        return 'Excellent';
      }
      if (s >= 60) {
        return 'Good';
      }
      if (s >= 40) {
        return 'Fair';
      }
      return 'Needs Work';
    };

    const getGradientColors = (s: number): VisionScoreColors => {
      if (s >= 80) {
        return { from: '#10B981', to: '#059669' }; // Green
      }
      if (s >= 60) {
        return { from: '#3B82F6', to: '#1D4ED8' }; // Blue
      }
      if (s >= 40) {
        return { from: '#F59E0B', to: '#D97706' }; // Yellow
      }
      return { from: '#EF4444', to: '#DC2626' }; // Red
    };

    return {
      score,
      scoreColor: getScoreColor(score),
      scoreLabel: getScoreLabel(score),
      gradientColors: getGradientColors(score),
    };
  }, [score]);
};

/**
 * Hook to get motivational message based on score
 */
export const useMotivationalMessage = (score: number): string => {
  return useMemo(() => {
    if (score >= 80) {
      return "🌟 Amazing progress! You're crushing your goals!";
    }
    if (score >= 60) {
      return "🚀 Great momentum! Keep up the excellent work!";
    }
    if (score >= 40) {
      return "💪 You're building good habits. Stay consistent!";
    }
    return "🌱 Every step forward counts. You've got this!";
  }, [score]);
};

/**
 * Hook to calculate circular progress data
 */
export const useCircularProgress = (score: number, radius: number = 45) => {
  return useMemo(() => {
    const circumference = 2 * Math.PI * radius;
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (score / 100) * circumference;
    
    return {
      circumference,
      strokeDasharray,
      strokeDashoffset,
    };
  }, [score, radius]);
};