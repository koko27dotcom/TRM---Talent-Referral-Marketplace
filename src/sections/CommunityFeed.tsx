import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  MessageSquare,
  Heart,
  Share2,
  TrendingUp,
  Users,
  Search,
  Plus,
  Filter,
  MoreHorizontal,
  Clock,
  MessageCircle,
  Bookmark,
  Hash,
  User,
  Building2,
  ChevronRight,
  Flame,
  Award
} from 'lucide-react'

const API_BASE_URL = 'http://localhost:3001/api'

interface Post {
  _id: string
  postId: string
  title: string
  content: string
  category: string
  tags: string[]
  authorId: {
    _id: string
    name: string
    avatar?: string
    companyName?: string
    displayName?: string
  }
  likes: { userId: string }[]
  comments: any[]
  views: number
  isPinned: boolean
  isFeatured: boolean
  createdAt: string
  likeCount: number
  commentCount: number
  isLiked?: boolean
}

interface Group {
  _id: string
  groupId: string
  name: string
  description: string
  category: string
  memberCount: number
  postsCount: number
  coverImage?: string
  isPrivate: boolean
}

const categories = [
  { id: 'all', label: 'All Posts', icon: MessageSquare },
  { id: 'discussion', label: 'Discussions', icon: MessageCircle },
  { id: 'question', label: 'Questions', icon: MessageSquare },
  { id: 'success-story', label: 'Success Stories', icon: Award },
  { id: 'tip', label: 'Tips & Tricks', icon: TrendingUp },
  { id: 'job', label: 'Job Postings', icon: Building2 },
]

