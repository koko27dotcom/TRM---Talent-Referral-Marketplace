import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  TrendingUp, TrendingDown, DollarSign, Users, Briefcase,
  PieChart, BarChart3, Activity, Calendar, Download,
  RefreshCw, ArrowUpRight, ArrowDownRight, Filter,
  FileText, Target, Clock, Percent, Wallet
} from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, PieChart as RePieChart,
  Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts'

// Types
interface RevenueOverview {
  current: {
    totalRevenue: number
    mrr: number
    arr: number
    revenueGrowth: number
    revenueGrowthPercentage: number
  } | null
  historical: Array<{
    date: string
    totalRevenue: number
    mrr: number
  }>
  summary: {
    totalRevenue: number
    avgMrr: number
    totalReferrals: number
    successfulReferrals: number
    conversionRate: number
  }
}

interface MRRData {
  current: {
    mrr: number
    arr: number
    netMrrGrowth: number
    breakdown: {
      newMrr: number
      expansionMrr: number
      contractionMrr: number
      churnedMrr: number
    }
  }
  historical: Array<{
    date: string
    mrr: number
    arr: number
  }>
}

interface RevenueBySource {
  source: string
  amount: number
  count: number
  percentage: number
}

interface CompanyRevenue {
  companyId: string
  companyName: string
  amount: number
  jobCount: number
}

interface ConversionRates {
  referralToApplication: number
  applicationToInterview: number
  interviewToHire: number
  referralToHire: number
  jobPostToHire: number
}

interface CohortData {
  cohortMonth: string
  cohortSize: number
  retentionRates: Array<{
    month: number
    rate: number
  }>
  ltv: number
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'MMK',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount).replace('MMK', 'K')
}

const formatNumber = (num: number) => {
  return new Intl.NumberFormat('en-US').format(num)
}

