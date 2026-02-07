import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import {
  Trophy,
  Target,
  Zap,
  TrendingUp,
  Award,
  Gift,
  Flame,
  Star,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

interface GamificationProfile {
  profile: {
    totalPoints: number;
    currentLevel: number;
    tier: string;
    currentStreak: number;
    longestStreak: number;
    referralCount: number;
    hireCount: number;
    shareCount: number;
    badges: Array<{ badgeId: string; earnedAt: string; viewed: boolean }>;
    lootBoxesAvailable: number;
  };
  levelProgress: number;
  unviewedBadgesCount: number;
  recentActivity: Array<{
    _id: string;
    actionType: string;
    pointsEarned: number;
    timestamp: string;
  }>;
  nextLevelPoints: number;
}

const tierColors: Record<string, string> = {
  bronze: 'from-orange-400 to-orange-600',
  silver: 'from-gray-300 to-gray-500',
  gold: 'from-yellow-400 to-yellow-600',
  platinum: 'from-blue-400 to-blue-600',
  diamond: 'from-purple-400 to-purple-600',
};

const tierIcons: Record<string, string> = {
  bronze: '🥉',
  silver: '🥈',
  gold: '🥇',
  platinum: '💎',
  diamond: '👑',
};

export default function GamificationDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<GamificationProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'badges' | 'leaderboard' | 'challenges'>('overview');

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/gamification/profile', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setProfile(data.data);
      }
    } catch (error) {
      console.error('Error fetching gamification profile:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">Failed to load gamification data</p>
          <button
            onClick={fetchProfile}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { profile: p, levelProgress, unviewedBadgesCount, recentActivity } = profile;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* User Info */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${tierColors[p.tier]} flex items-center justify-center text-4xl shadow-lg`}>
                  {tierIcons[p.tier]}
                </div>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -bottom-1 -right-1 bg-white text-blue-600 rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm shadow-md"
                >
                  {p.currentLevel}
                </motion.div>
              </div>
              <div>
                <h1 className="text-2xl font-bold">{user?.name || 'Player'}</h1>
                <p className="text-blue-100 capitalize">{p.tier} Tier • Level {p.currentLevel}</p>
              </div>
            </div>

            {/* Points Display */}
            <div className="text-center">
              <div className="text-4xl font-bold">{p.totalPoints.toLocaleString()}</div>
              <div className="text-blue-100">Total Points</div>
            </div>

            {/* Loot Box Button */}
            {p.lootBoxesAvailable > 0 && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-6 py-3 rounded-xl font-semibold shadow-lg"
              >
                <Gift className="w-5 h-5" />
                <span>Open Loot Box</span>
                <span className="bg-white/20 px-2 py-0.5 rounded-full text-sm">
                  {p.lootBoxesAvailable}
                </span>
              </motion.button>
            )}
          </div>

          {/* Level Progress Bar */}
          <div className="mt-6">
            <div className="flex justify-between text-sm mb-2">
              <span>Level {p.currentLevel}</span>
              <span>Level {p.currentLevel + 1}</span>
            </div>
            <div className="h-3 bg-white/20 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${levelProgress}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full"
              />
            </div>
            <p className="text-center text-sm mt-2 text-blue-100">
              {profile.nextLevelPoints} points to next level
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 overflow-x-auto">
            {[
              { id: 'overview', label: 'Overview', icon: Target },
              { id: 'badges', label: 'Badges', icon: Award, badge: unviewedBadgesCount },
              { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
              { id: 'challenges', label: 'Challenges', icon: Zap },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors relative ${
                  activeTab === tab.id
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span className="hidden sm:inline">{tab.label}</span>
                {tab.badge && tab.badge > 0 && (
                  <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                  icon={Flame}
                  label="Current Streak"
                  value={p.currentStreak}
                  color="orange"
                />
                <StatCard
                  icon={TrendingUp}
                  label="Longest Streak"
                  value={p.longestStreak}
                  color="blue"
                />
                <StatCard
                  icon={Target}
                  label="Referrals"
                  value={p.referralCount}
                  color="green"
                />
                <StatCard
                  icon={Star}
                  label="Hires"
                  value={p.hireCount}
                  color="purple"
                />
              </div>

              {/* Recent Activity */}
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-yellow-500" />
                  Recent Activity
                </h3>
                <div className="space-y-3">
                  {recentActivity.slice(0, 5).map((activity) => (
                    <motion.div
                      key={activity._id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Zap className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium capitalize">
                            {activity.actionType.replace(/_/g, ' ')}
                          </p>
                          <p className="text-sm text-gray-500">
                            {new Date(activity.timestamp).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      {activity.pointsEarned > 0 && (
                        <span className="text-green-600 font-semibold">
                          +{activity.pointsEarned} pts
                        </span>
                      )}
                    </motion.div>
                  ))}
                  {recentActivity.length === 0 && (
                    <p className="text-gray-500 text-center py-8">
                      No recent activity. Start earning points by making referrals!
                    </p>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <QuickActionCard
                  title="View All Badges"
                  description={`You've earned ${p.badges.length} badges`}
                  icon={Award}
                  onClick={() => setActiveTab('badges')}
                  color="purple"
                />
                <QuickActionCard
                  title="Check Leaderboard"
                  description="See how you rank against others"
                  icon={Trophy}
                  onClick={() => setActiveTab('leaderboard')}
                  color="yellow"
                />
              </div>
            </motion.div>
          )}

          {activeTab === 'badges' && (
            <motion.div
              key="badges"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center py-12"
            >
              <Award className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900">Badges Coming Soon</h3>
              <p className="text-gray-500">Your badge collection will appear here</p>
            </motion.div>
          )}

          {activeTab === 'leaderboard' && (
            <motion.div
              key="leaderboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center py-12"
            >
              <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900">Leaderboard Coming Soon</h3>
              <p className="text-gray-500">See how you rank against other referrers</p>
            </motion.div>
          )}

          {activeTab === 'challenges' && (
            <motion.div
              key="challenges"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center py-12"
            >
              <Zap className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900">Challenges Coming Soon</h3>
              <p className="text-gray-500">Complete challenges to earn bonus points</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Sub-components
function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    orange: 'bg-orange-100 text-orange-600',
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <div className={`w-10 h-10 rounded-lg ${colorClasses[color]} flex items-center justify-center mb-3`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  );
}

function QuickActionCard({
  title,
  description,
  icon: Icon,
  onClick,
  color,
}: {
  title: string;
  description: string;
  icon: React.ElementType;
  onClick: () => void;
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    purple: 'bg-purple-100 text-purple-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
  };

  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-xl shadow-sm p-6 flex items-center gap-4 hover:shadow-md transition-shadow text-left"
    >
      <div className={`w-12 h-12 rounded-xl ${colorClasses[color]} flex items-center justify-center`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      <ChevronRight className="w-5 h-5 text-gray-400" />
    </button>
  );
}
