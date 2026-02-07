import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Brain, TrendingUp, DollarSign, Clock, Users,
  Activity, BarChart3, PieChart, Target, Award,
  Briefcase, MapPin, Calendar, Filter, RefreshCw,
  ChevronRight, Sparkles, Zap, ArrowUpRight,
  ArrowDownRight, Minus,
} from 'lucide-react'
import SalaryBenchmarkChart from '../components/SalaryBenchmarkChart'
import HiringVelocityWidget from '../components/HiringVelocityWidget'
import MarketTrendsView from '../components/MarketTrendsView'
import ReferrerPerformancePredictor from '../components/ReferrerPerformancePredictor'

interface DashboardStats {
  totalInsights: number
  avgAccuracy: number
  predictionsToday: number
  activeModels: number
}

interface RecentInsight {
  id: string
  type: string
  title: string
  value: string
  change: number
  timestamp: string
}

export default function InsightsDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'salary' | 'hiring' | 'market' | 'referrers'>('overview')
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentInsights, setRecentInsights] = useState<RecentInsight[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem('token')
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const response = await fetch(`${API_URL}/insights/dashboard`, { headers })

      if (response.ok) {
        const data = await response.json()
        setStats(data.data.stats)
        setRecentInsights(data.data.recentInsights || [])
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const getTrendIcon = (change: number) => {
    if (change > 0) return <ArrowUpRight className="w-4 h-4 text-green-500" />
    if (change < 0) return <ArrowDownRight className="w-4 h-4 text-red-500" />
    return <Minus className="w-4 h-4 text-gray-400" />
  }

  const getTrendColor = (change: number) => {
    if (change > 0) return 'text-green-600'
    if (change < 0) return 'text-red-600'
    return 'text-gray-500'
  }

  // Overview Tab
  const renderOverview = () => (
    <div className="space-y-6">
      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200"
          >
            <div className="flex items-center justify-between mb-2">
              <Brain className="w-8 h-8 text-blue-600" />
              <span className="text-xs font-medium text-blue-600 bg-blue-200 px-2 py-1 rounded-full">
                AI Powered
              </span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.totalInsights.toLocaleString()}</p>
            <p className="text-sm text-gray-600">Total Insights Generated</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200"
          >
            <div className="flex items-center justify-between mb-2">
              <Target className="w-8 h-8 text-green-600" />
              <span className="text-xs font-medium text-green-600 bg-green-200 px-2 py-1 rounded-full">
                Accuracy
              </span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.avgAccuracy}%</p>
            <p className="text-sm text-gray-600">Average Prediction Accuracy</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200"
          >
            <div className="flex items-center justify-between mb-2">
              <Zap className="w-8 h-8 text-purple-600" />
              <span className="text-xs font-medium text-purple-600 bg-purple-200 px-2 py-1 rounded-full">
                Today
              </span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.predictionsToday}</p>
            <p className="text-sm text-gray-600">Predictions Today</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="p-4 bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl border border-amber-200"
          >
            <div className="flex items-center justify-between mb-2">
              <Sparkles className="w-8 h-8 text-amber-600" />
              <span className="text-xs font-medium text-amber-600 bg-amber-200 px-2 py-1 rounded-full">
                Active
              </span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.activeModels}</p>
            <p className="text-sm text-gray-600">AI Models Running</p>
          </motion.div>
        </div>
      )}

      {/* Quick Insights Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 flex items-center">
                <DollarSign className="w-5 h-5 mr-2 text-green-600" />
                Salary Insights
              </h3>
              <button
                onClick={() => setActiveTab('salary')}
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
              >
                View All <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          </div>
          <div className="p-4">
            <SalaryBenchmarkChart compact />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 flex items-center">
                <Clock className="w-5 h-5 mr-2 text-purple-600" />
                Hiring Velocity
              </h3>
              <button
                onClick={() => setActiveTab('hiring')}
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
              >
                View All <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          </div>
          <div className="p-4">
            <HiringVelocityWidget compact />
          </div>
        </div>
      </div>

      {/* Market Trends & Referrers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 flex items-center">
                <Activity className="w-5 h-5 mr-2 text-blue-600" />
                Market Trends
              </h3>
              <button
                onClick={() => setActiveTab('market')}
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
              >
                View All <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          </div>
          <div className="p-4">
            <MarketTrendsView compact />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 flex items-center">
                <Award className="w-5 h-5 mr-2 text-amber-600" />
                Top Referrers
              </h3>
              <button
                onClick={() => setActiveTab('referrers')}
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
              >
                View All <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          </div>
          <div className="p-4">
            <ReferrerPerformancePredictor compact limit={5} />
          </div>
        </div>
      </div>

      {/* Recent Insights */}
      {recentInsights.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Recent AI Insights</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {recentInsights.map((insight, index) => (
              <motion.div
                key={insight.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${
                      insight.type === 'salary' ? 'bg-green-100 text-green-600' :
                      insight.type === 'hiring' ? 'bg-purple-100 text-purple-600' :
                      insight.type === 'market' ? 'bg-blue-100 text-blue-600' :
                      'bg-amber-100 text-amber-600'
                    }`}>
                      {insight.type === 'salary' && <DollarSign className="w-4 h-4" />}
                      {insight.type === 'hiring' && <Clock className="w-4 h-4" />}
                      {insight.type === 'market' && <Activity className="w-4 h-4" />}
                      {insight.type === 'referrer' && <Award className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{insight.title}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(insight.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="font-semibold text-gray-900">{insight.value}</span>
                    <div className={`flex items-center ${getTrendColor(insight.change)}`}>
                      {getTrendIcon(insight.change)}
                      <span className="text-sm font-medium ml-1">
                        {insight.change > 0 ? '+' : ''}{insight.change}%
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <Brain className="w-8 h-8 mr-3 text-purple-600" />
                AI Insights Dashboard
              </h1>
              <p className="text-gray-500 mt-1">
                Predictive analytics and intelligence for smarter hiring decisions
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={fetchDashboardData}
                disabled={isLoading}
                className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1 overflow-x-auto">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'salary', label: 'Salary Benchmarks', icon: DollarSign },
              { id: 'hiring', label: 'Hiring Velocity', icon: Clock },
              { id: 'market', label: 'Market Trends', icon: Activity },
              { id: 'referrers', label: 'Referrer Predictions', icon: Award },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center space-x-2 py-4 px-4 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading && !stats ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center space-x-2 text-gray-500">
              <div className="w-5 h-5 border-2 border-gray-300 border-t-purple-500 rounded-full animate-spin" />
              <span>Loading insights...</span>
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'salary' && (
              <div className="max-w-4xl mx-auto">
                <SalaryBenchmarkChart />
              </div>
            )}
            {activeTab === 'hiring' && (
              <div className="max-w-4xl mx-auto">
                <HiringVelocityWidget />
              </div>
            )}
            {activeTab === 'market' && (
              <div className="max-w-4xl mx-auto">
                <MarketTrendsView />
              </div>
            )}
            {activeTab === 'referrers' && (
              <div className="max-w-4xl mx-auto">
                <ReferrerPerformancePredictor />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
