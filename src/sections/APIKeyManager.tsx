import React, { useState, useEffect } from 'react';
import { 
  Key, 
  Plus, 
  Copy, 
  Trash2, 
  RefreshCw, 
  Eye, 
  EyeOff,
  Check,
  AlertCircle,
  Calendar,
  Shield
} from 'lucide-react';
import axios from 'axios';

interface APIKey {
  id: string;
  name: string;
  description?: string;
  keyPreview: string;
  permissions: string[];
  environment: string;
  isActive: boolean;
  createdAt: string;
  lastUsedAt?: string;
  usage: {
    totalRequests: number;
    requestsThisMonth: number;
  };
}

const APIKeyManager: React.FC = () => {
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchAPIKeys();
  }, []);

  const fetchAPIKeys = async () => {
    try {
      const response = await axios.get('/api/v1/auth/apikeys');
      setApiKeys(response.data.data);
    } catch (error) {
      console.error('Error fetching API keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKey = async (keyData: any) => {
    try {
      const response = await axios.post('/api/v1/auth/apikey', keyData);
      setNewKey(response.data.data.key);
      fetchAPIKeys();
    } catch (error) {
      console.error('Error creating API key:', error);
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
      return;
    }

    try {
      await axios.delete(`/api/v1/auth/apikeys/${keyId}`);
      fetchAPIKeys();
    } catch (error) {
      console.error('Error revoking API key:', error);
    }
  };

  const handleRotateKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to rotate this API key? The old key will stop working immediately.')) {
      return;
    }

    try {
      const response = await axios.post(`/api/v1/auth/apikeys/${keyId}/rotate`);
      setNewKey(response.data.data.key);
      fetchAPIKeys();
    } catch (error) {
      console.error('Error rotating API key:', error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">API Keys</h2>
          <p className="text-gray-600 mt-1">
            Manage your API keys for accessing the TRM API
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          Generate New Key
        </button>
      </div>

      {/* Security Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-blue-900">Security Best Practices</h3>
            <ul className="mt-1 text-sm text-blue-800 list-disc list-inside space-y-1">
              <li>Store API keys securely and never expose them in client-side code</li>
              <li>Use environment variables for API keys in your applications</li>
              <li>Rotate keys regularly and revoke unused keys</li>
              <li>Use the minimum permissions required for your use case</li>
            </ul>
          </div>
        </div>
      </div>

      {/* API Keys List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {apiKeys.length === 0 ? (
          <div className="p-12 text-center">
            <Key className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No API Keys</h3>
            <p className="text-gray-600 mb-4">
              You haven't created any API keys yet. Generate one to start using the API.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-5 h-5 mr-2" />
              Generate Your First Key
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {apiKeys.map((key) => (
              <APIKeyItem
                key={key.id}
                apiKey={key}
                onRevoke={() => handleRevokeKey(key.id)}
                onRotate={() => handleRotateKey(key.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <CreateKeyModal
          onClose={() => {
            setShowCreateModal(false);
            setNewKey(null);
          }}
          onCreate={handleCreateKey}
          newKey={newKey}
          onCopy={() => copyToClipboard(newKey || '')}
          copied={copied}
        />
      )}
    </div>
  );
};

interface APIKeyItemProps {
  apiKey: APIKey;
  onRevoke: () => void;
  onRotate: () => void;
}

const APIKeyItem: React.FC<APIKeyItemProps> = ({ apiKey, onRevoke, onRotate }) => {
  const [showPermissions, setShowPermissions] = useState(false);

  return (
    <div className="p-6 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3">
            <h3 className="text-lg font-semibold text-gray-900">{apiKey.name}</h3>
            <span className={`
              px-2 py-1 text-xs font-medium rounded-full
              ${apiKey.environment === 'production' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-yellow-100 text-yellow-800'}
            `}>
              {apiKey.environment}
            </span>
            {!apiKey.isActive && (
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                Revoked
              </span>
            )}
          </div>
          
          {apiKey.description && (
            <p className="text-gray-600 mt-1">{apiKey.description}</p>
          )}

          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
            <code className="bg-gray-100 px-2 py-1 rounded">{apiKey.keyPreview}</code>
            <span>•</span>
            <span>{apiKey.usage.totalRequests.toLocaleString()} total requests</span>
            <span>•</span>
            <span>{apiKey.usage.requestsThisMonth.toLocaleString()} this month</span>
          </div>

          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
            <span className="flex items-center">
              <Calendar className="w-4 h-4 mr-1" />
              Created {new Date(apiKey.createdAt).toLocaleDateString()}
            </span>
            {apiKey.lastUsedAt && (
              <span>
                Last used {new Date(apiKey.lastUsedAt).toLocaleDateString()}
              </span>
            )}
          </div>

          {showPermissions && (
            <div className="mt-3 flex flex-wrap gap-2">
              {apiKey.permissions.map((permission) => (
                <span
                  key={permission}
                  className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                >
                  {permission}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowPermissions(!showPermissions)}
            className="p-2 text-gray-400 hover:text-gray-600"
            title="View permissions"
          >
            {showPermissions ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
          {apiKey.isActive && (
            <>
              <button
                onClick={onRotate}
                className="p-2 text-gray-400 hover:text-blue-600"
                title="Rotate key"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              <button
                onClick={onRevoke}
                className="p-2 text-gray-400 hover:text-red-600"
                title="Revoke key"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

interface CreateKeyModalProps {
  onClose: () => void;
  onCreate: (data: any) => void;
  newKey: string | null;
  onCopy: () => void;
  copied: boolean;
}

const CreateKeyModal: React.FC<CreateKeyModalProps> = ({
  onClose,
  onCreate,
  newKey,
  onCopy,
  copied
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: ['jobs:read', 'referrals:read', 'companies:read'],
    environment: 'production'
  });

  const availablePermissions = [
    { value: 'jobs:read', label: 'Read Jobs', description: 'View job listings and details' },
    { value: 'jobs:write', label: 'Write Jobs', description: 'Create and update jobs' },
    { value: 'referrals:read', label: 'Read Referrals', description: 'View referral data' },
    { value: 'referrals:write', label: 'Write Referrals', description: 'Create and manage referrals' },
    { value: 'companies:read', label: 'Read Companies', description: 'View company information' },
    { value: 'companies:write', label: 'Write Companies', description: 'Update company profiles' },
    { value: 'users:read', label: 'Read Users', description: 'View user profiles' },
    { value: 'webhooks:read', label: 'Read Webhooks', description: 'View webhook configurations' },
    { value: 'webhooks:write', label: 'Write Webhooks', description: 'Manage webhooks' }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate(formData);
  };

  const togglePermission = (permission: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission]
    }));
  };

  if (newKey) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 p-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Key className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">API Key Created</h3>
            <p className="text-gray-600 mb-4">
              Copy your API key now. You won't be able to see it again!
            </p>
          </div>

          <div className="bg-gray-100 rounded-lg p-4 mb-4">
            <code className="text-sm break-all">{newKey}</code>
          </div>

          <button
            onClick={onCopy}
            className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mb-3"
          >
            {copied ? (
              <>
                <Check className="w-5 h-5 mr-2" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-5 h-5 mr-2" />
                Copy to Clipboard
              </>
            )}
          </button>

          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            I've saved my key
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-900">Generate New API Key</h3>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Key Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Production API Key"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={2}
              placeholder="What will this key be used for?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Environment
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="production"
                  checked={formData.environment === 'production'}
                  onChange={(e) => setFormData({ ...formData, environment: e.target.value })}
                  className="mr-2"
                />
                Production
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="development"
                  checked={formData.environment === 'development'}
                  onChange={(e) => setFormData({ ...formData, environment: e.target.value })}
                  className="mr-2"
                />
                Development
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Permissions
            </label>
            <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-3">
              {availablePermissions.map((permission) => (
                <label key={permission.value} className="flex items-start space-x-3 p-2 hover:bg-gray-50 rounded">
                  <input
                    type="checkbox"
                    checked={formData.permissions.includes(permission.value)}
                    onChange={() => togglePermission(permission.value)}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium text-gray-900">{permission.label}</div>
                    <div className="text-sm text-gray-500">{permission.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Generate Key
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default APIKeyManager;
