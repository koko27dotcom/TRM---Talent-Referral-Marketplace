import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity,
  Database,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  RefreshCw,
  Download,
  AlertCircle,
  Server,
  Zap,
  Search,
  ChevronUp,
  ChevronDown,
  Filter,
  BarChart3,
  Cpu,
  HardDrive,
  AlertTriangle,
  CheckCircle,
  XCircle,
  FileText
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
  Cell,
  PieChart,
  Pie
} from 'recharts'

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

type TimeRange = '1h' | '24h' | '7d' | '30d'
type SortField = 'requests' | 'duration' | 'errorRate' | 'p95'
type SortOrder = 'asc' | 'desc'

// Types
interface PerformanceSummary {
  status: string
  requestsPerSecond: string
  errorRate: string
  avgResponseTime: string
  p95ResponseTime: string
  cpuUsage: string
  memoryUsage: string
  eventLoopLag: string
  cacheHitRate: string
}

interface EndpointMetric {
  key: string
  requests: number
  errorRate: number
  duration: {
    mean: number
    p50: number
    p95: number
    p99: number
  }
}

interface QueryStats {
  totalQueries: number
  slowQueries: number
  avgDuration: string
  slowQueryRate: string
  topPatterns: Array<{
    pattern: string
    count: number
    avgDuration: number
  }>
  slowestPatterns: Array<{
    pattern: string
    count: number
    avgDuration: number
  }>
}

interface DatabaseStats {
  queryStats: QueryStats
  connectionPool: {
    min: number
    max: number
    current: number
    available: number
  }
}

interface CacheStats {
  hitRate: number
  missRate: number
  hits: number
  misses: number
  size: number
}

interface PerformanceData {
  timestamp: string
  timeWindow: TimeRange
  summary: PerformanceSummary
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
  database: DatabaseStats
  cache: CacheStats
  endpoints: EndpointMetric[]
}

interface Recommendation {
  type: string
  severity: 'high' | 'medium' | 'low'
  message: string
  details: string
  actions: string[]
}

interface OptimizationData {
  totalRecommendations: number
  highPriority: number
  mediumPriority: number
  lowPriority: number
  recommendations: Recommendation[]
}

interface ChartDataPoint {
  time: string
  p50: number
  p95: number
  p99: number
}

interface PerformanceMetricsProps {
  embedded?: boolean
}

