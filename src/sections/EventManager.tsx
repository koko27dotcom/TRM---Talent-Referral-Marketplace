import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  Users,
  Plus,
  Search,
  Filter,
  ChevronRight,
  CheckCircle,
  XCircle,
  ExternalLink,
  Download,
  QrCode,
  Mic,
  Users2,
  Presentation,
  GraduationCap,
  MessageCircle,
  CalendarDays
} from 'lucide-react'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1'

interface Event {
  _id: string
  eventId: string
  title: string
  description: string
  type: 'webinar' | 'meetup' | 'workshop' | 'conference' | 'networking' | 'panel' | 'ama'
  format: 'virtual' | 'physical' | 'hybrid'
  startDate: string
  endDate: string
  location?: {
    venue: string
    address: {
      city: string
    }
  }
  virtualDetails?: {
    platform: string
    meetingUrl: string
  }
  maxAttendees: number
  attendees: any[]
  isRegistered?: boolean
  userStatus?: string
  organizerId: {
    name: string
    avatar?: string
  }
  speakers: any[]
  coverImage?: string
  isRecorded: boolean
  status: string
}

const eventTypes = [
  { id: 'all', label: 'All Events', icon: Calendar },
  { id: 'webinar', label: 'Webinars', icon: Video },
  { id: 'meetup', label: 'Meetups', icon: Users2 },
  { id: 'workshop', label: 'Workshops', icon: GraduationCap },
  { id: 'conference', label: 'Conferences', icon: Presentation },
  { id: 'networking', label: 'Networking', icon: MessageCircle },
]

const formatIcons = {
  virtual: Video,
  physical: MapPin,
  hybrid: Users,
}

