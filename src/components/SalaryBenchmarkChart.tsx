import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  DollarSign, TrendingUp, MapPin, Briefcase,
  Filter, Download, Info, ChevronDown,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, LineChart, Line,
  ComposedChart, Area,
} from 'recharts'

interface SalaryBenchmarkData {
  jobTitle: string
  experienceLevel: string
  location: string
  baseSalary: {
    min: number
    max: number
    median: number
    average: number
  }
  adjustedSalary: {
    adjustedMin: number
    adjustedMax: number
    adjustedMedian: number
  }
  trend: {
    direction: string
    percentageChange: number
  }
  experienceProgression: Array<{
    experienceLevel: string
    benchmark: {
      median: number
      min: number
      max: number
    } | null
  }>
  locationComparison: Array<{
    location: string
    benchmark: {
      median: number
      min: number
      max: number
    } | null
  }>
}

interface Props {
  jobTitle?: string
  experienceLevel?: string
  location?: string
  skills?: string[]
  compact?: boolean
}

const formatCurrency = (amount: number) => {
  if (!amount) return 'N/A'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'MMK',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount).replace('MMK', 'K')
}

const EXPERIENCE_LEVELS = [
  { value: 'entry', label: 'Entry Level (0-1 years)' },
  { value: 'junior', label: 'Junior (1-3 years)' },
  { value: 'mid', label: 'Mid-Level (3-5 years)' },
  { value: 'senior', label: 'Senior (5-10 years)' },
  { value: 'executive', label: 'Executive (10+ years)' },
]

const LOCATIONS = [
  'Yangon',
  'Mandalay',
  'Naypyitaw',
  'Mawlamyine',
  'Taunggyi',
]

