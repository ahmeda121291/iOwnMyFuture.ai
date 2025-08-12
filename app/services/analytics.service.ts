import { supabase } from '../core/api/supabase';
import { journalService } from './journal.service';
import { moodboardService } from './moodboard.service';
import { goalsService } from './goals.service';
import { trackDataError } from '../shared/utils/errorTracking';

export interface MoodAnalytics {
  topMoods: Array<{
    mood: string;
    count: number;
    percentage: number;
  }>;
  moodTrend: 'improving' | 'declining' | 'stable';
  trendData: Array<{
    date: string;
    positivity: number;
    moods: string[];
  }>;
  suggestedHabits: string[];
  summary: string;
}

export interface ProgressMetrics {
  journalStreak: number;
  longestStreak: number;
  totalEntries: number;
  entriesThisMonth: number;
  goalsCompleted: number;
  goalsCompletedThisMonth: number;
  goalsCompletedThisYear: number;
  activeGoals: number;
  averageGoalProgress: number;
  visionScore: number;
  monthlyProgress: number;
}

export interface UserInsights {
  writingPatterns: {
    mostActiveTime: string;
    averageLength: number;
    topCategories: string[];
  };
  emotionalHealth: {
    dominantMood: string;
    moodStability: number;
    positivityScore: number;
  };
  achievements: Array<{
    id: string;
    title: string;
    description: string;
    unlockedAt?: Date;
  }>;
}

/**
 * Analytics Service
 * Provides insights and analytics for user data
 */
class AnalyticsService {
  /**
   * Get mood analytics for the last 30 days
   */
  async getMoodAnalytics(userId: string): Promise<MoodAnalytics> {
    try {
      const { data, error } = await supabase.functions.invoke('mood-analytics', {
        body: { userId },
      });

      if (error) {
        throw new Error(`Failed to fetch mood analytics: ${error.message}`);
      }

      return data as MoodAnalytics;
    } catch (error) {
      trackDataError(error, 'AnalyticsService', 'getMoodAnalytics');
      
      // Return default analytics on error
      return {
        topMoods: [],
        moodTrend: 'stable',
        trendData: [],
        suggestedHabits: [],
        summary: 'Unable to generate mood analytics at this time.',
      };
    }
  }

  /**
   * Get progress metrics
   */
  async getProgressMetrics(userId: string): Promise<ProgressMetrics> {
    try {
      // Get journal stats
      const journalStats = await journalService.getStats(userId);
      
      // Get moodboard stats
      const moodboardStats = await moodboardService.getMoodboardStats(userId);
      
      // Get goals stats
      const goalsStats = await goalsService.getGoalStats(userId);
      
      // Calculate vision score based on various factors including goals
      const visionScore = this.calculateVisionScore(
        journalStats.totalEntries,
        journalStats.currentStreak,
        moodboardStats.totalElements,
        goalsStats.completedGoals,
        goalsStats.averageProgress
      );
      
      // Calculate monthly progress percentage (includes both journal and goals)
      const monthlyJournalGoal = 20; // Target 20 entries per month
      const monthlyGoalsGoal = 2; // Target 2 goals completed per month
      
      const journalProgress = (journalStats.entriesThisMonth / monthlyJournalGoal) * 50;
      const goalsProgress = (goalsStats.completedThisMonth / monthlyGoalsGoal) * 50;
      const monthlyProgress = Math.min(journalProgress + goalsProgress, 100);

      return {
        journalStreak: journalStats.currentStreak,
        longestStreak: journalStats.longestStreak,
        totalEntries: journalStats.totalEntries,
        entriesThisMonth: journalStats.entriesThisMonth,
        goalsCompleted: goalsStats.completedGoals,
        goalsCompletedThisMonth: goalsStats.completedThisMonth,
        goalsCompletedThisYear: goalsStats.completedThisYear,
        activeGoals: goalsStats.activeGoals,
        averageGoalProgress: Math.round(goalsStats.averageProgress),
        visionScore,
        monthlyProgress,
      };
    } catch (error) {
      trackDataError(error, 'AnalyticsService', 'getProgressMetrics');
      throw error;
    }
  }

  /**
   * Get user insights
   */
  async getUserInsights(userId: string): Promise<UserInsights> {
    try {
      // Fetch recent entries for analysis
      const entries = await journalService.getEntries({
        userId,
        pageSize: 100,
      });

      // Analyze writing patterns
      const writingPatterns = this.analyzeWritingPatterns(entries.data);
      
      // Analyze emotional health
      const emotionalHealth = await this.analyzeEmotionalHealth(userId, entries.data);
      
      // Get achievements
      const achievements = this.calculateAchievements(
        entries.total,
        await journalService.getStats(userId)
      );

      return {
        writingPatterns,
        emotionalHealth,
        achievements,
      };
    } catch (error) {
      trackDataError(error, 'AnalyticsService', 'getUserInsights');
      throw error;
    }
  }

