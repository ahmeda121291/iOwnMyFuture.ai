import React, { useMemo, useCallback } from 'react';
import { TrendingUp, Target, Award, Flame, BookOpen } from 'lucide-react';

interface VisionScoreProps {
  score: number;
  numberOfJournalEntries: number;
  numberOfGoals: number;
  numberOfCompletedGoals: number;
  daysActive: number;
}

const MetricCard = React.memo(({ 
  icon: iconComponent, 
  value, 
  label, 
  colorClass,
  bgClass 
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  label: string;
  colorClass: string;
  bgClass: string;
}) => (
  <div className={`text-center p-3 ${bgClass} rounded-xl`}>
    <div className={`w-8 h-8 ${colorClass} rounded-full flex items-center justify-center mx-auto mb-2`}>
      {React.createElement(iconComponent, { className: "w-4 h-4 text-white" })}
    </div>
    <div className={`text-lg font-bold ${colorClass.replace('bg-', 'text-')}`}>{value}</div>
    <div className={`text-xs ${colorClass.replace('bg-', 'text-')} font-medium`}>{label}</div>
  </div>
));

function VisionScore({ 
  score, 
  numberOfJournalEntries, 
  numberOfGoals, 
  numberOfCompletedGoals, 
  daysActive 
}: VisionScoreProps) {
  const getScoreColor = useCallback((score: number) => {
    if (score >= 80) {return 'text-green-600';}
    if (score >= 60) {return 'text-blue-600';}
    if (score >= 40) {return 'text-yellow-600';}
    return 'text-red-600';
  }, []);

  const getScoreLabel = useCallback((score: number) => {
    if (score >= 80) {return 'Excellent';}
    if (score >= 60) {return 'Good';}
    if (score >= 40) {return 'Fair';}
    return 'Needs Work';
  }, []);

  const getGradientColors = useCallback((score: number) => {
    if (score >= 80) {return { from: '#10B981', to: '#059669' };} // Green
    if (score >= 60) {return { from: '#3B82F6', to: '#1D4ED8' };} // Blue
    if (score >= 40) {return { from: '#F59E0B', to: '#D97706' };} // Yellow
    return { from: '#EF4444', to: '#DC2626' }; // Red
  }, []);

  const circularProgressData = useMemo(() => {
    const circumference = 2 * Math.PI * 45; // radius of 45
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (score / 100) * circumference;
    const colors = getGradientColors(score);
    
    return {
      circumference,
      strokeDasharray,
      strokeDashoffset,
      colors
    };
  }, [score, getGradientColors]);

  const metricCardsData = useMemo(() => [
    {
      icon: Target,
      value: numberOfGoals,
      label: 'Goals Set',
      colorClass: 'bg-blue-500',
      bgClass: 'bg-gradient-to-br from-blue-50 to-blue-100'
    },
    {
      icon: Award,
      value: numberOfCompletedGoals,
      label: 'Completed',
      colorClass: 'bg-green-500',
      bgClass: 'bg-gradient-to-br from-green-50 to-green-100'
    },
    {
      icon: BookOpen,
      value: numberOfJournalEntries,
      label: 'Journal Entries',
      colorClass: 'bg-purple-500',
      bgClass: 'bg-gradient-to-br from-purple-50 to-purple-100'
    },
    {
      icon: Flame,
      value: daysActive,
      label: 'Day Streak',
      colorClass: 'bg-orange-500',
      bgClass: 'bg-gradient-to-br from-orange-50 to-orange-100'
    }
  ], [numberOfGoals, numberOfCompletedGoals, numberOfJournalEntries, daysActive]);

  const motivationalMessage = useMemo(() => {
    if (score >= 80) {return "🌟 Amazing progress! You're crushing your goals!";}
    if (score >= 60) {return "🚀 Great momentum! Keep up the excellent work!";}
    if (score >= 40) {return "💪 You're building good habits. Stay consistent!";}
    return "🌱 Every step forward counts. You've got this!";
  }, [score]);

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
                strokeDasharray={circularProgressData.strokeDasharray}
                strokeDashoffset={circularProgressData.strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
              <defs>
                <linearGradient id={`scoreGradient-${score}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={circularProgressData.colors.from} />
                  <stop offset="100%" stopColor={circularProgressData.colors.to} />
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
          {metricCardsData.map((card, index) => (
            <MetricCard
              key={index}
              icon={card.icon}
              value={card.value}
              label={card.label}
              colorClass={card.colorClass}
              bgClass={card.bgClass}
            />
          ))}
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
                background: `linear-gradient(90deg, ${circularProgressData.colors.from}, ${circularProgressData.colors.to})`
              }}
            ></div>
          </div>
        </div>

        {/* Motivational Message */}
        <div className="p-4 bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/10 rounded-xl">
          <p className="text-sm text-text-primary text-center font-medium">
            {motivationalMessage}
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

export default React.memo(VisionScore);