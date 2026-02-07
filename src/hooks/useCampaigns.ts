/**
 * useCampaigns Hook
 * Custom hook for email campaign management
 */

import { useState, useEffect, useCallback } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

interface EmailCampaign {
  _id: string;
  name: string;
  type: 'broadcast' | 'triggered' | 'drip';
  subject: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused';
  recipientCount: number;
  sentCount: number;
  openCount: number;
  clickCount: number;
  scheduledAt?: string;
  sentAt?: string;
  createdAt: string;
}

interface CampaignStats {
  total: number;
  draft: number;
  scheduled: number;
  sending: number;
  sent: number;
  paused: number;
}

interface CreateCampaignData {
  name: string;
  type: 'broadcast' | 'triggered' | 'drip';
  subject: string;
  htmlContent: string;
  segmentId?: string;
  scheduledAt?: string;
}

interface UseCampaignsReturn {
  campaigns: EmailCampaign[];
  stats: CampaignStats | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createCampaign: (data: CreateCampaignData) => Promise<EmailCampaign | null>;
  updateCampaign: (id: string, data: Partial<CreateCampaignData>) => Promise<boolean>;
  deleteCampaign: (id: string) => Promise<boolean>;
  sendCampaign: (id: string) => Promise<boolean>;
  scheduleCampaign: (id: string, scheduledAt: string) => Promise<boolean>;
  pauseCampaign: (id: string) => Promise<boolean>;
  resumeCampaign: (id: string) => Promise<boolean>;
  duplicateCampaign: (id: string) => Promise<EmailCampaign | null>;
}

export const useCampaigns = (): UseCampaignsReturn => {
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getAuthToken = () => localStorage.getItem('token');

  const fetchCampaigns = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = getAuthToken();
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/email/campaigns`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.data?.campaigns) {
          setCampaigns(data.data.campaigns);
        }
        if (data.data?.stats) {
          setStats(data.data.stats);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  }, []);

  const createCampaign = useCallback(async (campaignData: CreateCampaignData): Promise<EmailCampaign | null> => {
    try {
      const token = getAuthToken();
      if (!token) {
        setError('Please log in to create campaigns');
        return null;
      }

      const response = await fetch(`${API_BASE_URL}/email/campaigns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(campaignData)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        await fetchCampaigns();
        return data.data;
      } else {
        setError(data.message || 'Failed to create campaign');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create campaign');
      return null;
    }
  }, [fetchCampaigns]);

  const updateCampaign = useCallback(async (id: string, data: Partial<CreateCampaignData>): Promise<boolean> => {
    try {
      const token = getAuthToken();
      if (!token) {
        setError('Please log in to update campaigns');
        return false;
      }

      const response = await fetch(`${API_BASE_URL}/email/campaigns/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (response.ok && result.success) {
        await fetchCampaigns();
        return true;
      } else {
        setError(result.message || 'Failed to update campaign');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update campaign');
      return false;
    }
  }, [fetchCampaigns]);

  const deleteCampaign = useCallback(async (id: string): Promise<boolean> => {
    try {
      const token = getAuthToken();
      if (!token) {
        setError('Please log in to delete campaigns');
        return false;
      }

      const response = await fetch(`${API_BASE_URL}/email/campaigns/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();

      if (response.ok && result.success) {
        await fetchCampaigns();
        return true;
      } else {
        setError(result.message || 'Failed to delete campaign');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete campaign');
      return false;
    }
  }, [fetchCampaigns]);

  const sendCampaign = useCallback(async (id: string): Promise<boolean> => {
    try {
      const token = getAuthToken();
      if (!token) {
        setError('Please log in to send campaigns');
        return false;
      }

      const response = await fetch(`${API_BASE_URL}/email/campaigns/${id}/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();

      if (response.ok && result.success) {
        await fetchCampaigns();
        return true;
      } else {
        setError(result.message || 'Failed to send campaign');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send campaign');
      return false;
    }
  }, [fetchCampaigns]);

  const scheduleCampaign = useCallback(async (id: string, scheduledAt: string): Promise<boolean> => {
    try {
      const token = getAuthToken();
      if (!token) {
        setError('Please log in to schedule campaigns');
        return false;
      }

      const response = await fetch(`${API_BASE_URL}/email/campaigns/${id}/schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ scheduledAt })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        await fetchCampaigns();
        return true;
      } else {
        setError(result.message || 'Failed to schedule campaign');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to schedule campaign');
      return false;
    }
  }, [fetchCampaigns]);

  const pauseCampaign = useCallback(async (id: string): Promise<boolean> => {
    try {
      const token = getAuthToken();
      if (!token) {
        setError('Please log in to pause campaigns');
        return false;
      }

      const response = await fetch(`${API_BASE_URL}/email/campaigns/${id}/pause`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();

      if (response.ok && result.success) {
        await fetchCampaigns();
        return true;
      } else {
        setError(result.message || 'Failed to pause campaign');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to pause campaign');
      return false;
    }
  }, [fetchCampaigns]);

  const resumeCampaign = useCallback(async (id: string): Promise<boolean> => {
    try {
      const token = getAuthToken();
      if (!token) {
        setError('Please log in to resume campaigns');
        return false;
      }

      const response = await fetch(`${API_BASE_URL}/email/campaigns/${id}/resume`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();

      if (response.ok && result.success) {
        await fetchCampaigns();
        return true;
      } else {
        setError(result.message || 'Failed to resume campaign');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resume campaign');
      return false;
    }
  }, [fetchCampaigns]);

  const duplicateCampaign = useCallback(async (id: string): Promise<EmailCampaign | null> => {
    try {
      const token = getAuthToken();
      if (!token) {
        setError('Please log in to duplicate campaigns');
        return null;
      }

      const response = await fetch(`${API_BASE_URL}/email/campaigns/${id}/duplicate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();

      if (response.ok && result.success) {
        await fetchCampaigns();
        return result.data;
      } else {
        setError(result.message || 'Failed to duplicate campaign');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to duplicate campaign');
      return null;
    }
  }, [fetchCampaigns]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  return {
    campaigns,
    stats,
    loading,
    error,
    refetch: fetchCampaigns,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    sendCampaign,
    scheduleCampaign,
    pauseCampaign,
    resumeCampaign,
    duplicateCampaign
  };
};

export default useCampaigns;