export default function SalaryBenchmarkChart({
  jobTitle: initialJobTitle = 'Software Engineer',
  experienceLevel: initialExperienceLevel = 'mid',
  location: initialLocation = 'Yangon',
  skills = [],
  compact = false,
}: Props) {
  const [jobTitle, setJobTitle] = useState(initialJobTitle)
  const [experienceLevel, setExperienceLevel] = useState(initialExperienceLevel)
  const [location, setLocation] = useState(initialLocation)
  const [data, setData] = useState<SalaryBenchmarkData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [activeView, setActiveView] = useState<'overview' | 'progression' | 'comparison'>('overview')

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'

  useEffect(() => {
    fetchBenchmark()
  }, [jobTitle, experienceLevel, location])

  const fetchBenchmark = async () => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem('token')
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const response = await fetch(
        `${API_URL}/insights/salary?jobTitle=${encodeURIComponent(jobTitle)}&experienceLevel=${experienceLevel}&location=${location}`,
        { headers }
      )

      if (response.ok) {
        const result = await response.json()
        setData(result.data.benchmark)
      }
    } catch (error) {
      console.error('Error fetching salary benchmark:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleExport = () => {
    if (!data) return
    const exportData = {
      jobTitle,
      experienceLevel,
      location,
      salary: data.baseSalary,
      generatedAt: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `salary-benchmark-${jobTitle.replace(/\s+/g, '-').toLowerCase()}.json`
    a.click()
  }

  if (isLoading) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-gray-100 ${compact ? 'p-4' : 'p-8'}`}>
        <div className={`flex items-center justify-center ${compact ? 'h-20' : 'h-64'}`}>
          <div className="flex items-center space-x-2 text-gray-500">
            <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
            {!compact && <span>Loading salary data...</span>}
          </div>
        </div>
      </div>
    )
  }

  if (compact) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
        {data ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Median Salary</span>
              <span className="font-semibold text-gray-900">{formatCurrency(data.baseSalary.median)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Range</span>
              <span className="text-sm text-gray-700">
                {formatCurrency(data.baseSalary.min)} - {formatCurrency(data.baseSalary.max)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Trend</span>
              <div className={`flex items-center ${data.trend.percentageChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {data.trend.percentageChange >= 0 ? (
                  <TrendingUp className="w-4 h-4 mr-1" />
                ) : (
                  <TrendingUp className="w-4 h-4 mr-1 rotate-180" />
                )}
                <span className="text-sm font-medium">
                  {data.trend.percentageChange >= 0 ? '+' : ''}{data.trend.percentageChange.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center text-sm text-gray-500">No data available</div>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Salary Benchmark</h3>
              <p className="text-sm text-gray-500">AI-powered market rate analysis</p>
            </div>
          </div>
          <button
            onClick={handleExport}
            disabled={!data}
            className="mt-4 md:mt-0 flex items-center space-x-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 bg-gray-50 border-b border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
            <input
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g. Software Engineer"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Experience Level</label>
            <select
              value={experienceLevel}
              onChange={(e) => setExperienceLevel(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {EXPERIENCE_LEVELS.map((level) => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      {data ? (
        <div className="p-6">
          {/* View Tabs */}
          <div className="flex space-x-1 mb-6">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'progression', label: 'Career Progression' },
              { id: 'comparison', label: 'Location Comparison' },
            ].map((view) => (
              <button
                key={view.id}
                onClick={() => setActiveView(view.id as typeof activeView)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeView === view.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {view.label}
              </button>
            ))}
          </div>

          {activeView === 'overview' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Salary Range Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-500 mb-1">Minimum</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(data.baseSalary.min)}</p>
                  <p className="text-xs text-gray-400 mt-1">Bottom 25th percentile</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-600 mb-1">Median</p>
                  <p className="text-2xl font-bold text-blue-700">{formatCurrency(data.baseSalary.median)}</p>
                  <p className="text-xs text-blue-400 mt-1">50th percentile</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-500 mb-1">Maximum</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(data.baseSalary.max)}</p>
                  <p className="text-xs text-gray-400 mt-1">Top 75th percentile</p>
                </div>
              </div>

              {/* Visual Range Bar */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Salary Range Distribution</h4>
                <div className="relative h-12 bg-gray-200 rounded-lg overflow-hidden">
                  <div className="absolute inset-y-0 left-0 w-[25%] bg-blue-200" />
                  <div className="absolute inset-y-0 left-[25%] w-[50%] bg-blue-400" />
                  <div className="absolute inset-y-0 right-0 w-[25%] bg-blue-200" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">
                      {formatCurrency(data.baseSalary.min)} - {formatCurrency(data.baseSalary.max)}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between mt-2 text-xs text-gray-500">
                  <span>Min: {formatCurrency(data.baseSalary.min)}</span>
                  <span>Avg: {formatCurrency(data.baseSalary.average)}</span>
                  <span>Max: {formatCurrency(data.baseSalary.max)}</span>
                </div>
              </div>

              {/* Trend Indicator */}
              <div className="flex items-center p-4 bg-gray-50 rounded-lg">
                <TrendingUp className={`w-5 h-5 mr-2 ${
                  data.trend.direction === 'increasing' ? 'text-green-500' : 'text-red-500'
                }`} />
                <span className="text-sm text-gray-700">
                  Salary trend is <span className="font-medium">{data.trend.direction}</span> by{' '}
                  <span className={`font-bold ${
                    data.trend.direction === 'increasing' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {Math.abs(data.trend.percentageChange).toFixed(1)}%
                  </span>{' '}
                  over the last 12 months
                </span>
              </div>
            </motion.div>
          )}

          {activeView === 'progression' && data.experienceProgression && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="h-80"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.experienceProgression.map((item) => ({
                  level: item.experienceLevel.charAt(0).toUpperCase() + item.experienceLevel.slice(1),
                  median: item.benchmark?.median || 0,
                  min: item.benchmark?.min || 0,
                  max: item.benchmark?.max || 0,
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="level" stroke="#9CA3AF" />
                  <YAxis
                    stroke="#9CA3AF"
                    tickFormatter={(value) => `K${(value / 1000).toFixed(0)}`}
                  />
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value))}
                  />
                  <Legend />
                  <Bar dataKey="median" fill="#3B82F6" name="Median Salary" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          )}

          {activeView === 'comparison' && data.locationComparison && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="h-80"
            >
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data.locationComparison.map((item) => ({
                  location: item.location,
                  median: item.benchmark?.median || 0,
                  min: item.benchmark?.min || 0,
                  max: item.benchmark?.max || 0,
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="location" stroke="#9CA3AF" />
                  <YAxis
                    stroke="#9CA3AF"
                    tickFormatter={(value) => `K${(value / 1000).toFixed(0)}`}
                  />
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value))}
                  />
                  <Legend />
                  <Bar dataKey="median" fill="#3B82F6" name="Median" radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="max" stroke="#10B981" name="Max" strokeWidth={2} />
                </ComposedChart>
              </ResponsiveContainer>
            </motion.div>
          )}
        </div>
      ) : (
        <div className="p-8 text-center text-gray-500">
          <Briefcase className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>No salary data available for this criteria</p>
        </div>
      )}
    </div>
  )
}
