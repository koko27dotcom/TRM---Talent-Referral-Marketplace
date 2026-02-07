/**
 * useTier Hook
 * Custom hook for managing tier progress and benefits
 */

import { useState, useEffect, useCallback } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

interface TierBenefit {
  type: string;
  name: string;
  description: string;
  icon: string;
  numericValue?: number;
  unlocked: boolean;
}

interface TierCommission {
  basePercent: number;
  networkPercent: {
    level1: number;
    level2: number;
    level3: number;
    level4Plus: number;
  };
}

interface TierPayout {
  minPayoutAmount: number;
  processingDays: number;
  maxPayoutAmount: number;
}

interface CurrentTier {
  tier: string;
  name: string;
  level: number;
  color: string;
  gradient: { from: string; to: string };
  icon: string;
  benefits: TierBenefit[];
  commission: TierCommission;
  payout: TierPayout;
}

interface NextTierRequirements {
  minDirectReferrals: number;
  minNetworkSize: number;
  minEarnings: number;
  minSuccessfulHires: number;
}

interface NextTier {
  tier: string;
  name: string;
  requirements: NextTierRequirements;
}

interface TierStats {
  directReferrals: number;
  networkSize: number;
  totalEarnings: number;
  successfulHires: number;
}

interface TierInfo {
  current: CurrentTier;
  next: NextTier | null;
  progress: number;
  stats: TierStats;
}

interface UseTierReturn {
  tierInfo: TierInfo | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  checkUpgrade: () => Promise<{ upgraded: boolean; newTier?: string }>;
}

export const useTier = (): UseTierReturn => {
  const [tierInfo, setTierInfo] = useState<TierInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getAuthToken = () => localStorage.getItem('token');

  const fetchTierInfo = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = getAuthToken();
      if (!token) {
        throw new Error('Please log in to view tier information');
      }

      const response = await fetch(`${API_BASE_URL}/referrals/tier`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch tier information');
      }

      const data = await response.json();
      if (data.success && data.data) {
        setTierInfo(data.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tier information');
    } finally {
      setLoading(false);
    }
  }, []);

  const checkUpgrade = useCallback(async (): Promise<{ upgraded: boolean; newTier?: string }> => {
    try {
      const token = getAuthToken();
      if (!token) {
        return { upgraded: false };
      }

      const response = await fetch(`${API_BASE_URL}/referrals/tier/check-upgrade`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success && data.data?.upgraded) {
        await fetchTierInfo();
        return { upgraded: true, newTier: data.data.newTier };
      }

      return { upgraded: false };
    } catch (error) {
      console.error('Error checking tier upgrade:', error);
      return { upgraded: false };
    }
  }, [fetchTierInfo]);

  useEffect(() => {
    fetchTierInfo();
  }, [fetchTierInfo]);

  return {
    tierInfo,
    loading,
    error,
    refetch: fetchTierInfo,
    checkUpgrade
  };
};

export default useTier;
