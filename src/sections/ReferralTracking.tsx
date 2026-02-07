import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Link2, Copy, CheckCircle2, Share2, QrCode, Download,
  TrendingUp, Users, Eye, MousePointer, DollarSign,
  Calendar, Clock, ArrowRight, Sparkles, Gift,
  Facebook, Linkedin, Twitter, MessageCircle, Mail,
  ChevronDown, ChevronUp, Filter, Search, BarChart3,
  Loader2, AlertCircle
} from 'lucide-react'

// API Configuration - uses Vite proxy in dev, env variable in production
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

interface ReferralLink {
  id: string
  jobId: string
  jobTitle: string
  company: string
  code: string
  createdAt: string
  stats: {
    clicks: number
    uniqueClicks: number
    applications: number
    conversions: number
    earnings: number
  }
}

interface ReferralActivity {
  id: string
  type: 'click' | 'application' | 'hire'
  jobTitle: string
  timestamp: string
  referrer?: string
  amount?: number
}

// API Types
interface ApiReferral {
  _id: string
  code: string
  referredPerson: {
    name: string
    email: string
    phone?: string
    currentCompany?: string
    currentTitle?: string
  }
  jobId: {
    _id: string
    title: string
    companyId: {
      name: string
    }
  }
  status: string
  referrerPayout: number
  submittedAt: string
}

interface ApiReferralStats {
  totalReferrals: number
  hired: number
  pending: number
  rejected: number
  withdrawn: number
  totalEarnings: number
  pendingEarnings: number
  availableBalance: number
  pendingBalance: number
}

