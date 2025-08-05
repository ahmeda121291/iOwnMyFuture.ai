import React, { useMemo } from 'react';
import { User as UserIcon, Calendar, Award, Target } from 'lucide-react';
import { type User } from '../../core/types';

interface ProfileHeaderProps {
  user: User;
  stats: {
    memberSince: string;
    totalEntries: number;
    goalsAchieved: number;
    currentStreak: number;
  };
}

const ProfileHeader = React.memo(function ProfileHeader({ user, stats }: ProfileHeaderProps) {
  // Memoize computed values
  const { initials, displayName } = useMemo(() => {
    return {
      initials: user?.email?.charAt(0).toUpperCase() || 'U',
      displayName: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'
    };
  }, [user?.email, user?.user_metadata?.full_name]);

  return (
    <div className="card">
      <div className="flex items-start space-x-6">
        {/* Avatar */}
        <div className="w-20 h-20 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center text-white text-2xl font-bold">
          {initials}
        </div>

        {/* User Info */}
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-text-primary mb-1">
            {displayName}
          </h2>
          <p className="text-text-secondary mb-4">{user?.email}</p>
          
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full mx-auto mb-1">
                <Calendar className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-sm font-semibold text-text-primary">{stats.memberSince}</div>
              <div className="text-xs text-text-secondary">Member Since</div>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-full mx-auto mb-1">
                <UserIcon className="w-4 h-4 text-green-600" />
              </div>
              <div className="text-sm font-semibold text-text-primary">{stats.totalEntries}</div>
              <div className="text-xs text-text-secondary">Journal Entries</div>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center w-8 h-8 bg-purple-100 rounded-full mx-auto mb-1">
                <Award className="w-4 h-4 text-purple-600" />
              </div>
              <div className="text-sm font-semibold text-text-primary">{stats.goalsAchieved}</div>
              <div className="text-xs text-text-secondary">Goals Achieved</div>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center w-8 h-8 bg-orange-100 rounded-full mx-auto mb-1">
                <Target className="w-4 h-4 text-orange-600" />
              </div>
              <div className="text-sm font-semibold text-text-primary">{stats.currentStreak}</div>
              <div className="text-xs text-text-secondary">Day Streak</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
})

export default ProfileHeader