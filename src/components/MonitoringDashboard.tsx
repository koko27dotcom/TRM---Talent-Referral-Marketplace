import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity,
  Database,
  Server,
  Zap,
  Globe,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  RefreshCw,
  Bell,
  Cpu,
  HardDrive,
  Wifi,
  Shield,
  AlertTriangle
} from 'lucide-react'
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

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

// Types
interface ServiceStatus {
  name: string
  status: 'healthy' | 'warning' | 'critical' | 'unknown'
  responseTime: number
  lastCheck: string
  uptime: number
}

interface SystemMetrics {
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
}

interface Alert {
  id: string
  severity: 'critical' | 'warning' | 'info'
  message: string
  service: string
  timestamp: string
  acknowledged: boolean
}

interface HealthData {
  status: 'healthy' | 'warning' | 'critical'
  timestamp: string
  uptime: number
  services: {
    database: ServiceStatus
    cache: ServiceStatus
    api: ServiceStatus
    external: Record<string, ServiceStatus>
  }
  checks: {
    application: {
      status: string
      memory: {
        used: number
        total: number
        percentUsed: string
      }
    }
    database: {
      status: string
      responseTime: number
    }
    cache: {
      status: string
      responseTime: number
    }
    performance: {
      status: string
      checks: {
        eventLoopLag: number
        memoryUsage: number
      }
    }
  }
}

interface MetricsData {
  http: {
    requests: {
      rate: number
      total: number
    }
    errors: {
      rate: number
      count: number
    }
    duration: {
      mean: number
      p50: number
      p95: number
      p99: number
    }
  }
  system: {
    cpu: {
      usage: number
    }
    memory: {
      used: number
      total: number
      percentUsed: string
    }
  }
}

interface ChartDataPoint {
  time: string
  cpu: number
  memory: number
  requests: number
  errors: number
}

interface MonitoringDashboardProps {
  embedded?: boolean
}

const REFRESH_INTERVAL = 30000 // 30 seconds

