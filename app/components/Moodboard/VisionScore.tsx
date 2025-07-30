import React from 'react';
import { TrendingUp, Target, Calendar, Award, Flame, BookOpen } from 'lucide-react';

interface VisionScoreProps {
  score: number;
  numberOfJournalEntries: number;
  numberOfGoals: number;
  numberOfCompletedGoals: number;
  daysActive: number;
}

export default function VisionScore({ 
  score, 
  numberOfJournalEntries, 
  numberOfGoals, 
  numberOfCompletedGoals, 
  daysActive 
}: VisionScoreProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Work';
  };

  const getGradientColors = (score: number) => {
    if (score >= 80) return { from: '#10B981', to: '#059669' }; // Green
    if (score >= 60) return { from: '#3B82F6', to: '#1D4ED8' }; // Blue
    if (score >= 40) return { from: '#F59E0B', to: '#D97706' }; // Yellow
    return { from: '#EF4444', to: '#DC2626' }; // Red
  };

  const circumference = 2 * Math.PI * 45; // radius of 45
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const colors = getGradientColors(score);

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/10 to-accent/10 px-6 py-4 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-text-primary flex items-center">
          <TrendingUp className="w-5 h-5 mr-2 text-accent" />
          Vision Score
        </h3>
        <p className="text-sm text-text-secondary mt-1">Your progress toward achieving your dreams</p>
      </div>

      <div className="p-6">
        {/* Circular Progress */}
        <div className="flex justify-center mb-6">
          <div className="relative w-36 h-36">
            <svg className="w-36 h-36 transform -rotate-90" viewBox="0 0 100 100">
              {/* Background Circle */}
              <circle
                cx="50"
                cy="50"
                r="45"
                stroke="#E5E7EB"
                strokeWidth="4"
                fill="transparent"
                className="opacity-30"
              />
              {/* Progress Circle */}
              <circle
                cx="50"
                cy="50"
                r="45"
                stroke={`url(#scoreGradient-${score})`}
                strokeWidth="4"
                fill="transparent"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
              <defs>
                <linearGradient id={`scoreGradient-${score}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={colors.from} />
                  <stop offset="100%" stopColor={colors.to} />
                </linearGradient>
              </defs>
            </svg>
            
            {/* Score Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-3xl font-bold ${getScoreColor(score)}`}>
                {score}
              </span>
              <span className="text-xs text-text-secondary font-medium">
                {getScoreLabel(score)}
              </span>
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-2">
              <Target className="w-4 h-4 text-white" />
            </div>
            <div className="text-lg font-bold text-blue-600">{numberOfGoals}</div>
            <div className="text-xs text-blue-600 font-medium">Goals Set</div>
          </div>
          
          <div className="text-center p-3 bg-gradient-to-br from-green-50 to-green-100 rounded-xl">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-2">
              <Award className="w-4 h-4 text-white" />
            </div>
            <div className="text-lg font-bold text-green-600">{numberOfCompletedGoals}</div>
            <div className="text-xs text-green-600 font-medium">Completed</div>
          </div>
          
          <div className="text-center p-3 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl">
            <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-2">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <div className="text-lg font-bold text-purple-600">{numberOfJournalEntries}</div>
            <div className="text-xs text-purple-600 font-medium">Journal Entries</div>
          </div>
          
          <div className="text-center p-3 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl">
            <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-2">
              <Flame className="w-4 h-4 text-white" />
            </div>
            <div className="text-lg font-bold text-orange-600">{daysActive}</div>
            <div className="text-xs text-orange-600 font-medium">Day Streak</div>
          </div>
        </div>

        {/* Weekly Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-text-secondary mb-2">
            <span>Weekly Progress</span>
            <span>{score}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="h-3 rounded-full transition-all duration-1000 ease-out"
              style={{ 
                width: `${score}%`,
                background: `linear-gradient(90deg, ${colors.from}, ${colors.to})`
              }}
            ></div>
          </div>
        </div>

        {/* Motivational Message */}
        <div className="p-4 bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/10 rounded-xl">
          <p className="text-sm text-text-primary text-center font-medium">
            {score >= 80 && "🌟 Amazing progress! You're crushing your goals!"}
            {score >= 60 && score < 80 && "🚀 Great momentum! Keep up the excellent work!"}
            {score >= 40 && score < 60 && "💪 You're building good habits. Stay consistent!"}
            {score < 40 && "🌱 Every step forward counts. You've got this!"}
          </p>
        </div>

        {/* Tips */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs text-text-secondary text-center">
            💡 <strong>Tip:</strong> Review your vision board daily and update your journal regularly to increase your score!
          </p>
        </div>
      </div>
    </div>
  );
}