  /**
   * Get weekly summary
   */
  async getWeeklySummary(userId: string): Promise<{
    entriesCount: number;
    dominantMood: string;
    keyThemes: string[];
    progressPercentage: number;
  }> {
    try {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const entries = await journalService.getEntries({
        userId,
        startDate: oneWeekAgo,
        endDate: new Date(),
        pageSize: 50,
      });

      // Count mood occurrences
      const moodCounts: Record<string, number> = {};
      entries.data.forEach(entry => {
        if (entry.mood) {
          moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
        }
      });

      const dominantMood = Object.entries(moodCounts)
        .sort(([, a], [, b]) => b - a)[0]?.[0] || 'neutral';

      // Extract key themes from AI summaries
      const keyThemes = this.extractKeyThemes(entries.data);

      // Calculate progress (target: 5 entries per week)
      const progressPercentage = Math.min((entries.data.length / 5) * 100, 100);

      return {
        entriesCount: entries.data.length,
        dominantMood,
        keyThemes,
        progressPercentage,
      };
    } catch (error) {
      trackDataError(error, 'AnalyticsService', 'getWeeklySummary');
      throw error;
    }
  }

  /**
   * Get mood distribution over time
   */
  async getMoodDistribution(
    userId: string,
    period: 'week' | 'month' | 'year' = 'month'
  ): Promise<Record<string, number>> {
    try {
      const startDate = new Date();
      if (period === 'week') {
        startDate.setDate(startDate.getDate() - 7);
      } else if (period === 'month') {
        startDate.setMonth(startDate.getMonth() - 1);
      } else {
        startDate.setFullYear(startDate.getFullYear() - 1);
      }

      const entries = await journalService.getEntries({
        userId,
        startDate,
        endDate: new Date(),
        pageSize: 1000,
      });

      const distribution: Record<string, number> = {};
      
      entries.data.forEach(entry => {
        if (entry.mood) {
          distribution[entry.mood] = (distribution[entry.mood] || 0) + 1;
        }
      });

      return distribution;
    } catch (error) {
      trackDataError(error, 'AnalyticsService', 'getMoodDistribution');
      throw error;
    }
  }

  /**
   * Get productivity insights
   */
  async getProductivityInsights(userId: string): Promise<{
    mostProductiveDay: string;
    mostProductiveTime: string;
    averageEntriesPerWeek: number;
    consistencyScore: number;
  }> {
    try {
      const entries = await journalService.getEntries({
        userId,
        pageSize: 100,
      });

      // Analyze day distribution
      const dayDistribution: Record<string, number> = {};
      const timeDistribution: Record<number, number> = {};

      entries.data.forEach(entry => {
        const date = new Date(entry.created_at);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
        const hour = date.getHours();

        dayDistribution[dayName] = (dayDistribution[dayName] || 0) + 1;
        timeDistribution[hour] = (timeDistribution[hour] || 0) + 1;
      });

      const mostProductiveDay = Object.entries(dayDistribution)
        .sort(([, a], [, b]) => b - a)[0]?.[0] || 'Sunday';

      const mostProductiveHour = Object.entries(timeDistribution)
        .sort(([, a], [, b]) => b - a)[0]?.[0] || '9';

      const mostProductiveTime = this.getTimeRange(parseInt(mostProductiveHour));

      // Calculate average entries per week
      const stats = await journalService.getStats(userId);
      const weeksActive = Math.max(
        1,
        Math.floor((Date.now() - new Date(entries.data[entries.data.length - 1]?.created_at || Date.now()).getTime()) / (7 * 24 * 60 * 60 * 1000))
      );
      const averageEntriesPerWeek = Math.round(stats.totalEntries / weeksActive);

      // Calculate consistency score (based on streak and regular writing)
      const consistencyScore = Math.min(
        100,
        (stats.currentStreak * 5) + (averageEntriesPerWeek * 10)
      );

      return {
        mostProductiveDay,
        mostProductiveTime,
        averageEntriesPerWeek,
        consistencyScore,
      };
    } catch (error) {
      trackDataError(error, 'AnalyticsService', 'getProductivityInsights');
      throw error;
    }
  }

