import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Eye, Edit3, Trash2, Sparkles } from 'lucide-react';

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

  const getPreview = (content: string, maxLength: number = 150) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength).trim() + '...';
  };

  const getWordCount = (content: string) => {
    return content.split(/\s+/).filter(Boolean).length;
  };

  return (
    <div className="card hover:shadow-lg transition-all duration-300 cursor-pointer group">
      <div onClick={() => onView(entry)}>
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <Calendar className="w-4 h-4 text-accent mr-2" />
            <span className="text-sm font-medium text-text-primary">
              {formatDate(entry.entry_date)}
            </span>
          </div>
          <div className="text-xs text-text-secondary">
            {getWordCount(entry.content)} words
          </div>
        </div>

        {/* AI Summary */}
        {entry.ai_summary && (
          <div className="mb-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
            <div className="flex items-start">
              <Sparkles className="w-4 h-4 text-accent mr-2 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-accent mb-1">AI Summary</p>
                <p className="text-sm text-text-secondary italic">{entry.ai_summary}</p>
              </div>
            </div>
          </div>
        )}

        {/* Content Preview */}
        <div className="mb-4">
          <p className="text-text-secondary text-sm leading-relaxed">
            {getPreview(entry.content)}
          </p>
        </div>

        {/* Mood Indicator (if available) */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span className="text-xs text-text-secondary">Positive mood detected</span>
          </div>
          
          <div className="text-xs text-text-secondary">
            {new Date(entry.created_at).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            })}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {showViewLink && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/journal/${entry.id}`);
            }}
            className="p-2 rounded-full hover:bg-purple-50 transition-colors"
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