/**
 * useWhatsApp Hook
 * Custom hook for WhatsApp Business API integration
 */

import { useState, useEffect, useCallback } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

interface WhatsAppOptInStatus {
  optedIn: boolean;
  phoneNumber: string | null;
  optedInAt: string | null;
  language: string;
}

interface WhatsAppSession {
  id: string;
  status: string;
  phoneNumber: string;
  lastActivityAt: string;
  messageCount: number;
}

interface UseWhatsAppReturn {
  optInStatus: WhatsAppOptInStatus | null;
  sessions: WhatsAppSession[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  optIn: (phoneNumber: string) => Promise<boolean>;
  optOut: () => Promise<boolean>;
  updateLanguage: (language: 'my' | 'en') => Promise<boolean>;
}

export const useWhatsApp = (): UseWhatsAppReturn => {
  const [optInStatus, setOptInStatus] = useState<WhatsAppOptInStatus | null>(null);
  const [sessions, setSessions] = useState<WhatsAppSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getAuthToken = () => localStorage.getItem('token');

  const fetchOptInStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = getAuthToken();
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/whatsapp/opt-in-status`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.data) {
          setOptInStatus(data.data);
        }
      }
    } catch (err) {
      console.error('Error fetching WhatsApp opt-in status:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSessions = useCallback(async () => {
    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/whatsapp/sessions`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.data?.sessions) {
          setSessions(data.data.sessions);
        }
      }
    } catch (err) {
      console.error('Error fetching WhatsApp sessions:', err);
    }
  }, []);

  const optIn = useCallback(async (phoneNumber: string): Promise<boolean> => {
    try {
      const token = getAuthToken();
      if (!token) {
        setError('Please log in to opt in to WhatsApp');
        return false;
      }

      const response = await fetch(`${API_BASE_URL}/whatsapp/opt-in`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ phoneNumber })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        await fetchOptInStatus();
        return true;
      } else {
        setError(data.message || 'Failed to opt in');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to opt in');
      return false;
    }
  }, [fetchOptInStatus]);

  const optOut = useCallback(async (): Promise<boolean> => {
    try {
      const token = getAuthToken();
      if (!token) {
        setError('Please log in to opt out');
        return false;
      }

      const response = await fetch(`${API_BASE_URL}/whatsapp/opt-out`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (response.ok && data.success) {
        await fetchOptInStatus();
        return true;
      } else {
        setError(data.message || 'Failed to opt out');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to opt out');
      return false;
    }
  }, [fetchOptInStatus]);

  const updateLanguage = useCallback(async (language: 'my' | 'en'): Promise<boolean> => {
    try {
      const token = getAuthToken();
      if (!token) {
        setError('Please log in to update language');
        return false;
      }

      const response = await fetch(`${API_BASE_URL}/whatsapp/language`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ language })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        await fetchOptInStatus();
        return true;
      } else {
        setError(data.message || 'Failed to update language');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update language');
      return false;
    }
  }, [fetchOptInStatus]);

  useEffect(() => {
    fetchOptInStatus();
    fetchSessions();
  }, [fetchOptInStatus, fetchSessions]);

  return {
    optInStatus,
    sessions,
    loading,
    error,
    refetch: async () => {
      await fetchOptInStatus();
      await fetchSessions();
    },
    optIn,
    optOut,
    updateLanguage
  };
};

export default useWhatsApp;
