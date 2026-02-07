import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Server,
  Database,
  Zap,
  Loader2,
  RefreshCw,
  Trash2,
  Search,
  AlertCircle,
  CheckCircle,
  XCircle,
  Key,
  Tag,
  Filter,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Activity,
  HardDrive,
  TrendingUp,
  TrendingDown,
  Minus,
  Wifi,
  WifiOff,
  Layers,
  X
} from 'lucide-react'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip
} from 'recharts'

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

// Types
interface L1Stats {
  hits: number
  misses: number
  hitRate: string
  missRate: string
  size: number
  memoryUsageMB: string
  maxSize: number
  totalSize: number
}

interface L2Stats {
  hits: number
  misses: number
  hitRate: string
  missRate: string
  size: number
  connected: boolean
}

interface CacheStats {
  timestamp: string
  overall: {
    hitRate: string
    missRate: string
    totalHits: number
    totalMisses: number
  }
  l1: L1Stats
  l2: L2Stats
}

interface CacheHealth {
  status: string
  l1: {
    status: string
    size: number
    hitRate: number
    missRate: number
  }
  l2: {
    status: string
    connected: boolean
    hitRate: number
    missRate: number
  }
}

interface CacheKey {
  key: string
  createdAt: string
  expiresAt: string
  size: number
  accessCount: number
  tags: string[]
  isExpired: boolean
}

interface CacheKeysResponse {
  keys: CacheKey[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
  filters: {
    pattern: string | null
    type: string | null
  }
}

interface CacheManagerProps {
  embedded?: boolean
}

const CACHE_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'user', label: 'User' },
  { value: 'job', label: 'Job' },
  { value: 'company', label: 'Company' },
  { value: 'analytics', label: 'Analytics' },
  { value: 'session', label: 'Session' },
  { value: 'api', label: 'API Response' },
]

