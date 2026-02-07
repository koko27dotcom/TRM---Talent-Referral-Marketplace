import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Building2, Users, TrendingUp, DollarSign, CreditCard, 
  Settings, Bell, FileText, BarChart3, Briefcase, 
  Award, Target, Zap, Crown, CheckCircle2, AlertCircle,
  ChevronRight, Download, Calendar, Globe, Shield,
  Sparkles, ArrowUpRight, Clock, PieChart, Wallet,
  Loader2
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

// API Configuration - uses Vite proxy in dev, env variable in production
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

interface SubscriptionTier {
  id: string
  name: string
  price: number
  priceUSD: number
  jobLimit: number
  features: string[]
  popular?: boolean
}

interface BillingHistory {
  id: string
  date: string
  amount: number
  status: 'paid' | 'pending' | 'failed'
  description: string
}

interface CompanyStats {
  totalJobs: number
  activeJobs: number
  totalApplications: number
  hires: number
  referralSpend: number
  views: number
  referralRate?: number
}

interface Job {
  _id: string
  title: string
  applicants: number
  status: 'active' | 'paused' | 'closed'
  views: number
  createdAt: string
}

interface Referrer {
  name: string
  referrals: number
  earnings: number
}

interface ApiAnalytics {
  overview: {
    totalJobs: number
    activeJobs: number
    totalReferrals: number
    totalHires: number
    totalSpent: number
  }
  jobStats: {
    totalJobs: number
    activeJobs: number
    totalViews: number
    totalApplications: number
    totalReferrals: number
    totalHires: number
  }
  referralStats: {
    totalReferrals: number
    hired: number
    pending: number
    rejected: number
    totalSpent: number
    pendingSpend: number
  }
}

interface CompanyData {
  _id: string
  name: string
  logo?: string
  currentSubscription?: {
    planId?: string
    status: string
    currentPeriodEnd: string
  }
  stats?: {
    totalViews: number
    totalApplications: number
    totalHires: number
  }
  jobPostingLimit: number
  activeJobCount: number
}

const subscriptionTiers: SubscriptionTier[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 99000,
    priceUSD: 49,
    jobLimit: 5,
    features: [
      'Post up to 5 active jobs',
      'Basic analytics dashboard',
      'Email support',
      'Standard job visibility',
      'Basic referral tracking'
    ]
  },
  {
    id: 'growth',
    name: 'Growth',
    price: 299000,
    priceUSD: 149,
    jobLimit: 20,
    popular: true,
    features: [
      'Post up to 20 active jobs',
      'Advanced analytics & reports',
      'Priority support (24h)',
      'Featured job listings',
      'Custom referral bonuses',
      'Company branding page',
      'Applicant tracking system'
    ]
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 999000,
    priceUSD: 499,
    jobLimit: -1,
    features: [
      'Unlimited job postings',
      'Real-time analytics API',
      'Dedicated account manager',
      'Premium job placement',
      'White-label options',
      'Custom integrations',
      'Multi-user access (10)',
      'Advanced referral workflows'
    ]
  }
]

const billingHistory: BillingHistory[] = [
  { id: '1', date: '2024-01-15', amount: 299000, status: 'paid', description: 'Growth Plan - Monthly' },
  { id: '2', date: '2023-12-15', amount: 299000, status: 'paid', description: 'Growth Plan - Monthly' },
  { id: '3', date: '2023-11-15', amount: 299000, status: 'paid', description: 'Growth Plan - Monthly' }
]

