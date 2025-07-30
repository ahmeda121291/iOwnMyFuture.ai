import React, { useState, useEffect } from 'react';
import { Save, Eye, EyeOff, Shield, Bell, Palette } from 'lucide-react';
import { getCurrentUser, supabase } from '../../lib/supabase';
import Button from '../Shared/Button';

export default function AccountSettings() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Form state
  const [settings, setSettings] = useState({
    full_name: '',
    email: '',
    password: '',
    confirmPassword: '',
    notifications: {
      dailyReminders: true,
      weeklyReports: true,
      goalDeadlines: true,
      socialSharing: false
    },
    privacy: {
      profileVisibility: 'private',
      dataSharing: false,
      analyticsOptIn: true
    },
    preferences: {
      theme: 'light',
      language: 'en',
      timezone: 'America/New_York'
    }
  });

  useEffect(() => {
    loadUserSettings();
  }, []);

  const loadUserSettings = async () => {
    try {
      const userData = await getCurrentUser();
      setUser(userData);
      
      setSettings(prev => ({
        ...prev,
        full_name: userData?.user_metadata?.full_name || '',
        email: userData?.email || ''
      }));
    } catch (error) {
      console.error('Error loading user settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Update user metadata
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          full_name: settings.full_name
        }
      });

      if (updateError) throw updateError;

      // Update password if provided
      if (settings.password) {
        if (settings.password !== settings.confirmPassword) {
          throw new Error('Passwords do not match');
        }
        
        const { error: passwordError } = await supabase.auth.updateUser({
          password: settings.password
        });

        if (passwordError) throw passwordError;
      }

      alert('Settings saved successfully!');
      setSettings(prev => ({ ...prev, password: '', confirmPassword: '' }));
    } catch (error: any) {
      console.error('Error saving settings:', error);
      alert(error.message || 'Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (category: string, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category as keyof typeof prev],
        [key]: value
      }
    }));
  };

  if (loading) {
    return (
      <div className="card">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-12 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Information */}
      <div className="card">
        <div className="flex items-center mb-6">
          <Shield className="w-5 h-5 text-accent mr-2" />
          <h3 className="text-lg font-semibold text-text-primary">Profile Information</h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Full Name
            </label>
            <input
              type="text"
              value={settings.full_name}
              onChange={(e) => setSettings(prev => ({ ...prev, full_name: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-colors"
              placeholder="Enter your full name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={settings.email}
              onChange={(e) => setSettings(prev => ({ ...prev, email: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 text-text-secondary cursor-not-allowed"
              disabled
              placeholder="Your email address"
            />
            <p className="text-xs text-text-secondary mt-1">
              Email changes require verification and are not currently supported
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={settings.password}
                  onChange={(e) => setSettings(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-colors pr-10"
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-secondary hover:text-text-primary"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Confirm Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={settings.confirmPassword}
                onChange={(e) => setSettings(prev => ({ ...prev, confirmPassword: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-colors"
                placeholder="Confirm new password"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="card">
        <div className="flex items-center mb-6">
          <Bell className="w-5 h-5 text-accent mr-2" />
          <h3 className="text-lg font-semibold text-text-primary">Notification Preferences</h3>
        </div>

        <div className="space-y-4">
          {Object.entries(settings.notifications).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-primary capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </p>
                <p className="text-xs text-text-secondary">
                  {key === 'dailyReminders' && 'Get reminded to journal daily'}
                  {key === 'weeklyReports' && 'Receive weekly progress summaries'}
                  {key === 'goalDeadlines' && 'Alerts for upcoming goal deadlines'}
                  {key === 'socialSharing' && 'Notifications for social interactions'}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) => updateSetting('notifications', key, e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Privacy Settings */}
      <div className="card">
        <div className="flex items-center mb-6">
          <Shield className="w-5 h-5 text-accent mr-2" />
          <h3 className="text-lg font-semibold text-text-primary">Privacy & Security</h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Profile Visibility
            </label>
            <select
              value={settings.privacy.profileVisibility}
              onChange={(e) => updateSetting('privacy', 'profileVisibility', e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-colors"
            >
              <option value="private">Private - Only you can see your profile</option>
              <option value="friends">Friends - Connected users can see your progress</option>
              <option value="public">Public - Anyone can view your achievements</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-primary">Data Sharing</p>
              <p className="text-xs text-text-secondary">
                Allow anonymous data to improve AI features
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.privacy.dataSharing}
                onChange={(e) => updateSetting('privacy', 'dataSharing', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-primary">Analytics</p>
              <p className="text-xs text-text-secondary">
                Help us improve with usage analytics
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.privacy.analyticsOptIn}
                onChange={(e) => updateSetting('privacy', 'analyticsOptIn', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Appearance */}
      <div className="card">
        <div className="flex items-center mb-6">
          <Palette className="w-5 h-5 text-accent mr-2" />
          <h3 className="text-lg font-semibold text-text-primary">Appearance & Preferences</h3>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Theme
            </label>
            <select
              value={settings.preferences.theme}
              onChange={(e) => updateSetting('preferences', 'theme', e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-colors"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="auto">Auto (System)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Language
            </label>
            <select
              value={settings.preferences.language}
              onChange={(e) => updateSetting('preferences', 'language', e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-colors"
            >
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
              <option value="de">Deutsch</option>
            </select>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          loading={saving}
          disabled={saving}
        >
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      </div>
    </div>
  );
}