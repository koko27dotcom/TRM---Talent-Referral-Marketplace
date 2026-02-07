import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Database,
  Search,
  Zap,
  Clock,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  Play,
  Pause,
  Trash2,
  Plus,
  Settings,
  BarChart3,
  Activity,
  FileText,
  Layers,
  Cpu,
  HardDrive,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Filter,
  Download,
  Lightbulb,
  AlertTriangle,
  Info
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

interface SlowQuery {
  id: string
  query: string
  collection: string
  executionTime: number
  timestamp: string
  count: number
  avgTime: number
  maxTime: number
  indexUsed: boolean
}

interface IndexRecommendation {
  id: string
  collection: string
  fields: string[]
  impact: 'high' | 'medium' | 'low'
  estimatedImprovement: number
  queriesAffected: number
  currentTime: number
  estimatedTime: number
}

interface CollectionStats {
  name: string
  documentCount: number
  size: number
  avgDocumentSize: number
  indexCount: number
  indexSize: number
  storageSize: number
}

interface IndexInfo {
  name: string
  collection: string
  fields: string[]
  size: number
  usage: number
  lastUsed: string
}

interface OptimizationTask {
  id: string
  name: string
  description: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: number
  startTime?: string
  endTime?: string
  result?: string
}

const mockSlowQueries: SlowQuery[] = [
  { id: '1', query: '{ "status": "active", "createdAt": { "$gte": ? } }', collection: 'jobs', executionTime: 2450, timestamp: '2024-01-21T10:30:00Z', count: 1250, avgTime: 2100, maxTime: 4500, indexUsed: false },
  { id: '2', query: '{ "companyId": ?, "isActive": true }', collection: 'referrals', executionTime: 1890, timestamp: '2024-01-21T10:25:00Z', count: 890, avgTime: 1650, maxTime: 3200, indexUsed: true },
  { id: '3', query: '{ "email": ? }', collection: 'users', executionTime: 1200, timestamp: '2024-01-21T10:20:00Z', count: 2500, avgTime: 800, maxTime: 1500, indexUsed: true },
  { id: '4', query: '{ "$text": { "$search": ? } }', collection: 'jobs', executionTime: 3200, timestamp: '2024-01-21T10:15:00Z', count: 450, avgTime: 2800, maxTime: 5800, indexUsed: false },
  { id: '5', query: '{ "userId": ?, "type": "payout" }', collection: 'transactions', executionTime: 980, timestamp: '2024-01-21T10:10:00Z', count: 320, avgTime: 750, maxTime: 1200, indexUsed: true }
]

const mockIndexRecommendations: IndexRecommendation[] = [
  { id: 'rec-1', collection: 'jobs', fields: ['status', 'createdAt'], impact: 'high', estimatedImprovement: 85, queriesAffected: 1250, currentTime: 2450, estimatedTime: 350 },
  { id: 'rec-2', collection: 'jobs', fields: ['title', 'description'], impact: 'high', estimatedImprovement: 75, queriesAffected: 450, currentTime: 3200, estimatedTime: 800 },
  { id: 'rec-3', collection: 'referrals', fields: ['referrerId', 'status', 'createdAt'], impact: 'medium', estimatedImprovement: 60, queriesAffected: 680, currentTime: 1500, estimatedTime: 600 },
  { id: 'rec-4', collection: 'users', fields: ['role', 'lastActive'], impact: 'low', estimatedImprovement: 35, queriesAffected: 320, currentTime: 890, estimatedTime: 580 }
]

const mockCollectionStats: CollectionStats[] = [
  { name: 'users', documentCount: 15420, size: 45.2, avgDocumentSize: 3024, indexCount: 5, indexSize: 12.8, storageSize: 58.0 },
  { name: 'jobs', documentCount: 892, size: 18.5, avgDocumentSize: 21500, indexCount: 8, indexSize: 6.2, storageSize: 24.7 },
  { name: 'referrals', documentCount: 3240, size: 28.3, avgDocumentSize: 9100, indexCount: 6, indexSize: 8.5, storageSize: 36.8 },
  { name: 'companies', documentCount: 156, size: 2.1, avgDocumentSize: 13800, indexCount: 4, indexSize: 0.8, storageSize: 2.9 },
  { name: 'applications', documentCount: 5680, size: 22.4, avgDocumentSize: 4050, indexCount: 7, indexSize: 5.6, storageSize: 28.0 },
  { name: 'payouts', documentCount: 1840, size: 8.9, avgDocumentSize: 4980, indexCount: 5, indexSize: 2.1, storageSize: 11.0 }
]

