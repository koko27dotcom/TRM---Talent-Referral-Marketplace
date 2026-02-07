/**
 * useInvite Hook
 * Custom hook for managing invite links and codes
 */

import { useState, useEffect, useCallback } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

interface InviteData {
  inviteCode: string;
  inviteUrl: string;
  shareLinks: {
    whatsapp: string;
    facebook: string;
    telegram: string;
    copy: string;
  };
}

interface InviteStats {
  totalInvited: number;
  joined: number;
  earnings: number;
}

interface UseInviteReturn {
  inviteData: InviteData | null;
  stats: InviteStats;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  validateInviteCode: (code: string) => Promise<{ valid: boolean; inviterName?: string }>;
}

export const useInvite = (): UseInviteReturn => {
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [stats, setStats] = useState<InviteStats>({
    totalInvited: 0,
    joined: 0,
    earnings: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getAuthToken = () => localStorage.getItem('token');

  const fetchInviteData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = getAuthToken();
      if (!token) {
        throw new Error('Please log in to generate invite links');
      }

      const response = await fetch(`${API_BASE_URL}/referrals/invite`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch invite data');
      }

      const data = await response.json();
      if (data.success && data.data) {
        setInviteData(data.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invite data');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/referrals/network`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setStats({
            totalInvited: data.data.stats?.directReferrals || 0,
            joined: data.data.stats?.networkSize || 0,
            earnings: data.data.stats?.networkEarnings || 0
          });
        }
      }
    } catch (error) {
      console.error('Error fetching invite stats:', error);
    }
  }, []);

  const validateInviteCode = useCallback(async (code: string): Promise<{ valid: boolean; inviterName?: string }> => {
    try {
      const response = await fetch(`${API_BASE_URL}/referrals/invite/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ inviteCode: code })
      });

      const data = await response.json();
      return {
        valid: data.success && data.data?.valid,
        inviterName: data.data?.inviterName
      };
    } catch (error) {
      console.error('Error validating invite code:', error);
      return { valid: false };
    }
  }, []);

  useEffect(() => {
    fetchInviteData();
    fetchStats();
  }, [fetchInviteData, fetchStats]);

  return {
    inviteData,
    stats,
    loading,
    error,
    refetch: fetchInviteData,
    validateInviteCode
  };
};

export default useInvite;
