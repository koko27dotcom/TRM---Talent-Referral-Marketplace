import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Building2, Users, Key, Webhook, Palette, Shield,
  BarChart3, FileText, Headphones, Zap, Crown, CheckCircle2,
  AlertCircle, ChevronRight, Download, Upload, Plus, Trash2,
  RefreshCw, Copy, Check, X, Settings, TrendingUp, Briefcase,
  Clock, Globe, Lock, Mail, Phone, User, Loader2, MoreHorizontal,
  Eye, EyeOff, Code, Terminal, FileJson, Table, Filter,
  ArrowUpRight, ArrowDownRight, Sparkles, Star, Award,
  HelpCircle, MessageSquare, Video, Calendar, ExternalLink
} from 'lucide-react'
import { Link } from 'react-router-dom'

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

// Types
interface EnterprisePlan {
  id: string
  name: string
  tier: string
  pricing: {
    monthly: number
    yearly: number
    currency: string
  }
  features: {
    apiAccess: boolean
    bulkJobPosting: boolean
    customBranding: boolean
    whiteLabel: boolean
    advancedAnalytics: boolean
    dedicatedManager: boolean
    prioritySupport: boolean
    ssoEnabled: boolean
    samlSupport: boolean
  }
  support: {
    level: string
    responseTimeHours: number
  }
}

interface TeamMember {
  id: string
  userId: string
  name: string
  email: string
  avatar?: string
  role: string
  department?: string
  permissions: string[]
  isActive: boolean
  joinedAt: string
  lastActiveAt?: string
}

interface ApiKey {
  id: string
  name: string
  prefix: string
  permissions: string[]
  rateLimit: number
  usageCount: number
  lastUsedAt?: string
  createdAt: string
  expiresAt?: string
  isActive: boolean
}

interface WebhookConfig {
  enabled: boolean
  url: string
  secret: string
  events: string[]
  lastSuccess?: string
  lastError?: string
}

interface CustomBranding {
  enabled: boolean
  logo: string
  colors: {
    primary: string
    secondary: string
    accent: string
  }
  domain: string
  customCss: string
  favicon: string
}

interface DashboardData {
  company: {
    id: string
    name: string
    logo?: string
    enterpriseStatus: string
    enterpriseTrial?: {
      endsAt: string
    }
  }
  plan?: EnterprisePlan
  accountManager?: {
    name: string
    email: string
    phone?: string
    avatar?: string
  }
  stats: {
    jobs: {
      totalJobs: number
      activeJobs: number
      totalViews: number
      totalApplications: number
    }
    referrals: {
      totalReferrals: number
      hired: number
      pending: number
      rejected: number
      totalSpent: number
    }
    api: {
      totalCalls: number
      activeKeys: number
    }
  }
  features: string[]
  teamSize: number
}

interface BulkJobResult {
  total: number
  successful: number
  failed: number
  errors: Array<{
    row: number
    job: string
    errors: string[]
  }>
  jobs: Array<{
    id: string
    title: string
    status: string
  }>
}

