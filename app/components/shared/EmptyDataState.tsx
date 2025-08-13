import React from 'react';
import { BarChart3, PenTool, Target, TrendingUp } from 'lucide-react';
import Button from '../../shared/components/Button';
import { useNavigate } from 'react-router-dom';

interface EmptyDataStateProps {
  type: 'journal' | 'moodboard' | 'insights' | 'goals';
  timeframe?: string;
}

const EmptyDataState: React.FC<EmptyDataStateProps> = ({ type, timeframe }) => {
  const navigate = useNavigate();

  const content = {
    journal: {
      icon: <PenTool className="w-12 h-12 text-primary-400" />,
      title: 'No Journal Entries Yet',
      description: 'Start documenting your thoughts and track your personal growth journey.',
      action: 'Start Journaling',
      route: '/journal'
    },
    moodboard: {
      icon: <Target className="w-12 h-12 text-accent-400" />,
      title: 'No Vision Boards Created',
      description: 'Create your first vision board to visualize your goals and aspirations.',
      action: 'Create Vision Board',
      route: '/moodboard'
    },
    insights: {
      icon: <BarChart3 className="w-12 h-12 text-primary-400" />,
      title: `No Data for This ${timeframe || 'Period'}`,
      description: 'Start journaling and creating vision boards to see your progress and insights here.',
      action: 'Start Your Journey',
      route: '/journal'
    },
    goals: {
      icon: <TrendingUp className="w-12 h-12 text-success-500" />,
      title: 'No Goals Set',
      description: 'Set meaningful goals to track your progress and achievements.',
      action: 'Set Your First Goal',
      route: '/dashboard'
    }
  };

  const { icon, title, description, action, route } = content[type];

  return (
    <div className="flex flex-col items-center justify-center p-12 bg-gradient-to-br from-primary-50/50 to-accent-50/50 rounded-2xl border border-primary-100">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-text-primary mb-2">{title}</h3>
      <p className="text-text-secondary text-center mb-6 max-w-md">{description}</p>
      <Button
        variant="gradient"
        size="md"
        onClick={() => navigate(route)}
      >
        {action}
      </Button>
    </div>
  );
};

export default EmptyDataState;