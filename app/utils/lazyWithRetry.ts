import { lazy, ComponentType } from 'react';

// Retry mechanism for lazy-loaded components
export function lazyWithRetry<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  componentName = 'Component',
  retries = 3,
  interval = 1000
): React.LazyExoticComponent<T> {
  return lazy(async () => {
    const tryImport = async (retriesLeft: number): Promise<{ default: T }> => {
      try {
        return await importFn();
      } catch (error) {
        if (retriesLeft === 0) {
          console.error(`Failed to load ${componentName} after ${retries} attempts`, error);
          
          // If chunk failed to load, try refreshing
          if (error instanceof Error && error.message.includes('Failed to fetch')) {
            // Store current URL to redirect after refresh
            sessionStorage.setItem('redirect_after_refresh', window.location.href);
            window.location.reload();
          }
          
          throw error;
        }
        
        console.warn(`Retrying to load ${componentName}, ${retriesLeft} attempts left`);
        await new Promise(resolve => setTimeout(resolve, interval));
        return tryImport(retriesLeft - 1);
      }
    };
    
    return tryImport(retries);
  });
}

// Check if we need to redirect after a refresh
export function checkForRedirectAfterRefresh() {
  const redirectUrl = sessionStorage.getItem('redirect_after_refresh');
  if (redirectUrl) {
    sessionStorage.removeItem('redirect_after_refresh');
    if (window.location.href !== redirectUrl) {
      window.location.href = redirectUrl;
    }
  }
}