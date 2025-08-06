import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Mail } from 'lucide-react';
import { errorTracker } from '../utils/errorTracking';
import Button from './Button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return { 
      hasError: true, 
      error 
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console in development
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
      console.error('Component Stack:', errorInfo.componentStack);
    }

    // Log to error tracking service
    errorTracker.trackError(error, {
      component: 'ErrorBoundary',
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
      timestamp: new Date().toISOString()
    });

    // Update state with error details
    this.setState(prevState => ({
      errorInfo,
      errorCount: prevState.errorCount + 1
    }));
  }

  handleReset = () => {
    // Reset error boundary state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });

    // Optionally reload the page if errors persist
    if (this.state.errorCount >= 3) {
      window.location.reload();
    }
  };

  handleGoHome = () => {
    // Navigate to home page and reset state
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <div className="bg-white rounded-2xl shadow-xl p-8 text-center relative overflow-hidden">
              {/* Decorative gradient background */}
              <div className="absolute inset-0 bg-gradient-to-br from-red-50 to-orange-50 opacity-50"></div>
              
              <div className="relative z-10">
                {/* Error Icon */}
                <div className="mx-auto w-20 h-20 bg-gradient-to-br from-red-100 to-orange-100 rounded-full flex items-center justify-center mb-6 animate-pulse">
                  <AlertTriangle className="w-10 h-10 text-red-600" />
                </div>

                {/* Error Message */}
                <h1 className="text-2xl font-bold text-gray-900 mb-3">
                  Oops! Something went wrong
                </h1>
                
                <p className="text-gray-600 mb-6">
                  We encountered an unexpected error. Don't worry, your data is safe. 
                  Please try refreshing the page or return to the home page.
                </p>

                {/* Error Details (Development Only) */}
                {import.meta.env.DEV && this.state.error && (
                  <details className="mb-6 text-left">
                    <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700 transition-colors">
                      Show technical details
                    </summary>
                    <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-xs font-mono text-red-600 break-all">
                        {this.state.error.toString()}
                      </p>
                      {this.state.error.stack && (
                        <pre className="mt-2 text-xs text-gray-600 overflow-x-auto">
                          {this.state.error.stack}
                        </pre>
                      )}
                      {this.state.errorInfo?.componentStack && (
                        <pre className="mt-2 text-xs text-gray-500 overflow-x-auto">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      )}
                    </div>
                  </details>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    onClick={this.handleReset}
                    className="flex items-center justify-center bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again
                  </Button>
                  
                  <Button
                    variant="secondary"
                    onClick={this.handleGoHome}
                    className="flex items-center justify-center"
                  >
                    <Home className="w-4 h-4 mr-2" />
                    Go Home
                  </Button>
                </div>

                {/* Retry Counter Warning */}
                {this.state.errorCount >= 2 && (
                  <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <p className="text-sm text-orange-700">
                      ⚠️ Multiple errors detected. If the problem persists, 
                      the page will automatically refresh.
                    </p>
                  </div>
                )}

                {/* Support Link */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <p className="text-xs text-gray-500 mb-2">
                    If this problem continues, please contact our support team
                  </p>
                  <a 
                    href="mailto:support@iownmyfuture.ai" 
                    className="inline-flex items-center text-sm text-primary hover:text-primary/80 transition-colors"
                  >
                    <Mail className="w-4 h-4 mr-1" />
                    support@iownmyfuture.ai
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;