import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  Plus,
  TrendingUp,
  DollarSign,
  Clock,
  Eye,
  MousePointer,
  Users,
  CheckCircle,
  XCircle,
  Crown,
  ChevronRight,
  BarChart3,
  Calendar,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  MoreVertical,
  Zap,
  Target,
  Award
} from 'lucide-react'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

interface FeaturedSlot {
  id: string
  position: number
  slotType: string
  job: {
    _id: string
    title: string
    status: string
  }
  bidAmount: number
  status: 'pending' | 'active' | 'expired' | 'cancelled'
  startDate: string
  endDate: string
  daysRemaining: number
  metrics: {
    views: number
    clicks: number
    applications: number
    hires: number
    ctr: number
    conversionRate: number
  }
  paymentStatus: string
}

interface AvailableSlot {
  position: number
  isAvailable: boolean
  currentBid: number
  minimumBid: number
  minimumNextBid: number
}

interface PricingInfo {
  slotTypes: Record<string, {
    basePrice: number
    minBidIncrement: number
    maxDurationDays: number
  }>
  positionMultipliers: Record<string, number>
  minimumBids: Array<{
    position: number
    carousel: number
    sidebar: number
    banner: number
    homepage_hero: number
  }>
}

interface FeaturedJobManagerProps {
  companyId: string
}