const mockIndexes: IndexInfo[] = [
  { name: '_id_', collection: 'users', fields: ['_id'], size: 2.4, usage: 100, lastUsed: '2024-01-21T10:30:00Z' },
  { name: 'email_1', collection: 'users', fields: ['email'], size: 1.8, usage: 95, lastUsed: '2024-01-21T10:30:00Z' },
  { name: 'status_1_createdAt_-1', collection: 'jobs', fields: ['status', 'createdAt'], size: 1.2, usage: 78, lastUsed: '2024-01-21T10:25:00Z' },
  { name: 'companyId_1', collection: 'referrals', fields: ['companyId'], size: 0.9, usage: 65, lastUsed: '2024-01-21T10:20:00Z' },
  { name: 'userId_1_type_1', collection: 'transactions', fields: ['userId', 'type'], size: 0.6, usage: 45, lastUsed: '2024-01-21T09:45:00Z' },
  { name: 'title_text_description_text', collection: 'jobs', fields: ['title', 'description'], size: 2.1, usage: 23, lastUsed: '2024-01-21T08:30:00Z' }
]

const queryTimeData = [
  { time: '00:00', avgTime: 450, slowQueries: 2 },
  { time: '02:00', avgTime: 380, slowQueries: 1 },
  { time: '04:00', avgTime: 320, slowQueries: 0 },
  { time: '06:00', avgTime: 520, slowQueries: 3 },
  { time: '08:00', avgTime: 890, slowQueries: 8 },
  { time: '10:00', avgTime: 1200, slowQueries: 15 },
  { time: '12:00', avgTime: 1450, slowQueries: 22 },
  { time: '14:00', avgTime: 1100, slowQueries: 12 },
  { time: '16:00', avgTime: 950, slowQueries: 9 },
  { time: '18:00', avgTime: 750, slowQueries: 6 },
  { time: '20:00', avgTime: 580, slowQueries: 4 },
  { time: '22:00', avgTime: 480, slowQueries: 3 }
]

const collectionSizeData = mockCollectionStats.map(c => ({
  name: c.name,
  size: c.size,
  documents: c.documentCount / 1000
}))

