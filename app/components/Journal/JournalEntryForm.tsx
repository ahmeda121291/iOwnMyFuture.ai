import React, { useState } from 'react';
import { PenTool, Sparkles, Save, Shuffle, Brain, Loader2 } from 'lucide-react';
import Button from '../Shared/Button';
import { supabase } from '../../lib/supabase';
import { updateOnboardingProgress } from '../../lib/onboarding';

interface JournalEntryFormProps {
  selectedDate: Date;
  existingEntry?: {
    id?: string;
    content?: string;
    ai_summary?: string;
  };
  onSave: (content: string) => Promise<void>;
  onCancel?: () => void;
}

export default function JournalEntryForm({ selectedDate, existingEntry, onSave, onCancel }: JournalEntryFormProps) {
  const [content, setContent] = useState(existingEntry?.content || '');
  const [saving, setSaving] = useState(false);
  const [wordCount, setWordCount] = useState(content.split(/\s+/).filter(Boolean).length);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [summary, setSummary] = useState(existingEntry?.ai_summary || '');
  const [showSummary, setShowSummary] = useState(!!existingEntry?.ai_summary);

  const prompts = [
    "What am I most grateful for today?",
    "What progress did I make toward my goals?",
    "What challenged me today and how did I overcome it?",
    "What did I learn about myself today?",
    "How did I show up for myself and others today?",
    "What would I like to improve about today?",
    "What excited me most about today?",
    "How did I move closer to my dreams today?",
    "What patterns am I noticing in my life?",
    "How did I practice self-care today?",
    "What would I tell my past self about today?",
    "What am I looking forward to tomorrow?"
  ];

  const [currentPrompt, setCurrentPrompt] = useState(prompts[Math.floor(Math.random() * prompts.length)]);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    setWordCount(newContent.split(/\s+/).filter(Boolean).length);
  };

  const handleSave = async () => {
    if (!content.trim()) return;
    
    setSaving(true);
    try {
      await onSave(content);
      // Update onboarding progress for first journal
      if (!existingEntry) {
        await updateOnboardingProgress('created_first_journal', true);
      }
    } catch (error) {
      console.error('Error saving journal entry:', error);
    } finally {
      setSaving(false);
    }
  };

  const insertPrompt = () => {
    const newContent = content + (content ? '\n\n' : '') + currentPrompt + '\n';
    setContent(newContent);
    setWordCount(newContent.split(/\s+/).filter(Boolean).length);
  };

  const shufflePrompt = () => {
    const newPrompt = prompts[Math.floor(Math.random() * prompts.length)];
    setCurrentPrompt(newPrompt);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getReadingTime = () => {
    return Math.ceil(wordCount / 200);
  };

  const generateAISummary = async () => {
    if (!content.trim() || wordCount < 20) {
      alert('Please write at least 20 words before generating a summary.');
      return;
    }

    setGeneratingSummary(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('summarize-entry', {
        body: { 
          entryContent: content,
          entryId: existingEntry?.id 
        },
      });

      if (error) throw error;

      if (result?.summary) {
        setSummary(result.summary);
        setShowSummary(true);
        // Update onboarding progress for AI summary
        await updateOnboardingProgress('generated_ai_summary', true);
      }
    } catch (error) {
      console.error('Error generating summary:', error);
      alert('Failed to generate AI summary. Please try again.');
    } finally {
      setGeneratingSummary(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 border border-primary/10">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <div className="w-12 h-12 bg-gradient-to-r from-primary to-accent rounded-full flex items-center justify-center mr-4">
            <PenTool className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {existingEntry ? 'Edit Entry' : 'New Journal Entry'}
            </h2>
            <p className="text-text-secondary">{formatDate(selectedDate)}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-semibold text-accent">{wordCount}</div>
          <div className="text-sm text-text-secondary">words</div>
          {wordCount > 0 && (
            <div className="text-xs text-text-secondary">{getReadingTime()} min read</div>
          )}
        </div>
      </div>

      {/* Prompt Inspiration */}
      {!existingEntry && (
        <div className="mb-6 p-6 bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 rounded-xl">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center mb-2">
                <Sparkles className="w-5 h-5 text-accent mr-2" />
                <p className="font-semibold text-accent">Writing Prompt</p>
              </div>
              <p className="text-text-primary font-medium italic mb-3">{currentPrompt}</p>
              <div className="flex items-center space-x-3">
                <button
                  onClick={insertPrompt}
                  className="px-4 py-2 bg-white border border-accent/30 rounded-full text-accent hover:bg-accent hover:text-white transition-all duration-200 text-sm font-medium"
                >
                  Use This Prompt
                </button>
                <button
                  onClick={shufflePrompt}
                  className="flex items-center px-3 py-2 rounded-full hover:bg-white/50 transition-colors text-accent"
                  title="Get a new prompt"
                >
                  <Shuffle className="w-4 h-4 mr-1" />
                  <span className="text-sm">Shuffle</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Text Area */}
      <div className="mb-6">
        <textarea
          value={content}
          onChange={handleContentChange}
          placeholder="What's on your mind today? Share your thoughts, goals, reflections, or anything that matters to you..."
          className="w-full h-80 p-6 border-2 border-gray-200 rounded-xl resize-none focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all duration-200 text-text-primary placeholder-text-secondary text-lg leading-relaxed"
          style={{ fontFamily: 'Inter, sans-serif' }}
        />
      </div>

      {/* AI Summary Section */}
      {showSummary && summary && (
        <div className="mb-6 p-6 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center mb-2">
                <Brain className="w-5 h-5 text-purple-600 mr-2" />
                <p className="font-semibold text-purple-600">AI Summary</p>
              </div>
              <p className="text-text-primary italic">{summary}</p>
            </div>
            <button
              onClick={() => setShowSummary(false)}
              className="text-purple-400 hover:text-purple-600 transition-colors"
              title="Hide summary"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="text-sm text-text-secondary">
            {content.trim() ? 'Your thoughts will be private and secure' : 'Start writing to capture your thoughts'}
          </div>
          {wordCount >= 20 && (
            <button
              onClick={generateAISummary}
              disabled={generatingSummary}
              className="flex items-center px-4 py-2 bg-purple-100 text-purple-700 rounded-full hover:bg-purple-200 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generatingSummary ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4 mr-2" />
                  {summary ? 'Regenerate' : 'Generate'} AI Summary
                </>
              )}
            </button>
          )}
        </div>
        
        <div className="flex space-x-3">
          {onCancel && (
            <Button
              variant="secondary"
              onClick={onCancel}
              className="px-6 py-3 rounded-full"
            >
              Cancel
            </Button>
          )}
          <Button
            onClick={handleSave}
            disabled={!content.trim() || saving}
            loading={saving}
            className="px-8 py-3 bg-gradient-to-r from-primary to-accent text-white rounded-full font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-200"
          >
            <Save className="w-4 h-4 mr-2" />
            {existingEntry ? 'Update Entry' : 'Save Entry'}
          </Button>
        </div>
      </div>

      {/* Writing Tips */}
      <div className="pt-6 border-t border-gray-200">
        <div className="flex items-center mb-3">
          <div className="w-6 h-6 bg-gradient-to-r from-primary to-accent rounded-full flex items-center justify-center mr-2">
            <span className="text-white text-xs">✨</span>
          </div>
          <p className="text-sm font-semibold text-text-primary">Writing Tips</p>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <div className="flex items-start space-x-2">
            <div className="w-2 h-2 bg-accent rounded-full mt-2 flex-shrink-0"></div>
            <p className="text-sm text-text-secondary">Write freely without worrying about grammar or structure</p>
          </div>
          <div className="flex items-start space-x-2">
            <div className="w-2 h-2 bg-accent rounded-full mt-2 flex-shrink-0"></div>
            <p className="text-sm text-text-secondary">Focus on your feelings, progress, and insights</p>
          </div>
          <div className="flex items-start space-x-2">
            <div className="w-2 h-2 bg-accent rounded-full mt-2 flex-shrink-0"></div>
            <p className="text-sm text-text-secondary">Be honest and authentic with yourself</p>
          </div>
          <div className="flex items-start space-x-2">
            <div className="w-2 h-2 bg-accent rounded-full mt-2 flex-shrink-0"></div>
            <p className="text-sm text-text-secondary">Consider what you learned and how you grew today</p>
          </div>
        </div>
      </div>
    </div>
  );
}
