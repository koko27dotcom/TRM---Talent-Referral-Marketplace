import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  UserCheck, Brain, TrendingUp, AlertTriangle,
  RefreshCw, CheckCircle, XCircle, Minus,
  Briefcase, GraduationCap, Award, Clock,
  Target, Star, ChevronRight, FileText,
  MessageSquare, ThumbsUp, ThumbsDown,
} from 'lucide-react'
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'

interface CandidatePrediction {
  candidateId: string
  candidateName?: string
  candidateEmail?: string
  jobId?: string
  jobTitle?: string
  prediction: {
    hireProbability: number
    confidence: number
    factors: Array<{
      factor: string
      weight: number
      score: number
      impact: string
      description: string
    }>
    similarProfiles: Array<{
      profileId: string
      outcome: string
      similarity: number
    }>
  }
  profileAnalysis: {
    overallScore: number
    skillMatch: number
    experienceMatch: number
    educationMatch: number
    cultureFit: number
    applicationQuality: number
  }
  recommendations: Array<{
    type: string
    priority: string
    description: string
    action?: string
  }>
  riskFactors: string[]
}

interface Props {
  candidateId: string
  jobId?: string
  compact?: boolean
}

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444']

export default function CandidateHireProbability({ 
  candidateId, 
  jobId,
  compact = false 
}: Props) {
  const [prediction, setPrediction] = useState<CandidatePrediction | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'factors' | 'recommendations'>('overview')

  const API_URL = import.meta.env.VITE_API_URL || '/api/v1'

  useEffect(() => {
    if (candidateId) {
      fetchPrediction()
    }
  }, [candidateId, jobId])

  const fetchPrediction = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const token = localStorage.getItem('token')
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const params = new URLSearchParams()
      if (jobId) params.append('jobId', jobId)

      const response = await fetch(
        `${API_URL}/insights/candidates/${candidateId}/hire-probability?${params}`,
        { headers }
      )

      if (response.ok) {
        const result = await response.json()
        setPrediction(result.data)
      } else {
        const errorData = await response.json()
        setError(errorData.message || 'Failed to load prediction')
      }
    } catch (err) {
      console.error('Error fetching candidate prediction:', err)
      setError('Failed to load hire probability')
    } finally {
      setIsLoading(false)
    }
  }

  const generatePrediction = async () => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem('token')
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const body: Record<string, string> = { candidateId }
      if (jobId) body.jobId = jobId

      const response = await fetch(`${API_URL}/insights/candidates/predict`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      })

      if (response.ok) {
        const result = await response.json()
        setPrediction(result.data)
      }
    } catch (err) {
      console.error('Error generating prediction:', err)
      setError('Failed to generate prediction')
    } finally {
      setIsLoading(false)
    }
  }

  const getProbabilityColor = (probability: number) => {
    if (probability >= 80) return 'text-green-600'
    if (probability >= 60) return 'text-blue-600'
    if (probability >= 40) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getProbabilityBg = (probability: number) => {
    if (probability >= 80) return 'bg-green-50 border-green-200'
    if (probability >= 60) return 'bg-blue-50 border-blue-200'
    if (probability >= 40) return 'bg-yellow-50 border-yellow-200'
    return 'bg-red-50 border-red-200'
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600'
    if (confidence >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case 'positive':
        return <TrendingUp className="w-4 h-4 text-green-500" />
      case 'negative':
        return <TrendingUp className="w-4 h-4 text-red-500 rotate-180" />
      default:
        return <Minus className="w-4 h-4 text-gray-400" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200'
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'low':
        return 'text-green-600 bg-green-50 border-green-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  if (compact) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
        {isLoading ? (
          <div className="flex items-center justify-center h-20">
            <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : prediction ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Brain className="w-5 h-5 text-purple-600" />
                <span className="font-semibold text-gray-900">Hire Probability</span>
              </div>
              <span className={`text-2xl font-bold ${getProbabilityColor(prediction.prediction.hireProbability)}`}>
                {prediction.prediction.hireProbability}%
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Confidence</span>
              <span className={`font-medium ${getConfidenceColor(prediction.prediction.confidence)}`}>
                {prediction.prediction.confidence}%
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Profile Score</span>
              <span className="font-semibold text-gray-900">{prediction.profileAnalysis.overallScore}/100</span>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-2">No prediction available</p>
            <button
              onClick={generatePrediction}
              className="text-sm text-purple-600 hover:text-purple-700 font-medium"
            >
              Analyze Candidate
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-pink-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Brain className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">AI Hire Prediction</h3>
              <p className="text-xs text-gray-500">
                {prediction?.candidateName || 'Candidate Analysis'}
                {prediction?.jobTitle && ` • ${prediction.jobTitle}`}
              </p>
            </div>
          </div>
          <button
            onClick={fetchPrediction}
            disabled={isLoading}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="flex items-center space-x-2 text-gray-500">
              <div className="w-5 h-5 border-2 border-gray-300 border-t-purple-500 rounded-full animate-spin" />
              <span>Analyzing candidate profile...</span>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <AlertTriangle className="w-10 h-10 mx-auto mb-2 text-red-400" />
            <p className="text-red-600">{error}</p>
            <button
              onClick={generatePrediction}
              className="mt-3 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Generate Prediction
            </button>
          </div>
        ) : prediction ? (
          <div className="space-y-6">
            {/* Main Prediction */}
            <div className={`p-6 rounded-lg border-2 ${getProbabilityBg(prediction.prediction.hireProbability)}`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="text-center md:text-left">
                  <p className="text-sm text-gray-600 mb-1">Hire Probability</p>
                  <p className={`text-5xl font-bold ${getProbabilityColor(prediction.prediction.hireProbability)}`}>
                    {prediction.prediction.hireProbability}%
                  </p>
                  <p className={`text-sm mt-1 ${getConfidenceColor(prediction.prediction.confidence)}`}>
                    {prediction.prediction.confidence}% confidence
                  </p>
                </div>
                <div className="flex-1 max-w-xs">
                  <ResponsiveContainer width="100%" height={100}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Probability', value: prediction.prediction.hireProbability },
                          { name: 'Remaining', value: 100 - prediction.prediction.hireProbability },
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={45}
                        startAngle={90}
                        endAngle={-270}
                        dataKey="value"
                      >
                        <Cell fill={prediction.prediction.hireProbability >= 60 ? '#10B981' : prediction.prediction.hireProbability >= 40 ? '#F59E0B' : '#EF4444'} />
                        <Cell fill="#E5E7EB" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
              {(['overview', 'factors', 'recommendations'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                    activeTab === tab
                      ? 'bg-white text-purple-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {/* Profile Analysis */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div className="p-3 bg-blue-50 rounded-lg text-center">
                    <Target className="w-5 h-5 mx-auto mb-1 text-blue-600" />
                    <p className="text-xl font-bold text-gray-900">{prediction.profileAnalysis.overallScore}</p>
                    <p className="text-xs text-gray-500">Overall</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg text-center">
                    <Award className="w-5 h-5 mx-auto mb-1 text-green-600" />
                    <p className="text-xl font-bold text-gray-900">{prediction.profileAnalysis.skillMatch}%</p>
                    <p className="text-xs text-gray-500">Skills</p>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg text-center">
                    <Briefcase className="w-5 h-5 mx-auto mb-1 text-purple-600" />
                    <p className="text-xl font-bold text-gray-900">{prediction.profileAnalysis.experienceMatch}%</p>
                    <p className="text-xs text-gray-500">Experience</p>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-lg text-center">
                    <GraduationCap className="w-5 h-5 mx-auto mb-1 text-amber-600" />
                    <p className="text-xl font-bold text-gray-900">{prediction.profileAnalysis.educationMatch}%</p>
                    <p className="text-xs text-gray-500">Education</p>
                  </div>
                  <div className="p-3 bg-pink-50 rounded-lg text-center">
                    <Star className="w-5 h-5 mx-auto mb-1 text-pink-600" />
                    <p className="text-xl font-bold text-gray-900">{prediction.profileAnalysis.cultureFit}%</p>
                    <p className="text-xs text-gray-500">Culture Fit</p>
                  </div>
                </div>

                {/* Risk Factors */}
                {prediction.riskFactors.length > 0 && (
                  <div className="p-4 bg-red-50 rounded-lg border border-red-100">
                    <h4 className="text-sm font-medium text-red-900 mb-2 flex items-center">
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      Risk Factors
                    </h4>
                    <ul className="space-y-1">
                      {prediction.riskFactors.map((risk, idx) => (
                        <li key={idx} className="flex items-start text-sm text-red-700">
                          <XCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                          {risk}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Similar Profiles */}
                {prediction.prediction.similarProfiles.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Similar Profile Outcomes</h4>
                    <div className="space-y-2">
                      {prediction.prediction.similarProfiles.slice(0, 3).map((profile, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              profile.outcome === 'hired' ? 'bg-green-100' : 'bg-red-100'
                            }`}>
                              {profile.outcome === 'hired' ? (
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              ) : (
                                <XCircle className="w-4 h-4 text-red-600" />
                              )}
                            </div>
                            <span className="text-sm capitalize">{profile.outcome}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500 rounded-full"
                                style={{ width: `${profile.similarity}%` }}
                              />
                            </div>
                            <span className="text-sm text-gray-500">{profile.similarity}% match</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'factors' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={prediction.prediction.factors.map(f => ({
                      subject: f.factor.replace(/_/g, ' ').slice(0, 15),
                      A: f.score,
                      fullMark: 100,
                    }))}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} />
                      <Radar
                        name="Score"
                        dataKey="A"
                        stroke="#8B5CF6"
                        fill="#8B5CF6"
                        fillOpacity={0.3}
                      />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-2">
                  {prediction.prediction.factors.map((factor, idx) => (
                    <motion.div
                      key={factor.factor}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        {getImpactIcon(factor.impact)}
                        <div>
                          <p className="font-medium text-sm capitalize">{factor.factor.replace(/_/g, ' ')}</p>
                          <p className="text-xs text-gray-500">{factor.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="text-xs text-gray-400">Weight: {(factor.weight * 100).toFixed(0)}%</span>
                        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              factor.score >= 70 ? 'bg-green-500' : factor.score >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${factor.score}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium w-8 text-right">{factor.score}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'recommendations' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                {prediction.recommendations.map((rec, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`p-4 rounded-lg border ${getPriorityColor(rec.priority)}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-xs font-medium uppercase tracking-wide opacity-75">{rec.type}</span>
                          <span className="text-xs font-medium capitalize">{rec.priority} Priority</span>
                        </div>
                        <p className="text-sm font-medium">{rec.description}</p>
                        {rec.action && (
                          <p className="text-sm mt-1 opacity-75">Action: {rec.action}</p>
                        )}
                      </div>
                      <ChevronRight className="w-5 h-5 opacity-50" />
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <UserCheck className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500">No prediction available for this candidate</p>
            <button
              onClick={generatePrediction}
              className="mt-3 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Analyze Candidate
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
