import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  BookOpen,
  Headphones,
  Video,
  Search,
  Filter,
  Clock,
  Eye,
  Heart,
  Share2,
  ChevronRight,
  TrendingUp,
  Star,
  Calendar,
  User,
  Play,
  Mic,
  FileText,
  Bookmark,
  MessageSquare
} from 'lucide-react'

const API_BASE_URL = 'http://localhost:3001/api'

interface Content {
  _id: string
  contentId: string
  title: string
  description: string
  type: 'blog' | 'podcast' | 'video'
  category: string
  authorId: {
    _id: string
    name: string
    avatar?: string
    displayName?: string
  }
  thumbnail?: string
  mediaUrl?: string
  duration?: number
  readingTime?: number
  views: number
  likes: any[]
  comments: any[]
  isFeatured: boolean
  publishedAt: string
  tags: string[]
  isLiked?: boolean
}

const contentTypes = [
  { id: 'all', label: 'All Content', icon: BookOpen },
  { id: 'blog', label: 'Blog Posts', icon: FileText },
  { id: 'podcast', label: 'Podcasts', icon: Headphones },
  { id: 'video', label: 'Videos', icon: Video },
]

const categories = [
  { id: 'all', label: 'All Categories' },
  { id: 'career_advice', label: 'Career Advice' },
  { id: 'interview_tips', label: 'Interview Tips' },
  { id: 'resume_guide', label: 'Resume Guide' },
  { id: 'industry_insights', label: 'Industry Insights' },
  { id: 'referral_strategy', label: 'Referral Strategy' },
  { id: 'success_stories', label: 'Success Stories' },
]

