import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText, Download, Filter, ChevronDown, ChevronUp,
  CheckCircle, Clock, XCircle, AlertCircle, Eye,
  Calendar, DollarSign, CreditCard, ArrowRight,
  Search, RefreshCw, ChevronLeft, ChevronRight
} from 'lucide-react'

interface PayoutRequest {
  id: string
  requestNumber: string
  amount: number
  fee: number
  netAmount: number
  status: 'pending' | 'approved' | 'processing' | 'paid' | 'rejected' | 'cancelled'
  paymentMethod: {
    type: string
    name: string
    accountNumber: string
  }
  requestedAt: string
  processedAt?: string
  transactionId?: string
  notes?: string
}

interface PayoutHistoryProps {
  limit?: number
  showFilters?: boolean
  showPagination?: boolean
}

export default function PayoutHistory({
  limit = 20,
  showFilters = true,
  showPagination = true
}: PayoutHistoryProps) {
  const [payouts, setPayouts] = useState<PayoutRequest[]>([
    {
      id: '1',
      requestNumber: 'PYO-202401-0001',
      amount: 500000,
      fee: 7500,
      netAmount: 492500,
      status: 'paid',
      paymentMethod: { type: 'kbzpay', name: 'KBZPay', accountNumber: '09•••••7852' },
      requestedAt: '2024-01-15T10:30:00Z',
      processedAt: '2024-01-16T14:20:00Z',
      transactionId: 'KBZ202401161420001',
    },
    {
      id: '2',
      requestNumber: 'PYO-202401-0002',
      amount: 425000,
      fee: 6375,
      netAmount: 418625,
      status: 'processing',
      paymentMethod: { type: 'kbzpay', name: 'KBZPay', accountNumber: '09•••••7852' },
      requestedAt: '2024-01-28T09:15:00Z',
    },
    {
      id: '3',
      requestNumber: 'PYO-202401-0003',
      amount: 750000,
      fee: 11250,
      netAmount: 738750,
      status: 'pending',
      paymentMethod: { type: 'wavepay', name: 'WavePay', accountNumber: '09•••••1234' },
      requestedAt: '2024-01-30T16:45:00Z',
    },
    {
      id: '4',
      requestNumber: 'PYO-202312-0005',
      amount: 300000,
      fee: 4500,
      netAmount: 295500,
      status: 'rejected',
      paymentMethod: { type: 'bank_transfer', name: 'KBZ Bank', accountNumber: '••••1234' },
      requestedAt: '2023-12-20T11:00:00Z',
      processedAt: '2023-12-21T09:30:00Z',
      notes: 'Invalid account number',
    },
    {
      id: '5',
      requestNumber: 'PYO-202312-0004',
      amount: 600000,
      fee: 9000,
      netAmount: 591000,
      status: 'paid',
      paymentMethod: { type: 'wavepay', name: 'WavePay', accountNumber: '09•••••1234' },
      requestedAt: '2023-12-10T08:20:00Z',
      processedAt: '2023-12-11T10:15:00Z',
      transactionId: 'WAV202312111015002',
    },
  ])

  const [isLoading, setIsLoading] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [dateRange, setDateRange] = useState<'all' | '7days' | '30days' | '90days'>('all')

  // Filter payouts
  const filteredPayouts = payouts.filter(payout => {
    const matchesStatus = filterStatus === 'all' || payout.status === filterStatus
    const matchesSearch =
      payout.requestNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payout.paymentMethod.name.toLowerCase().includes(searchQuery.toLowerCase())

    let matchesDate = true
    if (dateRange !== 'all') {
      const payoutDate = new Date(payout.requestedAt)
      const now = new Date()
      const daysDiff = Math.floor((now.getTime() - payoutDate.getTime()) / (1000 * 60 * 60 * 24))

      switch (dateRange) {
        case '7days':
          matchesDate = daysDiff <= 7
          break
        case '30days':
          matchesDate = daysDiff <= 30
          break
        case '90days':
          matchesDate = daysDiff <= 90
          break
      }
    }

    return matchesStatus && matchesSearch && matchesDate
  })

  // Pagination
  const totalPages = Math.ceil(filteredPayouts.length / limit)
  const paginatedPayouts = showPagination
    ? filteredPayouts.slice((currentPage - 1) * limit, currentPage * limit)
    : filteredPayouts.slice(0, limit)

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-5 h-5 text-emerald-500" />
      case 'processing':
        return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
      case 'pending':
        return <Clock className="w-5 h-5 text-amber-500" />
      case 'rejected':
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-red-500" />
      default:
        return <AlertCircle className="w-5 h-5 text-slate-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-emerald-100 text-emerald-700'
      case 'processing':
        return 'bg-blue-100 text-blue-700'
      case 'pending':
        return 'bg-amber-100 text-amber-700'
      case 'rejected':
        return 'bg-red-100 text-red-700'
      case 'cancelled':
        return 'bg-slate-100 text-slate-700'
      default:
        return 'bg-slate-100 text-slate-700'
    }
  }

  const getMethodIcon = (type: string) => {
    switch (type) {
      case 'kbzpay':
        return <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white font-bold text-xs">K</div>
      case 'wavepay':
        return <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-white font-bold text-xs">W</div>
      case 'cbpay':
        return <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white font-bold text-xs">C</div>
      case 'bank_transfer':
        return <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center"><CreditCard className="w-4 h-4 text-slate-600" /></div>
      default:
        return <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center"><CreditCard className="w-4 h-4 text-slate-600" /></div>
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handleExport = () => {
    // Simulate export
    console.log('Exporting payout history...')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Payout History</h2>
          <p className="text-slate-600 mt-1">View and track all your payout requests</p>
        </div>
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by request number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="processing">Processing</option>
              <option value="paid">Paid</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>

            {/* Date Range */}
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Time</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="90days">Last 90 Days</option>
            </select>
          </div>
        </div>
      )}

      {/* Payouts List */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {paginatedPayouts.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-slate-600 font-medium">No payouts found</p>
            <p className="text-sm text-slate-500 mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {paginatedPayouts.map((payout) => (
              <motion.div
                key={payout.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="hover:bg-slate-50 transition-colors"
              >
                <div
                  className="p-6 cursor-pointer"
                  onClick={() => setExpandedId(expandedId === payout.id ? null : payout.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {getMethodIcon(payout.paymentMethod.type)}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900">{payout.requestNumber}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(payout.status)}`}>
                            {payout.status.charAt(0).toUpperCase() + payout.status.slice(1)}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500">
                          {payout.paymentMethod.name} • {payout.paymentMethod.accountNumber}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold text-slate-900">{payout.netAmount.toLocaleString()} MMK</p>
                        <p className="text-sm text-slate-500">{formatDate(payout.requestedAt)}</p>
                      </div>
                      <button className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
                        {expandedId === payout.id ? (
                          <ChevronUp className="w-5 h-5 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-slate-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  <AnimatePresence>
                    {expandedId === payout.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="pt-4 mt-4 border-t border-slate-200">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                              <p className="text-sm text-slate-500">Amount</p>
                              <p className="font-semibold text-slate-900">{payout.amount.toLocaleString()} MMK</p>
                            </div>
                            <div>
                              <p className="text-sm text-slate-500">Fee</p>
                              <p className="font-semibold text-slate-900">{payout.fee.toLocaleString()} MMK</p>
                            </div>
                            <div>
                              <p className="text-sm text-slate-500">Net Amount</p>
                              <p className="font-semibold text-emerald-600">{payout.netAmount.toLocaleString()} MMK</p>
                            </div>
                            <div>
                              <p className="text-sm text-slate-500">Requested</p>
                              <p className="font-semibold text-slate-900">{formatDateTime(payout.requestedAt)}</p>
                            </div>
                            {payout.processedAt && (
                              <div>
                                <p className="text-sm text-slate-500">Processed</p>
                                <p className="font-semibold text-slate-900">{formatDateTime(payout.processedAt)}</p>
                              </div>
                            )}
                            {payout.transactionId && (
                              <div>
                                <p className="text-sm text-slate-500">Transaction ID</p>
                                <p className="font-mono text-sm text-slate-900">{payout.transactionId}</p>
                              </div>
                            )}
                            {payout.notes && (
                              <div className="col-span-2">
                                <p className="text-sm text-slate-500">Notes</p>
                                <p className="font-semibold text-slate-900">{payout.notes}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {showPagination && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-600">
            Showing {((currentPage - 1) * limit) + 1} to {Math.min(currentPage * limit, filteredPayouts.length)} of {filteredPayouts.length} payouts
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-10 h-10 rounded-lg font-medium transition-colors ${
                  currentPage === page
                    ? 'bg-blue-600 text-white'
                    : 'border border-slate-300 hover:bg-slate-50'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
