import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { supabase, getSession } from './core/api/supabase';
import { ThemeProvider } from './hooks/useTheme';

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
import UpgradePage from './pages/Upgrade';
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

// Page transition variants
const pageVariants = {
  initial: { 
    opacity: 0, 
    y: 20,
    scale: 0.98
  },
  in: { 
    opacity: 1, 
    y: 0,
    scale: 1
  },
  out: { 
    opacity: 0, 
    y: -20,
    scale: 0.98
  }
};

const pageTransition = {
  type: "tween",
  ease: "anticipate",
  duration: 0.4
};

// Animated page wrapper component
function AnimatedPage({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
      className="w-full"
    >
      {children}
    </motion.div>
  );
}

// Routes component to handle animations
function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        {/* Public Routes */}
        <Route path="/" element={
          <AppLayout>
            <AnimatedPage>
              <LandingPage />
            </AnimatedPage>
          </AppLayout>
        } />
        
        <Route path="/pricing" element={
          <AppLayout>
            <AnimatedPage>
              <PricingPage />
            </AnimatedPage>
          </AppLayout>
        } />
        
        <Route path="/upgrade" element={
          <AppLayout>
            <AnimatedPage>
              <UpgradePage />
            </AnimatedPage>
          </AppLayout>
        } />
        
        <Route path="/success" element={
          <AppLayout>
            <AnimatedPage>
              <SuccessPage />
            </AnimatedPage>
          </AppLayout>
        } />

        {/* Auth Route (no layout) */}
        <Route path="/auth" element={
          <AnimatedPage>
            <AuthPage />
          </AnimatedPage>
        } />
        
        {/* Public Share Route */}
        <Route path="/share/:id" element={
          <AnimatedPage>
            <ShareSnapshot />
          </AnimatedPage>
        } />

        {/* Protected Routes - Pro Only */}
        <Route path="/dashboard" element={
          <ProOnlyRoute>
            <AppLayout>
              <AnimatedPage>
                <DashboardPage />
              </AnimatedPage>
            </AppLayout>
          </ProOnlyRoute>
        } />

        <Route path="/journal" element={
          <ProOnlyRoute>
            <AppLayout>
              <AnimatedPage>
                <JournalPage />
              </AnimatedPage>
            </AppLayout>
          </ProOnlyRoute>
        } />

        <Route path="/journal/:entryId" element={
          <ProOnlyRoute>
            <AppLayout>
              <AnimatedPage>
                <JournalEntryPage />
              </AnimatedPage>
            </AppLayout>
          </ProOnlyRoute>
        } />

        <Route path="/moodboard" element={
          <ProOnlyRoute>
            <AppLayout>
              <AnimatedPage>
                <MoodboardPage />
              </AnimatedPage>
            </AppLayout>
          </ProOnlyRoute>
        } />

        <Route path="/insights" element={
          <ProOnlyRoute>
            <AppLayout>
              <AnimatedPage>
                <InsightsPage />
              </AnimatedPage>
            </AppLayout>
          </ProOnlyRoute>
        } />

        <Route path="/profile" element={
          <ProOnlyRoute>
            <AppLayout>
              <AnimatedPage>
                <ProfilePage />
              </AnimatedPage>
            </AppLayout>
          </ProOnlyRoute>
        } />

        {/* Admin Route */}
        <Route path="/admin" element={
          <AdminRoute>
            <AppLayout>
              <AnimatedPage>
                <AdminPage />
              </AnimatedPage>
            </AppLayout>
          </AdminRoute>
        } />

        {/* 404 Page */}
        <Route path="*" element={
          <AppLayout>
            <AnimatedPage>
              <NotFoundPage />
            </AnimatedPage>
          </AppLayout>
        } />
      </Routes>
    </AnimatePresence>
  );
}

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
      <div className="min-h-screen bg-background dark:bg-background-dark flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Loader size="large" />
        </motion.div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <Router>
          <div className="min-h-screen bg-background dark:bg-background-dark transition-colors duration-300">
            <AnimatedRoutes />
          </div>
        </Router>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default AppRouter;