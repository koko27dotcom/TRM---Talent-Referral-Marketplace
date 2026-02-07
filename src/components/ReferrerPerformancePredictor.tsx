import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Users, Star, TrendingUp, Award, Target,
  RefreshCw, AlertTriangle, CheckCircle, Clock,
  UserCheck, Briefcase, DollarSign, Percent,
  ChevronRight, Filter,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Radar, Cell,
} from 'recharts'

interface ReferrerPrediction {
  referrerId: string
  referrerName?: string
  referrerEmail?: string
  prediction: {
    successProbability: number
    predictedReferrals: number
    predictedHires: number
    predictedRevenue: number
    confidence: number
    factors: Array<{
      factor: string
      impact: string
      score: number
      description: string
    }>
  }
  tierPrediction: {
    predictedTier: string
    probability: number
    recommendedActions: string[]
  }
  performanceScore: {
    overall: number
    quality: number
    velocity: number
    engagement: number
    network: number
  }
}

interface Props {
  referrerId?: string
  compact?: boolean
  limit?: number
}

const COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444']

export default function ReferrerPerformancePredictor({ 
  referrerId, 
  compact = false,
  limit = 10 
}: Props) {
  const [predictions, setPredictions] = useState<ReferrerPrediction[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedTier, setSelectedTier] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('score')

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'

  useEffect(() => {
    if (referrerId) {
      fetchSinglePrediction()
    } else {
      fetchTopReferrers()
    }
  }, [referrerId, selectedTier, sortBy])

  const fetchSinglePrediction = async () => {
    if (!referrerId) return
    
    setIsLoading(true)
    setError(null)

    try {
      const token = localStorage.getItem('token')
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const response = await fetch(`${API_URL}/insights/referrers/${referrerId}`, { headers })

      if (response.ok) {
        const result = await response.json()
        setPredictions([result.data])
      }
    } catch (err) {
      console.error('Error fetching referrer prediction:', err)
      setError('Failed to load prediction')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchTopReferrers = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const token = localStorage.getItem('token')
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const params = new URLSearchParams({
        limit: limit.toString(),
        ...(selectedTier !== 'all' && { tier: selectedTier }),
        sort: sortBy,
      })

      const response = await fetch(`${API_URL}/insights/referrers?${params}`, { headers })

      if (response.ok) {
        const result = await response.json()
        setPredictions(result.data.predictions || [])
      }
    } catch (err) {
      console.error('Error fetching top referrers:', err)
      setError('Failed to load referrer predictions')
    } finally {
      setIsLoading(false)
    }
  }

  const generatePrediction = async (targetReferrerId: string) => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem('token')
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const response = await fetch(`${API_URL}/insights/referrers/predict`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ referrerId: targetReferrerId }),
      })

      if (response.ok) {
        const result = await response.json()
        if (referrerId) {
          setPredictions([result.data])
        } else {
          fetchTopReferrers()
        }
      }
    } catch (err) {
      console.error('Error generating prediction:', err)
      setError('Failed to generate prediction')
    } finally {
      setIsLoading(false)
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600'
    if (confidence >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getSuccessColor = (probability: number) => {
    if (probability >= 80) return 'bg-green-500'
    if (probability >= 60) return 'bg-blue-500'
    if (probability >= 40) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const getTierColor = (tier: string) => {
    switch (tier.toLowerCase()) {
      case 'platinum':
        return 'text-purple-600 bg-purple-50 border-purple-200'
      case 'gold':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'silver':
        return 'text-gray-600 bg-gray-50 border-gray-200'
      case 'bronze':
        return 'text-orange-600 bg-orange-50 border-orange-200'
      default:
        return 'text-blue-600 bg-blue-50 border-blue-200'
    }
  }

  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case 'positive':
        return <TrendingUp className="w-4 h-4 text-green-500" />
      case 'negative':
        return <TrendingUp className="w-4 h-4 text-red-500 rotate-180" />
      default:
        return <CheckCircle className="w-4 h-4 text-gray-400" />
    }
  }

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `K${(value / 1000000).toFixed(1)}M`
    }
    if (value >= 1000) {
      return `K${(value / 1000).toFixed(0)}K`
    }
    return `K${value}`
  }

  if (compact) {
    const topReferrer = predictions[0]
    return (
      <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
        {isLoading ? (
          <div className="flex items-center justify-center h-20">
            <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : topReferrer ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Star className="w-5 h-5 text-yellow-500" />
                <span className="font-semibold text-gray-900 truncate">
                  {topReferrer.referrerName || 'Top Referrer'}
                </span>
              </div>
              <span className={`text-sm font-medium ${getConfidenceColor(topReferrer.prediction.confidence)}`}>
                {topReferrer.prediction.confidence}% confidence
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Success Rate</span>
              <span className="font-semibold text-gray-900">
                {topReferrer.prediction.successProbability}%
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Predicted Revenue</span>
              <span className="font-semibold text-green-600">
                {formatCurrency(topReferrer.prediction.predictedRevenue)}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-center text-sm text-gray-500">No predictions available</div>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-amber-50 to-orange-50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Award className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Referrer Performance Predictor</h3>
              <p className="text-xs text-gray-500">AI-powered referrer success predictions</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {!referrerId && (
              <>
                <select
                  value={selectedTier}
                  onChange={(e) => setSelectedTier(e.target.value)}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  <option value="all">All Tiers</option>
                  <option value="platinum">Platinum</option>
                  <option value="gold">Gold</option>
                  <option value="silver">Silver</option>
                  <option value="bronze">Bronze</option>
                </select>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  <option value="score">By Score</option>
                  <option value="revenue">By Revenue</option>
                  <option value="hires">By Hires</option>
                </select>
              </>
            )}
            <button
              onClick={referrerId ? () => fetchSinglePrediction() : fetchTopReferrers}
              disabled={isLoading}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="flex items-center space-x-2 text-gray-500">
              <div className="w-5 h-5 border-2 border-gray-300 border-t-amber-500 rounded-full animate-spin" />
              <span>Analyzing referrer data...</span>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <AlertTriangle className="w-10 h-10 mx-auto mb-2 text-red-400" />
            <p className="text-red-600">{error}</p>
            {referrerId && (
              <button
                onClick={() => generatePrediction(referrerId)}
                className="mt-3 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
              >
                Generate Prediction
              </button>
            )}
          </div>
        ) : predictions.length > 0 ? (
          <div className="space-y-6">
            {predictions.map((prediction, index) => (
              <motion.div
                key={prediction.referrerId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="border border-gray-100 rounded-lg overflow-hidden"
              >
                {/* Referrer Header */}
                <div className="p-4 bg-gray-50 border-b border-gray-100">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">
                          {prediction.referrerName || 'Anonymous Referrer'}
                        </h4>
                        <p className="text-sm text-gray-500">{prediction.referrerEmail}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getTierColor(prediction.tierPrediction.predictedTier)}`}>
                        {prediction.tierPrediction.predictedTier}
                      </span>
                      <span className={`text-sm font-medium ${getConfidenceColor(prediction.prediction.confidence)}`}>
                        {prediction.prediction.confidence}% confidence
                      </span>
                    </div>
                  </div>
                </div>

                {/* Performance Metrics */}
                <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <Target className="w-5 h-5 mx-auto mb-1 text-blue-600" />
                    <p className="text-2xl font-bold text-gray-900">{prediction.prediction.successProbability}%</p>
                    <p className="text-xs text-gray-500">Success Probability</p>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <Briefcase className="w-5 h-5 mx-auto mb-1 text-green-600" />
                    <p className="text-2xl font-bold text-gray-900">{prediction.prediction.predictedHires}</p>
                    <p className="text-xs text-gray-500">Predicted Hires</p>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <Users className="w-5 h-5 mx-auto mb-1 text-purple-600" />
                    <p className="text-2xl font-bold text-gray-900">{prediction.prediction.predictedReferrals}</p>
                    <p className="text-xs text-gray-500">Predicted Referrals</p>
                  </div>
                  <div className="text-center p-3 bg-amber-50 rounded-lg">
                    <DollarSign className="w-5 h-5 mx-auto mb-1 text-amber-600" />
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(prediction.prediction.predictedRevenue)}</p>
                    <p className="text-xs text-gray-500">Predicted Revenue</p>
                  </div>
                </div>

                {/* Performance Score Radar */}
                <div className="p-4 border-t border-gray-100">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-3">Performance Dimensions</h5>
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart data={[
                            { subject: 'Quality', A: prediction.performanceScore.quality, fullMark: 100 },
                            { subject: 'Velocity', A: prediction.performanceScore.velocity, fullMark: 100 },
                            { subject: 'Engagement', A: prediction.performanceScore.engagement, fullMark: 100 },
                            { subject: 'Network', A: prediction.performanceScore.network, fullMark: 100 },
                            { subject: 'Overall', A: prediction.performanceScore.overall, fullMark: 100 },
                          ]}>
                            <PolarGrid />
                            <PolarAngleAxis dataKey="subject" />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} />
                            <Radar
                              name="Score"
                              dataKey="A"
                              stroke="#F59E0B"
                              fill="#F59E0B"
                              fillOpacity={0.3}
                            />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Success Factors */}
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-3">Key Success Factors</h5>
                      <div className="space-y-2">
                        {prediction.prediction.factors.slice(0, 5).map((factor, idx) => (
                          <div
                            key={factor.factor}
                            className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                          >
                            <div className="flex items-center space-x-2">
                              {getImpactIcon(factor.impact)}
                              <span className="text-sm capitalize">{factor.factor.replace(/_/g, ' ')}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-amber-500 rounded-full"
                                  style={{ width: `${factor.score}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium w-8 text-right">{factor.score}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recommended Actions */}
                {prediction.tierPrediction.recommendedActions.length > 0 && (
                  <div className="p-4 border-t border-gray-100 bg-amber-50">
                    <h5 className="text-sm font-medium text-amber-900 mb-2">Recommended Actions</h5>
                    <ul className="space-y-1">
                      {prediction.tierPrediction.recommendedActions.map((action, idx) => (
                        <li key={idx} className="flex items-start text-sm text-amber-800">
                          <ChevronRight className="w-4 h-4 mr-1 mt-0.5 flex-shrink-0" />
                          {action}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500">No referrer predictions available</p>
            {referrerId && (
              <button
                onClick={() => generatePrediction(referrerId)}
                className="mt-3 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
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
