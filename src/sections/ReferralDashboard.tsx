import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Trophy, Users, DollarSign, Copy, TrendingUp, Share2,
  Gift, Target, Zap, Crown, Medal, Star, ChevronRight,
  Linkedin, Facebook, Twitter, Link2, CheckCircle2,
  Clock, ArrowUpRight, Sparkles, Flame, Award, Loader2,
  AlertCircle, Network, BarChart3
} from 'lucide-react'
import InviteGenerator from '../components/InviteGenerator'
import NetworkDashboard from '../components/NetworkDashboard'
import TierProgress from '../components/TierProgress'

// API Configuration - uses Vite proxy in dev, env variable in production
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

// Types
interface ReferralActivity {
  id: string
  name: string
  job: string
  company: string
  status: 'applied' | 'interview' | 'hired' | 'rejected'
  reward: number
  date: string
  avatar?: string
}

interface LeaderboardUser {
  rank: number
  name: string
  referrals: number
  earnings: number
  avatar?: string
  isCurrentUser?: boolean
}

interface Achievement {
  id: string
  icon: React.ElementType
  title: string
  description: string
  progress: number
  total: number
  unlocked: boolean
  color: string
}

interface ReferralStats {
  earnings: number
  totalReferrals: number
  successfulHires: number
  pendingAmount: number
  rank: number
  streak: number
}

// API Types
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

