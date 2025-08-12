import { useState, useEffect, useRef, useCallback } from 'react';

interface UseJournalEditorProps {
  initialContent?: string;
  autoSaveDelay?: number;
  onAutoSave?: (content: string) => Promise<void>;
}

interface UseJournalEditorReturn {
  content: string;
  setContent: (content: string) => void;
  wordCount: number;
  charCount: number;
  isAutoSaving: boolean;
  lastAutoSaved: Date | null;
  handleContentChange: (value: string) => void;
}

/**
 * Hook for managing journal editor state and functionality
 */
export const useJournalEditor = ({
  initialContent = '',
  autoSaveDelay = 3000,
  onAutoSave,
}: UseJournalEditorProps = {}): UseJournalEditorReturn => {
  const [content, setContent] = useState(initialContent);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastAutoSaved, setLastAutoSaved] = useState<Date | null>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout>();

  // Update content when initialContent changes
  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  // Calculate word and character count
  useEffect(() => {
    const text = content.replace(/<[^>]*>/g, '').trim();
    const words = text.split(/\s+/).filter(word => word.length > 0);
    setWordCount(words.length);
    setCharCount(text.length);
  }, [content]);

  // Auto-save functionality
  useEffect(() => {
    if (content && content !== initialContent && onAutoSave) {
      // Clear existing timer
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }

      // Set new timer for auto-save
      autoSaveTimerRef.current = setTimeout(async () => {
        setIsAutoSaving(true);
        try {
          await onAutoSave(content);
          setLastAutoSaved(new Date());
        } catch (error) {
          console.error('Auto-save failed:', error);
        } finally {
          setIsAutoSaving(false);
        }
      }, autoSaveDelay);
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [content, initialContent, autoSaveDelay, onAutoSave]);

  const handleContentChange = useCallback((value: string) => {
    setContent(value);
  }, []);

  return {
    content,
    setContent,
    wordCount,
    charCount,
    isAutoSaving,
    lastAutoSaved,
    handleContentChange,
  };
};

/**
 * Hook for managing dark mode in editor
 */
export const useEditorTheme = () => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('journal-editor-theme');
    return saved === 'dark';
  });

  useEffect(() => {
    localStorage.setItem('journal-editor-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const toggleTheme = useCallback(() => {
    setIsDarkMode(prev => !prev);
  }, []);

  return {
    isDarkMode,
    toggleTheme,
  };
};

/**
 * Hook for managing editor keyboard shortcuts
 */
export const useEditorShortcuts = (callbacks: {
  onSave?: () => void;
  onClose?: () => void;
  onToggleTheme?: () => void;
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + S to save
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        callbacks.onSave?.();
      }
      
      // Escape to close
      if (e.key === 'Escape') {
        e.preventDefault();
        callbacks.onClose?.();
      }
      
      // Cmd/Ctrl + Shift + D to toggle theme
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'd') {
        e.preventDefault();
        callbacks.onToggleTheme?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [callbacks]);
};