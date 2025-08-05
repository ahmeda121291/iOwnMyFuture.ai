import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import toast from 'react-hot-toast';
import { 
  X, 
  Save, 
  FileText, 
  Calendar, 
  Clock, 
  Hash,
  ChevronLeft,
  Loader,
  CheckCircle
} from 'lucide-react';
import { type JournalEntry } from '../../core/types';
import Button from '../../shared/components/Button';

interface FullScreenEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (content: string) => Promise<void>;
  selectedDate: Date;
  existingEntry?: JournalEntry;
  recentEntries?: JournalEntry[];
  onSelectEntry?: (entry: JournalEntry) => void;
}

const modules = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }],
    [{ 'size': ['small', false, 'large', 'huge'] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'color': [] }, { 'background': [] }],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    ['blockquote', 'code-block'],
    [{ 'align': [] }],
    ['link', 'image'],
    ['clean']
  ],
};

const formats = [
  'header', 'size',
  'bold', 'italic', 'underline', 'strike',
  'color', 'background',
  'list', 'bullet',
  'blockquote', 'code-block',
  'align',
  'link', 'image'
];

export default function FullScreenEditor({
  isOpen,
  onClose,
  onSave,
  selectedDate,
  existingEntry,
  recentEntries = [],
  onSelectEntry
}: FullScreenEditorProps) {
  const [content, setContent] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [autoSaved, setAutoSaved] = useState(false);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const editorRef = useRef<ReactQuill>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (existingEntry) {
      setContent(existingEntry.content);
      setSelectedEntryId(existingEntry.id);
    } else {
      setContent('');
      setSelectedEntryId(null);
    }
  }, [existingEntry]);

  useEffect(() => {
    // Calculate word and character count
    const text = content.replace(/<[^>]*>/g, '').trim();
    const words = text.split(/\s+/).filter(word => word.length > 0);
    setWordCount(words.length);
    setCharCount(text.length);
  }, [content]);

  // Auto-save functionality
  useEffect(() => {
    if (content && content !== existingEntry?.content) {
      // Clear existing timer
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }

      // Set new timer for auto-save (3 seconds after stopping)
      autoSaveTimerRef.current = setTimeout(() => {
        handleAutoSave();
      }, 3000);
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [content]);

  const handleAutoSave = async () => {
    if (!content.trim()) return;
    
    try {
      setAutoSaved(false);
      await onSave(content);
      setAutoSaved(true);
      setTimeout(() => setAutoSaved(false), 2000);
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  };

  const handleSave = async () => {
    if (!content.trim()) {
      toast.error('Please write something before saving');
      return;
    }

    setSaving(true);
    try {
      await onSave(content);
      toast.success('Journal entry saved successfully!');
      onClose();
    } catch (error) {
      console.error('Error saving entry:', error);
      toast.error('Failed to save entry. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSelectEntry = (entry: JournalEntry) => {
    setSelectedEntryId(entry.id);
    if (onSelectEntry) {
      onSelectEntry(entry);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white">
      {/* Header */}
      <div className="h-16 border-b border-gray-200 bg-white shadow-sm">
        <div className="h-full px-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
            
            <div className="flex items-center space-x-3 text-sm text-gray-600">
              <Calendar className="w-4 h-4" />
              <span>{selectedDate.toLocaleDateString('en-US', { 
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}</span>
            </div>
          </div>

          <div className="flex items-center space-x-6">
            {/* Stats */}
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center space-x-1">
                <Hash className="w-4 h-4" />
                <span>{wordCount} words</span>
              </div>
              <div className="hidden sm:flex items-center space-x-1">
                <FileText className="w-4 h-4" />
                <span>{charCount} characters</span>
              </div>
              {autoSaved && (
                <div className="flex items-center space-x-1 text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span>Saved</span>
                </div>
              )}
            </div>

            {/* Save button */}
            <Button
              onClick={handleSave}
              disabled={saving || !content.trim()}
              className="flex items-center space-x-2"
            >
              {saving ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Entry</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="h-[calc(100vh-4rem)] flex">
        {/* Sidebar - Recent Entries */}
        <div className="w-80 border-r border-gray-200 bg-gray-50 overflow-y-auto">
          <div className="p-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
              Recent Entries
            </h3>
            
            {recentEntries.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No entries yet</p>
            ) : (
              <div className="space-y-2">
                {recentEntries.map((entry) => (
                  <button
                    key={entry.id}
                    onClick={() => handleSelectEntry(entry)}
                    className={`w-full text-left p-3 rounded-lg transition-all ${
                      selectedEntryId === entry.id
                        ? 'bg-white shadow-sm border border-primary/20'
                        : 'hover:bg-white/60'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <span className="text-xs font-medium text-gray-600">
                        {new Date(entry.entry_date).toLocaleDateString('en-US', { 
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                      <Clock className="w-3 h-3 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-800 line-clamp-2">
                      {entry.content.replace(/<[^>]*>/g, '').substring(0, 100)}...
                    </p>
                    {entry.ai_summary && (
                      <p className="text-xs text-purple-600 mt-1 italic line-clamp-1">
                        {entry.ai_summary}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main Editor */}
        <div className="flex-1 flex flex-col bg-white">
          <div className="flex-1 px-8 py-6">
            <div className="max-w-4xl mx-auto h-full">
              <ReactQuill
                ref={editorRef}
                theme="snow"
                value={content}
                onChange={setContent}
                modules={modules}
                formats={formats}
                placeholder="Start writing your thoughts..."
                className="h-full journal-editor"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Custom styles for the editor */}
      <style jsx global>{`
        .journal-editor {
          height: calc(100% - 50px);
        }
        .journal-editor .ql-container {
          font-size: 16px;
          font-family: 'Georgia', 'Times New Roman', serif;
          line-height: 1.8;
        }
        .journal-editor .ql-editor {
          min-height: 400px;
          padding: 2rem;
        }
        .journal-editor .ql-toolbar {
          border: none;
          border-bottom: 1px solid #e5e7eb;
          background: #f9fafb;
          position: sticky;
          top: 0;
          z-index: 10;
        }
        .journal-editor .ql-container {
          border: none;
        }
        .journal-editor .ql-editor.ql-blank::before {
          color: #9ca3af;
          font-style: normal;
        }
      `}</style>
    </div>
  );
}