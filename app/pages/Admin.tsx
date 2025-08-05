import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  DollarSign,
  FileText,
  Cpu,
  TrendingUp,
  TrendingDown,
  Activity,
  Shield,
  RefreshCw,
  Calendar,
  CreditCard
} from 'lucide-react';
import { supabase, getCurrentUser } from '../lib/supabase';
import Loader from '../components/Shared/Loader';
import Button from '../components/Shared/Button';

interface AdminStats {
  totalUsers: number;
  monthlyRevenue: number;
  totalEntries: number;
  aiTokensUsed: number;
  activeSubscriptions: number;
  trialSubscriptions: number;
  recentActivity: {
    newUsersToday: number;
    entriesCreatedToday: number;
    revenueToday: number;
  };
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  subtitle?: string;
  color: string;
}

function StatCard({ title, value, icon, trend, subtitle, color }: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-full ${color} flex items-center justify-center`}>
          {icon}
        </div>
        {trend && (
          <div className={`flex items-center text-sm ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {trend.isPositive ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
            {Math.abs(trend.value)}%
          </div>
        )}
      </div>
      <h3 className="text-gray-600 text-sm font-medium mb-1">{title}</h3>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {subtitle && <p className="text-gray-500 text-sm mt-1">{subtitle}</p>}
    </div>
  );
}

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminAccess();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const checkAdminAccess = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      // Check if user has admin privileges
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

      if (profileError || !profile?.is_admin) {
        setError('Access denied. Admin privileges required.');
        setLoading(false);
        return;
      }

      setIsAdmin(true);
      await loadAdminStats();
    } catch (err) {
      console.error('Error checking admin access:', err);
      setError('Failed to verify admin access.');
      setLoading(false);
    }
  };

  const loadAdminStats = async () => {
    try {
      setRefreshing(true);
      const { data, error: statsError } = await supabase.functions.invoke('admin-stats');

      if (statsError) throw statsError;

      setStats(data);
    } catch (err) {
      console.error('Error loading admin stats:', err);
      setError('Failed to load admin statistics.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader size="large" />
      </div>
    );
  }

  if (error || !isAdmin) {
    return (
      <div className="min-h-screen bg-background pt-20">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-md mx-auto text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Shield className="w-10 h-10 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">Access Denied</h1>
            <p className="text-gray-600 mb-6">{error || 'You do not have permission to access this page.'}</p>
            <Button onClick={() => navigate('/dashboard')}>
              Return to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
            <p className="text-gray-600">Monitor your platform's performance and metrics</p>
          </div>
          <Button
            onClick={loadAdminStats}
            disabled={refreshing}
            variant="secondary"
            className="flex items-center"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {stats && (
          <>
            {/* Main Stats Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard
                title="Total Users"
                value={formatNumber(stats.totalUsers)}
                icon={<Users className="w-6 h-6 text-blue-600" />}
                color="bg-blue-100"
                subtitle={`+${stats.recentActivity.newUsersToday} today`}
              />
              <StatCard
                title="Monthly Revenue"
                value={formatCurrency(stats.monthlyRevenue)}
                icon={<DollarSign className="w-6 h-6 text-green-600" />}
                color="bg-green-100"
                subtitle={`${formatCurrency(stats.recentActivity.revenueToday)} today`}
              />
              <StatCard
                title="Journal Entries"
                value={formatNumber(stats.totalEntries)}
                icon={<FileText className="w-6 h-6 text-purple-600" />}
                color="bg-purple-100"
                subtitle={`+${stats.recentActivity.entriesCreatedToday} today`}
              />
              <StatCard
                title="AI Tokens Used"
                value={formatNumber(stats.aiTokensUsed)}
                icon={<Cpu className="w-6 h-6 text-orange-600" />}
                color="bg-orange-100"
                subtitle="Estimated usage"
              />
            </div>

            {/* Subscription Stats */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center mr-3">
                    <CreditCard className="w-5 h-5 text-indigo-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">Subscription Overview</h2>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">Active Subscriptions</span>
                    <span className="font-semibold text-gray-900">{stats.activeSubscriptions}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">Trial Subscriptions</span>
                    <span className="font-semibold text-gray-900">{stats.trialSubscriptions}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">Conversion Rate</span>
                    <span className="font-semibold text-gray-900">
                      {stats.totalUsers > 0 
                        ? `${((stats.activeSubscriptions / stats.totalUsers) * 100).toFixed(1)}%`
                        : '0%'
                      }
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center mr-3">
                    <Activity className="w-5 h-5 text-teal-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">Platform Activity</h2>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">Avg Entries per User</span>
                    <span className="font-semibold text-gray-900">
                      {stats.totalUsers > 0 
                        ? (stats.totalEntries / stats.totalUsers).toFixed(1)
                        : '0'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">AI Summaries Generated</span>
                    <span className="font-semibold text-gray-900">
                      {Math.round(stats.aiTokensUsed / 150)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">Revenue per User</span>
                    <span className="font-semibold text-gray-900">
                      {stats.totalUsers > 0 
                        ? formatCurrency(stats.monthlyRevenue / stats.totalUsers)
                        : '$0'
                      }
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Today's Activity */}
            <div className="bg-gradient-to-r from-primary to-accent rounded-2xl shadow-lg p-6 text-white">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mr-3">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-semibold">Today's Highlights</h2>
              </div>
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <p className="text-white/80 text-sm mb-1">New Users</p>
                  <p className="text-3xl font-bold">{stats.recentActivity.newUsersToday}</p>
                </div>
                <div>
                  <p className="text-white/80 text-sm mb-1">Journal Entries</p>
                  <p className="text-3xl font-bold">{stats.recentActivity.entriesCreatedToday}</p>
                </div>
                <div>
                  <p className="text-white/80 text-sm mb-1">Revenue</p>
                  <p className="text-3xl font-bold">{formatCurrency(stats.recentActivity.revenueToday)}</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}