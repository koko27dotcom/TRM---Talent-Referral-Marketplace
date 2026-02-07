import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Wallet, TrendingUp, DollarSign, Clock, CheckCircle, XCircle,
  CreditCard, Building2, Smartphone, ArrowRight, Calendar,
  Filter, Download, Plus, Trash2, Star, MoreHorizontal,
  ChevronRight, AlertCircle, RefreshCw, FileText, Banknote,
  Settings, History
} from 'lucide-react'
import PayoutSettings from '../components/PayoutSettings'
import PayoutHistory from '../components/PayoutHistory'

interface PayoutMethod {
  id: string
  type: 'kbzpay' | 'wavepay' | 'cbpay' | 'bank_transfer'
  name: string
  accountNumber: string
  accountName: string
  isDefault: boolean
  bankName?: string
}

interface PayoutRequest {
  id: string
  amount: number
  fee: number
  netAmount: number
  status: 'pending' | 'processing' | 'paid' | 'rejected' | 'cancelled'
  method: PayoutMethod
  requestedAt: string
  processedAt?: string
  receiptUrl?: string
}

interface Earnings {
  available: number
  pending: number
  totalEarned: number
  totalPaid: number
}

interface EligibleReferral {
  id: string
  jobTitle: string
  company: string
  bonusAmount: number
  referrerShare: number
  status: 'eligible' | 'requested' | 'paid'
  hiredAt: string
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
}

