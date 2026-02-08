import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  TrendingUp, TrendingDown, Activity, MapPin,
  Briefcase, Code, DollarSign, Users,
  Calendar, Filter, RefreshCw, ArrowUpRight,
  ArrowDownRight, Minus, Building2,
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell,
} from 'recharts'

interface MarketTrend {
  _id: string
  date: string
  period: string
  overallMetrics: {
    totalJobs: number
    totalApplications: number
    avgTimeToFill: number
    salaryGrowth: number
    jobGrowth: number
  }
  topSkills: Array<{
    skill: string
    demand: number
    growth: number
    avgSalary: number
  }>
  industryBreakdown: Array<{
    industry: string
    jobCount: number
    avgSalary: number
    growth: number
  }>
  locationTrends: Array<{
    location: string
    jobCount: number
    avgSalary: number
    growth: number
  }>
  salaryTrends: Array<{
    experienceLevel: string
    avgSalary: number
    growth: number
  }>
}

interface Props {
  compact?: boolean
}

const COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899']

const MYANMAR_LOCATIONS = ['Yangon', 'Mandalay', 'Naypyitaw', 'Mawlamyine', 'Taunggyi']
const INDUSTRIES = ['IT', 'Finance', 'Manufacturing', 'Retail', 'Healthcare', 'Education']