export default function ReferralTracking() {
  const [referrals, setReferrals] = useState<ReferralLink[]>([])
  const [activities, setActivities] = useState<ReferralActivity[]>([])
  const [selectedReferral, setSelectedReferral] = useState<ReferralLink | null>(null)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [showShareModal, setShowShareModal] = useState(false)
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d')
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Get auth token from localStorage
  const getAuthToken = () => {
    return localStorage.getItem('token')
  }

  // Fetch referrals from API
  const fetchReferrals = async () => {
    try {
      const token = getAuthToken()
      if (!token) {
        throw new Error('No authentication token found. Please login.')
      }

      const response = await fetch(`${API_BASE_URL}/referrals`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication expired. Please login again.')
        }
        throw new Error('Failed to fetch referrals')
      }

      const data = await response.json()
      
      if (data.success && data.data && data.data.referrals) {
        const apiReferrals: ApiReferral[] = data.data.referrals
        
        // Map API referrals to component's data structure
        const mappedReferrals: ReferralLink[] = apiReferrals.map((referral) => {
          // Calculate stats based on referral status
          const isHired = ['hired', 'payment_pending', 'paid'].includes(referral.status)
          const earnings = ['paid', 'payment_pending'].includes(referral.status) 
            ? referral.referrerPayout 
            : 0

          return {
            id: referral._id,
            jobId: referral.jobId?._id || '',
            jobTitle: referral.jobId?.title || 'Unknown Job',
            company: referral.jobId?.companyId?.name || 'Unknown Company',
            code: referral.code,
            createdAt: new Date(referral.submittedAt).toISOString().split('T')[0],
            stats: {
              clicks: 0, // Not tracked in current API
              uniqueClicks: 0, // Not tracked in current API
              applications: 1, // Each referral is an application
              conversions: isHired ? 1 : 0,
              earnings: earnings
            }
          }
        })

        setReferrals(mappedReferrals)

        // Map activities from referrals
        const mappedActivities: ReferralActivity[] = apiReferrals.map((referral) => {
          let type: 'click' | 'application' | 'hire' = 'application'
          if (['hired', 'payment_pending', 'paid'].includes(referral.status)) {
            type = 'hire'
          }

          return {
            id: referral._id,
            type,
            jobTitle: referral.jobId?.title || 'Unknown Job',
            timestamp: referral.submittedAt,
            referrer: referral.referredPerson.name,
            amount: type === 'hire' ? referral.referrerPayout : undefined
          }
        })

        setActivities(mappedActivities)
      } else {
        setReferrals([])
        setActivities([])
      }
    } catch (err) {
      console.error('Error fetching referrals:', err)
      setError(err instanceof Error ? err.message : 'Failed to load referrals')
    }
  }

  // Track referral using public tracking endpoint
  const trackReferral = async (code: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/referrals/track/${code}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to track referral')
      }

      const data = await response.json()
      return data.data
    } catch (err) {
      console.error('Error tracking referral:', err)
      throw err
    }
  }

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      setError(null)
      
      try {
        await fetchReferrals()
      } catch (err) {
        console.error('Error loading tracking data:', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [timeRange])

  const totalStats = {
    clicks: referrals.reduce((sum, r) => sum + r.stats.clicks, 0),
    applications: referrals.reduce((sum, r) => sum + r.stats.applications, 0),
    conversions: referrals.reduce((sum, r) => sum + r.stats.conversions, 0),
    earnings: referrals.reduce((sum, r) => sum + r.stats.earnings, 0)
  }

  const copyToClipboard = (code: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const generateQRCode = (url: string) => {
    // In a real app, this would generate an actual QR code
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`
  }

  const shareOptions = [
    { name: 'Facebook', icon: Facebook, color: 'bg-blue-600', shareUrl: (url: string) => `https://facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` },
    { name: 'LinkedIn', icon: Linkedin, color: 'bg-sky-600', shareUrl: (url: string) => `https://linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}` },
    { name: 'Twitter', icon: Twitter, color: 'bg-sky-500', shareUrl: (url: string) => `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}` },
    { name: 'WhatsApp', icon: MessageCircle, color: 'bg-green-500', shareUrl: (url: string) => `https://wa.me/?text=${encodeURIComponent(url)}` },
    { name: 'Email', icon: Mail, color: 'bg-slate-600', shareUrl: (url: string) => `mailto:?body=${encodeURIComponent(url)}` }
  ]

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 pt-20 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
            <p className="text-slate-600">Loading referral data...</p>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 pt-20 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-center py-20">
            <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
            <p className="text-red-600 font-medium mb-2">Error loading data</p>
            <p className="text-slate-500 text-center max-w-md">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Referral Tracking</h1>
          <p className="text-slate-500">Monitor your referral links and track your earnings</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <TrackingStatCard 
            icon={Eye} 
            label="Total Clicks" 
            value={totalStats.clicks.toLocaleString()}
            trend="+12%"
            trendUp={true}
            color="blue"
          />
          <TrackingStatCard 
            icon={Users} 
            label="Applications" 
            value={totalStats.applications.toLocaleString()}
            trend="+8%"
            trendUp={true}
            color="purple"
          />
          <TrackingStatCard 
            icon={CheckCircle2} 
            label="Conversions" 
            value={totalStats.conversions.toLocaleString()}
            trend="+25%"
            trendUp={true}
            color="green"
          />
          <TrackingStatCard 
            icon={DollarSign} 
            label="Total Earnings" 
            value={`${(totalStats.earnings / 1000).toFixed(0)}K MMK`}
            trend="+18%"
            trendUp={true}
            color="amber"
          />
        </div>

        {/* Time Range Filter */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 bg-white rounded-xl border border-slate-200 p-1">
            {[
              { id: '7d', label: '7 Days' },
              { id: '30d', label: '30 Days' },
              { id: '90d', label: '90 Days' },
              { id: 'all', label: 'All Time' }
            ].map((range) => (
              <button
                key={range.id}
                onClick={() => setTimeRange(range.id as any)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  timeRange === range.id 
                    ? 'bg-blue-600 text-white' 
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors">
            <Download className="w-4 h-4" />
            Export Report
          </button>
        </div>

        {/* Referral Links Table */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-8">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-lg font-bold text-slate-900">Your Referral Links</h2>
          </div>
          {referrals.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-slate-500">No referrals yet. Start referring candidates to see them here!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Job</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Referral Code</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Clicks</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Applications</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Conversions</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Earnings</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {referrals.map((referral) => (
                    <>
                      <tr key={referral.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-semibold text-slate-900">{referral.jobTitle}</p>
                            <p className="text-sm text-slate-500">{referral.company}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <code className="px-3 py-1 bg-slate-100 rounded-lg text-sm font-mono text-slate-700">
                              {referral.code}
                            </code>
                            <button 
                              onClick={() => copyToClipboard(referral.code, `${window.location.origin}/apply/${referral.code}`)}
                              className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                              {copiedCode === referral.code ? (
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                              ) : (
                                <Copy className="w-4 h-4 text-slate-400" />
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Eye className="w-4 h-4 text-slate-400" />
                            <span className="font-medium text-slate-900">{referral.stats.clicks}</span>
                            <span className="text-xs text-slate-400">({referral.stats.uniqueClicks} unique)</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-900">{referral.stats.applications}</td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                            <CheckCircle2 className="w-3 h-3" />
                            {referral.stats.conversions}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-bold text-green-600">
                          {referral.stats.earnings.toLocaleString()} MMK
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => setShowShareModal(true)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Share"
                            >
                              <Share2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => setExpandedRow(expandedRow === referral.id ? null : referral.id)}
                              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                              {expandedRow === referral.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedRow === referral.id && (
                        <tr>
                          <td colSpan={7} className="px-6 py-4 bg-slate-50">
                            <div className="grid md:grid-cols-3 gap-6">
                              {/* QR Code */}
                              <div className="bg-white rounded-xl p-4 text-center">
                                <h4 className="font-semibold text-slate-900 mb-3">QR Code</h4>
                                <img 
                                  src={generateQRCode(`${window.location.origin}/apply/${referral.code}`)} 
                                  alt="QR Code" 
                                  className="w-32 h-32 mx-auto mb-3"
                                />
                                <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                                  Download QR
                                </button>
                              </div>
                              {/* Conversion Funnel */}
                              <div className="bg-white rounded-xl p-4">
                                <h4 className="font-semibold text-slate-900 mb-3">Conversion Funnel</h4>
                                <div className="space-y-3">
                                  <div>
                                    <div className="flex justify-between text-sm mb-1">
                                      <span className="text-slate-600">Clicks to Applications</span>
                                      <span className="font-medium">{referral.stats.clicks > 0 ? ((referral.stats.applications / referral.stats.clicks) * 100).toFixed(1) : 0}%</span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-2">
                                      <div 
                                        className="bg-blue-500 h-2 rounded-full" 
                                        style={{ width: `${referral.stats.clicks > 0 ? (referral.stats.applications / referral.stats.clicks) * 100 : 0}%` }}
                                      />
                                    </div>
                                  </div>
                                  <div>
                                    <div className="flex justify-between text-sm mb-1">
                                      <span className="text-slate-600">Applications to Hires</span>
                                      <span className="font-medium">{referral.stats.applications > 0 ? ((referral.stats.conversions / referral.stats.applications) * 100).toFixed(1) : 0}%</span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-2">
                                      <div 
                                        className="bg-green-500 h-2 rounded-full" 
                                        style={{ width: `${referral.stats.applications > 0 ? (referral.stats.conversions / referral.stats.applications) * 100 : 0}%` }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                              {/* Quick Stats */}
                              <div className="bg-white rounded-xl p-4">
                                <h4 className="font-semibold text-slate-900 mb-3">Quick Stats</h4>
                                <div className="space-y-2">
                                  <div className="flex justify-between">
                                    <span className="text-slate-600">Created</span>
                                    <span className="font-medium">{referral.createdAt}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-600">Avg. Click Value</span>
                                    <span className="font-medium">{referral.stats.clicks > 0 ? (referral.stats.earnings / referral.stats.clicks).toFixed(0) : 0} MMK</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-600">Cost per Hire</span>
                                    <span className="font-medium">{referral.stats.conversions > 0 ? (referral.stats.earnings / referral.stats.conversions).toFixed(0) : 0} MMK</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-6">Recent Activity</h2>
          {activities.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-500">No recent activity to display.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    activity.type === 'hire' ? 'bg-green-100 text-green-600' :
                    activity.type === 'application' ? 'bg-blue-100 text-blue-600' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {activity.type === 'hire' ? <Gift className="w-5 h-5" /> :
                     activity.type === 'application' ? <Users className="w-5 h-5" /> :
                     <MousePointer className="w-5 h-5" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">
                      {activity.type === 'hire' ? 'New hire via your referral' :
                       activity.type === 'application' ? 'New application received' :
                       'Link clicked'}
                      {' '}
                      <span className="text-slate-500">• {activity.jobTitle}</span>
                    </p>
                    {activity.referrer && (
                      <p className="text-sm text-slate-500">Referred by: {activity.referrer}</p>
                    )}
                  </div>
                  {activity.amount && (
                    <span className="font-bold text-green-600">+{activity.amount.toLocaleString()} MMK</span>
                  )}
                  <span className="text-sm text-slate-400">
                    {new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Share Modal */}
      <AnimatePresence>
        {showShareModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowShareModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-slate-900 mb-4">Share Referral Link</h3>
              <div className="grid grid-cols-3 gap-3">
                {shareOptions.map((option) => (
                  <button
                    key={option.name}
                    onClick={() => window.open(option.shareUrl(window.location.href), '_blank')}
                    className={`${option.color} text-white p-4 rounded-xl flex flex-col items-center gap-2 hover:opacity-90 transition-opacity`}
                  >
                    <option.icon className="w-6 h-6" />
                    <span className="text-xs font-medium">{option.name}</span>
                  </button>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-slate-200">
                <p className="text-sm text-slate-500 mb-2">Or copy link</p>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={window.location.href}
                    readOnly
                    className="flex-1 px-4 py-2 bg-slate-100 rounded-lg text-sm text-slate-600"
                  />
                  <button 
                    onClick={() => copyToClipboard('share', window.location.href)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {copiedCode === 'share' ? <CheckCircle2 className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function TrackingStatCard({ icon: Icon, label, value, trend, trendUp, color }: {
  icon: any
  label: string
  value: string
  trend: string
  trendUp: boolean
  color: string
}) {
  const colorClasses: Record<string, string> = {
    blue: 'from-blue-500 to-blue-600',
    purple: 'from-purple-500 to-purple-600',
    green: 'from-green-500 to-green-600',
    amber: 'from-amber-500 to-amber-600'
  }

  return (
    <motion.div 
      whileHover={{ y: -4 }}
      className="bg-white rounded-2xl border border-slate-200 p-6"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <span className={`text-xs font-medium ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
          {trend}
        </span>
      </div>
      <p className="text-slate-500 text-sm mb-1">{label}</p>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
    </motion.div>
  )
}