export default function CommunityFeed() {
  const [posts, setPosts] = useState<Post[]>([])
  const [trendingPosts, setTrendingPosts] = useState<Post[]>([])
  const [suggestedGroups, setSuggestedGroups] = useState<Group[]>([])
  const [activeCategory, setActiveCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    category: 'discussion',
    tags: [] as string[]
  })
  const [tagInput, setTagInput] = useState('')

  useEffect(() => {
    fetchPosts()
    fetchTrending()
    fetchSuggestedGroups()
  }, [activeCategory])

  const fetchPosts = async () => {
    try {
      setIsLoading(true)
      const url = activeCategory === 'all' 
        ? `${API_BASE_URL}/community/posts`
        : `${API_BASE_URL}/community/posts?category=${activeCategory}`
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setPosts(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching posts:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchTrending = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/community/trending?limit=5`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setTrendingPosts(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching trending:', error)
    }
  }

  const fetchSuggestedGroups = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/community/groups?limit=5`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setSuggestedGroups(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching groups:', error)
    }
  }

  const handleLike = async (postId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/community/posts/${postId}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setPosts(posts.map(post => 
          post._id === postId 
            ? { ...post, isLiked: data.isLiked, likeCount: data.likeCount }
            : post
        ))
      }
    } catch (error) {
      console.error('Error liking post:', error)
    }
  }

  const handleCreatePost = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/community/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(newPost)
      })
      
      if (response.ok) {
        setShowCreateModal(false)
        setNewPost({ title: '', content: '', category: 'discussion', tags: [] })
        fetchPosts()
      }
    } catch (error) {
      console.error('Error creating post:', error)
    }
  }

  const addTag = () => {
    if (tagInput.trim() && !newPost.tags.includes(tagInput.trim())) {
      setNewPost({ ...newPost, tags: [...newPost.tags, tagInput.trim()] })
      setTagInput('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setNewPost({ ...newPost, tags: newPost.tags.filter(tag => tag !== tagToRemove) })
  }

  const formatTimeAgo = (date: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000)
    if (seconds < 60) return 'just now'
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      discussion: 'bg-blue-100 text-blue-700',
      question: 'bg-amber-100 text-amber-700',
      'success-story': 'bg-green-100 text-green-700',
      tip: 'bg-purple-100 text-purple-700',
      job: 'bg-red-100 text-red-700',
    }
    return colors[category] || 'bg-gray-100 text-gray-700'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Community</h1>
              <p className="text-sm text-gray-500">Connect, learn, and grow with fellow professionals</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Post
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar - Categories */}
          <div className="hidden lg:block lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border p-4 sticky top-24">
              <h3 className="font-semibold text-gray-900 mb-4">Categories</h3>
              <nav className="space-y-1">
                {categories.map((category) => {
                  const Icon = category.icon
                  return (
                    <button
                      key={category.id}
                      onClick={() => setActiveCategory(category.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeCategory === category.id
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {category.label}
                    </button>
                  )
                })}
              </nav>

              <div className="mt-6 pt-6 border-t">
                <h3 className="font-semibold text-gray-900 mb-3">My Groups</h3>
                <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                  <Users className="w-4 h-4" />
                  View All Groups
                  <ChevronRight className="w-4 h-4 ml-auto" />
                </button>
              </div>
            </div>
          </div>

          {/* Main Feed */}
          <div className="lg:col-span-2">
            {/* Search Bar */}
            <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search discussions, questions, or people..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Posts */}
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-xl shadow-sm border p-6 animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                    <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </div>
                ))}
              </div>
            ) : posts.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
                <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No posts yet</h3>
                <p className="text-gray-500 mb-4">Be the first to start a conversation!</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create Post
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {posts.map((post) => (
                  <motion.div
                    key={post._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-xl shadow-sm border hover:shadow-md transition-shadow"
                  >
                    {post.isPinned && (
                      <div className="px-6 py-2 bg-blue-50 border-b flex items-center gap-2 text-xs text-blue-700">
                        <Bookmark className="w-3 h-3" />
                        Pinned Post
                      </div>
                    )}
                    
                    <div className="p-6">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium">
                            {post.authorId?.name?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {post.authorId?.displayName || post.authorId?.name || 'Anonymous'}
                            </h4>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <Clock className="w-3 h-3" />
                              {formatTimeAgo(post.createdAt)}
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(post.category)}`}>
                                {post.category}
                              </span>
                            </div>
                          </div>
                        </div>
                        <button className="text-gray-400 hover:text-gray-600">
                          <MoreHorizontal className="w-5 h-5" />
                        </button>
                      </div>

                      {/* Content */}
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{post.title}</h3>
                      <p className="text-gray-600 mb-4 line-clamp-3">{post.content}</p>

                      {/* Tags */}
                      {post.tags && post.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {post.tags.map((tag) => (
                            <span
                              key={tag}
                              className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs"
                            >
                              <Hash className="w-3 h-3" />
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-6 pt-4 border-t">
                        <button
                          onClick={() => handleLike(post._id)}
                          className={`flex items-center gap-2 text-sm transition-colors ${
                            post.isLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
                          }`}
                        >
                          <Heart className={`w-4 h-4 ${post.isLiked ? 'fill-current' : ''}`} />
                          {post.likeCount || 0}
                        </button>
                        <button className="flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 transition-colors">
                          <MessageCircle className="w-4 h-4" />
                          {post.commentCount || 0}
                        </button>
                        <button className="flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 transition-colors">
                          <Share2 className="w-4 h-4" />
                          Share
                        </button>
                        <span className="ml-auto text-sm text-gray-400">
                          {post.views} views
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="hidden lg:block lg:col-span-1">
            {/* Trending */}
            <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Flame className="w-5 h-5 text-orange-500" />
                <h3 className="font-semibold text-gray-900">Trending</h3>
              </div>
              <div className="space-y-3">
                {trendingPosts.slice(0, 5).map((post, index) => (
                  <div key={post._id} className="flex items-start gap-3 group cursor-pointer">
                    <span className="text-lg font-bold text-gray-300 group-hover:text-blue-500">
                      {index + 1}
                    </span>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 line-clamp-2 group-hover:text-blue-600">
                        {post.title}
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">
                        {post.likeCount} likes • {post.commentCount} comments
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Suggested Groups */}
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-blue-500" />
                <h3 className="font-semibold text-gray-900">Suggested Groups</h3>
              </div>
              <div className="space-y-3">
                {suggestedGroups.map((group) => (
                  <div key={group._id} className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                      {group.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900 truncate">{group.name}</h4>
                      <p className="text-xs text-gray-500">
                        {group.memberCount.toLocaleString()} members
                      </p>
                    </div>
                    <button className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-full hover:bg-blue-100">
                      Join
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Post Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Create Post</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <Plus className="w-6 h-6 rotate-45" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={newPost.title}
                  onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                  placeholder="What's on your mind?"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={newPost.category}
                  onChange={(e) => setNewPost({ ...newPost, category: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="discussion">Discussion</option>
                  <option value="question">Question</option>
                  <option value="success-story">Success Story</option>
                  <option value="tip">Tip & Trick</option>
                  <option value="job">Job Posting</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                <textarea
                  value={newPost.content}
                  onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                  rows={6}
                  placeholder="Share your thoughts, ask a question, or tell your story..."
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {newPost.tags.map((tag) => (
                    <span
                      key={tag}
                      className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm"
                    >
                      #{tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="hover:text-blue-900"
                      >
                        <Plus className="w-3 h-3 rotate-45" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    placeholder="Add a tag..."
                    className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={addTag}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePost}
                disabled={!newPost.title || !newPost.content}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Post
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}