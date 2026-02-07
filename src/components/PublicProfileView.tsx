import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  User,
  MapPin,
  Briefcase,
  GraduationCap,
  Star,
  MessageSquare,
  Award,
  Link as LinkIcon,
  Linkedin,
  Globe,
  Github,
  Twitter,
  Calendar,
  CheckCircle,
  Users,
  TrendingUp,
  DollarSign,
  Clock,
  Mail,
  Share2,
  Flag,
  ChevronRight,
  Plus,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react'

const API_BASE_URL = 'http://localhost:3001/api'

interface PublicProfile {
  _id: string
  userId: string
  displayName: string
  headline?: string
  bio?: string
  avatar?: string
  location?: {
    city: string
    country: string
  }
  expertise: string[]
  industries: string[]
  languages: { name: string; proficiency: string }[]
  experience?: {
    years: number
    level: string
    currentRole?: {
      title: string
      company: string
    }
  }
  skills: { name: string; level: string; endorsements: number }[]
  portfolio: {
    _id: string
    title: string
    description?: string
    type: string
    url?: string
  }[]
  socialLinks?: {
    linkedin?: string
    github?: string
    twitter?: string
    website?: string
  }
  rating: {
    average: number
    count: number
    breakdown: { [key: string]: number }
  }
  statistics: {
    totalReferrals: number
    successfulHires: number
    referralSuccessRate: number
    totalEarnings: number
    profileViews: number
    memberSince: string
  }
  mentorship?: {
    isAvailable: boolean
    rate: number
    topics: string[]
  }
  isVerified: boolean
  isFeatured: boolean
}

interface Review {
  _id: string
  reviewerId: {
    name: string
    avatar?: string
  }
  rating: number
  title: string
  content: string
  category: string
  createdAt: string
  helpfulVotes: any[]
}

