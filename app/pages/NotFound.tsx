import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, Search } from 'lucide-react';
import Button from '../shared/components/Button';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/20 via-background to-accent/20 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* 404 Illustration */}
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-primary/20 select-none">404</h1>
          <div className="relative -mt-16">
            <Search className="w-24 h-24 text-gray-400 mx-auto animate-pulse" />
          </div>
        </div>

        {/* Message */}
        <h2 className="text-2xl font-bold text-text-primary mb-4">
          Page Not Found
        </h2>
        <p className="text-text-secondary mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={() => navigate(-1)}
            variant="secondary"
            className="flex items-center justify-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
          
          <Button
            onClick={() => navigate('/')}
            className="flex items-center justify-center"
          >
            <Home className="w-4 h-4 mr-2" />
            Go Home
          </Button>
        </div>

        {/* Helpful Links */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <p className="text-sm text-text-secondary mb-4">
            Here are some helpful links:
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-sm text-primary hover:text-primary-600 underline"
            >
              Dashboard
            </button>
            <button
              onClick={() => navigate('/journal')}
              className="text-sm text-primary hover:text-primary-600 underline"
            >
              Journal
            </button>
            <button
              onClick={() => navigate('/auth')}
              className="text-sm text-primary hover:text-primary-600 underline"
            >
              Sign In
            </button>
            <button
              onClick={() => navigate('/pricing')}
              className="text-sm text-primary hover:text-primary-600 underline"
            >
              Pricing
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}