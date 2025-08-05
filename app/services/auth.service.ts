import { type User, type AuthError } from '@supabase/supabase-js';
import { supabase } from '../core/api/supabase';

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User | null;
  error: AuthError | null;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
  subscription_status?: 'free' | 'pro' | 'enterprise';
}

/**
 * Authentication Service
 * Handles all authentication-related operations
 */
class AuthService {
  /**
   * Sign up a new user
   */
  async signUp(credentials: AuthCredentials): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) {
        return { user: null, error };
      }

      return { user: data.user, error: null };
    } catch (error) {
      console.error('SignUp error:', error);
      return { 
        user: null, 
        error: { 
          message: 'Failed to sign up', 
          status: 500 
        } as AuthError 
      };
    }
  }

  /**
   * Sign in an existing user
   */
  async signIn(credentials: AuthCredentials): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) {
        return { user: null, error };
      }

      return { user: data.user, error: null };
    } catch (error) {
      console.error('SignIn error:', error);
      return { 
        user: null, 
        error: { 
          message: 'Failed to sign in', 
          status: 500 
        } as AuthError 
      };
    }
  }

  /**
   * Sign out the current user
   */
  async signOut(): Promise<{ error: AuthError | null }> {
    try {
      const { error } = await supabase.auth.signOut();
      return { error };
    } catch (error) {
      console.error('SignOut error:', error);
      return { 
        error: { 
          message: 'Failed to sign out', 
          status: 500 
        } as AuthError 
      };
    }
  }

  /**
   * Get the current authenticated user
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    } catch (error) {
      console.error('GetCurrentUser error:', error);
      return null;
    }
  }

  /**
   * Get current session
   */
  async getSession() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    } catch (error) {
      console.error('GetSession error:', error);
      return null;
    }
  }

  /**
   * Get user profile with additional metadata
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('GetUserProfile error:', error);
        return null;
      }

      return data as UserProfile;
    } catch (error) {
      console.error('GetUserProfile error:', error);
      return null;
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);

      if (error) {
        console.error('UpdateUserProfile error:', error);
        return { error: new Error(error.message) };
      }

      // Also update auth metadata if name or avatar changed
      if (updates.full_name || updates.avatar_url) {
        const { error: authError } = await supabase.auth.updateUser({
          data: {
            full_name: updates.full_name,
            avatar_url: updates.avatar_url,
          }
        });

        if (authError) {
          console.error('UpdateUser auth error:', authError);
          return { error: new Error(authError.message) };
        }
      }

      return { error: null };
    } catch (error) {
      console.error('UpdateUserProfile error:', error);
      return { error: error as Error };
    }
  }

  /**
   * Send password reset email
   */
  async resetPassword(email: string): Promise<{ error: AuthError | null }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      return { error };
    } catch (error) {
      console.error('ResetPassword error:', error);
      return { 
        error: { 
          message: 'Failed to send reset email', 
          status: 500 
        } as AuthError 
      };
    }
  }

  /**
   * Update user password
   */
  async updatePassword(newPassword: string): Promise<{ error: AuthError | null }> {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      return { error };
    } catch (error) {
      console.error('UpdatePassword error:', error);
      return { 
        error: { 
          message: 'Failed to update password', 
          status: 500 
        } as AuthError 
      };
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return user !== null;
  }

  /**
   * Subscribe to auth state changes
   */
  onAuthStateChange(callback: (user: User | null) => void) {
    return supabase.auth.onAuthStateChange((event, session) => {
      callback(session?.user ?? null);
    });
  }

  /**
   * Sign in with OAuth provider
   */
  async signInWithProvider(provider: 'google' | 'github' | 'facebook'): Promise<{ error: AuthError | null }> {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      return { error };
    } catch (error) {
      console.error('SignInWithProvider error:', error);
      return { 
        error: { 
          message: `Failed to sign in with ${provider}`, 
          status: 500 
        } as AuthError 
      };
    }
  }

  /**
   * Verify user email with OTP
   */
  async verifyOtp(email: string, token: string): Promise<{ error: AuthError | null }> {
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      });

      return { error };
    } catch (error) {
      console.error('VerifyOtp error:', error);
      return { 
        error: { 
          message: 'Failed to verify OTP', 
          status: 500 
        } as AuthError 
      };
    }
  }
}

// Export singleton instance
export const authService = new AuthService();

// Export type for dependency injection
export type IAuthService = AuthService;