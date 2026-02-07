import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Shield, Users, Briefcase, Wallet, TrendingUp, AlertCircle,
  CheckCircle2, XCircle, Clock, Search, Filter, Download,
  MoreVertical, ChevronDown, ChevronRight, BarChart3,
  PieChart, Activity, Globe, DollarSign, Settings,
  Bell, LogOut, Lock, Eye, Edit2, Trash2, Play, RotateCcw,
  Calendar, Cpu, Zap, ArrowRight
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface Batch {
  id: string
  batchNumber: string
  type: 'daily' | 'weekly' | 'monthly' | 'manual' | 'scheduled'
  status: 'pending' | 'processing' | 'completed' | 'partial' | 'failed' | 'cancelled'
  total: number
  completed: number
  failed: number
  totalAmount: number
  createdAt: string
  startedAt?: string
  completedAt?: string
  progress: number
}

interface QueueItem {
  id: string
  requestNumber: string
  referrerName: string
  amount: number
  status: 'pending' | 'approved' | 'processing' | 'paid' | 'failed'
  type: 'kbzpay' | 'wavepay' | 'cbpay' | 'bank_transfer'
  waitingSince: string
}

interface ProviderStatus {
  code: string
  name: string
  status: 'active' | 'inactive' | 'error'
  balance: number
  successRate: number
  lastUsed: string
}

const mockBatches: Batch[] = [
  { id: '1', batchNumber: 'BAT-DLY-20240131-0001', type: 'daily', status: 'processing', total: 15, completed: 8, failed: 0, totalAmount: 7500000, createdAt: '2024-01-31T09:00:00Z', startedAt: '2024-01-31T09:00:00Z', progress: 53 },
  { id: '2', batchNumber: 'BAT-MNL-20240130-0001', type: 'manual', status: 'completed', total: 5, completed: 5, failed: 0, totalAmount: 2500000, createdAt: '2024-01-30T14:30:00Z', startedAt: '2024-01-30T14:30:00Z', completedAt: '2024-01-30T14:35:00Z', progress: 100 },
  { id: '3', batchNumber: 'BAT-DLY-20240130-0001', type: 'daily', status: 'completed', total: 12, completed: 12, failed: 0, totalAmount: 6000000, createdAt: '2024-01-30T09:00:00Z', startedAt: '2024-01-30T09:00:00Z', completedAt: '2024-01-30T09:08:00Z', progress: 100 },
  { id: '4', batchNumber: 'BAT-WKL-20240129-0001', type: 'weekly', status: 'completed', total: 28, completed: 27, failed: 1, totalAmount: 14500000, createdAt: '2024-01-29T09:00:00Z', startedAt: '2024-01-29T09:00:00Z', completedAt: '2024-01-29T09:25:00Z', progress: 100 },
  { id: '5', batchNumber: 'BAT-MNL-20240128-0002', type: 'manual', status: 'partial', total: 8, completed: 6, failed: 2, totalAmount: 4200000, createdAt: '2024-01-28T16:00:00Z', startedAt: '2024-01-28T16:00:00Z', completedAt: '2024-01-28T16:15:00Z', progress: 100 },
]

const mockQueue: QueueItem[] = [
  { id: '1', requestNumber: 'PYO-202401-0100', referrerName: 'Aung Kyaw', amount: 500000, status: 'pending', type: 'kbzpay', waitingSince: '2 hours ago' },
  { id: '2', requestNumber: 'PYO-202401-0101', referrerName: 'Su Su', amount: 425000, status: 'approved', type: 'wavepay', waitingSince: '1 hour ago' },
  { id: '3', requestNumber: 'PYO-202401-0102', referrerName: 'Min Thu', amount: 750000, status: 'approved', type: 'kbzpay', waitingSince: '45 minutes ago' },
  { id: '4', requestNumber: 'PYO-202401-0103', referrerName: 'Khin Lay', amount: 300000, status: 'processing', type: 'bank_transfer', waitingSince: '30 minutes ago' },
  { id: '5', requestNumber: 'PYO-202401-0104', referrerName: 'Zaw Lin', amount: 600000, status: 'failed', type: 'cbpay', waitingSince: '1 day ago' },
]

