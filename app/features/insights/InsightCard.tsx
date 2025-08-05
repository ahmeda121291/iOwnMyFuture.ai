import React, { useMemo } from 'react';
import { type LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface InsightCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: LucideIcon;
  description?: string;
  trend?: number; // percentage change
}

const InsightCard = React.memo(function InsightCard({ 
  title, 
  value, 
  change, 
  changeType = 'neutral', 
  icon: iconComponent, 
  description,
  trend 
}: InsightCardProps) {
  // Memoize computed values
  const changeColor = useMemo(() => {
    switch (changeType) {
      case 'positive': return 'text-green-600';
      case 'negative': return 'text-red-600';
      default: return 'text-text-secondary';
    }
  }, [changeType]);

  const changeIcon = useMemo(() => {
    switch (changeType) {
      case 'positive': return <TrendingUp className="w-4 h-4" />;
      case 'negative': return <TrendingDown className="w-4 h-4" />;
      default: return null;
    }
  }, [changeType]);

  const backgroundGradient = useMemo(() => {
    switch (changeType) {
      case 'positive': return 'from-green-50 to-green-100';
      case 'negative': return 'from-red-50 to-red-100';
      default: return 'from-gray-50 to-gray-100';
    }
  }, [changeType]);

  const progressBarColor = useMemo(() => {
    switch (changeType) {
      case 'positive': return 'bg-green-500';
      case 'negative': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  }, [changeType]);

  const progressBarWidth = useMemo(() => 
    trend !== undefined ? `${Math.min(Math.abs(trend), 100)}%` : '0%'
  , [trend]);

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer group">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-full bg-gradient-to-br ${backgroundGradient}`}>
          {React.createElement(iconComponent, { className: "w-6 h-6 text-accent" })}
        </div>
        {trend !== undefined && (
          <div className={`flex items-center ${changeColor}`}>
            {changeIcon}
            <span className="text-sm font-medium ml-1">
              {trend > 0 ? '+' : ''}{trend}%
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-text-secondary uppercase tracking-wide">
          {title}
        </h3>
        
        <div className="flex items-baseline space-x-2">
          <span className="text-3xl font-bold text-text-primary group-hover:text-accent transition-colors">
            {value}
          </span>
          {change && (
            <span className={`text-sm font-medium flex items-center ${changeColor}`}>
              {changeIcon}
              <span className="ml-1">{change}</span>
            </span>
          )}
        </div>

        {description && (
          <p className="text-sm text-text-secondary leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {/* Progress Bar (if trend is provided) */}
      {trend !== undefined && (
        <div className="mt-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-500 ${progressBarColor}`}
              style={{ width: progressBarWidth }}
            />
          </div>
        </div>
      )}
    </div>
  );
})

export default InsightCard