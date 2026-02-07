/**
 * NFTGallery Component
 * Display and manage NFT badge collection
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, 
  Share2, 
  ExternalLink, 
  Filter,
  Grid3X3,
  List,
  Search,
  Sparkles,
  Crown,
  Gem,
  Award
} from 'lucide-react';

interface NFTBadge {
  badgeId: string;
  tokenId: string;
  name: string;
  description: string;
  imageUrl: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  category: 'achievement' | 'referral' | 'milestone' | 'special';
  mintedAt: string;
  mintTxHash: string;
  transferable: boolean;
}

interface NFTGalleryProps {
  userId?: string;
  address?: string;
  editable?: boolean;
}

const RARITY_COLORS = {
  common: { bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-600', icon: Award },
  rare: { bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-600', icon: Trophy },
  epic: { bg: 'bg-purple-100', border: 'border-purple-300', text: 'text-purple-600', icon: Gem },
  legendary: { bg: 'bg-amber-100', border: 'border-amber-300', text: 'text-amber-600', icon: Crown }
};

const RARITY_MULTIPLIERS = {
  common: 1,
  rare: 2,
  epic: 5,
  legendary: 10
};

export const NFTGallery: React.FC<NFTGalleryProps> = ({ 
  userId, 
  address,
  editable = false 
}) => {
  const [badges, setBadges] = useState<NFTBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterRarity, setFilterRarity] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBadge, setSelectedBadge] = useState<NFTBadge | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    byRarity: {} as Record<string, number>,
    byCategory: {} as Record<string, number>,
    score: 0
  });

  useEffect(() => {
    fetchBadges();
  }, [userId, address]);

  const fetchBadges = async () => {
    try {
      setLoading(true);
      const targetAddress = address || userId;
      if (!targetAddress) return;

      const response = await fetch(
        `/api/nfts/user/${targetAddress}?${new URLSearchParams({
          ...(filterRarity !== 'all' && { rarity: filterRarity }),
          ...(filterCategory !== 'all' && { category: filterCategory })
        })}`
      );

      if (response.ok) {
        const data = await response.json();
        setBadges(data.data.badges || []);
        setStats(data.data.stats || { total: 0, byRarity: {}, byCategory: {}, score: 0 });
      }
    } catch (error) {
      console.error('Failed to fetch badges:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredBadges = badges.filter(badge => {
    const matchesSearch = badge.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         badge.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRarity = filterRarity === 'all' || badge.rarity === filterRarity;
    const matchesCategory = filterCategory === 'all' || badge.category === filterCategory;
    return matchesSearch && matchesRarity && matchesCategory;
  });

  const handleShare = async (badge: NFTBadge) => {
    const shareData = {
      title: `I earned the ${badge.name} badge on TRM!`,
      text: badge.description,
      url: `${window.location.origin}/nfts/${badge.badgeId}`
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.error('Share failed:', err);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(shareData.url);
    }
  };

  const calculateScore = () => {
    return badges.reduce((total, badge) => {
      return total + (RARITY_MULTIPLIERS[badge.rarity] || 1);
    }, 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Header */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {stats.total}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Total Badges</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-purple-600">
            {calculateScore()}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Collection Score</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-amber-600">
            {stats.byRarity.legendary || 0}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Legendary</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-purple-600">
            {stats.byRarity.epic || 0}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Epic</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search badges..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Rarity Filter */}
          <select
            value={filterRarity}
            onChange={(e) => setFilterRarity(e.target.value)}
            className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
          >
            <option value="all">All Rarities</option>
            <option value="common">Common</option>
            <option value="rare">Rare</option>
            <option value="epic">Epic</option>
            <option value="legendary">Legendary</option>
          </select>

          {/* Category Filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
          >
            <option value="all">All Categories</option>
            <option value="achievement">Achievement</option>
            <option value="referral">Referral</option>
            <option value="milestone">Milestone</option>
            <option value="special">Special</option>
          </select>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-2 border border-gray-200 dark:border-gray-700 rounded-lg p-1">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded ${viewMode === 'grid' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600' : 'text-gray-400'}`}
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded ${viewMode === 'list' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600' : 'text-gray-400'}`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Badges Display */}
      {filteredBadges.length === 0 ? (
        <div className="text-center py-16">
          <Trophy className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No badges yet
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Start earning badges by participating in the TRM ecosystem!
          </p>
        </div>
      ) : (
        <div className={viewMode === 'grid' 
          ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'
          : 'space-y-4'
        }>
          {filteredBadges.map((badge) => {
            const rarityStyle = RARITY_COLORS[badge.rarity];
            const Icon = rarityStyle.icon;

            return (
              <motion.div
                key={badge.badgeId}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.02 }}
                onClick={() => setSelectedBadge(badge)}
                className={`bg-white dark:bg-gray-800 rounded-xl border-2 ${rarityStyle.border} overflow-hidden cursor-pointer transition-shadow hover:shadow-lg ${
                  viewMode === 'list' ? 'flex items-center gap-4 p-4' : ''
                }`}
              >
                {/* Badge Image */}
                <div className={`${rarityStyle.bg} ${viewMode === 'list' ? 'w-24 h-24 rounded-lg' : 'aspect-square'} flex items-center justify-center relative`}>
                  {badge.imageUrl ? (
                    <img
                      src={badge.imageUrl}
                      alt={badge.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Icon className={`w-16 h-16 ${rarityStyle.text}`} />
                  )}
                  <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium ${rarityStyle.bg} ${rarityStyle.text} capitalize`}>
                    {badge.rarity}
                  </div>
                </div>

                {/* Badge Info */}
                <div className={`p-4 ${viewMode === 'list' ? 'flex-1' : ''}`}>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    {badge.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-2">
                    {badge.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400 capitalize">
                      {badge.category}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShare(badge);
                      }}
                      className="p-1.5 text-gray-400 hover:text-purple-600 transition-colors"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Badge Detail Modal */}
      <AnimatePresence>
        {selectedBadge && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedBadge(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold">{selectedBadge.name}</h3>
                  <button
                    onClick={() => handleShare(selectedBadge)}
                    className="p-2 hover:bg-gray-100 rounded-full"
                  >
                    <Share2 className="w-5 h-5" />
                  </button>
                </div>
                <img
                  src={selectedBadge.imageUrl}
                  alt={selectedBadge.name}
                  className="w-full h-48 object-contain mb-4"
                />
                <p className="text-gray-600 mb-4">{selectedBadge.description}</p>
                <div className="flex items-center gap-2 mb-4">
                  <span className={`px-3 py-1 rounded-full text-sm ${RARITY_COLORS[selectedBadge.rarity].bg} ${RARITY_COLORS[selectedBadge.rarity].text}`}>
                    {selectedBadge.rarity.charAt(0).toUpperCase() + selectedBadge.rarity.slice(1)}
                  </span>
                  <span className="px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-600">
                    {selectedBadge.category}
                  </span>
                </div>
                <p className="text-sm text-gray-500">
                  Minted: {new Date(selectedBadge.mintedAt).toLocaleDateString()}
                </p>
                {selectedBadge.transferable && (
                  <button className="w-full mt-4 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
                    Transfer NFT
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NFTGallery;
