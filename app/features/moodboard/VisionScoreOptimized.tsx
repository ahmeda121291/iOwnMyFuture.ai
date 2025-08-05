import React, { useMemo } from 'react';
import { TrendingUp, Target, Award, Flame, BookOpen } from 'lucide-react';
import { type MoodboardElement } from '../../core/types';

interface VisionScoreProps {
  elements: MoodboardElement[];
}

// Memoized sub-components
const MetricCard = React.memo(({ 
  icon: iconComponent, 
  value, 
  label, 
  colorScheme 
}: { 
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  label: string;
  colorScheme: {
    bg: string;
    iconBg: string;
    text: string;
  };
}) => (
  <div className={`text-center p-3 ${colorScheme.bg} rounded-xl`}>
    <div className={`w-8 h-8 ${colorScheme.iconBg} rounded-full flex items-center justify-center mx-auto mb-2`}>
      {React.createElement(iconComponent, { className: "w-4 h-4 text-white" })}
    </div>
    <div className={`text-lg font-bold ${colorScheme.text}`}>{value}</div>
    <div className={`text-xs ${colorScheme.text} font-medium`}>{label}</div>
  </div>
));

const CircularProgress = React.memo(({ score, colors }: { 
  score: number; 
  colors: { from: string; to: string };
}) => {
  const circumference = 2 * Math.PI * 45;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <svg className="w-36 h-36 transform -rotate-90" viewBox="0 0 100 100">
      <circle
        cx="50"
        cy="50"
        r="45"
        stroke="#E5E7EB"
        strokeWidth="4"
        fill="transparent"
        className="opacity-30"
      />
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
  );
});

const MotivationalMessage = React.memo(({ score }: { score: number }) => (
  <div className="p-4 bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/10 rounded-xl">
    <p className="text-sm text-text-primary text-center font-medium">
      {score >= 80 && "🌟 Amazing progress! You're crushing your goals!"}
      {score >= 60 && score < 80 && "🚀 Great momentum! Keep up the excellent work!"}
      {score >= 40 && score < 60 && "💪 You're building good habits. Stay consistent!"}
      {score < 40 && "🌱 Every step forward counts. You've got this!"}
    </p>
  </div>
));

function VisionScore({ elements }: VisionScoreProps) {
  // Calculate score and metrics based on elements
  const { score, metrics, scoreColor, scoreLabel, gradientColors } = useMemo(() => {
    // Calculate score based on number and diversity of elements
    const elementCount = elements.length;
    const hasGoals = elements.some(el => el.type === 'goal');
    const hasAffirmations = elements.some(el => el.type === 'affirmation');
    const hasQuotes = elements.some(el => el.type === 'quote');
    const hasImages = elements.some(el => el.type === 'image');
    
    // Score calculation
    let calculatedScore = 0;
    calculatedScore += Math.min(elementCount * 10, 40); // Up to 40 points for element count
    calculatedScore += hasGoals ? 20 : 0;
    calculatedScore += hasAffirmations ? 15 : 0;
    calculatedScore += hasQuotes ? 15 : 0;
    calculatedScore += hasImages ? 10 : 0;
    
    // Ensure score is between 0 and 100
    calculatedScore = Math.min(100, Math.max(0, calculatedScore));
    
    // Determine color and label
    const getScoreColor = (s: number) => {
      if (s >= 80) {return 'text-green-600';}
      if (s >= 60) {return 'text-blue-600';}
      if (s >= 40) {return 'text-yellow-600';}
      return 'text-red-600';
    };

    const getScoreLabel = (s: number) => {
      if (s >= 80) {return 'Excellent';}
      if (s >= 60) {return 'Good';}
      if (s >= 40) {return 'Fair';}
      return 'Needs Work';
    };

    const getGradientColors = (s: number) => {
      if (s >= 80) {return { from: '#10B981', to: '#059669' };}
      if (s >= 60) {return { from: '#3B82F6', to: '#1D4ED8' };}
      if (s >= 40) {return { from: '#F59E0B', to: '#D97706' };}
      return { from: '#EF4444', to: '#DC2626' };
    };
    
    return {
      score: calculatedScore,
      metrics: {
        goals: elements.filter(el => el.type === 'goal').length,
        affirmations: elements.filter(el => el.type === 'affirmation').length,
        quotes: elements.filter(el => el.type === 'quote').length,
        images: elements.filter(el => el.type === 'image').length,
      },
      scoreColor: getScoreColor(calculatedScore),
      scoreLabel: getScoreLabel(calculatedScore),
      gradientColors: getGradientColors(calculatedScore)
    };
  }, [elements]);

  // Memoize color schemes for metric cards
  const colorSchemes = useMemo(() => ({
    goals: {
      bg: 'bg-gradient-to-br from-blue-50 to-blue-100',
      iconBg: 'bg-blue-500',
      text: 'text-blue-600'
    },
    affirmations: {
      bg: 'bg-gradient-to-br from-green-50 to-green-100',
      iconBg: 'bg-green-500',
      text: 'text-green-600'
    },
    quotes: {
      bg: 'bg-gradient-to-br from-purple-50 to-purple-100',
      iconBg: 'bg-purple-500',
      text: 'text-purple-600'
    },
    images: {
      bg: 'bg-gradient-to-br from-orange-50 to-orange-100',
      iconBg: 'bg-orange-500',
      text: 'text-orange-600'
    }
  }), []);

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/10 to-accent/10 px-6 py-4 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-text-primary flex items-center">
          <TrendingUp className="w-5 h-5 mr-2 text-accent" />
          Vision Score
        </h3>
        <p className="text-sm text-text-secondary mt-1">Your vision board completeness</p>
      </div>

      <div className="p-6">
        {/* Circular Progress */}
        <div className="flex justify-center mb-6">
          <div className="relative w-36 h-36">
            <CircularProgress score={score} colors={gradientColors} />
            
            {/* Score Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-3xl font-bold ${scoreColor}`}>
                {score}
              </span>
              <span className="text-xs text-text-secondary font-medium">
                {scoreLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <MetricCard 
            icon={Target} 
            value={metrics.goals} 
            label="Goals" 
            colorScheme={colorSchemes.goals}
          />
          <MetricCard 
            icon={Award} 
            value={metrics.affirmations} 
            label="Affirmations" 
            colorScheme={colorSchemes.affirmations}
          />
          <MetricCard 
            icon={BookOpen} 
            value={metrics.quotes} 
            label="Quotes" 
            colorScheme={colorSchemes.quotes}
          />
          <MetricCard 
            icon={Flame} 
            value={metrics.images} 
            label="Images" 
            colorScheme={colorSchemes.images}
          />
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-text-secondary mb-2">
            <span>Completeness</span>
            <span>{score}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="h-3 rounded-full transition-all duration-1000 ease-out"
              style={{ 
                width: `${score}%`,
                background: `linear-gradient(90deg, ${gradientColors.from}, ${gradientColors.to})`
              }}
            />
          </div>
        </div>

        {/* Motivational Message */}
        <MotivationalMessage score={score} />

        {/* Tips */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs text-text-secondary text-center">
            💡 <strong>Tip:</strong> Add diverse elements like goals, affirmations, quotes, and images to boost your score!
          </p>
        </div>
      </div>
    </div>
  );
}

export default React.memo(VisionScore);