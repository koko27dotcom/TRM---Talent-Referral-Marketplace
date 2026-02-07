import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users,
  User,
  Search,
  Filter,
  Download,
  Sparkles,
  Mail,
  MessageSquare,
  TrendingUp,
  Target,
  BarChart3,
  PieChart,
  MoreVertical,
  Plus,
  ExternalLink,
  Phone,
  MapPin,
  Briefcase,
  Star,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Database,
  Globe,
  Zap,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import CandidateEnrichmentPanel from '../components/CandidateEnrichmentPanel'
import OutreachManager from '../components/OutreachManager'
import CandidateDetailModal from '../components/CandidateDetailModal'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

interface Candidate {
  _id: string
  name: string
  email?: string
  phone?: string
  currentTitle?: string
  currentCompany?: string
  experienceYears?: number
  skills: string[]
  location?: {
    city?: string
    region?: string
  }
  source: string
  contactStatus: string
  hireProbabilityScore?: number
  enrichedData?: {
    estimatedSalary?: {
      min: number
      max: number
      currency: string
    }
    extractedSkills?: Array<{
      skill: string
      confidence: number
    }>
    aiInsights?: {
      strengths: string[]
      potentialRoles: string[]
      careerTrajectory: string
      availabilityLikelihood: number
    }
  }
  createdAt: string
}

interface DashboardStats {
  overview: {
    total: number
    thisMonth: number
    avgHireScore: number
  }
  sourceBreakdown: Array<{ _id: string; count: number }>
  statusBreakdown: Array<{ _id: string; count: number }>
  topSkills: Array<{ _id: string; count: number }>
  recentCandidates: Candidate[]
}

interface Source {
  _id: string
  name: string
  platform: string
  status: string
  stats: {
    totalCandidatesAdded: number
    lastRunAt?: string
  }
}

type ActiveTab = 'candidates' | 'sources' | 'enrichment' | 'outreach'
type ViewMode = 'grid' | 'list'