export default function CacheManager({ embedded = false }: CacheManagerProps) {
  const [stats, setStats] = useState<CacheStats | null>(null)
  const [health, setHealth] = useState<CacheHealth | null>(null)
  const [keysData, setKeysData] = useState<CacheKeysResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchPattern, setSearchPattern] = useState('')
  const [selectedType, setSelectedType] = useState('')
  const [invalidateKey, setInvalidateKey] = useState('')
  const [invalidatePattern, setInvalidatePattern] = useState('')
  const [invalidateTag, setInvalidateTag] = useState('')
  const [showFlushConfirm, setShowFlushConfirm] = useState(false)
  const [flushConfirmText, setFlushConfirmText] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  const getAuthToken = () => localStorage.getItem('token')

  const fetchCacheData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const token = getAuthToken()
      if (!token) {
        throw new Error('Please log in to view cache data')
      }

      // Fetch cache stats
      const statsResponse = await fetch(`${API_BASE_URL}/cache/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!statsResponse.ok) {
        throw new Error('Failed to fetch cache stats')
      }

      const statsResult = await statsResponse.json()
      if (statsResult.success && statsResult.data) {
        setStats(statsResult.data)
      }

      // Fetch cache health
      const healthResponse = await fetch(`${API_BASE_URL}/cache/health`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (healthResponse.ok) {
        const healthResult = await healthResponse.json()
        if (healthResult.success && healthResult.data) {
          setHealth(healthResult.data)
        }
      }

      // Fetch cache keys
      await fetchCacheKeys(currentPage)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cache data')
    } finally {
      setLoading(false)
    }
  }, [currentPage])

  const fetchCacheKeys = async (page: number) => {
    const token = getAuthToken()
    if (!token) return

    const params = new URLSearchParams()
    params.append('page', page.toString())
    params.append('limit', '20')
    if (searchPattern) params.append('pattern', searchPattern)
    if (selectedType) params.append('type', selectedType)

    const response = await fetch(`${API_BASE_URL}/cache/keys?${params}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    if (response.ok) {
      const result = await response.json()
      if (result.success && result.data) {
        setKeysData(result.data)
      }
    }
  }

  useEffect(() => {
    fetchCacheData()
  }, [fetchCacheData])

  const handleFlushCache = async () => {
    if (flushConfirmText !== 'flush-all-cache') {
      setActionSuccess(null)
      return
    }

    try {
      setActionLoading(true)
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
        setActionSuccess('All caches flushed successfully')
        setShowFlushConfirm(false)
        setFlushConfirmText('')
        fetchCacheData()
      } else {
        const result = await response.json()
        setError(result.message || 'Failed to flush cache')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to flush cache')
    } finally {
      setActionLoading(false)
    }
  }

  const handleInvalidate = async (type: 'key' | 'pattern' | 'tag', value: string) => {
    if (!value.trim()) return

    try {
      setActionLoading(true)
      const token = getAuthToken()
      
      const body: any = {}
      if (type === 'key') body.key = value
      else if (type === 'pattern') body.pattern = value
      else if (type === 'tag') body.tag = value

      const response = await fetch(`${API_BASE_URL}/cache/invalidate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      })

      if (response.ok) {
        setActionSuccess(`Cache invalidated by ${type}: ${value}`)
        if (type === 'key') setInvalidateKey('')
        else if (type === 'pattern') setInvalidatePattern('')
        else if (type === 'tag') setInvalidateTag('')
        fetchCacheData()
      } else {
        const result = await response.json()
        setError(result.message || 'Failed to invalidate cache')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to invalidate cache')
    } finally {
      setActionLoading(false)
    }
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

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const hitMissData = stats ? [
    { name: 'Hits', value: stats.overall.totalHits, color: '#10b981' },
    { name: 'Misses', value: stats.overall.totalMisses, color: '#ef4444' }
  ] : []

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (error && !stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={fetchCacheData}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-600 to-pink-700 p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 rounded-xl">
              <Server className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Cache Manager</h2>
              <p className="text-purple-100 text-sm">L1 & L2 cache management and monitoring</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchCacheData}
              className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowFlushConfirm(true)}
              className="flex items-center gap-2 px-3 py-2 bg-red-500/80 hover:bg-red-500 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline text-sm">Flush All</span>
            </button>
          </div>
        </div>
      </div>

      {/* Success Message */}
      <AnimatePresence>
        {actionSuccess && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-green-50 border-b border-green-200 p-4"
          >
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="w-5 h-5" />
              <span>{actionSuccess}</span>
              <button
                onClick={() => setActionSuccess(null)}
                className="ml-auto p-1 hover:bg-green-100 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cache Statistics Cards */}
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-800 mb-4">Cache Statistics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* L1 Cache */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-600" />
                <h4 className="font-medium text-gray-800">L1 Cache (Memory)</h4>
              </div>
              <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(health?.l1?.status || 'unknown')}`}>
                {health?.l1?.status || 'unknown'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center p-3 bg-white rounded-lg">
                <div className="text-2xl font-bold text-green-600">{stats?.l1?.hitRate || '0%'}</div>
                <div className="text-xs text-gray-500">Hit Rate</div>
              </div>
              <div className="text-center p-3 bg-white rounded-lg">
                <div className="text-2xl font-bold text-red-600">{stats?.l1?.missRate || '0%'}</div>
                <div className="text-xs text-gray-500">Miss Rate</div>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Items</span>
                <span className="font-medium">{stats?.l1?.size?.toLocaleString() || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Memory Usage</span>
                <span className="font-medium">{stats?.l1?.memoryUsageMB || '0'} MB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Hits</span>
                <span className="font-medium text-green-600">{stats?.l1?.hits?.toLocaleString() || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Misses</span>
                <span className="font-medium text-red-600">{stats?.l1?.misses?.toLocaleString() || 0}</span>
              </div>
            </div>
          </motion.div>

          {/* L2 Cache */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="p-5 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-200"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-purple-600" />
                <h4 className="font-medium text-gray-800">L2 Cache (Redis)</h4>
              </div>
              <div className="flex items-center gap-2">
                {health?.l2?.connected ? (
                  <Wifi className="w-4 h-4 text-green-500" />
                ) : (
                  <WifiOff className="w-4 h-4 text-red-500" />
                )}
                <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(health?.l2?.status || 'unknown')}`}>
                  {health?.l2?.connected ? 'connected' : 'disconnected'}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center p-3 bg-white rounded-lg">
                <div className="text-2xl font-bold text-green-600">{stats?.l2?.hitRate || '0%'}</div>
                <div className="text-xs text-gray-500">Hit Rate</div>
              </div>
              <div className="text-center p-3 bg-white rounded-lg">
                <div className="text-2xl font-bold text-red-600">{stats?.l2?.missRate || '0%'}</div>
                <div className="text-xs text-gray-500">Miss Rate</div>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Items</span>
                <span className="font-medium">{stats?.l2?.size?.toLocaleString() || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Connection</span>
                <span className={`font-medium ${health?.l2?.connected ? 'text-green-600' : 'text-red-600'}`}>
                  {health?.l2?.connected ? 'Healthy' : 'Disconnected'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Hits</span>
                <span className="font-medium text-green-600">{stats?.l2?.hits?.toLocaleString() || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Misses</span>
                <span className="font-medium text-red-600">{stats?.l2?.misses?.toLocaleString() || 0}</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Hit/Miss Visualization */}
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-800 mb-4">Cache Efficiency</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={hitMissData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {hitMissData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-sm text-gray-600">Hits ({stats?.overall?.hitRate || '0%'})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-sm text-gray-600">Misses ({stats?.overall?.missRate || '0%'})</span>
              </div>
            </div>
          </div>

          {/* Overall Stats */}
          <div className="md:col-span-2 grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div className="flex items-center gap-2 text-gray-600 mb-2">
                <Activity className="w-4 h-4" />
                <span className="text-sm">Total Hits</span>
              </div>
              <div className="text-3xl font-bold text-green-600">
                {stats?.overall?.totalHits?.toLocaleString() || 0}
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div className="flex items-center gap-2 text-gray-600 mb-2">
                <TrendingDown className="w-4 h-4" />
                <span className="text-sm">Total Misses</span>
              </div>
              <div className="text-3xl font-bold text-red-600">
                {stats?.overall?.totalMisses?.toLocaleString() || 0}
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div className="flex items-center gap-2 text-gray-600 mb-2">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm">Overall Hit Rate</span>
              </div>
              <div className="text-3xl font-bold text-blue-600">
                {stats?.overall?.hitRate || '0%'}
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div className="flex items-center gap-2 text-gray-600 mb-2">
                <HardDrive className="w-4 h-4" />
                <span className="text-sm">Total Items</span>
              </div>
              <div className="text-3xl font-bold text-purple-600">
                {((stats?.l1?.size || 0) + (stats?.l2?.size || 0)).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cache Operations */}
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-800 mb-4">Cache Operations</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Invalidate by Key */}
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <Key className="w-4 h-4 text-blue-600" />
              <h4 className="font-medium text-gray-700">Invalidate by Key</h4>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter key..."
                value={invalidateKey}
                onChange={(e) => setInvalidateKey(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => handleInvalidate('key', invalidateKey)}
                disabled={!invalidateKey.trim() || actionLoading}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Invalidate by Pattern */}
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-4 h-4 text-purple-600" />
              <h4 className="font-medium text-gray-700">Invalidate by Pattern</h4>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g., user:*"
                value={invalidatePattern}
                onChange={(e) => setInvalidatePattern(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                onClick={() => handleInvalidate('pattern', invalidatePattern)}
                disabled={!invalidatePattern.trim() || actionLoading}
                className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Invalidate by Tag */}
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <Tag className="w-4 h-4 text-amber-600" />
              <h4 className="font-medium text-gray-700">Invalidate by Tag</h4>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter tag..."
                value={invalidateTag}
                onChange={(e) => setInvalidateTag(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <button
                onClick={() => handleInvalidate('tag', invalidateTag)}
                disabled={!invalidateTag.trim() || actionLoading}
                className="px-3 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Cache Keys Browser */}
      <div className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <h3 className="text-lg font-medium text-gray-800">Cache Keys Browser</h3>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search pattern..."
                value={searchPattern}
                onChange={(e) => setSearchPattern(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && fetchCacheKeys(1)}
                className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <select
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value)
                setCurrentPage(1)
              }}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              {CACHE_TYPES.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Keys Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Key</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Tags</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Size</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Accesses</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Expires</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {keysData?.keys.map((key, index) => (
                  <motion.tr
                    key={key.key}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className={`border-b border-gray-100 hover:bg-gray-50 ${key.isExpired ? 'opacity-50' : ''}`}
                  >
                    <td className="py-3 px-4">
                      <code className="text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded truncate max-w-xs block">
                        {key.key}
                      </code>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {key.tags.slice(0, 3).map((tag, i) => (
                          <span key={i} className="text-xs px-2 py-0.5 bg-gray-100 rounded">
                            {tag}
                          </span>
                        ))}
                        {key.tags.length > 3 && (
                          <span className="text-xs px-2 py-0.5 bg-gray-100 rounded">
                            +{key.tags.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right text-gray-600">
                      {formatBytes(key.size)}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-600">
                      {key.accessCount}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-sm ${key.isExpired ? 'text-red-600' : 'text-gray-600'}`}>
                        {new Date(key.expiresAt).toLocaleString()}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
          {(!keysData || keysData.keys.length === 0) && (
            <div className="text-center py-8 text-gray-500">
              <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No cache keys found</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {keysData && keysData.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-500">
              Showing {((keysData.pagination.page - 1) * keysData.pagination.limit) + 1} - {Math.min(keysData.pagination.page * keysData.pagination.limit, keysData.pagination.total)} of {keysData.pagination.total}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={!keysData.pagination.hasPrevPage}
                className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-600">
                Page {keysData.pagination.page} of {keysData.pagination.totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => p + 1)}
                disabled={!keysData.pagination.hasNextPage}
                className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Flush Confirmation Modal */}
      <AnimatePresence>
        {showFlushConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-red-100 rounded-full">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800">Flush All Caches?</h3>
                  <p className="text-sm text-gray-500">This action cannot be undone</p>
                </div>
              </div>
              
              <p className="text-gray-600 mb-4">
                This will clear all data from both L1 (memory) and L2 (Redis) caches. 
                The system may experience temporary performance degradation.
              </p>

              <div className="bg-gray-50 p-3 rounded-lg mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  Type <code className="bg-gray-200 px-1 rounded">flush-all-cache</code> to confirm:
                </p>
                <input
                  type="text"
                  value={flushConfirmText}
                  onChange={(e) => setFlushConfirmText(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="flush-all-cache"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowFlushConfirm(false)
                    setFlushConfirmText('')
                  }}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleFlushCache}
                  disabled={flushConfirmText !== 'flush-all-cache' || actionLoading}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {actionLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                  ) : (
                    'Flush Cache'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
