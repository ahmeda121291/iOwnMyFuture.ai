import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { PenTool, Sparkles, Save, Shuffle, Brain, Loader2, AlertCircle } from 'lucide-react';
import Button from '../../shared/components/Button';
import { supabase } from '../../core/api/supabase';
import { updateOnboardingProgress } from '../../core/api/onboarding';
import { CreateJournalEntrySchema, validateData } from '../../shared/validation/schemas';
import { useCSRFToken, createSecureFormData } from '../../shared/security/csrf';
import { errorTracker } from '../../shared/utils/errorTracking';

// Typed Props interface
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

// Constants
const WRITING_PROMPTS = [
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

const MIN_WORDS_FOR_SUMMARY = 20;
const WORDS_PER_MINUTE = 200;

export default function JournalEntryForm({ 
  selectedDate, 
  existingEntry, 
  onSave, 
  onCancel 
}: JournalEntryFormProps) {
  // Custom hooks and state at top
  const [content, setContent] = useState(existingEntry?.content || '');
  const [mood, setMood] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [tags, setTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [summary, setSummary] = useState(existingEntry?.ai_summary || '');
  const [showSummary, setShowSummary] = useState(!!existingEntry?.ai_summary);
  const [currentPromptIndex, setCurrentPromptIndex] = useState(
    Math.floor(Math.random() * WRITING_PROMPTS.length)
  );
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const { getToken: _getToken } = useCSRFToken();

  // Computed values
  const wordCount = useMemo(() => {
    return content.split(/\s+/).filter(Boolean).length;
  }, [content]);

  const readingTime = useMemo(() => {
    return Math.ceil(wordCount / WORDS_PER_MINUTE);
  }, [wordCount]);

  const currentPrompt = useMemo(() => {
    return WRITING_PROMPTS[currentPromptIndex];
  }, [currentPromptIndex]);

  const formattedDate = useMemo(() => {
    return selectedDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }, [selectedDate]);

  // Validation effect
  useEffect(() => {
    if (content.trim()) {
      const formData = {
        entry_date: selectedDate.toISOString(),
        content: content.trim(),
        mood: mood || undefined,
        category: category || undefined,
        tags: tags.length > 0 ? tags : undefined,
        csrf_token: 'placeholder', // Will be replaced during save
      };

      const validation = validateData(CreateJournalEntrySchema.omit({ csrf_token: true }), formData);
      if (!validation.success) {
        setValidationErrors(validation.error.split(', '));
      } else {
        setValidationErrors([]);
      }
    } else {
      setValidationErrors([]);
    }
  }, [content, mood, category, tags, selectedDate]);

  // Event handlers
  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
  }, []);

  const handleMoodChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setMood(e.target.value);
  }, []);

  const handleCategoryChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setCategory(e.target.value);
  }, []);

  const handleTagsChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const tagString = e.target.value;
    const tagArray = tagString
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0)
      .slice(0, 20); // Max 20 tags
    setTags(tagArray);
  }, []);

  const handleSave = useCallback(async () => {
    if (!content.trim()) {return;}
    
    setSaving(true);
    setValidationErrors([]);
    
    try {
      // Create secure form data with CSRF token
      const secureFormData = await createSecureFormData({
        entry_date: selectedDate.toISOString(),
        content: content.trim(),
        mood: mood || undefined,
        category: category || undefined,
        tags: tags.length > 0 ? tags : undefined,
      });

      // Validate with Zod
      const validation = validateData(CreateJournalEntrySchema, secureFormData);
      if (!validation.success) {
        setValidationErrors(validation.error.split(', '));
        return;
      }

      // Call the parent's onSave with validated data
      await onSave(content);
      
      // Update onboarding progress for first journal
      if (!existingEntry) {
        await updateOnboardingProgress('created_first_journal', true);
      }
    } catch (error) {
      errorTracker.trackError(error, { component: 'JournalEntryForm', action: 'saveEntry' });
      setValidationErrors(['Failed to save journal entry. Please try again.']);
    } finally {
      setSaving(false);
    }
  }, [content, mood, category, tags, selectedDate, existingEntry, onSave]);

  const insertPrompt = useCallback(() => {
    const newContent = content + (content ? '\n\n' : '') + currentPrompt + '\n';
    setContent(newContent);
  }, [content, currentPrompt]);

  const shufflePrompt = useCallback(() => {
    setCurrentPromptIndex(Math.floor(Math.random() * WRITING_PROMPTS.length));
  }, []);

  const generateAISummary = useCallback(async () => {
    if (!content.trim() || wordCount < MIN_WORDS_FOR_SUMMARY) {
      toast.error(`Please write at least ${MIN_WORDS_FOR_SUMMARY} words before generating a summary.`);
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

      if (error) {throw error;}

      if (result?.summary) {
        setSummary(result.summary);
        setShowSummary(true);
        await updateOnboardingProgress('generated_ai_summary', true);
      }
    } catch (error) {
      errorTracker.trackError(error, { component: 'JournalEntryForm', action: 'generateSummary' });
      toast.error('Failed to generate AI summary. Please try again.');
    } finally {
      setGeneratingSummary(false);
    }
  }, [content, wordCount, existingEntry?.id]);

  // Early returns for loading/error states would go here if needed

  // Main JSX render
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
            <p className="text-text-secondary">{formattedDate}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-semibold text-accent">{wordCount}</div>
          <div className="text-sm text-text-secondary">words</div>
          {wordCount > 0 && (
            <div className="text-xs text-text-secondary">{readingTime} min read</div>
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

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-red-700 mb-2">Please fix the following errors:</p>
              <ul className="list-disc list-inside space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index} className="text-sm text-red-600">{error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Mood and Category Selection */}
      <div className="mb-6 grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            How are you feeling? (Optional)
          </label>
          <select
            value={mood}
            onChange={handleMoodChange}
            className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all duration-200"
          >
            <option value="">Select a mood</option>
            <option value="happy">😊 Happy</option>
            <option value="grateful">🙏 Grateful</option>
            <option value="excited">🎉 Excited</option>
            <option value="motivated">💪 Motivated</option>
            <option value="neutral">😐 Neutral</option>
            <option value="sad">😢 Sad</option>
            <option value="anxious">😰 Anxious</option>
            <option value="stressed">😤 Stressed</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Category (Optional)
          </label>
          <select
            value={category}
            onChange={handleCategoryChange}
            className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all duration-200"
          >
            <option value="">Select a category</option>
            <option value="gratitude">🙏 Gratitude</option>
            <option value="goals">🎯 Goals</option>
            <option value="reflection">🤔 Reflection</option>
            <option value="dreams">✨ Dreams</option>
            <option value="challenges">💪 Challenges</option>
            <option value="achievements">🏆 Achievements</option>
            <option value="general">📝 General</option>
          </select>
        </div>
      </div>

      {/* Tags Input */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-text-primary mb-2">
          Tags (Optional - separate with commas)
        </label>
        <input
          type="text"
          value={tags.join(', ')}
          onChange={handleTagsChange}
          placeholder="e.g. work, family, health, goals"
          className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all duration-200"
          maxLength={500}
        />
        {tags.length > 15 && (
          <p className="text-sm text-amber-600 mt-1">
            You have {tags.length} tags. Consider using fewer tags for better organization.
          </p>
        )}
      </div>

      {/* Text Area */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-text-primary mb-2">
          Your Journal Entry *
        </label>
        <textarea
          value={content}
          onChange={handleContentChange}
          placeholder="What's on your mind today? Share your thoughts, goals, reflections, or anything that matters to you..."
          className={`w-full h-80 p-6 border-2 rounded-xl resize-none focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all duration-200 text-text-primary placeholder-text-secondary text-lg leading-relaxed ${
            validationErrors.some(err => err.includes('content')) 
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
              : 'border-gray-200'
          }`}
          style={{ fontFamily: 'Inter, sans-serif' }}
          maxLength={50000}
        />
        <div className="flex justify-between mt-2">
          <p className="text-sm text-text-secondary">
            {content.length}/50,000 characters
          </p>
          <p className="text-sm text-text-secondary">
            * Required field
          </p>
        </div>
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
          {wordCount >= MIN_WORDS_FOR_SUMMARY && (
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
      <WritingTipsSection />
    </div>
  );
}

// Sub-component for Writing Tips
function WritingTipsSection() {
  const tips = [
    "Write freely without worrying about grammar or structure",
    "Focus on your feelings, progress, and insights",
    "Be honest and authentic with yourself",
    "Consider what you learned and how you grew today"
  ];

  return (
    <div className="pt-6 border-t border-gray-200">
      <div className="flex items-center mb-3">
        <div className="w-6 h-6 bg-gradient-to-r from-primary to-accent rounded-full flex items-center justify-center mr-2">
          <span className="text-white text-xs">✨</span>
        </div>
        <p className="text-sm font-semibold text-text-primary">Writing Tips</p>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        {tips.map((tip, index) => (
          <div key={index} className="flex items-start space-x-2">
            <div className="w-2 h-2 bg-accent rounded-full mt-2 flex-shrink-0"></div>
            <p className="text-sm text-text-secondary">{tip}</p>
          </div>
        ))}
      </div>
    </div>
  );
}