export default function TalentPoolDashboard() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('candidates')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [sources, setSources] = useState<Source[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showEnrichmentPanel, setShowEnrichmentPanel] = useState(false)
  const [showOutreachManager, setShowOutreachManager] = useState(false)
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([])
  const [filters, setFilters] = useState({
    source: '',
    contactStatus: '',
    minHireScore: '',
    skills: '',
  })
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  })

  // Fetch dashboard stats
  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_BASE_URL}/talent-pool/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      
      if (!response.ok) throw new Error('Failed to fetch stats')
      
      const data = await response.json()
      setStats(data.data)
    } catch (err) {
      console.error('Error fetching stats:', err)
    }
  }

  // Fetch candidates
  const fetchCandidates = async (page = 1) => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        ...(searchQuery && { search: searchQuery }),
        ...(filters.source && { source: filters.source }),
        ...(filters.contactStatus && { contactStatus: filters.contactStatus }),
        ...(filters.minHireScore && { minHireScore: filters.minHireScore }),
        ...(filters.skills && { skills: filters.skills }),
      })
      
      const response = await fetch(`${API_BASE_URL}/talent-pool/candidates?${queryParams}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      
      if (!response.ok) throw new Error('Failed to fetch candidates')
      
      const data = await response.json()
      setCandidates(data.data.candidates)
      setPagination(data.data.pagination)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Fetch sources
  const fetchSources = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_BASE_URL}/talent-pool/sources`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      
      if (!response.ok) throw new Error('Failed to fetch sources')
      
      const data = await response.json()
      setSources(data.data)
    } catch (err) {
      console.error('Error fetching sources:', err)
    }
  }

  useEffect(() => {
    fetchStats()
    fetchSources()
  }, [])

  useEffect(() => {
    if (activeTab === 'candidates') {
      fetchCandidates(pagination.page)
    }
  }, [activeTab, pagination.page, searchQuery, filters])

  const handleEnrichCandidate = async (candidateId: string) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_BASE_URL}/talent-pool/candidates/${candidateId}/enrich`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      
      if (!response.ok) throw new Error('Failed to enrich candidate')
      
      // Refresh candidates
      fetchCandidates(pagination.page)
    } catch (err) {
      console.error('Error enriching candidate:', err)
    }
  }

  const handleExportCSV = () => {
    if (!candidates.length) return
    
    const headers = ['Name', 'Email', 'Phone', 'Title', 'Company', 'Experience', 'Skills', 'Source', 'Status', 'Hire Score']
    const rows = candidates.map(c => [
      c.name,
      c.email || '',
      c.phone || '',
      c.currentTitle || '',
      c.currentCompany || '',
      c.experienceYears?.toString() || '',
      c.skills.join(', '),
      c.source,
      c.contactStatus,
      c.hireProbabilityScore?.toString() || '',
    ])
    
    const csv = [headers.join(','), ...rows.map(r => r.map(cell => `"${cell}"`).join(','))].join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `talent-pool-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      not_contacted: 'bg-gray-100 text-gray-700',
      contacted: 'bg-blue-100 text-blue-700',
      responded: 'bg-green-100 text-green-700',
      engaged: 'bg-purple-100 text-purple-700',
      not_interested: 'bg-red-100 text-red-700',
      hired: 'bg-emerald-100 text-emerald-700',
    }
    return colors[status] || 'bg-gray-100 text-gray-700'
  }

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'linkedin': return <Globe className="w-4 h-4 text-blue-600" />
      case 'facebook': return <Globe className="w-4 h-4 text-blue-500" />
      case 'job.com.mm': return <Briefcase className="w-4 h-4 text-orange-500" />
      case 'manual': return <User className="w-4 h-4 text-gray-500" />
      default: return <Database className="w-4 h-4 text-gray-400" />
    }
  }

  const getHireScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600 bg-emerald-50'
    if (score >= 60) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-lg">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">AI Talent Pool</h1>
                <p className="text-sm text-gray-500">Proactive candidate sourcing & engagement</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowEnrichmentPanel(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                <span>AI Enrich</span>
              </button>
              <button
                onClick={() => setShowOutreachManager(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
              >
                <Mail className="w-4 h-4" />
                <span>Campaigns</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Candidates</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.overview.total.toLocaleString()}</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-lg">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">This Month</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.overview.thisMonth}</p>
                </div>
                <div className="bg-green-100 p-3 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Avg Hire Score</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {Math.round(stats.overview.avgHireScore || 0)}
                  </p>
                </div>
                <div className="bg-purple-100 p-3 rounded-lg">
                  <Star className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Active Sources</p>
                  <p className="text-3xl font-bold text-gray-900">{sources.filter(s => s.status === 'active').length}</p>
                </div>
                <div className="bg-orange-100 p-3 rounded-lg">
                  <Database className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {/* Tabs */}
        <div className="bg-white rounded-t-xl border border-gray-200 border-b-0">
          <div className="flex border-b border-gray-200">
            {[
              { id: 'candidates', label: 'Candidates', icon: Users },
              { id: 'sources', label: 'Sources', icon: Database },
              { id: 'enrichment', label: 'AI Enrichment', icon: Sparkles },
              { id: 'outreach', label: 'Outreach', icon: Mail },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ActiveTab)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-b-xl border border-gray-200 border-t-0 shadow-sm">
          {activeTab === 'candidates' && (
            <div className="p-6">
              {/* Search and Filters */}
              <div className="flex flex-col lg:flex-row gap-4 mb-6">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search candidates by name, title, skills..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  <select
                    value={filters.source}
                    onChange={(e) => setFilters({ ...filters, source: e.target.value })}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Sources</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="facebook">Facebook</option>
                    <option value="job.com.mm">Job.com.mm</option>
                    <option value="manual">Manual</option>
                  </select>
                  <select
                    value={filters.contactStatus}
                    onChange={(e) => setFilters({ ...filters, contactStatus: e.target.value })}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Status</option>
                    <option value="not_contacted">Not Contacted</option>
                    <option value="contacted">Contacted</option>
                    <option value="responded">Responded</option>
                    <option value="engaged">Engaged</option>
                  </select>
                  <select
                    value={filters.minHireScore}
                    onChange={(e) => setFilters({ ...filters, minHireScore: e.target.value })}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Hire Score</option>
                    <option value="80">80+ (High)</option>
                    <option value="60">60+ (Medium)</option>
                    <option value="40">40+ (Low)</option>
                  </select>
                  <button
                    onClick={handleExportCSV}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    <Download className="w-4 h-4" />
                    Export
                  </button>
                </div>
              </div>

              {/* Candidates List */}
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                </div>
              ) : error ? (
                <div className="flex items-center justify-center py-12 text-red-600">
                  <AlertCircle className="w-5 h-5 mr-2" />
                  {error}
                </div>
              ) : candidates.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No candidates found</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 font-medium text-gray-700">Candidate</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-700">Current Role</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-700">Skills</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-700">Source</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-700">Hire Score</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {candidates.map((candidate) => (
                          <tr
                            key={candidate._id}
                            className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                          >
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium">
                                  {candidate.name.charAt(0)}
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900">{candidate.name}</p>
                                  {candidate.email && (
                                    <p className="text-sm text-gray-500">{candidate.email}</p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <p className="text-gray-900">{candidate.currentTitle || '-'}</p>
                              {candidate.currentCompany && (
                                <p className="text-sm text-gray-500">{candidate.currentCompany}</p>
                              )}
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex flex-wrap gap-1">
                                {candidate.skills.slice(0, 3).map((skill, i) => (
                                  <span
                                    key={i}
                                    className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                                  >
                                    {skill}
                                  </span>
                                ))}
                                {candidate.skills.length > 3 && (
                                  <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded-full">
                                    +{candidate.skills.length - 3}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-2">
                                {getSourceIcon(candidate.source)}
                                <span className="text-sm text-gray-600 capitalize">{candidate.source}</span>
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(candidate.contactStatus)}`}>
                                {candidate.contactStatus.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="py-4 px-4">
                              {candidate.hireProbabilityScore ? (
                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getHireScoreColor(candidate.hireProbabilityScore)}`}>
                                  {candidate.hireProbabilityScore}%
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    setSelectedCandidate(candidate)
                                    setShowDetailModal(true)
                                  }}
                                  className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
                                  title="View Details"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </button>
                                {!candidate.hireProbabilityScore && (
                                  <button
                                    onClick={() => handleEnrichCandidate(candidate._id)}
                                    className="p-2 hover:bg-purple-100 rounded-lg text-purple-600"
                                    title="AI Enrich"
                                  >
                                    <Sparkles className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-between mt-6">
                    <p className="text-sm text-gray-500">
                      Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                      {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                      {pagination.total} candidates
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                        disabled={pagination.page === 1}
                        className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                        disabled={pagination.page === pagination.pages}
                        className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'sources' && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Candidate Sources</h3>
                <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  <Plus className="w-4 h-4" />
                  Add Source
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sources.map((source) => (
                  <div
                    key={source._id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {getSourceIcon(source.platform)}
                        <div>
                          <h4 className="font-medium text-gray-900">{source.name}</h4>
                          <p className="text-sm text-gray-500 capitalize">{source.platform}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        source.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {source.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">{source.stats.totalCandidatesAdded} candidates</span>
                      {source.stats.lastRunAt && (
                        <span className="text-gray-400">
                          Last run: {new Date(source.stats.lastRunAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'enrichment' && (
            <div className="p-6">
              <CandidateEnrichmentPanel
                onClose={() => setActiveTab('candidates')}
                onEnriched={() => fetchCandidates(pagination.page)}
              />
            </div>
          )}

          {activeTab === 'outreach' && (
            <div className="p-6">
              <OutreachManager onClose={() => setActiveTab('candidates')} />
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showDetailModal && selectedCandidate && (
          <CandidateDetailModal
            candidate={selectedCandidate}
            onClose={() => {
              setShowDetailModal(false)
              setSelectedCandidate(null)
            }}
            onEnriched={() => fetchCandidates(pagination.page)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
