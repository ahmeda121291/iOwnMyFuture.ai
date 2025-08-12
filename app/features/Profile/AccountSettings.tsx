import React, { useState, useEffect, useCallback } from 'react';
import { 
  Save, 
  Eye, 
  EyeOff, 
  Shield, 
  Bell, 
  Palette, 
  User, 
  Globe, 
  AlertTriangle,
  Mail,
  Smartphone
} from 'lucide-react';
import { getCurrentUser, supabase } from '../../core/api/supabase';
import Button from '../../shared/components/Button';
import toast from 'react-hot-toast';
import { errorTracker } from '../../shared/utils/errorTracking';

interface UserSettings {
  full_name: string;
  email: string;
  password: string;
  confirmPassword: string;
  notifications: {
    dailyReminders: boolean;
    weeklyReports: boolean;
    goalDeadlines: boolean;
    socialSharing: boolean;
    emailNotifications: boolean;
    pushNotifications: boolean;
  };
  privacy: {
    profileVisibility: 'public' | 'private' | 'friends';
    dataSharing: boolean;
    analyticsOptIn: boolean;
    showActivity: boolean;
  };
  preferences: {
    theme: 'light' | 'dark' | 'system';
    language: string;
    timezone: string;
    autoSave: boolean;
  };
}

export default function AccountSettings() {
  const [user, setUser] = useState<{ id: string; email?: string; user_metadata?: { full_name?: string } } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activeSection, setActiveSection] = useState<'profile' | 'notifications' | 'privacy' | 'preferences'>('profile');
  
  // Form state
  const [settings, setSettings] = useState<UserSettings>({
    full_name: '',
    email: '',
    password: '',
    confirmPassword: '',
    notifications: {
      dailyReminders: true,
      weeklyReports: true,
      goalDeadlines: true,
      socialSharing: false,
      emailNotifications: true,
      pushNotifications: false
    },
    privacy: {
      profileVisibility: 'private',
      dataSharing: false,
      analyticsOptIn: true,
      showActivity: true
    },
    preferences: {
      theme: 'light',
      language: 'en',
      timezone: 'America/New_York',
      autoSave: true
    }
  });

  const loadUserSettings = useCallback(async () => {
    try {
      const userData = await getCurrentUser();
      if (!userData) {return;}
      
      setUser(userData);
      
      setSettings(prev => ({
        ...prev,
        full_name: userData?.user_metadata?.full_name || '',
        email: userData?.email || ''
      }));

      // Load user preferences from profile_data
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('profile_data')
        .eq('user_id', userData.id)
        .single();

      if (!error && profile?.profile_data) {
        setSettings(prev => ({
          ...prev,
          notifications: { ...prev.notifications, ...profile.profile_data.notifications },
          privacy: { ...prev.privacy, ...profile.profile_data.privacy },
          preferences: { ...prev.preferences, ...profile.profile_data.preferences }
        }));
      }
    } catch (error) {
      console.error('Error loading user settings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUserSettings();
  }, [loadUserSettings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (!user) {return;}

      // Validate passwords if changing
      if (settings.password) {
        if (settings.password !== settings.confirmPassword) {
          throw new Error('Passwords do not match');
        }
        if (settings.password.length < 6) {
          throw new Error('Password must be at least 6 characters');
        }
      }

      // Update user metadata (name)
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          full_name: settings.full_name
        }
      });

      if (updateError) {throw updateError;}

      // Update password if provided
      if (settings.password) {
        const { error: passwordError } = await supabase.auth.updateUser({
          password: settings.password
        });

        if (passwordError) {throw passwordError;}
      }

      // Save preferences to profile_data
      const profileData = {
        notifications: settings.notifications,
        privacy: settings.privacy,
        preferences: settings.preferences
      };

      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          profile_data: profileData
        });

      if (profileError) {throw profileError;}

      toast.success('Settings saved successfully!');
      setSettings(prev => ({ ...prev, password: '', confirmPassword: '' }));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save settings';
      errorTracker.trackError(error, { 
        component: 'AccountSettings', 
        action: 'saveSettings',
        errorMessage 
      });
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const updateNestedSetting = (category: keyof UserSettings, key: string, value: unknown) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...(prev[category] as Record<string, unknown>),
        [key]: value
      }
    }));
  };

  const updateSetting = (key: keyof UserSettings, value: unknown) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  if (loading) {
    return (
      <div className="bg-white/70 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-6 shadow-lg">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  const sections = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'privacy', label: 'Privacy', icon: Shield },
    { id: 'preferences', label: 'Preferences', icon: Palette }
  ];

  return (
    <div className="space-y-6">
      {/* Section Navigation */}
      <div className="bg-white/70 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-2 shadow-lg">
        <div className="flex space-x-1">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id as 'profile' | 'notifications' | 'privacy' | 'preferences')}
              className={`flex-1 flex items-center justify-center py-3 px-4 rounded-xl text-sm font-medium transition-all duration-300 ${
                activeSection === section.id
                  ? 'bg-gradient-to-r from-primary to-accent text-white shadow-lg'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <section.icon className="w-4 h-4 mr-2" />
              {section.label}
            </button>
          ))}
        </div>
      </div>

      {/* Profile Section */}
      {activeSection === 'profile' && (
        <div className="bg-white/70 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center mb-6">
            <div className="p-2 bg-blue-100 rounded-lg mr-3">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Profile Information</h3>
              <p className="text-sm text-gray-600">Update your personal details</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={settings.full_name}
                onChange={(e) => updateSetting('full_name', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={settings.email}
                disabled
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                placeholder="Email cannot be changed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={settings.password}
                  onChange={(e) => updateSetting('password', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-colors pr-12"
                  placeholder="Leave blank to keep current password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={settings.confirmPassword}
                onChange={(e) => updateSetting('confirmPassword', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                placeholder="Confirm your new password"
              />
            </div>
          </div>
        </div>
      )}

      {/* Notifications Section */}
      {activeSection === 'notifications' && (
        <div className="bg-white/70 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center mb-6">
            <div className="p-2 bg-green-100 rounded-lg mr-3">
              <Bell className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Notification Preferences</h3>
              <p className="text-sm text-gray-600">Choose what updates you want to receive</p>
            </div>
          </div>

          <div className="space-y-4">
            {[
              { key: 'dailyReminders', label: 'Daily Journaling Reminders', description: 'Get reminded to write in your journal', icon: <Bell className="w-4 h-4" /> },
              { key: 'weeklyReports', label: 'Weekly Progress Reports', description: 'Receive weekly analytics and insights', icon: <Mail className="w-4 h-4" /> },
              { key: 'goalDeadlines', label: 'Goal Deadline Alerts', description: 'Notifications when goals are due', icon: <AlertTriangle className="w-4 h-4" /> },
              { key: 'socialSharing', label: 'Social Sharing Updates', description: 'Notifications about social interactions', icon: <Globe className="w-4 h-4" /> },
              { key: 'emailNotifications', label: 'Email Notifications', description: 'Receive updates via email', icon: <Mail className="w-4 h-4" /> },
              { key: 'pushNotifications', label: 'Push Notifications', description: 'Browser and mobile notifications', icon: <Smartphone className="w-4 h-4" /> }
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-3">
                  <div className="text-gray-500">
                    {item.icon}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{item.label}</h4>
                    <p className="text-sm text-gray-600">{item.description}</p>
                  </div>
                </div>
                <button
                  onClick={() => updateNestedSetting('notifications', item.key, !settings.notifications[item.key as keyof typeof settings.notifications])}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.notifications[item.key as keyof typeof settings.notifications] ? 'bg-primary' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.notifications[item.key as keyof typeof settings.notifications] ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Privacy Section */}
      {activeSection === 'privacy' && (
        <div className="bg-white/70 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center mb-6">
            <div className="p-2 bg-red-100 rounded-lg mr-3">
              <Shield className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Privacy Settings</h3>
              <p className="text-sm text-gray-600">Control your privacy and data sharing</p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Profile Visibility
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'public', label: 'Public', description: 'Anyone can view' },
                  { value: 'friends', label: 'Friends', description: 'Connected users only' },
                  { value: 'private', label: 'Private', description: 'Only you' }
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => updateNestedSetting('privacy', 'profileVisibility', option.value)}
                    className={`p-4 border rounded-lg text-left transition-all ${
                      settings.privacy.profileVisibility === option.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium">{option.label}</div>
                    <div className="text-xs text-gray-500 mt-1">{option.description}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              {[
                { key: 'dataSharing', label: 'Anonymous Data Sharing', description: 'Help improve the app with anonymous usage data' },
                { key: 'analyticsOptIn', label: 'Analytics Tracking', description: 'Allow tracking for personalized insights' },
                { key: 'showActivity', label: 'Show Activity Status', description: 'Let others see when you were last active' }
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div>
                    <h4 className="font-medium text-gray-900">{item.label}</h4>
                    <p className="text-sm text-gray-600">{item.description}</p>
                  </div>
                  <button
                    onClick={() => updateNestedSetting('privacy', item.key, !settings.privacy[item.key as keyof typeof settings.privacy])}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.privacy[item.key as keyof typeof settings.privacy] ? 'bg-primary' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.privacy[item.key as keyof typeof settings.privacy] ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Preferences Section */}
      {activeSection === 'preferences' && (
        <div className="bg-white/70 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center mb-6">
            <div className="p-2 bg-purple-100 rounded-lg mr-3">
              <Palette className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">App Preferences</h3>
              <p className="text-sm text-gray-600">Customize your app experience</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Dark mode toggle removed - feature not implemented */}

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Language
                </label>
                <select
                  value={settings.preferences.language}
                  onChange={(e) => updateNestedSetting('preferences', 'language', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                >
                  <option value="en">English</option>
                  <option value="es">Español</option>
                  <option value="fr">Français</option>
                  <option value="de">Deutsch</option>
                  <option value="it">Italiano</option>
                  <option value="pt">Português</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Timezone
                </label>
                <select
                  value={settings.preferences.timezone}
                  onChange={(e) => updateNestedSetting('preferences', 'timezone', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                >
                  <option value="America/New_York">Eastern Time</option>
                  <option value="America/Chicago">Central Time</option>
                  <option value="America/Denver">Mountain Time</option>
                  <option value="America/Los_Angeles">Pacific Time</option>
                  <option value="Europe/London">London</option>
                  <option value="Europe/Paris">Paris</option>
                  <option value="Asia/Tokyo">Tokyo</option>
                  <option value="Australia/Sydney">Sydney</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <div>
                <h4 className="font-medium text-gray-900">Auto-save Entries</h4>
                <p className="text-sm text-gray-600">Automatically save journal entries as you type</p>
              </div>
              <button
                onClick={() => updateNestedSetting('preferences', 'autoSave', !settings.preferences.autoSave)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.preferences.autoSave ? 'bg-primary' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.preferences.autoSave ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Button */}
      <div className="bg-white/70 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900">Save Changes</h4>
            <p className="text-sm text-gray-600">Make sure to save your settings before leaving</p>
          </div>
          <Button
            onClick={handleSave}
            loading={saving}
            disabled={saving}
            className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>
    </div>
  );
}