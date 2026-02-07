/**
 * SecuritySettings Component
 * User security settings management
 */

import { useState, useEffect } from 'react';
import { Shield, Smartphone, Bell, Lock, Globe, LogOut, AlertTriangle, Loader2 } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

interface Session {
  _id: string;
  timestamp: string;
  source: {
    ip: string;
    userAgent: string;
  };
  metadata?: {
    sessionId?: string;
  };
}

interface SecuritySettingsData {
  twoFactorEnabled: boolean;
  loginNotifications: boolean;
  passwordLastChanged: string;
}

const SecuritySettings = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [settings, setSettings] = useState<SecuritySettingsData>({
    twoFactorEnabled: false,
    loginNotifications: true,
    passwordLastChanged: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [sessionsRes, settingsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/security/sessions`, { credentials: 'include' }),
        fetch(`${API_BASE_URL}/users/security-settings`, { credentials: 'include' }),
      ]);
      
      const sessionsData = await sessionsRes.json();
      const settingsData = await settingsRes.json();
      
      setSessions(sessionsData.data || []);
      setSettings(settingsData.data || settings);
    } catch (error) {
      console.error('Failed to fetch security data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle2FA = async () => {
    try {
      setSaving(true);
      await fetch(`${API_BASE_URL}/auth/2fa/toggle`, {
        method: 'POST',
        credentials: 'include',
      });
      setSettings(prev => ({ ...prev, twoFactorEnabled: !prev.twoFactorEnabled }));
      setMessage({ type: 'success', text: 'Two-factor authentication updated' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update 2FA settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleNotifications = async () => {
    try {
      setSaving(true);
      await fetch(`${API_BASE_URL}/users/security-settings`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginNotifications: !settings.loginNotifications }),
      });
      setSettings(prev => ({ ...prev, loginNotifications: !prev.loginNotifications }));
      setMessage({ type: 'success', text: 'Notification settings updated' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update notification settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      await fetch(`${API_BASE_URL}/security/sessions/${sessionId}/revoke`, {
        method: 'POST',
        credentials: 'include',
      });
      setSessions(prev => prev.filter(s => s._id !== sessionId));
      setMessage({ type: 'success', text: 'Session revoked successfully' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to revoke session' });
    }
  };

  const handleRevokeAllSessions = async () => {
    if (!window.confirm('Are you sure you want to revoke all other sessions?')) return;
    
    try {
      await fetch(`${API_BASE_URL}/security/sessions/revoke-all`, {
        method: 'POST',
        credentials: 'include',
      });
      setSessions([]);
      setMessage({ type: 'success', text: 'All other sessions revoked' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to revoke sessions' });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Security Settings</h1>

      {message && (
        <div
          className={`mb-4 p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Two-Factor Authentication */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Smartphone className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Two-Factor Authentication</h2>
              <p className="text-sm text-gray-500 mt-1">
                Add an extra layer of security to your account
              </p>
            </div>
          </div>
          <button
            onClick={handleToggle2FA}
            disabled={saving}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              settings.twoFactorEnabled
                ? 'bg-green-100 text-green-800 hover:bg-green-200'
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            }`}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : settings.twoFactorEnabled ? 'Enabled' : 'Disabled'}
          </button>
        </div>
      </div>

      {/* Login Notifications */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Bell className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Login Notifications</h2>
              <p className="text-sm text-gray-500 mt-1">
                Get notified when someone logs into your account
              </p>
            </div>
          </div>
          <button
            onClick={handleToggleNotifications}
            disabled={saving}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.loginNotifications ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.loginNotifications ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Password */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Lock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Password</h2>
              <p className="text-sm text-gray-500 mt-1">
                Last changed: {settings.passwordLastChanged ? formatDate(settings.passwordLastChanged) : 'Never'}
              </p>
            </div>
          </div>
          <a
            href="/change-password"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Change Password
          </a>
        </div>
      </div>

      {/* Active Sessions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Globe className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Active Sessions</h2>
              <p className="text-sm text-gray-500 mt-1">
                Manage devices where you're currently logged in
              </p>
            </div>
          </div>
          {sessions.length > 0 && (
            <button
              onClick={handleRevokeAllSessions}
              className="px-4 py-2 text-red-600 border border-red-600 rounded-lg hover:bg-red-50 transition-colors"
            >
              Revoke All
            </button>
          )}
        </div>

        <div className="space-y-3">
          {sessions.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No active sessions</p>
          ) : (
            sessions.map((session) => (
              <div
                key={session._id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="font-medium text-gray-900">
                    {session.source?.userAgent?.split(' ')[0] || 'Unknown Device'}
                  </p>
                  <p className="text-sm text-gray-500">
                    IP: {session.source?.ip || 'Unknown'} • {formatDate(session.timestamp)}
                  </p>
                </div>
                <button
                  onClick={() => handleRevokeSession(session._id)}
                  className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
                >
                  Revoke
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default SecuritySettings;
