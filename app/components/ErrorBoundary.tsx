import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Button from '../shared/components/Button';
import { errorTracker } from '../shared/utils/errorTracking';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { 
      hasError: true, 
      error,
      errorInfo: null 
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Track error to Sentry and Supabase
    errorTracker.trackError(error, {
      component: 'ErrorBoundary',
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
      errorInfo: JSON.stringify(errorInfo)
    });

    this.setState({
      error,
      errorInfo
    });
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isDevelopment = import.meta.env.DEV;

      return (
        <div className="min-h-screen bg-gradient-to-br from-primary-50 to-accent-50 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl p-8 md:p-12">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-error-100 rounded-full flex items-center justify-center mb-6">
                <AlertTriangle className="w-10 h-10 text-error-500" />
              </div>
              
              <h1 className="text-3xl font-bold text-text-primary mb-4">
                Oops! Something went wrong
              </h1>
              
              <p className="text-text-secondary mb-8 max-w-md">
                We encountered an unexpected error. Don't worry, our team has been notified and is working on a fix.
              </p>

              {isDevelopment && this.state.error && (
                <div className="w-full mb-8 p-4 bg-gray-100 rounded-lg text-left">
                  <p className="text-sm font-mono text-gray-700 mb-2">
                    <strong>Error:</strong> {this.state.error.toString()}
                  </p>
                  {this.state.errorInfo && (
                    <details className="text-xs text-gray-600">
                      <summary className="cursor-pointer hover:text-gray-800">
                        Component Stack
                      </summary>
                      <pre className="mt-2 overflow-auto">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                <Button
                  variant="gradient"
                  size="lg"
                  onClick={this.handleReset}
                  icon={<RefreshCw className="w-5 h-5" />}
                  iconPosition="left"
                >
                  Try Again
                </Button>
                
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={this.handleGoHome}
                  icon={<Home className="w-5 h-5" />}
                  iconPosition="left"
                >
                  Go Home
                </Button>
              </div>

              <p className="mt-8 text-sm text-text-muted">
                Error ID: {Date.now().toString(36).toUpperCase()}
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;