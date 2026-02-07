import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Target, TrendingUp, AlertTriangle, CheckCircle2, Clock,
  Filter, Search, ChevronDown, ChevronUp, MoreHorizontal,
  Phone, Mail, MessageSquare, Calendar, Tag, Star,
  ArrowUpRight, ArrowDownRight, Minus, RefreshCw,
  Building2, Users, Briefcase, DollarSign, Activity,
  Flame, Snowflake, Thermometer, Zap, BarChart3,
  PieChart, LineChart, Download, Plus, X
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

// Types
interface CompanyLead {
  _id: string
  name: string
  slug: string
  industry?: string
  leadScore: number
  crm: {
    salesStage: string
    lastContactDate?: string
    lastContactType?: string
    nextFollowUpDate?: string
    assignedSalesRep?: string
    tags?: Array<{ name: string; color: string }>
    conversionProbability?: number
  }
  stats: {
    totalJobsPosted: number
    totalHires: number
    totalReferralSpend: number
  }
  currentSubscription?: {
    status: string
    planId?: string
  }
}

interface Alert {
  id: string
  type: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  message: string
  triggeredAt: string
  entityId: string
  companyName?: string
  companySlug?: string
}

interface DashboardStats {
  summary: {
    hotCompanies: number
    totalCompanies: number
    avgScore: number
    pendingFollowUps: number
  }
  alerts: Alert[]
  pipeline: Record<string, number>
}

interface ScoreBreakdown {
  jobPostingFrequency: number
  referralBonusSize: number
  responseTime: number
  payoutHistory: number
  subscriptionTier: number
  engagementScore: number
  whatsappEngagement: number
}

// API client
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'

