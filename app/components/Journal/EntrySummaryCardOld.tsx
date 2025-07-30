import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Eye, Edit3, Trash2, Sparkles, Clock } from 'lucide-react';

interface EntrySummaryCardProps {
  entry: {
    id: string;
    entry_date: string;
    content: string;
    ai_summary?: string;
    created_at: string;
  };
  onView: (entry: any) => void;
  onEdit: (entry: any) => void;
  onDelete: (entryId: string) => void;
  showViewLink?: boolean;
}

export default function EntrySummaryCard({ entry, onView, onEdit, onDelete, showViewLink = false }: EntrySummaryCardProps) {
  const navigate = useNavigate();
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatFullDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getPreview = (content: string, maxLength: number = 180) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength).trim() + '...';
  };

  const getWordCount = (content: string) => {
    return content.split(/\s+/).filter(Boolean).length;
  };

  const getReadingTime = (content: string) => {
    const words = getWordCount(content);
    return Math.ceil(words / 200);
  };

  const getMoodColor = () => {
    // Simple mood detection based on keywords
    const positiveWords = ['happy', 'grateful', 'excited', 'good', 'great', 'amazing', 'wonderful', 'love', 'joy'];
    const negativeWords = ['sad', 'angry', 'frustrated', 'difficult', 'hard', 'challenge', 'worry', 'stress'];
    
    const lowerContent = entry.content.toLowerCase();
    const positiveCount = positiveWords.filter(word => lowerContent.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerContent.includes(word)).length;
    
    if (positiveCount > negativeCount) return 'bg-green-400';
    if (negativeCount > positiveCount) return 'bg-yellow-400';
    return 'bg-blue-400';
  };

  const getMoodLabel = () => {
    const colorClass = getMoodColor();
    if (colorClass === 'bg-green-400') return 'Positive mood detected';
    if (colorClass === 'bg-yellow-400') return 'Reflective mood detected';
    return 'Neutral mood detected';
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group border border-gray-100 overflow-hidden">
      <div onClick={() => onView(entry)} className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-gradient-to-r from-primary/20 to-accent/20 rounded-full flex items-center justify-center mr-3">
              <Calendar className="w-5 h-5 text-accent" />
            </div>
            <div>
              <span className="text-sm font-semibold text-text-primary">
                {formatDate(entry.entry_date)}
              </span>
              <p className="text-xs text-text-secondary">{formatFullDate(entry.entry_date)}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold text-accent">{getWordCount(entry.content)}</div>
            <div className="text-xs text-text-secondary">words</div>
          </div>
        </div>

        {/* AI Summary */}
        {entry.ai_summary && (
          <div className="mb-4 p-4 bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/10 rounded-xl">
            <div className="flex items-start">
              <Sparkles className="w-4 h-4 text-accent mr-2 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-accent mb-1">AI Summary</p>
                <p className="text-sm text-text-secondary leading-relaxed">{entry.ai_summary}</p>
              </div>
            </div>
          </div>
        )}

        {/* Content Preview */}
        <div className="mb-4">
          <p className="text-text-secondary leading-relaxed">
            {getPreview(entry.content)}
          </p>
        </div>

        {/* Bottom Info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 ${getMoodColor()} rounded-full`}></div>
              <span className="text-xs text-text-secondary">{getMoodLabel()}</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 text-xs text-text-secondary">
            <div className="flex items-center">
              <Clock className="w-3 h-3 mr-1" />
              <span>{getReadingTime(entry.content)} min read</span>
            </div>
            <span>
              {new Date(entry.created_at).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-all duration-200">
        {showViewLink && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/journal/${entry.id}`);
            }}
            className="flex items-center px-3 py-2 rounded-full bg-purple-50 hover:bg-purple-100 transition-colors"
            title="View full entry"
          >
            <Eye className="w-4 h-4 text-purple-600 mr-1" />
            <span className="text-xs font-medium text-purple-600">View Full</span>
          </button>
        )}
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            onView(entry);
          }}
          className="flex items-center px-3 py-2 rounded-full bg-blue-50 hover:bg-blue-100 transition-colors"
          title="Quick view"
        >
          <Eye className="w-4 h-4 text-blue-600 mr-1" />
          <span className="text-xs font-medium text-blue-600">Preview</span>
        </button>
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(entry);
          }}
          className="flex items-center px-3 py-2 rounded-full bg-green-50 hover:bg-green-100 transition-colors"
          title="Edit entry"
        >
          <Edit3 className="w-4 h-4 text-green-600 mr-1" />
          <span className="text-xs font-medium text-green-600">Edit</span>
        </button>
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm('Are you sure you want to delete this journal entry?')) {
              onDelete(entry.id);
            }
          }}
          className="flex items-center px-3 py-2 rounded-full bg-red-50 hover:bg-red-100 transition-colors"
          title="Delete entry"
        >
          <Trash2 className="w-4 h-4 text-red-600 mr-1" />
          <span className="text-xs font-medium text-red-600">Delete</span>
        </button>
      </div>
    </div>
  );
}
            title="View full entry"
          >
            <Eye className="w-4 h-4 text-purple-600" />
          </button>
        )}
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            onView(entry);
          }}
          className="p-2 rounded-full hover:bg-blue-50 transition-colors"
          title="Quick view"
        >
          <Eye className="w-4 h-4 text-blue-600" />
        </button>
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(entry);
          }}
          className="p-2 rounded-full hover:bg-green-50 transition-colors"
          title="Edit entry"
        >
          <Edit3 className="w-4 h-4 text-green-600" />
        </button>
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm('Are you sure you want to delete this journal entry?')) {
              onDelete(entry.id);
            }
          }}
          className="p-2 rounded-full hover:bg-red-50 transition-colors"
          title="Delete entry"
        >
          <Trash2 className="w-4 h-4 text-red-600" />
        </button>
      </div>
    </div>
  );
}