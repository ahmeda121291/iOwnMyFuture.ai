import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { getCurrentUser } from './core/api/supabase';

// Components
import ErrorBoundary from './shared/components/ErrorBoundary';
import PrivateRoute from './shared/components/PrivateRoute';
import AdminRoute from './shared/components/AdminRoute';
import AppLayout from './shared/components/AppLayout';
import Loader from './shared/components/Loader';

// Pages
import LandingPage from './pages/index';
import AuthPage from './pages/Auth';
import PricingPage from './pages/Pricing';
import SuccessPage from './pages/Success';
import DashboardPage from './pages/Dashboard';
import JournalPage from './pages/Journal';
import JournalEntryPage from './pages/journal/[entryId]';
import MoodboardPage from './pages/Moodboard';
import InsightsPage from './pages/insights';
import ProfilePage from './pages/Profile';
import AdminPage from './pages/Admin';
import ShareSnapshot from './pages/ShareSnapshot';

function AppRouter() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      await getCurrentUser();
    } catch {
      // User not authenticated
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader size="large" />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Router>
        <div className="min-h-screen bg-background">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={
              <AppLayout>
                <LandingPage />
              </AppLayout>
            } />
            
            <Route path="/pricing" element={
              <AppLayout>
                <PricingPage />
              </AppLayout>
            } />
            
            <Route path="/success" element={
              <AppLayout>
                <SuccessPage />
              </AppLayout>
            } />

            {/* Auth Route (no layout) */}
            <Route path="/auth" element={<AuthPage />} />
            
            {/* Public Share Route */}
            <Route path="/share/:id" element={<ShareSnapshot />} />

            {/* Protected Routes */}
            <Route path="/dashboard" element={
              <PrivateRoute>
                <AppLayout>
                  <DashboardPage />
                </AppLayout>
              </PrivateRoute>
            } />

            <Route path="/journal" element={
              <PrivateRoute>
                <AppLayout>
                  <JournalPage />
                </AppLayout>
              </PrivateRoute>
            } />

            <Route path="/journal/:entryId" element={
              <PrivateRoute>
                <AppLayout>
                  <JournalEntryPage />
                </AppLayout>
              </PrivateRoute>
            } />

            <Route path="/moodboard" element={
              <PrivateRoute>
                <AppLayout>
                  <MoodboardPage />
                </AppLayout>
              </PrivateRoute>
            } />

            <Route path="/insights" element={
              <PrivateRoute>
                <AppLayout>
                  <InsightsPage />
                </AppLayout>
              </PrivateRoute>
            } />

            <Route path="/profile" element={
              <PrivateRoute>
                <AppLayout>
                  <ProfilePage />
                </AppLayout>
              </PrivateRoute>
            } />

            {/* Admin Route */}
            <Route path="/admin" element={
              <AdminRoute>
                <AppLayout>
                  <AdminPage />
                </AppLayout>
              </AdminRoute>
            } />

            {/* Catch all - redirect to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </ErrorBoundary>
  );
}

export default AppRouter;
