import React, { useState } from 'react';
import { PenTool, Sparkles, Save } from 'lucide-react';
import Button from '../Shared/Button';

interface JournalEntryFormProps {
  selectedDate: Date;
  existingEntry?: any;
  onSave: (content: string) => Promise<void>;
  onCancel?: () => void;
}

export default function JournalEntryForm({ selectedDate, existingEntry, onSave, onCancel }: JournalEntryFormProps) {
  const [content, setContent] = useState(existingEntry?.content || '');
  const [saving, setSaving] = useState(false);
  const [wordCount, setWordCount] = useState(content.split(/\s+/).filter(Boolean).length);

  const prompts = [
    "What am I most grateful for today?",
    "What progress did I make toward my goals?",
    "What challenged me today and how did I overcome it?",
    "What did I learn about myself today?",
    "How did I show up for myself and others today?",
    "What would I like to improve about today?",
    "What excited me most about today?",
    "How did I move closer to my dreams today?"
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
    // Get a new random prompt
    setCurrentPrompt(prompts[Math.floor(Math.random() * prompts.length)]);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <PenTool className="w-6 h-6 text-accent mr-3" />
          <div>
            <h2 className="text-xl font-semibold text-text-primary">
              {existingEntry ? 'Edit Entry' : 'New Journal Entry'}
            </h2>
            <p className="text-text-secondary text-sm">{formatDate(selectedDate)}</p>
          </div>
        </div>
        <div className="text-sm text-text-secondary">
          {wordCount} words
        </div>
      </div>

      {/* Prompt Inspiration */}
      {!existingEntry && (
        <div className="mb-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-text-primary mb-1">Writing Prompt:</p>
              <p className="text-text-secondary italic">{currentPrompt}</p>
            </div>
            <button
              onClick={insertPrompt}
              className="ml-3 p-2 rounded-full hover:bg-primary/10 transition-colors"
              title="Insert this prompt"
            >
              <Sparkles className="w-4 h-4 text-accent" />
            </button>
          </div>
        </div>
      )}

      {/* Text Area */}
      <div className="mb-6">
        <textarea
          value={content}
          onChange={handleContentChange}
          placeholder="What's on your mind today? Share your thoughts, goals, reflections, or anything that matters to you..."
          className="w-full h-64 p-4 border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-colors text-text-primary placeholder-text-secondary"
          style={{ fontFamily: 'Inter, sans-serif', lineHeight: '1.6' }}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-text-secondary">
          {content.trim() ? 'Your thoughts will be private and secure' : 'Start writing to capture your thoughts'}
        </div>
        
        <div className="flex space-x-3">
          {onCancel && (
            <Button
              variant="secondary"
              onClick={onCancel}
            >
              Cancel
            </Button>
          )}
          <Button
            onClick={handleSave}
            disabled={!content.trim() || saving}
            loading={saving}
          >
            <Save className="w-4 h-4 mr-2" />
            {existingEntry ? 'Update Entry' : 'Save Entry'}
          </Button>
        </div>
      </div>

      {/* Writing Tips */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <p className="text-xs text-text-secondary mb-2 font-medium">✨ Writing Tips:</p>
        <ul className="text-xs text-text-secondary space-y-1">
          <li>• Write freely without worrying about grammar or structure</li>
          <li>• Focus on your feelings, progress, and insights</li>
          <li>• Be honest and authentic with yourself</li>
          <li>• Consider what you learned and how you grew today</li>
        </ul>
      </div>
    </div>
  );
}