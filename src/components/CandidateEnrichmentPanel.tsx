import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  Brain,
  Zap,
  CheckCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  Users,
  Target,
  TrendingUp,
  X,
  ChevronDown,
  ChevronUp,
  Play,
  Pause,
  BarChart3,
  Award,
} from 'lucide-react'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

interface EnrichmentStats {
  total: number
  enriched: number
  failed: number
  inProgress: boolean
}

interface Candidate {
  _id: string
  name: string
  currentTitle?: string
  hireProbabilityScore?: number
  enrichedData?: {
    extractedSkills?: Array<{
      skill: string
      confidence: number
    }>
    estimatedSalary?: {
      min: number
      max: number
      currency: string
    }
    aiInsights?: {
      strengths: string[]
      potentialRoles: string[]
      careerTrajectory: string
      availabilityLikelihood: number
    }
  }
}

interface CandidateEnrichmentPanelProps {
  onClose: () => void
  onEnriched: () => void
}

export default function CandidateEnrichmentPanel({ onClose, onEnriched }: CandidateEnrichmentPanelProps) {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [enriching, setEnriching] = useState(false)
  const [progress, setProgress] = useState(0)
  const [stats, setStats] = useState<EnrichmentStats | null>(null)
  const [expandedCandidate, setExpandedCandidate] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'unenriched' | 'enriched'>('unenriched')

  // Fetch candidates for enrichment
  const fetchCandidates = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const response = await fetch(
        `${API_BASE_URL}/talent-pool/candidates?limit=50&sortBy=createdAt`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      if (!response.ok) throw new Error('Failed to fetch candidates')
      
      const data = await response.json()
      setCandidates(data.data.candidates)
    } catch (err) {
      console.error('Error fetching candidates:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCandidates()
  }, [])

  const handleSelectAll = () => {
    const filtered = getFilteredCandidates()
    if (selectedCandidates.length === filtered.length) {
      setSelectedCandidates([])
    } else {
      setSelectedCandidates(filtered.map(c => c._id))
    }
  }

  const handleSelectCandidate = (candidateId: string) => {
    if (selectedCandidates.includes(candidateId)) {
      setSelectedCandidates(selectedCandidates.filter(id => id !== candidateId))
    } else {
      setSelectedCandidates([...selectedCandidates, candidateId])
    }
  }

  const handleBatchEnrich = async () => {
    if (selectedCandidates.length === 0) return

    try {
      setEnriching(true)
      setProgress(0)
      
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_BASE_URL}/talent-pool/candidates/batch-enrich`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ candidateIds: selectedCandidates }),
      })

      if (!response.ok) throw new Error('Failed to start enrichment')

      // Simulate progress updates
      let currentProgress = 0
      const interval = setInterval(() => {
        currentProgress += Math.random() * 15
        if (currentProgress >= 100) {
          currentProgress = 100
          clearInterval(interval)
        }
        setProgress(Math.min(currentProgress, 100))
      }, 500)

      const data = await response.json()
      setStats(data.data)
      
      // Refresh candidates
      await fetchCandidates()
      onEnriched()
    } catch (err) {
      console.error('Error enriching candidates:', err)
    } finally {
      setEnriching(false)
      setProgress(100)
    }
  }

  const handleSingleEnrich = async (candidateId: string) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(
        `${API_BASE_URL}/talent-pool/candidates/${candidateId}/enrich`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }
      )

      if (!response.ok) throw new Error('Failed to enrich candidate')

      // Refresh candidates
      await fetchCandidates()
      onEnriched()
    } catch (err) {
      console.error('Error enriching candidate:', err)
    }
  }

  const getFilteredCandidates = () => {
    switch (filter) {
      case 'unenriched':
        return candidates.filter(c => !c.hireProbabilityScore)
      case 'enriched':
        return candidates.filter(c => c.hireProbabilityScore)
      default:
        return candidates
    }
  }

  const filteredCandidates = getFilteredCandidates()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-100 rounded-xl">
            <Brain className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">AI Candidate Enrichment</h2>
            <p className="text-sm text-gray-500">
              Use AI to extract skills, estimate salaries, and calculate hire probability
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-4 border border-purple-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-200 rounded-lg">
              <Users className="w-5 h-5 text-purple-700" />
            </div>
            <div>
              <p className="text-sm text-purple-600">Total Candidates</p>
              <p className="text-2xl font-bold text-purple-900">{candidates.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-200 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-700" />
            </div>
            <div>
              <p className="text-sm text-green-600">Enriched</p>
              <p className="text-2xl font-bold text-green-900">
                {candidates.filter(c => c.hireProbabilityScore).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-xl p-4 border border-orange-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-200 rounded-lg">
              <Zap className="w-5 h-5 text-orange-700" />
            </div>
            <div>
              <p className="text-sm text-orange-600">Pending</p>
              <p className="text-2xl font-bold text-orange-900">
                {candidates.filter(c => !c.hireProbabilityScore).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-gray-50 rounded-xl">
        <div className="flex items-center gap-4">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
            className="px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-purple-500"
          >
            <option value="unenriched">Unenriched Only</option>
            <option value="enriched">Enriched Only</option>
            <option value="all">All Candidates</option>
          </select>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedCandidates.length === filteredCandidates.length && filteredCandidates.length > 0}
              onChange={handleSelectAll}
              className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
            />
            <span className="text-sm text-gray-700">
              Select All ({selectedCandidates.length}/{filteredCandidates.length})
            </span>
          </label>
        </div>

        <button
          onClick={handleBatchEnrich}
          disabled={selectedCandidates.length === 0 || enriching}
          className="flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {enriching ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Enriching...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Enrich Selected ({selectedCandidates.length})</span>
            </>
          )}
        </button>
      </div>

      {/* Progress Bar */}
      {enriching && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Enrichment Progress</span>
            <span className="font-medium text-purple-600">{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-purple-600"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      )}

      {/* Results Summary */}
      {stats && !enriching && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-green-50 border border-green-200 rounded-xl"
        >
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div>
              <p className="font-medium text-green-900">Enrichment Complete</p>
              <p className="text-sm text-green-700">
                {stats.enriched} candidates enriched successfully
                {stats.failed > 0 && `, ${stats.failed} failed`}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Candidates List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
        </div>
      ) : filteredCandidates.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Brain className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>No candidates to enrich</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[500px] overflow-y-auto">
          {filteredCandidates.map((candidate) => (
            <motion.div
              key={candidate._id}
              layout
              className={`border rounded-xl overflow-hidden transition-all ${
                selectedCandidates.includes(candidate._id)
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <div
                className="p-4 flex items-center gap-4 cursor-pointer"
                onClick={() => handleSelectCandidate(candidate._id)}
              >
                <input
                  type="checkbox"
                  checked={selectedCandidates.includes(candidate._id)}
                  onChange={() => {}}
                  className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                />

                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                  {candidate.name.charAt(0)}
                </div>

                <div className="flex-1">
                  <p className="font-medium text-gray-900">{candidate.name}</p>
                  <p className="text-sm text-gray-500">{candidate.currentTitle || 'No title'}</p>
                </div>

                {candidate.hireProbabilityScore ? (
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-xs text-gray-500">Hire Score</p>
                      <span className={`font-bold ${
                        candidate.hireProbabilityScore >= 80 ? 'text-green-600' :
                        candidate.hireProbabilityScore >= 60 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {candidate.hireProbabilityScore}%
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setExpandedCandidate(
                          expandedCandidate === candidate._id ? null : candidate._id
                        )
                      }}
                      className="p-2 hover:bg-gray-100 rounded-lg"
                    >
                      {expandedCandidate === candidate._id ? (
                        <ChevronUp className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      )}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSingleEnrich(candidate._id)
                    }}
                    className="flex items-center gap-1 px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200"
                  >
                    <Sparkles className="w-3 h-3" />
                    Enrich
                  </button>
                )}
              </div>

              {/* Expanded Details */}
              <AnimatePresence>
                {expandedCandidate === candidate._id && candidate.enrichedData && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-gray-200 bg-gray-50"
                  >
                    <div className="p-4 space-y-4">
                      {/* Skills */}
                      {candidate.enrichedData.extractedSkills && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-2">Extracted Skills</p>
                          <div className="flex flex-wrap gap-2">
                            {candidate.enrichedData.extractedSkills.map((skill, i) => (
                              <span
                                key={i}
                                className="px-2 py-1 bg-white border border-gray-200 rounded-lg text-sm"
                              >
                                {skill.skill}
                                <span className="ml-1 text-xs text-gray-400">
                                  {Math.round(skill.confidence * 100)}%
                                </span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Salary Estimate */}
                      {candidate.enrichedData.estimatedSalary && (
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-green-100 rounded-lg">
                            <TrendingUp className="w-4 h-4 text-green-600" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Estimated Salary</p>
                            <p className="font-medium text-gray-900">
                              {candidate.enrichedData.estimatedSalary.min.toLocaleString()} - {''}
                              {candidate.enrichedData.estimatedSalary.max.toLocaleString()}{' '}
                              {candidate.enrichedData.estimatedSalary.currency}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* AI Insights */}
                      {candidate.enrichedData.aiInsights && (
                        <div className="space-y-3">
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-2">Strengths</p>
                            <div className="flex flex-wrap gap-2">
                              {candidate.enrichedData.aiInsights.strengths.map((strength, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs"
                                >
                                  {strength}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-2">Potential Roles</p>
                            <div className="flex flex-wrap gap-2">
                              {candidate.enrichedData.aiInsights.potentialRoles.map((role, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs"
                                >
                                  {role}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Award className="w-4 h-4 text-amber-500" />
                            <p className="text-sm text-gray-600">
                              Career Trajectory: {candidate.enrichedData.aiInsights.careerTrajectory}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <Target className="w-4 h-4 text-blue-500" />
                            <p className="text-sm text-gray-600">
                              Availability Likelihood: {candidate.enrichedData.aiInsights.availabilityLikelihood}%
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