export default function MonitoringDashboard({ embedded = false }: MonitoringDashboardProps) {
  const [healthData, setHealthData] = useState<HealthData | null>(null)
  const [metricsData, setMetricsData] = useState<MetricsData | null>(null)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [autoRefresh, setAutoRefresh] = useState(true)

  const getAuthToken = () => localStorage.getItem('token')

  const fetchMonitoringData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const token = getAuthToken()
      if (!token) {
        throw new Error('Please log in to view monitoring data')
      }

      // Fetch health data
      const healthResponse = await fetch(`${API_BASE_URL}/health/detailed`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!healthResponse.ok) {
        throw new Error('Failed to fetch health data')
      }

      const healthResult = await healthResponse.json()
      if (healthResult.success !== false) {
        setHealthData(healthResult)
      }

      // Fetch metrics data
      const metricsResponse = await fetch(`${API_BASE_URL}/metrics`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (metricsResponse.ok) {
        const metricsResult = await metricsResponse.json()
        if (metricsResult.success && metricsResult.data) {
          setMetricsData(metricsResult.data)
          
          // Add to chart data
          const newDataPoint: ChartDataPoint = {
            time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
            cpu: metricsResult.data.system?.cpu?.usage || 0,
            memory: parseFloat(metricsResult.data.system?.memory?.percentUsed) || 0,
            requests: metricsResult.data.http?.requests?.rate || 0,
            errors: (metricsResult.data.http?.errors?.rate || 0) * 100
          }
          
          setChartData(prev => {
            const newData = [...prev, newDataPoint]
            // Keep last 20 data points
            return newData.slice(-20)
          })
        }
      }

      // Fetch recent logs/alerts
      const logsResponse = await fetch(`${API_BASE_URL}/logs/recent?limit=20&level=error`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (logsResponse.ok) {
        const logsResult = await logsResponse.json()
        if (logsResult.success && logsResult.data?.logs) {
          const mappedAlerts: Alert[] = logsResult.data.logs.map((log: any, index: number) => ({
            id: `alert-${index}`,
            severity: log.level === 'error' ? 'critical' : log.level === 'warn' ? 'warning' : 'info',
            message: log.message,
            service: log.metadata?.service || 'system',
            timestamp: log.timestamp,
            acknowledged: false
          }))
          setAlerts(mappedAlerts)
        }
      }

      setLastRefresh(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load monitoring data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMonitoringData()
  }, [fetchMonitoringData])

  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      fetchMonitoringData()
    }, REFRESH_INTERVAL)

    return () => clearInterval(interval)
  }, [autoRefresh, fetchMonitoringData])

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
        return <InfoIcon className="w-4 h-4 text-blue-500" />
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

  if (loading && !healthData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (error && !healthData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={fetchMonitoringData}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    )
  }

  const overallStatus = healthData?.status || 'unknown'
  const uptimePercentage = healthData?.uptime ? ((healthData.uptime / (healthData.uptime + 0)) * 100).toFixed(2) : '99.99'

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className={`bg-gradient-to-br ${
        overallStatus === 'healthy' ? 'from-green-600 to-emerald-700' :
        overallStatus === 'warning' ? 'from-amber-600 to-orange-700' :
        'from-red-600 to-rose-700'
      } p-6 text-white`}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 rounded-xl">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">System Monitoring</h2>
              <p className="text-white/80 text-sm">Real-time system health and metrics</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                autoRefresh ? 'bg-white/20' : 'bg-white/10'
              }`}
            >
              <RefreshCw className={`w-4 h-4 inline mr-1 ${autoRefresh ? 'animate-spin' : ''}`} />
              {autoRefresh ? 'Auto' : 'Manual'}
            </button>
            <button
              onClick={fetchMonitoringData}
              className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <span className={`px-3 py-1 rounded-full text-xs font-medium border bg-white/20 border-white/30`}>
              {getStatusIcon(overallStatus)}
              <span className="ml-1 capitalize">{overallStatus}</span>
            </span>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/10 backdrop-blur-sm rounded-xl p-4"
          >
            <div className="flex items-center gap-2 text-white/80 text-sm mb-1">
              <Clock className="w-4 h-4" />
              Uptime
            </div>
            <div className="text-2xl font-bold">{formatUptime(healthData?.uptime || 0)}</div>
            <div className="text-xs text-white/60">{uptimePercentage}% availability</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/10 backdrop-blur-sm rounded-xl p-4"
          >
            <div className="flex items-center gap-2 text-white/80 text-sm mb-1">
              <Zap className="w-4 h-4" />
              Requests/sec
            </div>
            <div className="text-2xl font-bold">{metricsData?.http?.requests?.rate?.toFixed(2) || '0.00'}</div>
            <div className="text-xs text-white/60">{metricsData?.http?.requests?.total?.toLocaleString() || 0} total</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/10 backdrop-blur-sm rounded-xl p-4"
          >
            <div className="flex items-center gap-2 text-white/80 text-sm mb-1">
              <Cpu className="w-4 h-4" />
              CPU Usage
            </div>
            <div className="text-2xl font-bold">{metricsData?.system?.cpu?.usage?.toFixed(1) || '0.0'}%</div>
            <div className="text-xs text-white/60">{healthData?.checks?.application?.memory?.percentUsed || '0%'} memory</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white/10 backdrop-blur-sm rounded-xl p-4"
          >
            <div className="flex items-center gap-2 text-white/80 text-sm mb-1">
              <AlertCircle className="w-4 h-4" />
              Error Rate
            </div>
            <div className="text-2xl font-bold">{((metricsData?.http?.errors?.rate || 0) * 100).toFixed(2)}%</div>
            <div className="text-xs text-white/60">{metricsData?.http?.errors?.count || 0} errors</div>
          </motion.div>
        </div>
      </div>

      {/* Service Status Cards */}
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-800 mb-4">Service Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Database */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 bg-gray-50 rounded-xl border border-gray-200"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-gray-700">Database</span>
              </div>
              {getStatusIcon(healthData?.checks?.database?.status || 'unknown')}
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Response Time</span>
                <span className="font-medium">{healthData?.checks?.database?.responseTime || 0}ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <span className={`px-2 py-0.5 rounded text-xs ${getStatusColor(healthData?.checks?.database?.status || 'unknown')}`}>
                  {healthData?.checks?.database?.status || 'unknown'}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Cache */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="p-4 bg-gray-50 rounded-xl border border-gray-200"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Server className="w-5 h-5 text-purple-600" />
                <span className="font-medium text-gray-700">Cache</span>
              </div>
              {getStatusIcon(healthData?.checks?.cache?.status || 'unknown')}
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Response Time</span>
                <span className="font-medium">{healthData?.checks?.cache?.responseTime || 0}ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <span className={`px-2 py-0.5 rounded text-xs ${getStatusColor(healthData?.checks?.cache?.status || 'unknown')}`}>
                  {healthData?.checks?.cache?.status || 'unknown'}
                </span>
              </div>
            </div>
          </motion.div>

          {/* API */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="p-4 bg-gray-50 rounded-xl border border-gray-200"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Wifi className="w-5 h-5 text-green-600" />
                <span className="font-medium text-gray-700">API</span>
              </div>
              {getStatusIcon('healthy')}
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Response Time</span>
                <span className="font-medium">{metricsData?.http?.duration?.mean?.toFixed(0) || 0}ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">P95 Latency</span>
                <span className="font-medium">{metricsData?.http?.duration?.p95?.toFixed(0) || 0}ms</span>
              </div>
            </div>
          </motion.div>

          {/* External Services */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="p-4 bg-gray-50 rounded-xl border border-gray-200"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-amber-600" />
                <span className="font-medium text-gray-700">External</span>
              </div>
              <Shield className="w-5 h-5 text-green-500" />
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Services</span>
                <span className="font-medium">{Object.keys(healthData?.services?.external || {}).length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">All Healthy</span>
                <span className="font-medium text-green-600">
                  {Object.values(healthData?.services?.external || {}).every(s => s.status === 'healthy') ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-800 mb-4">System Metrics</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* CPU & Memory Chart */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <h4 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
              <Cpu className="w-4 h-4" />
              CPU & Memory Usage
            </h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="memoryGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="time" stroke="#9ca3af" fontSize={12} />
                  <YAxis stroke="#9ca3af" fontSize={12} unit="%" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb' }}
                  />
                  <Area type="monotone" dataKey="cpu" stroke="#3b82f6" fillOpacity={1} fill="url(#cpuGradient)" name="CPU %" />
                  <Area type="monotone" dataKey="memory" stroke="#8b5cf6" fillOpacity={1} fill="url(#memoryGradient)" name="Memory %" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Requests Chart */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <h4 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Request Rate & Error Rate
            </h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="time" stroke="#9ca3af" fontSize={12} />
                  <YAxis yAxisId="left" stroke="#9ca3af" fontSize={12} />
                  <YAxis yAxisId="right" orientation="right" stroke="#9ca3af" fontSize={12} unit="%" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb' }}
                  />
                  <Line yAxisId="left" type="monotone" dataKey="requests" stroke="#10b981" strokeWidth={2} name="Req/sec" />
                  <Line yAxisId="right" type="monotone" dataKey="errors" stroke="#ef4444" strokeWidth={2} name="Error %" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts Panel */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-800 flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Active Alerts
          </h3>
          <span className="text-sm text-gray-500">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </span>
        </div>
        
        <div className="space-y-3 max-h-96 overflow-y-auto">
          <AnimatePresence>
            {alerts.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8 text-gray-500 bg-gray-50 rounded-xl"
              >
                <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
                <p>No active alerts</p>
                <p className="text-sm mt-1">All systems operating normally</p>
              </motion.div>
            ) : (
              alerts.slice(0, 10).map((alert, index) => (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`p-4 rounded-xl border ${
                    alert.severity === 'critical' ? 'bg-red-50 border-red-200' :
                    alert.severity === 'warning' ? 'bg-amber-50 border-amber-200' :
                    'bg-blue-50 border-blue-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {getSeverityIcon(alert.severity)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          alert.severity === 'critical' ? 'bg-red-100 text-red-700' :
                          alert.severity === 'warning' ? 'bg-amber-100 text-amber-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {alert.severity.toUpperCase()}
                        </span>
                        <span className="text-sm text-gray-500">{alert.service}</span>
                      </div>
                      <p className="text-gray-800 mt-1">{alert.message}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(alert.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

// Helper component for info icon
function InfoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}
