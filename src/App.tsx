import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Shared/Navbar';
import Footer from './components/Shared/Footer';
import LandingPage from './pages';
import AuthPage from './pages/Auth';
import PricingPage from './pages/Pricing';
import SuccessPage from './pages/Success';
import DashboardPage from './pages/Dashboard';
import JournalPage from './pages/Journal';
import MoodboardPage from './pages/Moodboard';
import InsightsPage from './pages/Insights';
import ProfilePage from './pages/Profile';
import JournalEntryPage from './pages/JournalEntry';

function App() {
  return (
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
        </Routes>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
