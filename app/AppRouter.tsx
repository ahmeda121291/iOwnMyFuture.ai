import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { supabase, getSession } from './core/api/supabase';

// Components
import ErrorBoundary from './shared/components/ErrorBoundary';
import ProOnlyRoute from './shared/components/ProOnlyRoute';
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
import NotFoundPage from './pages/NotFound';

function AppRouter() {
  const [loading, setLoading] = useState(true);
  const [_sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    // Check for existing session on mount
    const initializeAuth = async () => {
      try {
        // Get initial session
        const _session = await getSession();
        setSessionChecked(true);
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, _session) => {
      // Auth state changes are handled by individual components
      // This listener ensures we're aware of auth state changes globally
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        // The app will naturally re-render due to auth state change
        setSessionChecked(true);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

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

            {/* Protected Routes - Pro Only */}
            <Route path="/dashboard" element={
              <ProOnlyRoute>
                <AppLayout>
                  <DashboardPage />
                </AppLayout>
              </ProOnlyRoute>
            } />

            <Route path="/journal" element={
              <ProOnlyRoute>
                <AppLayout>
                  <JournalPage />
                </AppLayout>
              </ProOnlyRoute>
            } />

            <Route path="/journal/:entryId" element={
              <ProOnlyRoute>
                <AppLayout>
                  <JournalEntryPage />
                </AppLayout>
              </ProOnlyRoute>
            } />

            <Route path="/moodboard" element={
              <ProOnlyRoute>
                <AppLayout>
                  <MoodboardPage />
                </AppLayout>
              </ProOnlyRoute>
            } />

            <Route path="/insights" element={
              <ProOnlyRoute>
                <AppLayout>
                  <InsightsPage />
                </AppLayout>
              </ProOnlyRoute>
            } />

            <Route path="/profile" element={
              <ProOnlyRoute>
                <AppLayout>
                  <ProfilePage />
                </AppLayout>
              </ProOnlyRoute>
            } />

            {/* Admin Route */}
            <Route path="/admin" element={
              <AdminRoute>
                <AppLayout>
                  <AdminPage />
                </AppLayout>
              </AdminRoute>
            } />

            {/* 404 Page */}
            <Route path="*" element={
              <AppLayout>
                <NotFoundPage />
              </AppLayout>
            } />
          </Routes>
        </div>
      </Router>
    </ErrorBoundary>
  );
}

export default AppRouter;
