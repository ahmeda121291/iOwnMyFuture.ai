import React, { useState, useEffect } from 'react';
import { 
  Brain, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Heart,
  Lightbulb,
  Calendar,
  BarChart3,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { supabase } from '../../core/api/supabase';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';

interface MoodScore {
  mood: string;
  score: number;
  percentage: number;
}

interface TrendData {
  date: string;
  positivity: number;
  moods: string[];
}

interface MoodAnalytics {
  topMoods: MoodScore[];
  trendLine: 'positive' | 'negative' | 'neutral';
  trendData: TrendData[];
  suggestedHabits: string[];
  summary: string;
  totalEntries: number;
  averagePositivity: number;
}

export default function MoodAnalyticsPanel() {
  const [analytics, setAnalytics] = useState<MoodAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadMoodAnalytics();
  }, []);

  const loadMoodAnalytics = async () => {
    try {
      setLoading(true);
      setError('');

      const { data: result, error: functionError } = await supabase.functions.invoke('mood-analytics');

      if (functionError) {throw functionError;}

      setAnalytics(result);
    } catch (err) {
      console.error('Error loading mood analytics:', err);
      setError('Failed to load mood analytics. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getMoodEmoji = (mood: string) => {
    const moodEmojis: Record<string, string> = {
      happy: '😊',
      sad: '😢',
      anxious: '😰',
      calm: '😌',
      energetic: '⚡',
      frustrated: '😤',
      confident: '💪',
      grateful: '🙏',
      hopeful: '🌟',
      tired: '😴'
    };
    return moodEmojis[mood] || '🎭';
  };

  const getMoodColor = (mood: string) => {
    const moodColors: Record<string, string> = {
      happy: 'from-yellow-400 to-orange-400',
      sad: 'from-blue-400 to-indigo-400',
      anxious: 'from-purple-400 to-pink-400',
      calm: 'from-green-400 to-teal-400',
      energetic: 'from-orange-400 to-red-400',
      frustrated: 'from-red-400 to-pink-400',
      confident: 'from-indigo-400 to-purple-400',
      grateful: 'from-pink-400 to-rose-400',
      hopeful: 'from-yellow-400 to-amber-400',
      tired: 'from-gray-400 to-slate-400'
    };
    return moodColors[mood] || 'from-gray-400 to-gray-500';
  };

  const getTrendIcon = () => {
    if (!analytics) {return <Minus className="w-5 h-5" />;}
    
    switch (analytics.trendLine) {
      case 'positive':
        return <TrendingUp className="w-5 h-5 text-green-500" />;
      case 'negative':
        return <TrendingDown className="w-5 h-5 text-red-500" />;
      default:
        return <Minus className="w-5 h-5 text-gray-500" />;
    }
  };

  const getTrendColor = () => {
    if (!analytics) {return 'text-gray-600';}
    
    switch (analytics.trendLine) {
      case 'positive':
        return 'text-green-600';
      case 'negative':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
        <div className="text-center">
          <Brain className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadMoodAnalytics}
            className="flex items-center mx-auto px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!analytics || analytics.totalEntries === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
        <div className="text-center">
          <Brain className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No Data Available</h3>
          <p className="text-gray-600">Start journaling to see your mood analytics!</p>
        </div>
      </div>
    );
  }

  // Prepare chart data
  const chartData = analytics.trendData.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    positivity: (item.positivity + 1) * 50, // Convert -1 to 1 range to 0-100
    mood: item.moods[0] || 'neutral'
  }));

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-indigo-500 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mr-4">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Mood Analytics</h2>
              <p className="text-white/80 text-sm">Last 30 days insights</p>
            </div>
          </div>
          <button
            onClick={loadMoodAnalytics}
            className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            title="Refresh analytics"
          >
            <RefreshCw className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Summary */}
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-4">
          <div className="flex items-start">
            <Sparkles className="w-5 h-5 text-purple-600 mr-3 mt-0.5" />
            <p className="text-gray-700 leading-relaxed">{analytics.summary}</p>
          </div>
        </div>

        {/* Mood Trend */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <BarChart3 className="w-5 h-5 mr-2 text-gray-600" />
              Mood Trend
            </h3>
            <div className={`flex items-center ${getTrendColor()}`}>
              {getTrendIcon()}
              <span className="ml-1 font-medium capitalize">{analytics.trendLine}</span>
            </div>
          </div>

          <div className="h-64 -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPositivity" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  stroke="#9ca3af"
                />
                <YAxis 
                  domain={[0, 100]}
                  ticks={[0, 25, 50, 75, 100]}
                  tick={{ fontSize: 12 }}
                  stroke="#9ca3af"
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number) => [`${Math.round(value)}%`, 'Positivity']}
                />
                <Area 
                  type="monotone" 
                  dataKey="positivity" 
                  stroke="#8B5CF6" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorPositivity)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Moods */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Heart className="w-5 h-5 mr-2 text-gray-600" />
            Your Top Moods
          </h3>
          <div className="space-y-3">
            {analytics.topMoods.map((moodData) => (
              <div key={moodData.mood} className="flex items-center">
                <div className="flex items-center flex-1">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-r ${getMoodColor(moodData.mood)} flex items-center justify-center text-xl`}>
                    {getMoodEmoji(moodData.mood)}
                  </div>
                  <span className="ml-3 font-medium text-gray-700 capitalize">{moodData.mood}</span>
                </div>
                <div className="flex items-center">
                  <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                    <div 
                      className={`h-2 rounded-full bg-gradient-to-r ${getMoodColor(moodData.mood)}`}
                      style={{ width: `${moodData.percentage}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-600 w-12 text-right">
                    {moodData.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Suggested Habits */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Lightbulb className="w-5 h-5 mr-2 text-gray-600" />
            Suggested Habits
          </h3>
          <div className="space-y-2">
            {analytics.suggestedHabits.map((habit, index) => (
              <div key={index} className="flex items-start">
                <div className="w-6 h-6 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-xs font-bold">{index + 1}</span>
                </div>
                <p className="ml-3 text-gray-700 leading-relaxed">{habit}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Calendar className="w-4 h-4 text-gray-500 mr-1" />
              <span className="text-2xl font-bold text-gray-900">{analytics.totalEntries}</span>
            </div>
            <p className="text-sm text-gray-600">Journal Entries</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <TrendingUp className="w-4 h-4 text-gray-500 mr-1" />
              <span className="text-2xl font-bold text-gray-900">
                {Math.round(analytics.averagePositivity * 100)}%
              </span>
            </div>
            <p className="text-sm text-gray-600">Avg Positivity</p>
          </div>
        </div>
      </div>
    </div>
  );
}