import { supabase } from '../../core/api/supabase';
import { errorTracker } from '../utils/errorTracking';

/**
 * Server-side CSRF Protection with httpOnly cookies
 * 
 * This implementation uses a double-submit cookie pattern:
 * 1. Server sets an httpOnly cookie with the base token
 * 2. Server returns a header token (base token + salt)
 * 3. Client includes the header token in X-CSRF-Token header
 * 4. Server validates that cookie and header tokens match
 */

interface CSRFToken {
  token: string;
  expiresAt: string;
}

/**
 * CSRF Protection class for client-side token management
 * Works with server-side httpOnly cookies and double-submit pattern
 */
export class CSRFProtection {
  private static instance: CSRFProtection;
  private currentToken: string | null = null;
  private tokenExpiry: Date | null = null;
  private tokenPromise: Promise<string> | null = null;

  private constructor() {}

  static getInstance(): CSRFProtection {
    if (!CSRFProtection.instance) {
      CSRFProtection.instance = new CSRFProtection();
    }
    return CSRFProtection.instance;
  }

  /**
   * Fetch a new CSRF token from the server
   * Server will set httpOnly cookie and return header token
   */
  private async fetchTokenFromServer(): Promise<CSRFToken> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('User not authenticated - please sign in to continue');
      }

      const response = await fetch(`${supabase.supabaseUrl}/functions/v1/csrf-token`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Important: Include cookies in request
      });

      if (!response.ok) {
        let errorMessage = 'Failed to fetch CSRF token';
        try {
          const error = await response.json();
          errorMessage = error.error || errorMessage;
        } catch {
          errorMessage = `Failed to fetch CSRF token (status: ${response.status})`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      if (!data.csrf_token) {
        throw new Error('Invalid CSRF token response - token missing');
      }
      
      return {
        token: data.csrf_token,
        expiresAt: data.expires_at || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error fetching CSRF token';
      
      errorTracker.trackError(error, {
        component: 'CSRFProtection',
        action: 'fetchTokenFromServer',
        metadata: { errorMessage },
      });
      
      // Re-throw with clear error message
      throw new Error(errorMessage);
    }
  }

  /**
   * Get the current CSRF token, fetching from server if needed
   * This returns the header token to be included in requests
   */
  async getToken(): Promise<string> {
    try {
      // Check if we have a valid token in memory
      if (this.currentToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
        return this.currentToken;
      }

      // If a token fetch is already in progress, wait for it
      if (this.tokenPromise) {
        return await this.tokenPromise;
      }

      // Fetch new token from server
      this.tokenPromise = this.fetchTokenFromServer().then(({ token, expiresAt }) => {
        this.currentToken = token;
        this.tokenExpiry = new Date(expiresAt);
        this.tokenPromise = null;
        return token;
      });

      return await this.tokenPromise;
    } catch (error) {
      this.tokenPromise = null;
      errorTracker.trackError(error, {
        component: 'CSRFProtection',
        action: 'getToken',
      });
      throw error;
    }
  }

  /**
   * Validate a CSRF token with the server
   */
  async validateToken(token: string): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return false;
      }

      const response = await fetch(`${supabase.supabaseUrl}/functions/v1/csrf-token`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'X-CSRF-Token': token,
        },
        body: JSON.stringify({ csrf_token: token }),
        credentials: 'include', // Include cookies for validation
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      return data.valid === true;
    } catch (error) {
      errorTracker.trackError(error, {
        component: 'CSRFProtection',
        action: 'validateToken',
      });
      return false;
    }
  }

  /**
   * Clear the current token (e.g., on logout)
   */
  clearToken(): void {
    this.currentToken = null;
    this.tokenExpiry = null;
    this.tokenPromise = null;
  }

  /**
   * Refresh the CSRF token
   */
  async refreshToken(): Promise<string> {
    this.clearToken();
    return await this.getToken();
  }
}

/**
 * Add CSRF token to fetch requests
 */
export const addCSRFToken = async (requestInit: RequestInit = {}): Promise<RequestInit> => {
  try {
    const csrf = CSRFProtection.getInstance();
    const token = await csrf.getToken();

    const headers = new Headers(requestInit.headers);
    headers.set('X-CSRF-Token', token);

    return {
      ...requestInit,
      headers,
      credentials: 'include' as RequestCredentials, // Always include cookies
    };
  } catch (error) {
    errorTracker.trackWarning('Failed to add CSRF token to request', {
      component: 'CSRFProtection',
      action: 'addCSRFToken',
    });
    // Return original request if CSRF token fails
    return {
      ...requestInit,
      credentials: 'include' as RequestCredentials,
    };
  }
};

/**
 * Create a fetch wrapper that automatically includes CSRF tokens
 */
export const secureFetch = async (
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> => {
  const secureInit = await addCSRFToken(init);
  return fetch(input, secureInit);
};

/**
 * Hook for React components to get CSRF token
 */
export const useCSRFToken = () => {
  const csrf = CSRFProtection.getInstance();
  
  return {
    getToken: () => csrf.getToken(),
    refreshToken: () => csrf.refreshToken(),
    clearToken: () => csrf.clearToken(),
  };
};

/**
 * Create secure form data with CSRF token
 */
export const createSecureFormData = async (data: Record<string, unknown>): Promise<FormData> => {
  const csrf = CSRFProtection.getInstance();
  const token = await csrf.getToken();
  
  const formData = new FormData();
  
  // Add CSRF token
  formData.append('csrf_token', token);
  
  // Add other data
  Object.entries(data).forEach(([key, value]) => {
    if (value instanceof File) {
      formData.append(key, value);
    } else if (value instanceof Blob) {
      formData.append(key, value);
    } else if (typeof value === 'object' && value !== null) {
      formData.append(key, JSON.stringify(value));
    } else {
      formData.append(key, String(value));
    }
  });
  
  return formData;
};

/**
 * Create secure JSON payload with CSRF token
 */
export const createSecureJSON = async (data: Record<string, unknown>): Promise<Record<string, unknown>> => {
  const csrf = CSRFProtection.getInstance();
  const token = await csrf.getToken();
  
  return {
    ...data,
    csrf_token: token,
  };
};

/**
 * Initialize CSRF protection on app start
 */
export const initializeCSRFProtection = (): void => {
  const csrf = CSRFProtection.getInstance();
  
  // Clear tokens on authentication state changes
  supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') {
      csrf.clearToken();
    } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
      // Refresh CSRF token on sign in or token refresh
      csrf.refreshToken().catch(error => {
        errorTracker.trackWarning('Failed to refresh CSRF token on auth change', {
          component: 'CSRFProtection',
          action: 'initializeCSRFProtection',
          metadata: { event },
        });
      });
    }
  });

  // Periodically refresh token before expiry (every 20 hours for 24-hour tokens)
  setInterval(() => {
    const instance = CSRFProtection.getInstance();
    instance.refreshToken().catch(error => {
      errorTracker.trackWarning('Failed to refresh CSRF token periodically', {
        component: 'CSRFProtection',
        action: 'periodicRefresh',
      });
    });
  }, 20 * 60 * 60 * 1000); // 20 hours
};

// Default export
export default CSRFProtection;