import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, BookOpen, Filter } from 'lucide-react';
import { getCurrentUser, supabase } from '../../lib/supabase';
import { summarizeJournalEntry } from '../lib/openai';
import JournalCalendar from '../components/Journal/JournalCalendar';
import JournalEntryForm from '../components/Journal/JournalEntryForm';
import EntrySummaryCard from '../components/Journal/EntrySummaryCard';
import JournalPrompt from '../components/Journal/JournalPrompt';
import Button from '../components/Shared/Button';
import Modal from '../components/Shared/Modal';
import Loader from '../components/Shared/Loader';

export default function JournalPage() {
  const [user, setUser] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [entries, setEntries] = useState<any[]>([]);
  const [entriesMap, setEntriesMap] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [viewingEntry, setViewingEntry] = useState<any>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'month' | 'week'>('month');
  const navigate = useNavigate();

  useEffect(() => {
    initializePage();
  }, []);

  useEffect(() => {
    if (user) {
      loadEntries();
    }
  }, [user, selectedDate, filterMode]);

  const initializePage = async () => {
    try {
      const userData = await getCurrentUser();
      if (!userData) {
        navigate('/auth');
        return;
      }
      setUser(userData);
    } catch (error) {
      console.error('Error loading user:', error);
      navigate('/auth');
    } finally {
      setLoading(false);
    }
  };

  const loadEntries = async () => {
    if (!user) return;

    try {
      let query = supabase
        .from('journal_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('entry_date', { ascending: false });

      // Apply date filtering
      if (filterMode === 'month') {
        const startOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
        const endOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
        query = query
          .gte('entry_date', startOfMonth.toISOString().split('T')[0])
          .lte('entry_date', endOfMonth.toISOString().split('T')[0]);
      } else if (filterMode === 'week') {
        const startOfWeek = new Date(selectedDate);
        startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        query = query
          .gte('entry_date', startOfWeek.toISOString().split('T')[0])
          .lte('entry_date', endOfWeek.toISOString().split('T')[0]);
      }

      const { data, error } = await query;

      if (error) throw error;

      setEntries(data || []);

      // Create entries map for calendar
      const map = new Map();
      (data || []).forEach((entry) => {
        map.set(entry.entry_date, true);
      });
      setEntriesMap(map);
    } catch (error) {
      console.error('Error loading entries:', error);
    }
  };

  const saveEntry = async (content: string) => {
    if (!user) return;

    setSaving(true);
    try {
      const entryDate = selectedDate.toISOString().split('T')[0];
      
      let savedEntry;
      if (editingEntry) {
        // Update existing entry
        const { data, error } = await supabase
          .from('journal_entries')
          .update({ content })
          .eq('id', editingEntry.id)
          .select()
          .single();

        if (error) throw error;
        savedEntry = data;
      } else {
        // Create new entry
        const { data, error } = await supabase
          .from('journal_entries')
          .insert({
            user_id: user.id,
            entry_date: entryDate,
            content
          })
          .select()
          .single();

        if (error) throw error;
        savedEntry = data;
      }

      // Generate AI summary in the background
      try {
        const aiSummary = await summarizeJournalEntry(content);
        await supabase
          .from('journal_entries')
          .update({ ai_summary: aiSummary })
          .eq('id', savedEntry.id);
      } catch (aiError) {
        console.warn('AI summarization failed:', aiError);
      }

      // Refresh entries
      await loadEntries();
      
      // Close forms
      setShowEntryForm(false);
      setEditingEntry(null);
    } catch (error) {
      console.error('Error saving entry:', error);
      alert('Failed to save journal entry. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const deleteEntry = async (entryId: string) => {
    try {
      const { error } = await supabase
        .from('journal_entries')
        .delete()
        .eq('id', entryId)
        .eq('user_id', user.id);

      if (error) throw error;

      await loadEntries();
    } catch (error) {
      console.error('Error deleting entry:', error);
      alert('Failed to delete journal entry. Please try again.');
    }
  };

  const getTodaysEntry = () => {
    const today = new Date().toISOString().split('T')[0];
    return entries.find(entry => entry.entry_date === today);
  };

  const getSelectedDateEntry = () => {
    const selectedDateStr = selectedDate.toISOString().split('T')[0];
    return entries.find(entry => entry.entry_date === selectedDateStr);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pt-20">
        <Loader size="large" />
      </div>
    );
  }

  const todaysEntry = getTodaysEntry();
  const selectedDateEntry = getSelectedDateEntry();

  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-text-primary mb-2">My Journal</h1>
            <p className="text-text-secondary">
              Capture your thoughts, track your progress, and reflect on your journey
            </p>
          </div>
          
          <Button
            onClick={() => {
              setEditingEntry(null);
              setShowEntryForm(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Entry
          </Button>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Sidebar */}
          <div className="space-y-6">
            {/* Calendar */}
            <JournalCalendar
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
              entriesMap={entriesMap}
            />

            {/* Writing Prompt */}
            <JournalPrompt
              onPromptSelect={(prompt) => {
                setEditingEntry(null);
                setShowEntryForm(true);
              }}
            />

            {/* Stats */}
            <div className="card">
              <h3 className="text-lg font-semibold text-text-primary mb-4">Journal Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Total Entries</span>
                  <span className="font-semibold text-text-primary">{entries.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">This Month</span>
                  <span className="font-semibold text-text-primary">
                    {entries.filter(entry => {
                      const entryDate = new Date(entry.entry_date);
                      const now = new Date();
                      return entryDate.getMonth() === now.getMonth() && entryDate.getFullYear() === now.getFullYear();
                    }).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Streak</span>
                  <span className="font-semibold text-text-primary">1 day</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Actions */}
            {!todaysEntry && (
              <div className="card bg-gradient-to-r from-accent/10 to-primary/10 border border-accent/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <BookOpen className="w-8 h-8 text-accent mr-4" />
                    <div>
                      <h3 className="text-lg font-semibold text-text-primary">
                        Start Today's Entry
                      </h3>
                      <p className="text-text-secondary">
                        Take a moment to reflect on your day and capture your thoughts.
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => {
                      setSelectedDate(new Date());
                      setEditingEntry(null);
                      setShowEntryForm(true);
                    }}
                  >
                    Write Now
                  </Button>
                </div>
              </div>
            )}

            {/* Filter Controls */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-text-primary">
                Journal Entries
              </h2>
              
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-text-secondary" />
                <select
                  value={filterMode}
                  onChange={(e) => setFilterMode(e.target.value as any)}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-1 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                >
                  <option value="all">All Entries</option>
                  <option value="month">This Month</option>
                  <option value="week">This Week</option>
                </select>
              </div>
            </div>

            {/* Entries List */}
            {entries.length > 0 ? (
              <div className="space-y-4">
                {entries.map((entry) => (
                  <EntrySummaryCard
                    key={entry.id}
                    entry={entry}
                    showViewLink={true}
                    onView={setViewingEntry}
                    onEdit={(entry) => {
                      setEditingEntry(entry);
                      setSelectedDate(new Date(entry.entry_date));
                      setShowEntryForm(true);
                    }}
                    onDelete={deleteEntry}
                  />
                ))}
              </div>
            ) : (
              <div className="card text-center py-12">
                <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-text-primary mb-2">
                  No entries yet
                </h3>
                <p className="text-text-secondary mb-4">
                  Start your journaling journey by writing your first entry.
                </p>
                <Button
                  onClick={() => {
                    setEditingEntry(null);
                    setShowEntryForm(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Entry
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Entry Form Modal */}
        <Modal
          isOpen={showEntryForm}
          onClose={() => {
            setShowEntryForm(false);
            setEditingEntry(null);
          }}
          title=""
          className="max-w-2xl"
        >
          <JournalEntryForm
            selectedDate={selectedDate}
            existingEntry={editingEntry}
            onSave={saveEntry}
            onCancel={() => {
              setShowEntryForm(false);
              setEditingEntry(null);
            }}
          />
        </Modal>

        {/* View Entry Modal */}
        <Modal
          isOpen={!!viewingEntry}
          onClose={() => setViewingEntry(null)}
          title="Journal Entry"
          className="max-w-2xl"
        >
          {viewingEntry && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-text-secondary">
                  {new Date(viewingEntry.entry_date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setViewingEntry(null);
                    setEditingEntry(viewingEntry);
                    setSelectedDate(new Date(viewingEntry.entry_date));
                    setShowEntryForm(true);
                  }}
                >
                  Edit Entry
                </Button>
              </div>
              
              {viewingEntry.ai_summary && (
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <p className="text-sm font-medium text-accent mb-2">AI Summary</p>
                  <p className="text-text-secondary italic">{viewingEntry.ai_summary}</p>
                </div>
              )}
              
              <div className="prose max-w-none">
                <p className="text-text-primary whitespace-pre-wrap leading-relaxed">
                  {viewingEntry.content}
                </p>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
}