import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity,
  Cpu,
  HardDrive,
  Zap,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  RefreshCw,
  Download,
  Server,
  Database,
  Globe,
  Shield,
  Bell,
  LogOut,
  Trash2,
  Settings,
  BarChart3,
  Layers,
  AlertTriangle,
  Play,
  Pause,
  ChevronRight,
  Filter,
  Search,
  FileText
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import MonitoringDashboard from '../components/MonitoringDashboard'
import PerformanceMetrics from '../components/PerformanceMetrics'
import CacheManager from '../components/CacheManager'

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

type TabType = 'overview' | 'monitoring' | 'cache' | 'database' | 'scaling' | 'alerts'

interface SystemStats {
  cpu: {
    usage: number
    cores: number
    loadAvg: number[]
  }
  memory: {
    used: number
    total: number
    percentUsed: number
  }
  requests: {
    rate: number
    total: number
  }
  errors: {
    rate: number
    count: number
  }
  uptime: number
}

interface Alert {
  id: string
  severity: 'critical' | 'warning' | 'info'
  message: string
  service: string
  timestamp: string
  acknowledged: boolean
}

interface ServiceHealth {
  name: string
  status: 'healthy' | 'warning' | 'critical' | 'unknown'
  responseTime: number
  uptime: number
}

interface PerformanceData {
  timestamp: string
  system: SystemStats
  services: ServiceHealth[]
  alerts: Alert[]
}

const mockPerformanceData: PerformanceData = {
  timestamp: new Date().toISOString(),
  system: {
    cpu: {
      usage: 42.5,
      cores: 8,
      loadAvg: [2.1, 1.8, 1.5]
    },
    memory: {
      used: 6.2,
      total: 16,
      percentUsed: 38.7
    },
    requests: {
      rate: 1250,
      total: 1542000
    },
    errors: {
      rate: 0.02,
      count: 25
    },
    uptime: 864000 * 15 // 15 days in seconds
  },
  services: [
    { name: 'API Gateway', status: 'healthy', responseTime: 45, uptime: 99.99 },
    { name: 'Database', status: 'healthy', responseTime: 12, uptime: 99.98 },
    { name: 'Cache', status: 'healthy', responseTime: 3, uptime: 100 },
    { name: 'Queue Worker', status: 'warning', responseTime: 250, uptime: 99.95 },
    { name: 'File Storage', status: 'healthy', responseTime: 89, uptime: 99.99 }
  ],
  alerts: [
    { id: '1', severity: 'warning', message: 'High memory usage on worker-03', service: 'Queue Worker', timestamp: '2024-01-21T10:30:00Z', acknowledged: false },
    { id: '2', severity: 'info', message: 'Database backup completed successfully', service: 'Database', timestamp: '2024-01-21T09:00:00Z', acknowledged: true },
    { id: '3', severity: 'critical', message: 'API response time exceeded 500ms', service: 'API Gateway', timestamp: '2024-01-21T08:45:00Z', acknowledged: false },
    { id: '4', severity: 'warning', message: 'Cache hit rate below 80%', service: 'Cache', timestamp: '2024-01-21T08:30:00Z', acknowledged: true }
  ]
}

const chartData = [
  { time: '00:00', requests: 800, errors: 5, responseTime: 120 },
  { time: '02:00', requests: 650, errors: 3, responseTime: 110 },
  { time: '04:00', requests: 450, errors: 2, responseTime: 95 },
  { time: '06:00', requests: 700, errors: 4, responseTime: 105 },
  { time: '08:00', requests: 1200, errors: 8, responseTime: 140 },
  { time: '10:00', requests: 1500, errors: 12, responseTime: 165 },
  { time: '12:00', requests: 1800, errors: 15, responseTime: 180 },
  { time: '14:00', requests: 1650, errors: 10, responseTime: 155 },
  { time: '16:00', requests: 1400, errors: 8, responseTime: 145 },
  { time: '18:00', requests: 1100, errors: 6, responseTime: 130 },
  { time: '20:00', requests: 900, errors: 4, responseTime: 115 },
  { time: '22:00', requests: 750, errors: 3, responseTime: 105 }
]

const throughputData = [
  { time: '00:00', throughput: 45 },
  { time: '02:00', throughput: 38 },
  { time: '04:00', throughput: 25 },
  { time: '06:00', throughput: 52 },
  { time: '08:00', throughput: 85 },
  { time: '10:00', throughput: 95 },
  { time: '12:00', throughput: 110 },
  { time: '14:00', throughput: 98 },
  { time: '16:00', throughput: 88 },
  { time: '18:00', throughput: 72 },
  { time: '20:00', throughput: 58 },
  { time: '22:00', throughput: 48 }
]

