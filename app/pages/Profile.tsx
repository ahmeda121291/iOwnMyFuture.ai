import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  Settings, 
  Link as LinkIcon, 
  LogOut, 
  BookOpen, 
  Target, 
  TrendingUp, 
  Award,
  Sparkles,
  Calendar,
  Clock,
  Star,
  Trophy,
  Zap,
  Check
} from 'lucide-react';
import { getCurrentUser, signOut, supabase } from '../lib/supabase';
import ProfileHeader from '../components/Profile/ProfileHeader';
import SocialConnections from '../components/Profile/SocialConnections';
import AccountSettings from '../components/Profile/AccountSettings';
import SubscriptionStatus from '../components/Subscription/SubscriptionStatus';
import Button from '../components/Shared/Button';
import Loader from '../components/Shared/Loader';

interface UserStats {
  memberSince: string;
  totalEntries: number;
  entriesThisMonth: number;
  visionBoardUpdates: number;
  goalsAchieved: number;
  currentStreak: number;
  avgWordsPerEntry: number;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  earned: boolean;
  earnedDate?: string;
  color: string;
}

interface ActivityItem {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
  icon: React.ReactNode;
  color: string;
}

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'settings' | 'connections'>('overview');
  const [journalEntries, setJournalEntries] = useState<any[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
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
      // Load journal entries
      const { data: entries, error } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setJournalEntries(entries || []);

      // Calculate user statistics
      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const entriesThisMonth = (entries || []).filter(entry => 
        new Date(entry.created_at) >= thisMonth
      ).length;

      // Calculate current streak
      const currentStreak = calculateStreak(entries || []);
      
      // Calculate average words per entry
      const avgWords = (entries || []).length > 0 
        ? Math.round((entries || []).reduce((sum, entry) => sum + entry.content.split(' ').length, 0) / (entries || []).length)
        : 0;

      // Fetch real vision board updates count
      const { data: updates } = await supabase.from('moodboard_updates').select('id').eq('user_id', user.id);
      const visionBoardUpdates = updates?.length || 0;

      // Fetch real goals achieved count
      const { data: completedGoals } = await supabase.from('goals').select('id').eq('user_id', user.id).eq('completed', true);
      const goalsAchieved = completedGoals?.length || 0;

      const stats: UserStats = {
        memberSince: new Date(user?.created_at).toLocaleDateString('en-US', { 
          month: 'long', 
          year: 'numeric' 
        }),
        totalEntries: (entries || []).length,
        entriesThisMonth,
        visionBoardUpdates,
        goalsAchieved,
        currentStreak,
        avgWordsPerEntry: avgWords
      };

      setUserStats(stats);

      // Generate achievements based on stats
      const userAchievements = generateAchievements(stats);
      setAchievements(userAchievements);

      // Generate recent activity
      const activity = generateRecentActivity(entries || [], stats);
      setRecentActivity(activity);

    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const calculateStreak = (entries: any[]): number => {
    if (entries.length === 0) return 0;
    
    const dates = [...new Set(entries.map(entry => 
      entry.entry_date || entry.created_at.split('T')[0]
    ))].sort().reverse();
    
    let streak = 0;
    let currentDate = new Date();
    
    for (let i = 0; i < 30; i++) {
      const dateStr = currentDate.toISOString().split('T')[0];
      if (dates.includes(dateStr)) {
        streak++;
      } else if (streak > 0) {
        break;
      }
      currentDate.setDate(currentDate.getDate() - 1);
    }
    
    return streak;
  };

  const generateAchievements = (stats: UserStats): Achievement[] => {
    return [
      {
        id: 'goal_achiever',
        title: 'Goal Achiever',
        description: 'Completed your first goal',
        icon: <Trophy className="w-5 h-5" />,
        earned: stats.goalsAchieved > 0,
        earnedDate: stats.goalsAchieved > 0 ? '2 days ago' : undefined,
        color: 'from-yellow-400 to-orange-500'
      },
      {
        id: 'consistent_writer',
        title: 'Consistent Writer',
        description: 'Journaled for 7 days in a row',
        icon: <BookOpen className="w-5 h-5" />,
        earned: stats.currentStreak >= 7,
        earnedDate: stats.currentStreak >= 7 ? '1 week ago' : undefined,
        color: 'from-green-400 to-emerald-500'
      },
      {
        id: 'vision_focused',
        title: 'Vision Focused',
        description: 'Updated vision board 3 times',
        icon: <Target className="w-5 h-5" />,
        earned: stats.visionBoardUpdates >= 3,
        earnedDate: stats.visionBoardUpdates >= 3 ? '3 days ago' : undefined,
        color: 'from-purple-400 to-violet-500'
      },
      {
        id: 'rising_star',
        title: 'Rising Star',
        description: 'Wrote 10+ journal entries',
        icon: <Star className="w-5 h-5" />,
        earned: stats.totalEntries >= 10,
        earnedDate: stats.totalEntries >= 10 ? '1 week ago' : undefined,
        color: 'from-blue-400 to-cyan-500'
      },
      {
        id: 'word_master',
        title: 'Word Master',
        description: 'Average 100+ words per entry',
        icon: <Sparkles className="w-5 h-5" />,
        earned: stats.avgWordsPerEntry >= 100,
        earnedDate: stats.avgWordsPerEntry >= 100 ? '5 days ago' : undefined,
        color: 'from-pink-400 to-rose-500'
      },
      {
        id: 'streak_champion',
        title: 'Streak Champion',
        description: 'Maintained 30-day streak',
        icon: <Zap className="w-5 h-5" />,
        earned: stats.currentStreak >= 30,
        earnedDate: stats.currentStreak >= 30 ? '2 weeks ago' : undefined,
        color: 'from-orange-400 to-red-500'
      }
    ];
  };

  const generateRecentActivity = (entries: any[], stats: UserStats): ActivityItem[] => {
    const activities: ActivityItem[] = [];
    
    // Add recent journal entries
    entries.slice(0, 3).forEach(entry => {
      activities.push({
        id: `journal_${entry.id}`,
        type: 'journal',
        title: 'Journal Entry',
        description: entry.ai_summary || entry.content.substring(0, 80) + '...',
        timestamp: entry.created_at,
        icon: <BookOpen className="w-4 h-4" />,
        color: 'bg-blue-500'
      });
    });

    // Add mock vision board activities
    if (stats.visionBoardUpdates > 0) {
      activities.push({
        id: 'vision_board_1',
        type: 'vision_board',
        title: 'Vision Board Update',
        description: 'Added new goal: "Travel to Japan"',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        icon: <Target className="w-4 h-4" />,
        color: 'bg-purple-500'
      });
    }

    // Add achievement activities
    achievements.filter(a => a.earned).slice(0, 2).forEach(achievement => {
      activities.push({
        id: `achievement_${achievement.id}`,
        type: 'achievement',
        title: 'Achievement Unlocked',
        description: `Earned "${achievement.title}" badge`,
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        icon: <Award className="w-4 h-4" />,
        color: 'bg-yellow-500'
      });
    });

    return activities.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    ).slice(0, 8);
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

  if (!userStats) {
    return null;
  }

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
          <ProfileHeader 
            user={user} 
            stats={{
              memberSince: userStats.memberSince,
              totalEntries: userStats.totalEntries,
              goalsAchieved: userStats.goalsAchieved,
              currentStreak: userStats.currentStreak
            }} 
          />
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
            <div className="space-y-8">
              {/* Stats Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 backdrop-blur-sm border border-blue-200/50 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 bg-blue-500 rounded-lg">
                      <BookOpen className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                      This Month
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">{userStats.entriesThisMonth}</h3>
                  <p className="text-sm text-gray-600">Journal Entries</p>
                  <div className="mt-2 flex items-center text-xs text-blue-600">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    {userStats.totalEntries} total
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 backdrop-blur-sm border border-purple-200/50 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 bg-purple-500 rounded-lg">
                      <Target className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-xs font-medium text-purple-600 bg-purple-100 px-2 py-1 rounded-full">
                      Active
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">{userStats.visionBoardUpdates}</h3>
                  <p className="text-sm text-gray-600">Vision Board Updates</p>
                  <div className="mt-2 flex items-center text-xs text-purple-600">
                    <Sparkles className="w-3 h-3 mr-1" />
                    Keep visualizing!
                  </div>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 backdrop-blur-sm border border-green-200/50 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 bg-green-500 rounded-lg">
                      <Trophy className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full">
                      Achieved
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">{userStats.goalsAchieved}</h3>
                  <p className="text-sm text-gray-600">Goals Completed</p>
                  <div className="mt-2 flex items-center text-xs text-green-600">
                    <Award className="w-3 h-3 mr-1" />
                    Great progress!
                  </div>
                </div>

                <div className="bg-gradient-to-br from-orange-50 to-orange-100 backdrop-blur-sm border border-orange-200/50 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 bg-orange-500 rounded-lg">
                      <Zap className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-xs font-medium text-orange-600 bg-orange-100 px-2 py-1 rounded-full">
                      Current
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">{userStats.currentStreak}</h3>
                  <p className="text-sm text-gray-600">Day Streak</p>
                  <div className="mt-2 flex items-center text-xs text-orange-600">
                    <Clock className="w-3 h-3 mr-1" />
                    Keep it up!
                  </div>
                </div>
              </div>

              <div className="grid lg:grid-cols-3 gap-8">
                {/* Recent Activity */}
                <div className="lg:col-span-2">
                  <div className="bg-white/70 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-6 shadow-lg">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
                      <Calendar className="w-5 h-5 text-gray-400" />
                    </div>
                    
                    {recentActivity.length > 0 ? (
                      <div className="space-y-4">
                        {recentActivity.map((activity) => (
                          <div key={activity.id} className="flex items-start p-4 bg-gray-50/50 rounded-xl hover:bg-gray-100/50 transition-colors">
                            <div className={`w-8 h-8 ${activity.color} rounded-lg flex items-center justify-center text-white mr-4 flex-shrink-0`}>
                              {activity.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {activity.title}
                                </p>
                                <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                                  {new Date(activity.timestamp).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 line-clamp-2">
                                {activity.description}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500 mb-4">No recent activity to show</p>
                        <Button
                          onClick={() => navigate('/journal')}
                          className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
                        >
                          Start Journaling
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Achievements & Subscription */}
                <div className="space-y-6">
                  {/* Achievement Badges */}
                  <div className="bg-white/70 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-6 shadow-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <Award className="w-5 h-5 mr-2 text-yellow-500" />
                      Achievement Badges
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {achievements.slice(0, 6).map((achievement) => (
                        <div 
                          key={achievement.id}
                          className={`relative p-4 rounded-xl text-center transition-all duration-300 ${
                            achievement.earned 
                              ? `bg-gradient-to-br ${achievement.color} text-white shadow-lg hover:scale-105`
                              : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                          }`}
                        >
                          <div className="mb-2 flex justify-center">
                            {achievement.earned ? (
                              <div className="text-white">
                                {achievement.icon}
                              </div>
                            ) : (
                              <div className="text-gray-400">
                                {achievement.icon}
                              </div>
                            )}
                          </div>
                          <div className="text-xs font-medium">
                            {achievement.title}
                          </div>
                          {achievement.earned && achievement.earnedDate && (
                            <div className="text-xs opacity-75 mt-1">
                              {achievement.earnedDate}
                            </div>
                          )}
                          {achievement.earned && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center">
                              <Check className="w-2 h-2 text-yellow-900" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 text-center">
                      <p className="text-xs text-gray-500">
                        {achievements.filter(a => a.earned).length} of {achievements.length} earned
                      </p>
                    </div>
                  </div>

                  {/* Subscription Status */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Subscription</h3>
                    <SubscriptionStatus compact={false} />
                  </div>

                  {/* Quick Stats */}
                  <div className="bg-gradient-to-br from-primary/10 to-accent/10 backdrop-blur-sm border border-primary/20 rounded-2xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Writing Stats</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Average Words/Entry</span>
                        <span className="font-semibold text-gray-900">{userStats.avgWordsPerEntry}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Member Since</span>
                        <span className="font-semibold text-gray-900">{userStats.memberSince}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Total Entries</span>
                        <span className="font-semibold text-gray-900">{userStats.totalEntries}</span>
                      </div>
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