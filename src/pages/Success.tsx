import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, ArrowRight } from 'lucide-react';
import Button from '../components/Shared/Button';
import Loader from '../components/Shared/Loader';

export default function SuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    // Simulate a brief loading period to show the success animation
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader size="large" className="mb-4" />
          <p className="text-text-secondary">Processing your payment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-background to-primary/10 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        <div className="card text-center">
          <div className="mb-6">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-text-primary mb-2">
              Payment Successful!
            </h1>
            <p className="text-text-secondary">
              Welcome to MoodBoard.ai! Your subscription is now active and you have full access to all features.
            </p>
          </div>

          {sessionId && (
            <div className="mb-6 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-text-secondary">
                Session ID: <span className="font-mono text-xs">{sessionId}</span>
              </p>
            </div>
          )}

          <div className="space-y-4">
            <Button
              onClick={() => navigate('/dashboard')}
              className="w-full"
            >
              Go to Dashboard
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>

            <Button
              variant="secondary"
              onClick={() => navigate('/moodboard')}
              className="w-full"
            >
              Create Your First Vision Board
            </Button>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="font-semibold text-text-primary mb-2">What's Next?</h3>
            <ul className="text-sm text-text-secondary space-y-1">
              <li>• Set up your goals and preferences</li>
              <li>• Create your first AI-powered vision board</li>
              <li>• Start your daily journaling practice</li>
              <li>• Track your progress with AI insights</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}