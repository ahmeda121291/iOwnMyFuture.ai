/**
 * Error tracking utility for production error monitoring
 * Can be integrated with Sentry, LogRocket, or custom error tracking service
 */

interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

class ErrorTracker {
  private isDevelopment = import.meta.env.DEV;

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

    // In production, send to error tracking service
    // TODO: Integrate with Sentry or similar service
    if (!this.isDevelopment && typeof error === 'object' && error !== null) {
      // This is where you'd send to Sentry, LogRocket, etc.
      // For now, we'll just structure the error properly
      const errorData = {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        context,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent
      };

      // Could send to a Supabase error_logs table or external service
      this.sendToErrorService(errorData);
    }
  }

  /**
   * Track warnings that might need attention but aren't critical
   */
  trackWarning(message: string, context?: ErrorContext): void {
    if (this.isDevelopment) {
      console.warn('[Warning]', message, context);
    }

    // In production, could send to a separate warning channel
    if (!this.isDevelopment) {
      this.sendToWarningService({ message, context });
    }
  }

  /**
   * Track debug information (only in development)
   */
  debug(message: string, data?: unknown): void {
    if (this.isDevelopment) {
      console.log('[Debug]', message, data);
    }
  }

  private async sendToErrorService(errorData: unknown): Promise<void> {
    // TODO: Implement actual error service integration
    // Example: Sentry.captureException(errorData);
    // Or send to Supabase error_logs table
    try {
      // Placeholder for actual implementation
      await Promise.resolve(errorData);
    } catch {
      // Fail silently to avoid infinite error loops
    }
  }

  private async sendToWarningService(warningData: unknown): Promise<void> {
    // TODO: Implement actual warning service integration
    try {
      // Placeholder for actual implementation
      await Promise.resolve(warningData);
    } catch {
      // Fail silently
    }
  }
}

// Export singleton instance
export const errorTracker = new ErrorTracker();

// Helper functions for common error scenarios
export const trackAuthError = (error: unknown, action: string) => {
  errorTracker.trackError(error, { component: 'Auth', action });
};

export const trackPaymentError = (error: unknown, action: string) => {
  errorTracker.trackError(error, { component: 'Payment', action });
};

export const trackDataError = (error: unknown, component: string, action: string) => {
  errorTracker.trackError(error, { component, action });
};

export default errorTracker;