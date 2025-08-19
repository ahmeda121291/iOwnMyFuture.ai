import React from 'react';
import { 
  BookOpen, 
  Palette, 
  Target, 
  Trophy, 
  CreditCard, 
  User, 
  Camera,
  Pin,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  Share2,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

/**
 * Maps activity types to Lucide React icons
 */
export function getActivityIcon(type: string, action?: string): React.ReactNode {
  // Type-based icons
  const typeIconMap: Record<string, React.ReactNode> = {
    'journal_entry': <BookOpen className="w-5 h-5" />,
    'moodboard': <Palette className="w-5 h-5" />,
    'goal': <Target className="w-5 h-5" />,
    'milestone': <Trophy className="w-5 h-5" />,
    'subscription': <CreditCard className="w-5 h-5" />,
    'profile': <User className="w-5 h-5" />,
    'snapshot': <Camera className="w-5 h-5" />
  };

  // For certain combinations, use action-specific icons
  if (action) {
    if (type === 'goal' && action === 'completed') {
      return <CheckCircle className="w-5 h-5" />;
    }
    if (type === 'moodboard' && action === 'shared') {
      return <Share2 className="w-5 h-5" />;
    }
  }

  return typeIconMap[type] || <Pin className="w-5 h-5" />;
}

/**
 * Gets the color class for an activity based on its action
 */
export function getActivityColor(action: string): string {
  const colorMap: Record<string, string> = {
    'created': 'text-green-600',
    'updated': 'text-blue-600',
    'deleted': 'text-red-600',
    'completed': 'text-purple-600',
    'shared': 'text-indigo-600',
    'upgraded': 'text-green-600',
    'downgraded': 'text-orange-600'
  };

  return colorMap[action] || 'text-gray-600';
}

/**
 * Gets the background color class for activity icons
 */
export function getActivityBgColor(action: string): string {
  const bgColorMap: Record<string, string> = {
    'created': 'from-green-100 to-green-200',
    'updated': 'from-blue-100 to-blue-200',
    'deleted': 'from-red-100 to-red-200',
    'completed': 'from-purple-100 to-purple-200',
    'shared': 'from-indigo-100 to-indigo-200',
    'upgraded': 'from-green-100 to-green-200',
    'downgraded': 'from-orange-100 to-orange-200'
  };

  return bgColorMap[action] || 'from-gray-100 to-gray-200';
}