export default function PerformanceAdminDashboard() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [performanceData, setPerformanceData] = useState<PerformanceData>(mockPerformanceData)
  const [loading, setLoading] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [showFlushConfirm, setShowFlushConfirm] = useState(false)

  const getAuthToken = () => localStorage.getItem('token')

  const fetchPerformanceData = useCallback(async () => {
    try {
      setLoading(true)
      const token = getAuthToken()
      if (!token) {
        navigate('/login')
        return
      }

      // Fetch system metrics
      const metricsResponse = await fetch(`${API_BASE_URL}/metrics`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (metricsResponse.ok) {
        const result = await metricsResponse.json()
        if (result.success && result.data) {
          // Update with real data if available
          setPerformanceData(prev => ({
            ...prev,
            system: {
              ...prev.system,
              cpu: { ...prev.system.cpu, usage: result.data.system?.cpu?.usage || prev.system.cpu.usage },
              memory: { ...prev.system.memory, percentUsed: parseFloat(result.data.system?.memory?.percentUsed) || prev.system.memory.percentUsed }
            }
          }))
        }
      }

      setLastRefresh(new Date())
    } catch (err) {
      console.error('Failed to fetch performance data:', err)
    } finally {
      setLoading(false)
    }
  }, [navigate])

  useEffect(() => {
    fetchPerformanceData()
  }, [fetchPerformanceData])

  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(fetchPerformanceData, 30000)
    return () => clearInterval(interval)
  }, [autoRefresh, fetchPerformanceData])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  const handleFlushCache = async () => {
    try {
      const token = getAuthToken()
      const response = await fetch(`${API_BASE_URL}/cache/flush`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ confirm: 'flush-all-cache' })
      })

      if (response.ok) {
        setShowFlushConfirm(false)
        // Show success notification
      }
    } catch (err) {
      console.error('Failed to flush cache:', err)
    }
  }

  const exportReport = () => {
    const reportData = {
      timestamp: new Date().toISOString(),
      performance: performanceData,
      exportType: 'performance-report'
    }
    const dataStr = JSON.stringify(reportData, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `performance-report-${new Date().toISOString()}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-500" />
      case 'critical':
        return <XCircle className="w-5 h-5 text-red-500" />
      default:
        return <Minus className="w-5 h-5 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-700 border-green-300'
      case 'warning':
        return 'bg-amber-100 text-amber-700 border-amber-300'
      case 'critical':
        return 'bg-red-100 text-red-700 border-red-300'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="w-4 h-4 text-red-500" />
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-500" />
      default:
        return <CheckCircle className="w-4 h-4 text-blue-500" />
    }
  }

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (days > 0) return `${days}d ${hours}h ${minutes}m`
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'monitoring', label: 'Monitoring', icon: Activity },
    { id: 'cache', label: 'Cache', icon: Layers },
    { id: 'database', label: 'Database', icon: Database },
    { id: 'scaling', label: 'Scaling', icon: Server },
    { id: 'alerts', label: 'Alerts', icon: Bell, badge: performanceData.alerts.filter(a => !a.acknowledged).length }
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Admin Header */}
      <header className="bg-slate-900 text-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg">Performance Admin</h1>
                <p className="text-xs text-slate-400">TRM System Monitoring</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  autoRefresh ? 'bg-green-600' : 'bg-slate-700'
                }`}
              >
                {autoRefresh ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                {autoRefresh ? 'Live' : 'Paused'}
              </button>
              <button
                onClick={exportReport}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium transition-colors"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
              <button className="relative p-2 text-slate-400 hover:text-white transition-colors">
                <Bell className="w-5 h-5" />
                {performanceData.alerts.filter(a => !a.acknowledged).length > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </button>
              <div className="flex items-center gap-3 pl-4 border-l border-slate-700">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-sm font-bold">
                  AD
                </div>
                <button onClick={handleLogout} className="text-slate-400 hover:text-white transition-colors">
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors relative whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'text-blue-600'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
                {tab.badge && tab.badge > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                    {tab.badge}
                  </span>
                )}
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
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
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* System Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <PerformanceStatCard
                  icon={Cpu}
                  label="CPU Usage"
                  value={`${performanceData.system.cpu.usage.toFixed(1)}%`}
                  subValue={`${performanceData.system.cpu.cores} cores`}
                  trend={performanceData.system.cpu.usage > 80 ? '+5%' : '-2%'}
                  trendUp={performanceData.system.cpu.usage > 80}
                  color="blue"
                />
                <PerformanceStatCard
                  icon={HardDrive}
                  label="Memory Usage"
                  value={`${performanceData.system.memory.percentUsed.toFixed(1)}%`}
                  subValue={`${performanceData.system.memory.used.toFixed(1)} / ${performanceData.system.memory.total} GB`}
                  trend="Stable"
                  trendUp={true}
                  color="purple"
                />
                <PerformanceStatCard
                  icon={Zap}
                  label="Requests/sec"
                  value={performanceData.system.requests.rate.toLocaleString()}
                  subValue={`${(performanceData.system.requests.total / 1000000).toFixed(2)}M total`}
                  trend="+12%"
                  trendUp={true}
                  color="green"
                />
                <PerformanceStatCard
                  icon={AlertCircle}
                  label="Error Rate"
                  value={`${(performanceData.system.errors.rate * 100).toFixed(2)}%`}
                  subValue={`${performanceData.system.errors.count} errors`}
                  trend="-0.5%"
                  trendUp={false}
                  color="amber"
                />
              </div>

              {/* Charts Row */}
              <div className="grid lg:grid-cols-2 gap-8">
                {/* Response Time Chart */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">Response Time Trends</h3>
                      <p className="text-sm text-slate-500">Average response time over 24 hours</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <div className="w-3 h-3 rounded-full bg-blue-500" />
                        Response Time
                      </span>
                    </div>
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorResponse" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} />
                        <YAxis stroke="#94a3b8" fontSize={12} unit="ms" />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                        />
                        <Area
                          type="monotone"
                          dataKey="responseTime"
                          stroke="#3b82f6"
                          fillOpacity={1}
                          fill="url(#colorResponse)"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Throughput Chart */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">Request Throughput</h3>
                      <p className="text-sm text-slate-500">Requests per minute over 24 hours</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                        Throughput
                      </span>
                    </div>
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={throughputData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} />
                        <YAxis stroke="#94a3b8" fontSize={12} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                        />
                        <Bar dataKey="throughput" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Service Health & Quick Actions */}
              <div className="grid lg:grid-cols-3 gap-8">
                {/* Service Health */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="p-6 border-b border-slate-200">
                    <h3 className="text-lg font-bold text-slate-900">Service Health</h3>
                  </div>
                  <div className="divide-y divide-slate-200">
                    {performanceData.services.map((service, i) => (
                      <div key={i} className="p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          service.status === 'healthy' ? 'bg-green-100' :
                          service.status === 'warning' ? 'bg-amber-100' :
                          'bg-red-100'
                        }`}>
                          {getStatusIcon(service.status)}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-slate-900">{service.name}</p>
                          <p className="text-sm text-slate-500">
                            Response: {service.responseTime}ms • Uptime: {service.uptime}%
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(service.status)}`}>
                          {service.status.charAt(0).toUpperCase() + service.status.slice(1)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                  <h3 className="text-lg font-bold text-slate-900 mb-6">Quick Actions</h3>
                  <div className="space-y-3">
                    <button
                      onClick={() => setActiveTab('cache')}
                      className="w-full flex items-center gap-3 p-4 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors text-left"
                    >
                      <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                        <Layers className="w-5 h-5 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">Flush Cache</p>
                        <p className="text-sm text-slate-500">Clear all cached data</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-400" />
                    </button>
                    <button
                      onClick={() => setActiveTab('database')}
                      className="w-full flex items-center gap-3 p-4 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors text-left"
                    >
                      <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                        <Database className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">Optimize Database</p>
                        <p className="text-sm text-slate-500">Run optimization tasks</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-400" />
                    </button>
                    <button
                      onClick={() => setActiveTab('scaling')}
                      className="w-full flex items-center gap-3 p-4 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors text-left"
                    >
                      <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                        <Server className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">Scale Resources</p>
                        <p className="text-sm text-slate-500">Adjust instance count</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-400" />
                    </button>
                    <button
                      onClick={exportReport}
                      className="w-full flex items-center gap-3 p-4 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors text-left"
                    >
                      <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-amber-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">Export Report</p>
                        <p className="text-sm text-slate-500">Download performance data</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-400" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Recent Alerts */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900">Recent Alerts</h3>
                  <button
                    onClick={() => setActiveTab('alerts')}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    View All
                  </button>
                </div>
                <div className="divide-y divide-slate-200">
                  {performanceData.alerts.slice(0, 5).map((alert) => (
                    <div key={alert.id} className="p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        alert.severity === 'critical' ? 'bg-red-100' :
                        alert.severity === 'warning' ? 'bg-amber-100' :
                        'bg-blue-100'
                      }`}>
                        {getSeverityIcon(alert.severity)}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">{alert.message}</p>
                        <p className="text-sm text-slate-500">
                          {alert.service} • {new Date(alert.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(alert.severity)}`}>
                        {alert.severity.charAt(0).toUpperCase() + alert.severity.slice(1)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'monitoring' && (
            <motion.div
              key="monitoring"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <MonitoringDashboard embedded={true} />
            </motion.div>
          )}

          {activeTab === 'cache' && (
            <motion.div
              key="cache"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <CacheManager embedded={true} />
            </motion.div>
          )}

          {activeTab === 'database' && (
            <motion.div
              key="database"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
                <Database className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-900 mb-2">Database Optimizer</h3>
                <p className="text-slate-500 mb-6">Navigate to the Database Optimizer section for detailed database management</p>
                <button
                  onClick={() => navigate('/admin/database-optimizer')}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
                >
                  Open Database Optimizer
                </button>
              </div>
            </motion.div>
          )}

          {activeTab === 'scaling' && (
            <motion.div
              key="scaling"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
                <Server className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-900 mb-2">Scaling Configuration</h3>
                <p className="text-slate-500 mb-6">Navigate to the Scaling Configuration section for auto-scaling settings</p>
                <button
                  onClick={() => navigate('/admin/scaling')}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
                >
                  Open Scaling Configuration
                </button>
              </div>
            </motion.div>
          )}

          {activeTab === 'alerts' && (
            <motion.div
              key="alerts"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Alerts Filters */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="relative flex-1 min-w-[300px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search alerts..."
                      className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <select className="px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500">
                    <option value="all">All Severities</option>
                    <option value="critical">Critical</option>
                    <option value="warning">Warning</option>
                    <option value="info">Info</option>
                  </select>
                  <select className="px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500">
                    <option value="all">All Services</option>
                    <option value="api">API Gateway</option>
                    <option value="database">Database</option>
                    <option value="cache">Cache</option>
                  </select>
                </div>
              </div>

              {/* Alerts List */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="divide-y divide-slate-200">
                  {performanceData.alerts.map((alert) => (
                    <div key={alert.id} className="p-6 flex items-start gap-4 hover:bg-slate-50 transition-colors">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        alert.severity === 'critical' ? 'bg-red-100' :
                        alert.severity === 'warning' ? 'bg-amber-100' :
                        'bg-blue-100'
                      }`}>
                        {getSeverityIcon(alert.severity)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="font-medium text-slate-900">{alert.message}</p>
                            <p className="text-sm text-slate-500 mt-1">
                              Service: {alert.service} • {new Date(alert.timestamp).toLocaleString()}
                            </p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium flex-shrink-0 ${getStatusColor(alert.severity)}`}>
                            {alert.severity.charAt(0).toUpperCase() + alert.severity.slice(1)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-4">
                          {!alert.acknowledged && (
                            <button className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
                              Acknowledge
                            </button>
                          )}
                          <button className="px-4 py-2 text-slate-600 hover:bg-slate-100 text-sm font-medium rounded-lg transition-colors">
                            View Details
                          </button>
                          <button className="px-4 py-2 text-slate-600 hover:bg-slate-100 text-sm font-medium rounded-lg transition-colors">
                            Dismiss
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}

function PerformanceStatCard({
  icon: Icon,
  label,
  value,
  subValue,
  trend,
  trendUp,
  color
}: {
  icon: any
  label: string
  value: string
  subValue: string
  trend: string
  trendUp: boolean
  color: string
}) {
  const colorClasses: Record<string, { bg: string; text: string }> = {
    blue: { bg: 'from-blue-500 to-blue-600', text: 'text-blue-600' },
    purple: { bg: 'from-purple-500 to-purple-600', text: 'text-purple-600' },
    green: { bg: 'from-green-500 to-green-600', text: 'text-green-600' },
    amber: { bg: 'from-amber-500 to-amber-600', text: 'text-amber-600' }
  }

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="bg-white rounded-2xl border border-slate-200 p-6"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClasses[color].bg} flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <span className={`text-xs font-medium ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
          {trend}
        </span>
      </div>
      <p className="text-slate-500 text-sm mb-1">{label}</p>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-400 mt-1">{subValue}</p>
    </motion.div>
  )
}