const mockProviders: ProviderStatus[] = [
  { code: 'KBZPAY', name: 'KBZPay', status: 'active', balance: 50000000, successRate: 98, lastUsed: '5 minutes ago' },
  { code: 'WAVEPAY', name: 'WavePay', status: 'active', balance: 30000000, successRate: 97, lastUsed: '12 minutes ago' },
  { code: 'CBPAY', name: 'CB Pay', status: 'active', balance: 25000000, successRate: 96, lastUsed: '1 hour ago' },
  { code: 'KBZ_BANK', name: 'KBZ Bank', status: 'active', balance: 100000000, successRate: 95, lastUsed: '2 hours ago' },
  { code: 'CB_BANK', name: 'CB Bank', status: 'error', balance: 0, successRate: 0, lastUsed: '1 day ago' },
]

export default function PayoutQueueDashboard() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'queue' | 'batches' | 'providers' | 'settings'>('queue')
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  const handleProcessBatch = async (batchId: string) => {
    setIsProcessing(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000))
    setIsProcessing(false)
  }

  const handleRetryFailed = async () => {
    setIsProcessing(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000))
    setIsProcessing(false)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-emerald-100 text-emerald-700'
      case 'processing': return 'bg-blue-100 text-blue-700'
      case 'pending': return 'bg-amber-100 text-amber-700'
      case 'approved': return 'bg-purple-100 text-purple-700'
      case 'partial': return 'bg-orange-100 text-orange-700'
      case 'failed': return 'bg-red-100 text-red-700'
      case 'cancelled': return 'bg-slate-100 text-slate-700'
      default: return 'bg-slate-100 text-slate-700'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'kbzpay': return <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white font-bold text-xs">K</div>
      case 'wavepay': return <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-white font-bold text-xs">W</div>
      case 'cbpay': return <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white font-bold text-xs">C</div>
      case 'bank_transfer': return <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center"><Briefcase className="w-4 h-4 text-slate-600" /></div>
      default: return <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center"><Wallet className="w-4 h-4 text-slate-600" /></div>
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Admin Header */}
      <header className="bg-slate-900 text-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg">Payout Queue Dashboard</h1>
                <p className="text-xs text-slate-400">Automated Payout Processing System</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button className="relative p-2 text-slate-400 hover:text-white transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
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
          <div className="flex gap-1">
            {[
              { id: 'queue', label: 'Queue', icon: Clock },
              { id: 'batches', label: 'Batches', icon: Calendar },
              { id: 'providers', label: 'Providers', icon: Cpu },
              { id: 'settings', label: 'Settings', icon: Settings },
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
          {/* Queue Tab */}
          {activeTab === 'queue' && (
            <motion.div
              key="queue"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500">Pending</p>
                      <p className="text-3xl font-bold text-slate-900">12</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                      <Clock className="w-6 h-6 text-amber-600" />
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500">Processing</p>
                      <p className="text-3xl font-bold text-slate-900">3</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                      <Activity className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500">Failed</p>
                      <p className="text-3xl font-bold text-slate-900">2</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
                      <XCircle className="w-6 h-6 text-red-600" />
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500">Total Value</p>
                      <p className="text-3xl font-bold text-slate-900">8.5M</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                      <DollarSign className="w-6 h-6 text-emerald-600" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Queue Actions */}
              <div className="flex flex-wrap items-center gap-4">
                <button
                  onClick={() => handleProcessBatch('current')}
                  disabled={isProcessing}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5" />
                      Process Queue
                    </>
                  )}
                </button>
                <button
                  onClick={handleRetryFailed}
                  disabled={isProcessing}
                  className="inline-flex items-center gap-2 px-6 py-3 border border-slate-300 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  <RotateCcw className="w-5 h-5" />
                  Retry Failed
                </button>
              </div>

              {/* Queue Table */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Request</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Referrer</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Amount</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Method</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Status</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Waiting</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {mockQueue.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 font-medium text-slate-900">{item.requestNumber}</td>
                        <td className="px-6 py-4 text-slate-600">{item.referrerName}</td>
                        <td className="px-6 py-4 font-semibold text-slate-900">{item.amount.toLocaleString()} MMK</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {getTypeIcon(item.type)}
                            <span className="text-sm text-slate-600 capitalize">{item.type.replace('_', ' ')}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                            {item.status === 'processing' && <Activity className="w-3 h-3 animate-pulse" />}
                            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">{item.waitingSince}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {item.status === 'failed' && (
                              <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Retry">
                                <RotateCcw className="w-4 h-4" />
                              </button>
                            )}
                            <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors" title="View">
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* Batches Tab */}
          {activeTab === 'batches' && (
            <motion.div
              key="batches"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Batch Actions */}
              <div className="flex flex-wrap items-center gap-4">
                <button className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all">
                  <Calendar className="w-5 h-5" />
                  Create Daily Batch
                </button>
                <button className="inline-flex items-center gap-2 px-6 py-3 border border-slate-300 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-colors">
                  <Calendar className="w-5 h-5" />
                  Create Weekly Batch
                </button>
                <button className="inline-flex items-center gap-2 px-6 py-3 border border-slate-300 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-colors">
                  <Zap className="w-5 h-5" />
                  Process All Pending
                </button>
              </div>

              {/* Batches Table */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Batch Number</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Type</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Status</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Progress</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Amount</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Created</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {mockBatches.map((batch) => (
                      <tr key={batch.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 font-medium text-slate-900">{batch.batchNumber}</td>
                        <td className="px-6 py-4">
                          <span className="capitalize text-slate-600">{batch.type}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(batch.status)}`}>
                            {batch.status === 'processing' && <Activity className="w-3 h-3 animate-pulse" />}
                            {batch.status.charAt(0).toUpperCase() + batch.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-blue-500 rounded-full transition-all"
                                style={{ width: `${batch.progress}%` }}
                              />
                            </div>
                            <span className="text-sm text-slate-600">{batch.completed}/{batch.total}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-900">{batch.totalAmount.toLocaleString()} MMK</td>
                        <td className="px-6 py-4 text-sm text-slate-500">
                          {new Date(batch.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {batch.status === 'pending' && (
                              <button 
                                onClick={() => handleProcessBatch(batch.id)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Process"
                              >
                                <Play className="w-4 h-4" />
                              </button>
                            )}
                            {(batch.status === 'completed' || batch.status === 'partial') && batch.failed > 0 && (
                              <button className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Retry Failed">
                                <RotateCcw className="w-4 h-4" />
                              </button>
                            )}
                            <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors" title="View">
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* Providers Tab */}
          {activeTab === 'providers' && (
            <motion.div
              key="providers"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Provider</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Status</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Balance</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Success Rate</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Last Used</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {mockProviders.map((provider) => (
                      <tr key={provider.code} className="hover:bg-slate-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {getTypeIcon(provider.code.toLowerCase().includes('bank') ? 'bank_transfer' : provider.code.toLowerCase())}
                            <span className="font-semibold text-slate-900">{provider.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                            provider.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                            provider.status === 'error' ? 'bg-red-100 text-red-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${
                              provider.status === 'active' ? 'bg-emerald-500' :
                              provider.status === 'error' ? 'bg-red-500' :
                              'bg-slate-500'
                            }`} />
                            {provider.status.charAt(0).toUpperCase() + provider.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-900">{provider.balance.toLocaleString()} MMK</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-emerald-500 rounded-full"
                                style={{ width: `${provider.successRate}%` }}
                              />
                            </div>
                            <span className="text-sm text-slate-600">{provider.successRate}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">{provider.lastUsed}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Test">
                              <Zap className="w-4 h-4" />
                            </button>
                            <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors" title="Settings">
                              <Settings className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl space-y-6"
            >
              <div className="bg-white rounded-2xl border border-slate-200 p-8">
                <h3 className="text-lg font-bold text-slate-900 mb-6">Payout Processing Settings</h3>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Daily Processing Time</label>
                    <input type="time" defaultValue="09:00" className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Minimum Payout Amount</label>
                    <input type="number" defaultValue={50000} className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Maximum Retry Attempts</label>
                    <input type="number" defaultValue={3} className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-medium text-slate-900">Auto-approve payouts</p>
                      <p className="text-sm text-slate-500">Automatically approve payouts below threshold</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
