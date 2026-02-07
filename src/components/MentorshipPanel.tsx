import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users,
  Search,
  Filter,
  Star,
  MessageSquare,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Target,
  Award,
  ChevronRight,
  Plus,
  Video,
  MapPin,
  Briefcase,
  GraduationCap,
  DollarSign,
  Send,
  MoreHorizontal
} from 'lucide-react'

const API_BASE_URL = 'http://localhost:3001/api'

interface Mentor {
  _id: string
  userId: string
  displayName: string
  headline?: string
  avatar?: string
  expertise: string[]
  industries: string[]
  rating: {
    average: number
    count: number
  }
  mentorship: {
    isAvailable: boolean
    rate: number
    maxMentees: number
    currentMentees: number
    topics: string[]
  }
  statistics: {
    totalReferrals: number
    successfulHires: number
  }
}

interface MentorshipMatch {
  _id: string
  mentorId: {
    _id: string
    name: string
    avatar?: string
  }
  menteeId: {
    _id: string
    name: string
    avatar?: string
  }
  status: 'pending' | 'active' | 'completed' | 'cancelled'
  startDate?: string
  goals: any[]
  sessions: any[]
  messages: any[]
  focusAreas: string[]
}

export default function MentorshipPanel() {
  const [activeTab, setActiveTab] = useState<'find' | 'my-mentorships' | 'requests'>('find')
  const [mentors, setMentors] = useState<Mentor[]>([])
  const [myMentorships, setMyMentorships] = useState<MentorshipMatch[]>([])
  const [requests, setRequests] = useState<MentorshipMatch[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [selectedMentor, setSelectedMentor] = useState<Mentor | null>(null)
  const [selectedMentorship, setSelectedMentorship] = useState<MentorshipMatch | null>(null)
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [requestMessage, setRequestMessage] = useState('')
  const [filters, setFilters] = useState({
    expertise: [] as string[],
    maxRate: undefined as number | undefined,
  })

  useEffect(() => {
    if (activeTab === 'find') {
      fetchMentors()
    } else if (activeTab === 'my-mentorships') {
      fetchMyMentorships()
    } else if (activeTab === 'requests') {
      fetchRequests()
    }
  }, [activeTab])

  const fetchMentors = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`${API_BASE_URL}/mentorship/mentors`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setMentors(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching mentors:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchMyMentorships = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`${API_BASE_URL}/mentorship/matches`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setMyMentorships(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching mentorships:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchRequests = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`${API_BASE_URL}/mentorship/requests?asMentor=true`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setRequests(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching requests:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRequestMentorship = async () => {
    if (!selectedMentor) return
    
    try {
      const response = await fetch(`${API_BASE_URL}/mentorship/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          mentorId: selectedMentor.userId,
          message: requestMessage,
        })
      })
      
      if (response.ok) {
        setShowRequestModal(false)
        setRequestMessage('')
        setSelectedMentor(null)
        alert('Mentorship request sent!')
      }
    } catch (error) {
      console.error('Error requesting mentorship:', error)
    }
  }

  const handleAcceptRequest = async (matchId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/mentorship/requests/${matchId}/accept`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (response.ok) {
        fetchRequests()
        fetchMyMentorships()
      }
    } catch (error) {
      console.error('Error accepting request:', error)
    }
  }

  const handleDeclineRequest = async (matchId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/mentorship/requests/${matchId}/decline`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (response.ok) {
        fetchRequests()
      }
    } catch (error) {
      console.error('Error declining request:', error)
    }
  }

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Mentorship</h1>
              <p className="text-sm text-gray-500">Connect with experienced professionals</p>
            </div>
            <div className="flex gap-2">
              {['find', 'my-mentorships', 'requests'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {tab === 'my-mentorships' ? 'My Mentorships' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'find' && (
          <>
            {/* Search & Filters */}
            <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search mentors by name, expertise, or industry..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <Filter className="w-4 h-4" />
                  Filters
                </button>
              </div>
            </div>

            {/* Mentors Grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="bg-white rounded-xl shadow-sm border p-6 animate-pulse">
                    <div className="h-20 w-20 bg-gray-200 rounded-full mx-auto mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2 mx-auto"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {mentors.map((mentor) => (
                  <motion.div
                    key={mentor._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-xl shadow-sm border hover:shadow-md transition-shadow"
                  >
                    <div className="p-6">
                      {/* Avatar & Basic Info */}
                      <div className="text-center mb-4">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-3">
                          {mentor.displayName?.charAt(0) || 'M'}
                        </div>
                        <h3 className="font-semibold text-gray-900">{mentor.displayName}</h3>
                        <p className="text-sm text-gray-500">{mentor.headline}</p>
                        
                        {/* Rating */}
                        <div className="flex items-center justify-center gap-2 mt-2">
                          {renderStars(mentor.rating?.average || 0)}
                          <span className="text-sm text-gray-500">
                            ({mentor.rating?.count || 0} reviews)
                          </span>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-4 mb-4 py-4 border-y">
                        <div className="text-center">
                          <div className="text-lg font-bold text-gray-900">
                            {mentor.statistics?.successfulHires || 0}
                          </div>
                          <div className="text-xs text-gray-500">Successful Hires</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-gray-900">
                            {mentor.mentorship?.currentMentees || 0}/{mentor.mentorship?.maxMentees || 3}
                          </div>
                          <div className="text-xs text-gray-500">Mentees</div>
                        </div>
                      </div>

                      {/* Expertise */}
                      <div className="mb-4">
                        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Expertise</h4>
                        <div className="flex flex-wrap gap-1">
                          {mentor.expertise?.slice(0, 3).map((exp) => (
                            <span
                              key={exp}
                              className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full"
                            >
                              {exp}
                            </span>
                          ))}
                          {mentor.expertise?.length > 3 && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                              +{mentor.expertise.length - 3}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Rate */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-1 text-gray-600">
                          <DollarSign className="w-4 h-4" />
                          <span className="font-semibold">
                            {mentor.mentorship?.rate > 0 
                              ? `${mentor.mentorship.rate}/hour` 
                              : 'Free'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-gray-500 text-sm">
                          <Users className="w-4 h-4" />
                          <span>{mentor.mentorship?.currentMentees || 0} active</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedMentor(mentor)}
                          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          View Profile
                        </button>
                        <button
                          onClick={() => {
                            setSelectedMentor(mentor)
                            setShowRequestModal(true)
                          }}
                          disabled={mentor.mentorship?.currentMentees >= mentor.mentorship?.maxMentees}
                          className="flex-1 px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Request
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'my-mentorships' && (
          <div className="space-y-4">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-xl shadow-sm border p-6 animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                    <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                  </div>
                ))}
              </div>
            ) : myMentorships.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No active mentorships</h3>
                <p className="text-gray-500 mb-4">Find a mentor to start your journey!</p>
                <button
                  onClick={() => setActiveTab('find')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Find Mentors
                </button>
              </div>
            ) : (
              myMentorships.map((mentorship) => (
                <motion.div
                  key={mentorship._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-xl shadow-sm border hover:shadow-md transition-shadow"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                          {mentorship.mentorId?.name?.charAt(0) || 'M'}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{mentorship.mentorId?.name}</h3>
                          <p className="text-sm text-gray-500">
                            Started {mentorship.startDate 
                              ? new Date(mentorship.startDate).toLocaleDateString() 
                              : 'Recently'}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              mentorship.status === 'active' 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {mentorship.status}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedMentorship(mentorship)}
                        className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100"
                      >
                        View Details
                      </button>
                    </div>

                    {/* Progress */}
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1 text-gray-600">
                            <Target className="w-4 h-4" />
                            {mentorship.goals?.length || 0} Goals
                          </span>
                          <span className="flex items-center gap-1 text-gray-600">
                            <Calendar className="w-4 h-4" />
                            {mentorship.sessions?.length || 0} Sessions
                          </span>
                          <span className="flex items-center gap-1 text-gray-600">
                            <MessageSquare className="w-4 h-4" />
                            {mentorship.messages?.length || 0} Messages
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}

        {activeTab === 'requests' && (
          <div className="space-y-4">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="bg-white rounded-xl shadow-sm border p-6 animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                    <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                  </div>
                ))}
              </div>
            ) : requests.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
                <CheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No pending requests</h3>
                <p className="text-gray-500">You're all caught up!</p>
              </div>
            ) : (
              requests.map((request) => (
                <motion.div
                  key={request._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-xl shadow-sm border"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center text-white font-bold">
                          {request.menteeId?.name?.charAt(0) || 'M'}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{request.menteeId?.name}</h3>
                          <p className="text-sm text-gray-500">Wants to connect with you</p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {request.focusAreas?.map((area: string) => (
                              <span
                                key={area}
                                className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full"
                              >
                                {area}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAcceptRequest(request._id)}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleDeclineRequest(request._id)}
                          className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Request Modal */}
      {showRequestModal && selectedMentor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-xl max-w-lg w-full"
          >
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Request Mentorship</h2>
              <p className="text-sm text-gray-500 mt-1">
                Send a request to {selectedMentor.displayName}
              </p>
            </div>
            
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message (Optional)
                </label>
                <textarea
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  rows={4}
                  placeholder="Introduce yourself and explain what you hope to learn..."
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Mentorship Details</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Rate: {selectedMentor.mentorship?.rate > 0 ? `$${selectedMentor.mentorship.rate}/hour` : 'Free'}</li>
                  <li>• Typical duration: 3 months</li>
                  <li>• Includes goal setting and regular sessions</li>
                </ul>
              </div>
            </div>

            <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowRequestModal(false)
                  setRequestMessage('')
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleRequestMentorship}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Send Request
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}