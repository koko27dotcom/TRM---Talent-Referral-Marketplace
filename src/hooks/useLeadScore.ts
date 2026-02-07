/**
 * useLeadScore Hook
 * Custom hook for lead scoring data and operations
 */

import { useState, useEffect, useCallback } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

interface ScoreFactors {
  profileCompleteness: number;
  experienceMatch: number;
  skillsMatch: number;
  referrerQuality: number;
  pastSuccessRate: number;
  engagementScore: number;
  whatsappEngagement: number;
}

interface ScoreHistory {
  score: number;
  factors: ScoreFactors;
  calculatedAt: string;
  reason: string;
}

interface LeadScore {
  entityType: 'candidate' | 'company';
  entityId: string;
  score: number;
  factors: ScoreFactors;
  conversionProbability: number;
  estimatedValue: number;
  priorityRank: number;
  salesStage: string;
  assignedTo: string | null;
  history: ScoreHistory[];
  lastCalculatedAt: string;
  nextRecalculationAt: string;
}

interface LeadScoreDashboard {
  totalCandidates: number;
  totalCompanies: number;
  averageCandidateScore: number;
  averageCompanyScore: number;
  highPriorityCandidates: number;
  highPriorityCompanies: number;
  recentConversions: number;
  scoreDistribution: {
    range: string;
    count: number;
  }[];
}

interface UseLeadScoreReturn {
  leadScore: LeadScore | null;
  dashboard: LeadScoreDashboard | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  getCandidateScore: (candidateId: string, refresh?: boolean) => Promise<LeadScore | null>;
  getCompanyScore: (companyId: string, refresh?: boolean) => Promise<LeadScore | null>;
  getPrioritizedCompanies: (options?: { limit?: number; minScore?: number }) => Promise<any[]>;
}

export const useLeadScore = (): UseLeadScoreReturn => {
  const [leadScore, setLeadScore] = useState<LeadScore | null>(null);
  const [dashboard, setDashboard] = useState<LeadScoreDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getAuthToken = () => localStorage.getItem('token');

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = getAuthToken();
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/leads/dashboard`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.data) {
          setDashboard(data.data);
        }
      }
    } catch (err) {
      console.error('Error fetching lead score dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const getCandidateScore = useCallback(async (candidateId: string, refresh = false): Promise<LeadScore | null> => {
    try {
      const token = getAuthToken();
      if (!token) return null;

      const response = await fetch(`${API_BASE_URL}/leads/candidates/${candidateId}/score?refresh=${refresh}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.data) {
          setLeadScore(data.data);
          return data.data;
        }
      }
      return null;
    } catch (err) {
      console.error('Error fetching candidate score:', err);
      return null;
    }
  }, []);

  const getCompanyScore = useCallback(async (companyId: string, refresh = false): Promise<LeadScore | null> => {
    try {
      const token = getAuthToken();
      if (!token) return null;

      const response = await fetch(`${API_BASE_URL}/leads/companies/${companyId}/score?refresh=${refresh}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.data) {
          setLeadScore(data.data);
          return data.data;
        }
      }
      return null;
    } catch (err) {
      console.error('Error fetching company score:', err);
      return null;
    }
  }, []);

  const getPrioritizedCompanies = useCallback(async (options: { limit?: number; minScore?: number } = {}): Promise<any[]> => {
    try {
      const token = getAuthToken();
      if (!token) return [];

      const queryParams = new URLSearchParams();
      if (options.limit) queryParams.append('limit', options.limit.toString());
      if (options.minScore) queryParams.append('minScore', options.minScore.toString());

      const response = await fetch(`${API_BASE_URL}/leads/companies/priority?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        return data.data?.companies || [];
      }
      return [];
    } catch (err) {
      console.error('Error fetching prioritized companies:', err);
      return [];
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return {
    leadScore,
    dashboard,
    loading,
    error,
    refetch: fetchDashboard,
    getCandidateScore,
    getCompanyScore,
    getPrioritizedCompanies
  };
};

export default useLeadScore;
