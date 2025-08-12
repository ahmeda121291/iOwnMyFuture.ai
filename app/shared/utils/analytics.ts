import { type JournalEntry } from '../core/types';
import { goalsService, type Goal } from '../../services/goals.service';

export interface ProgressData {
  date: string;
  journalEntries: number;
  moodboardUpdates: number;
  goalProgress: number;
}

export interface MoodData {
  date: string;
  positive: number;
  neutral: number;
  negative: number;
}

export interface InsightMetrics {
  totalEntries: number;
  entriesChange: string;
  entriesChangeType: 'positive' | 'neutral' | 'negative';
  moodboardUpdates: number;
  moodboardChange: string;
  moodboardChangeType: 'positive' | 'neutral' | 'negative';
  currentStreak: number;
  streakChange: string;
  streakChangeType: 'positive' | 'neutral' | 'negative';
  avgWordsPerEntry: number;
  wordsChange: string;
  wordsChangeType: 'positive' | 'neutral' | 'negative';
}

/**
 * Calculates consecutive journaling streak
 */
export function calculateJournalingStreak(entries: JournalEntry[]): number {
  if (entries.length === 0) {return 0;}
  
  const entryDates = [...new Set(entries.map(entry => entry.entry_date))].sort().reverse();
  const today = new Date().toISOString().split('T')[0];
  
  let streak = 0;
  const currentDate = new Date();
  
  // Check if user journaled today or yesterday (allow for timezone differences)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  
  if (!entryDates.includes(today) && !entryDates.includes(yesterdayStr)) {
    return 0; // Streak is broken if no entry today or yesterday
  }
  
  // Count consecutive days
  for (let i = 0; i < 100; i++) { // Limit to prevent infinite loops
    const dateStr = currentDate.toISOString().split('T')[0];
    if (entryDates.includes(dateStr)) {
      streak++;
    } else if (streak > 0) {
      break; // Streak ends
    }
    currentDate.setDate(currentDate.getDate() - 1);
  }
  
  return streak;
}

/**
 * Analyzes sentiment from journal entries using keyword matching
 */
export function analyzeMoodFromEntries(entries: JournalEntry[]): {
  positive: number;
  neutral: number;
  negative: number;
} {
  if (entries.length === 0) {
    return { positive: 0, neutral: 0, negative: 0 };
  }

  let positive = 0, neutral = 0, negative = 0;

  const positiveWords = [
    'happy', 'good', 'great', 'amazing', 'wonderful', 'excited', 'grateful', 
    'positive', 'joy', 'love', 'successful', 'accomplished', 'proud', 'content',
    'peaceful', 'blessed', 'thrilled', 'delighted', 'optimistic', 'hopeful'
  ];
  
  const negativeWords = [
    'sad', 'bad', 'terrible', 'awful', 'frustrated', 'angry', 'depressed', 
    'worried', 'stress', 'problem', 'anxious', 'overwhelmed', 'disappointed',
    'upset', 'confused', 'lonely', 'tired', 'exhausted', 'discouraged'
  ];

  entries.forEach(entry => {
    const summary = entry.ai_summary?.toLowerCase() || '';
    const content = entry.content?.toLowerCase() || '';
    const text = summary + ' ' + content;

    const positiveScore = positiveWords.reduce((score, word) => 
      score + (text.includes(word) ? 1 : 0), 0);
    const negativeScore = negativeWords.reduce((score, word) => 
      score + (text.includes(word) ? 1 : 0), 0);

    if (positiveScore > negativeScore) {
      positive++;
    } else if (negativeScore > positiveScore) {
      negative++;
    } else {
      neutral++;
    }
  });

  return { positive, neutral, negative };
}

/**
 * Calculates average words per journal entry
 */
export function calculateAverageWordsPerEntry(entries: JournalEntry[]): number {
  if (entries.length === 0) {return 0;}
  
  const totalWords = entries.reduce((sum, entry) => {
    return sum + entry.content.trim().split(/\s+/).length;
  }, 0);
  
  return Math.round(totalWords / entries.length);
}

/**
 * Generates time-series data for progress charts
 */
export function generateProgressData(
  entries: JournalEntry[], 
  moodboardUpdates: Array<{ id: string; updated_at: string }>, 
  timeframe: 'week' | 'month' | 'quarter',
  goals?: Goal[]
): ProgressData[] {
  const daysBack = timeframe === 'week' ? 7 : timeframe === 'month' ? 30 : 90;
  const days = Array.from({ length: daysBack }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (daysBack - 1 - i));
    return date.toISOString().split('T')[0];
  });

  return days.map(date => {
    const journalCount = entries.filter(entry => entry.entry_date === date).length;
    const moodboardCount = moodboardUpdates.filter(update => 
      update.updated_at.split('T')[0] === date
    ).length;
    
    // Count goals completed on this date
    const goalProgress = goals ? goals.filter(goal => 
      goal.status === 'completed' && 
      goal.completed_at && 
      goal.completed_at.split('T')[0] === date
    ).length : 0;

    return {
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      journalEntries: journalCount,
      moodboardUpdates: moodboardCount,
      goalProgress
    };
  });
}

/**
 * Generates mood trend data for the last 14 days
 */
export function generateMoodData(
  entries: JournalEntry[], 
  timeframe: 'week' | 'month' | 'quarter'
): MoodData[] {
  const daysBack = Math.min(timeframe === 'week' ? 7 : timeframe === 'month' ? 30 : 90, 14);
  const days = Array.from({ length: daysBack }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (daysBack - 1 - i));
    return date;
  });

  return days.map(date => {
    const dateStr = date.toISOString().split('T')[0];
    const entriesForDate = entries.filter(entry => entry.entry_date === dateStr);
    
    if (entriesForDate.length === 0) {
      return {
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        positive: 0,
        neutral: 0,
        negative: 0
      };
    }

    const moodAnalysis = analyzeMoodFromEntries(entriesForDate);
    
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      ...moodAnalysis
    };
  });
}

