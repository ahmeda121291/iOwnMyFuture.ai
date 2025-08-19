import toast from 'react-hot-toast';
import { errorTracker } from './errorTracking';

export type ErrorType = 
  | 'AUTH'
  | 'SUBSCRIPTION'
  | 'PAYMENT'
  | 'NETWORK'
  | 'VALIDATION'
  | 'SERVER'
  | 'UNKNOWN';

interface ErrorHandlerOptions {
  component: string;
  action: string;
  showToast?: boolean;
  fallbackMessage?: string;
  metadata?: Record<string, unknown>;
}

interface ErrorResponse {
  type: ErrorType;
  message: string;
  userMessage: string;
  shouldRetry: boolean;
  redirectTo?: string;
}

/**
 * Analyzes an error and returns structured information about it
 */
export function analyzeError(error: unknown): ErrorResponse {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  // Authentication errors
  if (
    errorMessage.includes('Unauthorized') ||
    errorMessage.includes('authenticated') ||
    errorMessage.includes('JWT') ||
    errorMessage.includes('token')
  ) {
    return {
      type: 'AUTH',
      message: errorMessage,
      userMessage: 'Your session has expired. Please log in again.',
      shouldRetry: false,
      redirectTo: '/auth'
    };
  }
  
  // Subscription/payment errors
  if (
    errorMessage.includes('subscription') ||
    errorMessage.includes('price') ||
    errorMessage.includes('stripe') ||
    errorMessage.includes('payment')
  ) {
    return {
      type: 'SUBSCRIPTION',
      message: errorMessage,
      userMessage: 'There was an issue with your subscription. Please try again or contact support.',
      shouldRetry: true
    };
  }
  
  // Network errors
  if (
    errorMessage.includes('fetch') ||
    errorMessage.includes('network') ||
    errorMessage.includes('CORS') ||
    errorMessage.includes('timeout')
  ) {
    return {
      type: 'NETWORK',
      message: errorMessage,
      userMessage: 'Connection error. Please check your internet and try again.',
      shouldRetry: true
    };
  }
  
  // Validation errors
  if (
    errorMessage.includes('invalid') ||
    errorMessage.includes('required') ||
    errorMessage.includes('must be')
  ) {
    return {
      type: 'VALIDATION',
      message: errorMessage,
      userMessage: 'Please check your input and try again.',
      shouldRetry: false
    };
  }
  
  // Server errors
  if (
    errorMessage.includes('500') ||
    errorMessage.includes('502') ||
    errorMessage.includes('503') ||
    errorMessage.includes('server')
  ) {
    return {
      type: 'SERVER',
      message: errorMessage,
      userMessage: 'Our servers are experiencing issues. Please try again later.',
      shouldRetry: true
    };
  }
  
  // Default unknown error
  return {
    type: 'UNKNOWN',
    message: errorMessage,
    userMessage: 'An unexpected error occurred. Please try again.',
    shouldRetry: true
  };
}

/**
 * Centralized error handler that provides consistent error handling across the app
 */
export function handleError(error: unknown, options: ErrorHandlerOptions): ErrorResponse {
  const { component, action, showToast = true, fallbackMessage, metadata = {} } = options;
  
  // Analyze the error
  const errorInfo = analyzeError(error);
  
  // Track the error
  errorTracker.trackError(error, {
    component,
    action,
    errorType: errorInfo.type,
    ...metadata
  });
  
  // Show user-friendly toast if enabled
  if (showToast) {
    const message = fallbackMessage || errorInfo.userMessage;
    
    switch (errorInfo.type) {
      case 'AUTH':
        toast.error(message, { duration: 5000 });
        break;
      case 'NETWORK':
        toast.error(message, { 
          duration: 4000,
          icon: '🌐'
        });
        break;
      case 'VALIDATION':
        toast.error(message, { 
          duration: 3000,
          icon: '⚠️'
        });
        break;
      case 'SERVER':
        toast.error(message, { 
          duration: 5000,
          icon: '🔧'
        });
        break;
      case 'SUBSCRIPTION':
      case 'PAYMENT':
        toast.error(message, { 
          duration: 6000,
          icon: '💳'
        });
        break;
      default:
        toast.error(message, { duration: 4000 });
    }
  }
  
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error(`[${component}:${action}] ${errorInfo.type} Error:`, error);
  }
  
  return errorInfo;
}

/**
 * Wrapper for async operations with built-in error handling
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  options: ErrorHandlerOptions
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    handleError(error, options);
    return null;
  }
}

/**
 * Retry mechanism for operations that might fail transiently
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: unknown;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Don't retry on certain error types
      const errorInfo = analyzeError(error);
      if (!errorInfo.shouldRetry) {
        throw error;
      }
      
      // Wait before retrying (exponential backoff)
      if (i < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

/**
 * Format error messages for display
 */
export function formatErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    // Remove technical details from error messages
    return error.message
      .replace(/Error:\s*/gi, '')
      .replace(/\bat\s+.+:\d+:\d+/g, '') // Remove stack trace references
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }
  
  return String(error);
}