  // Private helper methods
  private calculateVisionScore(
    totalEntries: number,
    currentStreak: number,
    totalElements: number,
    goalsCompleted: number = 0,
    averageGoalProgress: number = 0
  ): number {
    // Weight: entries (30%), streak (20%), moodboard (20%), goals completed (20%), goal progress (10%)
    const entriesScore = Math.min((totalEntries / 100) * 30, 30);
    const streakScore = Math.min((currentStreak / 30) * 20, 20);
    const elementsScore = Math.min((totalElements / 20) * 20, 20);
    const goalsScore = Math.min((goalsCompleted / 10) * 20, 20);
    const progressScore = (averageGoalProgress / 100) * 10;
    
    return Math.round(entriesScore + streakScore + elementsScore + goalsScore + progressScore);
  }

  private analyzeWritingPatterns(entries: any[]): UserInsights['writingPatterns'] {
    if (entries.length === 0) {
      return {
        mostActiveTime: 'Not enough data',
        averageLength: 0,
        topCategories: [],
      };
    }

    // Analyze time patterns
    const timeDistribution: Record<number, number> = {};
    const categoryCount: Record<string, number> = {};
    let totalWords = 0;

    entries.forEach(entry => {
      const hour = new Date(entry.created_at).getHours();
      timeDistribution[hour] = (timeDistribution[hour] || 0) + 1;
      
      if (entry.category) {
        categoryCount[entry.category] = (categoryCount[entry.category] || 0) + 1;
      }
      
      totalWords += entry.content?.split(/\s+/).length || 0;
    });

    const mostActiveHour = Object.entries(timeDistribution)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || '9';

    const topCategories = Object.entries(categoryCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([category]) => category);

    return {
      mostActiveTime: this.getTimeRange(parseInt(mostActiveHour)),
      averageLength: Math.round(totalWords / entries.length),
      topCategories,
    };
  }

  private async analyzeEmotionalHealth(
    userId: string,
    entries: any[]
  ): Promise<UserInsights['emotionalHealth']> {
    if (entries.length === 0) {
      return {
        dominantMood: 'neutral',
        moodStability: 0,
        positivityScore: 50,
      };
    }

    const moodAnalytics = await this.getMoodAnalytics(userId);
    
    const dominantMood = moodAnalytics.topMoods[0]?.mood || 'neutral';
    
    // Calculate mood stability (less variation = more stable)
    const moodVariety = new Set(entries.map(e => e.mood).filter(Boolean)).size;
    const moodStability = Math.max(0, 100 - (moodVariety * 10));
    
    // Calculate positivity score
    const positiveMoods = ['happy', 'excited', 'grateful', 'motivated'];
    const positiveCount = entries.filter(e => positiveMoods.includes(e.mood || '')).length;
    const positivityScore = Math.round((positiveCount / entries.length) * 100);

    return {
      dominantMood,
      moodStability,
      positivityScore,
    };
  }

  private calculateAchievements(totalEntries: number, stats: any): UserInsights['achievements'] {
    const achievements = [];
    const now = new Date();

    if (totalEntries >= 1) {
      achievements.push({
        id: 'first_entry',
        title: 'First Step',
        description: 'Created your first journal entry',
        unlockedAt: now,
      });
    }

    if (stats.currentStreak >= 7) {
      achievements.push({
        id: 'week_streak',
        title: 'Consistent Writer',
        description: 'Maintained a 7-day writing streak',
        unlockedAt: now,
      });
    }

    if (totalEntries >= 30) {
      achievements.push({
        id: 'prolific_writer',
        title: 'Prolific Writer',
        description: 'Created 30 journal entries',
        unlockedAt: now,
      });
    }

    if (stats.averageWordCount >= 200) {
      achievements.push({
        id: 'deep_thinker',
        title: 'Deep Thinker',
        description: 'Average 200+ words per entry',
        unlockedAt: now,
      });
    }

    return achievements;
  }

  private extractKeyThemes(entries: any[]): string[] {
    // Extract themes from AI summaries
    const themes = new Set<string>();
    
    entries.forEach(entry => {
      if (entry.ai_summary) {
        // Simple keyword extraction (could be enhanced with NLP)
        const keywords = entry.ai_summary
          .toLowerCase()
          .match(/\b(gratitude|growth|challenge|success|learning|goal|achievement|reflection)\b/g);
        
        if (keywords) {
          keywords.forEach(keyword => themes.add(keyword));
        }
      }
    });

    return Array.from(themes).slice(0, 5);
  }

  private getTimeRange(hour: number): string {
    if (hour < 6) {return 'Early Morning (12am-6am)';}
    if (hour < 12) {return 'Morning (6am-12pm)';}
    if (hour < 18) {return 'Afternoon (12pm-6pm)';}
    return 'Evening (6pm-12am)';
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();

// Export type for dependency injection
export type IAnalyticsService = AnalyticsService;