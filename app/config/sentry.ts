import * as Sentry from '@sentry/react';

/**
 * Initialize Sentry error tracking
 * This should be called early in your app initialization
 */
export function initSentry() {
  // Only initialize in production or staging environments
  if (import.meta.env.PROD || import.meta.env.VITE_ENABLE_SENTRY === 'true') {
    Sentry.init({
      // Get DSN from environment variable
      // You'll need to add VITE_SENTRY_DSN to your .env file
      dsn: import.meta.env.VITE_SENTRY_DSN,
      
      // Set environment
      environment: import.meta.env.MODE || 'development',
      
      // Integration configurations
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({
          // Mask all text and inputs for privacy
          maskAllText: true,
          maskAllInputs: true
        }),
      ],
      
      // Performance Monitoring
      tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
      
      // Session Replay
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      
      // Release tracking
      release: import.meta.env.VITE_APP_VERSION || '1.0.0',
      
      // Filter out certain errors
      ignoreErrors: [
        // Browser extensions
        'top.GLOBALS',
        'ResizeObserver loop limit exceeded',
        'Non-Error promise rejection captured',
        // Network errors that are usually user connection issues
        'Network request failed',
        'NetworkError',
        'Failed to fetch',
        // Safari specific errors
        'AbortError: Fetch is aborted',
      ],
      
      // Don't send default PII
      sendDefaultPii: false,
      
      // Before sending error to Sentry
      beforeSend(event, hint) {
        // Filter out certain errors
        if (event.exception) {
          const error = hint.originalException;
          
          // Don't send validation errors
          if (error && typeof error === 'object' && 'name' in error) {
            if (error.name === 'ValidationError' || error.name === 'UserError') {
              return null;
            }
          }
          
          // Sanitize sensitive data
          if (event.request) {
            // Remove auth headers
            if (event.request.headers) {
              delete event.request.headers['Authorization'];
              delete event.request.headers['Cookie'];
            }
            // Remove sensitive query params
            if (event.request.query_string) {
              event.request.query_string = sanitizeQueryString(event.request.query_string);
            }
          }
        }
        
        return event;
      },
      
      // Breadcrumb filtering
      beforeBreadcrumb(breadcrumb) {
        // Filter out noisy breadcrumbs
        if (breadcrumb.category === 'console' && breadcrumb.level === 'debug') {
          return null;
        }
        
        // Sanitize data in breadcrumbs
        if (breadcrumb.data) {
          breadcrumb.data = sanitizeData(breadcrumb.data);
        }
        
        return breadcrumb;
      },
    });
  }
}

/**
 * Set user context for error tracking
 */
export function setSentryUser(user: { id: string; email?: string; username?: string } | null) {
  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.username,
    });
  } else {
    Sentry.setUser(null);
  }
}

/**
 * Add custom context to errors
 */
export function setSentryContext(key: string, context: Record<string, unknown>) {
  Sentry.setContext(key, sanitizeData(context));
}

/**
 * Track custom events
 */
export function trackSentryEvent(message: string, level: Sentry.SeverityLevel = 'info', extra?: Record<string, unknown>) {
  Sentry.captureMessage(message, {
    level,
    extra: extra ? sanitizeData(extra) : undefined,
  });
}

/**
 * Create a transaction for performance monitoring
 */
export function startSentryTransaction(name: string, op: string) {
  return Sentry.startSpan({ name, op }, () => {});
}

/**
 * Sanitize sensitive data from objects
 */
function sanitizeData(data: unknown): unknown {
  if (!data) {
    return data;
  }
  
  const sensitiveKeys = [
    'password',
    'token',
    'secret',
    'api_key',
    'apiKey',
    'auth',
    'authorization',
    'credit_card',
    'creditCard',
    'ssn',
    'social_security',
  ];
  
  if (typeof data === 'object') {
    const sanitized = Array.isArray(data) ? [...data] : { ...data };
    
    for (const key in sanitized) {
      if (sensitiveKeys.some(k => key.toLowerCase().includes(k))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof sanitized[key] === 'object') {
        sanitized[key] = sanitizeData(sanitized[key]);
      }
    }
    
    return sanitized;
  }
  
  return data;
}

/**
 * Sanitize query strings
 */
function sanitizeQueryString(queryString: string): string {
  const params = new URLSearchParams(queryString);
  const sensitiveParams = ['token', 'api_key', 'secret', 'auth'];
  
  sensitiveParams.forEach(param => {
    if (params.has(param)) {
      params.set(param, '[REDACTED]');
    }
  });
  
  return params.toString();
}

// For React Router v6
import React from 'react';
import {
  useLocation,
  useNavigationType,
  createRoutesFromChildren,
  matchRoutes,
} from 'react-router-dom';

export { Sentry };