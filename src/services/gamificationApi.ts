import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const gamificationApi = {
  // Profile
  getProfile: () => api.get('/gamification/profile'),
  getStats: () => api.get('/gamification/stats'),
  
  // Points
  getPointsHistory: (params?: { limit?: number; skip?: number; startDate?: string; endDate?: string }) =>
    api.get('/gamification/points-history', { params }),
  
  // Badges
  getBadges: (params?: { category?: string; rarity?: string }) =>
    api.get('/gamification/badges', { params }),
  getMyBadges: () => api.get('/gamification/my-badges'),
  getBadgeCollection: () => api.get('/gamification/badge-collection'),
  markBadgeViewed: (badgeId: string) => api.post(`/gamification/badges/${badgeId}/view`),
  
  // Achievements
  getAchievements: (params?: { category?: string }) =>
    api.get('/gamification/achievements', { params }),
  getMyAchievements: () => api.get('/gamification/my-achievements'),
  
  // Loot Box
  claimLootBox: () => api.post('/gamification/claim-lootbox'),
  
  // Levels
  getLevels: () => api.get('/gamification/levels'),
  
  // Activity
  getActivity: (params?: { limit?: number; skip?: number }) =>
    api.get('/gamification/activity', { params }),
  getHeatmap: (params?: { days?: number }) =>
    api.get('/gamification/heatmap', { params }),
  getStreak: () => api.get('/gamification/streak'),
};

export const leaderboardApi = {
  getLeaderboard: (period: string, category: string, params?: { limit?: number; skip?: number }) =>
    api.get(`/leaderboards/${period}/${category}`, { params }),
  
  getTopPerformers: (params?: { period?: string; top?: number }) =>
    api.get('/leaderboards/top', { params }),
  
  getMyRank: (params?: { period?: string }) =>
    api.get('/leaderboards/my-rank', { params }),
  
  getMyRankContext: (period: string, category: string, params?: { context?: number }) =>
    api.get(`/leaderboards/my-rank/${period}/${category}`, { params }),
  
  claimReward: (period: string, category: string) =>
    api.post('/leaderboards/claim-reward', { period, category }),
  
  getSummary: () => api.get('/leaderboards/summary'),
};

export const challengesApi = {
  getChallenges: (params?: { type?: string; difficulty?: string }) =>
    api.get('/challenges', { params }),
  
  getChallenge: (id: string) => api.get(`/challenges/${id}`),
  
  joinChallenge: (id: string) => api.post(`/challenges/${id}/join`),
  
  getMyProgress: () => api.get('/challenges/my-progress'),
  
  claimReward: (id: string) => api.post(`/challenges/${id}/claim`),
  
  getRecommendations: (params?: { limit?: number }) =>
    api.get('/challenges/recommendations', { params }),
};

export default gamificationApi;