export default function PayoutDashboard() {
  const [earnings, setEarnings] = useState<Earnings>({
    available: 2125000,
    pending: 850000,
    totalEarned: 5950000,
    totalPaid: 2975000
  })
  const [payoutMethods, setPayoutMethods] = useState<PayoutMethod[]>([
    { id: '1', type: 'kbzpay', name: 'KBZPay', accountNumber: '09•••••7852', accountName: 'User Name', isDefault: true },
    { id: '2', type: 'wavepay', name: 'WavePay', accountNumber: '09•••••1234', accountName: 'User Name', isDefault: false }
  ])
  const [payoutHistory, setPayoutHistory] = useState<PayoutRequest[]>([
    {
      id: 'req-1',
      amount: 500000,
      fee: 0,
      netAmount: 500000,
      status: 'paid',
      method: { id: '1', type: 'kbzpay', name: 'KBZPay', accountNumber: '09•••••7852', accountName: 'User Name', isDefault: true },
      requestedAt: '2026-01-15T10:30:00Z',
      processedAt: '2026-01-16T14:20:00Z'
    },
    {
      id: 'req-2',
      amount: 425000,
      fee: 0,
      netAmount: 425000,
      status: 'processing',
      method: { id: '1', type: 'kbzpay', name: 'KBZPay', accountNumber: '09•••••7852', accountName: 'User Name', isDefault: true },
      requestedAt: '2026-01-28T09:15:00Z'
    }
  ])
  const [eligibleReferrals, setEligibleReferrals] = useState<EligibleReferral[]>([
    {
      id: 'ref-1',
      jobTitle: 'Senior Software Engineer',
      company: 'TechCorp Myanmar',
      bonusAmount: 1000000,
      referrerShare: 850000,
      status: 'eligible',
      hiredAt: '2026-01-20T00:00:00Z'
    },
    {
      id: 'ref-2',
      jobTitle: 'Product Manager',
      company: 'StartupHub',
      bonusAmount: 750000,
      referrerShare: 637500,
      status: 'eligible',
      hiredAt: '2026-01-25T00:00:00Z'
    },
    {
      id: 'ref-3',
      jobTitle: 'UX Designer',
      company: 'Design Studio',
      bonusAmount: 500000,
      referrerShare: 425000,
      status: 'paid',
      hiredAt: '2026-01-10T00:00:00Z'
    }
  ])

  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false)
  const [selectedReferral, setSelectedReferral] = useState<EligibleReferral | null>(null)
  const [showAddMethod, setShowAddMethod] = useState(false)
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'processing' | 'paid' | 'rejected'>('all')
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'settings'>('overview')

  const handleRequestPayout = (referral?: EligibleReferral) => {
    setSelectedReferral(referral || null)
    setIsRequestModalOpen(true)
  }

  const handleSubmitRequest = (amount: number, methodId: string) => {
    const method = payoutMethods.find(m => m.id === methodId)
    if (!method) return

    const newRequest: PayoutRequest = {
      id: `req-${Date.now()}`,
      amount,
      fee: 0,
      netAmount: amount,
      status: 'pending',
      method,
      requestedAt: new Date().toISOString()
    }

    setPayoutHistory(prev => [newRequest, ...prev])
    setEarnings(prev => ({
      ...prev,
      available: prev.available - amount,
      pending: prev.pending + amount
    }))
    setIsRequestModalOpen(false)
    setSelectedReferral(null)
  }

  const setDefaultMethod = (id: string) => {
    setPayoutMethods(prev => prev.map(m => ({
      ...m,
      isDefault: m.id === id
    })))
  }

  const removeMethod = (id: string) => {
    setPayoutMethods(prev => prev.filter(m => m.id !== id))
  }

  const filteredHistory = payoutHistory.filter(req => 
    filterStatus === 'all' ? true : req.status === filterStatus
  )

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle className="w-4 h-4" />
      case 'processing': return <Clock className="w-4 h-4" />
      case 'pending': return <Clock className="w-4 h-4" />
      case 'rejected': return <XCircle className="w-4 h-4" />
      case 'cancelled': return <XCircle className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-emerald-100 text-emerald-700'
      case 'processing': return 'bg-blue-100 text-blue-700'
      case 'pending': return 'bg-amber-100 text-amber-700'
      case 'rejected': return 'bg-red-100 text-red-700'
      case 'cancelled': return 'bg-slate-100 text-slate-700'
      default: return 'bg-slate-100 text-slate-700'
    }
  }

  const getMethodIcon = (type: string) => {
    switch (type) {
      case 'kbzpay': return <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs">K</div>
      case 'wavepay': return <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center text-white font-bold text-xs">W</div>
      case 'cbpay': return <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center text-white font-bold text-xs">C</div>
      case 'bank_transfer': return <Building2 className="w-5 h-5" />
      default: return <CreditCard className="w-5 h-5" />
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Payout Dashboard</h1>
              <p className="text-slate-600 mt-1">Manage your referral earnings and payouts</p>
            </div>
            <button
              onClick={() => handleRequestPayout()}
              disabled={earnings.available < 50000}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Wallet className="w-5 h-5" />
              Request Payout
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-1 mt-6 border-t border-slate-200 pt-4">
            {[
              { id: 'overview', label: 'Overview', icon: Wallet },
              { id: 'history', label: 'History', icon: History },
              { id: 'settings', label: 'Settings', icon: Settings },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors relative rounded-lg ${
                  activeTab === tab.id
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {/* Earnings Overview Cards */}
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
              >
                <motion.div variants={itemVariants}>
                  <div className="bg-white rounded-2xl p-6 h-full border-2 border-blue-500 shadow-lg shadow-blue-500/10">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-500 mb-1">Available Balance</p>
                        <p className="text-3xl font-bold text-slate-900">
                          {earnings.available.toLocaleString()} <span className="text-lg text-slate-500">MMK</span>
                        </p>
                        <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          Ready to withdraw
                        </p>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                        <Wallet className="w-6 h-6 text-emerald-600" />
                      </div>
                    </div>
                  </div>
                </motion.div>

                <motion.div variants={itemVariants}>
                  <div className="bg-white rounded-2xl p-6 border border-slate-200">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-500 mb-1">Pending</p>
                        <p className="text-3xl font-bold text-slate-900">
                          {earnings.pending.toLocaleString()} <span className="text-lg text-slate-500">MMK</span>
                        </p>
                        <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Processing payouts
                        </p>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                        <Clock className="w-6 h-6 text-amber-600" />
                      </div>
                    </div>
                  </div>
                </motion.div>

                <motion.div variants={itemVariants}>
                  <div className="bg-white rounded-2xl p-6 border border-slate-200">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-500 mb-1">Total Earned</p>
                        <p className="text-3xl font-bold text-slate-900">
                          {earnings.totalEarned.toLocaleString()} <span className="text-lg text-slate-500">MMK</span>
                        </p>
                        <p className="text-xs text-slate-500 mt-2">
                          Since you joined
                        </p>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                        <DollarSign className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                  </div>
                </motion.div>

                <motion.div variants={itemVariants}>
                  <div className="bg-white rounded-2xl p-6 border border-slate-200">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-500 mb-1">Total Paid</p>
                        <p className="text-3xl font-bold text-slate-900">
                          {earnings.totalPaid.toLocaleString()} <span className="text-lg text-slate-500">MMK</span>
                        </p>
                        <p className="text-xs text-emerald-600 mt-2">
                          Successfully withdrawn
                        </p>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                        <Banknote className="w-6 h-6 text-purple-600" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Eligible Referrals */}
                <motion.div 
                  variants={itemVariants}
                  initial="hidden" 
                  animate="visible"
                  className="lg:col-span-2 space-y-6"
                >
                  {/* Eligible Referrals Section */}
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                          <CheckCircle className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                          <h2 className="text-lg font-semibold text-slate-900">Eligible Referrals</h2>
                          <p className="text-sm text-slate-500">Ready for payout (85% of bonus after commission)</p>
                        </div>
                      </div>
                      <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
                        {eligibleReferrals.filter(r => r.status === 'eligible').length} available
                      </span>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {eligibleReferrals.filter(r => r.status === 'eligible').length === 0 ? (
                        <div className="p-8 text-center">
                          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                            <AlertCircle className="w-8 h-8 text-slate-400" />
                          </div>
                          <p className="text-slate-600">No eligible referrals yet</p>
                          <p className="text-sm text-slate-500 mt-1">Referrals become eligible when the candidate is hired</p>
                        </div>
                      ) : (
                        eligibleReferrals.filter(r => r.status === 'eligible').map((referral) => (
                          <div key={referral.id} className="p-6 hover:bg-slate-50 transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-semibold text-slate-900">{referral.jobTitle}</h3>
                                  <span className="text-slate-400">•</span>
                                  <span className="text-slate-600">{referral.company}</span>
                                </div>
                                <p className="text-sm text-slate-500">
                                  Hired on {new Date(referral.hiredAt).toLocaleDateString('en-US', { 
                                    month: 'short', 
                                    day: 'numeric', 
                                    year: 'numeric' 
                                  })}
                                </p>
                                <div className="flex items-center gap-4 mt-2">
                                  <span className="text-sm text-slate-500">
                                    Bonus: <span className="font-medium text-slate-700">{referral.bonusAmount.toLocaleString()} MMK</span>
                                  </span>
                                  <span className="text-sm text-emerald-600 font-medium">
                                    Your share (85%): {referral.referrerShare.toLocaleString()} MMK
                                  </span>
                                </div>
                              </div>
                              <button
                                onClick={() => handleRequestPayout(referral)}
                                className="ml-4 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2"
                              >
                                Withdraw
                                <ArrowRight className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Payout History */}
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-200">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                            <FileText className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <h2 className="text-lg font-semibold text-slate-900">Payout History</h2>
                            <p className="text-sm text-slate-500">Track your withdrawal requests</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Filter className="w-4 h-4 text-slate-400" />
                          <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value as any)}
                            className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="all">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="processing">Processing</option>
                            <option value="paid">Paid</option>
                            <option value="rejected">Rejected</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Request ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Amount</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Method</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredHistory.slice(0, 5).map((request) => (
                            <tr key={request.id} className="hover:bg-slate-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                                #{request.id}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-semibold text-slate-900">
                                  {request.netAmount.toLocaleString()} MMK
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  {getMethodIcon(request.method.type)}
                                  <span className="text-sm text-slate-600">{request.method.name}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                                  {getStatusIcon(request.status)}
                                  {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                {new Date(request.requestedAt).toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    {filteredHistory.length > 5 && (
                      <div className="p-4 border-t border-slate-200 text-center">
                        <button
                          onClick={() => setActiveTab('history')}
                          className="text-blue-600 text-sm font-medium hover:underline"
                        >
                          View all {filteredHistory.length} payouts
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>

                {/* Right Sidebar */}
                <motion.div 
                  variants={itemVariants}
                  initial="hidden" 
                  animate="visible"
                  className="space-y-6"
                >
                  {/* Payout Methods */}
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                            <CreditCard className="w-5 h-5 text-purple-600" />
                          </div>
                          <div>
                            <h2 className="text-lg font-semibold text-slate-900">Payout Methods</h2>
                            <p className="text-sm text-slate-500">Manage your withdrawal options</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setActiveTab('settings')}
                          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Plus className="w-5 h-5 text-slate-600" />
                        </button>
                      </div>
                    </div>

                    <div className="p-6 space-y-3">
                      {payoutMethods.map((method) => (
                        <div
                          key={method.id}
                          className={`p-4 rounded-xl border-2 transition-all ${
                            method.isDefault 
                              ? 'border-blue-500 bg-blue-50/50' 
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              {getMethodIcon(method.type)}
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-slate-900">{method.name}</span>
                                  {method.isDefault && (
                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                                      Default
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-slate-500">{method.accountNumber}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}

                      {payoutMethods.length === 0 && (
                        <div className="text-center py-6">
                          <p className="text-slate-500 text-sm">No payout methods added</p>
                          <button
                            onClick={() => setActiveTab('settings')}
                            className="mt-2 text-blue-600 text-sm font-medium hover:underline"
                          >
                            Add your first method
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Withdrawal Calendar */}
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-200">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                          <Calendar className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                          <h2 className="text-lg font-semibold text-slate-900">Withdrawal Schedule</h2>
                          <p className="text-sm text-slate-500">Upcoming payout dates</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-6">
                      <div className="space-y-4">
                        <div className="flex items-center gap-4 p-3 bg-emerald-50 rounded-xl">
                          <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                            <CheckCircle className="w-5 h-5 text-emerald-600" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-slate-900">Next Payout</p>
                            <p className="text-sm text-slate-600">February 15, 2026</p>
                          </div>
                          <span className="text-emerald-600 font-semibold">Active</span>
                        </div>

                        <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl">
                          <div className="w-10 h-10 rounded-lg bg-slate-200 flex items-center justify-center">
                            <Clock className="w-5 h-5 text-slate-500" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-slate-900">Following Payout</p>
                            <p className="text-sm text-slate-600">March 15, 2026</p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 pt-6 border-t border-slate-200">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <RefreshCw className="w-4 h-4" />
                          <span>Payouts processed on 15th of each month</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-2">
                          Minimum withdrawal: 50,000 MMK
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl p-6 text-white">
                    <h3 className="font-semibold mb-4">Platform Commission</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-blue-100">Your Share</span>
                        <span className="font-bold text-2xl">85%</span>
                      </div>
                      <div className="w-full bg-white/20 rounded-full h-2">
                        <div className="bg-white rounded-full h-2" style={{ width: '85%' }} />
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-blue-100">Platform Fee</span>
                        <span>15%</span>
                      </div>
                    </div>
                    <p className="text-xs text-blue-100 mt-4">
                      Commission covers payment processing, platform maintenance, and support services.
                    </p>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <PayoutHistory />
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <PayoutSettings />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Payout Request Modal */}
      {isRequestModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Request Payout</h2>
            <p className="text-slate-600 mb-4">
              {selectedReferral 
                ? `Withdraw ${selectedReferral.referrerShare.toLocaleString()} MMK for ${selectedReferral.jobTitle}`
                : `Available balance: ${earnings.available.toLocaleString()} MMK`
              }
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setIsRequestModalOpen(false)}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const amount = selectedReferral ? selectedReferral.referrerShare : earnings.available
                  const method = payoutMethods.find(m => m.isDefault)
                  if (method) {
                    handleSubmitRequest(amount, method.id)
                  }
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
