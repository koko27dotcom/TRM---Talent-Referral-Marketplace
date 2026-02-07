import React, { useState, useEffect } from 'react';
import { 
  Webhook, 
  Plus, 
  Trash2, 
  Play, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  RefreshCw,
  Clock,
  Send
} from 'lucide-react';
import axios from 'axios';

interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  events: string[];
  status: 'active' | 'paused' | 'disabled' | 'error';
  health: {
    totalDeliveries: number;
    successfulDeliveries: number;
    failedDeliveries: number;
    lastDeliveryAt?: string;
    lastSuccessAt?: string;
    lastFailureAt?: string;
  };
  createdAt: string;
}

const WebhookManager: React.FC = () => {
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState<WebhookConfig | null>(null);

  useEffect(() => {
    fetchWebhooks();
  }, []);

  const fetchWebhooks = async () => {
    try {
      const response = await axios.get('/api/v1/webhooks');
      setWebhooks(response.data.data);
    } catch (error) {
      console.error('Error fetching webhooks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWebhook = async (webhookData: any) => {
    try {
      await axios.post('/api/v1/webhooks', webhookData);
      fetchWebhooks();
      setShowCreateModal(false);
    } catch (error) {
      console.error('Error creating webhook:', error);
    }
  };

  const handleDeleteWebhook = async (webhookId: string) => {
    if (!confirm('Are you sure you want to delete this webhook?')) {
      return;
    }

    try {
      await axios.delete(`/api/v1/webhooks/${webhookId}`);
      fetchWebhooks();
    } catch (error) {
      console.error('Error deleting webhook:', error);
    }
  };

  const handleTestWebhook = async (webhookId: string) => {
    try {
      const response = await axios.post(`/api/v1/webhooks/${webhookId}/test`);
      alert(`Test event sent! Status: ${response.data.data.success ? 'Success' : 'Failed'}`);
    } catch (error) {
      console.error('Error testing webhook:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'paused':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getSuccessRate = (webhook: WebhookConfig) => {
    if (webhook.health.totalDeliveries === 0) return 100;
    return Math.round((webhook.health.successfulDeliveries / webhook.health.totalDeliveries) * 100);
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
          <h2 className="text-2xl font-bold text-gray-900">Webhooks</h2>
          <p className="text-gray-600 mt-1">
            Configure webhooks to receive real-time event notifications
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Webhook
        </button>
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-blue-900">About Webhooks</h3>
            <p className="mt-1 text-sm text-blue-800">
              Webhooks allow your application to receive real-time notifications when events occur 
              in TRM, such as when a referral status changes or a new job is posted. We'll send 
              HTTP POST requests to your endpoint with event data.
            </p>
          </div>
        </div>
      </div>

      {/* Webhooks List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {webhooks.length === 0 ? (
          <div className="p-12 text-center">
            <Webhook className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Webhooks</h3>
            <p className="text-gray-600 mb-4">
              You haven't configured any webhooks yet. Add one to start receiving event notifications.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Your First Webhook
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {webhooks.map((webhook) => (
              <div
                key={webhook.id}
                className="p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(webhook.status)}
                      <h3 className="text-lg font-semibold text-gray-900">{webhook.name}</h3>
                      <span className={`
                        px-2 py-1 text-xs font-medium rounded-full
                        ${webhook.status === 'active' ? 'bg-green-100 text-green-800' : ''}
                        ${webhook.status === 'error' ? 'bg-red-100 text-red-800' : ''}
                        ${webhook.status === 'paused' ? 'bg-yellow-100 text-yellow-800' : ''}
                      `}>
                        {webhook.status}
                      </span>
                    </div>

                    <p className="text-gray-600 mt-1 font-mono text-sm">{webhook.url}</p>

                    <div className="flex flex-wrap gap-2 mt-3">
                      {webhook.events.map((event) => (
                        <span
                          key={event}
                          className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                        >
                          {event}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center space-x-6 mt-4 text-sm text-gray-500">
                      <span>Success Rate: <strong className={getSuccessRate(webhook) >= 95 ? 'text-green-600' : 'text-yellow-600'}>{getSuccessRate(webhook)}%</strong></span>
                      <span>Total: {webhook.health.totalDeliveries.toLocaleString()}</span>
                      <span>Success: {webhook.health.successfulDeliveries.toLocaleString()}</span>
                      <span>Failed: {webhook.health.failedDeliveries.toLocaleString()}</span>
                    </div>

                    {webhook.health.lastDeliveryAt && (
                      <p className="text-sm text-gray-500 mt-2">
                        Last delivery: {new Date(webhook.health.lastDeliveryAt).toLocaleString()}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleTestWebhook(webhook.id)}
                      className="p-2 text-gray-400 hover:text-blue-600"
                      title="Test webhook"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setSelectedWebhook(webhook)}
                      className="p-2 text-gray-400 hover:text-blue-600"
                      title="View details"
                    >
                      <RefreshCw className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteWebhook(webhook.id)}
                      className="p-2 text-gray-400 hover:text-red-600"
                      title="Delete webhook"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <CreateWebhookModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateWebhook}
        />
      )}
    </div>
  );
};

interface CreateWebhookModalProps {
  onClose: () => void;
  onCreate: (data: any) => void;
}

const CreateWebhookModal: React.FC<CreateWebhookModalProps> = ({ onClose, onCreate }) => {
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    events: [] as string[],
    description: ''
  });

  const availableEvents = [
    { category: 'Referrals', events: [
      { value: 'referral.created', label: 'Referral Created' },
      { value: 'referral.updated', label: 'Referral Updated' },
      { value: 'referral.status_changed', label: 'Status Changed' },
      { value: 'referral.hired', label: 'Candidate Hired' },
      { value: 'referral.rejected', label: 'Candidate Rejected' }
    ]},
    { category: 'Jobs', events: [
      { value: 'job.published', label: 'Job Published' },
      { value: 'job.updated', label: 'Job Updated' },
      { value: 'job.closed', label: 'Job Closed' }
    ]},
    { category: 'Payouts', events: [
      { value: 'payout.completed', label: 'Payout Completed' },
      { value: 'payout.failed', label: 'Payout Failed' }
    ]},
    { category: 'Users', events: [
      { value: 'user.verified', label: 'User Verified' }
    ]}
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate(formData);
  };

  const toggleEvent = (event: string) => {
    setFormData(prev => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter(e => e !== event)
        : [...prev.events, event]
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-900">Add New Webhook</h3>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Webhook Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Production Webhook"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Endpoint URL *
            </label>
            <input
              type="url"
              required
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="https://your-app.com/webhooks/trm"
            />
            <p className="text-sm text-gray-500 mt-1">
              Must be a valid HTTPS URL that can receive POST requests
            </p>
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
              placeholder="What is this webhook for?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Events to Subscribe *
            </label>
            <div className="space-y-4 border border-gray-200 rounded-lg p-4 max-h-80 overflow-y-auto">
              {availableEvents.map((category) => (
                <div key={category.category}>
                  <h4 className="font-medium text-gray-900 mb-2">{category.category}</h4>
                  <div className="space-y-2 ml-2">
                    {category.events.map((event) => (
                      <label key={event.value} className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={formData.events.includes(event.value)}
                          onChange={() => toggleEvent(event.value)}
                          className="rounded"
                        />
                        <span className="text-gray-700">{event.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-yellow-900 mb-2">Webhook Security</h4>
            <p className="text-sm text-yellow-800">
              We'll generate a secret key for this webhook. Use it to verify that requests 
              are coming from TRM by checking the X-TRM-Signature header.
            </p>
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
              disabled={formData.events.length === 0}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Webhook
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WebhookManager;
