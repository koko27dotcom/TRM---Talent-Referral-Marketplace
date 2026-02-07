import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mail,
  MessageSquare,
  Plus,
  X,
  Send,
  Users,
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  ChevronRight,
  ChevronDown,
  MoreVertical,
  Play,
  Pause,
  StopCircle,
  Edit3,
  Trash2,
  Copy,
  Target,
  Filter,
  Sparkles,
} from 'lucide-react'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

interface Campaign {
  _id: string
  name: string
  status: 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'cancelled'
  channel: 'whatsapp' | 'email' | 'sms' | 'linkedin'
  type: string
  recipientCount: number
  analytics: {
    sentCount: number
    openedCount: number
    repliedCount: number
    openRate: number
    replyRate: number
  }
  createdAt: string
  scheduledAt?: string
}

interface Template {
  id: string
  name: string
  subject?: string
  body: string
  category: string
}

interface OutreachManagerProps {
  onClose: () => void
}

export default function OutreachManager({ onClose }: OutreachManagerProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(false)
  const [activeView, setActiveView] = useState<'campaigns' | 'create' | 'analytics'>('campaigns')
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  // Fetch campaigns
  const fetchCampaigns = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_BASE_URL}/outreach/campaigns`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      
      if (!response.ok) throw new Error('Failed to fetch campaigns')
      
      const data = await response.json()
      setCampaigns(data.data.campaigns)
    } catch (err) {
      console.error('Error fetching campaigns:', err)
    } finally {
      setLoading(false)
    }
  }

  // Fetch templates
  const fetchTemplates = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_BASE_URL}/outreach/templates`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      
      if (!response.ok) throw new Error('Failed to fetch templates')
      
      const data = await response.json()
      setTemplates(data.data)
    } catch (err) {
      console.error('Error fetching templates:', err)
    }
  }

  useEffect(() => {
    fetchCampaigns()
    fetchTemplates()
  }, [])

  const handleCreateCampaign = async (campaignData: any) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_BASE_URL}/outreach/campaigns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(campaignData),
      })

      if (!response.ok) throw new Error('Failed to create campaign')

      await fetchCampaigns()
      setShowCreateModal(false)
    } catch (err) {
      console.error('Error creating campaign:', err)
    }
  }

  const handleStartCampaign = async (campaignId: string) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_BASE_URL}/outreach/campaigns/${campaignId}/send`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) throw new Error('Failed to start campaign')

      await fetchCampaigns()
    } catch (err) {
      console.error('Error starting campaign:', err)
    }
  }

  const handlePauseCampaign = async (campaignId: string) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_BASE_URL}/outreach/campaigns/${campaignId}/pause`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) throw new Error('Failed to pause campaign')

      await fetchCampaigns()
    } catch (err) {
      console.error('Error pausing campaign:', err)
    }
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-700',
      scheduled: 'bg-blue-100 text-blue-700',
      running: 'bg-green-100 text-green-700',
      paused: 'bg-yellow-100 text-yellow-700',
      completed: 'bg-emerald-100 text-emerald-700',
      cancelled: 'bg-red-100 text-red-700',
    }
    return colors[status] || 'bg-gray-100 text-gray-700'
  }

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'whatsapp': return <MessageSquare className="w-4 h-4 text-green-600" />
      case 'email': return <Mail className="w-4 h-4 text-blue-600" />
      case 'sms': return <MessageSquare className="w-4 h-4 text-purple-600" />
      default: return <Mail className="w-4 h-4 text-gray-500" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-100 rounded-xl">
            <Mail className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Outreach Campaigns</h2>
            <p className="text-sm text-gray-500">
              Create and manage candidate outreach campaigns
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveView('campaigns')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeView === 'campaigns'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Campaigns
          </button>
          <button
            onClick={() => setActiveView('analytics')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeView === 'analytics'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Analytics
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            New Campaign
          </button>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Campaigns View */}
      {activeView === 'campaigns' && (
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl">
              <Mail className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500 mb-4">No campaigns yet</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create your first campaign
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {campaigns.map((campaign) => (
                <motion.div
                  key={campaign._id}
                  layout
                  className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-gray-100 rounded-xl">
                        {getChannelIcon(campaign.channel)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{campaign.name}</h3>
                        <div className="flex items-center gap-3 mt-1">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(campaign.status)}`}>
                            {campaign.status}
                          </span>
                          <span className="text-sm text-gray-500 capitalize">{campaign.channel}</span>
                          <span className="text-sm text-gray-400">
                            {new Date(campaign.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {campaign.status === 'draft' && (
                        <button
                          onClick={() => handleStartCampaign(campaign._id)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                        >
                          <Play className="w-4 h-4" />
                          Start
                        </button>
                      )}
                      {campaign.status === 'running' && (
                        <button
                          onClick={() => handlePauseCampaign(campaign._id)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200"
                        >
                          <Pause className="w-4 h-4" />
                          Pause
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedCampaign(campaign)}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                      >
                        <ChevronRight className="w-5 h-5 text-gray-500" />
                      </button>
                    </div>
                  </div>

                  {/* Analytics Preview */}
                  <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-100">
                    <div>
                      <p className="text-xs text-gray-500">Recipients</p>
                      <p className="text-lg font-semibold text-gray-900">{campaign.recipientCount}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Sent</p>
                      <p className="text-lg font-semibold text-gray-900">{campaign.analytics?.sentCount || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Open Rate</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {campaign.analytics?.openRate ? `${Math.round(campaign.analytics.openRate)}%` : '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Reply Rate</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {campaign.analytics?.replyRate ? `${Math.round(campaign.analytics.replyRate)}%` : '-'}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Analytics View */}
      {activeView === 'analytics' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Send className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Sent</p>
                <p className="text-2xl font-bold text-gray-900">
                  {campaigns.reduce((sum, c) => sum + (c.analytics?.sentCount || 0), 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Avg Open Rate</p>
                <p className="text-2xl font-bold text-gray-900">
                  {campaigns.length > 0
                    ? `${Math.round(campaigns.reduce((sum, c) => sum + (c.analytics?.openRate || 0), 0) / campaigns.length)}%`
                    : '0%'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <MessageSquare className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Avg Reply Rate</p>
                <p className="text-2xl font-bold text-gray-900">
                  {campaigns.length > 0
                    ? `${Math.round(campaigns.reduce((sum, c) => sum + (c.analytics?.replyRate || 0), 0) / campaigns.length)}%`
                    : '0%'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Campaign Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateCampaignModal
            templates={templates}
            onClose={() => setShowCreateModal(false)}
            onCreate={handleCreateCampaign}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

interface CreateCampaignModalProps {
  templates: Template[]
  onClose: () => void
  onCreate: (data: any) => void
}

function CreateCampaignModal({ templates, onClose, onCreate }: CreateCampaignModalProps) {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState<{
    name: string
    channel: string
    type: string
    messageTemplate: {
      name: string
      subject: string
      body: string
    }
    targetFilter: {
      skills: string[]
      minHireProbability: number
    }
  }>({
    name: '',
    channel: 'whatsapp',
    type: 'talent_sourcing',
    messageTemplate: {
      name: '',
      subject: '',
      body: '',
    },
    targetFilter: {
      skills: [],
      minHireProbability: 70,
    },
  })

  const handleSubmit = () => {
    onCreate(formData)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Create New Campaign</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Senior Developers Outreach"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Channel</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
                    { id: 'email', label: 'Email', icon: Mail },
                  ].map((channel) => (
                    <button
                      key={channel.id}
                      onClick={() => setFormData({ ...formData, channel: channel.id })}
                      className={`flex items-center justify-center gap-2 p-3 border rounded-lg transition-colors ${
                        formData.channel === channel.id
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <channel.icon className="w-5 h-5" />
                      {channel.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message Template</label>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => setFormData({
                        ...formData,
                        messageTemplate: {
                          name: template.name,
                          subject: template.subject || '',
                          body: template.body,
                        },
                      })}
                      className={`w-full p-4 border rounded-lg text-left transition-colors ${
                        formData.messageTemplate.name === template.name
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <p className="font-medium text-gray-900">{template.name}</p>
                      <p className="text-sm text-gray-500 line-clamp-2">{template.body}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Or write custom message</label>
                <textarea
                  value={formData.messageTemplate.body}
                  onChange={(e) => setFormData({
                    ...formData,
                    messageTemplate: { ...formData.messageTemplate, body: e.target.value },
                  })}
                  rows={4}
                  placeholder="Enter your message... Use {{name}}, {{firstName}}, {{currentTitle}} for personalization"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target Candidates</label>
                <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                  <div>
                    <label className="text-sm text-gray-600">Minimum Hire Probability Score</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={formData.targetFilter.minHireProbability}
                      onChange={(e) => setFormData({
                        ...formData,
                        targetFilter: { ...formData.targetFilter, minHireProbability: parseInt(e.target.value) },
                      })}
                      className="w-full mt-2"
                    />
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>0%</span>
                      <span className="font-medium text-blue-600">{formData.targetFilter.minHireProbability}%</span>
                      <span>100%</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm text-gray-600">Required Skills (comma-separated)</label>
                    <input
                      type="text"
                      placeholder="React, Node.js, Python..."
                      onChange={(e) => setFormData({
                        ...formData,
                        targetFilter: {
                          ...formData.targetFilter,
                          skills: e.target.value.split(',').map(s => s.trim()).filter(Boolean),
                        },
                      })}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`w-2 h-2 rounded-full ${
                  s <= step ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Back
              </button>
            )}
            {step < 3 ? (
              <button
                onClick={() => setStep(step + 1)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4" />
                Create Campaign
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
