import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import AuthForm from './AuthForm';
import { supabase } from '../../lib/supabase';

// Mock dependencies
vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signInWithOAuth: vi.fn()
    }
  }
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

describe('AuthForm', () => {
  const renderAuthForm = (isSignIn = true) => {
    return render(
      <BrowserRouter>
        <AuthForm isSignIn={isSignIn} />
      </BrowserRouter>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders sign in form correctly', () => {
      renderAuthForm(true);

      expect(screen.getByText('Welcome back')).toBeInTheDocument();
      expect(screen.getByText('Sign in to continue your journey')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument();
      expect(screen.getByText('Sign In')).toBeInTheDocument();
      expect(screen.getByText('Continue with Google')).toBeInTheDocument();
      expect(screen.getByText("Don't have an account?")).toBeInTheDocument();
    });

    it('renders sign up form correctly', () => {
      renderAuthForm(false);

      expect(screen.getByText('Create your account')).toBeInTheDocument();
      expect(screen.getByText('Start your transformation journey today')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Create a password')).toBeInTheDocument();
      expect(screen.getByText('Create Account')).toBeInTheDocument();
      expect(screen.getByText('Continue with Google')).toBeInTheDocument();
      expect(screen.getByText('Already have an account?')).toBeInTheDocument();
    });

    it('shows password requirements for sign up', () => {
      renderAuthForm(false);

      expect(screen.getByText('At least 8 characters')).toBeInTheDocument();
      expect(screen.getByText('One uppercase letter')).toBeInTheDocument();
      expect(screen.getByText('One number')).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('validates email format', async () => {
      const user = userEvent.setup();
      renderAuthForm(true);

      const emailInput = screen.getByPlaceholderText('Enter your email');
      const submitButton = screen.getByText('Sign In');

      // Invalid email
      await user.type(emailInput, 'invalid-email');
      await user.click(submitButton);

      // Should not submit with invalid email
      expect(vi.mocked(supabase.auth.signInWithPassword)).not.toHaveBeenCalled();

      // Valid email
      await user.clear(emailInput);
      await user.type(emailInput, 'test@example.com');
      const passwordInput = screen.getByPlaceholderText('Enter your password');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(vi.mocked(supabase.auth.signInWithPassword)).toHaveBeenCalled();
      });
    });

    it('validates password requirements for sign up', async () => {
      const user = userEvent.setup();
      renderAuthForm(false);

      const passwordInput = screen.getByPlaceholderText('Create a password');

      // Type weak password
      await user.type(passwordInput, 'weak');

      // Check requirement indicators
      const requirements = screen.getByText('At least 8 characters').parentElement;
      expect(requirements).toHaveClass('text-gray-400');

      // Type strong password
      await user.clear(passwordInput);
      await user.type(passwordInput, 'StrongPass123');

      // All requirements should be met
      await waitFor(() => {
        const charReq = screen.getByText('At least 8 characters').parentElement;
        const upperReq = screen.getByText('One uppercase letter').parentElement;
        const numReq = screen.getByText('One number').parentElement;
        
        expect(charReq).toHaveClass('text-green-600');
        expect(upperReq).toHaveClass('text-green-600');
        expect(numReq).toHaveClass('text-green-600');
      });
    });

    it('prevents submission with empty fields', async () => {
      const user = userEvent.setup();
      renderAuthForm(true);

      const submitButton = screen.getByText('Sign In');
      await user.click(submitButton);

      expect(vi.mocked(supabase.auth.signInWithPassword)).not.toHaveBeenCalled();
    });
  });

  describe('Sign In', () => {
    it('handles successful sign in', async () => {
      const user = userEvent.setup();
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
        data: { user: { id: '123' }, session: { access_token: 'token' } },
        error: null
      });

      renderAuthForm(true);

      await user.type(screen.getByPlaceholderText('Enter your email'), 'test@example.com');
      await user.type(screen.getByPlaceholderText('Enter your password'), 'password123');
      await user.click(screen.getByText('Sign In'));

      await waitFor(() => {
        expect(vi.mocked(supabase.auth.signInWithPassword)).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123'
        });
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('handles sign in error', async () => {
      const user = userEvent.setup();
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'Invalid credentials' }
      });

      renderAuthForm(true);

      await user.type(screen.getByPlaceholderText('Enter your email'), 'test@example.com');
      await user.type(screen.getByPlaceholderText('Enter your password'), 'wrongpassword');
      await user.click(screen.getByText('Sign In'));

      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
      });
    });

    it('shows loading state during sign in', async () => {
      const user = userEvent.setup();
      vi.mocked(supabase.auth.signInWithPassword).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          data: { user: { id: '123' }, session: { access_token: 'token' } },
          error: null
        }), 100))
      );

      renderAuthForm(true);

      await user.type(screen.getByPlaceholderText('Enter your email'), 'test@example.com');
      await user.type(screen.getByPlaceholderText('Enter your password'), 'password123');
      
      const submitButton = screen.getByText('Sign In');
      await user.click(submitButton);

      expect(submitButton).toBeDisabled();
      expect(screen.getByText('Signing in...')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByText('Signing in...')).not.toBeInTheDocument();
      });
    });
  });

  describe('Sign Up', () => {
    it('handles successful sign up', async () => {
      const user = userEvent.setup();
      vi.mocked(supabase.auth.signUp).mockResolvedValueOnce({
        data: { user: { id: '123' }, session: { access_token: 'token' } },
        error: null
      });

      renderAuthForm(false);

      await user.type(screen.getByPlaceholderText('Enter your email'), 'newuser@example.com');
      await user.type(screen.getByPlaceholderText('Create a password'), 'StrongPass123');
      await user.click(screen.getByText('Create Account'));

      await waitFor(() => {
        expect(vi.mocked(supabase.auth.signUp)).toHaveBeenCalledWith({
          email: 'newuser@example.com',
          password: 'StrongPass123'
        });
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('handles sign up error', async () => {
      const user = userEvent.setup();
      vi.mocked(supabase.auth.signUp).mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'User already exists' }
      });

      renderAuthForm(false);

      await user.type(screen.getByPlaceholderText('Enter your email'), 'existing@example.com');
      await user.type(screen.getByPlaceholderText('Create a password'), 'StrongPass123');
      await user.click(screen.getByText('Create Account'));

      await waitFor(() => {
        expect(screen.getByText('User already exists')).toBeInTheDocument();
      });
    });

    it('prevents sign up with weak password', async () => {
      const user = userEvent.setup();
      renderAuthForm(false);

      await user.type(screen.getByPlaceholderText('Enter your email'), 'newuser@example.com');
      await user.type(screen.getByPlaceholderText('Create a password'), 'weak');
      
      const submitButton = screen.getByText('Create Account');
      await user.click(submitButton);

      expect(vi.mocked(supabase.auth.signUp)).not.toHaveBeenCalled();
    });
  });

  describe('OAuth Sign In', () => {
    it('handles Google OAuth sign in', async () => {
      const user = userEvent.setup();
      vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValueOnce({
        data: { provider: 'google', url: 'https://google.com/auth' },
        error: null
      });

      renderAuthForm(true);

      await user.click(screen.getByText('Continue with Google'));

      expect(vi.mocked(supabase.auth.signInWithOAuth)).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: expect.stringContaining('/dashboard')
        }
      });
    });

    it('handles OAuth error', async () => {
      const user = userEvent.setup();
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValueOnce({
        data: null,
        error: { message: 'OAuth failed' }
      });

      renderAuthForm(true);

      await user.click(screen.getByText('Continue with Google'));

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('OAuth error:', expect.any(Object));
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Navigation', () => {
    it('navigates between sign in and sign up', async () => {
      const user = userEvent.setup();
      const { rerender } = renderAuthForm(true);

      // Start on sign in
      expect(screen.getByText('Welcome back')).toBeInTheDocument();

      // Click to go to sign up
      await user.click(screen.getByText('Sign up'));

      // Simulate prop change
      rerender(
        <BrowserRouter>
          <AuthForm isSignIn={false} />
        </BrowserRouter>
      );

      expect(screen.getByText('Create your account')).toBeInTheDocument();

      // Click to go back to sign in
      await user.click(screen.getByText('Sign in'));

      // Simulate prop change
      rerender(
        <BrowserRouter>
          <AuthForm isSignIn={true} />
        </BrowserRouter>
      );

      expect(screen.getByText('Welcome back')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles network errors gracefully', async () => {
      const user = userEvent.setup();
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(supabase.auth.signInWithPassword).mockRejectedValueOnce(new Error('Network error'));

      renderAuthForm(true);

      await user.type(screen.getByPlaceholderText('Enter your email'), 'test@example.com');
      await user.type(screen.getByPlaceholderText('Enter your password'), 'password123');
      await user.click(screen.getByText('Sign In'));

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Auth error:', expect.any(Error));
        expect(screen.getByText('An unexpected error occurred')).toBeInTheDocument();
      });

      consoleErrorSpy.mockRestore();
    });

    it('clears error message when user types', async () => {
      const user = userEvent.setup();
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'Invalid credentials' }
      });

      renderAuthForm(true);

      // Trigger error
      await user.type(screen.getByPlaceholderText('Enter your email'), 'test@example.com');
      await user.type(screen.getByPlaceholderText('Enter your password'), 'wrongpassword');
      await user.click(screen.getByText('Sign In'));

      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
      });

      // Type in email field to clear error
      await user.type(screen.getByPlaceholderText('Enter your email'), 'a');

      expect(screen.queryByText('Invalid credentials')).not.toBeInTheDocument();
    });

    it('handles rapid form submissions', async () => {
      const user = userEvent.setup();
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: { id: '123' }, session: { access_token: 'token' } },
        error: null
      });

      renderAuthForm(true);

      await user.type(screen.getByPlaceholderText('Enter your email'), 'test@example.com');
      await user.type(screen.getByPlaceholderText('Enter your password'), 'password123');
      
      const submitButton = screen.getByText('Sign In');
      
      // Rapid clicks
      await user.click(submitButton);
      await user.click(submitButton);
      await user.click(submitButton);

      // Should only call once due to loading state
      await waitFor(() => {
        expect(vi.mocked(supabase.auth.signInWithPassword)).toHaveBeenCalledTimes(1);
      });
    });
  });
});