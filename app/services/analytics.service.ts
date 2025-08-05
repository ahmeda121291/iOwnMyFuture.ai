import { supabase } from '../core/api/supabase';
import { journalService } from './journal.service';
import { moodboardService } from './moodboard.service';

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
      console.error('GetMoodAnalytics error:', error);
      
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
      
      // Calculate vision score based on various factors
      const visionScore = this.calculateVisionScore(
        journalStats.totalEntries,
        journalStats.currentStreak,
        moodboardStats.totalElements
      );
      
      // Calculate monthly progress percentage
      const monthlyGoal = 20; // Target 20 entries per month
      const monthlyProgress = Math.min(
        (journalStats.entriesThisMonth / monthlyGoal) * 100,
        100
      );

      return {
        journalStreak: journalStats.currentStreak,
        longestStreak: journalStats.longestStreak,
        totalEntries: journalStats.totalEntries,
        entriesThisMonth: journalStats.entriesThisMonth,
        goalsCompleted: 0, // TODO: Implement goals tracking
        visionScore,
        monthlyProgress,
      };
    } catch (error) {
      console.error('GetProgressMetrics error:', error);
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
      console.error('GetUserInsights error:', error);
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
      console.error('GetWeeklySummary error:', error);
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
      console.error('GetMoodDistribution error:', error);
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
      console.error('GetProductivityInsights error:', error);
      throw error;
    }
  }

  // Private helper methods
  private calculateVisionScore(
    totalEntries: number,
    currentStreak: number,
    totalElements: number
  ): number {
    const entriesScore = Math.min(totalEntries * 2, 40);
    const streakScore = Math.min(currentStreak * 5, 30);
    const elementsScore = Math.min(totalElements * 3, 30);
    
    return Math.min(entriesScore + streakScore + elementsScore, 100);
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