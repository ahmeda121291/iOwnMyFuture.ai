/**
 * Error tracking utility for production error monitoring
 * Integrated with Sentry for comprehensive error tracking and monitoring
 */

import * as Sentry from '@sentry/react';
import { supabase } from '../../core/api/supabase';

interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

interface ErrorLog {
  message: string;
  stack?: string;
  context?: ErrorContext;
  timestamp: string;
  url: string;
  userAgent: string;
  severity: 'error' | 'warning' | 'info';
}

class ErrorTracker {
  private isDevelopment = import.meta.env.DEV;
  private userId: string | null = null;
  private userEmail: string | null = null;
  private isInitialized = false;

  /**
   * Initialize error tracking with user context
   */
  async initialize() {
    if (this.isInitialized) return;
    
    try {
      // Get current user session
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        this.setUser(session.user.id, session.user.email);
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          this.setUser(session.user.id, session.user.email);
        } else {
          this.clearUser();
        }
      });

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize error tracker:', error);
    }
  }

  /**
   * Set user context for error tracking
   */
  setUser(userId: string, email?: string | null) {
    this.userId = userId;
    this.userEmail = email || null;
    
    // Set user in Sentry
    Sentry.setUser({
      id: userId,
      email: email || undefined,
    });
    
    // Set user context
    Sentry.setContext('user', {
      id: userId,
      email: email || undefined,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Clear user context
   */
  clearUser() {
    this.userId = null;
    this.userEmail = null;
    Sentry.setUser(null);
  }

  /**
   * Track critical errors that should be logged in production
   * These are system-level errors that developers need to know about
   */
  trackError(error: unknown, context?: ErrorContext): void {
    // In development, log to console for debugging
    if (this.isDevelopment) {
      console.error('[Error Tracker]', {
        error,
        context,
        timestamp: new Date().toISOString()
      });
    }

    // Add user context if not provided
    const enrichedContext: ErrorContext = {
      ...context,
      userId: context?.userId || this.userId || undefined,
    };

    // Send to Sentry
    if (error instanceof Error) {
      Sentry.captureException(error, {
        contexts: {
          errorTracking: enrichedContext as any,
        },
        tags: {
          component: enrichedContext.component || 'unknown',
          action: enrichedContext.action || 'unknown',
        },
        extra: {
          ...enrichedContext.metadata,
          url: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
        },
        level: 'error',
      });
    } else {
      // For non-Error objects, capture as message
      Sentry.captureMessage(String(error), {
        level: 'error',
        contexts: {
          errorTracking: enrichedContext as any,
        },
        extra: {
          error: error,
          ...enrichedContext.metadata,
        },
      });
    }

    // Also log to Supabase for persistence and analytics
    this.logToSupabase({
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      context: enrichedContext,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      severity: 'error',
    });
  }

  /**
   * Track warnings that might need attention but aren't critical
   */
  trackWarning(message: string, context?: ErrorContext): void {
    if (this.isDevelopment) {
      console.warn('[Warning]', message, context);
    }

    const enrichedContext: ErrorContext = {
      ...context,
      userId: context?.userId || this.userId || undefined,
    };

    // Send to Sentry as warning
    Sentry.captureMessage(message, {
      level: 'warning',
      contexts: {
        errorTracking: enrichedContext as any,
      },
      tags: {
        component: enrichedContext.component || 'unknown',
        action: enrichedContext.action || 'unknown',
      },
      extra: enrichedContext.metadata,
    });

    // Log to Supabase
    this.logToSupabase({
      message,
      context: enrichedContext,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      severity: 'warning',
    });
  }

  /**
   * Track informational events
   */
  trackInfo(message: string, context?: ErrorContext): void {
    const enrichedContext: ErrorContext = {
      ...context,
      userId: context?.userId || this.userId || undefined,
    };

    // Send to Sentry as info
    Sentry.captureMessage(message, {
      level: 'info',
      contexts: {
        errorTracking: enrichedContext as any,
      },
      extra: enrichedContext.metadata,
    });

    if (!this.isDevelopment) {
      // Log important info to Supabase
      this.logToSupabase({
        message,
        context: enrichedContext,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        severity: 'info',
      });
    }
  }

  /**
   * Track debug information (only in development)
   */
  debug(message: string, data?: unknown): void {
    if (this.isDevelopment) {
      console.log('[Debug]', message, data);
    }
    
    // Add breadcrumb for debugging
    Sentry.addBreadcrumb({
      message,
      level: 'debug',
      category: 'debug',
      data: data as any,
      timestamp: Date.now() / 1000,
    });
  }

  /**
   * Set custom context for the current scope
   */
  setContext(key: string, context: Record<string, any>): void {
    Sentry.setContext(key, context);
  }

  /**
   * Add tags to the current scope
   */
  setTags(tags: Record<string, string>): void {
    Sentry.setTags(tags);
  }

  /**
   * Add extra data to the current scope
   */
  setExtras(extras: Record<string, any>): void {
    Sentry.setExtras(extras);
  }

  /**
   * Create a new scope for isolated error tracking
   */
  withScope(callback: (scope: Sentry.Scope) => void): void {
    Sentry.withScope(callback);
  }

  /**
   * Start a performance transaction
   */
  startTransaction(name: string, op: string = 'navigation'): void {
    Sentry.startSpan({ name, op }, () => {});
  }

  /**
   * Add a breadcrumb for debugging
   */
  addBreadcrumb(breadcrumb: {
    message?: string;
    type?: string;
    category?: string;
    level?: Sentry.SeverityLevel;
    data?: Record<string, any>;
  }): void {
    Sentry.addBreadcrumb({
      ...breadcrumb,
      timestamp: Date.now() / 1000,
    });
  }

  /**
   * Log errors to Supabase for persistence and analytics
   */
  private async logToSupabase(errorLog: ErrorLog): Promise<void> {
    // Don't log in development unless explicitly enabled
    if (this.isDevelopment && !import.meta.env.VITE_LOG_ERRORS_TO_DB) {
      return;
    }

    try {
      // Create error_logs table if it doesn't exist
      // This would normally be done via migration
      const { error } = await supabase
        .from('error_logs')
        .insert({
          user_id: errorLog.context?.userId || this.userId,
          message: errorLog.message.substring(0, 500), // Limit message length
          stack: errorLog.stack?.substring(0, 2000), // Limit stack trace length
          component: errorLog.context?.component,
          action: errorLog.context?.action,
          metadata: errorLog.context?.metadata || {},
          url: errorLog.url,
          user_agent: errorLog.userAgent,
          severity: errorLog.severity,
          created_at: errorLog.timestamp,
        });

      if (error) {
        // Log to console but don't throw to avoid infinite loops
        console.error('Failed to log error to Supabase:', error);
      }
    } catch (error) {
      // Fail silently to avoid infinite error loops
      console.error('Failed to log error to Supabase:', error);
    }
  }

  /**
   * Capture user feedback for an error
   */
  captureUserFeedback(options: {
    name?: string;
    email?: string;
    comments: string;
    eventId?: string;
  }): void {
    const user = Sentry.getCurrentScope().getUser();
    
    const feedback = {
      event_id: options.eventId || Sentry.lastEventId() || '',
      name: options.name || user?.username || 'Anonymous',
      email: options.email || user?.email || this.userEmail || 'unknown@example.com',
      comments: options.comments
    };
    
    // Sentry v10 doesn't have captureUserFeedback, use captureMessage as workaround
    Sentry.captureMessage(`User Feedback: ${options.comments}`, 'info', {
      extra: feedback
    });
  }

  /**
   * Get the last error event ID (useful for user feedback)
   */
  getLastEventId(): string | undefined {
    return Sentry.lastEventId() || undefined;
  }
}

// Export singleton instance
export const errorTracker = new ErrorTracker();

// Initialize on import
errorTracker.initialize().catch(console.error);

// Helper functions for common error scenarios
export const trackAuthError = (error: unknown, action: string) => {
  errorTracker.trackError(error, { 
    component: 'Auth', 
    action,
    metadata: {
      timestamp: new Date().toISOString(),
      path: window.location.pathname,
    }
  });
};

export const trackPaymentError = (error: unknown, action: string, metadata?: Record<string, any>) => {
  errorTracker.trackError(error, { 
    component: 'Payment', 
    action,
    metadata: {
      ...metadata,
      timestamp: new Date().toISOString(),
      // Don't log sensitive payment data
      path: window.location.pathname,
    }
  });
};

export const trackDataError = (error: unknown, component: string, action: string, metadata?: Record<string, any>) => {
  errorTracker.trackError(error, { 
    component, 
    action,
    metadata: {
      ...metadata,
      timestamp: new Date().toISOString(),
    }
  });
};

export const trackAPIError = (error: unknown, endpoint: string, method: string, status?: number) => {
  errorTracker.trackError(error, {
    component: 'API',
    action: `${method} ${endpoint}`,
    metadata: {
      endpoint,
      method,
      status,
      timestamp: new Date().toISOString(),
    }
  });
};

export const trackPerformanceIssue = (metric: string, value: number, threshold: number) => {
  if (value > threshold) {
    errorTracker.trackWarning(`Performance threshold exceeded for ${metric}`, {
      component: 'Performance',
      action: metric,
      metadata: {
        value,
        threshold,
        exceeded: value - threshold,
      }
    });
  }
};

export default errorTracker;