export default function DatabaseOptimizer() {
  const [activeTab, setActiveTab] = useState<'overview' | 'queries' | 'indexes' | 'collections' | 'tasks'>('overview')
  const [slowQueries, setSlowQueries] = useState<SlowQuery[]>(mockSlowQueries)
  const [recommendations, setRecommendations] = useState<IndexRecommendation[]>(mockIndexRecommendations)
  const [collectionStats, setCollectionStats] = useState<CollectionStats[]>(mockCollectionStats)
  const [indexes, setIndexes] = useState<IndexInfo[]>(mockIndexes)
  const [optimizationTasks, setOptimizationTasks] = useState<OptimizationTask[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedCollection, setSelectedCollection] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateIndex, setShowCreateIndex] = useState(false)
  const [creatingIndex, setCreatingIndex] = useState(false)

  const getAuthToken = () => localStorage.getItem('token')

  const fetchDatabaseStats = useCallback(async () => {
    try {
      setLoading(true)
      const token = getAuthToken()
      if (!token) return

      // Fetch slow queries
      const queriesResponse = await fetch(`${API_BASE_URL}/database/slow-queries`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (queriesResponse.ok) {
        const result = await queriesResponse.json()
        if (result.success && result.data) {
          setSlowQueries(result.data)
        }
      }

      // Fetch index recommendations
      const recsResponse = await fetch(`${API_BASE_URL}/database/index-recommendations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (recsResponse.ok) {
        const result = await recsResponse.json()
        if (result.success && result.data) {
          setRecommendations(result.data)
        }
      }

      // Fetch collection stats
      const statsResponse = await fetch(`${API_BASE_URL}/database/collections`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (statsResponse.ok) {
        const result = await statsResponse.json()
        if (result.success && result.data) {
          setCollectionStats(result.data)
        }
      }

      // Fetch indexes
      const indexesResponse = await fetch(`${API_BASE_URL}/database/indexes`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (indexesResponse.ok) {
        const result = await indexesResponse.json()
        if (result.success && result.data) {
          setIndexes(result.data)
        }
      }
    } catch (err) {
      console.error('Failed to fetch database stats:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDatabaseStats()
  }, [fetchDatabaseStats])

  const createIndex = async (recommendation: IndexRecommendation) => {
    try {
      setCreatingIndex(true)
      const token = getAuthToken()
      
      const response = await fetch(`${API_BASE_URL}/database/indexes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          collection: recommendation.collection,
          fields: recommendation.fields
        })
      })

      if (response.ok) {
        // Remove from recommendations
        setRecommendations(recommendations.filter(r => r.id !== recommendation.id))
        // Refresh indexes
        fetchDatabaseStats()
      }
    } catch (err) {
      console.error('Failed to create index:', err)
    } finally {
      setCreatingIndex(false)
      setShowCreateIndex(false)
    }
  }

  const dropIndex = async (indexName: string, collection: string) => {
    try {
      const token = getAuthToken()
      const response = await fetch(`${API_BASE_URL}/database/indexes/${indexName}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ collection })
      })

      if (response.ok) {
        setIndexes(indexes.filter(i => !(i.name === indexName && i.collection === collection)))
      }
    } catch (err) {
      console.error('Failed to drop index:', err)
    }
  }

  const runOptimization = async (taskType: string) => {
    const newTask: OptimizationTask = {
      id: `task-${Date.now()}`,
      name: taskType,
      description: getTaskDescription(taskType),
      status: 'running',
      progress: 0,
      startTime: new Date().toISOString()
    }

    setOptimizationTasks([newTask, ...optimizationTasks])

    // Simulate task progress
    let progress = 0
    const interval = setInterval(() => {
      progress += 10
      setOptimizationTasks(tasks =>
        tasks.map(t =>
          t.id === newTask.id ? { ...t, progress } : t
        )
      )

      if (progress >= 100) {
        clearInterval(interval)
        setOptimizationTasks(tasks =>
          tasks.map(t =>
            t.id === newTask.id
              ? { ...t, status: 'completed', progress: 100, endTime: new Date().toISOString() }
              : t
          )
        )
      }
    }, 500)
  }

  const getTaskDescription = (taskType: string): string => {
    switch (taskType) {
      case 'analyze_queries':
        return 'Analyzing slow queries and usage patterns'
      case 'compact_collections':
        return 'Compacting collections to reclaim disk space'
      case 'rebuild_indexes':
        return 'Rebuilding fragmented indexes'
      case 'update_stats':
        return 'Updating collection statistics'
      default:
        return 'Running optimization task'
    }
  }

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'bg-red-100 text-red-700 border-red-300'
      case 'medium':
        return 'bg-amber-100 text-amber-700 border-amber-300'
      case 'low':
        return 'bg-blue-100 text-blue-700 border-blue-300'
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300'
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const filteredQueries = slowQueries.filter(q => {
    const matchesCollection = selectedCollection === 'all' || q.collection === selectedCollection
    const matchesSearch = q.query.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         q.collection.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCollection && matchesSearch
  })

  const totalSize = collectionStats.reduce((acc, c) => acc + c.size, 0)
  const totalDocuments = collectionStats.reduce((acc, c) => acc + c.documentCount, 0)
  const totalIndexes = indexes.length
  const avgQueryTime = slowQueries.reduce((acc, q) => acc + q.avgTime, 0) / slowQueries.length || 0

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <Database className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg text-slate-900">Database Optimizer</h1>
                <p className="text-xs text-slate-500">Query Analysis & Index Management</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchDatabaseStats}
                className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={() => runOptimization('analyze_queries')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Zap className="w-4 h-4" />
                Run Analysis
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'queries', label: 'Slow Queries', icon: Clock },
              { id: 'indexes', label: 'Indexes', icon: Layers },
              { id: 'collections', label: 'Collections', icon: FileText },
              { id: 'tasks', label: 'Optimization Tasks', icon: Zap }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors relative ${
                  activeTab === tab.id
                    ? 'text-blue-600'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="activeDbTab"
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
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <DbStatCard
                  icon={FileText}
                  label="Total Documents"
                  value={totalDocuments.toLocaleString()}
                  subValue={`${collectionStats.length} collections`}
                  trend="+2.5%"
                  trendUp={true}
                  color="blue"
                />
                <DbStatCard
                  icon={HardDrive}
                  label="Storage Size"
                  value={`${totalSize.toFixed(1)} MB`}
                  subValue={`${indexes.length} indexes`}
                  trend="+1.2%"
                  trendUp={true}
                  color="purple"
                />
                <DbStatCard
                  icon={Clock}
                  label="Avg Query Time"
                  value={`${avgQueryTime.toFixed(0)}ms`}
                  subValue={`${slowQueries.length} slow queries`}
                  trend="-15%"
                  trendUp={false}
                  color="green"
                />
                <DbStatCard
                  icon={Layers}
                  label="Total Indexes"
                  value={totalIndexes.toString()}
                  subValue={`${recommendations.length} recommended`}
                  trend="+3"
                  trendUp={true}
                  color="amber"
                />
              </div>

              {/* Charts Row */}
              <div className="grid lg:grid-cols-2 gap-8">
                {/* Query Performance Chart */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">Query Performance (24h)</h3>
                      <p className="text-sm text-slate-500">Average execution time and slow query count</p>
                    </div>
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={queryTimeData}>
                        <defs>
                          <linearGradient id="colorTime" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} />
                        <YAxis yAxisId="left" stroke="#94a3b8" fontSize={12} />
                        <YAxis yAxisId="right" orientation="right" stroke="#ef4444" fontSize={12} />
                        <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                        <Area yAxisId="left" type="monotone" dataKey="avgTime" stroke="#3b82f6" fillOpacity={1} fill="url(#colorTime)" name="Avg Time (ms)" />
                        <Line yAxisId="right" type="monotone" dataKey="slowQueries" stroke="#ef4444" strokeWidth={2} name="Slow Queries" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Collection Size Chart */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">Collection Sizes</h3>
                      <p className="text-sm text-slate-500">Storage size by collection (MB)</p>
                    </div>
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={collectionSizeData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                        <XAxis type="number" stroke="#94a3b8" fontSize={12} />
                        <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={12} width={80} />
                        <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                        <Bar dataKey="size" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Index Recommendations Preview */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Recommended Indexes</h3>
                    <p className="text-sm text-slate-500">Suggested indexes to improve query performance</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('indexes')}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    View All
                  </button>
                </div>
                <div className="divide-y divide-slate-200">
                  {recommendations.slice(0, 3).map((rec) => (
                    <div key={rec.id} className="p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        rec.impact === 'high' ? 'bg-red-100' :
                        rec.impact === 'medium' ? 'bg-amber-100' :
                        'bg-blue-100'
                      }`}>
                        <Lightbulb className={`w-5 h-5 ${
                          rec.impact === 'high' ? 'text-red-600' :
                          rec.impact === 'medium' ? 'text-amber-600' :
                          'text-blue-600'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">
                          {rec.collection}.{rec.fields.join('_')}_1
                        </p>
                        <p className="text-sm text-slate-500">
                          {rec.queriesAffected} queries affected • {rec.estimatedImprovement}% improvement
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getImpactColor(rec.impact)}`}>
                        {rec.impact.charAt(0).toUpperCase() + rec.impact.slice(1)} Impact
                      </span>
                      <button
                        onClick={() => createIndex(rec)}
                        disabled={creatingIndex}
                        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                      >
                        {creatingIndex ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <button
                  onClick={() => runOptimization('compact_collections')}
                  className="p-6 bg-white rounded-2xl border border-slate-200 hover:border-blue-300 transition-colors text-left"
                >
                  <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center mb-4">
                    <HardDrive className="w-6 h-6 text-green-600" />
                  </div>
                  <h4 className="font-bold text-slate-900 mb-1">Compact Collections</h4>
                  <p className="text-sm text-slate-500">Reclaim disk space from deleted documents</p>
                </button>
                <button
                  onClick={() => runOptimization('rebuild_indexes')}
                  className="p-6 bg-white rounded-2xl border border-slate-200 hover:border-blue-300 transition-colors text-left"
                >
                  <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center mb-4">
                    <Layers className="w-6 h-6 text-purple-600" />
                  </div>
                  <h4 className="font-bold text-slate-900 mb-1">Rebuild Indexes</h4>
                  <p className="text-sm text-slate-500">Defragment and optimize existing indexes</p>
                </button>
                <button
                  onClick={() => runOptimization('update_stats')}
                  className="p-6 bg-white rounded-2xl border border-slate-200 hover:border-blue-300 transition-colors text-left"
                >
                  <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center mb-4">
                    <Activity className="w-6 h-6 text-amber-600" />
                  </div>
                  <h4 className="font-bold text-slate-900 mb-1">Update Statistics</h4>
                  <p className="text-sm text-slate-500">Refresh query planner statistics</p>
                </button>
              </div>
            </motion.div>
          )}

          {activeTab === 'queries' && (
            <motion.div
              key="queries"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Filters */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="relative flex-1 min-w-[300px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search queries..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <select
                    value={selectedCollection}
                    onChange={(e) => setSelectedCollection(e.target.value)}
                    className="px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Collections</option>
                    {collectionStats.map(c => (
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Slow Queries Table */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Query</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Collection</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Avg Time</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Count</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Index Used</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Last Executed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredQueries.map((query) => (
                      <tr key={query.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4">
                          <code className="text-sm bg-slate-100 px-2 py-1 rounded text-slate-700">
                            {query.query.length > 60 ? query.query.substring(0, 60) + '...' : query.query}
                          </code>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                            {query.collection}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-slate-400" />
                            <span className={`font-medium ${
                              query.avgTime > 2000 ? 'text-red-600' :
                              query.avgTime > 1000 ? 'text-amber-600' :
                              'text-green-600'
                            }`}>
                              {query.avgTime.toFixed(0)}ms
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-700">{query.count.toLocaleString()}</td>
                        <td className="px-6 py-4">
                          {query.indexUsed ? (
                            <span className="flex items-center gap-1 text-green-600 text-sm">
                              <CheckCircle className="w-4 h-4" />
                              Yes
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-red-600 text-sm">
                              <XCircle className="w-4 h-4" />
                              No
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">
                          {new Date(query.timestamp).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === 'indexes' && (
            <motion.div
              key="indexes"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Recommended Indexes */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-200">
                  <h3 className="text-lg font-bold text-slate-900">Recommended Indexes</h3>
                  <p className="text-sm text-slate-500 mt-1">Indexes suggested based on query analysis</p>
                </div>
                <div className="divide-y divide-slate-200">
                  {recommendations.map((rec) => (
                    <div key={rec.id} className="p-6 flex items-start gap-4 hover:bg-slate-50 transition-colors">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        rec.impact === 'high' ? 'bg-red-100' :
                        rec.impact === 'medium' ? 'bg-amber-100' :
                        'bg-blue-100'
                      }`}>
                        <Lightbulb className={`w-6 h-6 ${
                          rec.impact === 'high' ? 'text-red-600' :
                          rec.impact === 'medium' ? 'text-amber-600' :
                          'text-blue-600'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-bold text-slate-900">
                              {rec.collection}.{rec.fields.join('_')}_1
                            </h4>
                            <p className="text-sm text-slate-500 mt-1">
                              Fields: {rec.fields.join(', ')}
                            </p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getImpactColor(rec.impact)}`}>
                            {rec.impact.charAt(0).toUpperCase() + rec.impact.slice(1)} Impact
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-4 mt-4">
                          <div className="p-3 bg-slate-50 rounded-lg">
                            <p className="text-xs text-slate-500">Queries Affected</p>
                            <p className="text-lg font-bold text-slate-900">{rec.queriesAffected}</p>
                          </div>
                          <div className="p-3 bg-slate-50 rounded-lg">
                            <p className="text-xs text-slate-500">Current Avg</p>
                            <p className="text-lg font-bold text-red-600">{rec.currentTime}ms</p>
                          </div>
                          <div className="p-3 bg-slate-50 rounded-lg">
                            <p className="text-xs text-slate-500">Estimated Avg</p>
                            <p className="text-lg font-bold text-green-600">{rec.estimatedTime}ms</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 mt-4">
                          <button
                            onClick={() => createIndex(rec)}
                            disabled={creatingIndex}
                            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                          >
                            {creatingIndex ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Index'}
                          </button>
                          <button className="px-4 py-2 text-slate-600 hover:bg-slate-100 text-sm font-medium rounded-lg transition-colors">
                            View Details
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Current Indexes */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-200">
                  <h3 className="text-lg font-bold text-slate-900">Current Indexes</h3>
                  <p className="text-sm text-slate-500 mt-1">Existing indexes in the database</p>
                </div>
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Index Name</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Collection</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Fields</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Size</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Usage</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {indexes.map((index) => (
                      <tr key={`${index.collection}-${index.name}`} className="hover:bg-slate-50">
                        <td className="px-6 py-4 font-medium text-slate-900">{index.name}</td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                            {index.collection}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-600">{index.fields.join(', ')}</td>
                        <td className="px-6 py-4 text-slate-600">{index.size.toFixed(1)} MB</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500 rounded-full"
                                style={{ width: `${index.usage}%` }}
                              />
                            </div>
                            <span className="text-sm text-slate-600">{index.usage}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {!index.name.startsWith('_id_') && (
                            <button
                              onClick={() => dropIndex(index.name, index.collection)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === 'collections' && (
            <motion.div
              key="collections"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {collectionStats.map((collection) => (
                  <motion.div
                    key={collection.name}
                    whileHover={{ y: -4 }}
                    className="bg-white rounded-2xl border border-slate-200 p-6"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                        <FileText className="w-6 h-6 text-white" />
                      </div>
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                        {collection.indexCount} indexes
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-900 text-lg mb-1">{collection.name}</h4>
                    <p className="text-sm text-slate-500 mb-4">
                      {collection.documentCount.toLocaleString()} documents
                    </p>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500">Storage Size</span>
                        <span className="font-medium text-slate-900">{collection.size.toFixed(1)} MB</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500">Avg Document</span>
                        <span className="font-medium text-slate-900">{formatBytes(collection.avgDocumentSize)}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500">Index Size</span>
                        <span className="font-medium text-slate-900">{collection.indexSize.toFixed(1)} MB</span>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-500">Storage Efficiency</span>
                        <span className="text-sm font-medium text-green-600">
                          {((collection.size / collection.storageSize) * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full mt-2 overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full"
                          style={{ width: `${(collection.size / collection.storageSize) * 100}%` }}
                        />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'tasks' && (
            <motion.div
              key="tasks"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Active Tasks */}
              {optimizationTasks.filter(t => t.status === 'running').length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                  <h3 className="text-lg font-bold text-slate-900 mb-4">Running Tasks</h3>
                  <div className="space-y-4">
                    {optimizationTasks.filter(t => t.status === 'running').map((task) => (
                      <div key={task.id} className="p-4 bg-blue-50 rounded-xl">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                            <span className="font-medium text-slate-900">{task.name}</span>
                          </div>
                          <span className="text-sm text-blue-600">{task.progress}%</span>
                        </div>
                        <p className="text-sm text-slate-600 mb-3">{task.description}</p>
                        <div className="w-full h-2 bg-blue-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-600 rounded-full transition-all duration-500"
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Task History */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-200">
                  <h3 className="text-lg font-bold text-slate-900">Task History</h3>
                </div>
                <div className="divide-y divide-slate-200">
                  {optimizationTasks.filter(t => t.status !== 'running').length === 0 ? (
                    <div className="p-8 text-center">
                      <Zap className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-500">No optimization tasks have been run yet</p>
                    </div>
                  ) : (
                    optimizationTasks.filter(t => t.status !== 'running').map((task) => (
                      <div key={task.id} className="p-6 flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          task.status === 'completed' ? 'bg-green-100' :
                          task.status === 'failed' ? 'bg-red-100' :
                          'bg-slate-100'
                        }`}>
                          {task.status === 'completed' ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : task.status === 'failed' ? (
                            <XCircle className="w-5 h-5 text-red-600" />
                          ) : (
                            <Clock className="w-5 h-5 text-slate-600" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-slate-900">{task.name}</p>
                          <p className="text-sm text-slate-500">{task.description}</p>
                        </div>
                        <div className="text-right">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            task.status === 'completed' ? 'bg-green-100 text-green-700' :
                            task.status === 'failed' ? 'bg-red-100 text-red-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                          </span>
                          {task.endTime && (
                            <p className="text-xs text-slate-400 mt-1">
                              {new Date(task.endTime).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}

function DbStatCard({
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
