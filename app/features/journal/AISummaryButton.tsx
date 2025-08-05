import React, { useState } from 'react';
import { Brain, Loader2, X, Sparkles } from 'lucide-react';
import { supabase } from '../../core/api/supabase';

interface AISummaryButtonProps {
  content: string;
  entryId?: string;
  onSummaryGenerated?: (summary: string) => void;
  minWords?: number;
  className?: string;
}

export default function AISummaryButton({ 
  content, 
  entryId, 
  onSummaryGenerated,
  minWords = 20,
  className = ''
}: AISummaryButtonProps) {
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [summary, setSummary] = useState('');
  const [showSummary, setShowSummary] = useState(false);

  const wordCount = content.split(/\s+/).filter(Boolean).length;

  const generateAISummary = async () => {
    if (!content.trim() || wordCount < minWords) {
      alert(`Please write at least ${minWords} words before generating a summary.`);
      return;
    }

    setGeneratingSummary(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('summarize-entry', {
        body: { 
          entryContent: content,
          entryId 
        },
      });

      if (error) {throw error;}

      if (result?.summary) {
        setSummary(result.summary);
        setShowSummary(true);
        onSummaryGenerated?.(result.summary);
      }
    } catch (error) {
      console.error('Error generating summary:', error);
      alert('Failed to generate AI summary. Please try again.');
    } finally {
      setGeneratingSummary(false);
    }
  };

  if (wordCount < minWords) {
    return null;
  }

  return (
    <>
      <button
        onClick={generateAISummary}
        disabled={generatingSummary}
        className={`flex items-center px-4 py-2 bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-700 rounded-full hover:from-purple-200 hover:to-indigo-200 transition-all duration-200 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      >
        {generatingSummary ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Generating Summary...
          </>
        ) : (
          <>
            <Brain className="w-4 h-4 mr-2" />
            {summary ? 'Regenerate' : 'Generate'} AI Summary
          </>
        )}
      </button>

      {/* Summary Modal/Popup */}
      {showSummary && summary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-fadeIn">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full flex items-center justify-center mr-3">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">AI Summary</h3>
                  <p className="text-sm text-gray-500">Generated from your journal entry</p>
                </div>
              </div>
              <button
                onClick={() => setShowSummary(false)}
                className="p-1 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-4 mb-4">
              <p className="text-gray-700 leading-relaxed italic">{summary}</p>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowSummary(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(summary);
                  alert('Summary copied to clipboard!');
                }}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition-colors"
              >
                Copy Summary
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}