export default function PerformanceMetrics({ embedded = false }: PerformanceMetricsProps) {
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null)
  const [optimizationData, setOptimizationData] = useState<OptimizationData | null>(null)
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<TimeRange>('1h')
  const [sortField, setSortField] = useState<SortField>('requests')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [searchQuery, setSearchQuery] = useState('')
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  const getAuthToken = () => localStorage.getItem('token')

  const fetchPerformanceData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const token = getAuthToken()
      if (!token) {
        throw new Error('Please log in to view performance data')
      }

      // Fetch performance report
      const reportResponse = await fetch(`${API_BASE_URL}/performance/report?timeWindow=${timeRange}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!reportResponse.ok) {
        throw new Error('Failed to fetch performance data')
      }

      const reportResult = await reportResponse.json()
      if (reportResult.success && reportResult.data) {
        setPerformanceData(reportResult.data)
        
        // Generate chart data based on percentiles
        const newDataPoint: ChartDataPoint = {
          time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
          p50: reportResult.data.http?.duration?.p50 || 0,
          p95: reportResult.data.http?.duration?.p95 || 0,
          p99: reportResult.data.http?.duration?.p99 || 0
        }
        
        setChartData(prev => {
          const newData = [...prev, newDataPoint]
          return newData.slice(-20)
        })
      }

      // Fetch optimization recommendations
      const optResponse = await fetch(`${API_BASE_URL}/performance/optimization`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (optResponse.ok) {
        const optResult = await optResponse.json()
        if (optResult.success && optResult.data) {
          setOptimizationData(optResult.data)
        }
      }

      setLastRefresh(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load performance data')
    } finally {
      setLoading(false)
    }
  }, [timeRange])

  useEffect(() => {
    fetchPerformanceData()
  }, [fetchPerformanceData])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  const getSortedEndpoints = () => {
    if (!performanceData?.endpoints) return []
    
    let filtered = performanceData.endpoints.filter(e => 
      e.key.toLowerCase().includes(searchQuery.toLowerCase())
    )
    
    filtered.sort((a, b) => {
      let aVal: number
      let bVal: number
      
      switch (sortField) {
        case 'requests':
          aVal = a.requests
          bVal = b.requests
          break
        case 'duration':
          aVal = a.duration.mean
          bVal = b.duration.mean
          break
        case 'errorRate':
          aVal = a.errorRate
          bVal = b.errorRate
          break
        case 'p95':
          aVal = a.duration.p95
          bVal = b.duration.p95
          break
        default:
          aVal = a.requests
          bVal = b.requests
      }
      
      return sortOrder === 'desc' ? bVal - aVal : aVal - bVal
    })
    
    return filtered
  }

  const exportMetrics = () => {
    if (!performanceData) return
    
    const dataStr = JSON.stringify(performanceData, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `performance-metrics-${new Date().toISOString()}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high':
        return <XCircle className="w-5 h-5 text-red-500" />
      case 'medium':
        return <AlertTriangle className="w-5 h-5 text-amber-500" />
      default:
        return <CheckCircle className="w-5 h-5 text-blue-500" />
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-100 text-red-700 border-red-300'
      case 'medium':
        return 'bg-amber-100 text-amber-700 border-amber-300'
      default:
        return 'bg-blue-100 text-blue-700 border-blue-300'
    }
  }

  if (loading && !performanceData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (error && !performanceData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={fetchPerformanceData}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    )
  }

  const sortedEndpoints = getSortedEndpoints()

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 rounded-xl">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Performance Metrics</h2>
              <p className="text-blue-100 text-sm">System performance analysis and optimization</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Time Range Selector */}
            <div className="flex bg-white/10 rounded-lg p-1">
              {(['1h', '24h', '7d', '30d'] as TimeRange[]).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    timeRange === range
                      ? 'bg-white text-blue-600'
                      : 'text-white hover:bg-white/10'
                  }`}
                >
                  {range === '1h' ? '1H' : range === '24h' ? '24H' : range === '7d' ? '7D' : '30D'}
                </button>
              ))}
            </div>
            <button
              onClick={fetchPerformanceData}
              className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={exportMetrics}
              className="flex items-center gap-2 px-3 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span className="text-sm hidden sm:inline">Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Performance Overview Cards */}
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-800 mb-4">Response Time Percentiles</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200"
          >
            <div className="flex items-center gap-2 text-green-700 text-sm mb-2">
              <Clock className="w-4 h-4" />
              P50 (Median)
            </div>
            <div className="text-3xl font-bold text-green-800">
              {performanceData?.http?.duration?.p50?.toFixed(0) || 0}ms
            </div>
            <div className="text-xs text-green-600 mt-1">50% of requests</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200"
          >
            <div className="flex items-center gap-2 text-blue-700 text-sm mb-2">
              <Clock className="w-4 h-4" />
              P95
            </div>
            <div className="text-3xl font-bold text-blue-800">
              {performanceData?.http?.duration?.p95?.toFixed(0) || 0}ms
            </div>
            <div className="text-xs text-blue-600 mt-1">95% of requests</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-200"
          >
            <div className="flex items-center gap-2 text-purple-700 text-sm mb-2">
              <Clock className="w-4 h-4" />
              P99
            </div>
            <div className="text-3xl font-bold text-purple-800">
              {performanceData?.http?.duration?.p99?.toFixed(0) || 0}ms
            </div>
            <div className="text-xs text-purple-600 mt-1">99% of requests</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200"
          >
            <div className="flex items-center gap-2 text-amber-700 text-sm mb-2">
              <Zap className="w-4 h-4" />
              Average
            </div>
            <div className="text-3xl font-bold text-amber-800">
              {performanceData?.http?.duration?.mean?.toFixed(0) || 0}ms
            </div>
            <div className="text-xs text-amber-600 mt-1">Mean response time</div>
          </motion.div>
        </div>
      </div>

      {/* Response Time Trends Chart */}
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-800 mb-4">Response Time Trends</h3>
        <div className="h-72 bg-gray-50 rounded-xl p-4 border border-gray-200">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="time" stroke="#9ca3af" fontSize={12} />
              <YAxis stroke="#9ca3af" fontSize={12} unit="ms" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb' }}
              />
              <Line type="monotone" dataKey="p50" stroke="#10b981" strokeWidth={2} name="P50" dot={false} />
              <Line type="monotone" dataKey="p95" stroke="#3b82f6" strokeWidth={2} name="P95" dot={false} />
              <Line type="monotone" dataKey="p99" stroke="#8b5cf6" strokeWidth={2} name="P99" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Database & Cache Metrics */}
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-800 mb-4">Database & Cache Performance</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Database Stats */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-4">
              <Database className="w-5 h-5 text-blue-600" />
              <h4 className="font-medium text-gray-700">Database Metrics</h4>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Queries</span>
                <span className="font-semibold text-gray-800">
                  {performanceData?.database?.queryStats?.totalQueries?.toLocaleString() || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Slow Queries</span>
                <span className="font-semibold text-gray-800">
                  {performanceData?.database?.queryStats?.slowQueries || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Avg Duration</span>
                <span className="font-semibold text-gray-800">
                  {performanceData?.database?.queryStats?.avgDuration || '0ms'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Slow Query Rate</span>
                <span className={`font-semibold ${
                  parseFloat(performanceData?.database?.queryStats?.slowQueryRate || '0') > 10 
                    ? 'text-red-600' : 'text-green-600'
                }`}>
                  {performanceData?.database?.queryStats?.slowQueryRate || '0%'}
                </span>
              </div>
              <div className="pt-3 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Connection Pool</span>
                  <span className="font-semibold text-gray-800">
                    {performanceData?.database?.connectionPool?.current || 0} / {performanceData?.database?.connectionPool?.max || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Cache Stats */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-4">
              <Server className="w-5 h-5 text-purple-600" />
              <h4 className="font-medium text-gray-700">Cache Metrics</h4>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Hit Rate</span>
                <span className="font-semibold text-green-600">
                  {((performanceData?.cache?.hitRate || 0) * 100).toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Miss Rate</span>
                <span className="font-semibold text-amber-600">
                  {((performanceData?.cache?.missRate || 0) * 100).toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Hits</span>
                <span className="font-semibold text-gray-800">
                  {performanceData?.cache?.hits?.toLocaleString() || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Misses</span>
                <span className="font-semibold text-gray-800">
                  {performanceData?.cache?.misses?.toLocaleString() || 0}
                </span>
              </div>
              <div className="pt-3 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Cache Size</span>
                  <span className="font-semibold text-gray-800">
                    {(performanceData?.cache?.size || 0).toLocaleString()} items
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Endpoint Performance Table */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <h3 className="text-lg font-medium text-gray-800">Endpoint Performance</h3>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search endpoints..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Endpoint</th>
                <th 
                  className="text-right py-3 px-4 text-sm font-medium text-gray-600 cursor-pointer hover:text-gray-800"
                  onClick={() => handleSort('requests')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Requests
                    {sortField === 'requests' && (
                      sortOrder === 'desc' ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />
                    )}
                  </div>
                </th>
                <th 
                  className="text-right py-3 px-4 text-sm font-medium text-gray-600 cursor-pointer hover:text-gray-800"
                  onClick={() => handleSort('duration')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Avg (ms)
                    {sortField === 'duration' && (
                      sortOrder === 'desc' ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />
                    )}
                  </div>
                </th>
                <th 
                  className="text-right py-3 px-4 text-sm font-medium text-gray-600 cursor-pointer hover:text-gray-800"
                  onClick={() => handleSort('p95')}
                >
                  <div className="flex items-center justify-end gap-1">
                    P95 (ms)
                    {sortField === 'p95' && (
                      sortOrder === 'desc' ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />
                    )}
                  </div>
                </th>
                <th 
                  className="text-right py-3 px-4 text-sm font-medium text-gray-600 cursor-pointer hover:text-gray-800"
                  onClick={() => handleSort('errorRate')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Error Rate
                    {sortField === 'errorRate' && (
                      sortOrder === 'desc' ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />
                    )}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {sortedEndpoints.slice(0, 10).map((endpoint, index) => (
                  <motion.tr
                    key={endpoint.key}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="py-3 px-4">
                      <code className="text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded">
                        {endpoint.key}
                      </code>
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-gray-800">
                      {endpoint.requests.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-600">
                      {endpoint.duration.mean.toFixed(0)}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-600">
                      {endpoint.duration.p95.toFixed(0)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        endpoint.errorRate > 0.05 ? 'bg-red-100 text-red-700' :
                        endpoint.errorRate > 0.01 ? 'bg-amber-100 text-amber-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {(endpoint.errorRate * 100).toFixed(2)}%
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
          {sortedEndpoints.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No endpoints found</p>
            </div>
          )}
        </div>
      </div>

      {/* Optimization Recommendations */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-800 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Optimization Recommendations
          </h3>
          {optimizationData && (
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                {optimizationData.highPriority} High
              </span>
              <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
                {optimizationData.mediumPriority} Medium
              </span>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <AnimatePresence>
            {!optimizationData || optimizationData.recommendations.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8 text-gray-500 bg-gray-50 rounded-xl"
              >
                <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
                <p>No optimization recommendations</p>
                <p className="text-sm mt-1">System is running optimally</p>
              </motion.div>
            ) : (
              optimizationData.recommendations.map((rec, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`p-4 rounded-xl border ${getSeverityColor(rec.severity)}`}
                >
                  <div className="flex items-start gap-3">
                    {getSeverityIcon(rec.severity)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{rec.message}</span>
                        <span className="px-2 py-0.5 rounded text-xs bg-white/50">
                          {rec.type}
                        </span>
                      </div>
                      <p className="text-sm opacity-80 mb-2">{rec.details}</p>
                      <div className="flex flex-wrap gap-2">
                        {rec.actions.map((action, i) => (
                          <span key={i} className="text-xs px-2 py-1 bg-white/50 rounded">
                            {action}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        <div className="mt-4 text-right text-sm text-gray-500">
          Last updated: {lastRefresh.toLocaleTimeString()}
        </div>
      </div>
    </div>
  )
}
