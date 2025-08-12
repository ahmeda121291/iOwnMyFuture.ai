import React, { Component, ErrorInfo, ReactNode } from 'react';
import * as Sentry from '@sentry/react';
import { AlertTriangle, RefreshCw, Home, MessageSquare } from 'lucide-react';
import { errorTracker } from '../utils/errorTracking';
import Button from './Button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  showDetails?: boolean;
  componentName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  eventId: string | undefined;
  showFeedback: boolean;
  feedbackSent: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      eventId: undefined,
      showFeedback: false,
      feedbackSent: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to error tracking service
    const eventId = errorTracker.getLastEventId();
    
    errorTracker.trackError(error, {
      component: this.props.componentName || 'ErrorBoundary',
      action: 'componentDidCatch',
      metadata: {
        componentStack: errorInfo.componentStack,
        props: this.props,
      },
    });

    // Update state with error details
    this.setState({
      errorInfo,
      eventId,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      eventId: undefined,
      showFeedback: false,
      feedbackSent: false,
    });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleReload = () => {
    window.location.reload();
  };

  handleShowFeedback = () => {
    this.setState({ showFeedback: true });
  };

  handleSendFeedback = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    const formData = new FormData(event.currentTarget);
    const comments = formData.get('comments') as string;
    const email = formData.get('email') as string;
    
    if (comments) {
      errorTracker.captureUserFeedback({
        comments,
        email: email || undefined,
        eventId: this.state.eventId,
      });
      
      this.setState({ 
        feedbackSent: true,
        showFeedback: false 
      });
      
      // Reset after showing success message
      setTimeout(() => {
        this.handleReset();
      }, 3000);
    }
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-gradient-to-br from-[#F5F5FA] to-[#C3B1E1] flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Oops! Something went wrong
              </h1>
              
              <p className="text-gray-600 mb-6">
                We're sorry for the inconvenience. The error has been logged and we'll look into it.
              </p>

              {this.state.feedbackSent ? (
                <div className="mb-6 p-4 bg-green-50 rounded-lg">
                  <p className="text-green-800">
                    Thank you for your feedback! We'll use it to improve the app.
                  </p>
                </div>
              ) : (
                <>
                  {this.state.showFeedback ? (
                    <form onSubmit={this.handleSendFeedback} className="mb-6 text-left">
                      <div className="mb-4">
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                          Email (optional)
                        </label>
                        <input
                          type="email"
                          id="email"
                          name="email"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="your@email.com"
                        />
                      </div>
                      
                      <div className="mb-4">
                        <label htmlFor="comments" className="block text-sm font-medium text-gray-700 mb-1">
                          What were you doing when this error occurred?
                        </label>
                        <textarea
                          id="comments"
                          name="comments"
                          required
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="I was trying to..."
                        />
                      </div>
                      
                      <div className="flex gap-3">
                        <Button type="submit" variant="primary">
                          Send Feedback
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => this.setState({ showFeedback: false })}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  ) : null}
                </>
              )}

              {/* Error details for development */}
              {this.props.showDetails && this.state.error && import.meta.env.DEV && (
                <details className="mb-6 text-left">
                  <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                    Show error details
                  </summary>
                  <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm font-mono text-red-600 mb-2">
                      {this.state.error.message}
                    </p>
                    {this.state.error.stack && (
                      <pre className="text-xs text-gray-600 overflow-auto">
                        {this.state.error.stack}
                      </pre>
                    )}
                  </div>
                </details>
              )}

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={this.handleReset}
                  className="flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </Button>
                
                <Button
                  variant="secondary"
                  onClick={this.handleGoHome}
                  className="flex items-center justify-center gap-2"
                >
                  <Home className="w-4 h-4" />
                  Go Home
                </Button>
                
                {!this.state.feedbackSent && !this.state.showFeedback && (
                  <Button
                    variant="secondary"
                    onClick={this.handleShowFeedback}
                    className="flex items-center justify-center gap-2"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Report Issue
                  </Button>
                )}
              </div>

              {/* Event ID for support */}
              {this.state.eventId && (
                <p className="mt-6 text-xs text-gray-500">
                  Error ID: {this.state.eventId}
                </p>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Create a Sentry-enhanced error boundary
export const SentryErrorBoundary = Sentry.withErrorBoundary(
  ({ children }: { children: ReactNode }) => <>{children}</>,
  {
    fallback: ({ error, resetError, eventId }) => (
      <ErrorBoundaryFallback 
        error={error} 
        resetError={resetError} 
        eventId={eventId}
      />
    ),
    showDialog: false, // We'll handle our own dialog
  }
);

// Functional fallback component
function ErrorBoundaryFallback({ 
  error, 
  resetError, 
  eventId 
}: { 
  error: Error | null; 
  resetError: () => void; 
  eventId: string | null;
}) {
  const [feedbackSent, setFeedbackSent] = React.useState(false);
  const [showFeedback, setShowFeedback] = React.useState(false);

  const handleSendFeedback = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    const formData = new FormData(event.currentTarget);
    const comments = formData.get('comments') as string;
    const email = formData.get('email') as string;
    
    if (comments) {
      errorTracker.captureUserFeedback({
        comments,
        email: email || undefined,
        eventId: eventId || undefined,
      });
      
      setFeedbackSent(true);
      setShowFeedback(false);
      
      // Reset after showing success message
      setTimeout(() => {
        resetError();
      }, 3000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F5FA] to-[#C3B1E1] flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Something went wrong
          </h1>
          
          <p className="text-gray-600 mb-6">
            An unexpected error occurred. Please try refreshing the page.
          </p>

          {feedbackSent ? (
            <div className="mb-6 p-4 bg-green-50 rounded-lg">
              <p className="text-green-800">
                Thank you for your feedback!
              </p>
            </div>
          ) : (
            <>
              {showFeedback ? (
                <form onSubmit={handleSendFeedback} className="mb-6 text-left">
                  <div className="mb-4">
                    <label htmlFor="comments" className="block text-sm font-medium text-gray-700 mb-1">
                      What happened?
                    </label>
                    <textarea
                      id="comments"
                      name="comments"
                      required
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Please describe what you were doing..."
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email (optional)
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="your@email.com"
                    />
                  </div>
                  
                  <div className="flex gap-3">
                    <Button type="submit">Send</Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setShowFeedback(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : null}
            </>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={resetError}>
              Try Again
            </Button>
            
            <Button
              variant="secondary"
              onClick={() => window.location.href = '/'}
            >
              Go Home
            </Button>
            
            {!feedbackSent && !showFeedback && (
              <Button
                variant="secondary"
                onClick={() => setShowFeedback(true)}
              >
                Report Issue
              </Button>
            )}
          </div>

          {eventId && (
            <p className="mt-6 text-xs text-gray-500">
              Error ID: {eventId}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default ErrorBoundary;