import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Shield, Users, Briefcase, Wallet, TrendingUp, AlertCircle,
  CheckCircle2, XCircle, Clock, Search, Filter, Download,
  MoreVertical, ChevronDown, ChevronRight, BarChart3,
  PieChart, Activity, Globe, DollarSign, Settings,
  Bell, LogOut, Lock, Eye, Edit2, Trash2, RefreshCw,
  ChevronLeft, ChevronUp, Sparkles, Zap, Target,
  TrendingDown, ArrowUpRight, ArrowDownRight, Loader2,
  CreditCard, Building2, UserCircle, Award
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

// API base URL
const API_URL = import.meta.env.VITE_API_URL || '/api/v1'

interface DashboardStats {
  period: string
  kpis: {
    totalRevenue: number
    paidRevenue: number
    pendingRevenue: number
    totalPaidReferrals: number
    pendingPayouts: number
    totalPlatformFees: number
    totalUsers: number
    activeUsers: number
    newUsersThisPeriod: number
    totalReferrers: number
    totalCorporateUsers: number
    totalCompanies: number
    verifiedCompanies: number
    newCompaniesThisPeriod: number
    totalJobs: number
    activeJobs: number
    newJobsThisPeriod: number
    totalReferralPool: number
    totalReferrals: number
    hiredReferrals: number
    pendingReferrals: number
    inProgressReferrals: number
    newReferralsThisPeriod: number
    conversionRate: number
    avgTimeToHire: number
    totalReferrerPayouts: number
    totalPayoutRequests: number
    pendingPayoutCount: number
    approvedPayoutCount: number
    paidPayoutCount: number
    rejectedPayoutCount: number
  }
  pendingPayouts: PendingPayout[]
  recentActivity: Activity[]
  alerts: Alert[]
}

interface PendingPayout {
  id: string
  requestNumber: string
  referrer: {
    id: string
    name: string
    email: string
    phone?: string
    kycStatus?: string
    availableBalance?: number
  }
  amount: number
  currency: string
  paymentMethod: {
    type: string
    phoneNumber?: string
    accountName?: string
    bankName?: string
    accountNumber?: string
    accountHolderName?: string
  }
  status: string
  referrals: Array<{
    referralId: string
    amount: number
    jobTitle: string
    hiredAt: string
  }>
  requestedAt: string
  approvedAt?: string
  paidAt?: string
  notes?: string
  adminNotes?: string
  daysPending: number
}

interface Activity {
  id: string
  action: string
  description: string
  user: {
    name: string
    email: string
  } | null
  company: {
    name: string
  } | null
  severity: string
  timestamp: string
}

interface Alert {
  type: string
  category: string
  message: string
  severity: string
}

// Dark theme color palette
const colors = {
  bg: {
    primary: 'bg-slate-950',
    secondary: 'bg-slate-900',
    tertiary: 'bg-slate-800',
    card: 'bg-slate-900/50',
    hover: 'hover:bg-slate-800/50',
  },
  border: {
    primary: 'border-slate-800',
    secondary: 'border-slate-700',
  },
  text: {
    primary: 'text-slate-50',
    secondary: 'text-slate-300',
    muted: 'text-slate-400',
    dim: 'text-slate-500',
  },
  accent: {
    blue: 'from-blue-500 to-cyan-500',
    purple: 'from-purple-500 to-pink-500',
    green: 'from-emerald-500 to-teal-500',
    amber: 'from-amber-500 to-orange-500',
    rose: 'from-rose-500 to-red-500',
  }
}

