import { type JournalEntry } from '../../core/types';
import toast from 'react-hot-toast';

interface ShareData {
  title?: string;
  text?: string;
  url?: string;
}

/**
 * Check if Web Share API is supported
 */
export function isWebShareSupported(): boolean {
  return typeof navigator !== 'undefined' && 'share' in navigator;
}

/**
 * Check if clipboard API is supported
 */
export function isClipboardSupported(): boolean {
  return typeof navigator !== 'undefined' && 'clipboard' in navigator;
}

/**
 * Share content using Web Share API or fallback methods
 */
export async function shareContent(data: ShareData): Promise<void> {
  // Try Web Share API first (mobile and some desktop browsers)
  if (isWebShareSupported()) {
    try {
      await navigator.share(data);
      return;
    } catch (error) {
      // User cancelled or share failed
      if ((error as Error).name !== 'AbortError') {
        console.error('Web Share API failed:', error);
        // Fall through to fallback methods
      } else {
        // User cancelled, don't show error
        return;
      }
    }
  }
  
  // Fallback: Copy to clipboard
  if (isClipboardSupported()) {
    const shareText = formatShareText(data);
    try {
      await navigator.clipboard.writeText(shareText);
      toast.success('Content copied to clipboard!');
      return;
    } catch (error) {
      console.error('Clipboard API failed:', error);
    }
  }
  
  // Final fallback: Show share dialog
  showShareDialog(data);
}

/**
 * Share a journal entry
 */
export async function shareJournalEntry(entry: JournalEntry): Promise<void> {
  const formattedDate = new Date(entry.entry_date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  const shareData: ShareData = {
    title: `Journal Entry - ${formattedDate}`,
    text: formatJournalForSharing(entry),
    url: window.location.href
  };
  
  await shareContent(shareData);
}

/**
 * Format journal entry for sharing
 */
function formatJournalForSharing(entry: JournalEntry): string {
  const sections: string[] = [];
  
  const date = new Date(entry.entry_date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  sections.push(`📅 Journal Entry - ${date}`);
  sections.push('');
  
  if (entry.ai_summary) {
    sections.push('✨ Summary:');
    sections.push(entry.ai_summary);
    sections.push('');
  }
  
  if (entry.mood) {
    sections.push(`🎭 Mood: ${entry.mood}`);
    sections.push('');
  }
  
  if (entry.tags && entry.tags.length > 0) {
    sections.push(`🏷️ Tags: ${entry.tags.join(', ')}`);
    sections.push('');
  }
  
  sections.push('📝 Entry:');
  sections.push(entry.content);
  sections.push('');
  sections.push('---');
  sections.push('Shared from MyFutureSelf.ai - Your AI-powered journal & vision board');
  
  return sections.join('\n');
}

/**
 * Format share data as text
 */
function formatShareText(data: ShareData): string {
  const parts: string[] = [];
  
  if (data.title) {
    parts.push(data.title);
  }
  
  if (data.text) {
    parts.push(data.text);
  }
  
  if (data.url) {
    parts.push(`Link: ${data.url}`);
  }
  
  return parts.join('\n\n');
}

/**
 * Show a custom share dialog as the last fallback
 */
function showShareDialog(data: ShareData): void {
  const shareText = formatShareText(data);
  
  // Create modal overlay
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
  `;
  
  // Create modal content
  const modal = document.createElement('div');
  modal.style.cssText = `
    background: white;
    padding: 24px;
    border-radius: 12px;
    max-width: 500px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  `;
  
  modal.innerHTML = `
    <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600;">Share Content</h2>
    <p style="margin: 0 0 16px 0; color: #6B7280;">Copy the text below to share:</p>
    <textarea 
      id="share-textarea"
      style="
        width: 100%;
        min-height: 200px;
        padding: 12px;
        border: 1px solid #E5E7EB;
        border-radius: 8px;
        font-family: inherit;
        font-size: 14px;
        resize: vertical;
      "
      readonly
    >${shareText}</textarea>
    <div style="display: flex; gap: 12px; margin-top: 16px;">
      <button
        id="copy-btn"
        style="
          flex: 1;
          padding: 10px 16px;
          background: #8A2BE2;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
        "
      >Copy to Clipboard</button>
      <button
        id="close-btn"
        style="
          flex: 1;
          padding: 10px 16px;
          background: #F3F4F6;
          color: #374151;
          border: none;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
        "
      >Close</button>
    </div>
  `;
  
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  
  // Select text
  const textarea = document.getElementById('share-textarea') as HTMLTextAreaElement;
  textarea.select();
  
  // Handle copy button
  const copyBtn = document.getElementById('copy-btn');
  copyBtn?.addEventListener('click', () => {
    textarea.select();
    document.execCommand('copy');
    toast.success('Copied to clipboard!');
    document.body.removeChild(overlay);
  });
  
  // Handle close button
  const closeBtn = document.getElementById('close-btn');
  closeBtn?.addEventListener('click', () => {
    document.body.removeChild(overlay);
  });
  
  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      document.body.removeChild(overlay);
    }
  });
}

/**
 * Download content as a text file
 */
export function downloadAsTextFile(content: string, filename: string = 'journal-entry.txt'): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
  toast.success('Downloaded successfully!');
}