export default function FeaturedJobManager({ companyId }: FeaturedJobManagerProps) {
  const [activeTab, setActiveTab] = useState<'active' | 'history' | 'slots'>('active')
  const [featuredJobs, setFeaturedJobs] = useState<FeaturedSlot[]>([])
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([])
  const [pricingInfo, setPricingInfo] = useState<PricingInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedSlot, setSelectedSlot] = useState<FeaturedSlot | null>(null)
  const [showBidModal, setShowBidModal] = useState(false)
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false)

  // Fetch company's featured jobs
  useEffect(() => {
    const fetchFeaturedJobs = async () => {
      try {
        const token = localStorage.getItem('token')
        const response = await fetch(`${API_BASE_URL}/v1/featured-jobs/my`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })
        const data = await response.json()
        
        if (data.success) {
          setFeaturedJobs(data.data.featuredJobs)
        }
      } catch (err) {
        console.error('Error fetching featured jobs:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchFeaturedJobs()
  }, [])

  // Fetch available slots
  useEffect(() => {
    const fetchAvailableSlots = async () => {
      try {
        const token = localStorage.getItem('token')
        const response = await fetch(`${API_BASE_URL}/v1/featured-jobs/slots`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })
        const data = await response.json()
        
        if (data.success) {
          setAvailableSlots(data.data.slots)
          setPricingInfo(data.data.pricing)
        }
      } catch (err) {
        console.error('Error fetching available slots:', err)
      }
    }

    if (activeTab === 'slots') {
      fetchAvailableSlots()
    }
  }, [activeTab])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'expired':
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
      case 'cancelled':
        return 'bg-red-500/20 text-red-400 border-red-500/30'
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  const getPositionBadge = (position: number) => {
    if (position === 1) return { color: 'bg-yellow-500', icon: Crown, label: '#1' }
    if (position === 2) return { color: 'bg-gray-400', icon: Award, label: '#2' }
    if (position === 3) return { color: 'bg-orange-400', icon: Award, label: '#3' }
    return { color: 'bg-blue-500', icon: Target, label: `#${position}` }
  }

  const filteredJobs = featuredJobs.filter(job => {
    if (activeTab === 'active') return job.status === 'active'
    if (activeTab === 'history') return ['expired', 'cancelled'].includes(job.status)
    return true
  })

  const activeFeaturedCount = featuredJobs.filter(j => j.status === 'active').length
  const totalSpent = featuredJobs
    .filter(j => j.status === 'active' || j.status === 'expired')
    .reduce((sum, j) => sum + j.bidAmount, 0)
  const totalViews = featuredJobs.reduce((sum, j) => sum + (j.metrics?.views || 0), 0)
  const totalApplications = featuredJobs.reduce((sum, j) => sum + (j.metrics?.applications || 0), 0)

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Featured Job Manager</h2>
              <p className="text-sm text-slate-500">Boost your job visibility with premium placements</p>
            </div>
          </div>
          <button
            onClick={() => setShowBidModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all"
          >
            <Plus className="w-4 h-4" />
            Boost New Job
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-slate-50">
        <div className="p-4 bg-white rounded-xl border border-slate-200">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-yellow-500" />
            <span className="text-sm text-slate-500">Active Featured</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{activeFeaturedCount}</p>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-green-500" />
            <span className="text-sm text-slate-500">Total Investment</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{totalSpent.toLocaleString()} MMK</p>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200">
          <div className="flex items-center gap-2 mb-2">
            <Eye className="w-4 h-4 text-blue-500" />
            <span className="text-sm text-slate-500">Total Views</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{totalViews.toLocaleString()}</p>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-purple-500" />
            <span className="text-sm text-slate-500">Applications</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{totalApplications.toLocaleString()}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-2 border-b border-slate-200">
        {(['active', 'history', 'slots'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              activeTab === tab
                ? 'bg-blue-50 text-blue-600'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            {tab === 'active' && activeFeaturedCount > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full">
                {activeFeaturedCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : activeTab === 'slots' ? (
          // Available Slots View
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800">Available Positions</h3>
              <div className="text-sm text-slate-500">
                Minimum bid increases with position priority
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {availableSlots.map((slot) => {
                const badge = getPositionBadge(slot.position)
                return (
                  <motion.div
                    key={slot.position}
                    whileHover={{ scale: 1.02 }}
                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                      slot.isAvailable
                        ? 'border-slate-200 hover:border-blue-300 bg-white'
                        : 'border-orange-200 bg-orange-50'
                    }`}
                    onClick={() => slot.isAvailable && setShowBidModal(true)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className={`w-8 h-8 ${badge.color} rounded-lg flex items-center justify-center`}>
                        <badge.icon className="w-4 h-4 text-white" />
                      </div>
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        slot.isAvailable ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'
                      }`}>
                        {slot.isAvailable ? 'Available' : 'Occupied'}
                      </span>
                    </div>
                    <p className="font-bold text-slate-800">Position {slot.position}</p>
                    <p className="text-sm text-slate-500">
                      Min: {slot.minimumBid.toLocaleString()} MMK
                    </p>
                    {!slot.isAvailable && (
                      <p className="text-xs text-orange-600 mt-1">
                        Current: {slot.currentBid.toLocaleString()} MMK
                      </p>
                    )}
                  </motion.div>
                )
              })}
            </div>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">
              No {activeTab} featured jobs
            </h3>
            <p className="text-slate-500 mb-4">
              {activeTab === 'active'
                ? 'Boost your jobs to get more visibility and applications'
                : 'Your featured job history will appear here'}
            </p>
            {activeTab === 'active' && (
              <button
                onClick={() => setShowBidModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Boost a Job
              </button>
            )}
          </div>
        ) : (
          // Jobs List
          <div className="space-y-4">
            {filteredJobs.map((job) => {
              const badge = getPositionBadge(job.position)
              return (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-white rounded-xl border border-slate-200 hover:border-blue-300 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 ${badge.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
                        <badge.icon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-slate-800">{job.job.title}</h4>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getStatusColor(job.status)}`}>
                            {job.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-500">
                          <span className="flex items-center gap-1">
                            <Target className="w-4 h-4" />
                            Position {job.position}
                          </span>
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4" />
                            {job.bidAmount.toLocaleString()} MMK
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {job.daysRemaining} days left
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedSlot(job)
                          setShowAnalyticsModal(true)
                        }}
                        className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                        title="View Analytics"
                      >
                        <BarChart3 className="w-5 h-5" />
                      </button>
                      {job.status === 'active' && (
                        <button
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          title="Cancel"
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Metrics Preview */}
                  {job.metrics && (
                    <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-100">
                      <div className="text-center">
                        <p className="text-lg font-bold text-slate-800">{job.metrics.views || 0}</p>
                        <p className="text-xs text-slate-500">Views</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-slate-800">{job.metrics.clicks || 0}</p>
                        <p className="text-xs text-slate-500">Clicks</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-slate-800">{job.metrics.applications || 0}</p>
                        <p className="text-xs text-slate-500">Applications</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-slate-800">{job.metrics.ctr?.toFixed(1) || 0}%</p>
                        <p className="text-xs text-slate-500">CTR</p>
                      </div>
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* Analytics Modal */}
      <AnimatePresence>
        {showAnalyticsModal && selectedSlot && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowAnalyticsModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-slate-800">Performance Analytics</h3>
                  <button
                    onClick={() => setShowAnalyticsModal(false)}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <XCircle className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-6">
                {/* Job Info */}
                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800">{selectedSlot.job.title}</h4>
                    <p className="text-sm text-slate-500">Position #{selectedSlot.position} • {selectedSlot.slotType}</p>
                  </div>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-blue-50 rounded-xl text-center">
                    <Eye className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-slate-800">{selectedSlot.metrics?.views || 0}</p>
                    <p className="text-sm text-slate-500">Total Views</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-xl text-center">
                    <MousePointer className="w-6 h-6 text-green-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-slate-800">{selectedSlot.metrics?.clicks || 0}</p>
                    <p className="text-sm text-slate-500">Clicks</p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-xl text-center">
                    <Users className="w-6 h-6 text-purple-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-slate-800">{selectedSlot.metrics?.applications || 0}</p>
                    <p className="text-sm text-slate-500">Applications</p>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-xl text-center">
                    <CheckCircle className="w-6 h-6 text-orange-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-slate-800">{selectedSlot.metrics?.hires || 0}</p>
                    <p className="text-sm text-slate-500">Hires</p>
                  </div>
                </div>

                {/* Performance Rates */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border border-slate-200 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-500">Click-Through Rate</span>
                      <TrendingUp className="w-4 h-4 text-blue-500" />
                    </div>
                    <p className="text-3xl font-bold text-slate-800">{selectedSlot.metrics?.ctr?.toFixed(1) || 0}%</p>
                    <p className="text-xs text-slate-400 mt-1">Industry avg: 2.5%</p>
                  </div>
                  <div className="p-4 border border-slate-200 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-500">Conversion Rate</span>
                      <Target className="w-4 h-4 text-green-500" />
                    </div>
                    <p className="text-3xl font-bold text-slate-800">{selectedSlot.metrics?.conversionRate?.toFixed(1) || 0}%</p>
                    <p className="text-xs text-slate-400 mt-1">Applications per view</p>
                  </div>
                </div>

                {/* ROI */}
                <div className="p-4 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white/60 mb-1">Return on Investment</p>
                      <p className="text-3xl font-bold">
                        {selectedSlot.bidAmount > 0
                          ? (((selectedSlot.metrics?.applications || 0) * 50000) / selectedSlot.bidAmount * 100).toFixed(0)
                          : 0}%
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-white/60 mb-1">Cost per Application</p>
                      <p className="text-xl font-semibold">
                        {selectedSlot.metrics?.applications > 0
                          ? (selectedSlot.bidAmount / selectedSlot.metrics.applications).toFixed(0)
                          : 0} MMK
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
