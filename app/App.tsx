import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import ErrorBoundary from "./components/Shared/ErrorBoundary";
import Navbar from "./components/Shared/Navbar";
import Footer from "./components/Shared/Footer";

// Pages
import LandingPage from "./pages";
import AuthPage from "./pages/Auth";
import PricingPage from "./pages/Pricing";
import SuccessPage from "./pages/Success";
import DashboardPage from "./pages/Dashboard";
import JournalPage from "./pages/Journal";
import JournalEntryPage from "./pages/journal/[entryId]";
import MoodboardPage from "./pages/Moodboard";
import InsightsPage from "./pages/insights";
import ProfilePage from "./pages/Profile";
import IntegrationsPage from "./pages/Integrations";

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <div className="min-h-screen bg-background">
          <Navbar />
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/success" element={<SuccessPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/journal" element={<JournalPage />} />
            <Route path="/journal/:entryId" element={<JournalEntryPage />} />
            <Route path="/moodboard" element={<MoodboardPage />} />
            <Route path="/insights" element={<InsightsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/integrations" element={<IntegrationsPage />} />
          </Routes>
          <Footer />
        </div>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
