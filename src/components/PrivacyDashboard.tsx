/**
 * PrivacyDashboard Component
 * User privacy controls and data management
 */

import { useState, useEffect } from 'react';
import { 
  Eye, 
  Download, 
  Trash2, 
  Shield, 
  FileText, 
  Bell, 
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  ChevronRight,
  Loader2
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

interface ConsentStatus {
  marketing: boolean;
  analytics: boolean;
  thirdParty: boolean;
  lastUpdated: string;
}

interface DataExportRequest {
  _id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
  metadata: {
    format: string;
    dataTypes: string[];
  };
}

interface PrivacyDataSummary {
  profile: Record<string, unknown>;
  applications: number;
  referrals: number;
  payouts: number;
  auditLogs: number;
  notifications: number;
  consentHistory: Array<{
    type: string;
    granted: boolean;
    timestamp: string;
  }>;
}

const PrivacyDashboard = () => {
  const [consent, setConsent] = useState<ConsentStatus>({
    marketing: false,
    analytics: true,
    thirdParty: false,
    lastUpdated: '',
  });
  const [exportRequests, setExportRequests] = useState<DataExportRequest[]>([]);
  const [privacyData, setPrivacyData] = useState<PrivacyDataSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchPrivacyData();
  }, []);

  const fetchPrivacyData = async () => {
    try {
      setLoading(true);
      const [consentRes, exportsRes, dataRes] = await Promise.all([
        fetch(`${API_BASE_URL}/compliance/consent`, { credentials: 'include' }),
        fetch(`${API_BASE_URL}/compliance/data-export/requests`, { credentials: 'include' }),
        fetch(`${API_BASE_URL}/compliance/privacy-data`, { credentials: 'include' }),
      ]);

      const consentData = await consentRes.json();
      const exportsData = await exportsRes.json();
      const privacyDataResult = await dataRes.json();

      setConsent(consentData.data || consent);
      setExportRequests(exportsData.data || []);
      setPrivacyData(privacyDataResult.data);
    } catch (error) {
      console.error('Failed to fetch privacy data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConsentChange = async (type: keyof ConsentStatus, value: boolean) => {
    try {
      const response = await fetch(`${API_BASE_URL}/compliance/consent`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [type]: value }),
      });

      if (response.ok) {
        setConsent(prev => ({ ...prev, [type]: value, lastUpdated: new Date().toISOString() }));
        setMessage({ type: 'success', text: 'Consent preference updated' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update consent' });
    }
  };

  const handleDataExport = async (format: 'json' | 'csv' | 'xml') => {
    try {
      setExporting(true);
      const response = await fetch(`${API_BASE_URL}/compliance/data-export`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format, dataTypes: ['all'] }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Data export request submitted. You will be notified when ready.' });
        fetchPrivacyData();
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to request data export' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to request data export' });
    } finally {
      setExporting(false);
    }
  };

  const handleWithdrawConsent = async () => {
    if (!window.confirm('Are you sure you want to withdraw all consent? This may limit your use of the platform.')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/compliance/consent/withdraw`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'User requested' }),
      });

      if (response.ok) {
        setConsent({ marketing: false, analytics: false, thirdParty: false, lastUpdated: new Date().toISOString() });
        setMessage({ type: 'success', text: 'All consent withdrawn successfully' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to withdraw consent' });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'pending':
      case 'processing':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return null;
    }
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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Privacy Dashboard</h1>

      {message && (
        <div
          className={`mb-4 p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Data Overview */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Eye className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Your Data</h2>
            <p className="text-sm text-gray-500">Overview of data we hold about you</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg text-center">
            <p className="text-2xl font-bold text-gray-900">{privacyData?.applications || 0}</p>
            <p className="text-sm text-gray-500">Applications</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg text-center">
            <p className="text-2xl font-bold text-gray-900">{privacyData?.referrals || 0}</p>
            <p className="text-sm text-gray-500">Referrals</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg text-center">
            <p className="text-2xl font-bold text-gray-900">{privacyData?.payouts || 0}</p>
            <p className="text-sm text-gray-500">Payouts</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg text-center">
            <p className="text-2xl font-bold text-gray-900">{privacyData?.auditLogs || 0}</p>
            <p className="text-sm text-gray-500">Activity Logs</p>
          </div>
        </div>
      </div>

      {/* Consent Management */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Shield className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Consent Preferences</h2>
            <p className="text-sm text-gray-500">Manage how we use your data</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">Marketing Communications</p>
              <p className="text-sm text-gray-500">Receive promotional emails and offers</p>
            </div>
            <button
              onClick={() => handleConsentChange('marketing', !consent.marketing)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                consent.marketing ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  consent.marketing ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">Analytics</p>
              <p className="text-sm text-gray-500">Help us improve by sharing usage data</p>
            </div>
            <button
              onClick={() => handleConsentChange('analytics', !consent.analytics)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                consent.analytics ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  consent.analytics ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">Third-Party Sharing</p>
              <p className="text-sm text-gray-500">Share data with trusted partners</p>
            </div>
            <button
              onClick={() => handleConsentChange('thirdParty', !consent.thirdParty)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                consent.thirdParty ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  consent.thirdParty ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={handleWithdrawConsent}
            className="text-red-600 text-sm hover:underline"
          >
            Withdraw all consent
          </button>
          <p className="text-xs text-gray-500 mt-1">
            Last updated: {consent.lastUpdated ? formatDate(consent.lastUpdated) : 'Never'}
          </p>
        </div>
      </div>

      {/* Data Export */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-green-100 rounded-lg">
            <Download className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Data Export</h2>
            <p className="text-sm text-gray-500">Download a copy of your data</p>
          </div>
        </div>

        <div className="flex gap-3 mb-6">
          <button
            onClick={() => handleDataExport('json')}
            disabled={exporting}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Export as JSON'}
          </button>
          <button
            onClick={() => handleDataExport('csv')}
            disabled={exporting}
            className="px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Export as CSV
          </button>
        </div>

        {exportRequests.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Recent Export Requests</h3>
            <div className="space-y-2">
              {exportRequests.slice(0, 5).map((request) => (
                <div
                  key={request._id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(request.status)}
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {request.metadata.format.toUpperCase()} Export
                      </p>
                      <p className="text-xs text-gray-500">{formatDate(request.createdAt)}</p>
                    </div>
                  </div>
                  {request.status === 'completed' && (
                    <a
                      href={`${API_BASE_URL}/compliance/data-export/${request._id}/download`}
                      className="text-blue-600 text-sm hover:underline"
                    >
                      Download
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right to be Forgotten */}
      <div className="bg-white rounded-lg shadow-sm border border-red-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-red-100 rounded-lg">
            <Trash2 className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Delete Account</h2>
            <p className="text-sm text-gray-500">Request deletion of your account and data</p>
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">Warning</p>
              <p className="text-sm text-red-700 mt-1">
                This action cannot be undone. Your account and all associated data will be permanently deleted within 30 days.
              </p>
            </div>
          </div>
        </div>

        <a
          href="/privacy/delete-account"
          className="inline-flex items-center px-4 py-2 border border-red-600 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
        >
          Request Account Deletion
          <ChevronRight className="w-4 h-4 ml-2" />
        </a>
      </div>
    </div>
  );
};

export default PrivacyDashboard;