/**
 * Calculates percentage change between two periods
 */
export function calculatePercentageChange(current: number, previous: number): string {
  if (previous === 0) {
    return current > 0 ? '+100%' : '0%';
  }
  
  const change = ((current - previous) / previous) * 100;
  const sign = change >= 0 ? '+' : '';
  return `${sign}${Math.round(change)}%`;
}

/**
 * Determines change type based on numeric change
 */
export function getChangeType(change: string): 'positive' | 'neutral' | 'negative' {
  if (change.startsWith('+') && change !== '+0%') {return 'positive';}
  if (change.startsWith('-')) {return 'negative';}
  return 'neutral';
}

/**
 * Generates comprehensive insights metrics
 */
export function generateInsightMetrics(
  entries: JournalEntry[],
  moodboardUpdates: Array<{ id: string; updated_at: string }>,
  previousEntries: JournalEntry[] = [],
  previousMoodboardUpdates: Array<{ id: string; updated_at: string }> = []
): InsightMetrics {
  const totalEntries = entries.length;
  const entriesChange = calculatePercentageChange(totalEntries, previousEntries.length);
  
  const moodboardCount = moodboardUpdates.length;
  const moodboardChange = calculatePercentageChange(moodboardCount, previousMoodboardUpdates.length);
  
  const currentStreak = calculateJournalingStreak(entries);
  const previousStreak = calculateJournalingStreak(previousEntries);
  const streakChange = currentStreak > previousStreak 
    ? `+${currentStreak - previousStreak} days` 
    : currentStreak < previousStreak 
    ? `-${previousStreak - currentStreak} days`
    : '0 days';
  
  const avgWords = calculateAverageWordsPerEntry(entries);
  const previousAvgWords = calculateAverageWordsPerEntry(previousEntries);
  const wordsChange = calculatePercentageChange(avgWords, previousAvgWords);

  return {
    totalEntries,
    entriesChange,
    entriesChangeType: getChangeType(entriesChange),
    
    moodboardUpdates: moodboardCount,
    moodboardChange,
    moodboardChangeType: getChangeType(moodboardChange),
    
    currentStreak,
    streakChange,
    streakChangeType: streakChange.startsWith('+') ? 'positive' : 
                     streakChange.startsWith('-') ? 'negative' : 'neutral',
    
    avgWordsPerEntry: avgWords,
    wordsChange,
    wordsChangeType: getChangeType(wordsChange)
  };
}

/**
 * Generates personalized recommendations based on user data
 */
export function generateRecommendations(
  entries: JournalEntry[],
  metrics: InsightMetrics
): Array<{
  title: string;
  description: string;
  type: 'positive' | 'warning' | 'info';
  action?: string;
}> {
  const recommendations: Array<{
    title: string;
    description: string;
    type: 'positive' | 'warning' | 'info';
    action?: string;
  }> = [];

  // Streak-based recommendations
  if (metrics.currentStreak === 0) {
    recommendations.push({
      title: 'Start Your Journaling Journey',
      description: 'Begin with just 5 minutes of writing about your day to build a healthy habit.',
      type: 'info' as const,
      action: 'Write your first entry'
    });
  } else if (metrics.currentStreak < 3) {
    recommendations.push({
      title: 'Build Your Streak',
      description: 'You\'re on the right track! Try to journal for 3 consecutive days to build momentum.',
      type: 'warning' as const
    });
  } else if (metrics.currentStreak >= 7) {
    recommendations.push({
      title: 'Amazing Consistency!',
      description: `You've maintained a ${metrics.currentStreak}-day streak. Your commitment is paying off!`,
      type: 'positive' as const
    });
  }

  // Word count recommendations
  if (metrics.avgWordsPerEntry < 50) {
    recommendations.push({
      title: 'Expand Your Thoughts',
      description: 'Try writing longer entries (100+ words) to gain deeper insights into your experiences.',
      type: 'info' as const
    });
  } else if (metrics.avgWordsPerEntry > 200) {
    recommendations.push({
      title: 'Rich Reflections',
      description: 'Your detailed entries show deep self-reflection. Keep exploring your thoughts!',
      type: 'positive' as const
    });
  }

  // Mood-based recommendations
  const recentEntries = entries.slice(-7); // Last 7 entries
  const moodAnalysis = analyzeMoodFromEntries(recentEntries);
  const totalMoodEntries = moodAnalysis.positive + moodAnalysis.neutral + moodAnalysis.negative;
  
  if (totalMoodEntries > 0) {
    const negativeRatio = moodAnalysis.negative / totalMoodEntries;
    const positiveRatio = moodAnalysis.positive / totalMoodEntries;
    
    if (negativeRatio > 0.6) {
      recommendations.push({
        title: 'Focus on Gratitude',
        description: 'Consider adding 3 things you\'re grateful for to each entry to boost positivity.',
        type: 'warning' as const
      });
    } else if (positiveRatio > 0.6) {
      recommendations.push({
        title: 'Positive Momentum',
        description: 'Your recent entries show great positivity! You\'re cultivating a healthy mindset.',
        type: 'positive' as const
      });
    }
  }

  // Activity recommendations
  if (metrics.totalEntries > 0 && metrics.moodboardUpdates === 0) {
    recommendations.push({
      title: 'Visualize Your Goals',
      description: 'Create or update your vision board to align your journal insights with visual goals.',
      type: 'info' as const,
      action: 'Visit Moodboard'
    });
  }

  return recommendations.slice(0, 4); // Limit to 4 recommendations
}