export default function EventManager() {
  const [events, setEvents] = useState<Event[]>([])
  const [myEvents, setMyEvents] = useState<Event[]>([])
  const [activeTab, setActiveTab] = useState<'upcoming' | 'my-events' | 'past'>('upcoming')
  const [activeType, setActiveType] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  useEffect(() => {
    if (activeTab === 'upcoming') {
      fetchEvents()
    } else if (activeTab === 'my-events') {
      fetchMyEvents()
    }
  }, [activeTab, activeType])

  const fetchEvents = async () => {
    try {
      setIsLoading(true)
      const filters = activeType !== 'all' ? `?type=${activeType}` : ''
      const response = await fetch(`${API_BASE_URL}/events${filters}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setEvents(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching events:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchMyEvents = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`${API_BASE_URL}/events/my-events`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setMyEvents(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching my events:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegister = async (eventId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/events/${eventId}/register`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (response.ok) {
        fetchEvents()
        fetchMyEvents()
      }
    } catch (error) {
      console.error('Error registering for event:', error)
    }
  }

  const handleCancelRegistration = async (eventId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/events/${eventId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (response.ok) {
        fetchEvents()
        fetchMyEvents()
      }
    } catch (error) {
      console.error('Error cancelling registration:', error)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return {
      day: date.getDate(),
      month: date.toLocaleDateString('en-US', { month: 'short' }),
      weekday: date.toLocaleDateString('en-US', { weekday: 'short' }),
      time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      full: date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  }

  const getEventTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      webinar: 'bg-purple-100 text-purple-700',
      meetup: 'bg-green-100 text-green-700',
      workshop: 'bg-blue-100 text-blue-700',
      conference: 'bg-red-100 text-red-700',
      networking: 'bg-amber-100 text-amber-700',
      panel: 'bg-pink-100 text-pink-700',
      ama: 'bg-cyan-100 text-cyan-700',
    }
    return colors[type] || 'bg-gray-100 text-gray-700'
  }

  const displayedEvents = activeTab === 'my-events' ? myEvents : events

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Events</h1>
              <p className="text-sm text-gray-500">Discover and join events to learn and network</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Event
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Tabs & Filters */}
        <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            {/* Tabs */}
            <div className="flex gap-2">
              {['upcoming', 'my-events', 'past'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {tab === 'my-events' ? 'My Events' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            <div className="flex-1" />

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full lg:w-64"
              />
            </div>

            {/* View Toggle */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm' : ''}`}
              >
                <div className="w-4 h-4 grid grid-cols-2 gap-0.5">
                  <div className="bg-current rounded-sm" />
                  <div className="bg-current rounded-sm" />
                  <div className="bg-current rounded-sm" />
                  <div className="bg-current rounded-sm" />
                </div>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow-sm' : ''}`}
              >
                <div className="w-4 h-4 flex flex-col gap-1">
                  <div className="h-1 bg-current rounded-sm" />
                  <div className="h-1 bg-current rounded-sm" />
                  <div className="h-1 bg-current rounded-sm" />
                </div>
              </button>
            </div>
          </div>

          {/* Event Type Filters */}
          <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
            {eventTypes.map((type) => {
              const Icon = type.icon
              return (
                <button
                  key={type.id}
                  onClick={() => setActiveType(type.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                    activeType === type.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {type.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Events Grid/List */}
        {isLoading ? (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm border p-6 animate-pulse">
                <div className="h-32 bg-gray-200 rounded-lg mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : displayedEvents.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No events found</h3>
            <p className="text-gray-500">Check back later for upcoming events!</p>
          </div>
        ) : (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
            {displayedEvents.map((event) => {
              const startDate = formatDate(event.startDate)
              const FormatIcon = formatIcons[event.format]
              const isFull = event.attendees?.length >= event.maxAttendees
              
              return (
                <motion.div
                  key={event._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`bg-white rounded-xl shadow-sm border hover:shadow-md transition-shadow ${
                    viewMode === 'list' ? 'flex gap-4' : ''
                  }`}
                >
                  {/* Event Image / Date Badge */}
                  <div className={`relative ${viewMode === 'list' ? 'w-48 flex-shrink-0' : ''}`}>
                    {event.coverImage ? (
                      <img
                        src={event.coverImage}
                        alt={event.title}
                        className={`w-full object-cover ${viewMode === 'list' ? 'h-full rounded-l-xl' : 'h-48 rounded-t-xl'}`}
                      />
                    ) : (
                      <div className={`w-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center ${viewMode === 'list' ? 'h-full rounded-l-xl' : 'h-48 rounded-t-xl'}`}>
                        <Calendar className="w-12 h-12 text-white/50" />
                      </div>
                    )}
                    
                    {/* Date Badge */}
                    <div className="absolute top-4 left-4 bg-white rounded-lg shadow-md p-2 text-center min-w-[60px]">
                      <div className="text-xs font-semibold text-red-500 uppercase">{startDate.month}</div>
                      <div className="text-2xl font-bold text-gray-900">{startDate.day}</div>
                    </div>

                    {/* Type Badge */}
                    <div className={`absolute top-4 right-4 px-2 py-1 rounded-full text-xs font-medium ${getEventTypeColor(event.type)}`}>
                      {event.type}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-5 flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-semibold text-gray-900 line-clamp-2">{event.title}</h3>
                    </div>

                    <p className="text-sm text-gray-500 mb-4 line-clamp-2">{event.description}</p>

                    {/* Meta Info */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="w-4 h-4" />
                        {startDate.time}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <FormatIcon className="w-4 h-4" />
                        {event.format === 'virtual' 
                          ? 'Virtual Event' 
                          : event.location?.venue || 'Location TBD'}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Users className="w-4 h-4" />
                        {event.attendees?.length || 0} / {event.maxAttendees} registered
                        {isFull && <span className="text-red-500 text-xs">(Full)</span>}
                      </div>
                    </div>

                    {/* Speakers */}
                    {event.speakers && event.speakers.length > 0 && (
                      <div className="flex items-center gap-2 mb-4">
                        <div className="flex -space-x-2">
                          {event.speakers.slice(0, 3).map((speaker, idx) => (
                            <div
                              key={idx}
                              className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs font-medium"
                            >
                              {speaker.name?.charAt(0) || 'S'}
                            </div>
                          ))}
                        </div>
                        <span className="text-sm text-gray-500">
                          {event.speakers.length} speaker{event.speakers.length > 1 ? 's' : ''}
                        </span>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-3 pt-4 border-t">
                      {event.isRegistered ? (
                        <>
                          <button
                            onClick={() => setSelectedEvent(event)}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Registered
                          </button>
                          <button
                            onClick={() => handleCancelRegistration(event._id)}
                            className="px-3 py-2 text-gray-500 hover:text-red-500"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleRegister(event._id)}
                          disabled={isFull}
                          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isFull ? 'Event Full' : 'Register'}
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedEvent(event)}
                        className="px-3 py-2 text-gray-500 hover:text-blue-600"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            {/* Modal Header */}
            <div className="relative h-48 bg-gradient-to-br from-blue-500 to-purple-600">
              <button
                onClick={() => setSelectedEvent(null)}
                className="absolute top-4 right-4 w-8 h-8 bg-white/20 backdrop-blur rounded-full flex items-center justify-center text-white hover:bg-white/30"
              >
                <Plus className="w-5 h-5 rotate-45" />
              </button>
              <div className="absolute bottom-4 left-4 right-4">
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium mb-2 ${getEventTypeColor(selectedEvent.type)}`}>
                  {selectedEvent.type}
                </span>
                <h2 className="text-2xl font-bold text-white">{selectedEvent.title}</h2>
              </div>
            </div>

            <div className="p-6">
              {/* Date & Time */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-blue-50 rounded-xl flex flex-col items-center justify-center">
                  <span className="text-xs font-semibold text-blue-600 uppercase">
                    {formatDate(selectedEvent.startDate).month}
                  </span>
                  <span className="text-2xl font-bold text-blue-700">
                    {formatDate(selectedEvent.startDate).day}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {formatDate(selectedEvent.startDate).full}
                  </p>
                  <p className="text-sm text-gray-500">
                    to {formatDate(selectedEvent.endDate).full}
                  </p>
                </div>
              </div>

              {/* Description */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-2">About this event</h3>
                <p className="text-gray-600">{selectedEvent.description}</p>
              </div>

              {/* Location/Virtual */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-2">Location</h3>
                <div className="flex items-center gap-2 text-gray-600">
                  {selectedEvent.format === 'virtual' ? (
                    <>
                      <Video className="w-5 h-5" />
                      <span>Virtual Event</span>
                      {selectedEvent.virtualDetails?.meetingUrl && (
                        <a
                          href={selectedEvent.virtualDetails.meetingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline flex items-center gap-1"
                        >
                          Join Link
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </>
                  ) : (
                    <>
                      <MapPin className="w-5 h-5" />
                      <span>{selectedEvent.location?.venue}, {selectedEvent.location?.address?.city}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Speakers */}
              {selectedEvent.speakers && selectedEvent.speakers.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Speakers</h3>
                  <div className="space-y-3">
                    {selectedEvent.speakers.map((speaker, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-medium">
                          {speaker.name?.charAt(0) || 'S'}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{speaker.name}</p>
                          <p className="text-sm text-gray-500">{speaker.title}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-6 border-t">
                {selectedEvent.isRegistered ? (
                  <>
                    <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg">
                      <CheckCircle className="w-4 h-4" />
                      You're Registered
                    </button>
                    <button
                      onClick={() => window.open(`${API_BASE_URL}/events/${selectedEvent._id}/calendar`, '_blank')}
                      className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      <Download className="w-4 h-4" />
                      Add to Calendar
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      handleRegister(selectedEvent._id)
                      setSelectedEvent(null)
                    }}
                    disabled={selectedEvent.attendees?.length >= selectedEvent.maxAttendees}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {selectedEvent.attendees?.length >= selectedEvent.maxAttendees 
                      ? 'Event Full' 
                      : 'Register Now'}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}