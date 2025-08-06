import React, { useState, useEffect, useRef } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Save, 
  FileText, 
  Calendar, 
  Clock,
  ChevronLeft,
  ChevronRight,
  Loader,
  CheckCircle,
  Sparkles,
  PenTool,
  BookOpen,
  Moon,
  Sun,
  Image as ImageIcon,
  List,
  ListOrdered,
  Quote,
  Code,
  Link2,
  Bold,
  Italic,
  Underline
} from 'lucide-react';
import { type JournalEntry } from '../../core/types';
import Button from '../../shared/components/Button';

interface EnhancedFullScreenEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (content: string) => Promise<void>;
  selectedDate: Date;
  existingEntry?: JournalEntry;
  recentEntries?: JournalEntry[];
  onSelectEntry?: (entry: JournalEntry) => void;
}

// Custom toolbar with better styling
const CustomToolbar = () => (
  <div id="toolbar" className="ql-toolbar-custom">
    <div className="flex items-center space-x-1 p-2 bg-gradient-to-r from-white to-gray-50 border-b border-gray-200">
      {/* Text formatting */}
      <div className="flex items-center space-x-1 px-2 border-r border-gray-200">
        <button className="ql-bold toolbar-button" title="Bold">
          <Bold className="w-4 h-4" />
        </button>
        <button className="ql-italic toolbar-button" title="Italic">
          <Italic className="w-4 h-4" />
        </button>
        <button className="ql-underline toolbar-button" title="Underline">
          <Underline className="w-4 h-4" />
        </button>
      </div>

      {/* Headers */}
      <div className="flex items-center space-x-1 px-2 border-r border-gray-200">
        <select className="ql-header toolbar-select">
          <option value="">Normal</option>
          <option value="1">Heading 1</option>
          <option value="2">Heading 2</option>
          <option value="3">Heading 3</option>
        </select>
      </div>

      {/* Font size */}
      <div className="flex items-center space-x-1 px-2 border-r border-gray-200">
        <select className="ql-size toolbar-select">
          <option value="small">Small</option>
          <option value="">Normal</option>
          <option value="large">Large</option>
          <option value="huge">Huge</option>
        </select>
      </div>

      {/* Colors */}
      <div className="flex items-center space-x-1 px-2 border-r border-gray-200">
        <select className="ql-color toolbar-select" title="Text Color">
          <option value=""></option>
          <option value="#e60000"></option>
          <option value="#ff9900"></option>
          <option value="#ffff00"></option>
          <option value="#008a00"></option>
          <option value="#0066cc"></option>
          <option value="#9933ff"></option>
        </select>
        <select className="ql-background toolbar-select" title="Background Color">
          <option value=""></option>
          <option value="#e60000"></option>
          <option value="#ff9900"></option>
          <option value="#ffff00"></option>
          <option value="#008a00"></option>
          <option value="#0066cc"></option>
          <option value="#9933ff"></option>
        </select>
      </div>

      {/* Lists and alignment */}
      <div className="flex items-center space-x-1 px-2 border-r border-gray-200">
        <button className="ql-list toolbar-button" value="ordered" title="Numbered List">
          <ListOrdered className="w-4 h-4" />
        </button>
        <button className="ql-list toolbar-button" value="bullet" title="Bullet List">
          <List className="w-4 h-4" />
        </button>
        <select className="ql-align toolbar-select">
          <option value=""></option>
          <option value="center"></option>
          <option value="right"></option>
          <option value="justify"></option>
        </select>
      </div>

      {/* Special formats */}
      <div className="flex items-center space-x-1 px-2">
        <button className="ql-blockquote toolbar-button" title="Quote">
          <Quote className="w-4 h-4" />
        </button>
        <button className="ql-code-block toolbar-button" title="Code Block">
          <Code className="w-4 h-4" />
        </button>
        <button className="ql-link toolbar-button" title="Link">
          <Link2 className="w-4 h-4" />
        </button>
        <button className="ql-image toolbar-button" title="Image">
          <ImageIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>
);

const modules = {
  toolbar: {
    container: '#toolbar',
  },
  clipboard: {
    matchVisual: false,
  },
};

const formats = [
  'header', 'size',
  'bold', 'italic', 'underline', 'strike',
  'color', 'background',
  'list', 'bullet', 'indent',
  'blockquote', 'code-block',
  'align', 'direction',
  'link', 'image', 'video'
];

// Writing prompts for inspiration
const writingPrompts = [
  "What made you smile today?",
  "Describe a moment of gratitude from your day.",
  "What challenge did you overcome recently?",
  "Write about a person who inspired you today.",
  "What are you most looking forward to?",
  "Describe your ideal day in detail.",
  "What lesson did today teach you?",
  "Write about a dream or goal you're working toward.",
  "What would you tell your younger self?",
  "Describe a beautiful moment you witnessed recently."
];