// KPI Card Component
function KpiCard({ 
  icon: Icon, 
  label, 
  value, 
  trend, 
  trendUp, 
  color,
  subtitle,
  alert 
}: { 
  icon: React.ElementType
  label: string
  value: string
  trend: string
  trendUp: boolean
  color: string
  subtitle?: string
  alert?: boolean
}) {
  const colorClasses: Record<string, string> = {
    blue: 'from-blue-500 to-cyan-500',
    purple: 'from-purple-500 to-pink-500',
    green: 'from-emerald-500 to-teal-500',
    amber: 'from-amber-500 to-orange-500',
    rose: 'from-rose-500 to-red-500',
  }

  return (
    <motion.div 
      whileHover={{ y: -4, scale: 1.02 }}
      className={`${colors.bg.card} backdrop-blur-sm rounded-2xl border ${alert ? 'border-red-500/30' : colors.border.primary} p-6 shadow-xl`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center shadow-lg`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
          trendUp ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
        }`}>
          {trend}
        </span>
      </div>
      <p className={`text-sm ${colors.text.muted} mb-1`}>{label}</p>
      <p className={`text-2xl font-bold ${colors.text.primary}`}>{value}</p>
      {subtitle && <p className={`text-xs ${colors.text.dim} mt-2`}>{subtitle}</p>}
    </motion.div>
  )
}

// Stat Pill Component
function StatPill({ 
  icon: Icon, 
  label, 
  value, 
  color 
}: { 
  icon: React.ElementType
  label: string
  value: string
  color: string
}) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    rose: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    green: 'bg-green-500/10 text-green-400 border-green-500/20',
    orange: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  }

  return (
    <div className={`${colorClasses[color]} border rounded-xl p-4 flex flex-col items-center justify-center text-center`}>
      <Icon className="w-5 h-5 mb-2 opacity-80" />
      <p className="text-lg font-bold">{value}</p>
      <p className="text-xs opacity-70">{label}</p>
    </div>
  )
}

