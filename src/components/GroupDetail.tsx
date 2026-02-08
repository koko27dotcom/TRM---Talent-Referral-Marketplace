import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Users,
  MessageSquare,
  Settings,
  Shield,
  Plus,
  Search,
  MoreHorizontal,
  UserPlus,
  UserMinus,
  Flag,
  Share2,
  Bell,
  BellOff,
  Hash,
  Lock,
  Globe,
  ChevronRight,
  Crown,
  CheckCircle,
  Clock,
  Heart,
  MessageCircle
} from 'lucide-react'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1'

interface Group {
  _id: string
  groupId: string
  name: string
  description: string
  category: string
  subcategory?: string
  creatorId: {
    _id: string
    name: string
    avatar?: string
  }
  members: {
    userId: {
      _id: string
      name: string
      avatar?: string
    }
    role: 'member' | 'moderator' | 'admin'
    joinedAt: string
  }[]
  moderators: any[]
  rules: {
    _id: string
    title: string
    description?: string
    order: number
  }[]
  isPrivate: boolean
  requiresApproval: boolean
  memberCount: number
  postsCount: number
  coverImage?: string
  avatar?: string
  tags: string[]
  isMember?: boolean
  isModerator?: boolean
  isAdmin?: boolean
}

interface Post {
  _id: string
  title: string
  content: string
  authorId: {
    _id: string
    name: string
    avatar?: string
  }
  likes: any[]
  comments: any[]
  views: number
  isPinned: boolean
  createdAt: string
}