export default function ContentPlatform() {
  const [content, setContent] = useState<Content[]>([])
  const [featuredContent, setFeaturedContent] = useState<Content[]>([])
  const [trendingContent, setTrendingContent] = useState<Content[]>([])
  const [activeType, setActiveType] = useState('all')
  const [activeCategory, setActiveCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [selectedContent, setSelectedContent] = useState<Content | null>(null)

  useEffect(() => {
    fetchContent()
    fetchFeatured()
    fetchTrending()
  }, [activeType, activeCategory])

  const fetchContent = async () => {
    try {
      setIsLoading(true)
      let url = `${API_BASE_URL}/content`
      
      if (activeType !== 'all') {
        url = `${API_BASE_URL}/content/${activeType}`
      }
      
      const params = new URLSearchParams()
      if (activeCategory !== 'all') params.append('category', activeCategory)
      
      const response = await fetch(`${url}?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setContent(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching content:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchFeatured = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/content/featured?limit=5`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setFeaturedContent(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching featured:', error)
    }
  }

  const fetchTrending = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/content/trending?limit=5`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setTrendingContent(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching trending:', error)
    }
  }

  const handleLike = async (contentId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/content/${contentId}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setContent(content.map(item => 
          item._id === contentId 
            ? { ...item, isLiked: data.isLiked, likes: data.isLiked 
              ? [...item.likes, { userId: 'current' }] 
              : item.likes.slice(0, -1) }
            : item
        ))
      }
    } catch (error) {
      console.error('Error liking content:', error)
    }
  }

  const formatDuration = (seconds?: number) => {
    if (!seconds) return ''
    const mins = Math.floor(seconds / 60)
    const hrs = Math.floor(mins / 60)
    if (hrs > 0) return `${hrs}h ${mins % 60}m`
    return `${mins}m`
  }

  const formatViews = (views: number) => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K`
    return views.toString()
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'blog': return FileText
      case 'podcast': return Headphones
      case 'video': return Video
      default: return BookOpen
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Learning Center</h1>
              <p className="text-sm text-gray-500">Articles, podcasts, and videos to help you grow</p>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Featured Content Carousel */}
      {featuredContent.length > 0 && (
        <div className="bg-gradient-to-r from-blue-600 to-purple-700 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center gap-2 mb-4">
              <Star className="w-5 h-5 text-yellow-300" />
              <span className="font-semibold">Featured Content</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredContent.slice(0, 3).map((item) => {
                const TypeIcon = getTypeIcon(item.type)
                return (
                  <motion.div
                    key={item._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/10 backdrop-blur rounded-xl overflow-hidden hover:bg-white/20 transition-colors cursor-pointer"
                    onClick={() => setSelectedContent(item)}
                  >
                    <div className="aspect-video bg-white/20 flex items-center justify-center">
                      {item.thumbnail ? (
                        <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover" />
                      ) : (
                        <TypeIcon className="w-12 h-12 text-white/50" />
                      )}
                    </div>
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 bg-white/20 rounded text-xs font-medium">
                          {item.type}
                        </span>
                        <span className="text-xs text-white/70">
                          {formatViews(item.views)} views
                        </span>
                      </div>
                      <h3 className="font-semibold line-clamp-2">{item.title}</h3>
                      <p className="text-sm text-white/70 line-clamp-2 mt-1">{item.description}</p>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Content Type */}
            <div className="flex gap-2 overflow-x-auto pb-2 lg:pb-0">
              {contentTypes.map((type) => {
                const Icon = type.icon
                return (
                  <button
                    key={type.id}
                    onClick={() => setActiveType(type.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                      activeType === type.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {type.label}
                  </button>
                )
              })}
            </div>

            <div className="flex-1" />

            {/* Category Filter */}
            <select
              value={activeCategory}
              onChange={(e) => setActiveCategory(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-white rounded-xl shadow-sm border p-6 animate-pulse">
                    <div className="h-40 bg-gray-200 rounded-lg mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : content.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
                <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No content found</h3>
                <p className="text-gray-500">Try adjusting your filters</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {content.map((item) => {
                  const TypeIcon = getTypeIcon(item.type)
                  return (
                    <motion.div
                      key={item._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white rounded-xl shadow-sm border hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => setSelectedContent(item)}
                    >
                      {/* Thumbnail */}
                      <div className="aspect-video bg-gray-100 rounded-t-xl flex items-center justify-center relative overflow-hidden">
                        {item.thumbnail ? (
                          <img 
                            src={item.thumbnail} 
                            alt={item.title} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <TypeIcon className="w-12 h-12 text-gray-300" />
                        )}
                        
                        {/* Type Badge */}
                        <div className="absolute top-3 left-3 px-2 py-1 bg-black/50 backdrop-blur text-white text-xs rounded-full flex items-center gap-1">
                          <TypeIcon className="w-3 h-3" />
                          {item.type}
                        </div>

                        {/* Duration */}
                        {(item.duration || item.readingTime) && (
                          <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/50 backdrop-blur text-white text-xs rounded-full">
                            {item.type === 'blog' 
                              ? `${item.readingTime} min read`
                              : formatDuration(item.duration)
                            }
                          </div>
                        )}

                        {/* Play Button for Video/Podcast */}
                        {(item.type === 'video' || item.type === 'podcast') && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-14 h-14 bg-white/90 rounded-full flex items-center justify-center shadow-lg">
                              <Play className="w-6 h-6 text-blue-600 ml-1" />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="p-5">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">
                            {item.category.replace(/_/g, ' ')}
                          </span>
                        </div>
                        
                        <h3 className="font-semibold text-gray-900 line-clamp-2 mb-2">
                          {item.title}
                        </h3>
                        <p className="text-sm text-gray-500 line-clamp-2 mb-4">
                          {item.description}
                        </p>

                        {/* Author & Stats */}
                        <div className="flex items-center justify-between pt-4 border-t">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
                              {item.authorId?.name?.charAt(0) || 'A'}
                            </div>
                            <span className="text-sm text-gray-600">
                              {item.authorId?.displayName || item.authorId?.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Eye className="w-4 h-4" />
                              {formatViews(item.views)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Heart className="w-4 h-4" />
                              {item.likes?.length || 0}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="hidden lg:block lg:col-span-1">
            {/* Trending */}
            <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-red-500" />
                <h3 className="font-semibold text-gray-900">Trending</h3>
              </div>
              <div className="space-y-3">
                {trendingContent.map((item, index) => (
                  <div 
                    key={item._id} 
                    className="flex items-start gap-3 group cursor-pointer"
                    onClick={() => setSelectedContent(item)}
                  >
                    <span className="text-lg font-bold text-gray-300 group-hover:text-blue-500">
                      {index + 1}
                    </span>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 line-clamp-2 group-hover:text-blue-600">
                        {item.title}
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatViews(item.views)} views
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Newsletter */}
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl p-4 text-white">
              <h3 className="font-semibold mb-2">Stay Updated</h3>
              <p className="text-sm text-white/80 mb-4">
                Get the latest career tips and insights delivered to your inbox.
              </p>
              <input
                type="email"
                placeholder="Your email"
                className="w-full px-3 py-2 rounded-lg text-gray-900 text-sm mb-2"
              />
              <button className="w-full px-3 py-2 bg-white text-blue-600 rounded-lg text-sm font-medium hover:bg-white/90">
                Subscribe
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content Detail Modal */}
      {selectedContent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="aspect-video bg-gray-100 flex items-center justify-center relative">
              {selectedContent.thumbnail ? (
                <img 
                  src={selectedContent.thumbnail} 
                  alt={selectedContent.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center text-gray-400">
                  {(() => {
                    const Icon = getTypeIcon(selectedContent.type)
                    return <Icon className="w-16 h-16 mb-2" />
                  })()}
                  <span className="text-lg capitalize">{selectedContent.type}</span>
                </div>
              )}
              <button
                onClick={() => setSelectedContent(null)}
                className="absolute top-4 right-4 w-8 h-8 bg-black/50 backdrop-blur rounded-full flex items-center justify-center text-white hover:bg-black/70"
              >
                <span className="text-xl">×</span>
              </button>
            </div>

            <div className="p-6">
              {/* Meta */}
              <div className="flex items-center gap-2 mb-3">
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                  {selectedContent.category.replace(/_/g, ' ')}
                </span>
                <span className="text-sm text-gray-500">
                  {new Date(selectedContent.publishedAt).toLocaleDateString()}
                </span>
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                {selectedContent.title}
              </h2>

              {/* Author */}
              <div className="flex items-center gap-3 mb-6 pb-6 border-b">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium">
                  {selectedContent.authorId?.name?.charAt(0) || 'A'}
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {selectedContent.authorId?.displayName || selectedContent.authorId?.name}
                  </p>
                  <p className="text-sm text-gray-500">Author</p>
                </div>
              </div>

              {/* Description */}
              <p className="text-gray-600 mb-6">{selectedContent.description}</p>

              {/* Engagement */}
              <div className="flex items-center gap-6 pt-6 border-t">
                <button
                  onClick={() => handleLike(selectedContent._id)}
                  className={`flex items-center gap-2 ${selectedContent.isLiked ? 'text-red-500' : 'text-gray-500'}`}
                >
                  <Heart className={`w-5 h-5 ${selectedContent.isLiked ? 'fill-current' : ''}`} />
                  {selectedContent.likes?.length || 0}
                </button>
                <button className="flex items-center gap-2 text-gray-500">
                  <MessageSquare className="w-5 h-5" />
                  {selectedContent.comments?.length || 0}
                </button>
                <button className="flex items-center gap-2 text-gray-500">
                  <Share2 className="w-5 h-5" />
                  Share
                </button>
                <button className="flex items-center gap-2 text-gray-500 ml-auto">
                  <Bookmark className="w-5 h-5" />
                  Save
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}