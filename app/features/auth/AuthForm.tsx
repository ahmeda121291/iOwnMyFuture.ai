import React, { useState } from 'react';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { signIn, signUp } from '../../core/api/supabase';
import Button from '../../shared/components/Button';

interface AuthFormProps {
  mode: 'login' | 'signup';
  onSuccess: () => void;
  onModeChange: (mode: 'login' | 'signup') => void;
}

export default function AuthForm({ mode, onSuccess, onModeChange }: AuthFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (mode === 'signup') {
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match');
        }
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters long');
        }
        await signUp(email, password);
        setSuccess('Account created successfully! You can now sign in.');
        // Auto-switch to login mode after successful signup
        setTimeout(() => {
          onModeChange('login');
          setSuccess('');
        }, 2000);
      } else {
        await signIn(email, password);
        onSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-text-primary mb-3">
            {mode === 'login' ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-text-secondary text-lg">
            {mode === 'login' 
              ? 'Sign in to continue your journey' 
              : 'Start your transformation today'
            }
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl">
            <p className="text-red-600 text-sm font-medium">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-2xl">
            <p className="text-green-600 text-sm font-medium">{success}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-text-primary mb-3">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-full focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all duration-300 bg-gray-50 focus:bg-white"
                placeholder="Enter your email"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-text-primary mb-3">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-14 py-4 border-2 border-gray-200 rounded-full focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all duration-300 bg-gray-50 focus:bg-white"
                placeholder="Enter your password"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-accent transition-colors p-1"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {mode === 'signup' && (
            <div>
              <label className="block text-sm font-semibold text-text-primary mb-3">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-full focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all duration-300 bg-gray-50 focus:bg-white"
                  placeholder="Confirm your password"
                  required
                  minLength={6}
                />
              </div>
            </div>
          )}

          <Button
            type="submit"
            className="w-full rounded-full py-4 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
            loading={loading}
            disabled={loading}
            onClick={() => {}}
          >
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </Button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-text-secondary text-base">
            {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => onModeChange(mode === 'login' ? 'signup' : 'login')}
              className="text-accent hover:text-accent/80 font-semibold transition-colors underline decoration-2 underline-offset-2"
            >
              {mode === 'login' ? 'Sign up here' : 'Sign in here'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}