export default function GroupDetail({ groupId }: { groupId: string }) {
  const [group, setGroup] = useState<Group | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'posts' | 'members' | 'rules'>('posts')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newPost, setNewPost] = useState({ title: '', content: '' })

  useEffect(() => {
    fetchGroup()
    fetchPosts()
  }, [groupId])

  const fetchGroup = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`${API_BASE_URL}/community/groups/${groupId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setGroup(data.data)
      }
    } catch (error) {
      console.error('Error fetching group:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchPosts = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/community/posts?groupId=${groupId}`, {
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
    }
  }

  const handleJoinGroup = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/community/groups/${groupId}/join`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.requiresApproval) {
          alert('Membership request sent!')
        } else {
          fetchGroup()
        }
      }
    } catch (error) {
      console.error('Error joining group:', error)
    }
  }

  const handleLeaveGroup = async () => {
    if (!confirm('Are you sure you want to leave this group?')) return
    
    try {
      const response = await fetch(`${API_BASE_URL}/community/groups/${groupId}/leave`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (response.ok) {
        fetchGroup()
      }
    } catch (error) {
      console.error('Error leaving group:', error)
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
        body: JSON.stringify({
          ...newPost,
          groupId,
          category: 'discussion'
        })
      })
      
      if (response.ok) {
        setShowCreateModal(false)
        setNewPost({ title: '', content: '' })
        fetchPosts()
      }
    } catch (error) {
      console.error('Error creating post:', error)
    }
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900">Group not found</h2>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Cover Image */}
      <div className="h-64 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 relative">
        {group.coverImage && (
          <img
            src={group.coverImage}
            alt={group.name}
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        
        <div className="absolute bottom-0 left-0 right-0 max-w-5xl mx-auto px-4 pb-6">
          <div className="flex items-end gap-4">
            {/* Group Avatar */}
            <div className="w-24 h-24 rounded-2xl bg-white p-1 shadow-xl">
              <div className="w-full h-full rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold">
                {group.name.charAt(0)}
              </div>
            </div>
            
            {/* Group Info */}
            <div className="text-white flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-3xl font-bold">{group.name}</h1>
                {group.isPrivate ? (
                  <Lock className="w-5 h-5 text-white/70" />
                ) : (
                  <Globe className="w-5 h-5 text-white/70" />
                )}
              </div>
              <div className="flex items-center gap-4 text-white/80 text-sm">
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {group.memberCount.toLocaleString()} members
                </span>
                <span className="flex items-center gap-1">
                  <MessageSquare className="w-4 h-4" />
                  {group.postsCount.toLocaleString()} posts
                </span>
                <span className="capitalize">{group.category}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {group.isMember ? (
                <>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-white text-gray-900 rounded-lg hover:bg-gray-100"
                  >
                    <Plus className="w-4 h-4" />
                    Create Post
                  </button>
                  <button
                    onClick={handleLeaveGroup}
                    className="px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30"
                  >
                    Leave Group
                  </button>
                </>
              ) : (
                <button
                  onClick={handleJoinGroup}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <UserPlus className="w-4 h-4" />
                  {group.requiresApproval ? 'Request to Join' : 'Join Group'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Tabs */}
            <div className="bg-white rounded-xl shadow-sm border mb-6">
              <div className="flex border-b">
                {['posts', 'members', 'rules'].map((tab) => (
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
                {activeTab === 'posts' && (
                  <div className="space-y-4">
                    {posts.length === 0 ? (
                      <div className="text-center py-12">
                        <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No posts yet</h3>
                        <p className="text-gray-500 mb-4">Be the first to start a discussion!</p>
                        {group.isMember && (
                          <button
                            onClick={() => setShowCreateModal(true)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                          >
                            Create Post
                          </button>
                        )}
                      </div>
                    ) : (
                      posts.map((post) => (
                        <motion.div
                          key={post._id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                        >
                          {post.isPinned && (
                            <div className="flex items-center gap-1 text-xs text-blue-600 mb-2">
                              <Shield className="w-3 h-3" />
                              Pinned
                            </div>
                          )}
                          
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium">
                                {post.authorId?.name?.charAt(0) || 'U'}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{post.authorId?.name}</p>
                                <p className="text-xs text-gray-500">{formatTimeAgo(post.createdAt)}</p>
                              </div>
                            </div>
                          </div>

                          <h3 className="font-semibold text-gray-900 mb-2">{post.title}</h3>
                          <p className="text-gray-600 text-sm line-clamp-3">{post.content}</p>

                          <div className="flex items-center gap-4 mt-4 pt-4 border-t">
                            <button className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-500">
                              <Heart className="w-4 h-4" />
                              {post.likes?.length || 0}
                            </button>
                            <button className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600">
                              <MessageCircle className="w-4 h-4" />
                              {post.comments?.length || 0}
                            </button>
                            <span className="ml-auto text-sm text-gray-400">
                              {post.views} views
                            </span>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                )}

                {activeTab === 'members' && (
                  <div className="space-y-3">
                    {group.members?.map((member) => (
                      <div
                        key={member.userId._id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium">
                            {member.userId.name?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{member.userId.name}</p>
                            <div className="flex items-center gap-2">
                              {member.role === 'admin' && (
                                <span className="flex items-center gap-1 text-xs text-yellow-600">
                                  <Crown className="w-3 h-3" />
                                  Admin
                                </span>
                              )}
                              {member.role === 'moderator' && (
                                <span className="flex items-center gap-1 text-xs text-blue-600">
                                  <Shield className="w-3 h-3" />
                                  Moderator
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <span className="text-xs text-gray-500">
                          Joined {formatTimeAgo(member.joinedAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'rules' && (
                  <div className="space-y-4">
                    {group.rules?.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">No rules set for this group</p>
                    ) : (
                      group.rules.map((rule, index) => (
                        <div key={rule._id} className="p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-start gap-3">
                            <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-medium">
                              {index + 1}
                            </span>
                            <div>
                              <h4 className="font-medium text-gray-900">{rule.title}</h4>
                              {rule.description && (
                                <p className="text-sm text-gray-600 mt-1">{rule.description}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* About */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="font-semibold text-gray-900 mb-3">About</h3>
              <p className="text-gray-600 text-sm">{group.description}</p>
              
              {group.tags?.length > 0 && (
                <div className="mt-4">
                  <div className="flex flex-wrap gap-2">
                    {group.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Group Stats</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Members</span>
                  <span className="font-medium">{group.memberCount.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Posts</span>
                  <span className="font-medium">{group.postsCount.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Created</span>
                  <span className="font-medium">Recently</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Privacy</span>
                  <span className="font-medium capitalize">
                    {group.isPrivate ? 'Private' : 'Public'}
                  </span>
                </div>
              </div>
            </div>

            {/* Moderators */}
            {group.moderators?.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="font-semibold text-gray-900 mb-3">Moderators</h3>
                <div className="space-y-2">
                  {group.moderators.map((mod) => (
                    <div key={mod.userId} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
                        M
                      </div>
                      <span className="text-sm text-gray-700">Moderator</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="font-semibold text-gray-900 mb-3">Actions</h3>
              <div className="space-y-2">
                <button className="w-full flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg text-left">
                  <Share2 className="w-4 h-4" />
                  Share Group
                </button>
                <button className="w-full flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg text-left">
                  <Bell className="w-4 h-4" />
                  Notifications
                </button>
                <button className="w-full flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg text-left">
                  <Flag className="w-4 h-4" />
                  Report Group
                </button>
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
            className="bg-white rounded-xl shadow-xl max-w-2xl w-full"
          >
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Create Post</h2>
              <p className="text-sm text-gray-500">Posting in {group.name}</p>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                <textarea
                  value={newPost.content}
                  onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                  rows={6}
                  placeholder="Share your thoughts with the group..."
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
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
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
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