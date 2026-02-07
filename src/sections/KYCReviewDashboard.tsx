import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Shield, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search, 
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  User,
  Calendar,
  AlertCircle,
  Loader2,
  Download,
  RefreshCw,
  MoreHorizontal,
  Check,
  X
} from 'lucide-react'
import { KYCStatusBadge, KYCProgress } from '../components/KYCStatusBadge'

interface KYCReview {
  _id: string
  userId: {
    _id: string
    name: string
    email: string
    phone?: string
  }
  currentLevel: number
  targetLevel: number
  status: string
  levelStatus: {
    level1: { status: string; phoneVerified: boolean; emailVerified: boolean }
    level2: { status: string; nrcVerified: boolean; nrcNumber?: string; selfieVerified: boolean }
    level3: { status: string; addressVerified: boolean; bankVerified: boolean }
    level4: { status: string; businessRegistrationVerified: boolean; tinVerified: boolean }
  }
  documents: Array<{
    _id: string
    documentType: string
    status: string
    file: {
      originalName: string
      url?: string
    }
    ocrData?: {
      extractedData?: {
        nrcNumber?: string
        name?: string
      }
      confidence?: {
        overall: number
      }
    }
  }>
  reviewInfo: {
    submittedAt: string
    reviewedAt?: string
    reviewedBy?: {
      name: string
    }
    reviewNotes?: string
  }
  rejectionHistory?: Array<{
    code: string
    message: string
    rejectedAt: string
  }>
  createdAt: string
  riskScore?: number
}

interface ReviewStats {
  total: number
  pendingReview: number
  verified: number
  rejected: number
  level0: number
  level1: number
  level2: number
  level3: number
  level4: number
}