export default function RevenueDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'mrr' | 'sources' | 'companies' | 'conversions' | 'cohorts'>('overview')
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Data states
  const [revenueOverview, setRevenueOverview] = useState<RevenueOverview | null>(null)
  const [mrrData, setMrrData] = useState<MRRData | null>(null)
  const [revenueBySource, setRevenueBySource] = useState<RevenueBySource[]>([])
  const [companyRevenue, setCompanyRevenue] = useState<CompanyRevenue[]>([])
  const [conversionRates, setConversionRates] = useState<ConversionRates | null>(null)
  const [cohorts, setCohorts] = useState<CohortData[]>([])

  const API_URL = import.meta.env.VITE_API_URL || '/api/v1'

  // Fetch data
  useEffect(() => {
    fetchAllData()
  }, [timeRange])

  const fetchAllData = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const token = localStorage.getItem('token')
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }

      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365

      // Fetch all data in parallel
      const [
        overviewRes,
        mrrRes,
        sourceRes,
        companyRes,
        conversionRes,
        cohortRes,
      ] = await Promise.all([
        fetch(`${API_URL}/analytics/revenue/overview?days=${days}`, { headers }),
        fetch(`${API_URL}/analytics/revenue/mrr`, { headers }),
        fetch(`${API_URL}/analytics/revenue/by-source`, { headers }),
        fetch(`${API_URL}/analytics/revenue/by-company?limit=10`, { headers }),
        fetch(`${API_URL}/analytics/conversions/referral-to-hire`, { headers }),
        fetch(`${API_URL}/analytics/cohorts`, { headers }),
      ])

      if (overviewRes.ok) {
        const overviewData = await overviewRes.json()
        setRevenueOverview(overviewData.data)
      }

      if (mrrRes.ok) {
        const mrrDataResult = await mrrRes.json()
        setMrrData(mrrDataResult.data)
      }

      if (sourceRes.ok) {
        const sourceData = await sourceRes.json()
        setRevenueBySource(sourceData.data.breakdown)
      }

      if (companyRes.ok) {
        const companyData = await companyRes.json()
        setCompanyRevenue(companyData.data.companies)
      }

      if (conversionRes.ok) {
        const conversionData = await conversionRes.json()
        setConversionRates(conversionData.data.rates)
      }

      if (cohortRes.ok) {
        const cohortData = await cohortRes.json()
        setCohorts(cohortData.data.cohorts)
      }
    } catch (err) {
      console.error('Error fetching analytics data:', err)
      setError('Failed to load analytics data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleExport = async (reportType: string) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL}/analytics/reports/export`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reportType,
          format: 'json',
        }),
      })

      if (response.ok) {
        const data = await response.json()
        // Create and download file
        const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `trm-revenue-report-${reportType}-${Date.now()}.json`
        a.click()
      }
    } catch (err) {
      console.error('Error exporting report:', err)
    }
  }

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4 }
    }
  }

  // Overview Tab
  const OverviewTab = () => (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div variants={itemVariants} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(revenueOverview?.summary.totalRevenue || 0)}
              </p>
              <div className="flex items-center mt-2">
                {(revenueOverview?.current?.revenueGrowthPercentage || 0) >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                )}
                <span className={`text-sm ${(revenueOverview?.current?.revenueGrowthPercentage || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {Math.abs(revenueOverview?.current?.revenueGrowthPercentage || 0).toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">MRR</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(mrrData?.current.mrr || 0)}
              </p>
              <div className="flex items-center mt-2">
                {(mrrData?.current.netMrrGrowth || 0) >= 0 ? (
                  <ArrowUpRight className="w-4 h-4 text-green-500 mr-1" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-red-500 mr-1" />
                )}
                <span className={`text-sm ${(mrrData?.current.netMrrGrowth || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {formatCurrency(Math.abs(mrrData?.current.netMrrGrowth || 0))}
                </span>
              </div>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <Wallet className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Referrals</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatNumber(revenueOverview?.summary.totalReferrals || 0)}
              </p>
              <div className="flex items-center mt-2">
                <Target className="w-4 h-4 text-blue-500 mr-1" />
                <span className="text-sm text-blue-500">
                  {formatNumber(revenueOverview?.summary.successfulReferrals || 0)} hired
                </span>
              </div>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Conversion Rate</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {(revenueOverview?.summary.conversionRate || 0).toFixed(1)}%
              </p>
              <div className="flex items-center mt-2">
                <Percent className="w-4 h-4 text-orange-500 mr-1" />
                <span className="text-sm text-gray-500">referral to hire</span>
              </div>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg">
              <Activity className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Revenue Chart */}
      <motion.div variants={itemVariants} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Revenue Trend</h3>
          <div className="flex items-center space-x-2">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-500 rounded-full mr-2" />
              <span className="text-sm text-gray-500">Revenue</span>
            </div>
          </div>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={revenueOverview?.historical || []}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                stroke="#9CA3AF"
              />
              <YAxis
                tickFormatter={(value) => `K${(value / 1000).toFixed(0)}`}
                stroke="#9CA3AF"
              />
              <Tooltip
                formatter={(value) => formatCurrency(Number(value))}
                labelFormatter={(label) => new Date(label as string).toLocaleDateString()}
              />
              <Area
                type="monotone"
                dataKey="totalRevenue"
                stroke="#3B82F6"
                fillOpacity={1}
                fill="url(#colorRevenue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div variants={itemVariants} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h4 className="text-sm font-medium text-gray-500 mb-4">Top Revenue Source</h4>
          {revenueBySource.length > 0 ? (
            <div>
              <p className="text-lg font-semibold text-gray-900 capitalize">
                {revenueBySource[0].source.replace('_', ' ')}
              </p>
              <p className="text-2xl font-bold text-blue-600 mt-1">
                {formatCurrency(revenueBySource[0].amount)}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {revenueBySource[0].percentage.toFixed(1)}% of total
              </p>
            </div>
          ) : (
            <p className="text-gray-400">No data available</p>
          )}
        </motion.div>

        <motion.div variants={itemVariants} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h4 className="text-sm font-medium text-gray-500 mb-4">Top Company</h4>
          {companyRevenue.length > 0 ? (
            <div>
              <p className="text-lg font-semibold text-gray-900">
                {companyRevenue[0].companyName}
              </p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {formatCurrency(companyRevenue[0].amount)}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {companyRevenue[0].jobCount} jobs posted
              </p>
            </div>
          ) : (
            <p className="text-gray-400">No data available</p>
          )}
        </motion.div>

        <motion.div variants={itemVariants} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h4 className="text-sm font-medium text-gray-500 mb-4">ARR</h4>
          <p className="text-2xl font-bold text-purple-600">
            {formatCurrency((mrrData?.current.mrr || 0) * 12)}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Annual Recurring Revenue
          </p>
        </motion.div>
      </div>
    </motion.div>
  )

  // MRR Tab
  const MrrTab = () => (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* MRR Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <motion.div variants={itemVariants} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <p className="text-sm text-gray-500">Current MRR</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {formatCurrency(mrrData?.current.mrr || 0)}
          </p>
        </motion.div>

        <motion.div variants={itemVariants} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <p className="text-sm text-gray-500">New MRR</p>
          <p className="text-2xl font-bold text-green-600 mt-1">
            +{formatCurrency(mrrData?.current.breakdown.newMrr || 0)}
          </p>
        </motion.div>

        <motion.div variants={itemVariants} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <p className="text-sm text-gray-500">Expansion</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">
            +{formatCurrency(mrrData?.current.breakdown.expansionMrr || 0)}
          </p>
        </motion.div>

        <motion.div variants={itemVariants} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <p className="text-sm text-gray-500">Contraction</p>
          <p className="text-2xl font-bold text-orange-600 mt-1">
            -{formatCurrency(mrrData?.current.breakdown.contractionMrr || 0)}
          </p>
        </motion.div>

        <motion.div variants={itemVariants} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <p className="text-sm text-gray-500">Churned</p>
          <p className="text-2xl font-bold text-red-600 mt-1">
            -{formatCurrency(mrrData?.current.breakdown.churnedMrr || 0)}
          </p>
        </motion.div>
      </div>

      {/* MRR Trend Chart */}
      <motion.div variants={itemVariants} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">MRR Trend</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={mrrData?.historical || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short' })}
                stroke="#9CA3AF"
              />
              <YAxis
                tickFormatter={(value) => `K${(value / 1000).toFixed(0)}`}
                stroke="#9CA3AF"
              />
              <Tooltip
                formatter={(value) => formatCurrency(Number(value))}
                labelFormatter={(label) => new Date(label as string).toLocaleDateString()}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="mrr"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={false}
                name="MRR"
              />
              <Line
                type="monotone"
                dataKey="arr"
                stroke="#10B981"
                strokeWidth={2}
                dot={false}
                name="ARR"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </motion.div>
  )

  // Sources Tab
  const SourcesTab = () => (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <motion.div variants={itemVariants} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Revenue by Source</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie
                  data={revenueBySource}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry: any) => `${entry.source?.replace('_', ' ') || ''}: ${(entry.percentage || 0).toFixed(1)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="amount"
                >
                  {revenueBySource.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              </RePieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Source Details Table */}
        <motion.div variants={itemVariants} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Source Details</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Source</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Amount</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Count</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">%</th>
                </tr>
              </thead>
              <tbody>
                {revenueBySource.map((source, index) => (
                  <tr key={source.source} className="border-b border-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center">
                        <div
                          className="w-3 h-3 rounded-full mr-2"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="capitalize text-gray-900">
                          {source.source.replace('_', ' ')}
                        </span>
                      </div>
                    </td>
                    <td className="text-right py-3 px-4 font-medium text-gray-900">
                      {formatCurrency(source.amount)}
                    </td>
                    <td className="text-right py-3 px-4 text-gray-500">
                      {source.count}
                    </td>
                    <td className="text-right py-3 px-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {source.percentage.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )

  // Companies Tab
  const CompaniesTab = () => (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <motion.div variants={itemVariants} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Top Companies by Revenue</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={companyRevenue.slice(0, 10)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                type="number"
                tickFormatter={(value) => `K${(value / 1000).toFixed(0)}`}
                stroke="#9CA3AF"
              />
              <YAxis
                type="category"
                dataKey="companyName"
                width={150}
                tick={{ fontSize: 12 }}
                stroke="#9CA3AF"
              />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Bar dataKey="amount" fill="#3B82F6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Companies Table */}
      <motion.div variants={itemVariants} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Company</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Revenue</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Jobs Posted</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Revenue/Job</th>
              </tr>
            </thead>
            <tbody>
              {companyRevenue.map((company) => (
                <tr key={company.companyId} className="border-b border-gray-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center">
                      <Briefcase className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-gray-900">{company.companyName}</span>
                    </div>
                  </td>
                  <td className="text-right py-3 px-4 font-medium text-gray-900">
                    {formatCurrency(company.amount)}
                  </td>
                  <td className="text-right py-3 px-4 text-gray-500">
                    {company.jobCount}
                  </td>
                  <td className="text-right py-3 px-4 text-gray-500">
                    {formatCurrency(company.jobCount > 0 ? company.amount / company.jobCount : 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  )

  // Conversions Tab
  const ConversionsTab = () => (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Conversion Funnel */}
      <motion.div variants={itemVariants} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Conversion Funnel</h3>
        <div className="space-y-4">
          {conversionRates && (
            <>
              <div className="flex items-center">
                <div className="w-32 text-sm text-gray-500">Referral → Application</div>
                <div className="flex-1 mx-4">
                  <div className="h-8 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full flex items-center justify-end pr-3"
                      style={{ width: `${Math.min(conversionRates.referralToApplication, 100)}%` }}
                    >
                      <span className="text-white text-sm font-medium">
                        {conversionRates.referralToApplication.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center">
                <div className="w-32 text-sm text-gray-500">Application → Interview</div>
                <div className="flex-1 mx-4">
                  <div className="h-8 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full flex items-center justify-end pr-3"
                      style={{ width: `${Math.min(conversionRates.applicationToInterview, 100)}%` }}
                    >
                      <span className="text-white text-sm font-medium">
                        {conversionRates.applicationToInterview.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center">
                <div className="w-32 text-sm text-gray-500">Interview → Hire</div>
                <div className="flex-1 mx-4">
                  <div className="h-8 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-500 rounded-full flex items-center justify-end pr-3"
                      style={{ width: `${Math.min(conversionRates.interviewToHire, 100)}%` }}
                    >
                      <span className="text-white text-sm font-medium">
                        {conversionRates.interviewToHire.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center">
                <div className="w-32 text-sm text-gray-500">Referral → Hire</div>
                <div className="flex-1 mx-4">
                  <div className="h-8 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-orange-500 rounded-full flex items-center justify-end pr-3"
                      style={{ width: `${Math.min(conversionRates.referralToHire, 100)}%` }}
                    >
                      <span className="text-white text-sm font-medium">
                        {conversionRates.referralToHire.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </motion.div>

      {/* Conversion Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div variants={itemVariants} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <Clock className="w-8 h-8 text-blue-500 mb-4" />
          <p className="text-sm text-gray-500">Avg Time to First Hire</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">28 days</p>
        </motion.div>

        <motion.div variants={itemVariants} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <Target className="w-8 h-8 text-green-500 mb-4" />
          <p className="text-sm text-gray-500">Job Post to Hire</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {conversionRates?.jobPostToHire.toFixed(1) || 0}%
          </p>
        </motion.div>

        <motion.div variants={itemVariants} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <Users className="w-8 h-8 text-purple-500 mb-4" />
          <p className="text-sm text-gray-500">Referrer Activation</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">65%</p>
        </motion.div>
      </div>
    </motion.div>
  )

  // Cohorts Tab
  const CohortsTab = () => (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <motion.div variants={itemVariants} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Cohort Analysis - Retention Rates</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Cohort</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Size</th>
                {Array.from({ length: 6 }, (_, i) => (
                  <th key={i} className="text-right py-3 px-4 text-sm font-medium text-gray-500">
                    Month {i}
                  </th>
                ))}
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">LTV</th>
              </tr>
            </thead>
            <tbody>
              {cohorts.map((cohort) => (
                <tr key={cohort.cohortMonth} className="border-b border-gray-50">
                  <td className="py-3 px-4 font-medium text-gray-900">
                    {cohort.cohortMonth}
                  </td>
                  <td className="text-right py-3 px-4 text-gray-500">
                    {cohort.cohortSize}
                  </td>
                  {Array.from({ length: 6 }, (_, i) => {
                    const retention = cohort.retentionRates.find(r => r.month === i)
                    return (
                      <td key={i} className="text-right py-3 px-4">
                        {retention ? (
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                              retention.rate >= 50
                                ? 'bg-green-100 text-green-800'
                                : retention.rate >= 25
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {retention.rate.toFixed(0)}%
                          </span>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                    )
                  })}
                  <td className="text-right py-3 px-4 font-medium text-gray-900">
                    {formatCurrency(cohort.ltv)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Cohort Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div variants={itemVariants} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <p className="text-sm text-gray-500">Total Cohorts</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{cohorts.length}</p>
        </motion.div>

        <motion.div variants={itemVariants} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <p className="text-sm text-gray-500">Avg Retention (Month 1)</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">
            {cohorts.length > 0
              ? (
                  cohorts.reduce((sum, c) => {
                    const rate = c.retentionRates.find(r => r.month === 1)
                    return sum + (rate ? rate.rate : 0)
                  }, 0) / cohorts.length
                ).toFixed(1)
              : 0}%
          </p>
        </motion.div>

        <motion.div variants={itemVariants} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <p className="text-sm text-gray-500">Avg LTV</p>
          <p className="text-2xl font-bold text-green-600 mt-1">
            {cohorts.length > 0
              ? formatCurrency(cohorts.reduce((sum, c) => sum + c.ltv, 0) / cohorts.length)
              : formatCurrency(0)}
          </p>
        </motion.div>
      </div>
    </motion.div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Revenue Analytics</h1>
              <p className="text-sm text-gray-500 mt-1">
                Track revenue, MRR, and key business metrics
              </p>
            </div>
            <div className="flex items-center space-x-3 mt-4 md:mt-0">
              {/* Time Range Selector */}
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                {(['7d', '30d', '90d', '1y'] as const).map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                      timeRange === range
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : range === '90d' ? '90 Days' : '1 Year'}
                  </button>
                ))}
              </div>

              {/* Refresh Button */}
              <button
                onClick={fetchAllData}
                disabled={isLoading}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>

              {/* Export Dropdown */}
              <div className="relative group">
                <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  <Download className="w-4 h-4" />
                  <span>Export</span>
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                  <button
                    onClick={() => handleExport('revenue')}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 first:rounded-t-lg"
                  >
                    Revenue Report
                  </button>
                  <button
                    onClick={() => handleExport('mrr')}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    MRR Report
                  </button>
                  <button
                    onClick={() => handleExport('full')}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 last:rounded-b-lg"
                  >
                    Full Report
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'mrr', label: 'MRR', icon: TrendingUp },
              { id: 'sources', label: 'Sources', icon: PieChart },
              { id: 'companies', label: 'Companies', icon: Briefcase },
              { id: 'conversions', label: 'Conversions', icon: Activity },
              { id: 'cohorts', label: 'Cohorts', icon: Users },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {isLoading && !revenueOverview ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center space-x-2 text-gray-500">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>Loading analytics...</span>
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && <OverviewTab />}
            {activeTab === 'mrr' && <MrrTab />}
            {activeTab === 'sources' && <SourcesTab />}
            {activeTab === 'companies' && <CompaniesTab />}
            {activeTab === 'conversions' && <ConversionsTab />}
            {activeTab === 'cohorts' && <CohortsTab />}
          </>
        )}
      </div>
    </div>
  )
}
