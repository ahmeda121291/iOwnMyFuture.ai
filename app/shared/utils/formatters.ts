// Date formatting utilities
export const formatDate = (date: Date | string, options?: Intl.DateTimeFormatOptions): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  };
  
  return dateObj.toLocaleDateString('en-US', { ...defaultOptions, ...options });
};

export const formatTime = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

export const formatRelativeTime = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);
  
  if (diffInSeconds < 60) {return 'Just now';}
  if (diffInSeconds < 3600) {return `${Math.floor(diffInSeconds / 60)} minutes ago`;}
  if (diffInSeconds < 86400) {return `${Math.floor(diffInSeconds / 3600)} hours ago`;}
  if (diffInSeconds < 604800) {return `${Math.floor(diffInSeconds / 86400)} days ago`;}
  
  return formatDate(dateObj);
};

// Currency formatting
export const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

// Number formatting
export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('en-US').format(num);
};

// Word count
export const getWordCount = (text: string): number => {
  return text.split(/\s+/).filter(Boolean).length;
};

// Reading time estimation
export const getReadingTime = (text: string, wordsPerMinute: number = 200): number => {
  const wordCount = getWordCount(text);
  return Math.ceil(wordCount / wordsPerMinute);
};

// Truncate text
export const truncateText = (text: string, maxLength: number = 100): string => {
  if (text.length <= maxLength) {return text;}
  return text.substring(0, maxLength).trim() + '...';
};