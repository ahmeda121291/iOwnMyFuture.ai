import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../utils/testUtils';
import userEvent from '@testing-library/user-event';
import { mockSupabaseClient, setupAuthState } from '../../fixtures/mocks/supabase';

// Import mocks before the component
import '../../fixtures/mocks/supabase';

// Now import the component
import AuthForm from '@/features/auth/AuthForm';
import { signIn, signUp } from '@/core/api/supabase';

describe('AuthForm', () => {
  const mockOnSuccess = vi.fn();
  const mockOnModeChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    setupAuthState('unauthenticated');
  });

  describe('Sign Up Flow', () => {
    it('renders sign up form correctly', () => {
      render(
        <AuthForm 
          mode="signup" 
          onSuccess={mockOnSuccess} 
          onModeChange={mockOnModeChange} 
        />
      );
      
      expect(screen.getByRole('heading', { name: 'Create Account' })).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Confirm your password')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Create Account' })).toBeInTheDocument();
    });

    it('handles successful sign up', async () => {
      const user = userEvent.setup();
      setupAuthState('authenticated');
      
      mockSupabaseClient.auth.signUp.mockResolvedValueOnce({
        data: {
          user: { id: 'new-user', email: 'new@example.com' },
          session: { access_token: 'token' },
        },
        error: null,
      });

      render(
        <AuthForm 
          mode="signup" 
          onSuccess={mockOnSuccess} 
          onModeChange={mockOnModeChange} 
        />
      );
      
      // Fill in the form
      await user.type(screen.getByPlaceholderText('Enter your email'), 'new@example.com');
      await user.type(screen.getByPlaceholderText('Enter your password'), 'password123');
      await user.type(screen.getByPlaceholderText('Confirm your password'), 'password123');
      
      // Submit the form
      await user.click(screen.getByRole('button', { name: 'Create Account' }));
      
      await waitFor(() => {
        expect(signUp).toHaveBeenCalledWith('new@example.com', 'password123');
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });

    it('displays error on sign up failure', async () => {
      const user = userEvent.setup();
      
      mockSupabaseClient.auth.signUp.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'User already exists' },
      });

      render(
        <AuthForm 
          mode="signup" 
          onSuccess={mockOnSuccess} 
          onModeChange={mockOnModeChange} 
        />
      );
      
      await user.type(screen.getByPlaceholderText('Enter your email'), 'existing@example.com');
      await user.type(screen.getByPlaceholderText('Enter your password'), 'password123');
      await user.type(screen.getByPlaceholderText('Confirm your password'), 'password123');
      
      await user.click(screen.getByRole('button', { name: 'Create Account' }));
      
      await waitFor(() => {
        expect(screen.getByText('User already exists')).toBeInTheDocument();
      });
    });

    it('validates password confirmation', async () => {
      const user = userEvent.setup();
      render(
        <AuthForm 
          mode="signup" 
          onSuccess={mockOnSuccess} 
          onModeChange={mockOnModeChange} 
        />
      );
      
      await user.type(screen.getByPlaceholderText('Enter your email'), 'test@example.com');
      await user.type(screen.getByPlaceholderText('Enter your password'), 'password123');
      await user.type(screen.getByPlaceholderText('Confirm your password'), 'password456');
      
      await user.click(screen.getByRole('button', { name: 'Create Account' }));
      
      await waitFor(() => {
        expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
      });
      
      // Should not call the API
      expect(signUp).not.toHaveBeenCalled();
    });
  });

  describe('Sign In Flow', () => {
    it('renders sign in form correctly', () => {
      render(
        <AuthForm 
          mode="login" 
          onSuccess={mockOnSuccess} 
          onModeChange={mockOnModeChange} 
        />
      );
      
      expect(screen.getByRole('heading', { name: 'Welcome Back' })).toBeInTheDocument();
      expect(screen.queryByPlaceholderText('Confirm your password')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
    });

    it('can switch between modes', async () => {
      const user = userEvent.setup();
      render(
        <AuthForm 
          mode="signup" 
          onSuccess={mockOnSuccess} 
          onModeChange={mockOnModeChange} 
        />
      );
      
      // Click the switch to sign in link
      await user.click(screen.getByText('Sign in here'));
      
      expect(mockOnModeChange).toHaveBeenCalledWith('login');
    });

    it('handles successful sign in', async () => {
      const user = userEvent.setup();
      setupAuthState('authenticated');
      
      render(
        <AuthForm 
          mode="login" 
          onSuccess={mockOnSuccess} 
          onModeChange={mockOnModeChange} 
        />
      );
      
      // Fill in credentials
      await user.type(screen.getByPlaceholderText('Enter your email'), 'test@example.com');
      await user.type(screen.getByPlaceholderText('Enter your password'), 'password123');
      
      // Submit
      await user.click(screen.getByRole('button', { name: 'Sign In' }));
      
      await waitFor(() => {
        expect(signIn).toHaveBeenCalledWith('test@example.com', 'password123');
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });

    it('displays error on invalid credentials', async () => {
      const user = userEvent.setup();
      setupAuthState('error');
      
      render(
        <AuthForm 
          mode="login" 
          onSuccess={mockOnSuccess} 
          onModeChange={mockOnModeChange} 
        />
      );
      
      await user.type(screen.getByPlaceholderText('Enter your email'), 'wrong@example.com');
      await user.type(screen.getByPlaceholderText('Enter your password'), 'wrongpassword');
      
      await user.click(screen.getByRole('button', { name: 'Sign In' }));
      
      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('shows loading state during submission', async () => {
      const user = userEvent.setup();
      
      // Make the sign up hang
      mockSupabaseClient.auth.signUp.mockImplementationOnce(
        () => new Promise(resolve => setTimeout(resolve, 1000))
      );
      
      render(
        <AuthForm 
          mode="signup" 
          onSuccess={mockOnSuccess} 
          onModeChange={mockOnModeChange} 
        />
      );
      
      await user.type(screen.getByPlaceholderText('Enter your email'), 'test@example.com');
      await user.type(screen.getByPlaceholderText('Enter your password'), 'password123');
      await user.type(screen.getByPlaceholderText('Confirm your password'), 'password123');
      
      await user.click(screen.getByRole('button', { name: 'Create Account' }));
      
      // Button should show loading state
      expect(screen.getByRole('button')).toHaveTextContent('Loading...');
      expect(screen.getByRole('button')).toBeDisabled();
    });
  });

  describe('Password Visibility Toggle', () => {
    it('toggles password visibility', async () => {
      const user = userEvent.setup();
      render(
        <AuthForm 
          mode="signup" 
          onSuccess={mockOnSuccess} 
          onModeChange={mockOnModeChange} 
        />
      );
      
      const passwordInput = screen.getByPlaceholderText('Enter your password');
      expect(passwordInput).toHaveAttribute('type', 'password');
      
      // Find and click the eye icon button
      const toggleButton = passwordInput.parentElement?.querySelector('button[type="button"]');
      expect(toggleButton).toBeTruthy();
      
      if (toggleButton) {
        await user.click(toggleButton);
        expect(passwordInput).toHaveAttribute('type', 'text');
        
        await user.click(toggleButton);
        expect(passwordInput).toHaveAttribute('type', 'password');
      }
    });
  });

  describe('Form Validation', () => {
    it('requires email and password', async () => {
      const user = userEvent.setup();
      render(
        <AuthForm 
          mode="login" 
          onSuccess={mockOnSuccess} 
          onModeChange={mockOnModeChange} 
        />
      );
      
      // Try to submit without filling fields
      await user.click(screen.getByRole('button', { name: 'Sign In' }));
      
      // HTML5 validation should prevent submission
      expect(signIn).not.toHaveBeenCalled();
    });

    it('validates email format', async () => {
      const user = userEvent.setup();
      render(
        <AuthForm 
          mode="login" 
          onSuccess={mockOnSuccess} 
          onModeChange={mockOnModeChange} 
        />
      );
      
      const emailInput = screen.getByPlaceholderText('Enter your email');
      
      // Type invalid email
      await user.type(emailInput, 'invalid-email');
      
      // Check HTML5 validation
      expect(emailInput).toHaveAttribute('type', 'email');
    });

    it('enforces minimum password length', () => {
      render(
        <AuthForm 
          mode="signup" 
          onSuccess={mockOnSuccess} 
          onModeChange={mockOnModeChange} 
        />
      );
      
      const passwordInput = screen.getByPlaceholderText('Enter your password');
      expect(passwordInput).toHaveAttribute('minlength', '6');
    });
  });
});