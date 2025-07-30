import React from 'react';
import { DivideIcon as LucideIcon } from 'lucide-react';

interface InsightCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: LucideIcon;
  description?: string;
}

export default function InsightCard({ 
  title, 
  value, 
  change, 
  changeType = 'neutral', 
  icon: Icon, 
  description 
}: InsightCardProps) {
  const getChangeColor = () => {
    switch (changeType) {
      case 'positive': return 'text-green-600';
      case 'negative': return 'text-red-600';
      default: return 'text-text-secondary';
    }
  };

  const getChangeIcon = () => {
    switch (changeType) {
      case 'positive': return '↗';
      case 'negative': return '↘';
      default: return '→';
    }
  };

  return (
    <div className="card hover:shadow-lg transition-all duration-300">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center mb-2">
            <Icon className="w-5 h-5 text-accent mr-2" />
            <h3 className="text-sm font-medium text-text-secondary">{title}</h3>
          </div>
          
          <div className="mb-2">
            <span className="text-2xl font-bold text-text-primary">{value}</span>
            {change && (
              <span className={`ml-2 text-sm ${getChangeColor()}`}>
                {getChangeIcon()} {change}
              </span>
            )}
          </div>
          
          {description && (
            <p className="text-xs text-text-secondary">{description}</p>
          )}
        </div>
      </div>
    </div>
  );
}