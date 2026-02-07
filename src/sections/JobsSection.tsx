import { motion } from 'framer-motion'
import { MapPin, DollarSign, Clock, ArrowRight, Flame, Gift, Sparkles, Crown, Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Job } from '../App'
import FeaturedJobsCarousel from '../components/FeaturedJobsCarousel'

interface JobsSectionProps {
  jobs: Job[]
  showFeaturedCarousel?: boolean
}

export default function JobsSection({ jobs, showFeaturedCarousel = true }: JobsSectionProps) {
  // Sort jobs: featured first, then urgent, then by date
  const sortedJobs = [...jobs].sort((a, b) => {
    // Featured jobs first
    if (a.featured && !b.featured) return -1
    if (!a.featured && b.featured) return 1
    
    // Then urgent jobs
    if (a.urgent && !b.urgent) return -1
    if (!a.urgent && b.urgent) return 1
    
    return 0
  })

  const featuredCount = jobs.filter(j => j.featured).length
  const urgentCount = jobs.filter(j => j.urgent).length

  return (
    <section className="max-w-7xl mx-auto px-4 py-16">
      {/* Featured Jobs Carousel */}
      {showFeaturedCarousel && (
        <div className="mb-12">
          <FeaturedJobsCarousel />
        </div>
      )}

      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-800">Available Positions</h2>
          <div className="flex items-center gap-4 mt-2">
            <span className="text-slate-500">{jobs.length} jobs found</span>
            {featuredCount > 0 && (
              <span className="flex items-center gap-1 text-sm text-yellow-600">
                <Sparkles className="w-4 h-4" />
                {featuredCount} featured
              </span>
            )}
            {urgentCount > 0 && (
              <span className="flex items-center gap-1 text-sm text-red-600">
                <Flame className="w-4 h-4" />
                {urgentCount} urgent
              </span>
            )}
          </div>
        </div>
        
        {/* Filter/Sort Controls */}
        <div className="flex items-center gap-2">
          <Link
            to="/jobs?featured=true"
            className="flex items-center gap-2 px-4 py-2 bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 transition-colors text-sm font-medium"
          >
            <Sparkles className="w-4 h-4" />
            Featured Only
          </Link>
          <Link
            to="/jobs?urgent=true"
            className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
          >
            <Flame className="w-4 h-4" />
            Urgent Only
          </Link>
        </div>
      </div>

      {/* Jobs Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedJobs.map((job, index) => (
          <JobCard key={job.id} job={job} index={index} />
        ))}
      </div>
    </section>
  )
}

interface JobCardProps {
  job: Job
  index: number
}

function JobCard({ job, index }: JobCardProps) {
  // Featured job styling
  const isFeatured = job.featured
  const isUrgent = job.urgent
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -8 }}
      className={`group relative rounded-2xl border overflow-hidden hover:shadow-2xl transition-all duration-300 ${
        isFeatured
          ? 'bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-300 shadow-yellow-200'
          : 'bg-white border-slate-200'
      }`}
    >
      {/* Featured Badge */}
      {isFeatured && (
        <div className="absolute top-4 right-4 z-10">
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold rounded-full shadow-lg">
            <Crown size={12} /> FEATURED
          </span>
        </div>
      )}
      
      {/* Urgent Badge */}
      {isUrgent && !isFeatured && (
        <div className="absolute top-4 right-4 z-10">
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-full shadow-lg">
            <Flame size={12} /> URGENT
          </span>
        </div>
      )}
      
      {/* Referral Bonus Badge */}
      {job.referralBonus && (
        <div className="absolute top-4 left-4 z-10">
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xs font-bold rounded-full shadow-lg">
            <Gift size={12} /> {job.referralBonus}
          </span>
        </div>
      )}
      
      {/* Featured Priority Indicator */}
      {isFeatured && job.featuredPriority && job.featuredPriority <= 3 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/90 backdrop-blur text-yellow-700 text-xs font-bold rounded-full shadow-sm">
            <Star size={10} className="fill-yellow-500 text-yellow-500" />
            Top {job.featuredPriority}
          </span>
        </div>
      )}

      <Link to={`/job/${job.id}`} className="block p-6 relative">
        <div className="flex items-start gap-4 mb-4">
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg group-hover:scale-110 transition-transform ${
            isFeatured
              ? 'bg-gradient-to-br from-yellow-400 to-orange-500'
              : 'bg-gradient-to-br from-blue-500 to-purple-600'
          }`}>
            {job.company[0]}
          </div>
          <div className="flex-1 pt-1">
            <h3 className={`font-bold text-lg transition-colors line-clamp-1 ${
              isFeatured ? 'text-slate-900 group-hover:text-yellow-600' : 'text-slate-800 group-hover:text-blue-600'
            }`}>
              {job.title}
            </h3>
            <p className="text-slate-500 text-sm">{job.company}</p>
            {isFeatured && (
              <p className="text-xs text-yellow-600 mt-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Premium Listing
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${
            isFeatured
              ? 'bg-yellow-100 text-yellow-700'
              : 'bg-blue-50 text-blue-700'
          }`}>
            {job.category}
          </span>
          <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium">
            {job.type}
          </span>
          {isFeatured && (
            <span className="px-3 py-1 bg-gradient-to-r from-yellow-400/20 to-orange-400/20 text-yellow-700 rounded-lg text-xs font-medium flex items-center gap-1">
              <Star className="w-3 h-3" />
              Featured
            </span>
          )}
        </div>

        <div className="space-y-2 mb-4 text-sm text-slate-600">
          <div className="flex items-center gap-2">
            <MapPin size={16} className="text-slate-400" />
            <span>{job.location}</span>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign size={16} className="text-slate-400" />
            <span className="font-semibold text-green-600">{job.salary}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-slate-400" />
            <span>{job.posted}</span>
          </div>
        </div>

        <div className={`flex items-center justify-between pt-4 border-t ${
          isFeatured ? 'border-yellow-200' : 'border-slate-100'
        }`}>
          <span className="text-xs text-slate-500">
            {job.requirements.length} requirements
          </span>
          <span className={`flex items-center gap-1 font-semibold text-sm group-hover:gap-2 transition-all ${
            isFeatured ? 'text-yellow-600' : 'text-blue-600'
          }`}>
            Details <ArrowRight size={16} />
          </span>
        </div>
      </Link>
    </motion.div>
  )
}