export default function ReferralDashboard() {
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'leaderboard' | 'rewards' | 'network' | 'tiers'>('overview')
  const [showShareModal, setShowShareModal] = useState(false)
  const [animatedEarnings, setAnimatedEarnings] = useState(0)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  
  // API State
  const [stats, setStats] = useState<ReferralStats>({
    earnings: 0,
    totalReferrals: 0,
    successfulHires: 0,
    pendingAmount: 0,
    rank: 0,
    streak: 0
  })
  const [activities, setActivities] = useState<ReferralActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [referralCode, setReferralCode] = useState('')
  
  const referralLink = `${window.location.origin}/ref/${referralCode || 'TRM-REF-2024'}`

  // Get auth token from localStorage
  const getAuthToken = () => {
    return localStorage.getItem('token')
  }

  // Check authentication on mount
  useEffect(() => {
    const token = getAuthToken()
    if (!token) {
      setIsAuthenticated(false)
      setLoading(false)
    } else {
      setIsAuthenticated(true)
    }
  }, [])

  // Fetch stats from API
  const fetchStats = async () => {
    try {
      const token = getAuthToken()
      if (!token) {
        throw new Error('No authentication token found')
      }

      const response = await fetch(`${API_BASE_URL}/referrals/my-stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch stats')
      }

      const data = await response.json()
      
      if (data.success && data.data) {
        const apiStats: ApiReferralStats = data.data
        setStats({
          earnings: apiStats.totalEarnings || 0,
          totalReferrals: apiStats.totalReferrals || 0,
          successfulHires: apiStats.hired || 0,
          pendingAmount: apiStats.pendingEarnings || 0,
          rank: 7, // TODO: Get from leaderboard API
          streak: 12 // TODO: Calculate from activity
        })
      }
    } catch (err) {
      console.error('Error fetching stats:', err)
      setError(err instanceof Error ? err.message : 'Failed to load stats')
    }
  }

  // Fetch referrals from API
  const fetchReferrals = async () => {
    try {
      const token = getAuthToken()
      if (!token) {
        throw new Error('No authentication token found')
      }

      const response = await fetch(`${API_BASE_URL}/referrals`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch referrals')
      }

      const data = await response.json()
      
      if (data.success && data.data && data.data.referrals) {
        const apiReferrals: ApiReferral[] = data.data.referrals
        
        // Map API referrals to component's activity format
        const mappedActivities: ReferralActivity[] = apiReferrals.map((referral) => {
          // Map API status to component status
          let status: 'applied' | 'interview' | 'hired' | 'rejected' = 'applied'
          if (['hired', 'payment_pending', 'paid'].includes(referral.status)) {
            status = 'hired'
          } else if (['interview_scheduled', 'interview_completed', 'offer_extended'].includes(referral.status)) {
            status = 'interview'
          } else if (referral.status === 'rejected') {
            status = 'rejected'
          }

          // Calculate reward based on status
          const reward = ['paid', 'payment_pending'].includes(referral.status) ? referral.referrerPayout : 0

          // Format date
          const date = new Date(referral.submittedAt)
          const now = new Date()
          const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
          let dateStr: string
          if (diffDays === 0) dateStr = 'Today'
          else if (diffDays === 1) dateStr = 'Yesterday'
          else if (diffDays < 7) dateStr = `${diffDays} days ago`
          else if (diffDays < 30) dateStr = `${Math.floor(diffDays / 7)} weeks ago`
          else dateStr = `${Math.floor(diffDays / 30)} months ago`

          return {
            id: referral._id,
            name: referral.referredPerson.name,
            job: referral.jobId?.title || 'Unknown Job',
            company: referral.jobId?.companyId?.name || 'Unknown Company',
            status,
            reward,
            date: dateStr,
            avatar: referral.referredPerson.name[0]?.toUpperCase()
          }
        })

        setActivities(mappedActivities)
      }
    } catch (err) {
      console.error('Error fetching referrals:', err)
      setError(err instanceof Error ? err.message : 'Failed to load referrals')
    }
  }

  // Fetch user data to get referral code
  const fetchUserData = async () => {
    try {
      const userStr = localStorage.getItem('user')
      if (userStr) {
        const user = JSON.parse(userStr)
        if (user.referrerProfile?.referralCode) {
          setReferralCode(user.referrerProfile.referralCode)
        } else if (user.referralCode) {
          setReferralCode(user.referralCode)
        }
      }
    } catch (err) {
      console.error('Error fetching user data:', err)
    }
  }

  // Load all data on mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      setError(null)
      
      try {
        await Promise.all([
          fetchStats(),
          fetchReferrals(),
          fetchUserData()
        ])
      } catch (err) {
        console.error('Error loading dashboard data:', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  // Animate earnings on mount
  useEffect(() => {
    if (stats.earnings === 0 || loading) return
    
    const duration = 1500
    const steps = 60
    const increment = stats.earnings / steps
    let current = 0
    
    const timer = setInterval(() => {
      current += increment
      if (current >= stats.earnings) {
        setAnimatedEarnings(stats.earnings)
        clearInterval(timer)
      } else {
        setAnimatedEarnings(Math.floor(current))
      }
    }, duration / steps)

    return () => clearInterval(timer)
  }, [stats.earnings, loading])

  const copyCode = () => {
    navigator.clipboard.writeText(referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const shareOptions = [
    { name: 'Copy Link', icon: Link2, action: copyCode, color: 'bg-slate-100 hover:bg-slate-200' },
    { name: 'Facebook', icon: Facebook, action: () => window.open(`https://facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`, '_blank'), color: 'bg-blue-100 hover:bg-blue-200 text-blue-600' },
    { name: 'LinkedIn', icon: Linkedin, action: () => window.open(`https://linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralLink)}`, '_blank'), color: 'bg-sky-100 hover:bg-sky-200 text-sky-600' },
    { name: 'Twitter', icon: Twitter, action: () => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(referralLink)}&text=Join me on TRM Referral!`, '_blank'), color: 'bg-slate-100 hover:bg-slate-200' },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'hired': return 'bg-emerald-100 text-emerald-700 border-emerald-200'
      case 'interview': return 'bg-amber-100 text-amber-700 border-amber-200'
      case 'applied': return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'rejected': return 'bg-red-100 text-red-700 border-red-200'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'hired': return <CheckCircle2 className="w-3 h-3" />
      case 'interview': return <Clock className="w-3 h-3" />
      case 'applied': return <ArrowUpRight className="w-3 h-3" />
      default: return null
    }
  }

  // Mock data for leaderboard (not available from API yet)
  const leaderboard: LeaderboardUser[] = [
    { rank: 1, name: 'Thura Aung', referrals: 45, earnings: 850000, avatar: 'TA' },
    { rank: 2, name: 'Su Su', referrals: 38, earnings: 720000, avatar: 'SS' },
    { rank: 3, name: 'Min Thu', referrals: 32, earnings: 650000, avatar: 'MT' },
    { rank: 4, name: 'Khin Lay', referrals: 28, earnings: 580000, avatar: 'KL' },
    { rank: 5, name: 'Zaw Lin', referrals: 25, earnings: 520000, avatar: 'ZL' },
    { rank: 6, name: 'May Thu', referrals: 22, earnings: 480000, avatar: 'MT' },
    { rank: 7, name: 'You', referrals: stats.totalReferrals || 0, earnings: stats.earnings, isCurrentUser: true, avatar: 'ME' },
    { rank: 8, name: 'Aye Mya', referrals: 20, earnings: 420000, avatar: 'AM' },
  ]

  // Mock achievements (not available from API yet)
  const achievements: Achievement[] = [
    { id: '1', icon: Trophy, title: 'First Hire', description: 'Get your first successful referral hire', progress: Math.min(stats.successfulHires, 1), total: 1, unlocked: stats.successfulHires >= 1, color: 'from-yellow-400 to-orange-500' },
    { id: '2', icon: Users, title: 'Network Builder', description: 'Refer 10 people to apply', progress: Math.min(stats.totalReferrals, 10), total: 10, unlocked: stats.totalReferrals >= 10, color: 'from-blue-400 to-cyan-500' },
    { id: '3', icon: Target, title: 'Hiring Pro', description: 'Successfully refer 5 hires', progress: Math.min(stats.successfulHires, 5), total: 5, unlocked: stats.successfulHires >= 5, color: 'from-purple-400 to-pink-500' },
    { id: '4', icon: Flame, title: 'On Fire', description: 'Maintain a 7-day referral streak', progress: stats.streak >= 7 ? 7 : stats.streak, total: 7, unlocked: stats.streak >= 7, color: 'from-red-400 to-rose-500' },
    { id: '5', icon: Crown, title: 'Top Referrer', description: 'Reach #1 on the leaderboard', progress: stats.rank === 1 ? 1 : 0, total: 1, unlocked: stats.rank === 1, color: 'from-amber-400 to-yellow-500' },
    { id: '6', icon: Zap, title: 'Speed Demon', description: 'Refer someone who gets hired within 7 days', progress: stats.successfulHires > 0 ? 1 : 0, total: 1, unlocked: stats.successfulHires > 0, color: 'from-green-400 to-emerald-500' },
  ]

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30 pt-20 pb-24 px-4 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
          <p className="text-slate-600 font-medium">Loading your referral dashboard...</p>
        </div>
      </div>
    )
  }

  // Not Authenticated State
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30 pt-20 pb-24 px-4 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8 shadow-lg border border-blue-100 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Please Sign In</h2>
          <p className="text-slate-600 mb-6">You need to be logged in to view your referral dashboard.</p>
          <button 
            onClick={() => window.location.href = '/login'}
            className="px-6 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    )
  }

  // Error State
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30 pt-20 pb-24 px-4 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8 shadow-lg border border-red-100 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Failed to Load</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30 pt-20 pb-24 px-4">
      {/* Background Decorations */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-200/20 rounded-full blur-3xl" />
        <div className="absolute top-40 right-10 w-96 h-96 bg-purple-200/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-emerald-200/20 rounded-full blur-3xl" />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-slate-800 via-blue-800 to-purple-800 bg-clip-text text-transparent">
                Referral Hub
              </h1>
              <p className="text-slate-500 mt-1">Share opportunities, earn rewards, build your network</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-slate-200">
                <Flame className="w-5 h-5 text-orange-500" />
                <span className="text-sm font-semibold text-slate-700">{stats.streak} day streak</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full shadow-md">
                <Crown className="w-5 h-5 text-white" />
                <span className="text-sm font-semibold text-white">Rank #{stats.rank}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { icon: DollarSign, label: 'Total Earnings', value: `${animatedEarnings.toLocaleString()} MMK`, color: 'from-emerald-500 to-teal-600', bgColor: 'bg-emerald-50' },
            { icon: Users, label: 'Total Referrals', value: stats.totalReferrals.toString(), color: 'from-blue-500 to-indigo-600', bgColor: 'bg-blue-50' },
            { icon: TrendingUp, label: 'Pending', value: `${stats.pendingAmount.toLocaleString()} MMK`, color: 'from-purple-500 to-pink-600', bgColor: 'bg-purple-50' },
            { icon: Trophy, label: 'Successful Hires', value: stats.successfulHires.toString(), color: 'from-amber-500 to-orange-600', bgColor: 'bg-amber-50' },
          ].map((stat, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="group relative bg-white rounded-2xl p-5 shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100 overflow-hidden"
            >
              <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${stat.color} opacity-5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500`} />
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-white mb-3 shadow-lg shadow-${stat.color.split('-')[1]}-200`}>
                <stat.icon size={22} />
              </div>
              <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">{stat.label}</p>
              <p className="text-xl font-bold text-slate-800 mt-1">{stat.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Referral Code & Quick Actions */}
          <div className="lg:col-span-2 space-y-6">
            {/* Referral Code Card */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 text-white shadow-2xl"
            >
              {/* Animated background */}
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full blur-3xl animate-pulse" />
                <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-to-tr from-emerald-500/10 to-cyan-500/10 rounded-full blur-3xl" />
              </div>

              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center">
                    <Gift className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Your Referral Code</h2>
                    <p className="text-slate-400 text-sm">Share with friends and earn when they get hired</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 mt-6">
                  <div className="flex-1 relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl blur-sm" />
                    <div className="relative bg-white/10 backdrop-blur-md rounded-xl px-6 py-4 font-mono text-2xl text-center border border-white/20 flex items-center justify-between">
                      <span className="tracking-wider">{referralCode || 'TRM-REF-2024'}</span>
                      <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={copyCode}
                      className="px-6 py-4 bg-white text-slate-900 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-slate-100 transition-colors shadow-lg"
                    >
                      {copied ? <CheckCircle2 size={20} className="text-emerald-600" /> : <Copy size={20} />}
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                    <button 
                      onClick={() => setShowShareModal(true)}
                      className="px-4 py-4 bg-white/10 backdrop-blur-md text-white rounded-xl font-semibold flex items-center justify-center hover:bg-white/20 transition-colors border border-white/20"
                    >
                      <Share2 size={20} />
                    </button>
                  </div>
                </div>

                {/* Progress to next milestone */}
                <div className="mt-6 pt-6 border-t border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-400">Next milestone: Top 5</span>
                    <span className="text-sm font-semibold">{stats.totalReferrals}/25 referrals</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min((stats.totalReferrals / 25) * 100, 100)}%` }}
                      transition={{ delay: 0.5, duration: 1 }}
                      className="h-full bg-gradient-to-r from-blue-400 to-purple-500 rounded-full"
                    />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Navigation Tabs */}
            <div className="bg-white rounded-2xl p-2 shadow-sm border border-slate-100">
              <div className="flex gap-1 overflow-x-auto">
                {[
                  { id: 'overview', label: 'Overview', icon: Target },
                  { id: 'activity', label: 'Activity', icon: Clock },
                  { id: 'network', label: 'Network', icon: Network },
                  { id: 'tiers', label: 'Tiers', icon: BarChart3 },
                  { id: 'leaderboard', label: 'Leader', icon: Trophy },
                  { id: 'rewards', label: 'Rewards', icon: Gift },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                      activeTab === tab.id 
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md' 
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <tab.icon size={16} />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
              {activeTab === 'overview' && (
                <motion.div
                  key="overview"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  {/* Recent Activity */}
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-blue-500" />
                        Recent Activity
                      </h3>
                      <button 
                        onClick={() => setActiveTab('activity')}
                        className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                      >
                        View all <ChevronRight size={16} />
                      </button>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {activities.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">
                          <p>No referral activity yet. Start sharing your code!</p>
                        </div>
                      ) : (
                        activities.slice(0, 3).map((activity, idx) => (
                          <motion.div 
                            key={activity.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                                {activity.name[0]}
                              </div>
                              <div>
                                <p className="font-semibold text-slate-800">{activity.name}</p>
                                <p className="text-sm text-slate-500">{activity.job} at {activity.company}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(activity.status)}`}>
                                {getStatusIcon(activity.status)}
                                {activity.status.charAt(0).toUpperCase() + activity.status.slice(1)}
                              </span>
                              {activity.reward > 0 && (
                                <p className="text-emerald-600 font-bold text-sm mt-1">+{activity.reward.toLocaleString()} MMK</p>
                              )}
                            </div>
                          </motion.div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-6 text-white">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                          <Target className="w-5 h-5" />
                        </div>
                        <span className="font-semibold">Conversion Rate</span>
                      </div>
                      <p className="text-3xl font-bold">
                        {stats.totalReferrals > 0 
                          ? ((stats.successfulHires / stats.totalReferrals) * 100).toFixed(1) 
                          : '0'}%
                      </p>
                      <p className="text-blue-100 text-sm mt-1">
                        {stats.successfulHires} out of {stats.totalReferrals} referrals hired
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl p-6 text-white">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                          <DollarSign className="w-5 h-5" />
                        </div>
                        <span className="font-semibold">Avg. per Hire</span>
                      </div>
                      <p className="text-3xl font-bold">
                        {stats.successfulHires > 0 
                          ? Math.round(stats.earnings / stats.successfulHires).toLocaleString() 
                          : '0'}
                      </p>
                      <p className="text-purple-100 text-sm mt-1">MMK per successful referral</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'activity' && (
                <motion.div
                  key="activity"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"
                >
                  <div className="p-6 border-b border-slate-100">
                    <h3 className="font-bold text-slate-800">All Referral Activity</h3>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {activities.length === 0 ? (
                      <div className="p-8 text-center text-slate-500">
                        <p>No referral activity yet. Start sharing your code!</p>
                      </div>
                    ) : (
                      activities.map((activity, idx) => (
                        <motion.div 
                          key={activity.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                              {activity.name[0]}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800">{activity.name}</p>
                              <p className="text-sm text-slate-500">{activity.job} at {activity.company}</p>
                              <p className="text-xs text-slate-400 mt-1">{activity.date}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(activity.status)}`}>
                              {getStatusIcon(activity.status)}
                              {activity.status.charAt(0).toUpperCase() + activity.status.slice(1)}
                            </span>
                            {activity.reward > 0 && (
                              <p className="text-emerald-600 font-bold text-sm mt-1">+{activity.reward.toLocaleString()} MMK</p>
                            )}
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === 'leaderboard' && (
                <motion.div
                  key="leaderboard"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"
                >
                  <div className="p-6 border-b border-slate-100">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-amber-500" />
                      Top Referrers This Month
                    </h3>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {leaderboard.map((user, idx) => (
                      <motion.div 
                        key={user.rank}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className={`p-4 flex items-center justify-between ${user.isCurrentUser ? 'bg-blue-50/50 border-l-4 border-blue-500' : 'hover:bg-slate-50'} transition-colors`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                            user.rank === 1 ? 'bg-amber-100 text-amber-700' :
                            user.rank === 2 ? 'bg-slate-200 text-slate-700' :
                            user.rank === 3 ? 'bg-orange-100 text-orange-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {user.rank <= 3 ? <Medal size={16} /> : user.rank}
                          </div>
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                            {user.avatar}
                          </div>
                          <div>
                            <p className={`font-semibold ${user.isCurrentUser ? 'text-blue-700' : 'text-slate-800'}`}>
                              {user.name} {user.isCurrentUser && '(You)'}
                            </p>
                            <p className="text-sm text-slate-500">{user.referrals} referrals</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-slate-800">{user.earnings.toLocaleString()} MMK</p>
                          {user.rank <= 3 && (
                            <span className="text-xs text-amber-600 font-medium">Top Performer</span>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {activeTab === 'rewards' && (
                <motion.div
                  key="rewards"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  {achievements.map((achievement, idx) => (
                    <motion.div 
                      key={achievement.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className={`bg-white rounded-2xl p-6 shadow-sm border ${achievement.unlocked ? 'border-slate-200' : 'border-slate-100 opacity-60'} transition-all hover:shadow-md`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${achievement.color} flex items-center justify-center text-white shadow-lg ${!achievement.unlocked && 'grayscale'}`}>
                          <achievement.icon size={24} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-bold text-slate-800">{achievement.title}</h4>
                            {achievement.unlocked && (
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full">
                                Unlocked
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-500 mb-3">{achievement.description}</p>
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full bg-gradient-to-r ${achievement.color}`}
                                style={{ width: `${Math.min((achievement.progress / achievement.total) * 100, 100)}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium text-slate-600">
                              {achievement.progress}/{achievement.total}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}

              {activeTab === 'network' && (
                <motion.div
                  key="network"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <NetworkDashboard embedded />
                </motion.div>
              )}

              {activeTab === 'tiers' && (
                <motion.div
                  key="tiers"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <TierProgress embedded />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Quick Share */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100"
            >
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Share2 className="w-5 h-5 text-blue-500" />
                Quick Share
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {shareOptions.slice(0, 4).map((option) => (
                  <button
                    key={option.name}
                    onClick={option.action}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl transition-all ${option.color}`}
                  >
                    <option.icon size={18} />
                    <span className="text-sm font-medium">{option.name}</span>
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Top Earners */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100"
            >
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-500" />
                Top Earners
              </h3>
              <div className="space-y-4">
                {leaderboard.slice(0, 5).map((user, idx) => (
                  <div key={user.rank} className="flex items-center gap-3">
                    <span className={`w-6 text-center font-bold text-sm ${
                      idx === 0 ? 'text-amber-500' :
                      idx === 1 ? 'text-slate-500' :
                      idx === 2 ? 'text-orange-500' :
                      'text-slate-400'
                    }`}>
                      {idx + 1}
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                      {user.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 text-sm truncate">{user.name}</p>
                    </div>
                    <span className="font-bold text-slate-700 text-sm">
                      {(user.earnings / 1000).toFixed(0)}K
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* How it Works */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-6 text-white"
            >
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Star className="w-5 h-5" />
                How it Works
              </h3>
              <div className="space-y-4">
                {[
                  { step: '1', text: 'Share your unique referral code' },
                  { step: '2', text: 'Friends apply using your code' },
                  { step: '3', text: 'Earn rewards when they get hired!' },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm">
                      {item.step}
                    </div>
                    <p className="text-sm text-blue-100">{item.text}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
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
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white mx-auto mb-4">
                  <Share2 size={28} />
                </div>
                <h3 className="text-2xl font-bold text-slate-800">Share & Earn</h3>
                <p className="text-slate-500 mt-2">Invite friends and earn rewards when they get hired</p>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 mb-6">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Your Referral Link</p>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={referralLink}
                    readOnly
                    className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600"
                  />
                  <button 
                    onClick={copyCode}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3">
                {shareOptions.map((option) => (
                  <button
                    key={option.name}
                    onClick={option.action}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all ${option.color}`}
                  >
                    <option.icon size={24} />
                    <span className="text-xs font-medium">{option.name}</span>
                  </button>
                ))}
              </div>

              <button 
                onClick={() => setShowShareModal(false)}
                className="w-full mt-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
