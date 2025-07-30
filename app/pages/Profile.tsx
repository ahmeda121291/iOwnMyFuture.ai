import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Settings, Link as LinkIcon, LogOut } from 'lucide-react';
import { getCurrentUser, signOut, supabase } from '../lib/supabase';
import ProfileHeader from '../components/Profile/ProfileHeader';
import SocialConnections from '../components/Profile/SocialConnections';
import AccountSettings from '../components/Profile/AccountSettings';
import Button from '../components/Shared/Button';
import Loader from '../components/Shared/Loader';

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'settings' | 'connections'>('overview');
  const [journalEntries, setJournalEntries] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    initializePage();
  }, []);

  const initializePage = async () => {
    try {
      const userData = await getCurrentUser();
      if (!userData) {
        navigate('/auth');
        return;
      }
      setUser(userData);
      await loadUserData(userData.id);
    } catch (error) {
      console.error('Error loading user:', error);
      navigate('/auth');
    } finally {
      setLoading(false);
    }
  };

  const loadUserData = async (userId: string) => {
    try {
      const { data: entries, error } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setJournalEntries(entries || []);
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const handleSignOut = async () => {
    if (confirm('Are you sure you want to sign out?')) {
      try {
        await signOut();
        navigate('/');
      } catch (error) {
        console.error('Error signing out:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pt-20">
        <Loader size="large" />
      </div>
    );
  }

  const userStats = {
    memberSince: new Date(user?.created_at).toLocaleDateString('en-US', { 
      month: 'long', 
      year: 'numeric' 
    }),
    totalEntries: journalEntries.length,
    goalsAchieved: 3, // This would come from actual goal tracking
    currentStreak: 5 // This would come from actual streak calculation
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'connections', label: 'Social', icon: LinkIcon },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-text-primary mb-2">My Profile</h1>
            <p className="text-text-secondary">
              Manage your account, connections, and preferences
            </p>
          </div>
          
          <Button
            variant="secondary"
            onClick={handleSignOut}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>

        {/* Profile Header */}
        <div className="mb-8">
          <ProfileHeader user={user} stats={userStats} />
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1 mb-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center py-3 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-white text-accent shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'overview' && (
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Recent Activity */}
              <div className="lg:col-span-2">
                <div className="card">
                  <h3 className="text-lg font-semibold text-text-primary mb-6">Recent Activity</h3>
                  
                  {journalEntries.length > 0 ? (
                    <div className="space-y-4">
                      {journalEntries.slice(0, 5).map((entry) => (
                        <div key={entry.id} className="flex items-start p-4 bg-gray-50 rounded-lg">
                          <div className="w-2 h-2 bg-accent rounded-full mt-2 mr-3"></div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-sm font-medium text-text-primary">
                                Journal Entry
                              </p>
                              <span className="text-xs text-text-secondary">
                                {new Date(entry.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-sm text-text-secondary">
                              {entry.ai_summary || entry.content.substring(0, 100) + '...'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-text-secondary">No recent activity to show</p>
                      <Button
                        onClick={() => navigate('/journal')}
                        className="mt-4"
                      >
                        Start Journaling
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="space-y-6">
                <div className="card">
                  <h3 className="text-lg font-semibold text-text-primary mb-4">Achievement Badges</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-3 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg">
                      <div className="text-2xl mb-1">🏆</div>
                      <div className="text-xs font-medium text-yellow-800">Goal Achiever</div>
                    </div>
                    <div className="text-center p-3 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
                      <div className="text-2xl mb-1">📝</div>
                      <div className="text-xs font-medium text-green-800">Consistent Writer</div>
                    </div>
                    <div className="text-center p-3 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
                      <div className="text-2xl mb-1">🎯</div>
                      <div className="text-xs font-medium text-purple-800">Vision Focused</div>
                    </div>
                    <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                      <div className="text-2xl mb-1">⭐</div>
                      <div className="text-xs font-medium text-blue-800">Rising Star</div>
                    </div>
                  </div>
                </div>

                <div className="card bg-gradient-to-br from-primary/10 to-accent/10">
                  <h3 className="text-lg font-semibold text-text-primary mb-3">This Month</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-text-secondary">Journal Entries</span>
                      <span className="font-semibold text-text-primary">{journalEntries.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-text-secondary">Vision Board Updates</span>
                      <span className="font-semibold text-text-primary">2</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-text-secondary">Goals Achieved</span>
                      <span className="font-semibold text-text-primary">1</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'connections' && <SocialConnections />}
          {activeTab === 'settings' && <AccountSettings />}
        </div>
      </div>
    </div>
  );
}