export default function CorporateDashboard() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'overview' | 'billing' | 'settings' | 'analytics'>('overview')
  const [currentTier, setCurrentTier] = useState<SubscriptionTier>(subscriptionTiers[1])
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [currency, setCurrency] = useState<'MMK' | 'USD'>('MMK')
  
  // Data states
  const [company, setCompany] = useState<CompanyData | null>(null)
  const [stats, setStats] = useState<CompanyStats>({
    totalJobs: 0,
    activeJobs: 0,
    totalApplications: 0,
    hires: 0,
    referralSpend: 0,
    views: 0,
    referralRate: 0
  })
  const [jobs, setJobs] = useState<Job[]>([])
  const [topReferrers, setTopReferrers] = useState<Referrer[]>([])
  
  // Loading and error states
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Get auth token from localStorage
  const getAuthToken = () => {
    return localStorage.getItem('token')
  }

  // Get user from localStorage
  const getUser = () => {
    const userData = localStorage.getItem('user')
    if (userData && userData !== 'undefined' && userData !== 'null') {
      try {
        return JSON.parse(userData)
      } catch (e) {
        return null
      }
    }
    return null
  }

  // Check authentication on mount
  useEffect(() => {
    const token = getAuthToken()
    const user = getUser()
    
    if (!token || !user) {
      setIsAuthenticated(false)
      setLoading(false)
      navigate('/login')
    } else {
      setIsAuthenticated(true)
      // Load company data
      fetchCompanyData()
    }
  }, [navigate])

  // Fetch all company data
  const fetchCompanyData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const token = getAuthToken()
      const user = getUser()
      
      if (!token || !user?.companyId) {
        throw new Error('Authentication required or no company associated')
      }

      const companyId = user.companyId

      // Fetch company analytics, jobs, and referrals in parallel
      const [analyticsRes, jobsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/companies/${companyId}/analytics`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }),
        fetch(`${API_BASE_URL}/companies/${companyId}/jobs?limit=5`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
      ])

      // Process analytics response
      if (analyticsRes.ok) {
        const analyticsData = await analyticsRes.json()
        if (analyticsData.success && analyticsData.data) {
          const apiData: ApiAnalytics = analyticsData.data
          
          setStats({
            totalJobs: apiData.overview.totalJobs || 0,
            activeJobs: apiData.overview.activeJobs || 0,
            totalApplications: apiData.jobStats.totalApplications || 0,
            hires: apiData.overview.totalHires || 0,
            referralSpend: apiData.overview.totalSpent || 0,
            views: apiData.jobStats.totalViews || 0,
            referralRate: apiData.overview.totalReferrals > 0 
              ? Math.round((apiData.overview.totalHires / apiData.overview.totalReferrals) * 100)
              : 0
          })

          // Set top referrers from analytics (if available)
          // For now, we'll use mock top referrers since the API doesn't provide this yet
          setTopReferrers([
            { name: 'Aung Kyaw', referrals: 12, earnings: 850000 },
            { name: 'Su Su', referrals: 8, earnings: 620000 },
            { name: 'Min Thu', referrals: 6, earnings: 480000 }
          ])
        }
      }

      // Process jobs response
      if (jobsRes.ok) {
        const jobsData = await jobsRes.json()
        if (jobsData.success && jobsData.data?.jobs) {
          const mappedJobs: Job[] = jobsData.data.jobs.map((job: any) => ({
            _id: job._id,
            title: job.title,
            applicants: job.stats?.applications || 0,
            status: job.status === 'active' ? 'active' : 'paused',
            views: job.stats?.views || 0,
            createdAt: job.createdAt
          }))
          setJobs(mappedJobs)
        }
      }

      // Fetch company details
      const companyRes = await fetch(`${API_BASE_URL}/companies/${companyId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (companyRes.ok) {
        const companyData = await companyRes.json()
        if (companyData.success && companyData.data?.company) {
          setCompany(companyData.data.company)
        }
      }

    } catch (err) {
      console.error('Error fetching company data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const formatPrice = (price: number, isUSD: boolean = false) => {
    if (isUSD || currency === 'USD') {
      return `$${price.toLocaleString()}`
    }
    return `${price.toLocaleString()} MMK`
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 pt-20 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
          <p className="text-slate-600 font-medium">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 pt-20 flex items-center justify-center">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Error Loading Dashboard</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <button 
            onClick={fetchCompanyData}
            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 pt-20 flex items-center justify-center">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Authentication Required</h2>
          <p className="text-slate-600 mb-6">Please log in to access the corporate dashboard.</p>
          <Link 
            to="/login"
            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors inline-block"
          >
            Go to Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-20">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                <Building2 className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{company?.name || 'Company Dashboard'}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-3 py-1 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold rounded-full">
                    {currentTier.name} Plan
                  </span>
                  <span className="text-slate-500 text-sm">
                    {stats.activeJobs} of {currentTier.jobLimit === -1 ? '∞' : currentTier.jobLimit} jobs used
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setShowUpgradeModal(true)}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all"
              >
                Upgrade Plan
              </button>
              <Link 
                to="/post-job"
                className="px-6 py-3 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-800 transition-all"
              >
                Post New Job
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-slate-200 sticky top-20 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-8">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'analytics', label: 'Analytics', icon: TrendingUp },
              { id: 'billing', label: 'Billing', icon: CreditCard },
              { id: 'settings', label: 'Settings', icon: Settings }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-4 border-b-2 font-medium transition-colors ${
                  activeTab === tab.id 
                    ? 'border-blue-600 text-blue-600' 
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard 
                  icon={Briefcase} 
                  label="Active Jobs" 
                  value={stats.activeJobs} 
                  trend={`${stats.totalJobs} total jobs`}
                  trendUp={true}
                  color="blue"
                />
                <StatCard 
                  icon={Users} 
                  label="Total Applications" 
                  value={stats.totalApplications} 
                  trend="From all job postings"
                  trendUp={true}
                  color="purple"
                />
                <StatCard 
                  icon={CheckCircle2} 
                  label="Successful Hires" 
                  value={stats.hires} 
                  trend={stats.totalApplications > 0 
                    ? `${Math.round((stats.hires / stats.totalApplications) * 100)}% hire rate`
                    : 'No applications yet'}
                  trendUp={true}
                  color="green"
                />
                <StatCard 
                  icon={Wallet} 
                  label="Referral Spend" 
                  value={`${(stats.referralSpend / 1000000).toFixed(2)}M MMK`} 
                  trend={stats.hires > 0 
                    ? `Avg ${Math.round(stats.referralSpend / stats.hires).toLocaleString()} MMK per hire`
                    : 'No hires yet'}
                  trendUp={false}
                  color="amber"
                />
                <StatCard 
                  icon={Globe} 
                  label="Job Views" 
                  value={stats.views.toLocaleString()} 
                  trend="Total impressions"
                  trendUp={true}
                  color="cyan"
                />
                <StatCard 
                  icon={Target} 
                  label="Referral Rate" 
                  value={`${stats.referralRate || 0}%`} 
                  trend="Conversion rate"
                  trendUp={true}
                  color="rose"
                />
              </div>

              {/* Recent Activity & Quick Actions */}
              <div className="grid lg:grid-cols-3 gap-8">
                {/* Recent Jobs */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-slate-900">Recent Job Postings</h3>
                    <Link to="/dashboard" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                      View All
                    </Link>
                  </div>
                  <div className="space-y-4">
                    {jobs.length > 0 ? (
                      jobs.map((job) => (
                        <div key={job._id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                          <div className="flex items-center gap-4">
                            <div className={`w-2 h-12 rounded-full ${job.status === 'active' ? 'bg-green-500' : 'bg-amber-500'}`} />
                            <div>
                              <h4 className="font-semibold text-slate-900">{job.title}</h4>
                              <p className="text-sm text-slate-500">{job.applicants} applicants • {job.views} views</p>
                            </div>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            job.status === 'active' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-amber-100 text-amber-700'
                          }`}>
                            {job.status}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-slate-500">
                        <Briefcase className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                        <p>No jobs posted yet</p>
                        <Link to="/post-job" className="text-blue-600 hover:text-blue-700 text-sm font-medium mt-2 inline-block">
                          Post your first job
                        </Link>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="space-y-6">
                  <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl p-6 text-white">
                    <div className="flex items-center gap-3 mb-4">
                      <Sparkles className="w-6 h-6" />
                      <h3 className="font-bold">Pro Tip</h3>
                    </div>
                    <p className="text-white/80 text-sm mb-4">
                      Jobs with referral bonuses get 3x more qualified applicants. Consider adding bonuses to your postings.
                    </p>
                    <button className="w-full py-2 bg-white/20 backdrop-blur-sm rounded-lg text-sm font-medium hover:bg-white/30 transition-colors">
                      Learn More
                    </button>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 p-6">
                    <h3 className="font-bold text-slate-900 mb-4">Quick Actions</h3>
                    <div className="space-y-3">
                      <QuickActionButton icon={Plus} label="Post New Job" onClick={() => navigate('/post-job')} />
                      <QuickActionButton icon={Users} label="View Applicants" onClick={() => navigate('/dashboard')} />
                      <QuickActionButton icon={Download} label="Export Reports" onClick={() => {}} />
                      <QuickActionButton icon={Settings} label="Company Settings" onClick={() => setActiveTab('settings')} />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'billing' && (
            <motion.div
              key="billing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Current Plan */}
              <div className="bg-white rounded-2xl border border-slate-200 p-8">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Current Plan: {currentTier.name}</h2>
                    <p className="text-slate-500">{formatPrice(currentTier.price)}/month • Renews on Feb 15, 2024</p>
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setShowUpgradeModal(true)}
                      className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
                    >
                      Change Plan
                    </button>
                    <button className="px-6 py-3 border border-slate-300 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              </div>

              {/* Billing History */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-200">
                  <h3 className="text-lg font-bold text-slate-900">Billing History</h3>
                </div>
                <div className="divide-y divide-slate-200">
                  {billingHistory.map((bill) => (
                    <div key={bill.id} className="p-6 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
                          <FileText className="w-6 h-6 text-slate-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{bill.description}</p>
                          <p className="text-sm text-slate-500">{bill.date}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-bold text-slate-900">{formatPrice(bill.amount)}</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          bill.status === 'paid' 
                            ? 'bg-green-100 text-green-700' 
                            : bill.status === 'pending'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {bill.status}
                        </span>
                        <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                          Download
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'analytics' && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Analytics Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                  <h3 className="text-lg font-bold text-slate-900 mb-6">Referral Performance</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Referral Conversion Rate</span>
                      <span className="font-bold text-slate-900">{stats.referralRate || 0}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full" 
                        style={{ width: `${Math.min(stats.referralRate || 0, 100)}%` }} 
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Cost per Hire</span>
                      <span className="font-bold text-slate-900">
                        {stats.hires > 0 
                          ? `${Math.round(stats.referralSpend / stats.hires).toLocaleString()} MMK`
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Total Referrals</span>
                      <span className="font-bold text-slate-900">{stats.hires}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Total Spent</span>
                      <span className="font-bold text-slate-900">{(stats.referralSpend / 1000000).toFixed(2)}M MMK</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                  <h3 className="text-lg font-bold text-slate-900 mb-6">Top Referrers</h3>
                  <div className="space-y-4">
                    {topReferrers.length > 0 ? (
                      topReferrers.map((referrer, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                              {referrer.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">{referrer.name}</p>
                              <p className="text-xs text-slate-500">{referrer.referrals} successful referrals</p>
                            </div>
                          </div>
                          <span className="font-bold text-green-600">{formatPrice(referrer.earnings)}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-slate-500">
                        <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                        <p>No referrer data available</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl"
            >
              <div className="bg-white rounded-2xl border border-slate-200 p-8 space-y-8">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-4">Company Information</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Company Name</label>
                      <input 
                        type="text" 
                        defaultValue={company?.name || ''} 
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Website</label>
                      <input 
                        type="url" 
                        defaultValue="https://techcorp.mm" 
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
                      <textarea 
                        rows={4} 
                        defaultValue="Leading technology company in Myanmar..." 
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-200">
                  <h3 className="text-lg font-bold text-slate-900 mb-4">Preferences</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-900">Email Notifications</p>
                        <p className="text-sm text-slate-500">Receive updates about new applicants</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" defaultChecked className="sr-only peer" />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-900">Public Profile</p>
                        <p className="text-sm text-slate-500">Make your company visible to job seekers</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" defaultChecked className="sr-only peer" />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-200">
                  <button className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors">
                    Save Changes
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Upgrade Modal */}
      <AnimatePresence>
        {showUpgradeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowUpgradeModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl max-w-5xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-8">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-slate-900 mb-2">Choose Your Plan</h2>
                  <p className="text-slate-500">Select the perfect plan for your hiring needs</p>
                  <div className="flex items-center justify-center gap-4 mt-6">
                    <span className={`text-sm font-medium ${currency === 'MMK' ? 'text-slate-900' : 'text-slate-400'}`}>MMK</span>
                    <button 
                      onClick={() => setCurrency(currency === 'MMK' ? 'USD' : 'MMK')}
                      className="relative w-14 h-7 bg-slate-200 rounded-full transition-colors"
                    >
                      <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-all ${currency === 'USD' ? 'left-8' : 'left-1'}`} />
                    </button>
                    <span className={`text-sm font-medium ${currency === 'USD' ? 'text-slate-900' : 'text-slate-400'}`}>USD</span>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                  {subscriptionTiers.map((tier) => (
                    <div 
                      key={tier.id}
                      className={`relative rounded-2xl p-6 ${
                        tier.popular 
                          ? 'bg-gradient-to-br from-blue-600 to-purple-600 text-white ring-4 ring-blue-500/20' 
                          : 'bg-white border border-slate-200'
                      }`}
                    >
                      {tier.popular && (
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                          <span className="px-4 py-1 bg-amber-400 text-amber-900 text-xs font-bold rounded-full">
                            Most Popular
                          </span>
                        </div>
                      )}
                      <div className="text-center mb-6">
                        <h3 className={`text-xl font-bold mb-2 ${tier.popular ? 'text-white' : 'text-slate-900'}`}>
                          {tier.name}
                        </h3>
                        <div className="flex items-baseline justify-center gap-1">
                          <span className={`text-4xl font-bold ${tier.popular ? 'text-white' : 'text-slate-900'}`}>
                            {formatPrice(currency === 'USD' ? tier.priceUSD : tier.price)}
                          </span>
                          <span className={`text-sm ${tier.popular ? 'text-white/70' : 'text-slate-500'}`}>/mo</span>
                        </div>
                      </div>
                      <ul className="space-y-3 mb-8">
                        {tier.features.map((feature, i) => (
                          <li key={i} className="flex items-start gap-3">
                            <CheckCircle2 className={`w-5 h-5 flex-shrink-0 ${tier.popular ? 'text-white' : 'text-green-500'}`} />
                            <span className={`text-sm ${tier.popular ? 'text-white/90' : 'text-slate-600'}`}>{feature}</span>
                          </li>
                        ))}
                      </ul>
                      <button 
                        onClick={() => {
                          setCurrentTier(tier)
                          setShowUpgradeModal(false)
                        }}
                        className={`w-full py-3 rounded-xl font-semibold transition-all ${
                          tier.popular 
                            ? 'bg-white text-blue-600 hover:bg-blue-50' 
                            : 'bg-slate-900 text-white hover:bg-slate-800'
                        }`}
                      >
                        {currentTier.id === tier.id ? 'Current Plan' : 'Select Plan'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, trend, trendUp, color }: {
  icon: any
  label: string
  value: string | number
  trend: string
  trendUp: boolean
  color: string
}) {
  const colorClasses: Record<string, string> = {
    blue: 'from-blue-500 to-blue-600',
    purple: 'from-purple-500 to-purple-600',
    green: 'from-green-500 to-green-600',
    amber: 'from-amber-500 to-amber-600',
    cyan: 'from-cyan-500 to-cyan-600',
    rose: 'from-rose-500 to-rose-600'
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
        <span className={`flex items-center gap-1 text-xs font-medium ${trendUp ? 'text-green-600' : 'text-slate-500'}`}>
          {trendUp && <ArrowUpRight className="w-3 h-3" />}
          {trend}
        </span>
      </div>
      <p className="text-slate-500 text-sm mb-1">{label}</p>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
    </motion.div>
  )
}

function QuickActionButton({ icon: Icon, label, onClick }: { icon: any, label: string, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors text-left"
    >
      <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
        <Icon className="w-5 h-5 text-blue-600" />
      </div>
      <span className="font-medium text-slate-700">{label}</span>
      <ChevronRight className="w-4 h-4 text-slate-400 ml-auto" />
    </button>
  )
}

function Plus({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  )
}
