import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, BookOpen, Filter, Calendar, TrendingUp, Award, Target, ChevronLeft, ChevronRight } from 'lucide-react';
import { getCurrentUser, getSession } from '../core/api/supabase';
import { summarizeJournalEntry } from '../core/api/openai';
import { type User, type JournalEntry } from '../core/types';
import { useJournalEntries, useCreateJournalEntry, useUpdateJournalEntry, useDeleteJournalEntry } from '../shared/hooks/queries/useJournalQueries';
import JournalCalendar from '../features/journal/JournalCalendar';
import JournalEntryForm from '../features/journal/JournalEntryForm';
import FullScreenEditor from '../features/journal/FullScreenEditor';
import EntrySummaryCard from '../features/journal/EntrySummaryCard';
import JournalPrompt from '../features/journal/JournalPrompt';
import Button from '../shared/components/Button';
import Modal from '../shared/components/Modal';
import Loader from '../shared/components/Loader';

// Constants
const PAGE_SIZE = 10;

export default function JournalPage() {
  // State
  const [user, setUser] = useState<User | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [showFullScreenEditor, setShowFullScreenEditor] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [viewingEntry, setViewingEntry] = useState<JournalEntry | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'month' | 'week'>('month');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  // Calculate date range based on filter mode
  const dateRange = useMemo(() => {
    if (filterMode === 'all') {return {};}
    
    if (filterMode === 'month') {
      const startOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
      const endOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
      return { startDate: startOfMonth, endDate: endOfMonth };
    }
    
    if (filterMode === 'week') {
      const startOfWeek = new Date(selectedDate);
      startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      return { startDate: startOfWeek, endDate: endOfWeek };
    }
    
    return {};
  }, [selectedDate, filterMode]);

  // React Query hooks
  const { 
    data: entriesData, 
    isLoading: entriesLoading,
    error: entriesError,
    refetch: refetchEntries
  } = useJournalEntries({
    userId: user?.id || '',
    page: currentPage,
    pageSize: PAGE_SIZE,
    searchQuery,
    ...dateRange,
  });

  const createMutation = useCreateJournalEntry();
  const updateMutation = useUpdateJournalEntry();
  const deleteMutation = useDeleteJournalEntry();

  // Initialize page
  const initializePage = useCallback(async () => {
    try {
      // First check if we have a valid session
      const session = await getSession();
      if (!session) {
        navigate('/auth');
        return;
      }
      
      const userData = await getCurrentUser();
      if (!userData) {
        navigate('/auth');
        return;
      }
      setUser(userData);
    } catch (error) {
      console.error('Error loading user:', error);
      navigate('/auth');
    }
  }, [navigate]);

  useEffect(() => {
    initializePage();
  }, [initializePage]);

  // Calculate streaks
  const { journalStreak, longestStreak } = useMemo(() => {
    if (!entriesData?.data || entriesData.data.length === 0) {
      return { journalStreak: 0, longestStreak: 0 };
    }

    const entries = entriesData.data;
    const sortedEntries = [...entries].sort((a, b) => 
      new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime()
    );

    let currentStreak = 0;
    let maxStreak = 0;
    let tempStreak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const mostRecentEntry = new Date(sortedEntries[0].entry_date);
    mostRecentEntry.setHours(0, 0, 0, 0);
    
    const daysDiff = Math.floor((today.getTime() - mostRecentEntry.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff <= 1) {
      const checkDate = new Date(mostRecentEntry);
      
      for (let i = 0; i < sortedEntries.length; i++) {
        const entryDate = new Date(sortedEntries[i].entry_date);
        entryDate.setHours(0, 0, 0, 0);
        
        if (entryDate.getTime() === checkDate.getTime()) {
          currentStreak++;
          tempStreak++;
          maxStreak = Math.max(maxStreak, tempStreak);
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          if (i === 0) {currentStreak = 0;}
          tempStreak = 1;
          checkDate.setTime(entryDate.getTime());
          checkDate.setDate(checkDate.getDate() - 1);
        }
      }
    }

    return { journalStreak: currentStreak, longestStreak: maxStreak };
  }, [entriesData]);

  // Create entries map for calendar
  const entriesMap = useMemo(() => {
    const map = new Map<string, boolean>();
    if (entriesData?.data) {
      entriesData.data.forEach((entry) => {
        map.set(entry.entry_date, true);
      });
    }
    return map;
  }, [entriesData]);

  // Handlers
  const handleSaveEntry = useCallback(async (content: string) => {
    if (!user) {return;}

    try {
      const _entryDate = selectedDate.toISOString().split('T')[0];
      
      if (editingEntry) {
        await updateMutation.mutateAsync({
          id: editingEntry.id,
          content,
        });
      } else {
        const newEntry = await createMutation.mutateAsync({
          userId: user.id,
          data: { content },
        });

        // Generate AI summary if content is long enough
        if (content.split(' ').length > 50) {
          try {
            await summarizeJournalEntry(newEntry.id, content);
            await refetchEntries();
          } catch (error) {
            console.error('Error generating summary:', error);
          }
        }
      }

      setShowEntryForm(false);
      setEditingEntry(null);
    } catch (error) {
      console.error('Error saving entry:', error);
      alert('Failed to save entry. Please try again.');
    }
  }, [user, selectedDate, editingEntry, createMutation, updateMutation, refetchEntries]);

  const handleDeleteEntry = useCallback(async (entry: JournalEntry) => {
    if (!confirm('Are you sure you want to delete this entry?')) {return;}

    try {
      await deleteMutation.mutateAsync(entry.id);
      setViewingEntry(null);
    } catch (error) {
      console.error('Error deleting entry:', error);
      alert('Failed to delete entry. Please try again.');
    }
  }, [deleteMutation]);

  const handleEditEntry = useCallback((entry: JournalEntry) => {
    setEditingEntry(entry);
    setShowFullScreenEditor(true);
    setViewingEntry(null);
  }, []);

  const handleDateSelect = useCallback((date: Date) => {
    setSelectedDate(date);
    const dateStr = date.toISOString().split('T')[0];
    const entryForDate = entriesData?.data.find(e => e.entry_date === dateStr);
    
    if (entryForDate) {
      setViewingEntry(entryForDate);
    } else {
      setShowFullScreenEditor(true);
    }
  }, [entriesData]);

  const handlePageChange = useCallback((newPage: number) => {
    setCurrentPage(newPage);
  }, []);

  // Loading state
  if (!user || entriesLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader size="large" />
      </div>
    );
  }

  // Error state
  if (entriesError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">Error loading journal entries</p>
          <Button onClick={() => refetchEntries()}>Retry</Button>
        </div>
      </div>
    );
  }

  const entries = entriesData?.data || [];
  const totalPages = entriesData?.totalPages || 1;

  // Filter stats
  const currentMonthEntries = entries.filter(entry => {
    const entryDate = new Date(entry.entry_date);
    return entryDate.getMonth() === selectedDate.getMonth() && 
           entryDate.getFullYear() === selectedDate.getFullYear();
  }).length;

  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-text-primary mb-2">My Journal</h1>
            <p className="text-text-secondary">
              Track your thoughts, feelings, and personal growth
            </p>
          </div>
          <Button
            onClick={() => {
              setEditingEntry(null);
              setShowFullScreenEditor(true);
            }}
            disabled={createMutation.isPending}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Entry
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm">Total Entries</p>
                <p className="text-2xl font-bold text-text-primary">{entriesData?.total || 0}</p>
              </div>
              <BookOpen className="w-8 h-8 text-primary" />
            </div>
          </div>
          
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm">This Month</p>
                <p className="text-2xl font-bold text-text-primary">{currentMonthEntries}</p>
              </div>
              <Calendar className="w-8 h-8 text-accent" />
            </div>
          </div>
          
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm">Current Streak</p>
                <p className="text-2xl font-bold text-text-primary">{journalStreak} days</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </div>
          
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm">Longest Streak</p>
                <p className="text-2xl font-bold text-text-primary">{longestStreak} days</p>
              </div>
              <Award className="w-8 h-8 text-yellow-500" />
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center space-x-4 mb-6">
          <Filter className="w-5 h-5 text-text-secondary" />
          {['all', 'month', 'week'].map((mode) => (
            <button
              key={mode}
              onClick={() => {
                setFilterMode(mode as 'all' | 'month' | 'week');
                setCurrentPage(1);
              }}
              className={`px-4 py-2 rounded-full capitalize transition-colors ${
                filterMode === mode
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-text-secondary hover:bg-gray-200'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search journal entries..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Calendar Section */}
          <div className="lg:col-span-1">
            <div className="card">
              <h2 className="text-xl font-semibold text-text-primary mb-4">
                Journal Calendar
              </h2>
              <JournalCalendar
                selectedDate={selectedDate}
                onDateSelect={handleDateSelect}
                entriesMap={entriesMap}
              />
              
              {/* Goals Section */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center mb-4">
                  <Target className="w-5 h-5 text-accent mr-2" />
                  <h3 className="font-semibold text-text-primary">Monthly Goal</h3>
                </div>
                <div className="bg-gray-100 rounded-full h-3 mb-2">
                  <div
                    className="bg-accent h-3 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min((currentMonthEntries / 20) * 100, 100)}%` }}
                  />
                </div>
                <p className="text-sm text-text-secondary">
                  {currentMonthEntries} / 20 entries this month
                </p>
              </div>
            </div>

            {/* Writing Prompt */}
            <JournalPrompt />
          </div>

          {/* Entries List */}
          <div className="lg:col-span-2">
            <h2 className="text-xl font-semibold text-text-primary mb-4">
              Recent Entries
            </h2>
            
            {entries.length === 0 ? (
              <div className="card text-center py-12">
                <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-text-primary mb-2">
                  No entries yet
                </h3>
                <p className="text-text-secondary mb-4">
                  Start journaling to track your thoughts and growth
                </p>
                <Button
                  onClick={() => {
                    setEditingEntry(null);
                    setShowFullScreenEditor(true);
                  }}
                >
                  Write Your First Entry
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {entries.map((entry) => (
                    <EntrySummaryCard
                      key={entry.id}
                      entry={entry}
                      onClick={() => setViewingEntry(entry)}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center space-x-2 mt-6">
                    <Button
                      variant="secondary"
                      size="small"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    
                    <span className="text-text-secondary px-4">
                      Page {currentPage} of {totalPages}
                    </span>
                    
                    <Button
                      variant="secondary"
                      size="small"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Entry Form Modal */}
      {showEntryForm && (
        <Modal
          isOpen={showEntryForm}
          onClose={() => {
            setShowEntryForm(false);
            setEditingEntry(null);
          }}
          title={editingEntry ? 'Edit Entry' : 'New Journal Entry'}
          size="large"
        >
          <JournalEntryForm
            selectedDate={selectedDate}
            existingEntry={editingEntry || undefined}
            onSave={handleSaveEntry}
            onCancel={() => {
              setShowEntryForm(false);
              setEditingEntry(null);
            }}
          />
        </Modal>
      )}

      {/* View Entry Modal */}
      {viewingEntry && (
        <Modal
          isOpen={!!viewingEntry}
          onClose={() => setViewingEntry(null)}
          title="Journal Entry"
          size="large"
        >
          <div className="space-y-4">
            <div>
              <p className="text-sm text-text-secondary mb-2">
                {new Date(viewingEntry.entry_date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
              <div className="prose prose-lg max-w-none">
                <p className="whitespace-pre-wrap text-text-primary">
                  {viewingEntry.content}
                </p>
              </div>
            </div>
            
            {viewingEntry.ai_summary && (
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-4 rounded-lg border border-purple-200">
                <h4 className="font-semibold text-purple-700 mb-2">AI Summary</h4>
                <p className="text-text-primary">{viewingEntry.ai_summary}</p>
              </div>
            )}
            
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button
                variant="secondary"
                onClick={() => handleEditEntry(viewingEntry)}
              >
                Edit
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleDeleteEntry(viewingEntry)}
                className="text-red-600 hover:bg-red-50"
              >
                Delete
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Full Screen Editor */}
      <FullScreenEditor
        isOpen={showFullScreenEditor}
        onClose={() => {
          setShowFullScreenEditor(false);
          setEditingEntry(null);
        }}
        onSave={handleSaveEntry}
        selectedDate={selectedDate}
        existingEntry={editingEntry || undefined}
        recentEntries={entries}
        onSelectEntry={(entry) => {
          setEditingEntry(entry);
        }}
      />
    </div>
  );
}