const api = {
  async getDashboard(): Promise<DashboardStats> {
    const token = localStorage.getItem('token')
    const res = await fetch(`${API_URL}/leads/dashboard`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) throw new Error('Failed to fetch dashboard')
    return (await res.json()).data
  },

  async getPrioritizedCompanies(options: {
    limit?: number
    minScore?: number
    salesStage?: string
    sortBy?: string
  } = {}): Promise<CompanyLead[]> {
    const token = localStorage.getItem('token')
    const params = new URLSearchParams()
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) params.append(key, String(value))
    })
    const res = await fetch(`${API_URL}/leads/companies/priority?${params}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) throw new Error('Failed to fetch companies')
    return (await res.json()).data.companies
  },

  async getAlerts(): Promise<Alert[]> {
    const token = localStorage.getItem('token')
    const res = await fetch(`${API_URL}/leads/alerts`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) throw new Error('Failed to fetch alerts')
    return (await res.json()).data.alerts
  },

  async getCompanyScore(companyId: string): Promise<{ totalScore: number; factors: ScoreBreakdown; conversionProbability: number }> {
    const token = localStorage.getItem('token')
    const res = await fetch(`${API_URL}/leads/companies/${companyId}/score`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) throw new Error('Failed to fetch company score')
    return (await res.json()).data
  },

  async updateSalesStage(companyId: string, stage: string, notes?: string): Promise<void> {
    const token = localStorage.getItem('token')
    const res = await fetch(`${API_URL}/leads/companies/${companyId}/sales-stage`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ stage, notes })
    })
    if (!res.ok) throw new Error('Failed to update sales stage')
  },

  async addContact(companyId: string, data: {
    type: string
    subject?: string
    content?: string
    outcome?: string
    followUpDate?: string
  }): Promise<void> {
    const token = localStorage.getItem('token')
    const res = await fetch(`${API_URL}/leads/companies/${companyId}/contact`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(data)
    })
    if (!res.ok) throw new Error('Failed to add contact')
  },

  async addTag(companyId: string, name: string, color: string): Promise<void> {
    const token = localStorage.getItem('token')
    const res = await fetch(`${API_URL}/leads/companies/${companyId}/tags`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ name, color })
    })
    if (!res.ok) throw new Error('Failed to add tag')
  },

  async dismissAlert(alertId: string, entityId: string): Promise<void> {
    const token = localStorage.getItem('token')
    const res = await fetch(`${API_URL}/leads/alerts/${alertId}/dismiss`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ entityId })
    })
    if (!res.ok) throw new Error('Failed to dismiss alert')
  }
}

// Utility functions
const getScoreColor = (score: number): string => {
  if (score >= 80) return 'text-emerald-500 bg-emerald-50 border-emerald-200'
  if (score >= 60) return 'text-blue-500 bg-blue-50 border-blue-200'
  if (score >= 40) return 'text-amber-500 bg-amber-50 border-amber-200'
  if (score >= 20) return 'text-orange-500 bg-orange-50 border-orange-200'
  return 'text-red-500 bg-red-50 border-red-200'
}

const getScoreLabel = (score: number): string => {
  if (score >= 90) return 'Critical'
  if (score >= 80) return 'Hot'
  if (score >= 60) return 'Warm'
  if (score >= 40) return 'Cool'
  if (score >= 20) return 'Cold'
  return 'Frozen'
}

const getScoreIcon = (score: number) => {
  if (score >= 80) return Flame
  if (score >= 60) return Thermometer
  if (score >= 40) return Activity
  return Snowflake
}

const getStageColor = (stage: string): string => {
  const colors: Record<string, string> = {
    prospect: 'text-gray-600 bg-gray-100',
    qualified: 'text-blue-600 bg-blue-100',
    proposal: 'text-purple-600 bg-purple-100',
    negotiation: 'text-amber-600 bg-amber-100',
    closed_won: 'text-emerald-600 bg-emerald-100',
    closed_lost: 'text-red-600 bg-red-100',
    churned: 'text-gray-400 bg-gray-50'
  }
  return colors[stage] || colors.prospect
}

const formatStageName = (stage: string): string => {
  return stage.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'MMK',
    minimumFractionDigits: 0
  }).format(amount).replace('MMK', 'Ks')
}

const formatDate = (dateString?: string): string => {
  if (!dateString) return 'Never'
  const date = new Date(dateString)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Components
const ScoreRing = ({ score, size = 60 }: { score: number; size?: number }) => {
  const strokeWidth = 6
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (score / 100) * circumference
  
  const colorClass = score >= 80 ? 'stroke-emerald-500' : 
                     score >= 60 ? 'stroke-blue-500' : 
                     score >= 40 ? 'stroke-amber-500' : 
                     score >= 20 ? 'stroke-orange-500' : 'stroke-red-500'

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-gray-200"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className={`${colorClass} transition-all duration-500`}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: offset
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold text-gray-700">{score}</span>
      </div>
    </div>
  )
}

const ScoreBar = ({ label, value, max = 20 }: { label: string; value: number; max?: number }) => {
  const percentage = (value / max) * 100
  return (
    <div className="mb-3">
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium text-gray-800">{value}/{max}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className={`h-full rounded-full ${
            percentage >= 80 ? 'bg-emerald-500' :
            percentage >= 60 ? 'bg-blue-500' :
            percentage >= 40 ? 'bg-amber-500' : 'bg-red-500'
          }`}
        />
      </div>
    </div>
  )
}

const AlertCard = ({ alert, onDismiss }: { alert: Alert; onDismiss: () => void }) => {
  const priorityColors = {
    urgent: 'bg-red-50 border-red-200 text-red-700',
    high: 'bg-orange-50 border-orange-200 text-orange-700',
    medium: 'bg-amber-50 border-amber-200 text-amber-700',
    low: 'bg-blue-50 border-blue-200 text-blue-700'
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={`p-4 rounded-lg border ${priorityColors[alert.priority]} mb-3`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-sm">{alert.message}</p>
            {alert.companyName && (
              <p className="text-xs opacity-75 mt-1">{alert.companyName}</p>
            )}
            <p className="text-xs opacity-60 mt-1">{formatDate(alert.triggeredAt)}</p>
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="p-1 hover:bg-black/5 rounded transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  )
}

const CompanyCard = ({
  company,
  onClick,
  isSelected
}: {
  company: CompanyLead
  onClick: () => void
  isSelected: boolean
}) => {
  const ScoreIcon = getScoreIcon(company.leadScore)
  
  return (
    <motion.div
      layout
      onClick={onClick}
      className={`p-4 rounded-xl border cursor-pointer transition-all ${
        isSelected 
          ? 'border-blue-500 bg-blue-50/50 shadow-md' 
          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getScoreColor(company.leadScore)}`}>
            <ScoreIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{company.name}</h3>
            <p className="text-sm text-gray-500">{company.industry || 'No industry'}</p>
          </div>
        </div>
        <ScoreRing score={company.leadScore} size={50} />
      </div>

      <div className="flex items-center gap-2 mb-3">
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStageColor(company.crm?.salesStage || 'prospect')}`}>
          {formatStageName(company.crm?.salesStage || 'prospect')}
        </span>
        {company.crm?.tags?.map((tag, i) => (
          <span
            key={i}
            className="px-2 py-1 rounded-full text-xs font-medium"
            style={{ backgroundColor: tag.color + '20', color: tag.color }}
          >
            {tag.name}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <p className="text-gray-500 text-xs">Jobs</p>
          <p className="font-medium">{company.stats?.totalJobsPosted || 0}</p>
        </div>
        <div>
          <p className="text-gray-500 text-xs">Hires</p>
          <p className="font-medium">{company.stats?.totalHires || 0}</p>
        </div>
        <div>
          <p className="text-gray-500 text-xs">Spent</p>
          <p className="font-medium">{formatCurrency(company.stats?.totalReferralSpend || 0)}</p>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span>Last contact: {formatDate(company.crm?.lastContactDate)}</span>
        </div>
        {company.crm?.conversionProbability !== undefined && (
          <div className="flex items-center gap-1">
            <Target className="w-3 h-3" />
            <span>{company.crm.conversionProbability}% conversion</span>
          </div>
        )}
      </div>
    </motion.div>
  )
}

const CompanyDetailPanel = ({
  company,
  onClose,
  onUpdate
}: {
  company: CompanyLead
  onClose: () => void
  onUpdate: () => void
}) => {
  const [scoreDetails, setScoreDetails] = useState<{
    totalScore: number
    factors: ScoreBreakdown
    conversionProbability: number
  } | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'score' | 'activity'>('overview')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    loadScoreDetails()
  }, [company._id])

  const loadScoreDetails = async () => {
    try {
      const details = await api.getCompanyScore(company._id)
      setScoreDetails(details)
    } catch (error) {
      console.error('Failed to load score details:', error)
    }
  }

  const handleStageChange = async (stage: string) => {
    setIsLoading(true)
    try {
      await api.updateSalesStage(company._id, stage)
      onUpdate()
    } catch (error) {
      console.error('Failed to update stage:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddContact = async (type: string) => {
    setIsLoading(true)
    try {
      await api.addContact(company._id, {
        type,
        outcome: 'successful'
      })
      onUpdate()
    } catch (error) {
      console.error('Failed to add contact:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      className="fixed inset-y-0 right-0 w-full max-w-lg bg-white shadow-2xl border-l border-gray-200 overflow-y-auto z-50"
    >
      <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">{company.name}</h2>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4">
        {/* Score Overview */}
        <div className="flex items-center gap-4 mb-6">
          <ScoreRing score={company.leadScore} size={80} />
          <div>
            <p className="text-sm text-gray-500">Lead Score</p>
            <p className="text-2xl font-bold text-gray-900">{company.leadScore}/100</p>
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getScoreColor(company.leadScore)}`}>
              {getScoreIcon(company.leadScore) && <>{(() => {
                const Icon = getScoreIcon(company.leadScore)
                return <Icon className="w-3 h-3" />
              })()}</>}
              {getScoreLabel(company.leadScore)}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          {(['overview', 'score', 'activity'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Sales Stage */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sales Stage</label>
              <select
                value={company.crm?.salesStage || 'prospect'}
                onChange={(e) => handleStageChange(e.target.value)}
                disabled={isLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {['prospect', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost', 'churned'].map(stage => (
                  <option key={stage} value={stage}>{formatStageName(stage)}</option>
                ))}
              </select>
            </div>

            {/* Quick Actions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Quick Actions</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleAddContact('email')}
                  disabled={isLoading}
                  className="flex flex-col items-center gap-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Mail className="w-5 h-5 text-blue-500" />
                  <span className="text-xs">Email</span>
                </button>
                <button
                  onClick={() => handleAddContact('phone')}
                  disabled={isLoading}
                  className="flex flex-col items-center gap-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Phone className="w-5 h-5 text-green-500" />
                  <span className="text-xs">Call</span>
                </button>
                <button
                  onClick={() => handleAddContact('whatsapp')}
                  disabled={isLoading}
                  className="flex flex-col items-center gap-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <MessageSquare className="w-5 h-5 text-emerald-500" />
                  <span className="text-xs">WhatsApp</span>
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Total Jobs</p>
                <p className="text-2xl font-bold text-gray-900">{company.stats?.totalJobsPosted || 0}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Successful Hires</p>
                <p className="text-2xl font-bold text-gray-900">{company.stats?.totalHires || 0}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Total Spent</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(company.stats?.totalReferralSpend || 0)}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Conversion Probability</p>
                <p className="text-2xl font-bold text-gray-900">{company.crm?.conversionProbability || 0}%</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'score' && scoreDetails && (
          <div>
            <div className="mb-6">
              <h3 className="font-medium text-gray-900 mb-1">Score Breakdown</h3>
              <p className="text-sm text-gray-500">How this score was calculated</p>
            </div>
            <ScoreBar label="Job Posting Frequency" value={scoreDetails.factors.jobPostingFrequency} max={20} />
            <ScoreBar label="Referral Bonus Size" value={scoreDetails.factors.referralBonusSize} max={20} />
            <ScoreBar label="Response Time" value={scoreDetails.factors.responseTime} max={20} />
            <ScoreBar label="Payout History" value={scoreDetails.factors.payoutHistory} max={20} />
            <ScoreBar label="Subscription Tier" value={scoreDetails.factors.subscriptionTier} max={20} />
            <ScoreBar label="Engagement Score" value={scoreDetails.factors.engagementScore} max={10} />
            <ScoreBar label="WhatsApp Engagement" value={scoreDetails.factors.whatsappEngagement} max={10} />
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="text-center py-8 text-gray-500">
            <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Activity history will be displayed here</p>
          </div>
        )}
      </div>
    </motion.div>
  )
}

// Main Dashboard Component
export default function LeadScoreDashboard() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'companies' | 'alerts' | 'analytics'>('companies')
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null)
  const [companies, setCompanies] = useState<CompanyLead[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [selectedCompany, setSelectedCompany] = useState<CompanyLead | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [filters, setFilters] = useState({
    minScore: 0,
    salesStage: '',
    sortBy: 'score'
  })

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [dashboard, prioritizedCompanies, activeAlerts] = await Promise.all([
        api.getDashboard(),
        api.getPrioritizedCompanies(filters),
        api.getAlerts()
      ])
      setDashboardStats(dashboard)
      setCompanies(prioritizedCompanies)
      setAlerts(activeAlerts)
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [filters])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleDismissAlert = async (alertId: string, entityId: string) => {
    try {
      await api.dismissAlert(alertId, entityId)
      setAlerts(prev => prev.filter(a => a.id !== alertId))
    } catch (error) {
      console.error('Failed to dismiss alert:', error)
    }
  }

  const handleRefresh = () => {
    loadData()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/admin')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowDownRight className="w-5 h-5 rotate-90" />
              </button>
              <h1 className="text-xl font-bold text-gray-900">Lead Scoring Dashboard</h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
              <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        {dashboardStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <Flame className="w-5 h-5 text-emerald-600" />
                </div>
                <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                  Hot Leads
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{dashboardStats.summary.hotCompanies}</p>
              <p className="text-sm text-gray-500">Companies scoring 80+</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Building2 className="w-5 h-5 text-blue-600" />
                </div>
                <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                  Total
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{dashboardStats.summary.totalCompanies}</p>
              <p className="text-sm text-gray-500">Active companies</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                </div>
                <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-1 rounded-full">
                  Average
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{dashboardStats.summary.avgScore}</p>
              <p className="text-sm text-gray-500">Average lead score</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
                <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                  Action Needed
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{dashboardStats.summary.pendingFollowUps}</p>
              <p className="text-sm text-gray-500">Pending follow-ups</p>
            </motion.div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(['companies', 'alerts', 'analytics'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === tab
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === 'alerts' && alerts.length > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-red-500 text-white rounded-full">
                  {alerts.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <>
            {activeTab === 'companies' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Filters */}
                <div className="lg:col-span-3 flex flex-wrap gap-4 mb-4">
                  <select
                    value={filters.minScore}
                    onChange={(e) => setFilters(prev => ({ ...prev, minScore: Number(e.target.value) }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={0}>All Scores</option>
                    <option value={80}>Hot (80+)</option>
                    <option value={60}>Warm (60+)</option>
                    <option value={40}>Cool (40+)</option>
                  </select>
                  <select
                    value={filters.salesStage}
                    onChange={(e) => setFilters(prev => ({ ...prev, salesStage: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Stages</option>
                    <option value="prospect">Prospect</option>
                    <option value="qualified">Qualified</option>
                    <option value="proposal">Proposal</option>
                    <option value="negotiation">Negotiation</option>
                  </select>
                  <select
                    value={filters.sortBy}
                    onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="score">Sort by Score</option>
                    <option value="recent">Sort by Recent Activity</option>
                    <option value="followUp">Sort by Follow-up Date</option>
                  </select>
                </div>

                {/* Company Cards */}
                {companies.map(company => (
                  <CompanyCard
                    key={company._id}
                    company={company}
                    onClick={() => setSelectedCompany(company)}
                    isSelected={selectedCompany?._id === company._id}
                  />
                ))}
              </div>
            )}

            {activeTab === 'alerts' && (
              <div className="max-w-2xl">
                <AnimatePresence>
                  {alerts.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center py-12 bg-white rounded-xl border border-gray-200"
                    >
                      <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-500" />
                      <p className="text-gray-600 font-medium">No active alerts</p>
                      <p className="text-sm text-gray-500">All caught up!</p>
                    </motion.div>
                  ) : (
                    alerts.map(alert => (
                      <AlertCard
                        key={alert.id}
                        alert={alert}
                        onDismiss={() => handleDismissAlert(alert.id, alert.entityId)}
                      />
                    ))
                  )}
                </AnimatePresence>
              </div>
            )}

            {activeTab === 'analytics' && (
              <div className="bg-white p-8 rounded-xl border border-gray-200 text-center">
                <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Analytics Coming Soon</h3>
                <p className="text-gray-500">Detailed analytics and reporting features are being developed.</p>
              </div>
            )}
          </>
        )}
      </main>

      {/* Company Detail Panel */}
      <AnimatePresence>
        {selectedCompany && (
          <CompanyDetailPanel
            company={selectedCompany}
            onClose={() => setSelectedCompany(null)}
            onUpdate={loadData}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
