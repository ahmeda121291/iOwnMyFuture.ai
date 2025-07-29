import React from 'react';
import { Smile, Meh, Frown, TrendingUp } from 'lucide-react';

interface MoodData {
  date: string;
  mood: 'positive' | 'neutral' | 'negative';
  intensity: number; // 1-5 scale
}

interface MoodTrendChartProps {
  data: MoodData[];
}

export default function MoodTrendChart({ data }: MoodTrendChartProps) {
  const getMoodIcon = (mood: string, size: number = 16) => {
    switch (mood) {
      case 'positive':
        return <Smile className={`w-${size/4} h-${size/4} text-green-500`} />;
      case 'negative':
        return <Frown className={`w-${size/4} h-${size/4} text-red-500`} />;
      default:
        return <Meh className={`w-${size/4} h-${size/4} text-yellow-500`} />;
    }
  };

  const getMoodColor = (mood: string) => {
    switch (mood) {
      case 'positive': return '#10b981';
      case 'negative': return '#ef4444';
      default: return '#f59e0b';
    }
  };

  const averageMood = data.reduce((sum, entry) => {
    const moodValue = entry.mood === 'positive' ? 1 : entry.mood === 'neutral' ? 0 : -1;
    return sum + moodValue;
  }, 0) / data.length;

  const trendDirection = averageMood > 0.2 ? 'improving' : averageMood < -0.2 ? 'declining' : 'stable';

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-text-primary">Mood Trends</h3>
        <div className="flex items-center text-sm text-text-secondary">
          <TrendingUp className="w-4 h-4 mr-1" />
          <span className={`capitalize ${
            trendDirection === 'improving' ? 'text-green-600' : 
            trendDirection === 'declining' ? 'text-red-600' : 
            'text-text-secondary'
          }`}>
            {trendDirection}
          </span>
        </div>
      </div>

      {/* Mood Timeline */}
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          {data.slice(-7).map((entry, index) => (
            <div key={index} className="flex flex-col items-center">
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center mb-2 transition-transform hover:scale-110"
                style={{ backgroundColor: `${getMoodColor(entry.mood)}20` }}
              >
                {getMoodIcon(entry.mood)}
              </div>
              <span className="text-xs text-text-secondary">
                {new Date(entry.date).toLocaleDateString('en-US', { weekday: 'short' })}
              </span>
            </div>
          ))}
        </div>

        {/* Trend Line */}
        <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
          <div 
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-red-400 via-yellow-400 to-green-400 transition-all duration-1000"
            style={{ width: `${((averageMood + 1) / 2) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-gray-200">
        <div className="text-center">
          <div className="flex items-center justify-center mb-1">
            <Smile className="w-4 h-4 text-green-500" />
          </div>
          <div className="text-lg font-semibold text-text-primary">
            {data.filter(d => d.mood === 'positive').length}
          </div>
          <div className="text-xs text-text-secondary">Positive</div>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center mb-1">
            <Meh className="w-4 h-4 text-yellow-500" />
          </div>
          <div className="text-lg font-semibold text-text-primary">
            {data.filter(d => d.mood === 'neutral').length}
          </div>
          <div className="text-xs text-text-secondary">Neutral</div>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center mb-1">
            <Frown className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-lg font-semibold text-text-primary">
            {data.filter(d => d.mood === 'negative').length}
          </div>
          <div className="text-xs text-text-secondary">Challenging</div>
        </div>
      </div>
    </div>
  );
}