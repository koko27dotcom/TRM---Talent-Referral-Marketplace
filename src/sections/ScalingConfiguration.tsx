import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Server,
  Cpu,
  HardDrive,
  Zap,
  Activity,
  TrendingUp,
  TrendingDown,
  Plus,
  MinusIcon,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Settings,
  Shield,
  Globe,
  Loader2,
  ChevronDown,
  ChevronUp,
  Play,
  Pause,
  Trash2,
  Edit3,
  Save,
  X,
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
  Bar
} from 'recharts'

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

interface ScalingPolicy {
  id: string
  name: string
  type: 'scale_up' | 'scale_down'
  metric: 'cpu' | 'memory' | 'requests'
  threshold: number
  operator: '>' | '<' | '>=' | '<='
  adjustment: number
  cooldown: number
  enabled: boolean
}

interface Instance {
  id: string
  name: string
  status: 'running' | 'pending' | 'terminating' | 'stopped'
  type: string
  cpu: number
  memory: number
  requests: number
  uptime: number
  region: string
  health: 'healthy' | 'warning' | 'critical'
  launchTime: string
}

interface ScalingEvent {
  id: string
  timestamp: string
  type: 'scale_up' | 'scale_down'
  reason: string
  fromInstances: number
  toInstances: number
  triggeredBy: string
  status: 'success' | 'failed' | 'in_progress'
}

interface LoadBalancerConfig {
  algorithm: 'round_robin' | 'least_connections' | 'ip_hash'
  healthCheckPath: string
  healthCheckInterval: number
  healthCheckTimeout: number
  healthyThreshold: number
  unhealthyThreshold: number
}

interface AutoScalingConfig {
  enabled: boolean
  minInstances: number
  maxInstances: number
  desiredInstances: number
  cooldownPeriod: number
  scaleUpCooldown: number
  scaleDownCooldown: number
  targetCpuUtilization: number
  targetMemoryUtilization: number
}

const mockInstances: Instance[] = [
  { id: 'i-1a2b3c4d', name: 'web-server-01', status: 'running', type: 't3.medium', cpu: 45, memory: 62, requests: 1250, uptime: 86400 * 5, region: 'ap-southeast-1', health: 'healthy', launchTime: '2024-01-15T08:00:00Z' },
  { id: 'i-2b3c4d5e', name: 'web-server-02', status: 'running', type: 't3.medium', cpu: 52, memory: 58, requests: 1380, uptime: 86400 * 5, region: 'ap-southeast-1', health: 'healthy', launchTime: '2024-01-15T08:00:00Z' },
  { id: 'i-3c4d5e6f', name: 'web-server-03', status: 'running', type: 't3.medium', cpu: 78, memory: 71, requests: 1850, uptime: 86400 * 3, region: 'ap-southeast-1', health: 'warning', launchTime: '2024-01-17T10:30:00Z' },
  { id: 'i-4d5e6f7g', name: 'worker-01', status: 'running', type: 't3.large', cpu: 35, memory: 45, requests: 420, uptime: 86400 * 7, region: 'ap-southeast-1', health: 'healthy', launchTime: '2024-01-13T06:00:00Z' },
  { id: 'i-5e6f7g8h', name: 'worker-02', status: 'pending', type: 't3.large', cpu: 0, memory: 0, requests: 0, uptime: 0, region: 'ap-southeast-1', health: 'healthy', launchTime: '2024-01-21T11:00:00Z' }
]

const mockScalingEvents: ScalingEvent[] = [
  { id: 'evt-1', timestamp: '2024-01-21T10:30:00Z', type: 'scale_up', reason: 'CPU utilization above 75%', fromInstances: 3, toInstances: 4, triggeredBy: 'policy-cpu-scale-up', status: 'success' },
  { id: 'evt-2', timestamp: '2024-01-20T14:15:00Z', type: 'scale_down', reason: 'CPU utilization below 30% for 10 minutes', fromInstances: 4, toInstances: 3, triggeredBy: 'policy-cpu-scale-down', status: 'success' },
  { id: 'evt-3', timestamp: '2024-01-19T09:00:00Z', type: 'scale_up', reason: 'Request count above 5000/min', fromInstances: 2, toInstances: 4, triggeredBy: 'policy-request-scale-up', status: 'success' },
  { id: 'evt-4', timestamp: '2024-01-18T22:45:00Z', type: 'scale_down', reason: 'Memory utilization below 40%', fromInstances: 3, toInstances: 2, triggeredBy: 'policy-memory-scale-down', status: 'failed' }
]