// Progress Bar Component
function ProgressBar({ 
  label, 
  value, 
  max, 
  suffix,
  color 
}: { 
  label: string
  value: number
  max: number
  suffix: string
  color: string
}) {
  const percentage = Math.min((value / max) * 100, 100)
  
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-sm ${colors.text.muted}`}>{label}</span>
        <span className={`font-bold ${colors.text.primary}`}>{value}{suffix}</span>
      </div>
      <div className={`w-full ${colors.bg.tertiary} rounded-full h-2`}>
        <div 
          className={`bg-gradient-to-r ${color} h-2 rounded-full transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [activeTab, setActiveTab] = useState<'overview' | 'payouts' | 'companies' | 'users' | 'settings'>('overview')
  const [selectedPayouts, setSelectedPayouts] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [period, setPeriod] = useState('30d')
  
  // Data states
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processingAction, setProcessingAction] = useState(false)
  
  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      
      const response = await fetch(`${API_URL}/admin/dashboard?period=${period}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          navigate('/login')
          return
        }
        throw new Error('Failed to fetch dashboard data')
      }
      
      const data = await response.json()
      setStats(data.data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [period, navigate])
  
  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])
  
  const handleLogout = () => {
    logout()
    navigate('/login')
  }
  
  const handleBulkAction = async (action: 'approve' | 'reject' | 'mark_paid') => {
    if (selectedPayouts.length === 0) return
    
    setProcessingAction(true)
    try {
      const token = localStorage.getItem('token')
      
      const response = await fetch(`${API_URL}/admin/payouts/process`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payoutIds: selectedPayouts,
          action,
        }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to process payouts')
      }
      
      const result = await response.json()
      
      // Refresh data
      await fetchDashboardData()
      setSelectedPayouts([])
      
      // Show success message
      alert(`Successfully processed ${result.data.totalProcessed} payouts`)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to process payouts')
    } finally {
      setProcessingAction(false)
    }
  }
  
  const filteredPayouts = stats?.pendingPayouts.filter(p => {
    const matchesSearch = p.referrer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         p.requestNumber.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter
    return matchesSearch && matchesStatus
  }) || []
  
  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()} MMK`
  }
  
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  if (loading) {
    return (
      <div className={`min-h-screen ${colors.bg.primary} flex items-center justify-center`}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
          <p className={colors.text.muted}>Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`min-h-screen ${colors.bg.primary} flex items-center justify-center`}>
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className={`text-xl font-bold ${colors.text.primary} mb-2`}>Failed to load dashboard</h2>
          <p className={colors.text.muted}>{error}</p>
          <button 
            onClick={fetchDashboardData}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${colors.bg.primary}`}>
      {/* Admin Header */}
      <header className={`${colors.bg.secondary} border-b ${colors.border.primary} sticky top-0 z-50`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className={`font-bold text-lg ${colors.text.primary}`}>Admin Portal</h1>
                <p className={`text-xs ${colors.text.dim}`}>God Mode Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={fetchDashboardData}
                className={`p-2 ${colors.text.muted} hover:text-white transition-colors`}
                title="Refresh data"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              <button className={`relative p-2 ${colors.text.muted} hover:text-white transition-colors`}>
                <Bell className="w-5 h-5" />
                {stats && stats.alerts.length > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                )}
              </button>
              <div className={`flex items-center gap-3 pl-4 border-l ${colors.border.primary}`}>
                <div className="text-right hidden sm:block">
                  <p className={`text-sm font-medium ${colors.text.primary}`}>{user?.name || 'Admin'}</p>
                  <p className={`text-xs ${colors.text.dim}`}>{user?.email}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold shadow-lg shadow-orange-500/20">
                  {user?.name?.charAt(0) || 'A'}
                </div>
                <button 
                  onClick={handleLogout} 
                  className={`p-2 ${colors.text.muted} hover:text-red-400 transition-colors`}
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className={`${colors.bg.secondary} border-b ${colors.border.primary}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'payouts', label: 'Payouts', icon: Wallet, badge: stats?.kpis.pendingPayoutCount },
              { id: 'companies', label: 'Companies', icon: Building2 },
              { id: 'users', label: 'Users', icon: Users },
              { id: 'settings', label: 'Settings', icon: Settings }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors relative ${
                  activeTab === tab.id 
                    ? 'text-blue-400' 
                    : `${colors.text.muted} hover:text-slate-200`
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span className="hidden sm:inline">{tab.label}</span>
                {tab.badge && tab.badge > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                    {tab.badge}
                  </span>
                )}
                {activeTab === tab.id && (
                  <motion.div 
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500"
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && stats && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Period Selector */}
              <div className="flex items-center justify-between">
                <h2 className={`text-2xl font-bold ${colors.text.primary}`}>Dashboard Overview</h2>
                <div className={`flex items-center gap-2 ${colors.bg.tertiary} rounded-lg p-1`}>
                  {['24h', '7d', '30d', '90d', '1y'].map((p) => (
                    <button
                      key={p}
                      onClick={() => setPeriod(p)}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                        period === p 
                          ? 'bg-blue-600 text-white shadow-lg' 
                          : `${colors.text.muted} hover:text-white`
                      }`}
                    >
                      {p === '24h' ? '24 Hours' : p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : p === '90d' ? '90 Days' : '1 Year'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Alerts */}
              {stats.alerts.length > 0 && (
                <div className="space-y-3">
                  {stats.alerts.map((alert, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`flex items-center gap-3 p-4 rounded-xl ${
                        alert.severity === 'high' 
                          ? 'bg-red-500/10 border border-red-500/20' 
                          : alert.severity === 'medium'
                          ? 'bg-amber-500/10 border border-amber-500/20'
                          : 'bg-blue-500/10 border border-blue-500/20'
                      }`}
                    >
                      <AlertCircle className={`w-5 h-5 ${
                        alert.severity === 'high' ? 'text-red-400' : 
                        alert.severity === 'medium' ? 'text-amber-400' : 'text-blue-400'
                      }`} />
                      <p className={colors.text.secondary}>{alert.message}</p>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Financial KPIs */}
              <div>
                <h3 className={`text-lg font-semibold ${colors.text.primary} mb-4 flex items-center gap-2`}>
                  <DollarSign className="w-5 h-5 text-emerald-400" />
                  Financial Overview
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <KpiCard 
                    icon={DollarSign}
                    label="Total Revenue"
                    value={formatCurrency(stats.kpis.totalRevenue)}
                    trend="+12%"
                    trendUp={true}
                    color="green"
                    subtitle={`${formatCurrency(stats.kpis.paidRevenue)} paid`}
                  />
                  <KpiCard 
                    icon={Wallet}
                    label="Platform Fees"
                    value={formatCurrency(stats.kpis.totalPlatformFees)}
                    trend="+8%"
                    trendUp={true}
                    color="blue"
                    subtitle="15% commission rate"
                  />
                  <KpiCard 
                    icon={Clock}
                    label="Pending Payouts"
                    value={formatCurrency(stats.kpis.pendingPayouts)}
                    trend={`${stats.kpis.pendingPayoutCount} requests`}
                    trendUp={false}
                    color="amber"
                    subtitle="Awaiting processing"
                    alert={stats.kpis.pendingPayoutCount > 10}
                  />
                  <KpiCard 
                    icon={CheckCircle2}
                    label="Confirmed Hires"
                    value={stats.kpis.hiredReferrals.toString()}
                    trend={`${stats.kpis.conversionRate.toFixed(1)}% conversion`}
                    trendUp={true}
                    color="purple"
                    subtitle={`${stats.kpis.avgTimeToHire} days avg`}
                  />
                </div>
              </div>

              {/* User & Platform KPIs */}
              <div>
                <h3 className={`text-lg font-semibold ${colors.text.primary} mb-4 flex items-center gap-2`}>
                  <Activity className="w-5 h-5 text-blue-400" />
                  Platform Activity
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                  <StatPill 
                    icon={Users}
                    label="Total Users"
                    value={formatNumber(stats.kpis.totalUsers)}
                    color="blue"
                  />
                  <StatPill 
                    icon={UserCircle}
                    label="Referrers"
                    value={formatNumber(stats.kpis.totalReferrers)}
                    color="purple"
                  />
                  <StatPill 
                    icon={Building2}
                    label="Companies"
                    value={formatNumber(stats.kpis.totalCompanies)}
                    color="emerald"
                  />
                  <StatPill 
                    icon={Briefcase}
                    label="Active Jobs"
                    value={formatNumber(stats.kpis.activeJobs)}
                    color="amber"
                  />
                  <StatPill 
                    icon={Target}
                    label="Total Referrals"
                    value={formatNumber(stats.kpis.totalReferrals)}
                    color="rose"
                  />
                  <StatPill 
                    icon={TrendingUp}
                    label="In Progress"
                    value={formatNumber(stats.kpis.inProgressReferrals)}
                    color="cyan"
                  />
                  <StatPill 
                    icon={CreditCard}
                    label="Paid Out"
                    value={formatNumber(stats.kpis.paidPayoutCount)}
                    color="green"
                  />
                  <StatPill 
                    icon={Award}
                    label="Success Rate"
                    value={`${stats.kpis.conversionRate.toFixed(1)}%`}
                    color="orange"
                  />
                </div>
              </div>

              {/* Charts Row */}
              <div className="grid lg:grid-cols-2 gap-8">
                {/* Revenue Chart */}
                <div className={`${colors.bg.card} backdrop-blur-sm rounded-2xl border ${colors.border.primary} p-6`}>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className={`text-lg font-bold ${colors.text.primary}`}>Revenue Overview</h3>
                    <select className={`text-sm ${colors.bg.tertiary} border ${colors.border.primary} rounded-lg px-3 py-1 ${colors.text.secondary}`}>
                      <option>Last 30 days</option>
                      <option>Last 90 days</option>
                      <option>This year</option>
                    </select>
                  </div>
                  <div className="h-64 flex items-end justify-between gap-2">
                    {[45, 62, 38, 75, 55, 85, 70, 90, 65, 80, 95, 88].map((height, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-2">
                        <div 
                          className="w-full bg-gradient-to-t from-blue-600 to-cyan-400 rounded-t-lg transition-all hover:from-blue-500 hover:to-cyan-300 opacity-80 hover:opacity-100"
                          style={{ height: `${height}%` }}
                        />
                        <span className={`text-xs ${colors.text.dim}`}>{['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'][i]}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Referral Performance */}
                <div className={`${colors.bg.card} backdrop-blur-sm rounded-2xl border ${colors.border.primary} p-6`}>
                  <h3 className={`text-lg font-bold ${colors.text.primary} mb-6`}>Referral Performance</h3>
                  <div className="space-y-6">
                    <ProgressBar 
                      label="Conversion Rate"
                      value={stats.kpis.conversionRate}
                      max={100}
                      suffix="%"
                      color="from-emerald-500 to-teal-400"
                    />
                    <ProgressBar 
                      label="Avg. Time to Hire"
                      value={stats.kpis.avgTimeToHire}
                      max={60}
                      suffix=" days"
                      color="from-blue-500 to-cyan-400"
                    />
                    <ProgressBar 
                      label="Platform Commission Rate"
                      value={15}
                      max={30}
                      suffix="%"
                      color="from-purple-500 to-pink-400"
                    />
                    <div className={`pt-4 border-t ${colors.border.primary}`}>
                      <div className="flex items-center justify-between">
                        <span className={colors.text.muted}>Total Referral Pool</span>
                        <span className={`text-xl font-bold ${colors.text.primary}`}>{formatCurrency(stats.kpis.totalReferralPool)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className={`${colors.bg.card} backdrop-blur-sm rounded-2xl border ${colors.border.primary} overflow-hidden`}>
                <div className={`p-6 border-b ${colors.border.primary} flex items-center justify-between`}>
                  <h3 className={`text-lg font-bold ${colors.text.primary}`}>Recent Activity</h3>
                  <button className={`text-sm ${colors.text.muted} hover:text-blue-400 transition-colors`}>
                    View all
                  </button>
                </div>
                <div className="divide-y divide-slate-800">
                  {stats.recentActivity.slice(0, 5).map((activity, i) => (
                    <motion.div 
                      key={activity.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="p-4 flex items-center gap-4 hover:bg-slate-800/30 transition-colors"
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        activity.severity === 'info' ? 'bg-blue-500/20 text-blue-400' :
                        activity.severity === 'warning' ? 'bg-amber-500/20 text-amber-400' :
                        activity.severity === 'error' ? 'bg-red-500/20 text-red-400' :
                        'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        {activity.severity === 'info' ? <Activity className="w-5 h-5" /> :
                         activity.severity === 'warning' ? <AlertCircle className="w-5 h-5" /> :
                         activity.severity === 'error' ? <XCircle className="w-5 h-5" /> :
                         <CheckCircle2 className="w-5 h-5" />}
                      </div>
                      <div className="flex-1">
                        <p className={`font-medium ${colors.text.primary}`}>{activity.action}</p>
                        <p className={`text-sm ${colors.text.muted}`}>{activity.description}</p>
                      </div>
                      <span className={`text-sm ${colors.text.dim}`}>
                        {new Date(activity.timestamp).toLocaleTimeString()}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'payouts' && (
            <motion.div
              key="payouts"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Filters */}
              <div className={`${colors.bg.card} backdrop-blur-sm rounded-2xl border ${colors.border.primary} p-4`}>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="relative flex-1 min-w-[300px]">
                    <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${colors.text.dim}`} />
                    <input 
                      type="text" 
                      placeholder="Search by referrer or request number..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={`w-full pl-10 pr-4 py-2 ${colors.bg.tertiary} border ${colors.border.primary} rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${colors.text.primary} placeholder-slate-500`}
                    />
                  </div>
                  <select 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className={`px-4 py-2 ${colors.bg.tertiary} border ${colors.border.primary} rounded-xl focus:ring-2 focus:ring-blue-500 ${colors.text.primary}`}
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="paid">Paid</option>
                    <option value="rejected">Rejected</option>
                  </select>
                  {selectedPayouts.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className={`text-sm ${colors.text.muted}`}>{selectedPayouts.length} selected</span>
                      <button 
                        onClick={() => handleBulkAction('approve')}
                        disabled={processingAction}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                      >
                        {processingAction ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Approve'}
                      </button>
                      <button 
                        onClick={() => handleBulkAction('mark_paid')}
                        disabled={processingAction}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                      >
                        {processingAction ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Mark Paid'}
                      </button>
                      <button 
                        onClick={() => handleBulkAction('reject')}
                        disabled={processingAction}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                      >
                        {processingAction ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Reject'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Payouts Table */}
              <div className={`${colors.bg.card} backdrop-blur-sm rounded-2xl border ${colors.border.primary} overflow-hidden`}>
                <table className="w-full">
                  <thead className={`${colors.bg.tertiary} border-b ${colors.border.primary}`}>
                    <tr>
                      <th className="px-6 py-4 text-left">
                        <input 
                          type="checkbox" 
                          checked={selectedPayouts.length === filteredPayouts.length && filteredPayouts.length > 0}
                          onChange={(e) => setSelectedPayouts(e.target.checked ? filteredPayouts.map(p => p.id) : [])}
                          className="rounded border-slate-600 bg-slate-800"
                        />
                      </th>
                      <th className={`px-6 py-4 text-left text-sm font-semibold ${colors.text.secondary}`}>Referrer</th>
                      <th className={`px-6 py-4 text-left text-sm font-semibold ${colors.text.secondary}`}>Request #</th>
                      <th className={`px-6 py-4 text-left text-sm font-semibold ${colors.text.secondary}`}>Amount</th>
                      <th className={`px-6 py-4 text-left text-sm font-semibold ${colors.text.secondary}`}>Payment Method</th>
                      <th className={`px-6 py-4 text-left text-sm font-semibold ${colors.text.secondary}`}>Status</th>
                      <th className={`px-6 py-4 text-left text-sm font-semibold ${colors.text.secondary}`}>Pending</th>
                      <th className={`px-6 py-4 text-left text-sm font-semibold ${colors.text.secondary}`}>Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredPayouts.map((payout) => (
                      <tr key={payout.id} className={`${colors.bg.hover} transition-colors`}>
                        <td className="px-6 py-4">
                          <input 
                            type="checkbox" 
                            checked={selectedPayouts.includes(payout.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedPayouts([...selectedPayouts, payout.id])
                              } else {
                                setSelectedPayouts(selectedPayouts.filter(id => id !== payout.id))
                              }
                            }}
                            className="rounded border-slate-600 bg-slate-800"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                              {payout.referrer.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div>
                              <p className={`font-medium ${colors.text.primary}`}>{payout.referrer.name}</p>
                              <p className={`text-sm ${colors.text.dim}`}>{payout.referrer.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`font-mono text-sm ${colors.text.secondary}`}>{payout.requestNumber}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`font-bold ${colors.text.primary}`}>{formatCurrency(payout.amount)}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className={`text-sm ${colors.text.secondary} capitalize`}>{payout.paymentMethod.type.replace('_', ' ')}</p>
                            {payout.paymentMethod.phoneNumber && (
                              <p className={`text-xs ${colors.text.dim}`}>{payout.paymentMethod.phoneNumber}</p>
                            )}
                            {payout.paymentMethod.accountNumber && (
                              <p className={`text-xs ${colors.text.dim}`}>****{payout.paymentMethod.accountNumber.slice(-4)}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                            payout.status === 'paid' ? 'bg-emerald-500/20 text-emerald-400' :
                            payout.status === 'approved' ? 'bg-blue-500/20 text-blue-400' :
                            payout.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                            'bg-red-500/20 text-red-400'
                          }`}>
                            {payout.status === 'paid' && <CheckCircle2 className="w-3 h-3" />}
                            {payout.status === 'pending' && <Clock className="w-3 h-3" />}
                            {payout.status === 'rejected' && <XCircle className="w-3 h-3" />}
                            {payout.status.charAt(0).toUpperCase() + payout.status.slice(1)}
                          </span>
                        </td>
                        <td className={`px-6 py-4 text-sm ${colors.text.muted}`}>
                          {payout.daysPending} days
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {payout.status === 'pending' && (
                              <>
                                <button 
                                  onClick={() => handleBulkAction('approve')}
                                  className="p-2 text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition-colors" 
                                  title="Approve"
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => handleBulkAction('reject')}
                                  className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors" 
                                  title="Reject"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            {payout.status === 'approved' && (
                              <button 
                                onClick={() => handleBulkAction('mark_paid')}
                                className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
                              >
                                Mark Paid
                              </button>
                            )}
                            <button className={`p-2 ${colors.text.dim} hover:text-white hover:bg-slate-700 rounded-lg transition-colors`}>
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredPayouts.length === 0 && (
                  <div className="p-12 text-center">
                    <Wallet className={`w-12 h-12 ${colors.text.dim} mx-auto mb-4`} />
                    <p className={colors.text.muted}>No payouts found</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'companies' && (
            <motion.div
              key="companies"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className={`${colors.bg.card} backdrop-blur-sm rounded-2xl border ${colors.border.primary} overflow-hidden`}>
                <table className="w-full">
                  <thead className={`${colors.bg.tertiary} border-b ${colors.border.primary}`}>
                    <tr>
                      <th className={`px-6 py-4 text-left text-sm font-semibold ${colors.text.secondary}`}>Company</th>
                      <th className={`px-6 py-4 text-left text-sm font-semibold ${colors.text.secondary}`}>Plan</th>
                      <th className={`px-6 py-4 text-left text-sm font-semibold ${colors.text.secondary}`}>Jobs</th>
                      <th className={`px-6 py-4 text-left text-sm font-semibold ${colors.text.secondary}`}>Total Spend</th>
                      <th className={`px-6 py-4 text-left text-sm font-semibold ${colors.text.secondary}`}>Status</th>
                      <th className={`px-6 py-4 text-left text-sm font-semibold ${colors.text.secondary}`}>Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <Building2 className={`w-12 h-12 ${colors.text.dim} mx-auto mb-4`} />
                        <p className={colors.text.muted}>Company data will be loaded from API</p>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === 'users' && (
            <motion.div
              key="users"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className={`${colors.bg.card} backdrop-blur-sm rounded-2xl border ${colors.border.primary} overflow-hidden`}>
                <table className="w-full">
                  <thead className={`${colors.bg.tertiary} border-b ${colors.border.primary}`}>
                    <tr>
                      <th className={`px-6 py-4 text-left text-sm font-semibold ${colors.text.secondary}`}>User</th>
                      <th className={`px-6 py-4 text-left text-sm font-semibold ${colors.text.secondary}`}>Type</th>
                      <th className={`px-6 py-4 text-left text-sm font-semibold ${colors.text.secondary}`}>Referrals</th>
                      <th className={`px-6 py-4 text-left text-sm font-semibold ${colors.text.secondary}`}>Earnings</th>
                      <th className={`px-6 py-4 text-left text-sm font-semibold ${colors.text.secondary}`}>Status</th>
                      <th className={`px-6 py-4 text-left text-sm font-semibold ${colors.text.secondary}`}>Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <Users className={`w-12 h-12 ${colors.text.dim} mx-auto mb-4`} />
                        <p className={colors.text.muted}>User data will be loaded from API</p>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl space-y-6"
            >
              <div className={`${colors.bg.card} backdrop-blur-sm rounded-2xl border ${colors.border.primary} p-8`}>
                <h3 className={`text-lg font-bold ${colors.text.primary} mb-6`}>Platform Settings</h3>
                <div className="space-y-6">
                  <div>
                    <label className={`block text-sm font-medium ${colors.text.secondary} mb-2`}>Platform Name</label>
                    <input 
                      type="text" 
                      defaultValue="TRM Referral Platform" 
                      className={`w-full px-4 py-3 ${colors.bg.tertiary} border ${colors.border.primary} rounded-xl focus:ring-2 focus:ring-blue-500 ${colors.text.primary}`} 
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium ${colors.text.secondary} mb-2`}>Default Currency</label>
                    <select className={`w-full px-4 py-3 ${colors.bg.tertiary} border ${colors.border.primary} rounded-xl focus:ring-2 focus:ring-blue-500 ${colors.text.primary}`}>
                      <option value="MMK">Myanmar Kyat (MMK)</option>
                      <option value="USD">US Dollar (USD)</option>
                      <option value="THB">Thai Baht (THB)</option>
                      <option value="SGD">Singapore Dollar (SGD)</option>
                    </select>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