export default function PublicProfileView({ userId }: { userId: string }) {
  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'portfolio' | 'reviews'>('overview')
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [newReview, setNewReview] = useState({ rating: 5, title: '', content: '' })

  useEffect(() => {
    fetchProfile()
    fetchReviews()
  }, [userId])

  const fetchProfile = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`${API_BASE_URL}/profiles/${userId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setProfile(data.data)
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchReviews = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/profiles/${userId}/reviews`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setReviews(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching reviews:', error)
    }
  }

  const handleSubmitReview = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/profiles/${userId}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...newReview,
          category: 'referrer'
        })
      })
      
      if (response.ok) {
        setShowReviewModal(false)
        setNewReview({ rating: 5, title: '', content: '' })
        fetchReviews()
        fetchProfile()
      }
    } catch (error) {
      console.error('Error submitting review:', error)
    }
  }

  const handleEndorseSkill = async (skillName: string) => {
    try {
      await fetch(`${API_BASE_URL}/profiles/${userId}/skills/${skillName}/endorse`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      fetchProfile()
    } catch (error) {
      console.error('Error endorsing skill:', error)
    }
  }

  const renderStars = (rating: number, size = 'w-4 h-4') => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${size} ${
              star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900">Profile not found</h2>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Cover Image */}
      <div className="h-64 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600">
        <div className="max-w-5xl mx-auto px-4 h-full flex items-end pb-6">
          <div className="flex items-end gap-6">
            {/* Avatar */}
            <div className="w-32 h-32 rounded-2xl bg-white p-1 shadow-xl">
              <div className="w-full h-full rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-4xl font-bold">
                {profile.displayName?.charAt(0) || 'U'}
              </div>
            </div>
            
            {/* Basic Info */}
            <div className="text-white mb-2">
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold">{profile.displayName}</h1>
                {profile.isVerified && (
                  <CheckCircle className="w-6 h-6 text-blue-300" />
                )}
                {profile.isFeatured && (
                  <span className="px-2 py-0.5 bg-yellow-400 text-yellow-900 text-xs font-bold rounded-full">
                    Featured
                  </span>
                )}
              </div>
              <p className="text-white/80 text-lg">{profile.headline}</p>
              <div className="flex items-center gap-4 mt-2 text-sm text-white/70">
                {profile.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {profile.location.city}, {profile.location.country}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Member since {new Date(profile.statistics?.memberSince).getFullYear()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2">
            {/* Stats */}
            <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {profile.statistics?.totalReferrals || 0}
                  </div>
                  <div className="text-sm text-gray-500">Referrals</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {profile.statistics?.successfulHires || 0}
                  </div>
                  <div className="text-sm text-gray-500">Hires</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {profile.statistics?.referralSuccessRate || 0}%
                  </div>
                  <div className="text-sm text-gray-500">Success Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {profile.rating?.average?.toFixed(1) || '0.0'}
                  </div>
                  <div className="text-sm text-gray-500">Rating</div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-xl shadow-sm border mb-6">
              <div className="flex border-b">
                {['overview', 'portfolio', 'reviews'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={`flex-1 px-4 py-3 text-sm font-medium capitalize transition-colors ${
                      activeTab === tab
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="p-6">
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    {/* Bio */}
                    {profile.bio && (
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-2">About</h3>
                        <p className="text-gray-600">{profile.bio}</p>
                      </div>
                    )}

                    {/* Expertise */}
                    {profile.expertise?.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-2">Expertise</h3>
                        <div className="flex flex-wrap gap-2">
                          {profile.expertise.map((exp) => (
                            <span
                              key={exp}
                              className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm"
                            >
                              {exp}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Skills */}
                    {profile.skills?.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-2">Skills</h3>
                        <div className="space-y-2">
                          {profile.skills.map((skill) => (
                            <div
                              key={skill.name}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                            >
                              <div>
                                <span className="font-medium text-gray-900">{skill.name}</span>
                                <span className="text-sm text-gray-500 ml-2">{skill.level}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-sm text-gray-500">
                                  {skill.endorsements} endorsements
                                </span>
                                <button
                                  onClick={() => handleEndorseSkill(skill.name)}
                                  className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded"
                                >
                                  Endorse
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Experience */}
                    {profile.experience && (
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-2">Experience</h3>
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <Briefcase className="w-5 h-5 text-gray-400" />
                            <span className="font-medium text-gray-900">
                              {profile.experience.years} years
                            </span>
                            <span className="text-gray-500">• {profile.experience.level}</span>
                          </div>
                          {profile.experience.currentRole && (
                            <p className="text-gray-600 ml-7">
                              {profile.experience.currentRole.title} at {profile.experience.currentRole.company}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Languages */}
                    {profile.languages?.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-2">Languages</h3>
                        <div className="flex flex-wrap gap-2">
                          {profile.languages.map((lang) => (
                            <span
                              key={lang.name}
                              className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                            >
                              {lang.name} ({lang.proficiency})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'portfolio' && (
                  <div className="space-y-4">
                    {profile.portfolio?.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">No portfolio items yet</p>
                    ) : (
                      profile.portfolio.map((item) => (
                        <div
                          key={item._id}
                          className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-semibold text-gray-900">{item.title}</h4>
                              <span className="text-xs text-gray-500 uppercase">{item.type}</span>
                              {item.description && (
                                <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                              )}
                            </div>
                            {item.url && (
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-700"
                              >
                                <LinkIcon className="w-5 h-5" />
                              </a>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {activeTab === 'reviews' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">Reviews</h3>
                        <p className="text-sm text-gray-500">
                          {profile.rating?.count || 0} reviews • {profile.rating?.average?.toFixed(1) || '0.0'} average
                        </p>
                      </div>
                      <button
                        onClick={() => setShowReviewModal(true)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Write a Review
                      </button>
                    </div>

                    {reviews.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">No reviews yet</p>
                    ) : (
                      reviews.map((review) => (
                        <div key={review._id} className="p-4 border border-gray-200 rounded-lg">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium">
                                {review.reviewerId?.name?.charAt(0) || 'U'}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{review.reviewerId?.name}</p>
                                <p className="text-sm text-gray-500">
                                  {new Date(review.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            {renderStars(review.rating)}
                          </div>
                          <h4 className="font-medium text-gray-900 mb-1">{review.title}</h4>
                          <p className="text-gray-600 text-sm">{review.content}</p>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Actions */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              {profile.mentorship?.isAvailable ? (
                <div className="space-y-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Mentorship Rate</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {profile.mentorship.rate > 0 ? `$${profile.mentorship.rate}/hr` : 'Free'}
                    </p>
                  </div>
                  <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    Request Mentorship
                  </button>
                </div>
              ) : (
                <button className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                  Send Message
                </button>
              )}
              
              <div className="flex gap-2 mt-3">
                <button className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <Share2 className="w-4 h-4 mx-auto" />
                </button>
                <button className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <Flag className="w-4 h-4 mx-auto" />
                </button>
              </div>
            </div>

            {/* Social Links */}
            {profile.socialLinks && Object.values(profile.socialLinks).some(Boolean) && (
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Connect</h3>
                <div className="space-y-2">
                  {profile.socialLinks.linkedin && (
                    <a
                      href={profile.socialLinks.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg"
                    >
                      <Linkedin className="w-5 h-5 text-blue-600" />
                      <span className="text-gray-700">LinkedIn</span>
                    </a>
                  )}
                  {profile.socialLinks.github && (
                    <a
                      href={profile.socialLinks.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg"
                    >
                      <Github className="w-5 h-5 text-gray-900" />
                      <span className="text-gray-700">GitHub</span>
                    </a>
                  )}
                  {profile.socialLinks.twitter && (
                    <a
                      href={profile.socialLinks.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg"
                    >
                      <Twitter className="w-5 h-5 text-blue-400" />
                      <span className="text-gray-700">Twitter</span>
                    </a>
                  )}
                  {profile.socialLinks.website && (
                    <a
                      href={profile.socialLinks.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg"
                    >
                      <Globe className="w-5 h-5 text-green-600" />
                      <span className="text-gray-700">Website</span>
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Rating Breakdown */}
            {profile.rating?.breakdown && (
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Rating Breakdown</h3>
                <div className="space-y-2">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = profile.rating.breakdown[star] || 0
                    const percentage = profile.rating.count > 0 
                      ? (count / profile.rating.count) * 100 
                      : 0
                    return (
                      <div key={star} className="flex items-center gap-2">
                        <span className="text-sm text-gray-600 w-3">{star}</span>
                        <Star className="w-4 h-4 text-gray-300" />
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-yellow-400 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-500 w-8 text-right">{count}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-xl max-w-lg w-full"
          >
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Write a Review</h2>
              <p className="text-sm text-gray-500">Share your experience with {profile.displayName}</p>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setNewReview({ ...newReview, rating: star })}
                      className="p-1"
                    >
                      <Star
                        className={`w-8 h-8 ${
                          star <= newReview.rating
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={newReview.title}
                  onChange={(e) => setNewReview({ ...newReview, title: e.target.value })}
                  placeholder="Summarize your experience"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Review</label>
                <textarea
                  value={newReview.content}
                  onChange={(e) => setNewReview({ ...newReview, content: e.target.value })}
                  rows={4}
                  placeholder="Tell others about your experience..."
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>

            <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setShowReviewModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitReview}
                disabled={!newReview.title || !newReview.content}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Submit Review
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}