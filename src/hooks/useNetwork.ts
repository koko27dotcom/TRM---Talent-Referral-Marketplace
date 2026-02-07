/**
 * useNetwork Hook
 * Custom hook for fetching and managing referral network data
 */

import { useState, useEffect, useCallback } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

interface NetworkMember {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  tierLevel: string;
  networkSize: number;
  joinedAt: string;
  depth?: number;
  earnings?: number;
}

interface NetworkStats {
  directReferrals: number;
  networkSize: number;
  networkEarnings: number;
  depthBreakdown: Record<string, number>;
}

interface NetworkData {
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    tierLevel: string;
    inviteCode: string;
  };
  stats: NetworkStats;
  directChildren: NetworkMember[];
}

interface UseNetworkReturn {
  networkData: NetworkData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useNetwork = (): UseNetworkReturn => {
  const [networkData, setNetworkData] = useState<NetworkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getAuthToken = () => localStorage.getItem('token');

  const fetchNetworkData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = getAuthToken();
      if (!token) {
        throw new Error('Please log in to view your network');
      }

      const response = await fetch(`${API_BASE_URL}/referrals/network`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch network data');
      }

      const data = await response.json();
      if (data.success && data.data) {
        setNetworkData(data.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load network data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNetworkData();
  }, [fetchNetworkData]);

  return {
    networkData,
    loading,
    error,
    refetch: fetchNetworkData
  };
};

export default useNetwork;
