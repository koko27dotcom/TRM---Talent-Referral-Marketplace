import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users,
  Network,
  ChevronRight,
  ChevronDown,
  User,
  Crown,
  Medal,
  Award,
  TrendingUp,
  DollarSign,
  Loader2,
  AlertCircle,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  TreePine,
  BarChart3,
  Share2
} from 'lucide-react'

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

interface NetworkMember {
  id: string
  name: string
  email: string
  avatar?: string
  tierLevel: string
  networkSize: number
  joinedAt: string
  depth?: number
  earnings?: number
}

interface NetworkStats {
  directReferrals: number
  networkSize: number
  networkEarnings: number
  depthBreakdown: Record<string, number>
}

interface NetworkData {
  user: {
    id: string
    name: string
    email: string
    avatar?: string
    tierLevel: string
    inviteCode: string
  }
  stats: NetworkStats
  directChildren: NetworkMember[]
}

interface NetworkDashboardProps {
  embedded?: boolean
}

export default function NetworkDashboard({ embedded = false }: NetworkDashboardProps) {
  const [networkData, setNetworkData] = useState<NetworkData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'tree' | 'stats'>('list')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTier, setSelectedTier] = useState<string>('all')
  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(new Set())

  const getAuthToken = () => localStorage.getItem('token')

  useEffect(() => {
    fetchNetworkData()
  }, [])

  const fetchNetworkData = async () => {
    try {
      setLoading(true)
      setError(null)

      const token = getAuthToken()
      if (!token) {
        throw new Error('Please log in to view your network')
      }

      const response = await fetch(`${API_BASE_URL}/referrals/network`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch network data')
      }

      const data = await response.json()
      if (data.success && data.data) {
        setNetworkData(data.data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load network data')
    } finally {
      setLoading(false)
    }
  }

  const toggleMemberExpand = (memberId: string) => {
    const newExpanded = new Set(expandedMembers)
    if (newExpanded.has(memberId)) {
      newExpanded.delete(memberId)
    } else {
      newExpanded.add(memberId)
    }
    setExpandedMembers(newExpanded)
  }

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'platinum': return <Crown className="w-4 h-4 text-gray-400" />
      case 'gold': return <Award className="w-4 h-4 text-amber-500" />
      case 'silver': return <Medal className="w-4 h-4 text-gray-400" />
      default: return <Medal className="w-4 h-4 text-amber-700" />
    }
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'platinum': return 'bg-gray-100 text-gray-700 border-gray-300'
      case 'gold': return 'bg-amber-100 text-amber-700 border-amber-300'
      case 'silver': return 'bg-slate-100 text-slate-700 border-slate-300'
      default: return 'bg-orange-100 text-orange-700 border-orange-300'
    }
  }

  const filteredMembers = networkData?.directChildren.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         member.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesTier = selectedTier === 'all' || member.tierLevel === selectedTier
    return matchesSearch && matchesTier
  }) || []

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={fetchNetworkData}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-6 text-white">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 rounded-xl">
              <Network className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">My Network</h2>
              <p className="text-indigo-100 text-sm">Manage and grow your referral team</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getTierColor(networkData?.user.tierLevel || 'bronze')}`}>
              {getTierIcon(networkData?.user.tierLevel || 'bronze')}
              <span className="ml-1 capitalize">{networkData?.user.tierLevel}</span>
            </span>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/10 backdrop-blur-sm rounded-xl p-4"
          >
            <div className="flex items-center gap-2 text-indigo-100 text-sm mb-1">
              <Users className="w-4 h-4" />
              Direct Referrals
            </div>
            <div className="text-2xl font-bold">{networkData?.stats.directReferrals || 0}</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/10 backdrop-blur-sm rounded-xl p-4"
          >
            <div className="flex items-center gap-2 text-indigo-100 text-sm mb-1">
              <TreePine className="w-4 h-4" />
              Total Network
            </div>
            <div className="text-2xl font-bold">{networkData?.stats.networkSize || 0}</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/10 backdrop-blur-sm rounded-xl p-4"
          >
            <div className="flex items-center gap-2 text-indigo-100 text-sm mb-1">
              <DollarSign className="w-4 h-4" />
              Network Earnings
            </div>
            <div className="text-2xl font-bold">
              {(networkData?.stats.networkEarnings || 0).toLocaleString()} Ks
            </div>
          </motion.div>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex">
          {['list', 'tree', 'stats'].map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode as any)}
              className={`flex-1 px-4 py-3 text-sm font-medium capitalize transition-colors ${
                viewMode === mode
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              {mode === 'list' && <Users className="w-4 h-4 inline mr-2" />}
              {mode === 'tree' && <TreePine className="w-4 h-4 inline mr-2" />}
              {mode === 'stats' && <BarChart3 className="w-4 h-4 inline mr-2" />}
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {viewMode === 'list' && (
          <>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search members..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <select
                  value={selectedTier}
                  onChange={(e) => setSelectedTier(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Tiers</option>
                  <option value="bronze">Bronze</option>
                  <option value="silver">Silver</option>
                  <option value="gold">Gold</option>
                  <option value="platinum">Platinum</option>
                </select>
              </div>
            </div>

            {/* Members List */}
            <div className="space-y-3">
              <AnimatePresence>
                {filteredMembers.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-12 text-gray-500"
                  >
                    <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No members found</p>
                    <p className="text-sm mt-1">Start inviting to build your network!</p>
                  </motion.div>
                ) : (
                  filteredMembers.map((member, index) => (
                    <motion.div
                      key={member.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                    >
                      {/* Avatar */}
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                        {member.avatar || member.name.charAt(0).toUpperCase()}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-gray-900 truncate">{member.name}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getTierColor(member.tierLevel)}`}>
                            {getTierIcon(member.tierLevel)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 truncate">{member.email}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          Joined {new Date(member.joinedAt).toLocaleDateString()}
                        </p>
                      </div>

                      {/* Stats */}
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Users className="w-4 h-4" />
                          <span>{member.networkSize}</span>
                        </div>
                        <p className="text-xs text-gray-400">in their network</p>
                      </div>

                      {/* Expand Button */}
                      <button
                        onClick={() => toggleMemberExpand(member.id)}
                        className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        {expandedMembers.has(member.id) ? (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        )}
                      </button>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </>
        )}

        {viewMode === 'tree' && (
          <div className="text-center py-12">
            <TreePine className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">Network Tree View</h3>
            <p className="text-gray-500 mb-4">Visualize your entire referral network structure</p>
            <button
              onClick={() => window.open('/network-tree', '_blank')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Open Full Tree View
            </button>
          </div>
        )}

        {viewMode === 'stats' && (
          <div className="space-y-6">
            {/* Depth Breakdown */}
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-4">Network Depth Breakdown</h3>
              <div className="space-y-3">
                {Object.entries(networkData?.stats.depthBreakdown || {}).map(([level, count]) => {
                  const levelNum = parseInt(level.replace('level', ''))
                  const total = networkData?.stats.networkSize || 1
                  const percentage = (count / total) * 100
                  
                  return (
                    <div key={level} className="flex items-center gap-4">
                      <div className="w-20 text-sm text-gray-600">
                        Level {levelNum}
                      </div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            className={`h-full rounded-full ${
                              levelNum === 1 ? 'bg-blue-500' :
                              levelNum === 2 ? 'bg-purple-500' :
                              levelNum === 3 ? 'bg-pink-500' :
                              'bg-gray-400'
                            }`}
                          />
                        </div>
                      </div>
                      <div className="w-16 text-right text-sm font-medium text-gray-700">
                        {count}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Commission Structure */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6">
              <h3 className="text-lg font-medium text-gray-800 mb-4">Commission Structure</h3>
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center p-4 bg-white rounded-xl shadow-sm">
                  <div className="text-2xl font-bold text-blue-600">5%</div>
                  <div className="text-xs text-gray-500 mt-1">Level 1</div>
                  <div className="text-xs text-gray-400">Direct</div>
                </div>
                <div className="text-center p-4 bg-white rounded-xl shadow-sm">
                  <div className="text-2xl font-bold text-purple-600">3%</div>
                  <div className="text-xs text-gray-500 mt-1">Level 2</div>
                  <div className="text-xs text-gray-400">Indirect</div>
                </div>
                <div className="text-center p-4 bg-white rounded-xl shadow-sm">
                  <div className="text-2xl font-bold text-pink-600">2%</div>
                  <div className="text-xs text-gray-500 mt-1">Level 3</div>
                  <div className="text-xs text-gray-400">Extended</div>
                </div>
                <div className="text-center p-4 bg-white rounded-xl shadow-sm">
                  <div className="text-2xl font-bold text-gray-600">1%</div>
                  <div className="text-xs text-gray-500 mt-1">Level 4+</div>
                  <div className="text-xs text-gray-400">Deep</div>
                </div>
              </div>
            </div>

            {/* Growth Tips */}
            <div className="bg-amber-50 rounded-xl p-6">
              <h3 className="text-lg font-medium text-gray-800 mb-3 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-amber-600" />
                Growth Tips
              </h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <ArrowUpRight className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                  Share your invite link on social media regularly
                </li>
                <li className="flex items-start gap-2">
                  <ArrowUpRight className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                  Help your direct referrals succeed - their success is your success
                </li>
                <li className="flex items-start gap-2">
                  <ArrowUpRight className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                  Join our community groups to learn from top referrers
                </li>
                <li className="flex items-start gap-2">
                  <ArrowUpRight className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                  Upgrade your tier to earn higher commissions
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
