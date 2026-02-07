import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  MapPin,
  DollarSign,
  Briefcase,
  TrendingUp,
  Eye,
  Clock,
  Crown,
  Star,
  Zap,
  Building2
} from 'lucide-react'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

interface FeaturedJob {
  slot: {
    id: string
    position: number
    bidAmount: number
    daysRemaining: number
  }
  job: {
    id: string
    title: string
    slug: string
    location: {
      city: string
      type: string
    }
    type: string
    salary: {
      min?: number
      max?: number
      currency: string
      period: string
    }
    category: string
    company: {
      _id: string
      name: string
      slug: string
      logo?: string
      industry?: string
    }
    referralBonus: number
    featuredPriority: number
  }
}

interface FeaturedJobsCarouselProps {
  className?: string
  autoPlay?: boolean
  autoPlayInterval?: number
}

export default function FeaturedJobsCarousel({
  className = '',
  autoPlay = true,
  autoPlayInterval = 5000,
}: FeaturedJobsCarouselProps) {
  const [featuredJobs, setFeaturedJobs] = useState<FeaturedJob[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isPaused, setIsPaused] = useState(false)

  // Fetch featured jobs
  useEffect(() => {
    const fetchFeaturedJobs = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/v1/featured-jobs?limit=10`)
        const data = await response.json()
        
        if (data.success) {
          setFeaturedJobs(data.data.featuredJobs)
        } else {
          setError('Failed to load featured jobs')
        }
      } catch (err) {
        setError('Failed to load featured jobs')
        console.error('Error fetching featured jobs:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchFeaturedJobs()
  }, [])

  // Auto-play carousel
  useEffect(() => {
    if (!autoPlay || isPaused || featuredJobs.length <= 1) return

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % featuredJobs.length)
    }, autoPlayInterval)

    return () => clearInterval(interval)
  }, [autoPlay, autoPlayInterval, featuredJobs.length, isPaused])

  // Track view when job is shown
  useEffect(() => {
    if (featuredJobs[currentIndex]) {
      trackView(featuredJobs[currentIndex].slot.id)
    }
  }, [currentIndex, featuredJobs])

  const trackView = async (slotId: string) => {
    try {
      await fetch(`${API_BASE_URL}/v1/featured-jobs/${slotId}/track/view`, {
        method: 'POST',
      })
    } catch (err) {
      // Silent fail for tracking
    }
  }

  const trackClick = async (slotId: string) => {
    try {
      await fetch(`${API_BASE_URL}/v1/featured-jobs/${slotId}/track/click`, {
        method: 'POST',
      })
    } catch (err) {
      // Silent fail for tracking
    }
  }

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + featuredJobs.length) % featuredJobs.length)
  }, [featuredJobs.length])

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % featuredJobs.length)
  }, [featuredJobs.length])

  const goToSlide = (index: number) => {
    setCurrentIndex(index)
  }

  if (loading) {
    return (
      <div className={`relative h-[400px] bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 rounded-2xl overflow-hidden ${className}`}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        </div>
      </div>
    )
  }

  if (error || featuredJobs.length === 0) {
    return null // Don't show carousel if no featured jobs
  }

  const currentJob = featuredJobs[currentIndex]

  const getPositionBadge = (position: number) => {
    if (position === 1) return { icon: Crown, color: 'text-yellow-400', bg: 'bg-yellow-400/20', label: '#1 Top Pick' }
    if (position === 2) return { icon: Star, color: 'text-blue-400', bg: 'bg-blue-400/20', label: '#2 Featured' }
    if (position === 3) return { icon: Star, color: 'text-purple-400', bg: 'bg-purple-400/20', label: '#3 Featured' }
    return { icon: Sparkles, color: 'text-emerald-400', bg: 'bg-emerald-400/20', label: `Featured` }
  }

  const formatSalary = (salary: FeaturedJob['job']['salary']) => {
    if (!salary || (!salary.min && !salary.max)) return 'Negotiable'
    const currency = salary.currency || 'MMK'
    if (salary.min && salary.max) {
      return `${salary.min.toLocaleString()} - ${salary.max.toLocaleString()} ${currency}`
    } else if (salary.min) {
      return `From ${salary.min.toLocaleString()} ${currency}`
    } else {
      return `Up to ${salary.max?.toLocaleString()} ${currency}`
    }
  }

  const positionBadge = getPositionBadge(currentJob.slot.position)

  return (
    <div
      className={`relative bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 rounded-2xl overflow-hidden ${className}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)`,
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      {/* Animated Gradient Orbs */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute top-0 right-0 w-96 h-96 bg-blue-500/30 rounded-full blur-3xl"
      />
      <motion.div
        animate={{
          scale: [1.2, 1, 1.2],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/30 rounded-full blur-3xl"
      />

      {/* Content */}
      <div className="relative z-10 p-8 md:p-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Featured Opportunities</h2>
              <p className="text-sm text-white/60">Premium positions from top companies</p>
            </div>
          </div>
          
          {/* Navigation Arrows */}
          <div className="flex items-center gap-2">
            <button
              onClick={goToPrevious}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              aria-label="Previous job"
            >
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={goToNext}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              aria-label="Next job"
            >
              <ChevronRight className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Job Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentJob.slot.id}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="grid md:grid-cols-2 gap-8 items-center"
          >
            {/* Left: Job Info */}
            <div>
              {/* Position Badge */}
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${positionBadge.bg} mb-4`}>
                <positionBadge.icon className={`w-4 h-4 ${positionBadge.color}`} />
                <span className={`text-sm font-semibold ${positionBadge.color}`}>
                  {positionBadge.label}
                </span>
              </div>

              {/* Job Title */}
              <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">
                {currentJob.job.title}
              </h3>

              {/* Company */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                  {currentJob.job.company.logo ? (
                    <img
                      src={currentJob.job.company.logo}
                      alt={currentJob.job.company.name}
                      className="w-8 h-8 object-contain"
                    />
                  ) : (
                    <Building2 className="w-6 h-6 text-white/60" />
                  )}
                </div>
                <div>
                  <p className="text-white font-semibold">{currentJob.job.company.name}</p>
                  <p className="text-white/60 text-sm">{currentJob.job.company.industry || 'Company'}</p>
                </div>
              </div>

              {/* Job Details */}
              <div className="flex flex-wrap gap-3 mb-6">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-lg">
                  <MapPin className="w-4 h-4 text-white/60" />
                  <span className="text-white text-sm">{currentJob.job.location?.city || 'Remote'}</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-lg">
                  <Briefcase className="w-4 h-4 text-white/60" />
                  <span className="text-white text-sm">{currentJob.job.type}</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-lg">
                  <DollarSign className="w-4 h-4 text-white/60" />
                  <span className="text-white text-sm">{formatSalary(currentJob.job.salary)}</span>
                </div>
              </div>

              {/* CTA Button */}
              <Link
                to={`/job/${currentJob.job.id}`}
                onClick={() => trackClick(currentJob.slot.id)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg shadow-blue-500/25"
              >
                View Position
                <ChevronRight className="w-5 h-5" />
              </Link>
            </div>

            {/* Right: Stats & Referral Bonus */}
            <div className="space-y-4">
              {/* Referral Bonus Card */}
              {currentJob.job.referralBonus > 0 && (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="p-6 bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-2xl"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-green-500/20 rounded-lg">
                      <Zap className="w-5 h-5 text-green-400" />
                    </div>
                    <span className="text-green-400 font-semibold">Referral Bonus</span>
                  </div>
                  <p className="text-3xl font-bold text-white">
                    {currentJob.job.referralBonus.toLocaleString()} MMK
                  </p>
                  <p className="text-white/60 text-sm mt-1">
                    Earn by referring a successful candidate
                  </p>
                </motion.div>
              )}

              {/* Slot Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white/5 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Eye className="w-4 h-4 text-blue-400" />
                    <span className="text-white/60 text-sm">Featured Views</span>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {currentJob.slot.bidAmount.toLocaleString()} MMK
                  </p>
                  <p className="text-white/40 text-xs mt-1">Investment</p>
                </div>
                <div className="p-4 bg-white/5 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-purple-400" />
                    <span className="text-white/60 text-sm">Time Remaining</span>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {currentJob.slot.daysRemaining} days
                  </p>
                  <p className="text-white/40 text-xs mt-1">Featured period</p>
                </div>
              </div>

              {/* Category Tag */}
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-white/10 text-white/80 text-sm rounded-full">
                  {currentJob.job.category}
                </span>
                <span className="px-3 py-1 bg-blue-500/20 text-blue-400 text-sm rounded-full">
                  Premium Listing
                </span>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Pagination Dots */}
        <div className="flex items-center justify-center gap-2 mt-8">
          {featuredJobs.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`transition-all duration-300 rounded-full ${
                index === currentIndex
                  ? 'w-8 h-2 bg-white'
                  : 'w-2 h-2 bg-white/30 hover:bg-white/50'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>

        {/* View All Link */}
        <div className="text-center mt-6">
          <Link
            to="/jobs?featured=true"
            className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm"
          >
            View all featured positions
            <TrendingUp className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
