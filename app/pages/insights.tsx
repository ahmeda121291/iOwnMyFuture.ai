import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, 
  Calendar, 
  Target, 
  BookOpen, 
  Award, 
  Brain, 
  Download,
  RefreshCw,
  Heart,
  Zap
} from 'lucide-react';
import { getCurrentUser, supabase } from '../core/api/supabase';
import { generateInsightReport } from '../core/api/openai';
import { type User, type JournalEntry } from '../core/types';
import ProgressChartLazy from '../features/insights/ProgressChartLazy';
import InsightCard from '../features/insights/InsightCard';
import MoodTrendChartLazy from '../features/insights/MoodTrendChartLazy';
import Button from '../shared/components/Button';
import Loader from '../shared/components/Loader';
import {
  generateProgressData,
  generateMoodData,
  generateInsightMetrics,
  generateRecommendations
} from '../shared/utils/analytics';

interface MoodboardUpdate {
  id: string;
  updated_at: string;
}

export default function InsightsPage() {
  const [, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiReport, setAiReport] = useState<string>('');
  const [generatingReport, setGeneratingReport] = useState(false);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [moodboards, setMoodboards] = useState<MoodboardUpdate[]>([]);
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'quarter'>('month');
  const navigate = useNavigate();

  const initializePage = useCallback(async () => {
    try {
      const userData = await getCurrentUser();
      if (!userData) {
        navigate('/auth');
        return;
      }
      setUser(userData);
      await loadUserData(userData.id);
    } catch (error) {
      console.error('Error loading user:', error);
      navigate('/auth');
    } finally {
      setLoading(false);
    }
  }, [navigate, timeframe]);

  useEffect(() => {
    initializePage();
  }, [initializePage]);

  const loadUserData = async (userId: string) => {
    try {
      const daysBack = timeframe === 'week' ? 7 : timeframe === 'month' ? 30 : 90;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysBack);

      // Load journal entries
      const { data: entries, error: entriesError } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('user_id', userId)
        .gte('entry_date', cutoffDate.toISOString().split('T')[0])
        .order('entry_date', { ascending: true });

      if (entriesError) {throw entriesError;}
      setJournalEntries(entries || []);

      // Load real moodboard updates from Supabase
      const { data: updates, error: updatesError } = await supabase
        .from('moodboard_updates')
        .select('id, updated_at')
        .eq('user_id', userId)
        .gte('updated_at', cutoffDate.toISOString());
        
      if (updatesError) {throw updatesError;}
      setMoodboards(updates || []);

      // Generate AI insights if we have entries
      if (entries && entries.length > 0) {
        await generateAIInsights(entries);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const generateAIInsights = async (entries: JournalEntry[]) => {
    if (generatingReport) {return;}
    
    setGeneratingReport(true);
    try {
      const summaries = entries
        .map(entry => entry.ai_summary)
        .filter((summary): summary is string => Boolean(summary));
      
      if (summaries.length > 0) {
        const report = await generateInsightReport(summaries);
        setAiReport(report);
      } else {
        setAiReport("Start journaling regularly to get personalized AI insights about your progress and patterns!");
      }
    } catch (error) {
      console.error('Error generating AI insights:', error);
      setAiReport("Unable to generate insights at the moment. Please try again later.");
    } finally {
      setGeneratingReport(false);
    }
  };

  // Use analytics utilities for data processing
  const progressData = generateProgressData(journalEntries, moodboards, timeframe);
  const moodData = generateMoodData(journalEntries, timeframe);
  const metrics = generateInsightMetrics(journalEntries, moodboards);
  const recommendations = generateRecommendations(journalEntries, metrics);

  const exportReport = () => {
    // Stub for export functionality
    alert('Export feature coming soon! Your insights will be available as PDF and CSV.');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pt-20">
        <div className="text-center">
          <Loader size="large" className="mb-4" />
          <p className="text-text-secondary">Loading your insights...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-text-primary mb-2">Analytics & Insights</h1>
            <p className="text-text-secondary">Track your progress and discover patterns in your journey</p>
          </div>
          
          <div className="flex items-center space-x-4 mt-4 md:mt-0">
            {/* Timeframe Selector */}
            <div className="flex bg-white rounded-lg border border-gray-200 p-1">
              {['week', 'month', 'quarter'].map((period) => (
                <button
                  key={period}
                  onClick={() => setTimeframe(period as 'week' | 'month' | 'quarter')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    timeframe === period
                      ? 'bg-accent text-white'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {period.charAt(0).toUpperCase() + period.slice(1)}
                </button>
              ))}
            </div>
            
            <Button variant="secondary" onClick={exportReport}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <InsightCard
            title="Journal Entries"
            value={metrics.totalEntries}
            change={metrics.entriesChange}
            changeType={metrics.entriesChangeType}
            icon={BookOpen}
            description={`${metrics.totalEntries} entries this ${timeframe}`}
            trend={15}
          />
          
          <InsightCard
            title="Moodboard Updates"
            value={metrics.moodboardUpdates}
            change={metrics.moodboardChange}
            changeType={metrics.moodboardChangeType}
            icon={Target}
            description={`${metrics.moodboardUpdates} updates this ${timeframe}`}
            trend={25}
          />
          
          <InsightCard
            title="Current Streak"
            value={`${metrics.currentStreak} days`}
            change={metrics.streakChange}
            changeType={metrics.streakChangeType}
            icon={Zap}
            description="Consecutive days of journaling"
            trend={metrics.currentStreak > 5 ? 20 : 5}
          />
          
          <InsightCard
            title="Avg Words/Entry"
            value={metrics.avgWordsPerEntry}
            change={metrics.wordsChange}
            changeType={metrics.wordsChangeType}
            icon={Award}
            description="Average words per journal entry"
            trend={12}
          />
        </div>

        {/* AI Insights Report */}
        <div className="mb-8">
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <Brain className="w-6 h-6 text-accent mr-3" />
                <div>
                  <h2 className="text-xl font-bold text-text-primary">AI Insights Report</h2>
                  <p className="text-sm text-text-secondary">Personalized analysis of your journey</p>
                </div>
              </div>
              <Button
                variant="secondary"
                onClick={() => generateAIInsights(journalEntries)}
                loading={generatingReport}
                disabled={generatingReport || journalEntries.length === 0}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Regenerate
              </Button>
            </div>

            {generatingReport ? (
              <div className="flex items-center justify-center py-8">
                <Loader className="mr-3" />
                <span className="text-text-secondary">Analyzing your journal entries...</span>
              </div>
            ) : (
              <div className="bg-gradient-to-r from-primary/5 to-accent/5 rounded-lg p-6 border border-primary/10">
                <p className="text-text-primary leading-relaxed whitespace-pre-wrap">
                  {aiReport || "Start journaling to get personalized AI insights!"}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          <ProgressChartLazy data={progressData} />
          <MoodTrendChartLazy data={moodData} chartType="area" />
        </div>

        {/* Weekly Summary & Recommendations */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Weekly Summary */}
          <div className="card">
            <div className="flex items-center mb-6">
              <Calendar className="w-6 h-6 text-accent mr-3" />
              <h3 className="text-xl font-bold text-text-primary">Weekly Summary</h3>
            </div>
            
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <TrendingUp className="w-5 h-5 text-green-600 mr-2" />
                  <span className="font-medium text-green-800">Strong Progress</span>
                </div>
                <p className="text-sm text-green-700">
                  You've been consistent with journaling this week. Your entries show positive momentum!
                </p>
              </div>
              
              {metrics.currentStreak > 5 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <Zap className="w-5 h-5 text-blue-600 mr-2" />
                    <span className="font-medium text-blue-800">Streak Achievement</span>
                  </div>
                  <p className="text-sm text-blue-700">
                    Amazing! You're on a {metrics.currentStreak}-day journaling streak. Keep it up!
                  </p>
                </div>
              )}
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <Target className="w-5 h-5 text-yellow-600 mr-2" />
                  <span className="font-medium text-yellow-800">Focus Area</span>
                </div>
                <p className="text-sm text-yellow-700">
                  Consider updating your vision board to reflect your recent insights and goals.
                </p>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          <div className="card">
            <div className="flex items-center mb-6">
              <Heart className="w-6 h-6 text-accent mr-3" />
              <h3 className="text-xl font-bold text-text-primary">Recommendations</h3>
            </div>
            
            <div className="space-y-4">
              {recommendations.map((rec, index) => (
                <div 
                  key={index}
                  className={`border-l-4 pl-4 ${
                    rec.type === 'positive' ? 'border-green-500' :
                    rec.type === 'warning' ? 'border-yellow-500' :
                    'border-blue-500'
                  }`}
                >
                  <h4 className="font-medium text-text-primary mb-1">{rec.title}</h4>
                  <p className="text-sm text-text-secondary">{rec.description}</p>
                </div>
              ))}
              
              {recommendations.length === 0 && (
                <div className="text-center py-8 text-text-secondary">
                  <p>Keep journaling to unlock personalized recommendations!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}