// Tab Components
const OverviewTab = ({ data, onRefresh }: { data: DashboardData; onRefresh: () => void }) => {
  const isTrial = data.company.enterpriseStatus === 'trial'
  const trialDaysLeft = data.company.enterpriseTrial?.endsAt
    ? Math.ceil((new Date(data.company.enterpriseTrial.endsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      {isTrial && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl p-4 text-white"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5" />
              <div>
                <p className="font-semibold">Enterprise Trial Active</p>
                <p className="text-sm text-white/90">{trialDaysLeft} days remaining</p>
              </div>
            </div>
            <Link
              to="/enterprise/plans"
              className="px-4 py-2 bg-white text-orange-600 rounded-lg font-medium hover:bg-white/90 transition-colors"
            >
              Upgrade Now
            </Link>
          </div>
        </motion.div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Jobs"
          value={data.stats.jobs.totalJobs}
          change={+12}
          icon={Briefcase}
          color="blue"
        />
        <StatCard
          title="Active Jobs"
          value={data.stats.jobs.activeJobs}
          change={+5}
          icon={Zap}
          color="green"
        />
        <StatCard
          title="Total Referrals"
          value={data.stats.referrals.totalReferrals}
          change={+28}
          icon={Users}
          color="purple"
        />
        <StatCard
          title="Successful Hires"
          value={data.stats.referrals.hired}
          change={+8}
          icon={CheckCircle2}
          color="emerald"
        />
      </div>

      {/* Account Manager Card */}
      {data.accountManager && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xl font-bold">
              {data.accountManager.name.charAt(0)}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Your Account Manager
              </h3>
              <p className="text-gray-600 dark:text-gray-400">{data.accountManager.name}</p>
              <div className="flex flex-wrap gap-3 mt-3">
                <a
                  href={`mailto:${data.accountManager.email}`}
                  className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  Email
                </a>
                {data.accountManager.phone && (
                  <a
                    href={`tel:${data.accountManager.phone}`}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                    Call
                  </a>
                )}
                <button className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-sm text-blue-700 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors">
                  <Calendar className="w-4 h-4" />
                  Schedule Meeting
                </button>
              </div>
            </div>
            <div className="hidden sm:block">
              <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm font-medium">
                Available
              </span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Plan Features */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Your Plan Features
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {data.features.map((feature) => (
            <div
              key={feature}
              className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 rounded-lg"
            >
              <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
              <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                {feature.replace(/_/g, ' ')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const StatCard = ({ title, value, change, icon: Icon, color }: {
  title: string
  value: number
  change: number
  icon: React.ElementType
  color: string
}) => {
  const colorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
    emerald: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {value.toLocaleString()}
          </p>
        </div>
        <div className={`p-2 rounded-lg ${colorClasses[color as keyof typeof colorClasses]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="flex items-center gap-1 mt-3">
        {change > 0 ? (
          <ArrowUpRight className="w-4 h-4 text-green-500" />
        ) : (
          <ArrowDownRight className="w-4 h-4 text-red-500" />
        )}
        <span className={`text-sm font-medium ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
          {Math.abs(change)}%
        </span>
        <span className="text-sm text-gray-500 dark:text-gray-400">vs last month</span>
      </div>
    </motion.div>
  )
}

const TeamTab = ({ members, onRefresh }: { members: TeamMember[]; onRefresh: () => void }) => {
  const [isAdding, setIsAdding] = useState(false)
  const [newMember, setNewMember] = useState({
    name: '',
    email: '',
    role: 'recruiter',
    department: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleAddMember = async () => {
    setIsSubmitting(true)
    try {
      const response = await fetch(`${API_BASE_URL}/v1/enterprise/team`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(newMember),
      })

      if (response.ok) {
        setIsAdding(false)
        setNewMember({ name: '', email: '', role: 'recruiter', department: '' })
        onRefresh()
      }
    } catch (error) {
      console.error('Failed to add team member:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRemoveMember = async (id: string) => {
    if (!confirm('Are you sure you want to remove this team member?')) return

    try {
      const response = await fetch(`${API_BASE_URL}/v1/enterprise/team/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      })

      if (response.ok) {
        onRefresh()
      }
    } catch (error) {
      console.error('Failed to remove team member:', error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Team Members ({members.length})
        </h3>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Member
        </button>
      </div>

      {isAdding && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Full Name"
              value={newMember.name}
              onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <input
              type="email"
              placeholder="Email Address"
              value={newMember.email}
              onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <select
              value={newMember.role}
              onChange={(e) => setNewMember({ ...newMember, role: e.target.value })}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="viewer">Viewer</option>
              <option value="recruiter">Recruiter</option>
              <option value="hiring_manager">Hiring Manager</option>
              <option value="admin">Admin</option>
            </select>
            <input
              type="text"
              placeholder="Department (optional)"
              value={newMember.department}
              onChange={(e) => setNewMember({ ...newMember, department: e.target.value })}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleAddMember}
              disabled={isSubmitting || !newMember.name || !newMember.email}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Member'}
            </button>
            <button
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Member</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Department</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {members.map((member) => (
              <tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-medium">
                      {member.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{member.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{member.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-xs font-medium capitalize">
                    {member.role.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                  {member.department || '-'}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    member.isActive
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }`}>
                    {member.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => handleRemoveMember(member.id)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Remove member"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const ApiKeysTab = ({ keys, onRefresh }: { keys: ApiKey[]; onRefresh: () => void }) => {
  const [isGenerating, setIsGenerating] = useState(false)
  const [newKey, setNewKey] = useState({ name: '', permissions: ['read:jobs'] as string[] })
  const [generatedKey, setGeneratedKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleGenerateKey = async () => {
    setIsGenerating(true)
    try {
      const response = await fetch(`${API_BASE_URL}/v1/enterprise/api-keys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(newKey),
      })

      if (response.ok) {
        const data = await response.json()
        setGeneratedKey(data.data.key)
        setNewKey({ name: '', permissions: ['read:jobs'] })
        onRefresh()
      }
    } catch (error) {
      console.error('Failed to generate API key:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleRevokeKey = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) return

    try {
      const response = await fetch(`${API_BASE_URL}/v1/enterprise/api-keys/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      })

      if (response.ok) {
        onRefresh()
      }
    } catch (error) {
      console.error('Failed to revoke API key:', error)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Generate New Key */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Generate New API Key
        </h3>
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Key name (e.g., Production, Development)"
            value={newKey.name}
            onChange={(e) => setNewKey({ ...newKey, name: e.target.value })}
            className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <button
            onClick={handleGenerateKey}
            disabled={isGenerating || !newKey.name}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
            Generate Key
          </button>
        </div>

        {generatedKey && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg"
          >
            <p className="text-sm text-amber-800 dark:text-amber-400 mb-2">
              <AlertCircle className="w-4 h-4 inline mr-1" />
              Copy this key now. You won't be able to see it again!
            </p>
            <div className="flex gap-2">
              <code className="flex-1 px-3 py-2 bg-white dark:bg-gray-900 rounded-lg text-sm font-mono text-gray-900 dark:text-white break-all">
                {generatedKey}
              </code>
              <button
                onClick={() => copyToClipboard(generatedKey)}
                className="px-3 py-2 bg-amber-100 dark:bg-amber-800 text-amber-700 dark:text-amber-400 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-700 transition-colors"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* API Keys List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Prefix</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Permissions</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Usage</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {keys.map((key) => (
              <tr key={key.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                  {key.name}
                </td>
                <td className="px-6 py-4">
                  <code className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm font-mono text-gray-600 dark:text-gray-400">
                    {key.prefix}
                  </code>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {key.permissions.map((perm) => (
                      <span
                        key={perm}
                        className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs"
                      >
                        {perm}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                  {key.usageCount.toLocaleString()} calls
                  {key.lastUsedAt && (
                    <p className="text-xs text-gray-400">
                      Last used {new Date(key.lastUsedAt).toLocaleDateString()}
                    </p>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    key.isActive
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }`}>
                    {key.isActive ? 'Active' : 'Revoked'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  {key.isActive && (
                    <button
                      onClick={() => handleRevokeKey(key.id)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Revoke key"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const WebhooksTab = ({ config, onRefresh }: { config: WebhookConfig | null; onRefresh: () => void }) => {
  const [webhookConfig, setWebhookConfig] = useState<WebhookConfig>(config || {
    enabled: false,
    url: '',
    secret: '',
    events: [],
  })
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)

  const availableEvents = [
    { value: 'job.created', label: 'Job Created' },
    { value: 'job.updated', label: 'Job Updated' },
    { value: 'job.closed', label: 'Job Closed' },
    { value: 'application.received', label: 'Application Received' },
    { value: 'referral.created', label: 'Referral Created' },
    { value: 'referral.hired', label: 'Referral Hired' },
    { value: 'candidate.shortlisted', label: 'Candidate Shortlisted' },
    { value: 'candidate.rejected', label: 'Candidate Rejected' },
  ]

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch(`${API_BASE_URL}/v1/enterprise/webhooks`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(webhookConfig),
      })

      if (response.ok) {
        onRefresh()
      }
    } catch (error) {
      console.error('Failed to save webhook config:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleTest = async () => {
    setIsTesting(true)
    try {
      const response = await fetch(`${API_BASE_URL}/v1/enterprise/webhooks/test`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      })

      const data = await response.json()
      alert(data.success ? 'Test webhook sent successfully!' : `Webhook test failed: ${data.data?.reason || 'Unknown error'}`)
    } catch (error) {
      console.error('Failed to test webhook:', error)
    } finally {
      setIsTesting(false)
    }
  }

  const toggleEvent = (event: string) => {
    setWebhookConfig(prev => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter(e => e !== event)
        : [...prev.events, event],
    }))
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Webhook Configuration
        </h3>

        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={webhookConfig.enabled}
                onChange={(e) => setWebhookConfig({ ...webhookConfig, enabled: e.target.checked })}
                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-gray-700 dark:text-gray-300">Enable Webhooks</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Webhook URL
            </label>
            <input
              type="url"
              value={webhookConfig.url}
              onChange={(e) => setWebhookConfig({ ...webhookConfig, url: e.target.value })}
              placeholder="https://your-domain.com/webhook"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Webhook Secret (for signature verification)
            </label>
            <input
              type="text"
              value={webhookConfig.secret}
              onChange={(e) => setWebhookConfig({ ...webhookConfig, secret: e.target.value })}
              placeholder="Leave empty to auto-generate"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <p className="text-xs text-gray-500 mt-1">
              Used to verify webhook signatures. Keep this secure!
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Events to Subscribe
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {availableEvents.map((event) => (
                <label
                  key={event.value}
                  className="flex items-center gap-2 p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={webhookConfig.events.includes(event.value)}
                    onChange={() => toggleEvent(event.value)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{event.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Save Configuration
            </button>
            <button
              onClick={handleTest}
              disabled={isTesting || !webhookConfig.enabled || !webhookConfig.url}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Test Webhook
            </button>
          </div>
        </div>
      </div>

      {config?.lastSuccess && (
        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
          <p className="text-sm text-green-800 dark:text-green-400">
            <CheckCircle2 className="w-4 h-4 inline mr-1" />
            Last successful delivery: {new Date(config.lastSuccess).toLocaleString()}
          </p>
        </div>
      )}

      {config?.lastError && (
        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-800 dark:text-red-400">
            <AlertCircle className="w-4 h-4 inline mr-1" />
            Last error: {config.lastError}
          </p>
        </div>
      )}
    </div>
  )
}

const BrandingTab = ({ branding, onRefresh }: { branding: CustomBranding | null; onRefresh: () => void }) => {
  const [brandingConfig, setBrandingConfig] = useState<CustomBranding>(branding || {
    enabled: false,
    logo: '',
    colors: { primary: '#3B82F6', secondary: '#10B981', accent: '#F59E0B' },
    domain: '',
    customCss: '',
    favicon: '',
  })
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch(`${API_BASE_URL}/v1/enterprise/branding`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(brandingConfig),
      })

      if (response.ok) {
        onRefresh()
      }
    } catch (error) {
      console.error('Failed to save branding:', error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Custom Branding
        </h3>

        <div className="space-y-6">
          {/* Logo Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Company Logo URL
            </label>
            <input
              type="url"
              value={brandingConfig.logo}
              onChange={(e) => setBrandingConfig({ ...brandingConfig, logo: e.target.value })}
              placeholder="https://your-domain.com/logo.png"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            {brandingConfig.logo && (
              <div className="mt-2 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500 mb-2">Preview:</p>
                <img src={brandingConfig.logo} alt="Logo preview" className="h-12 object-contain" />
              </div>
            )}
          </div>

          {/* Colors */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Primary Color
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={brandingConfig.colors.primary}
                  onChange={(e) => setBrandingConfig({
                    ...brandingConfig,
                    colors: { ...brandingConfig.colors, primary: e.target.value },
                  })}
                  className="w-12 h-10 rounded-lg border border-gray-300 dark:border-gray-600"
                />
                <input
                  type="text"
                  value={brandingConfig.colors.primary}
                  onChange={(e) => setBrandingConfig({
                    ...brandingConfig,
                    colors: { ...brandingConfig.colors, primary: e.target.value },
                  })}
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Secondary Color
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={brandingConfig.colors.secondary}
                  onChange={(e) => setBrandingConfig({
                    ...brandingConfig,
                    colors: { ...brandingConfig.colors, secondary: e.target.value },
                  })}
                  className="w-12 h-10 rounded-lg border border-gray-300 dark:border-gray-600"
                />
                <input
                  type="text"
                  value={brandingConfig.colors.secondary}
                  onChange={(e) => setBrandingConfig({
                    ...brandingConfig,
                    colors: { ...brandingConfig.colors, secondary: e.target.value },
                  })}
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Accent Color
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={brandingConfig.colors.accent}
                  onChange={(e) => setBrandingConfig({
                    ...brandingConfig,
                    colors: { ...brandingConfig.colors, accent: e.target.value },
                  })}
                  className="w-12 h-10 rounded-lg border border-gray-300 dark:border-gray-600"
                />
                <input
                  type="text"
                  value={brandingConfig.colors.accent}
                  onChange={(e) => setBrandingConfig({
                    ...brandingConfig,
                    colors: { ...brandingConfig.colors, accent: e.target.value },
                  })}
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Custom Domain */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Custom Domain
            </label>
            <input
              type="text"
              value={brandingConfig.domain}
              onChange={(e) => setBrandingConfig({ ...brandingConfig, domain: e.target.value })}
              placeholder="careers.yourcompany.com"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <p className="text-xs text-gray-500 mt-1">
              Requires DNS configuration. Contact support for setup assistance.
            </p>
          </div>

          {/* Custom CSS */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Custom CSS
            </label>
            <textarea
              value={brandingConfig.customCss}
              onChange={(e) => setBrandingConfig({ ...brandingConfig, customCss: e.target.value })}
              placeholder="/* Add your custom CSS here */"
              rows={6}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Save Branding
          </button>
        </div>
      </div>
    </div>
  )
}

const BulkJobsTab = ({ onRefresh }: { onRefresh: () => void }) => {
  const [jobs, setJobs] = useState('')
  const [format, setFormat] = useState<'json' | 'csv'>('json')
  const [publishImmediately, setPublishImmediately] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<BulkJobResult | null>(null)

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      const response = await fetch(`${API_BASE_URL}/v1/enterprise/jobs/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          jobs: format === 'csv' ? jobs : JSON.parse(jobs),
          format,
          publishImmediately,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setResult(data.data)
        onRefresh()
      }
    } catch (error) {
      console.error('Failed to bulk post jobs:', error)
      alert('Failed to process jobs. Please check your data format.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const sampleJSON = JSON.stringify([
    {
      title: "Senior Software Engineer",
      description: "We are looking for an experienced software engineer...",
      location: "Yangon",
      employmentType: "full-time",
      department: "Engineering",
      salaryMin: 2000000,
      salaryMax: 4000000,
    },
  ], null, 2)

  const sampleCSV = `title,description,location,employmentType,department,salaryMin,salaryMax
Senior Software Engineer,We are looking for an experienced software engineer...,Yangon,full-time,Engineering,2000000,4000000
Product Manager,Lead product initiatives...,Yangon,full-time,Product,2500000,5000000`

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Bulk Job Posting
        </h3>

        <div className="space-y-4">
          <div className="flex gap-4">
            <button
              onClick={() => setFormat('json')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                format === 'json'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              <FileJson className="w-4 h-4" />
              JSON
            </button>
            <button
              onClick={() => setFormat('csv')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                format === 'csv'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              <Table className="w-4 h-4" />
              CSV
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Job Data ({format.toUpperCase()})
            </label>
            <textarea
              value={jobs}
              onChange={(e) => setJobs(e.target.value)}
              placeholder={format === 'json' ? sampleJSON : sampleCSV}
              rows={12}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="publishImmediately"
              checked={publishImmediately}
              onChange={(e) => setPublishImmediately(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="publishImmediately" className="text-sm text-gray-700 dark:text-gray-300">
              Publish jobs immediately (otherwise save as drafts)
            </label>
          </div>

          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !jobs.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Post Jobs
          </button>
        </div>
      </div>

      {result && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Results</h4>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{result.total}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
            </div>
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{result.successful}</p>
              <p className="text-sm text-green-700 dark:text-green-400">Successful</p>
            </div>
            <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{result.failed}</p>
              <p className="text-sm text-red-700 dark:text-red-400">Failed</p>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="mt-4">
              <h5 className="font-medium text-red-600 dark:text-red-400 mb-2">Errors</h5>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {result.errors.map((error, index) => (
                  <div key={index} className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <p className="font-medium text-red-800 dark:text-red-400">{error.job}</p>
                    <ul className="mt-1 text-sm text-red-600 dark:text-red-400">
                      {error.errors.map((e, i) => (
                        <li key={i}>• {e}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}

const SupportTab = () => {
  const [support, setSupport] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [ticket, setTicket] = useState({ subject: '', message: '', priority: 'medium', category: 'general' })
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    fetchSupport()
  }, [])

  const fetchSupport = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/v1/enterprise/support`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setSupport(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch support info:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitTicket = async () => {
    setIsSubmitting(true)
    try {
      const response = await fetch(`${API_BASE_URL}/v1/enterprise/support/ticket`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(ticket),
      })

      if (response.ok) {
        alert('Support ticket created successfully!')
        setTicket({ subject: '', message: '', priority: 'medium', category: 'general' })
      }
    } catch (error) {
      console.error('Failed to create ticket:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Support Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Headphones className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Support Level</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">{support?.level}</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600 dark:text-gray-400">
                Response time: <span className="font-medium">{support?.responseTime} hours</span>
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Globe className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600 dark:text-gray-400 capitalize">
                Availability: {support?.availability?.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>

        {support?.accountManager && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                {support.accountManager.name.charAt(0)}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Account Manager</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{support.accountManager.name}</p>
              </div>
            </div>
            <div className="space-y-2">
              <a
                href={`mailto:${support.accountManager.email}`}
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
              >
                <Mail className="w-4 h-4" />
                {support.accountManager.email}
              </a>
              {support.accountManager.phone && (
                <a
                  href={`tel:${support.accountManager.phone}`}
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                >
                  <Phone className="w-4 h-4" />
                  {support.accountManager.phone}
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Create Ticket */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Create Support Ticket
        </h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Subject"
              value={ticket.subject}
              onChange={(e) => setTicket({ ...ticket, subject: e.target.value })}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <select
              value={ticket.priority}
              onChange={(e) => setTicket({ ...ticket, priority: e.target.value })}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <select
            value={ticket.category}
            onChange={(e) => setTicket({ ...ticket, category: e.target.value })}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="general">General Inquiry</option>
            <option value="technical">Technical Support</option>
            <option value="billing">Billing</option>
            <option value="api">API Integration</option>
            <option value="feature">Feature Request</option>
          </select>
          <textarea
            placeholder="Describe your issue or question..."
            value={ticket.message}
            onChange={(e) => setTicket({ ...ticket, message: e.target.value })}
            rows={5}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <button
            onClick={handleSubmitTicket}
            disabled={isSubmitting || !ticket.subject || !ticket.message}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
            Submit Ticket
          </button>
        </div>
      </div>

      {/* Resources */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <a
          href={support?.documentationUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
        >
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">Documentation</p>
            <p className="text-sm text-gray-500">Browse our guides</p>
          </div>
          <ExternalLink className="w-4 h-4 text-gray-400 ml-auto" />
        </a>
        <Link
          to="/api-docs"
          className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
        >
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <Code className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">API Documentation</p>
            <p className="text-sm text-gray-500">Integration guides</p>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
        </Link>
        <a
          href="#"
          className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
        >
          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
            <Video className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">Video Tutorials</p>
            <p className="text-sm text-gray-500">Learn by watching</p>
          </div>
          <ExternalLink className="w-4 h-4 text-gray-400 ml-auto" />
        </a>
      </div>
    </div>
  )
}

// Main Component
export default function EnterprisePortal() {
  const [activeTab, setActiveTab] = useState('overview')
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [webhookConfig, setWebhookConfig] = useState<WebhookConfig | null>(null)
  const [branding, setBranding] = useState<CustomBranding | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboardData = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/v1/enterprise/dashboard`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setDashboardData(data.data)
      } else if (response.status === 403) {
        setError('Enterprise plan required')
      }
    } catch (error) {
      console.error('Failed to fetch dashboard:', error)
    }
  }, [])

  const fetchTeamMembers = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/v1/enterprise/team`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setTeamMembers(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch team members:', error)
    }
  }, [])

  const fetchApiKeys = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/v1/enterprise/api-keys`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setApiKeys(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch API keys:', error)
    }
  }, [])

  const fetchWebhookConfig = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/v1/enterprise/webhooks`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setWebhookConfig(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch webhook config:', error)
    }
  }, [])

  const fetchBranding = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/v1/enterprise/branding`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setBranding(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch branding:', error)
    }
  }, [])

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([
        fetchDashboardData(),
        fetchTeamMembers(),
        fetchApiKeys(),
        fetchWebhookConfig(),
        fetchBranding(),
      ])
      setLoading(false)
    }

    loadData()
  }, [fetchDashboardData, fetchTeamMembers, fetchApiKeys, fetchWebhookConfig, fetchBranding])

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'team', label: 'Team', icon: Users },
    { id: 'api', label: 'API Keys', icon: Key },
    { id: 'webhooks', label: 'Webhooks', icon: Webhook },
    { id: 'branding', label: 'Branding', icon: Palette },
    { id: 'bulk', label: 'Bulk Jobs', icon: Upload },
    { id: 'support', label: 'Support', icon: Headphones },
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <Crown className="w-16 h-16 text-amber-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Enterprise Plan Required
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Upgrade to Enterprise to access advanced features like API access, bulk posting, and dedicated support.
          </p>
          <Link
            to="/enterprise/plans"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Sparkles className="w-5 h-5" />
            View Enterprise Plans
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  Enterprise Portal
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {dashboardData?.company.name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {dashboardData?.plan && (
                <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full text-sm font-medium">
                  {dashboardData.plan.tier} Plan
                </span>
              )}
              <Link
                to="/dashboard"
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="lg:w-64 flex-shrink-0">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                )
              })}
            </nav>

            {/* Quick Links */}
            <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                Resources
              </h4>
              <div className="space-y-2">
                <Link
                  to="/api-docs"
                  className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  <Code className="w-4 h-4" />
                  API Documentation
                </Link>
                <a
                  href="#"
                  className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  <HelpCircle className="w-4 h-4" />
                  Help Center
                </a>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === 'overview' && dashboardData && (
                  <OverviewTab data={dashboardData} onRefresh={fetchDashboardData} />
                )}
                {activeTab === 'team' && (
                  <TeamTab members={teamMembers} onRefresh={fetchTeamMembers} />
                )}
                {activeTab === 'api' && (
                  <ApiKeysTab keys={apiKeys} onRefresh={fetchApiKeys} />
                )}
                {activeTab === 'webhooks' && (
                  <WebhooksTab config={webhookConfig} onRefresh={fetchWebhookConfig} />
                )}
                {activeTab === 'branding' && (
                  <BrandingTab branding={branding} onRefresh={fetchBranding} />
                )}
                {activeTab === 'bulk' && (
                  <BulkJobsTab onRefresh={fetchDashboardData} />
                )}
                {activeTab === 'support' && <SupportTab />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}