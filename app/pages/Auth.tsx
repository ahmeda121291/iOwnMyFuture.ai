import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser } from '../lib/supabase';
import AuthForm from '../components/Auth/AuthForm';
import Loader from '../components/Shared/Loader';

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const user = await getCurrentUser();
      if (user) {
        navigate('/dashboard');
      }
    } catch (error) {
      // User not authenticated, stay on auth page
    } finally {
      setLoading(false);
    }
  };

  const handleAuthSuccess = () => {
    navigate('/dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader size="large" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/20 via-background to-accent/10 flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <AuthForm
          mode={mode}
          onSuccess={handleAuthSuccess}
          onModeChange={setMode}
        />
      </div>
    </div>
  );
}