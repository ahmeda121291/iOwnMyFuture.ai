import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Edit3, 
  Trash2, 
  Calendar, 
  Clock, 
  Brain,
  Download,
  Share2,
  FileText
} from 'lucide-react';
import { getCurrentUser, supabase } from '../../core/api/supabase';
import { summarizeJournalEntry } from '../../core/api/openai';
import { type JournalEntry } from '../../core/types';
import JournalEntryForm from '../../features/journal/JournalEntryForm';
import Button from '../../shared/components/Button';
import Modal from '../../shared/components/Modal';
import Loader from '../../shared/components/Loader';
import toast from 'react-hot-toast';
import { errorTracker } from '../../shared/utils/errorTracking';
import { shareJournalEntry, downloadAsTextFile, isWebShareSupported } from '../../shared/utils/share';

export default function JournalEntryPage() {
  const { entryId } = useParams();
  const navigate = useNavigate();
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [regeneratingSummary, setRegeneratingSummary] = useState(false);

  useEffect(() => {
    const loadEntry = async () => {
      try {
        const user = await getCurrentUser();
        if (!user) {
          navigate('/auth');
          return;
        }

        const { data, error } = await supabase
          .from('journal_entries')
          .select('*')
          .eq('id', entryId)
          .eq('user_id', user.id)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            // Entry not found
            navigate('/journal');
            return;
          }
          throw error;
        }
        setEntry(data);
      } catch (error) {
        errorTracker.trackError(error, { component: 'JournalEntry', action: 'loadEntry' });
        navigate('/journal');
      } finally {
        setLoading(false);
      }
    };
    
    if (entryId) {
      loadEntry();
    }
  }, [entryId, navigate]);

  // loadEntry function was moved inside useEffect

  const handleSave = async (content: string) => {
    try {
      const { data, error } = await supabase
        .from('journal_entries')
        .update({ content })
        .eq('id', entryId)
        .select()
        .single();

      if (error) {throw error;}

      setEntry(data);
      setEditing(false);

      // Regenerate AI summary
      try {
        const aiSummary = await summarizeJournalEntry(content);
        const { error: summaryError } = await supabase
          .from('journal_entries')
          .update({ ai_summary: aiSummary })
          .eq('id', entryId);

        if (!summaryError) {
          setEntry((prev) => prev ? ({ ...prev, ai_summary: aiSummary }) : prev);
        }
      } catch (_aiError) {
        // AI summarization is optional, silently fail
      }
    } catch (error) {
      errorTracker.trackError(error, { component: 'JournalEntry', action: 'saveEntry' });
      toast.error('Failed to save changes. Please try again.');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this journal entry? This action cannot be undone.')) {
      return;
    }

    try {
      const user = await getCurrentUser();
      const { error } = await supabase
        .from('journal_entries')
        .delete()
        .eq('id', entryId)
        .eq('user_id', user?.id);

      if (error) {throw error;}

      navigate('/journal');
    } catch (error) {
      errorTracker.trackError(error, { component: 'JournalEntry', action: 'deleteEntry' });
      toast.error('Failed to delete entry. Please try again.');
    }
  };

  const handleShare = async () => {
    if (!entry) {
      return;
    }
    
    try {
      await shareJournalEntry(entry);
      setShowShareMenu(false);
    } catch (error) {
      console.error('Share failed:', error);
      toast.error('Failed to share entry');
    }
  };

  const handleExport = (format: 'print' | 'text') => {
    if (!entry) {
      return;
    }
    
    if (format === 'print') {
      window.print();
    } else {
      const content = formatEntryForExport(entry);
      const filename = `journal-entry-${entry.entry_date}.txt`;
      downloadAsTextFile(content, filename);
    }
    setShowShareMenu(false);
  };

  const formatEntryForExport = (entry: JournalEntry): string => {
    const sections = [];
    const formattedDate = new Date(entry.entry_date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    sections.push(`Journal Entry - ${formattedDate}`);
    sections.push('='.repeat(50));
    sections.push('');
    
    if (entry.ai_summary) {
      sections.push('Summary:');
      sections.push(entry.ai_summary);
      sections.push('');
    }
    
    if (entry.mood) {
      sections.push(`Mood: ${entry.mood}`);
      sections.push('');
    }
    
    if (entry.tags && entry.tags.length > 0) {
      sections.push(`Tags: ${entry.tags.join(', ')}`);
      sections.push('');
    }
    
    sections.push('Entry:');
    sections.push('-'.repeat(50));
    sections.push(entry.content);
    
    return sections.join('\n');
  };

  const regenerateAISummary = async () => {
    if (!entry?.content) {return;}

    setRegeneratingSummary(true);
    try {
      const aiSummary = await summarizeJournalEntry(entry.content);
      
      const { error } = await supabase
        .from('journal_entries')
        .update({ ai_summary: aiSummary })
        .eq('id', entryId);

      if (error) {throw error;}

      setEntry((prev) => prev ? ({ ...prev, ai_summary: aiSummary }) : prev);
    } catch (error) {
      errorTracker.trackError(error, { component: 'JournalEntry', action: 'regenerateSummary' });
      toast.error('Failed to regenerate AI summary. Please try again.');
    } finally {
      setRegeneratingSummary(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getWordCount = (content: string) => {
    return content.split(/\s+/).filter(Boolean).length;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pt-20">
        <Loader size="large" />
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="min-h-screen bg-background pt-20">
        <div className="container mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold text-text-primary mb-4">Entry Not Found</h1>
          <p className="text-text-secondary mb-6">The journal entry you're looking for doesn't exist or you don't have permission to view it.</p>
          <Button onClick={() => navigate('/journal')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Journal
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="container mx-auto px-4 py-8">
        {/* Navigation */}
        <div className="flex items-center justify-between mb-8">
          <Button
            variant="secondary"
            onClick={() => navigate('/journal')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Journal
          </Button>

          <div className="flex space-x-3">
            {/* Share & Export Menu */}
            <div className="relative">
              <Button
                variant="secondary"
                onClick={() => setShowShareMenu(!showShareMenu)}
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
              
              {showShareMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                  <div className="p-2">
                    <button
                      onClick={handleShare}
                      className="w-full px-3 py-2 text-left hover:bg-gray-50 rounded-md flex items-center gap-3 transition-colors"
                    >
                      <Share2 className="w-4 h-4 text-gray-600" />
                      <div>
                        <div className="text-sm font-medium text-gray-700">Share Entry</div>
                        <div className="text-xs text-gray-500">
                          {isWebShareSupported() ? 'Share via apps' : 'Copy to clipboard'}
                        </div>
                      </div>
                    </button>
                    
                    <div className="border-t border-gray-100 my-2"></div>
                    
                    <button
                      onClick={() => handleExport('print')}
                      className="w-full px-3 py-2 text-left hover:bg-gray-50 rounded-md flex items-center gap-3 transition-colors"
                    >
                      <FileText className="w-4 h-4 text-gray-600" />
                      <div>
                        <div className="text-sm font-medium text-gray-700">Export as PDF</div>
                        <div className="text-xs text-gray-500">Open print dialog</div>
                      </div>
                    </button>
                    
                    <button
                      onClick={() => handleExport('text')}
                      className="w-full px-3 py-2 text-left hover:bg-gray-50 rounded-md flex items-center gap-3 transition-colors"
                    >
                      <Download className="w-4 h-4 text-gray-600" />
                      <div>
                        <div className="text-sm font-medium text-gray-700">Download Text</div>
                        <div className="text-xs text-gray-500">Save as .txt file</div>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            <Button
              variant="secondary"
              onClick={() => setEditing(true)}
            >
              <Edit3 className="w-4 h-4 mr-2" />
              Edit
            </Button>
            
            <Button
              variant="secondary"
              onClick={handleDelete}
              className="text-red-600 border-red-300 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="card">
              {/* Entry Header */}
              <div className="border-b border-gray-200 pb-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h1 className="text-2xl font-bold text-text-primary">
                    Journal Entry
                  </h1>
                  <div className="text-sm text-text-secondary">
                    {getWordCount(entry.content)} words
                  </div>
                </div>

                <div className="flex items-center space-x-6 text-sm text-text-secondary">
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    <span>{formatDate(entry.entry_date)}</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    <span>Written at {formatTime(entry.created_at)}</span>
                  </div>
                </div>
              </div>

              {/* AI Summary */}
              {entry.ai_summary && (
                <div className="mb-6 p-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg border border-primary/20">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start flex-1">
                      <Brain className="w-5 h-5 text-accent mr-3 mt-1 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-accent mb-2">AI Summary</p>
                        <p className="text-text-secondary italic leading-relaxed">
                          {entry.ai_summary}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="secondary"
                      size="small"
                      onClick={regenerateAISummary}
                      loading={regeneratingSummary}
                      className="ml-4"
                    >
                      Regenerate
                    </Button>
                  </div>
                </div>
              )}

              {/* Entry Content */}
              <div className="prose max-w-none">
                <div className="text-text-primary leading-relaxed whitespace-pre-wrap">
                  {entry.content}
                </div>
              </div>

              {/* Entry Footer */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between text-sm text-text-secondary">
                  <div>
                    Created {new Date(entry.created_at).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true
                    })}
                  </div>
                  {entry.created_at !== entry.updated_at && (
                    <div>
                      Last updated {new Date(entry.updated_at || entry.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="card">
              <h3 className="text-lg font-semibold text-text-primary mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={() => setEditing(true)}
                  className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-accent/50 hover:bg-accent/5 transition-colors"
                >
                  <Edit3 className="w-4 h-4 text-accent mb-1" />
                  <p className="text-sm font-medium text-text-primary">Edit Entry</p>
                  <p className="text-xs text-text-secondary">Make changes to this entry</p>
                </button>

                <button
                  onClick={regenerateAISummary}
                  disabled={regeneratingSummary}
                  className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-accent/50 hover:bg-accent/5 transition-colors disabled:opacity-50"
                >
                  <Brain className="w-4 h-4 text-accent mb-1" />
                  <p className="text-sm font-medium text-text-primary">
                    {regeneratingSummary ? 'Generating...' : 'AI Analysis'}
                  </p>
                  <p className="text-xs text-text-secondary">Generate new insights</p>
                </button>

                <button
                  onClick={() => navigate('/journal')}
                  className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-accent/50 hover:bg-accent/5 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 text-accent mb-1" />
                  <p className="text-sm font-medium text-text-primary">Back to Journal</p>
                  <p className="text-xs text-text-secondary">View all entries</p>
                </button>
              </div>
            </div>

            {/* Entry Stats */}
            <div className="card">
              <h3 className="text-lg font-semibold text-text-primary mb-4">Entry Details</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Word Count</span>
                  <span className="font-semibold text-text-primary">{getWordCount(entry.content)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Reading Time</span>
                  <span className="font-semibold text-text-primary">
                    {Math.ceil(getWordCount(entry.content) / 200)} min
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">AI Summary</span>
                  <span className="font-semibold text-text-primary">
                    {entry.ai_summary ? 'Generated' : 'Pending'}
                  </span>
                </div>
              </div>
            </div>

            {/* Related Entries */}
            <div className="card">
              <h3 className="text-lg font-semibold text-text-primary mb-4">Related Entries</h3>
              <div className="space-y-2 text-sm">
                <p className="text-text-secondary">
                  Find patterns and connections between your journal entries coming soon!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Edit Modal */}
        <Modal
          isOpen={editing}
          onClose={() => setEditing(false)}
          title=""
          className="max-w-4xl"
        >
          <JournalEntryForm
            selectedDate={new Date(entry.entry_date)}
            existingEntry={entry}
            onSave={handleSave}
            onCancel={() => setEditing(false)}
          />
        </Modal>
      </div>
    </div>
  );
}