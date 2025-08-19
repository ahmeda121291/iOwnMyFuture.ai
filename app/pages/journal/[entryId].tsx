import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Edit3, 
  Trash2, 
  Calendar, 
  Clock, 
  Brain,
  Download,
  Share2,
  FileText,
  BookOpen,
  Tag,
  Heart,
  Sparkles
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
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
            <RelatedEntries entryId={entry.id} />
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

interface RelatedEntry {
  id: string;
  entry_date: string;
  title: string;
  excerpt: string;
  mood?: string;
  category?: string;
  tags: string[];
  similarity_score: number;
  created_at: string;
}

interface RelatedEntriesProps {
  entryId: string;
}

function RelatedEntries({ entryId }: RelatedEntriesProps) {
  const navigate = useNavigate();
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['related-entries', entryId],
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session) throw new Error('No session');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/related-entries?entry_id=${entryId}&limit=5`,
        {
          headers: {
            'Authorization': `Bearer ${session.session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch related entries');
      }

      return await response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  const moodIcons: Record<string, string> = {
    happy: '😊',
    sad: '😢',
    neutral: '😐',
    excited: '🎉',
    anxious: '😰',
    grateful: '🙏',
    stressed: '😫',
    motivated: '💪'
  };

  const categoryColors: Record<string, string> = {
    gratitude: 'bg-purple-100 text-purple-700',
    goals: 'bg-blue-100 text-blue-700',
    reflection: 'bg-green-100 text-green-700',
    dreams: 'bg-pink-100 text-pink-700',
    challenges: 'bg-orange-100 text-orange-700',
    achievements: 'bg-yellow-100 text-yellow-700',
    general: 'bg-gray-100 text-gray-700'
  };

  if (isLoading) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Related Entries</h3>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Related Entries</h3>
        <div className="text-center py-4">
          <p className="text-text-secondary text-sm">Failed to load related entries</p>
        </div>
      </div>
    );
  }

  const entries: RelatedEntry[] = data?.entries || [];

  if (entries.length === 0) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Related Entries</h3>
        <div className="text-center py-6">
          <BookOpen className="w-10 h-10 text-gray-400 mx-auto mb-3" />
          <p className="text-text-secondary text-sm">No related entries found yet.</p>
          <p className="text-text-secondary text-xs mt-1">Keep journaling to discover patterns!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-text-primary">Related Entries</h3>
        <Sparkles className="w-4 h-4 text-accent" />
      </div>
      
      <div className="space-y-3">
        {entries.map((relatedEntry) => (
          <Link
            key={relatedEntry.id}
            to={`/journal/${relatedEntry.id}`}
            className="block p-3 rounded-lg border border-gray-200 hover:border-primary/30 hover:bg-gray-50 transition-all group"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-sm font-medium text-text-primary group-hover:text-primary transition-colors">
                    {relatedEntry.title}
                  </span>
                  {relatedEntry.similarity_score > 50 && (
                    <span className="text-xs px-2 py-0.5 bg-accent/10 text-accent rounded-full">
                      {relatedEntry.similarity_score}% match
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-secondary line-clamp-2">
                  {relatedEntry.excerpt}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 text-xs">
              <span className="text-text-secondary">
                {new Date(relatedEntry.entry_date).toLocaleDateString()}
              </span>
              
              {relatedEntry.mood && (
                <span className="flex items-center">
                  {moodIcons[relatedEntry.mood] || '😊'}
                  <span className="ml-1 text-text-secondary">{relatedEntry.mood}</span>
                </span>
              )}
              
              {relatedEntry.category && (
                <span className={`px-2 py-0.5 rounded-full text-xs ${categoryColors[relatedEntry.category] || categoryColors.general}`}>
                  {relatedEntry.category}
                </span>
              )}
              
              {relatedEntry.tags && relatedEntry.tags.length > 0 && (
                <span className="flex items-center text-text-secondary">
                  <Tag className="w-3 h-3 mr-1" />
                  {relatedEntry.tags.length}
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
      
      {entries.length >= 5 && (
        <div className="mt-4 pt-3 border-t border-gray-100">
          <Link
            to="/journal"
            className="text-xs text-primary hover:text-primary/80 font-medium"
          >
            View all journal entries →
          </Link>
        </div>
      )}
    </div>
  );
}