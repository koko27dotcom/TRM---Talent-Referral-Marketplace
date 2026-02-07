import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Clock, Calendar, AlertTriangle, CheckCircle,
  TrendingUp, TrendingDown, Minus, RefreshCw,
  Briefcase, MapPin, DollarSign,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'

interface HiringVelocityData {
  jobId: string
  jobTitle?: string
  prediction: {
    estimatedDays: number
    minDays: number
    maxDays: number
    confidence: number
    factors: Array<{
      factor: string
      impact: string
      daysImpact: number
      description: string
    }>
  }
  timeline: {
    sourcingDays: number
    screeningDays: number
    interviewDays: number
    decisionDays: number
    offerDays: number
  }
  expectedFillDate: string
  marketContext?: {
    marketConditions: string
    candidateSupply: string
  }
}

interface Props {
  jobId?: string
  compact?: boolean
}

const COLORS = {
  positive: '#10B981',
  negative: '#EF4444',
  neutral: '#9CA3AF',
}

export default function HiringVelocityWidget({ jobId, compact = false }: Props) {
  const [data, setData] = useState<HiringVelocityData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'

  useEffect(() => {
    if (jobId) {
      fetchVelocity()
    }
  }, [jobId])

  const fetchVelocity = async () => {
    if (!jobId) return
    
    setIsLoading(true)
    setError(null)

    try {
      const token = localStorage.getItem('token')
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const response = await fetch(`${API_URL}/insights/hiring?jobId=${jobId}`, { headers })

      if (response.ok) {
        const result = await response.json()
        setData(result.data.predictions?.[0] || result.data)
      }
    } catch (err) {
      console.error('Error fetching hiring velocity:', err)
      setError('Failed to load hiring prediction')
    } finally {
      setIsLoading(false)
    }
  }

  const generatePrediction = async () => {
    if (!jobId) return
    
    setIsLoading(true)
    try {
      const token = localStorage.getItem('token')
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const response = await fetch(`${API_URL}/insights/hiring/predict`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ jobId }),
      })

      if (response.ok) {
        const result = await response.json()
        setData(result.data)
      }
    } catch (err) {
      console.error('Error generating prediction:', err)
      setError('Failed to generate prediction')
    } finally {
      setIsLoading(false)
    }
  }

  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case 'positive':
        return <TrendingUp className="w-4 h-4 text-green-500" />
      case 'negative':
        return <TrendingDown className="w-4 h-4 text-red-500" />
      default:
        return <Minus className="w-4 h-4 text-gray-400" />
    }
  }

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'positive':
        return 'text-green-600 bg-green-50'
      case 'negative':
        return 'text-red-600 bg-red-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600'
    if (confidence >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    })
  }

  const timelineData = data ? [
    { name: 'Sourcing', days: data.timeline.sourcingDays, color: '#3B82F6' },
    { name: 'Screening', days: data.timeline.screeningDays, color: '#10B981' },
    { name: 'Interview', days: data.timeline.interviewDays, color: '#8B5CF6' },
    { name: 'Decision', days: data.timeline.decisionDays, color: '#F59E0B' },
    { name: 'Offer', days: data.timeline.offerDays, color: '#EF4444' },
  ] : []

  if (compact) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
        {isLoading ? (
          <div className="flex items-center justify-center h-20">
            <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : data ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-blue-600" />
                <span className="font-semibold text-gray-900">{data.prediction.estimatedDays} days</span>
              </div>
              <span className={`text-sm font-medium ${getConfidenceColor(data.prediction.confidence)}`}>
                {data.prediction.confidence}% confidence
              </span>
            </div>
            <div className="flex items-center text-sm text-gray-500">
              <Calendar className="w-4 h-4 mr-1" />
              Expected fill: {formatDate(data.expectedFillDate)}
            </div>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-2">No prediction available</p>
            {jobId && (
              <button
                onClick={generatePrediction}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Generate Prediction
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-blue-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Clock className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Hiring Velocity</h3>
              <p className="text-xs text-gray-500">AI-powered time-to-fill prediction</p>
            </div>
          </div>
          <button
            onClick={jobId ? fetchVelocity : undefined}
            disabled={isLoading || !jobId}
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
              <span>Analyzing hiring data...</span>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <AlertTriangle className="w-10 h-10 mx-auto mb-2 text-red-400" />
            <p className="text-red-600">{error}</p>
            {jobId && (
              <button
                onClick={generatePrediction}
                className="mt-3 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Generate Prediction
              </button>
            )}
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* Main Prediction */}
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">Estimated Time to Fill</p>
              <p className="text-4xl font-bold text-purple-600">
                {data.prediction.estimatedDays}
                <span className="text-lg text-gray-500 ml-1">days</span>
              </p>
              <div className="flex items-center justify-center mt-2 space-x-4 text-sm">
                <span className="text-gray-500">
                  Range: {data.prediction.minDays}-{data.prediction.maxDays} days
                </span>
                <span className={`font-medium ${getConfidenceColor(data.prediction.confidence)}`}>
                  {data.prediction.confidence}% confidence
                </span>
              </div>
              <div className="flex items-center justify-center mt-2 text-sm text-gray-500">
                <Calendar className="w-4 h-4 mr-1" />
                Expected fill date: <span className="font-medium text-gray-700 ml-1">{formatDate(data.expectedFillDate)}</span>
              </div>
            </div>

            {/* Timeline Chart */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Hiring Stage Breakdown</h4>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={timelineData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
                    <XAxis type="number" stroke="#9CA3AF" />
                    <YAxis dataKey="name" type="category" width={80} stroke="#9CA3AF" />
                    <Tooltip />
                    <Bar dataKey="days" radius={[0, 4, 4, 0]}>
                      {timelineData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Factors */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Impact Factors</h4>
              <div className="space-y-2">
                {data.prediction.factors.slice(0, 4).map((factor, index) => (
                  <motion.div
                    key={factor.factor}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`flex items-center justify-between p-3 rounded-lg ${getImpactColor(factor.impact)}`}
                  >
                    <div className="flex items-center space-x-3">
                      {getImpactIcon(factor.impact)}
                      <div>
                        <p className="font-medium text-sm capitalize">{factor.factor.replace(/_/g, ' ')}</p>
                        <p className="text-xs opacity-75">{factor.description}</p>
                      </div>
                    </div>
                    <span className={`font-semibold text-sm ${
                      factor.daysImpact < 0 ? 'text-green-600' : factor.daysImpact > 0 ? 'text-red-600' : ''
                    }`}>
                      {factor.daysImpact > 0 ? '+' : ''}{factor.daysImpact}d
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Market Context */}
            {data.marketContext && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <h4 className="text-sm font-medium text-blue-900 mb-2">Market Context</h4>
                <div className="flex space-x-4 text-sm">
                  <span className="text-blue-700">
                    Conditions: <span className="font-medium capitalize">{data.marketContext.marketConditions}</span>
                  </span>
                  <span className="text-blue-700">
                    Supply: <span className="font-medium capitalize">{data.marketContext.candidateSupply}</span>
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <Briefcase className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500">No hiring velocity data available</p>
            {jobId && (
              <button
                onClick={generatePrediction}
                className="mt-3 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Generate Prediction
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