export default function MarketTrendsView({ compact = false }: Props) {
  const [trends, setTrends] = useState<MarketTrend | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedLocation, setSelectedLocation] = useState<string>('all')
  const [selectedIndustry, setSelectedIndustry] = useState<string>('all')
  const [timeRange, setTimeRange] = useState<string>('30')

  const API_URL = import.meta.env.VITE_API_URL || '/api/v1'

  useEffect(() => {
    fetchTrends()
  }, [selectedLocation, selectedIndustry, timeRange])

  const fetchTrends = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const token = localStorage.getItem('token')
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const params = new URLSearchParams({
        days: timeRange,
        ...(selectedLocation !== 'all' && { location: selectedLocation }),
        ...(selectedIndustry !== 'all' && { industry: selectedIndustry }),
      })

      const response = await fetch(`${API_URL}/insights/market?${params}`, { headers })

      if (response.ok) {
        const result = await response.json()
        setTrends(result.data)
      }
    } catch (err) {
      console.error('Error fetching market trends:', err)
      setError('Failed to load market trends')
    } finally {
      setIsLoading(false)
    }
  }

  const getTrendIcon = (value: number) => {
    if (value > 0) return <ArrowUpRight className="w-4 h-4 text-green-500" />
    if (value < 0) return <ArrowDownRight className="w-4 h-4 text-red-500" />
    return <Minus className="w-4 h-4 text-gray-400" />
  }

  const getTrendColor = (value: number) => {
    if (value > 0) return 'text-green-600'
    if (value < 0) return 'text-red-600'
    return 'text-gray-500'
  }

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `K${(value / 1000000).toFixed(1)}M`
    }
    if (value >= 1000) {
      return `K${(value / 1000).toFixed(0)}K`
    }
    return `K${value}`
  }

  const formatPercent = (value: number) => {
    const sign = value > 0 ? '+' : ''
    return `${sign}${value.toFixed(1)}%`
  }

  if (compact) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
        {isLoading ? (
          <div className="flex items-center justify-center h-20">
            <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : trends ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Active Jobs</span>
              <span className="font-semibold text-gray-900">{trends.overallMetrics.totalJobs.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Job Growth</span>
              <div className="flex items-center">
                {getTrendIcon(trends.overallMetrics.jobGrowth)}
                <span className={`ml-1 font-medium ${getTrendColor(trends.overallMetrics.jobGrowth)}`}>
                  {formatPercent(trends.overallMetrics.jobGrowth)}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Avg Salary</span>
              <span className="font-semibold text-gray-900">{formatCurrency(trends.overallMetrics.salaryGrowth * 1000000)}</span>
            </div>
          </div>
        ) : (
          <div className="text-center text-sm text-gray-500">No data available</div>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-green-50 to-emerald-50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Activity className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Market Trends</h3>
              <p className="text-xs text-gray-500">Myanmar job market analytics</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
            <button
              onClick={fetchTrends}
              disabled={isLoading}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 border-b border-gray-100 bg-gray-50">
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-gray-400" />
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="all">All Locations</option>
              {MYANMAR_LOCATIONS.map(loc => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <Building2 className="w-4 h-4 text-gray-400" />
            <select
              value={selectedIndustry}
              onChange={(e) => setSelectedIndustry(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="all">All Industries</option>
              {INDUSTRIES.map(ind => (
                <option key={ind} value={ind}>{ind}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center space-x-2 text-gray-500">
              <div className="w-5 h-5 border-2 border-gray-300 border-t-green-500 rounded-full animate-spin" />
              <span>Loading market data...</span>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <Activity className="w-10 h-10 mx-auto mb-2 text-red-400" />
            <p className="text-red-600">{error}</p>
          </div>
        ) : trends ? (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-blue-50 rounded-lg"
              >
                <div className="flex items-center justify-between mb-1">
                  <Briefcase className="w-4 h-4 text-blue-600" />
                  {getTrendIcon(trends.overallMetrics.jobGrowth)}
                </div>
                <p className="text-2xl font-bold text-gray-900">{trends.overallMetrics.totalJobs.toLocaleString()}</p>
                <p className="text-xs text-gray-500">Active Jobs</p>
                <p className={`text-xs font-medium ${getTrendColor(trends.overallMetrics.jobGrowth)}`}>
                  {formatPercent(trends.overallMetrics.jobGrowth)} this period
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="p-4 bg-green-50 rounded-lg"
              >
                <div className="flex items-center justify-between mb-1">
                  <Users className="w-4 h-4 text-green-600" />
                  <ArrowUpRight className="w-4 h-4 text-green-500" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{trends.overallMetrics.totalApplications.toLocaleString()}</p>
                <p className="text-xs text-gray-500">Applications</p>
                <p className="text-xs font-medium text-green-600">+12.5% this period</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="p-4 bg-purple-50 rounded-lg"
              >
                <div className="flex items-center justify-between mb-1">
                  <DollarSign className="w-4 h-4 text-purple-600" />
                  {getTrendIcon(trends.overallMetrics.salaryGrowth)}
                </div>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(trends.overallMetrics.salaryGrowth * 1000000)}</p>
                <p className="text-xs text-gray-500">Avg Salary</p>
                <p className={`text-xs font-medium ${getTrendColor(trends.overallMetrics.salaryGrowth)}`}>
                  {formatPercent(trends.overallMetrics.salaryGrowth)} this period
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="p-4 bg-orange-50 rounded-lg"
              >
                <div className="flex items-center justify-between mb-1">
                  <Calendar className="w-4 h-4 text-orange-600" />
                  <ArrowDownRight className="w-4 h-4 text-green-500" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{trends.overallMetrics.avgTimeToFill}</p>
                <p className="text-xs text-gray-500">Avg Days to Fill</p>
                <p className="text-xs font-medium text-green-600">-3 days vs last period</p>
              </motion.div>
            </div>

            {/* Top Skills */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                <Code className="w-4 h-4 mr-2" />
                Top In-Demand Skills
              </h4>
              <div className="space-y-2">
                {trends.topSkills.slice(0, 5).map((skill, index) => (
                  <motion.div
                    key={skill.skill}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="w-6 h-6 flex items-center justify-center bg-blue-100 text-blue-600 rounded-full text-xs font-medium">
                        {index + 1}
                      </span>
                      <span className="font-medium text-gray-900">{skill.skill}</span>
                    </div>
                    <div className="flex items-center space-x-4 text-sm">
                      <span className="text-gray-500">{skill.demand} jobs</span>
                      <span className={`font-medium ${getTrendColor(skill.growth)}`}>
                        {formatPercent(skill.growth)}
                      </span>
                      <span className="text-gray-700 font-medium">{formatCurrency(skill.avgSalary)}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Industry Breakdown */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                  <Building2 className="w-4 h-4 mr-2" />
                  Industry Distribution
                </h4>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={trends.industryBreakdown}
                        dataKey="jobCount"
                        nameKey="industry"
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={2}
                      >
                        {trends.industryBreakdown.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap justify-center gap-2 mt-2">
                  {trends.industryBreakdown.map((industry, index) => (
                    <div key={industry.industry} className="flex items-center text-xs">
                      <div
                        className="w-2 h-2 rounded-full mr-1"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-gray-600">{industry.industry}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Location Trends */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                  <MapPin className="w-4 h-4 mr-2" />
                  Location Trends
                </h4>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trends.locationTrends}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="location" stroke="#9CA3AF" fontSize={10} />
                      <YAxis stroke="#9CA3AF" />
                      <Tooltip />
                      <Bar dataKey="jobCount" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Salary Trends by Experience */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                <DollarSign className="w-4 h-4 mr-2" />
                Salary Trends by Experience
              </h4>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trends.salaryTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="experienceLevel" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" tickFormatter={(v) => formatCurrency(v)} />
                    <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                    <Area
                      type="monotone"
                      dataKey="avgSalary"
                      stroke="#8B5CF6"
                      fill="#8B5CF6"
                      fillOpacity={0.2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <Activity className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500">No market trend data available</p>
          </div>
        )}
      </div>
    </div>
  )
}
