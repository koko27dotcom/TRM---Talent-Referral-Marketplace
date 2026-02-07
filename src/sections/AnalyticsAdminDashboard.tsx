import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Settings, Brain, TrendingUp, AlertTriangle, CheckCircle,
  RefreshCw, Play, Pause, Save, Database, Clock,
  BarChart3, PieChart, Activity, Zap, Shield,
  ChevronDown, ChevronUp, Trash2, Edit3, Plus,
  FileText, Download, Eye, Filter, Search,
  Server, Cpu, Gauge, Layers,
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
} from 'recharts'

interface ModelConfig {
  id: string
  name: string
  type: string
  status: 'active' | 'inactive' | 'training'
  accuracy: number
  lastTrained: string
  version: string
  features: string[]
  parameters: Record<string, number | string | boolean>
}

interface InsightMetric {
  date: string
  predictions: number
  accuracy: number
  latency: number
}

interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical'
  cpu: number
  memory: number
  storage: number
  activeModels: number
  queueSize: number
}

export default function AnalyticsAdminDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'models' | 'insights' | 'settings'>('overview')
  const [models, setModels] = useState<ModelConfig[]>([])
  const [metrics, setMetrics] = useState<InsightMetric[]>([])
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedModel, setSelectedModel] = useState<ModelConfig | null>(null)
  const [showModelModal, setShowModelModal] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationStatus, setGenerationStatus] = useState<string | null>(null)

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

      // Fetch models
      const modelsRes = await fetch(`${API_URL}/admin/insights/models`, { headers })
      if (modelsRes.ok) {
        const modelsData = await modelsRes.json()
        setModels(modelsData.data || [])
      }

      // Fetch metrics
      const metricsRes = await fetch(`${API_URL}/admin/insights/metrics`, { headers })
      if (metricsRes.ok) {
        const metricsData = await metricsRes.json()
        setMetrics(metricsData.data || [])
      }

      // Fetch system health
      const healthRes = await fetch(`${API_URL}/admin/insights/health`, { headers })
      if (healthRes.ok) {
        const healthData = await healthRes.json()
        setSystemHealth(healthData.data)
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const generateInsights = async (type?: string) => {
    setIsGenerating(true)
    setGenerationStatus('Initializing...')

    try {
      const token = localStorage.getItem('token')
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (token) headers['Authorization'] = `Bearer ${token}`

      setGenerationStatus('Processing data...')
      
      const response = await fetch(`${API_URL}/insights/generate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ type }),
      })

      if (response.ok) {
        setGenerationStatus('Complete!')
        setTimeout(() => {
          setGenerationStatus(null)
          fetchDashboardData()
        }, 2000)
      } else {
        setGenerationStatus('Failed')
      }
    } catch (err) {
      console.error('Error generating insights:', err)
      setGenerationStatus('Error')
    } finally {
      setTimeout(() => setIsGenerating(false), 2000)
    }
  }

  const toggleModelStatus = async (modelId: string) => {
    try {
      const token = localStorage.getItem('token')
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const response = await fetch(`${API_URL}/admin/insights/models/${modelId}/toggle`, {
        method: 'POST',
        headers,
      })

      if (response.ok) {
        fetchDashboardData()
      }
    } catch (err) {
      console.error('Error toggling model:', err)
    }
  }

  const retrainModel = async (modelId: string) => {
    try {
      const token = localStorage.getItem('token')
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (token) headers['Authorization'] = `Bearer ${token}`

      await fetch(`${API_URL}/admin/insights/models/${modelId}/retrain`, {
        method: 'POST',
        headers,
      })

      fetchDashboardData()
    } catch (err) {
      console.error('Error retraining model:', err)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'healthy':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'warning':
      case 'training':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'critical':
      case 'inactive':
        return 'text-red-600 bg-red-50 border-red-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />
      case 'critical':
        return <AlertTriangle className="w-5 h-5 text-red-500" />
      default:
        return <Activity className="w-5 h-5 text-gray-500" />
    }
  }

  // Overview Tab
  const renderOverview = () => (
    <div className="space-y-6">
      {/* System Health Cards */}
      {systemHealth && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-lg border ${getStatusColor(systemHealth.status)}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">System Status</span>
              {getHealthIcon(systemHealth.status)}
            </div>
            <p className="text-2xl font-bold capitalize">{systemHealth.status}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-4 bg-white rounded-lg border border-gray-200"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Active Models</span>
              <Brain className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{systemHealth.activeModels}</p>
            <p className="text-xs text-gray-500">of {models.length} total</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-4 bg-white rounded-lg border border-gray-200"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Queue Size</span>
              <Layers className="w-5 h-5 text-purple-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{systemHealth.queueSize}</p>
            <p className="text-xs text-gray-500">pending predictions</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="p-4 bg-white rounded-lg border border-gray-200"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Avg Accuracy</span>
              <Gauge className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {(models.reduce((acc, m) => acc + m.accuracy, 0) / (models.length || 1)).toFixed(1)}%
            </p>
            <p className="text-xs text-gray-500">across all models</p>
          </motion.div>
        </div>
      )}

      {/* Resource Usage */}
      {systemHealth && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-white rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-700">CPU Usage</span>
              <Cpu className="w-4 h-4 text-gray-400" />
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  systemHealth.cpu > 80 ? 'bg-red-500' : systemHealth.cpu > 60 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${systemHealth.cpu}%` }}
              />
            </div>
            <p className="text-right text-sm mt-1">{systemHealth.cpu}%</p>
          </div>

          <div className="p-4 bg-white rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-700">Memory Usage</span>
              <Database className="w-4 h-4 text-gray-400" />
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  systemHealth.memory > 80 ? 'bg-red-500' : systemHealth.memory > 60 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${systemHealth.memory}%` }}
              />
            </div>
            <p className="text-right text-sm mt-1">{systemHealth.memory}%</p>
          </div>

          <div className="p-4 bg-white rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-700">Storage Usage</span>
              <Server className="w-4 h-4 text-gray-400" />
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  systemHealth.storage > 80 ? 'bg-red-500' : systemHealth.storage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${systemHealth.storage}%` }}
              />
            </div>
            <p className="text-right text-sm mt-1">{systemHealth.storage}%</p>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-100">
        <h3 className="font-semibold text-gray-900 mb-3">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => generateInsights()}
            disabled={isGenerating}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isGenerating ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4" />
            )}
            <span>Generate All Insights</span>
          </button>
          <button
            onClick={() => generateInsights('salary')}
            disabled={isGenerating}
            className="flex items-center space-x-2 px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <BarChart3 className="w-4 h-4" />
            <span>Update Salary Data</span>
          </button>
          <button
            onClick={() => generateInsights('market')}
            disabled={isGenerating}
            className="flex items-center space-x-2 px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <TrendingUp className="w-4 h-4" />
            <span>Refresh Market Trends</span>
          </button>
          <button
            onClick={fetchDashboardData}
            className="flex items-center space-x-2 px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh Data</span>
          </button>
        </div>
        {generationStatus && (
          <p className="mt-2 text-sm text-blue-600">{generationStatus}</p>
        )}
      </div>

      {/* Performance Chart */}
      {metrics.length > 0 && (
        <div className="p-4 bg-white rounded-lg border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4">Prediction Performance</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metrics}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="date" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="accuracy"
                  stroke="#10B981"
                  strokeWidth={2}
                  name="Accuracy %"
                />
                <Line
                  type="monotone"
                  dataKey="predictions"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  name="Predictions"
                  yAxisId={1}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )

  // Models Tab
  const renderModels = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">AI Models</h3>
        <button
          onClick={() => {
            setSelectedModel(null)
            setShowModelModal(true)
          }}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Model</span>
        </button>
      </div>

      <div className="grid gap-4">
        {models.map((model, index) => (
          <motion.div
            key={model.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start space-x-4">
                <div className={`p-3 rounded-lg ${getStatusColor(model.status)}`}>
                  <Brain className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">{model.name}</h4>
                  <p className="text-sm text-gray-500">{model.type} • v{model.version}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {model.features.slice(0, 3).map((feature) => (
                      <span
                        key={feature}
                        className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{model.accuracy.toFixed(1)}%</p>
                  <p className="text-xs text-gray-500">Accuracy</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(model.lastTrained).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-gray-500">Last Trained</p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => toggleModelStatus(model.id)}
                    className={`p-2 rounded-lg transition-colors ${
                      model.status === 'active'
                        ? 'bg-green-100 text-green-600 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {model.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => retrainModel(model.id)}
                    className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedModel(model)
                      setShowModelModal(true)
                    }}
                    className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )

  // Insights Tab
  const renderInsights = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-lg border border-gray-200">
          <h4 className="font-medium text-gray-700 mb-3">Insights by Type</h4>
          <div className="space-y-2">
            {['Candidate Hire', 'Salary Benchmark', 'Hiring Velocity', 'Referrer Success', 'Churn Prediction'].map((type) => (
              <div key={type} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{type}</span>
                <span className="text-sm font-medium text-gray-900">{Math.floor(Math.random() * 1000)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 bg-white rounded-lg border border-gray-200">
          <h4 className="font-medium text-gray-700 mb-3">Accuracy by Type</h4>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: 'Hire', value: 85 },
                { name: 'Salary', value: 92 },
                { name: 'Velocity', value: 78 },
                { name: 'Referrer', value: 88 },
              ]}>
                <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                <Tooltip />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-4 bg-white rounded-lg border border-gray-200">
          <h4 className="font-medium text-gray-700 mb-3">Recent Activity</h4>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center space-x-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-gray-600">Generated {['salary', 'market', 'hiring', 'referrer', 'churn'][i-1]} insights</span>
                <span className="text-gray-400 text-xs">{i}h ago</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Data Management */}
      <div className="p-4 bg-white rounded-lg border border-gray-200">
        <h4 className="font-medium text-gray-700 mb-4">Data Management</h4>
        <div className="flex flex-wrap gap-3">
          <button className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
            <Download className="w-4 h-4" />
            <span>Export Insights</span>
          </button>
          <button className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
            <FileText className="w-4 h-4" />
            <span>View Logs</span>
          </button>
          <button className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
            <Trash2 className="w-4 h-4" />
            <span>Clear Cache</span>
          </button>
        </div>
      </div>
    </div>
  )

  // Settings Tab
  const renderSettings = () => (
    <div className="space-y-6">
      <div className="p-4 bg-white rounded-lg border border-gray-200">
        <h4 className="font-medium text-gray-700 mb-4">General Settings</h4>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Auto-generate Insights</p>
              <p className="text-sm text-gray-500">Automatically generate insights daily</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Enable Caching</p>
              <p className="text-sm text-gray-500">Cache predictions for better performance</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Model Retraining</p>
              <p className="text-sm text-gray-500">Auto-retrain models weekly</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>

      <div className="p-4 bg-white rounded-lg border border-gray-200">
        <h4 className="font-medium text-gray-700 mb-4">Prediction Thresholds</h4>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Minimum Confidence (%)
            </label>
            <input
              type="range"
              min="50"
              max="95"
              defaultValue="70"
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>50%</span>
              <span>70%</span>
              <span>95%</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cache Duration (hours)
            </label>
            <input
              type="range"
              min="1"
              max="72"
              defaultValue="24"
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>1h</span>
              <span>24h</span>
              <span>72h</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 bg-white rounded-lg border border-gray-200">
        <h4 className="font-medium text-gray-700 mb-4">Notifications</h4>
        <div className="space-y-3">
          <label className="flex items-center space-x-3">
            <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" defaultChecked />
            <span className="text-gray-700">Model accuracy drops below threshold</span>
          </label>
          <label className="flex items-center space-x-3">
            <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" defaultChecked />
            <span className="text-gray-700">System health issues detected</span>
          </label>
          <label className="flex items-center space-x-3">
            <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" />
            <span className="text-gray-700">Daily insights generation complete</span>
          </label>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Analytics Admin Dashboard</h1>
              <p className="text-gray-500">Manage AI models, insights, and system configuration</p>
            </div>
            <div className="flex items-center space-x-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(systemHealth?.status || 'healthy')}`}>
                {systemHealth?.status || 'Loading...'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {(['overview', 'models', 'insights', 'settings'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center space-x-2 text-gray-500">
              <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
              <span>Loading...</span>
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'models' && renderModels()}
            {activeTab === 'insights' && renderInsights()}
            {activeTab === 'settings' && renderSettings()}
          </>
        )}
      </div>
    </div>
  )
}
