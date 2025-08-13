import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from './App.tsx';
import './styles/globals.css';
import { initSentry } from './config/sentry';
import { checkForRedirectAfterRefresh } from './utils/lazyWithRetry';

// Initialize Sentry before rendering the app
initSentry();

// Check for redirect after refresh (for lazy loading recovery)
checkForRedirectAfterRefresh();

// Register service worker for PWA support
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('ServiceWorker registered:', registration);
      })
      .catch(error => {
        console.error('ServiceWorker registration failed:', error);
      });
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={() => (
      <div className="min-h-screen bg-gradient-to-br from-[#F5F5FA] to-[#C3B1E1] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Application Error</h1>
          <p className="text-gray-600 mb-6">Something went wrong. Please refresh the page.</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </div>
    )} showDialog>
      <App />
    </Sentry.ErrorBoundary>
  </StrictMode>
);