const mockScalingHistory = [
  { time: '00:00', instances: 3, cpu: 45 },
  { time: '02:00', instances: 3, cpu: 42 },
  { time: '04:00', instances: 3, cpu: 38 },
  { time: '06:00', instances: 3, cpu: 55 },
  { time: '08:00', instances: 4, cpu: 68 },
  { time: '10:00', instances: 4, cpu: 72 },
  { time: '12:00', instances: 5, cpu: 78 },
  { time: '14:00', instances: 4, cpu: 65 },
  { time: '16:00', instances: 4, cpu: 58 },
  { time: '18:00', instances: 3, cpu: 48 },
  { time: '20:00', instances: 3, cpu: 42 },
  { time: '22:00', instances: 3, cpu: 40 }
]

export default function ScalingConfiguration() {
  const [autoScaling, setAutoScaling] = useState<AutoScalingConfig>({
    enabled: true,
    minInstances: 2,
    maxInstances: 10,
    desiredInstances: 4,
    cooldownPeriod: 300,
    scaleUpCooldown: 180,
    scaleDownCooldown: 600,
    targetCpuUtilization: 70,
    targetMemoryUtilization: 75
  })

  const [policies, setPolicies] = useState<ScalingPolicy[]>([
    { id: 'policy-1', name: 'CPU Scale Up', type: 'scale_up', metric: 'cpu', threshold: 75, operator: '>', adjustment: 1, cooldown: 180, enabled: true },
    { id: 'policy-2', name: 'CPU Scale Down', type: 'scale_down', metric: 'cpu', threshold: 30, operator: '<', adjustment: -1, cooldown: 600, enabled: true },
    { id: 'policy-3', name: 'Memory Scale Up', type: 'scale_up', metric: 'memory', threshold: 80, operator: '>', adjustment: 1, cooldown: 180, enabled: true },
    { id: 'policy-4', name: 'Request Scale Up', type: 'scale_up', metric: 'requests', threshold: 5000, operator: '>', adjustment: 2, cooldown: 120, enabled: false }
  ])

  const [instances, setInstances] = useState<Instance[]>(mockInstances)
  const [scalingEvents, setScalingEvents] = useState<ScalingEvent[]>(mockScalingEvents)
  const [loadBalancer, setLoadBalancer] = useState<LoadBalancerConfig>({
    algorithm: 'round_robin',
    healthCheckPath: '/health',
    healthCheckInterval: 30,
    healthCheckTimeout: 5,
    healthyThreshold: 2,
    unhealthyThreshold: 3
  })

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeSection, setActiveSection] = useState<'overview' | 'policies' | 'instances' | 'history' | 'loadbalancer'>('overview')
  const [editingPolicy, setEditingPolicy] = useState<string | null>(null)
  const [showAddPolicy, setShowAddPolicy] = useState(false)

  const getAuthToken = () => localStorage.getItem('token')

  const fetchScalingData = useCallback(async () => {
    try {
      setLoading(true)
      const token = getAuthToken()
      if (!token) return

      // Fetch auto-scaling configuration
      const configResponse = await fetch(`${API_BASE_URL}/scaling/config`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (configResponse.ok) {
        const result = await configResponse.json()
        if (result.success && result.data) {
          setAutoScaling(result.data)
        }
      }

      // Fetch instances
      const instancesResponse = await fetch(`${API_BASE_URL}/scaling/instances`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (instancesResponse.ok) {
        const result = await instancesResponse.json()
        if (result.success && result.data) {
          setInstances(result.data)
        }
      }

      // Fetch scaling events
      const eventsResponse = await fetch(`${API_BASE_URL}/scaling/events`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (eventsResponse.ok) {
        const result = await eventsResponse.json()
        if (result.success && result.data) {
          setScalingEvents(result.data)
        }
      }
    } catch (err) {
      console.error('Failed to fetch scaling data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchScalingData()
  }, [fetchScalingData])

  const saveAutoScalingConfig = async () => {
    try {
      setSaving(true)
      const token = getAuthToken()
      
      const response = await fetch(`${API_BASE_URL}/scaling/config`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(autoScaling)
      })

      if (response.ok) {
        // Show success notification
      }
    } catch (err) {
      console.error('Failed to save config:', err)
    } finally {
      setSaving(false)
    }
  }

  const togglePolicy = (policyId: string) => {
    setPolicies(policies.map(p => 
      p.id === policyId ? { ...p, enabled: !p.enabled } : p
    ))
  }

  const deletePolicy = (policyId: string) => {
    setPolicies(policies.filter(p => p.id !== policyId))
  }

  const addInstance = async () => {
    try {
      const token = getAuthToken()
      const response = await fetch(`${API_BASE_URL}/scaling/instances`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ type: 't3.medium' })
      })

      if (response.ok) {
        fetchScalingData()
      }
    } catch (err) {
      console.error('Failed to add instance:', err)
    }
  }

  const removeInstance = async (instanceId: string) => {
    try {
      const token = getAuthToken()
      const response = await fetch(`${API_BASE_URL}/scaling/instances/${instanceId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        setInstances(instances.filter(i => i.id !== instanceId))
      }
    } catch (err) {
      console.error('Failed to remove instance:', err)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'pending':
        return <Clock className="w-5 h-5 text-amber-500" />
      case 'terminating':
        return <AlertTriangle className="w-5 h-5 text-orange-500" />
      case 'stopped':
        return <XCircle className="w-5 h-5 text-red-500" />
      default:
        return <MinusIconComponent className="w-5 h-5 text-gray-400" />
    }
  }

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'healthy':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-500" />
      case 'critical':
        return <XCircle className="w-4 h-4 text-red-500" />
      default:
        return <MinusIconComponent className="w-4 h-4 text-gray-400" />
    }
  }

  const formatDuration = (seconds: number) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    if (days > 0) return `${days}d ${hours}h`
    return `${hours}h`
  }

  const runningInstances = instances.filter(i => i.status === 'running').length
  const avgCpu = instances.filter(i => i.status === 'running').reduce((acc, i) => acc + i.cpu, 0) / runningInstances || 0
  const avgMemory = instances.filter(i => i.status === 'running').reduce((acc, i) => acc + i.memory, 0) / runningInstances || 0

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                <Server className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg text-slate-900">Scaling Configuration</h1>
                <p className="text-xs text-slate-500">Auto-scaling & Load Balancer Settings</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchScalingData}
                className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={saveAutoScalingConfig}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
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
              { id: 'overview', label: 'Overview', icon: Activity },
              { id: 'policies', label: 'Scaling Policies', icon: Settings },
              { id: 'instances', label: 'Instances', icon: Server },
              { id: 'history', label: 'Scaling History', icon: Clock },
              { id: 'loadbalancer', label: 'Load Balancer', icon: Globe }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors relative ${
                  activeSection === tab.id
                    ? 'text-blue-600'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
                {activeSection === tab.id && (
                  <motion.div
                    layoutId="activeScalingTab"
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
          {activeSection === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Auto-scaling Toggle */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${autoScaling.enabled ? 'bg-green-100' : 'bg-slate-100'}`}>
                      {autoScaling.enabled ? <Play className="w-7 h-7 text-green-600" /> : <Pause className="w-7 h-7 text-slate-500" />}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">Auto-Scaling</h3>
                      <p className="text-slate-500">
                        {autoScaling.enabled ? 'Automatically scaling based on configured policies' : 'Manual scaling mode enabled'}
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoScaling.enabled}
                      onChange={(e) => setAutoScaling({ ...autoScaling, enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <ScalingStatCard
                  icon={Server}
                  label="Running Instances"
                  value={runningInstances.toString()}
                  subValue={`of ${autoScaling.maxInstances} max`}
                  trend={runningInstances > autoScaling.desiredInstances ? 'Scaling up' : 'Stable'}
                  trendUp={runningInstances >= autoScaling.desiredInstances}
                  color="blue"
                />
                <ScalingStatCard
                  icon={Cpu}
                  label="Avg CPU Usage"
                  value={`${avgCpu.toFixed(1)}%`}
                  subValue={`Target: ${autoScaling.targetCpuUtilization}%`}
                  trend={avgCpu > autoScaling.targetCpuUtilization ? 'High' : 'Normal'}
                  trendUp={avgCpu > autoScaling.targetCpuUtilization}
                  color={avgCpu > autoScaling.targetCpuUtilization ? 'amber' : 'green'}
                />
                <ScalingStatCard
                  icon={HardDrive}
                  label="Avg Memory Usage"
                  value={`${avgMemory.toFixed(1)}%`}
                  subValue={`Target: ${autoScaling.targetMemoryUtilization}%`}
                  trend={avgMemory > autoScaling.targetMemoryUtilization ? 'High' : 'Normal'}
                  trendUp={avgMemory > autoScaling.targetMemoryUtilization}
                  color={avgMemory > autoScaling.targetMemoryUtilization ? 'amber' : 'green'}
                />
                <ScalingStatCard
                  icon={Zap}
                  label="Cooldown Period"
                  value={`${autoScaling.cooldownPeriod}s`}
                  subValue={`Up: ${autoScaling.scaleUpCooldown}s / Down: ${autoScaling.scaleDownCooldown}s`}
                  trend="Active"
                  trendUp={true}
                  color="purple"
                />
              </div>

              {/* Instance Configuration */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-6">Instance Configuration</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Minimum Instances</label>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setAutoScaling({ ...autoScaling, minInstances: Math.max(1, autoScaling.minInstances - 1) })}
                        className="w-10 h-10 rounded-lg border border-slate-300 flex items-center justify-center hover:bg-slate-50"
                      >
                        <MinusIcon className="w-4 h-4" />
                      </button>
                      <input
                        type="number"
                        value={autoScaling.minInstances}
                        onChange={(e) => setAutoScaling({ ...autoScaling, minInstances: parseInt(e.target.value) || 1 })}
                        className="flex-1 text-center px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={() => setAutoScaling({ ...autoScaling, minInstances: autoScaling.minInstances + 1 })}
                        className="w-10 h-10 rounded-lg border border-slate-300 flex items-center justify-center hover:bg-slate-50"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Maximum Instances</label>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setAutoScaling({ ...autoScaling, maxInstances: Math.max(autoScaling.minInstances, autoScaling.maxInstances - 1) })}
                        className="w-10 h-10 rounded-lg border border-slate-300 flex items-center justify-center hover:bg-slate-50"
                      >
                        <MinusIcon className="w-4 h-4" />
                      </button>
                      <input
                        type="number"
                        value={autoScaling.maxInstances}
                        onChange={(e) => setAutoScaling({ ...autoScaling, maxInstances: parseInt(e.target.value) || autoScaling.minInstances })}
                        className="flex-1 text-center px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={() => setAutoScaling({ ...autoScaling, maxInstances: autoScaling.maxInstances + 1 })}
                        className="w-10 h-10 rounded-lg border border-slate-300 flex items-center justify-center hover:bg-slate-50"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Desired Instances</label>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setAutoScaling({ ...autoScaling, desiredInstances: Math.max(autoScaling.minInstances, autoScaling.desiredInstances - 1) })}
                        className="w-10 h-10 rounded-lg border border-slate-300 flex items-center justify-center hover:bg-slate-50"
                      >
                        <MinusIcon className="w-4 h-4" />
                      </button>
                      <input
                        type="number"
                        value={autoScaling.desiredInstances}
                        onChange={(e) => setAutoScaling({ ...autoScaling, desiredInstances: parseInt(e.target.value) || autoScaling.minInstances })}
                        className="flex-1 text-center px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={() => setAutoScaling({ ...autoScaling, desiredInstances: Math.min(autoScaling.maxInstances, autoScaling.desiredInstances + 1) })}
                        className="w-10 h-10 rounded-lg border border-slate-300 flex items-center justify-center hover:bg-slate-50"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Scaling History Chart */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-6">Scaling Activity (24h)</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={mockScalingHistory}>
                      <defs>
                        <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} />
                      <YAxis yAxisId="left" stroke="#94a3b8" fontSize={12} />
                      <YAxis yAxisId="right" orientation="right" stroke="#10b981" fontSize={12} />
                      <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                      <Area yAxisId="left" type="monotone" dataKey="cpu" stroke="#3b82f6" fillOpacity={1} fill="url(#colorCpu)" name="CPU %" />
                      <Line yAxisId="right" type="step" dataKey="instances" stroke="#10b981" strokeWidth={2} name="Instances" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </motion.div>
          )}

          {activeSection === 'policies' && (
            <motion.div
              key="policies"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">Scaling Policies</h3>
                <button
                  onClick={() => setShowAddPolicy(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Policy
                </button>
              </div>

              <div className="space-y-4">
                {policies.map((policy) => (
                  <motion.div
                    key={policy.id}
                    layout
                    className="bg-white rounded-2xl border border-slate-200 p-6"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          policy.type === 'scale_up' ? 'bg-green-100' : 'bg-red-100'
                        }`}>
                          {policy.type === 'scale_up' ? (
                            <TrendingUp className="w-6 h-6 text-green-600" />
                          ) : (
                            <TrendingDown className="w-6 h-6 text-red-600" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900">{policy.name}</h4>
                          <p className="text-sm text-slate-500 mt-1">
                            When {policy.metric.toUpperCase()} {policy.operator} {policy.threshold}
                            {policy.metric === 'requests' ? ' req/min' : '%'},
                            {' '}{policy.type === 'scale_up' ? 'add' : 'remove'} {Math.abs(policy.adjustment)} instance(s)
                          </p>
                          <div className="flex items-center gap-4 mt-3">
                            <span className="text-xs text-slate-400">
                              Cooldown: {policy.cooldown}s
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              policy.enabled ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {policy.enabled ? 'Enabled' : 'Disabled'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => togglePolicy(policy.id)}
                          className={`p-2 rounded-lg transition-colors ${
                            policy.enabled ? 'text-green-600 hover:bg-green-50' : 'text-slate-400 hover:bg-slate-100'
                          }`}
                        >
                          {policy.enabled ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                        </button>
                        <button
                          onClick={() => setEditingPolicy(policy.id)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit3 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => deletePolicy(policy.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {activeSection === 'instances' && (
            <motion.div
              key="instances"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">Instance Management</h3>
                <button
                  onClick={addInstance}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Instance
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Instance</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Status</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Type</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">CPU</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Memory</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Uptime</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Health</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {instances.map((instance) => (
                      <tr key={instance.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-slate-900">{instance.name}</p>
                            <p className="text-sm text-slate-500">{instance.id}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(instance.status)}
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              instance.status === 'running' ? 'bg-green-100 text-green-700' :
                              instance.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                              instance.status === 'terminating' ? 'bg-orange-100 text-orange-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {instance.status.charAt(0).toUpperCase() + instance.status.slice(1)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-700">{instance.type}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${instance.cpu > 80 ? 'bg-red-500' : instance.cpu > 60 ? 'bg-amber-500' : 'bg-green-500'}`}
                                style={{ width: `${instance.cpu}%` }}
                              />
                            </div>
                            <span className="text-sm text-slate-600">{instance.cpu}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${instance.memory > 80 ? 'bg-red-500' : instance.memory > 60 ? 'bg-amber-500' : 'bg-green-500'}`}
                                style={{ width: `${instance.memory}%` }}
                              />
                            </div>
                            <span className="text-sm text-slate-600">{instance.memory}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-600">{formatDuration(instance.uptime)}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {getHealthIcon(instance.health)}
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              instance.health === 'healthy' ? 'bg-green-100 text-green-700' :
                              instance.health === 'warning' ? 'bg-amber-100 text-amber-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {instance.health}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {instance.status === 'running' && (
                            <button
                              onClick={() => removeInstance(instance.id)}
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

          {activeSection === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <h3 className="text-lg font-bold text-slate-900">Scaling Events History</h3>

              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="divide-y divide-slate-200">
                  {scalingEvents.map((event) => (
                    <div key={event.id} className="p-6 flex items-start gap-4 hover:bg-slate-50 transition-colors">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        event.type === 'scale_up' ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                        {event.type === 'scale_up' ? (
                          <TrendingUp className="w-6 h-6 text-green-600" />
                        ) : (
                          <TrendingDown className="w-6 h-6 text-red-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-bold text-slate-900">
                              {event.type === 'scale_up' ? 'Scaled Up' : 'Scaled Down'}
                            </p>
                            <p className="text-sm text-slate-500 mt-1">{event.reason}</p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            event.status === 'success' ? 'bg-green-100 text-green-700' :
                            event.status === 'failed' ? 'bg-red-100 text-red-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                          </span>
                        </div>
                        <div className="flex items-center gap-6 mt-3 text-sm text-slate-500">
                          <span>From {event.fromInstances} to {event.toInstances} instances</span>
                          <span>Triggered by: {event.triggeredBy}</span>
                          <span>{new Date(event.timestamp).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeSection === 'loadbalancer' && (
            <motion.div
              key="loadbalancer"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                    <Globe className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Load Balancer Configuration</h3>
                    <p className="text-slate-500">Configure traffic distribution and health checks</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Load Balancing Algorithm</label>
                    <select
                      value={loadBalancer.algorithm}
                      onChange={(e) => setLoadBalancer({ ...loadBalancer, algorithm: e.target.value as any })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="round_robin">Round Robin</option>
                      <option value="least_connections">Least Connections</option>
                      <option value="ip_hash">IP Hash</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Health Check Path</label>
                    <input
                      type="text"
                      value={loadBalancer.healthCheckPath}
                      onChange={(e) => setLoadBalancer({ ...loadBalancer, healthCheckPath: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Health Check Interval (seconds)</label>
                    <input
                      type="number"
                      value={loadBalancer.healthCheckInterval}
                      onChange={(e) => setLoadBalancer({ ...loadBalancer, healthCheckInterval: parseInt(e.target.value) || 30 })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Health Check Timeout (seconds)</label>
                    <input
                      type="number"
                      value={loadBalancer.healthCheckTimeout}
                      onChange={(e) => setLoadBalancer({ ...loadBalancer, healthCheckTimeout: parseInt(e.target.value) || 5 })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Healthy Threshold</label>
                    <input
                      type="number"
                      value={loadBalancer.healthyThreshold}
                      onChange={(e) => setLoadBalancer({ ...loadBalancer, healthyThreshold: parseInt(e.target.value) || 2 })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Unhealthy Threshold</label>
                    <input
                      type="number"
                      value={loadBalancer.unhealthyThreshold}
                      onChange={(e) => setLoadBalancer({ ...loadBalancer, unhealthyThreshold: parseInt(e.target.value) || 3 })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Health Check Status */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-6">Health Check Status</h3>
                <div className="space-y-4">
                  {instances.filter(i => i.status === 'running').map((instance) => (
                    <div key={instance.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        {getHealthIcon(instance.health)}
                        <div>
                          <p className="font-medium text-slate-900">{instance.name}</p>
                          <p className="text-sm text-slate-500">{instance.id}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-slate-500">
                          Last check: {new Date().toLocaleTimeString()}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          instance.health === 'healthy' ? 'bg-green-100 text-green-700' :
                          instance.health === 'warning' ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {instance.health === 'healthy' ? 'Healthy' : instance.health === 'warning' ? 'Degraded' : 'Unhealthy'}
                        </span>
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

function ScalingStatCard({
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
  const colorClasses: Record<string, { bg: string; text: string; light: string }> = {
    blue: { bg: 'from-blue-500 to-blue-600', text: 'text-blue-600', light: 'bg-blue-50' },
    purple: { bg: 'from-purple-500 to-purple-600', text: 'text-purple-600', light: 'bg-purple-50' },
    green: { bg: 'from-green-500 to-green-600', text: 'text-green-600', light: 'bg-green-50' },
    amber: { bg: 'from-amber-500 to-amber-600', text: 'text-amber-600', light: 'bg-amber-50' }
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
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${colorClasses[color].light} ${colorClasses[color].text}`}>
          {trend}
        </span>
      </div>
      <p className="text-slate-500 text-sm mb-1">{label}</p>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-400 mt-1">{subValue}</p>
    </motion.div>
  )
}

function MinusIconComponent({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
    </svg>
  )
}
