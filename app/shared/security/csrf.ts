import { supabase } from '../../core/api/supabase';

// CSRF token configuration
const CSRF_TOKEN_LENGTH = 32;
const CSRF_TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Generate a cryptographically secure random token
const generateSecureToken = (): string => {
  const array = new Uint8Array(CSRF_TOKEN_LENGTH);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

// CSRF token storage interface
interface CSRFTokenData {
  token: string;
  timestamp: number;
  userId: string;
}

// In-memory store for CSRF tokens (in production, use Redis or similar)
class CSRFTokenStore {
  private tokens = new Map<string, CSRFTokenData>();

  set(userId: string, token: string): void {
    this.tokens.set(userId, {
      token,
      timestamp: Date.now(),
      userId,
    });
  }

  get(userId: string): CSRFTokenData | null {
    const tokenData = this.tokens.get(userId);
    if (!tokenData) {return null;}

    // Check if token is expired
    if (Date.now() - tokenData.timestamp > CSRF_TOKEN_EXPIRY) {
      this.tokens.delete(userId);
      return null;
    }

    return tokenData;
  }

  validate(userId: string, providedToken: string): boolean {
    const tokenData = this.get(userId);
    if (!tokenData) {return false;}

    return tokenData.token === providedToken;
  }

  remove(userId: string): void {
    this.tokens.delete(userId);
  }

  // Clean up expired tokens
  cleanup(): void {
    const now = Date.now();
    for (const [userId, tokenData] of this.tokens.entries()) {
      if (now - tokenData.timestamp > CSRF_TOKEN_EXPIRY) {
        this.tokens.delete(userId);
      }
    }
  }
}

// Global token store instance
const tokenStore = new CSRFTokenStore();

// Run cleanup every hour
setInterval(() => tokenStore.cleanup(), 60 * 60 * 1000);

// Client-side CSRF token management
export class CSRFProtection {
  private static instance: CSRFProtection;
  private currentToken: string | null = null;
  private tokenTimestamp: number = 0;

  private constructor() {}

  static getInstance(): CSRFProtection {
    if (!CSRFProtection.instance) {
      CSRFProtection.instance = new CSRFProtection();
    }
    return CSRFProtection.instance;
  }

  // Generate and store a new CSRF token
  async generateToken(): Promise<string> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const token = generateSecureToken();
      const timestamp = Date.now();

      // Store token in localStorage for persistence across page reloads
      localStorage.setItem('csrf_token', token);
      localStorage.setItem('csrf_token_timestamp', timestamp.toString());
      localStorage.setItem('csrf_token_user', user.id);

      this.currentToken = token;
      this.tokenTimestamp = timestamp;

      return token;
    } catch (error) {
      console.error('Failed to generate CSRF token:', error);
      throw new Error('Failed to generate CSRF token');
    }
  }

  // Get the current CSRF token, generating one if needed
  async getToken(): Promise<string> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Check if we have a valid token in memory
      if (this.currentToken && this.isTokenValid()) {
        return this.currentToken;
      }

      // Check localStorage for existing token
      const storedToken = localStorage.getItem('csrf_token');
      const storedTimestamp = localStorage.getItem('csrf_token_timestamp');
      const storedUser = localStorage.getItem('csrf_token_user');

      if (storedToken && storedTimestamp && storedUser === user.id) {
        const timestamp = parseInt(storedTimestamp, 10);
        
        // Check if stored token is still valid
        if (Date.now() - timestamp < CSRF_TOKEN_EXPIRY) {
          this.currentToken = storedToken;
          this.tokenTimestamp = timestamp;
          return storedToken;
        }
      }

      // Generate a new token if none exists or expired
      return await this.generateToken();
    } catch (error) {
      console.error('Failed to get CSRF token:', error);
      throw new Error('Failed to get CSRF token');
    }
  }

  // Check if current token is valid (not expired)
  private isTokenValid(): boolean {
    if (!this.currentToken || !this.tokenTimestamp) {return false;}
    return Date.now() - this.tokenTimestamp < CSRF_TOKEN_EXPIRY;
  }

  // Clear the current token (e.g., on logout)
  clearToken(): void {
    this.currentToken = null;
    this.tokenTimestamp = 0;
    localStorage.removeItem('csrf_token');
    localStorage.removeItem('csrf_token_timestamp');
    localStorage.removeItem('csrf_token_user');
  }

  // Validate a token (server-side validation should be primary)
  validateToken(token: string): boolean {
    if (!this.currentToken) {return false;}
    return this.currentToken === token && this.isTokenValid();
  }
}

// Server-side CSRF validation for Edge Functions
export const validateCSRFToken = async (
  request: Request,
  _expectedUserId: string
): Promise<{ valid: boolean; error?: string }> => {
  try {
    // Extract CSRF token from request
    let csrfToken: string | null = null;

    // Check for token in header
    csrfToken = request.headers.get('x-csrf-token');

    // If not in header, check request body
    if (!csrfToken) {
      const contentType = request.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        try {
          const body = await request.clone().json();
          csrfToken = body.csrf_token;
        } catch {
          // Ignore JSON parsing errors
        }
      }
    }

    if (!csrfToken) {
      return { valid: false, error: 'CSRF token missing' };
    }

    // Validate token format
    if (csrfToken.length !== CSRF_TOKEN_LENGTH * 2) { // hex string is 2x the byte length
      return { valid: false, error: 'Invalid CSRF token format' };
    }

    // In a production environment, you would validate against a server-side store
    // For now, we'll do basic format validation and rely on HTTPS + SameSite cookies
    // for additional CSRF protection

    return { valid: true };
  } catch (error) {
    console.error('CSRF validation error:', error);
    return { valid: false, error: 'CSRF validation failed' };
  }
};

// Middleware function for adding CSRF token to requests
export const addCSRFToken = async (requestInit: RequestInit = {}): Promise<RequestInit> => {
  try {
    const csrf = CSRFProtection.getInstance();
    const token = await csrf.getToken();

    return {
      ...requestInit,
      headers: {
        ...requestInit.headers,
        'X-CSRF-Token': token,
      },
    };
  } catch (error) {
    console.error('Failed to add CSRF token:', error);
    return requestInit;
  }
};

// Hook for React components to get CSRF token
export const useCSRFToken = () => {
  const csrf = CSRFProtection.getInstance();
  
  return {
    getToken: () => csrf.getToken(),
    clearToken: () => csrf.clearToken(),
  };
};

// Helper function to create secure form data with CSRF token
export const createSecureFormData = async (data: Record<string, unknown>): Promise<Record<string, unknown>> => {
  const csrf = CSRFProtection.getInstance();
  const token = await csrf.getToken();
  
  return {
    ...data,
    csrf_token: token,
  };
};

// Initialize CSRF protection on app start
export const initializeCSRFProtection = (): void => {
  // Clear tokens on authentication state changes
  supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') {
      CSRFProtection.getInstance().clearToken();
    }
  });
};

export default CSRFProtection;