import React, { useState, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { getCurrentUser, supabase } from '../../core/api/supabase';
import Loader from './Loader';

interface AdminRouteProps {
  children: React.ReactNode;
}

export default function AdminRoute({ children }: AdminRouteProps) {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const checkAdminAccess = useCallback(async () => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Check if user has admin privileges
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

      if (!error && profile?.is_admin) {
        setIsAdmin(true);
      }
    } catch (error) {
      console.error('Error checking admin access:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAdminAccess();
  }, [checkAdminAccess]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader size="large" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}