export function KYCReviewDashboard() {
  const [reviews, setReviews] = useState<KYCReview[]>([])
  const [stats, setStats] = useState<ReviewStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedReview, setSelectedReview] = useState<KYCReview | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [levelFilter, setLevelFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [isProcessing, setIsProcessing] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [rejectionCode, setRejectionCode] = useState('')
  const [showRejectionModal, setShowRejectionModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'pending' | 'all' | 'verified' | 'rejected'>('pending')

  const fetchReviews = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (levelFilter !== 'all') params.append('level', levelFilter)
      params.append('page', currentPage.toString())
      params.append('limit', '20')

      const response = await fetch(`/api/v1/kyc/admin/pending?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      })

      if (!response.ok) throw new Error('Failed to fetch reviews')

      const data = await response.json()
      setReviews(data.data)
      setTotalPages(Math.ceil(data.count / 20))
    } catch (error) {
      console.error('Error fetching reviews:', error)
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter, levelFilter, currentPage])

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/kyc/admin/statistics', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      })

      if (!response.ok) throw new Error('Failed to fetch stats')

      const data = await response.json()
      setStats(data.data)
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }, [])

  useEffect(() => {
    fetchReviews()
    fetchStats()
  }, [fetchReviews, fetchStats])

  const handleApprove = async (reviewId: string, notes?: string) => {
    setIsProcessing(true)
    try {
      const review = reviews.find(r => r._id === reviewId)
      if (!review) return

      const response = await fetch(`/api/v1/kyc/admin/approve/${review.userId._id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ notes }),
      })

      if (!response.ok) throw new Error('Failed to approve')

      // Refresh data
      fetchReviews()
      fetchStats()
      setSelectedReview(null)
    } catch (error) {
      console.error('Error approving:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReject = async (reviewId: string) => {
    if (!rejectionReason || !rejectionCode) return

    setIsProcessing(true)
    try {
      const review = reviews.find(r => r._id === reviewId)
      if (!review) return

      const response = await fetch(`/api/v1/kyc/admin/reject/${review.userId._id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          code: rejectionCode,
          message: rejectionReason,
        }),
      })

      if (!response.ok) throw new Error('Failed to reject')

      // Refresh data
      fetchReviews()
      fetchStats()
      setSelectedReview(null)
      setShowRejectionModal(false)
      setRejectionReason('')
      setRejectionCode('')
    } catch (error) {
      console.error('Error rejecting:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const filteredReviews = reviews.filter(review => {
    const matchesSearch = 
      review.userId.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      review.userId.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      review.levelStatus.level2.nrcNumber?.includes(searchQuery)
    
    const matchesTab = 
      activeTab === 'all' ? true :
      activeTab === 'pending' ? review.status === 'pending_review' :
      activeTab === 'verified' ? review.status === 'verified' :
      review.status === 'rejected'

    return matchesSearch && matchesTab
  })

  const REJECTION_CODES = [
    { value: 'document_unclear', label: 'Document Unclear' },
    { value: 'document_expired', label: 'Document Expired' },
    { value: 'document_mismatch', label: 'Document Mismatch' },
    { value: 'selfie_mismatch', label: 'Selfie Mismatch' },
    { value: 'nrc_invalid', label: 'Invalid NRC' },
    { value: 'information_incomplete', label: 'Information Incomplete' },
    { value: 'suspicious_activity', label: 'Suspicious Activity' },
    { value: 'other', label: 'Other' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">KYC Review Dashboard</h1>
              <p className="mt-1 text-sm text-gray-500">
                Review and approve Know Your Customer verifications
              </p>
            </div>
            <button
              onClick={() => { fetchReviews(); fetchStats(); }}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            <StatCard
              label="Total"
              value={stats.total}
              icon={Shield}
              color="gray"
            />
            <StatCard
              label="Pending"
              value={stats.pendingReview}
              icon={Clock}
              color="amber"
            />
            <StatCard
              label="Verified"
              value={stats.verified}
              icon={CheckCircle2}
              color="green"
            />
            <StatCard
              label="Rejected"
              value={stats.rejected}
              icon={XCircle}
              color="red"
            />
            <StatCard
              label="Level 0"
              value={stats.level0}
              icon={Shield}
              color="gray"
            />
            <StatCard
              label="Level 1"
              value={stats.level1}
              icon={Shield}
              color="blue"
            />
            <StatCard
              label="Level 2"
              value={stats.level2}
              icon={Shield}
              color="green"
            />
            <StatCard
              label="Level 3+"
              value={stats.level3 + stats.level4}
              icon={Shield}
              color="purple"
            />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <div className="flex">
              {(['pending', 'all', 'verified', 'rejected'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`
                    px-6 py-4 text-sm font-medium border-b-2 transition-colors
                    ${activeTab === tab
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                    }
                  `}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  {tab === 'pending' && stats && stats.pendingReview > 0 && (
                    <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs">
                      {stats.pendingReview}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div className="p-4 border-b border-gray-200 flex flex-wrap gap-4">
            <div className="flex-1 min-w-[300px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, email, or NRC..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Levels</option>
              <option value="1">Level 1</option>
              <option value="2">Level 2</option>
              <option value="3">Level 3</option>
              <option value="4">Level 4</option>
            </select>
          </div>

          {/* Reviews Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Level
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Documents
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submitted
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Risk
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
                    </td>
                  </tr>
                ) : filteredReviews.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      No KYC reviews found
                    </td>
                  </tr>
                ) : (
                  filteredReviews.map((review) => (
                    <tr
                      key={review._id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedReview(review)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <User className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {review.userId.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {review.userId.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <KYCProgress
                            currentLevel={review.currentLevel}
                            targetLevel={review.targetLevel}
                          />
                          <span className="text-sm text-gray-500">
                            → Lvl {review.targetLevel}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <KYCStatusBadge
                          level={review.currentLevel}
                          status={review.status as any}
                          size="sm"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            {review.documents?.length || 0} docs
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Calendar className="w-4 h-4" />
                          {new Date(review.reviewInfo.submittedAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <RiskBadge score={review.riskScore || 0} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedReview(review)
                          }}
                          className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {filteredReviews.length} of {stats?.total || 0} reviews
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Review Detail Modal */}
      <AnimatePresence>
        {selectedReview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedReview(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <User className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {selectedReview.userId.name}
                    </h2>
                    <p className="text-sm text-gray-500">{selectedReview.userId.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedReview(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column - User Info */}
                  <div className="space-y-6">
                    <section>
                      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">
                        Verification Status
                      </h3>
                      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Current Level</span>
                          <KYCStatusBadge level={selectedReview.currentLevel} size="sm" />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Target Level</span>
                          <span className="text-sm font-medium">Level {selectedReview.targetLevel}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Status</span>
                          <KYCStatusBadge
                            level={selectedReview.currentLevel}
                            status={selectedReview.status as any}
                            size="sm"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Risk Score</span>
                          <RiskBadge score={selectedReview.riskScore || 0} />
                        </div>
                      </div>
                    </section>

                    <section>
                      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">
                        Level Details
                      </h3>
                      <div className="space-y-2">
                        <LevelDetail
                          level={1}
                          title="Basic Verification"
                          details={[
                            { label: 'Phone', verified: selectedReview.levelStatus.level1.phoneVerified },
                            { label: 'Email', verified: selectedReview.levelStatus.level1.emailVerified },
                          ]}
                        />
                        <LevelDetail
                          level={2}
                          title="Identity Verification"
                          details={[
                            { label: 'NRC', verified: selectedReview.levelStatus.level2.nrcVerified },
                            { label: 'Selfie', verified: selectedReview.levelStatus.level2.selfieVerified },
                          ]}
                        />
                        {selectedReview.targetLevel >= 3 && (
                          <LevelDetail
                            level={3}
                            title="Address & Bank"
                            details={[
                              { label: 'Address', verified: selectedReview.levelStatus.level3.addressVerified },
                              { label: 'Bank', verified: selectedReview.levelStatus.level3.bankVerified },
                            ]}
                          />
                        )}
                        {selectedReview.targetLevel >= 4 && (
                          <LevelDetail
                            level={4}
                            title="Business Verification"
                            details={[
                              { label: 'Business Reg', verified: selectedReview.levelStatus.level4.businessRegistrationVerified },
                              { label: 'TIN', verified: selectedReview.levelStatus.level4.tinVerified },
                            ]}
                          />
                        )}
                      </div>
                    </section>

                    {selectedReview.levelStatus.level2.nrcNumber && (
                      <section>
                        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">
                          NRC Information
                        </h3>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <p className="text-sm font-mono text-gray-700">
                            {selectedReview.levelStatus.level2.nrcNumber}
                          </p>
                        </div>
                      </section>
                    )}
                  </div>

                  {/* Right Column - Documents */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">
                      Documents ({selectedReview.documents?.length || 0})
                    </h3>
                    <div className="space-y-3">
                      {selectedReview.documents?.map((doc) => (
                        <div
                          key={doc._id}
                          className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                                <FileText className="w-5 h-5 text-gray-600" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900 capitalize">
                                  {doc.documentType.replace(/_/g, ' ')}
                                </p>
                                <p className="text-xs text-gray-500">{doc.file.originalName}</p>
                                {doc.ocrData?.confidence?.overall && (
                                  <p className="text-xs text-gray-400">
                                    OCR Confidence: {doc.ocrData.confidence.overall}%
                                  </p>
                                )}
                              </div>
                            </div>
                            <span className={`
                              px-2 py-1 text-xs rounded-full
                              ${doc.status === 'verified' ? 'bg-green-100 text-green-700' :
                                doc.status === 'ocr_completed' ? 'bg-blue-100 text-blue-700' :
                                'bg-gray-100 text-gray-600'}
                            `}>
                              {doc.status}
                            </span>
                          </div>
                          {doc.ocrData?.extractedData?.nrcNumber && (
                            <div className="mt-2 pt-2 border-t border-gray-100">
                              <p className="text-xs text-gray-500">
                                Extracted NRC: {doc.ocrData.extractedData.nrcNumber}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Rejection History */}
                    {selectedReview.rejectionHistory && selectedReview.rejectionHistory.length > 0 && (
                      <div className="mt-6">
                        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">
                          Rejection History
                        </h3>
                        <div className="space-y-2">
                          {selectedReview.rejectionHistory.map((rejection, idx) => (
                            <div key={idx} className="bg-red-50 border border-red-200 rounded-lg p-3">
                              <p className="text-sm font-medium text-red-800">{rejection.code}</p>
                              <p className="text-sm text-red-600">{rejection.message}</p>
                              <p className="text-xs text-red-400 mt-1">
                                {new Date(rejection.rejectedAt).toLocaleDateString()}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              {selectedReview.status === 'pending_review' && (
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
                  <button
                    onClick={() => setShowRejectionModal(true)}
                    disabled={isProcessing}
                    className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleApprove(selectedReview._id)}
                    disabled={isProcessing}
                    className="px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {isProcessing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    Approve
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rejection Modal */}
      <AnimatePresence>
        {showRejectionModal && selectedReview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]"
            onClick={() => setShowRejectionModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
            >
              <h3 className="text-lg font-bold text-gray-900 mb-4">Reject KYC Application</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rejection Reason
                  </label>
                  <select
                    value={rejectionCode}
                    onChange={(e) => setRejectionCode(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select reason...</option>
                    {REJECTION_CODES.map((code) => (
                      <option key={code.value} value={code.value}>
                        {code.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Detailed Message
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Explain why this application is being rejected..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowRejectionModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleReject(selectedReview._id)}
                  disabled={!rejectionCode || !rejectionReason || isProcessing}
                  className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg disabled:opacity-50 flex items-center gap-2"
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <X className="w-4 h-4" />
                  )}
                  Confirm Rejection
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Helper Components

function StatCard({ 
  label, 
  value, 
  icon: Icon, 
  color 
}: { 
  label: string
  value: number
  icon: React.ElementType
  color: string
}) {
  const colorClasses: Record<string, { bg: string; text: string }> = {
    gray: { bg: 'bg-gray-100', text: 'text-gray-600' },
    blue: { bg: 'bg-blue-100', text: 'text-blue-600' },
    green: { bg: 'bg-green-100', text: 'text-green-600' },
    amber: { bg: 'bg-amber-100', text: 'text-amber-600' },
    red: { bg: 'bg-red-100', text: 'text-red-600' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-600' },
  }

  const classes = colorClasses[color] || colorClasses.gray

  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-500">{label}</p>
        </div>
        <div className={`w-10 h-10 rounded-lg ${classes.bg} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${classes.text}`} />
        </div>
      </div>
    </div>
  )
}

function RiskBadge({ score }: { score: number }) {
  let color = 'green'
  let label = 'Low'

  if (score > 75) {
    color = 'red'
    label = 'High'
  } else if (score > 50) {
    color = 'amber'
    label = 'Medium'
  } else if (score > 25) {
    color = 'blue'
    label = 'Low'
  }

  return (
    <span className={`
      px-2 py-1 rounded-full text-xs font-medium
      ${color === 'red' ? 'bg-red-100 text-red-700' :
        color === 'amber' ? 'bg-amber-100 text-amber-700' :
        color === 'blue' ? 'bg-blue-100 text-blue-700' :
        'bg-green-100 text-green-700'}
    `}>
      {label} ({score})
    </span>
  )
}

function LevelDetail({ 
  level, 
  title, 
  details 
}: { 
  level: number
  title: string
  details: Array<{ label: string; verified: boolean }>
}) {
  const allVerified = details.every(d => d.verified)

  return (
    <div className="border border-gray-200 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">
            {level}
          </span>
          <span className="text-sm font-medium text-gray-700">{title}</span>
        </div>
        {allVerified && (
          <CheckCircle2 className="w-4 h-4 text-green-500" />
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {details.map((detail) => (
          <span
            key={detail.label}
            className={`
              inline-flex items-center gap-1 px-2 py-1 rounded text-xs
              ${detail.verified 
                ? 'bg-green-100 text-green-700' 
                : 'bg-gray-100 text-gray-500'}
            `}
          >
            {detail.verified ? (
              <Check className="w-3 h-3" />
            ) : (
              <X className="w-3 h-3" />
            )}
            {detail.label}
          </span>
        ))}
      </div>
    </div>
  )
}