export default function EnhancedFullScreenEditor({
  isOpen,
  onClose,
  onSave,
  selectedDate,
  existingEntry,
  recentEntries = [],
  onSelectEntry
}: EnhancedFullScreenEditorProps) {
  const [content, setContent] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [autoSaved, setAutoSaved] = useState(false);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState('');
  const editorRef = useRef<ReactQuill>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (existingEntry) {
      setContent(existingEntry.content);
      setSelectedEntryId(existingEntry.id);
    } else {
      setContent('');
      setSelectedEntryId(null);
      // Show a random prompt for new entries
      const randomPrompt = writingPrompts[Math.floor(Math.random() * writingPrompts.length)];
      setCurrentPrompt(randomPrompt);
      setShowPrompt(true);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, existingEntry?.content]);

  const handleAutoSave = async () => {
    if (!content.trim()) {
      return;
    }
    
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

  const insertPrompt = () => {
    if (editorRef.current) {
      const editor = editorRef.current.getEditor();
      const range = editor.getSelection();
      if (range) {
        editor.insertText(range.index, currentPrompt + '\n\n', 'user');
      }
    }
    setShowPrompt(false);
  };

  // Don't render anything when editor is closed
  if (!isOpen) {
    return <div className="hidden" aria-hidden="true"></div>;
  }

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={`fixed inset-0 z-50 ${darkMode ? 'dark' : ''}`}
      >
        <div className={`h-full ${darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-purple-50 via-white to-blue-50'}`}>
          {/* Header */}
          <div className={`h-16 border-b ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white/80 backdrop-blur-sm'} shadow-sm`}>
            <div className="h-full px-4 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={onClose}
                  className={`p-2 rounded-lg transition-all ${darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'}`}
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
                
                <button
                  onClick={() => setShowSidebar(!showSidebar)}
                  className={`p-2 rounded-lg transition-all ${darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'}`}
                  title={showSidebar ? "Hide sidebar" : "Show sidebar"}
                >
                  {showSidebar ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                </button>
                
                <div className={`flex items-center space-x-3 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  <Calendar className="w-4 h-4" />
                  <span className="font-medium">{selectedDate.toLocaleDateString('en-US', { 
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}</span>
                </div>
              </div>

              <div className="flex items-center space-x-6">
                {/* Theme toggle */}
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className={`p-2 rounded-lg transition-all ${darkMode ? 'hover:bg-gray-700 text-yellow-400' : 'hover:bg-gray-100 text-gray-600'}`}
                  title={darkMode ? "Light mode" : "Dark mode"}
                >
                  {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>

                {/* Stats */}
                <div className={`flex items-center space-x-4 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  <div className="flex items-center space-x-1">
                    <PenTool className="w-4 h-4" />
                    <span className="font-medium">{wordCount}</span>
                    <span>words</span>
                  </div>
                  <div className="hidden sm:flex items-center space-x-1">
                    <FileText className="w-4 h-4" />
                    <span className="font-medium">{charCount}</span>
                    <span>characters</span>
                  </div>
                  {autoSaved && (
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="flex items-center space-x-1 text-green-500"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Saved</span>
                    </motion.div>
                  )}
                </div>

                {/* Save button */}
                <Button
                  onClick={handleSave}
                  disabled={saving || !content.trim()}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg"
                >
                  {saving ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin mr-2" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      <span>Save & Close</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          <div className="h-[calc(100vh-4rem)] flex">
            {/* Sidebar - Recent Entries */}
            <AnimatePresence>
              {showSidebar && (
                <motion.div 
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 320, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className={`border-r ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gradient-to-b from-purple-50 to-blue-50'} overflow-hidden`}
                >
                  <div className="w-80 h-full overflow-y-auto">
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className={`text-sm font-bold uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-700'}`}>
                          <BookOpen className="inline w-4 h-4 mr-2" />
                          Past Entries
                        </h3>
                        <span className={`text-xs px-2 py-1 rounded-full ${darkMode ? 'bg-gray-700 text-gray-400' : 'bg-purple-100 text-purple-600'}`}>
                          {recentEntries.length}
                        </span>
                      </div>
                      
                      {recentEntries.length === 0 ? (
                        <div className={`text-center py-8 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p className="text-sm italic">Your story begins here...</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {recentEntries.map((entry) => (
                            <motion.button
                              key={entry.id}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => handleSelectEntry(entry)}
                              className={`w-full text-left p-3 rounded-xl transition-all ${
                                selectedEntryId === entry.id
                                  ? darkMode 
                                    ? 'bg-gradient-to-r from-purple-900/50 to-blue-900/50 border border-purple-500/30'
                                    : 'bg-white shadow-md border border-purple-200'
                                  : darkMode
                                    ? 'hover:bg-gray-700/50'
                                    : 'hover:bg-white/60'
                              }`}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <span className={`text-xs font-semibold ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                                  {new Date(entry.entry_date).toLocaleDateString('en-US', { 
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                  })}
                                </span>
                                <Clock className={`w-3 h-3 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
                              </div>
                              <p className={`text-sm line-clamp-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                {entry.content.replace(/<[^>]*>/g, '').substring(0, 100)}...
                              </p>
                              {entry.ai_summary && (
                                <div className="mt-2 flex items-start space-x-1">
                                  <Sparkles className="w-3 h-3 text-purple-500 mt-0.5 flex-shrink-0" />
                                  <p className={`text-xs italic line-clamp-2 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                                    {entry.ai_summary}
                                  </p>
                                </div>
                              )}
                            </motion.button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Main Editor */}
            <div className={`flex-1 flex flex-col ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
              {/* Writing Prompt */}
              <AnimatePresence>
                {showPrompt && !existingEntry && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className={`border-b ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50'}`}
                  >
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex items-start space-x-3">
                        <Sparkles className="w-5 h-5 text-purple-500 mt-0.5" />
                        <div>
                          <p className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                            Need inspiration? Try this prompt:
                          </p>
                          <p className={`text-lg ${darkMode ? 'text-purple-400' : 'text-purple-600'} italic`}>
                            "{currentPrompt}"
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={insertPrompt}
                          className="px-3 py-1 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                        >
                          Use Prompt
                        </button>
                        <button
                          onClick={() => setShowPrompt(false)}
                          className={`p-1 rounded-lg ${darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-400'}`}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Custom Toolbar */}
              <CustomToolbar />

              {/* Editor */}
              <div className="flex-1 px-4 sm:px-8 py-6 overflow-y-auto">
                <div className="max-w-4xl mx-auto h-full">
                  <ReactQuill
                    ref={editorRef}
                    theme="snow"
                    value={content}
                    onChange={setContent}
                    modules={modules}
                    formats={formats}
                    placeholder="Begin your story..."
                    className={`h-full enhanced-journal-editor ${darkMode ? 'dark-editor' : ''}`}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Custom styles for the editor */}
          <style jsx global>{`
            .enhanced-journal-editor {
              height: calc(100% - 50px);
            }
            .enhanced-journal-editor .ql-container {
              font-size: 18px;
              font-family: 'Georgia', 'Times New Roman', serif;
              line-height: 1.8;
              border: none;
            }
            .enhanced-journal-editor .ql-editor {
              min-height: 400px;
              padding: 2rem 3rem;
              max-width: 100%;
            }
            .enhanced-journal-editor .ql-toolbar {
              display: none;
            }
            .enhanced-journal-editor .ql-editor.ql-blank::before {
              color: #9ca3af;
              font-style: italic;
              font-size: 18px;
              left: 3rem;
            }
            
            /* Dark mode styles */
            .dark-editor .ql-editor {
              color: #e5e7eb;
              background: #111827;
            }
            .dark-editor .ql-editor.ql-blank::before {
              color: #6b7280;
            }
            .dark-editor .ql-editor h1,
            .dark-editor .ql-editor h2,
            .dark-editor .ql-editor h3 {
              color: #f3f4f6;
            }
            
            /* Toolbar styles */
            .toolbar-button {
              padding: 0.5rem;
              border-radius: 0.375rem;
              transition: all 0.2s;
              color: #4b5563;
            }
            .toolbar-button:hover {
              background: #f3f4f6;
              color: #1f2937;
            }
            .toolbar-button.ql-active {
              background: #e5e7eb;
              color: #7c3aed;
            }
            .toolbar-select {
              padding: 0.25rem 0.5rem;
              border-radius: 0.375rem;
              border: 1px solid #e5e7eb;
              background: white;
              color: #4b5563;
              font-size: 14px;
            }
            
            /* Better scrollbar */
            .enhanced-journal-editor ::-webkit-scrollbar {
              width: 8px;
            }
            .enhanced-journal-editor ::-webkit-scrollbar-track {
              background: transparent;
            }
            .enhanced-journal-editor ::-webkit-scrollbar-thumb {
              background: #cbd5e1;
              border-radius: 4px;
            }
            .enhanced-journal-editor ::-webkit-scrollbar-thumb:hover {
              background: #94a3b8;
            }
            .dark-editor ::-webkit-scrollbar-thumb {
              background: #4b5563;
            }
            .dark-editor ::-webkit-scrollbar-thumb:hover {
              background: #6b7280;
            }
          `}</style>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}