import React from 'react';
import { TrendingUp, Target, Calendar, Award } from 'lucide-react';

interface VisionScoreProps {
  score: number;
  metrics: {
    goalsSet: number;
    journalEntries: number;
    daysActive: number;
    achievements: number;
  };
}

export default function VisionScore({ score, metrics }: VisionScoreProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Work';
  };

  const circumference = 2 * Math.PI * 45; // radius of 45
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="card">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-text-primary mb-2">Vision Score</h3>
        <p className="text-sm text-text-secondary">Your progress toward achieving your dreams</p>
      </div>

      {/* Circular Progress */}
      <div className="flex justify-center mb-6">
        <div className="relative w-32 h-32">
          <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
            {/* Background Circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              stroke="#E5E7EB"
              strokeWidth="6"
              fill="transparent"
              className="opacity-20"
            />
            {/* Progress Circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              stroke="url(#gradient)"
              strokeWidth="6"
              fill="transparent"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#C3B1E1" />
                <stop offset="100%" stopColor="#8A2BE2" />
              </linearGradient>
            </defs>
          </svg>
          
          {/* Score Text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-2xl font-bold ${getScoreColor(score)}`}>
              {score}
            </span>
            <span className="text-xs text-text-secondary font-medium">
              {getScoreLabel(score)}
            </span>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Target className="w-4 h-4 text-accent mr-2" />
            <span className="text-sm text-text-secondary">Goals Set</span>
          </div>
          <span className="font-semibold text-text-primary">{metrics.goalsSet}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Calendar className="w-4 h-4 text-accent mr-2" />
            <span className="text-sm text-text-secondary">Journal Entries</span>
          </div>
          <span className="font-semibold text-text-primary">{metrics.journalEntries}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <TrendingUp className="w-4 h-4 text-accent mr-2" />
            <span className="text-sm text-text-secondary">Days Active</span>
          </div>
          <span className="font-semibold text-text-primary">{metrics.daysActive}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Award className="w-4 h-4 text-accent mr-2" />
            <span className="text-sm text-text-secondary">Achievements</span>
          </div>
          <span className="font-semibold text-text-primary">{metrics.achievements}</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex justify-between text-xs text-text-secondary mb-2">
          <span>This Week</span>
          <span>{score}/100</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="h-2 rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-1000 ease-out"
            style={{ width: `${score}%` }}
          ></div>
        </div>
      </div>

      {/* Motivational Message */}
      <div className="mt-4 p-3 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg">
        <p className="text-xs text-text-primary text-center">
          {score >= 80 && "Amazing progress! You're crushing your goals! 🌟"}
          {score >= 60 && score < 80 && "Great momentum! Keep up the excellent work! 🚀"}
          {score >= 40 && score < 60 && "You're building good habits. Stay consistent! 💪"}
          {score < 40 && "Every step forward counts. You've got this! 🌱"}
        </p>
      </div>
    </div>
  );
}