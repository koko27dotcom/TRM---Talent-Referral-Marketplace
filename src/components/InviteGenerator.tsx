import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Link2,
  Copy,
  Check,
  Share2,
  MessageCircle,
  Facebook,
  Send,
  X,
  Gift,
  Users,
  TrendingUp,
  Loader2,
  AlertCircle,
  Sparkles,
  QrCode,
  Download
} from 'lucide-react'

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

interface InviteData {
  inviteCode: string
  inviteUrl: string
  shareLinks: {
    whatsapp: string
    facebook: string
    telegram: string
    copy: string
  }
}

interface InviteGeneratorProps {
  onClose?: () => void
  embedded?: boolean
}

export default function InviteGenerator({ onClose, embedded = false }: InviteGeneratorProps) {
  const [inviteData, setInviteData] = useState<InviteData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [stats, setStats] = useState({
    totalInvited: 0,
    joined: 0,
    earnings: 0
  })

  // Get auth token
  const getAuthToken = () => localStorage.getItem('token')

  // Fetch invite data
  useEffect(() => {
    fetchInviteData()
    fetchStats()
  }, [])

  const fetchInviteData = async () => {
    try {
      setLoading(true)
      setError(null)

      const token = getAuthToken()
      if (!token) {
        throw new Error('Please log in to generate invite links')
      }

      const response = await fetch(`${API_BASE_URL}/referrals/invite`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch invite data')
      }

      const data = await response.json()
      if (data.success && data.data) {
        setInviteData(data.data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invite data')
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const token = getAuthToken()
      if (!token) return

      const response = await fetch(`${API_BASE_URL}/referrals/network`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          setStats({
            totalInvited: data.data.stats?.directReferrals || 0,
            joined: data.data.stats?.directReferrals || 0,
            earnings: data.data.stats?.networkEarnings || 0
          })
        }
      }
    } catch (err) {
      console.error('Error fetching stats:', err)
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const shareVia = (platform: string, url: string) => {
    window.open(url, '_blank', 'width=600,height=400')
  }

  // Generate QR code URL (using a free QR code API)
  const getQRCodeUrl = (url: string) => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={fetchInviteData}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    )
  }

  const containerClass = embedded 
    ? "bg-white rounded-2xl shadow-lg p-6"
    : "fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"

  const content = (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={embedded ? "" : "bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"}
    >
      {/* Header */}
      <div className="relative bg-gradient-to-br from-blue-600 to-indigo-700 p-6 text-white">
        {!embedded && onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
        
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-white/20 rounded-xl">
            <Gift className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Invite & Earn</h2>
            <p className="text-blue-100 text-sm">Share your link and earn from referrals</p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-white/20">
          <div className="text-center">
            <div className="text-2xl font-bold">{stats.totalInvited}</div>
            <div className="text-xs text-blue-100">Invited</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{stats.joined}</div>
            <div className="text-xs text-blue-100">Joined</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{stats.earnings.toLocaleString()} Ks</div>
            <div className="text-xs text-blue-100">Earned</div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Invite Link Section */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Your Invite Link
          </label>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={inviteData?.inviteUrl || ''}
                readOnly
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => copyToClipboard(inviteData?.inviteUrl || '')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-200 rounded-lg transition-colors"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4 text-gray-500" />
                )}
              </button>
            </div>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Code: <span className="font-mono font-medium">{inviteData?.inviteCode}</span>
          </p>
        </div>

        {/* QR Code Toggle */}
        <div>
          <button
            onClick={() => setShowQR(!showQR)}
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            <QrCode className="w-4 h-4" />
            {showQR ? 'Hide QR Code' : 'Show QR Code'}
          </button>
          
          <AnimatePresence>
            {showQR && inviteData?.inviteUrl && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-4 p-4 bg-gray-50 rounded-xl flex flex-col items-center">
                  <img
                    src={getQRCodeUrl(inviteData.inviteUrl)}
                    alt="QR Code"
                    className="w-48 h-48 rounded-lg"
                  />
                  <a
                    href={getQRCodeUrl(inviteData.inviteUrl)}
                    download={`invite-qr-${inviteData.inviteCode}.png`}
                    className="mt-3 flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                  >
                    <Download className="w-4 h-4" />
                    Download QR Code
                  </a>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Share Buttons */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Share Via
          </label>
          <div className="grid grid-cols-4 gap-3">
            <button
              onClick={() => shareVia('whatsapp', inviteData?.shareLinks.whatsapp || '')}
              className="flex flex-col items-center gap-2 p-3 rounded-xl bg-green-50 hover:bg-green-100 transition-colors group"
            >
              <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs text-gray-600">WhatsApp</span>
            </button>

            <button
              onClick={() => shareVia('facebook', inviteData?.shareLinks.facebook || '')}
              className="flex flex-col items-center gap-2 p-3 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors group"
            >
              <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Facebook className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs text-gray-600">Facebook</span>
            </button>

            <button
              onClick={() => shareVia('telegram', inviteData?.shareLinks.telegram || '')}
              className="flex flex-col items-center gap-2 p-3 rounded-xl bg-sky-50 hover:bg-sky-100 transition-colors group"
            >
              <div className="w-12 h-12 rounded-full bg-sky-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Send className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs text-gray-600">Telegram</span>
            </button>

            <button
              onClick={() => copyToClipboard(inviteData?.inviteUrl || '')}
              className="flex flex-col items-center gap-2 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors group"
            >
              <div className="w-12 h-12 rounded-full bg-gray-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                {copied ? (
                  <Check className="w-6 h-6 text-white" />
                ) : (
                  <Link2 className="w-6 h-6 text-white" />
                )}
              </div>
              <span className="text-xs text-gray-600">{copied ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* How it Works */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            How It Works
          </h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                1
              </div>
              <p className="text-sm text-gray-600">
                Share your unique invite link with friends
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                2
              </div>
              <p className="text-sm text-gray-600">
                They sign up as referrers using your code
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                3
              </div>
              <p className="text-sm text-gray-600">
                Earn 5% commission from their successful referrals
              </p>
            </div>
          </div>
        </div>

        {/* Benefits Preview */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-purple-50 rounded-xl">
            <Users className="w-5 h-5 text-purple-600 mb-2" />
            <div className="text-sm font-medium text-gray-800">Build Network</div>
            <div className="text-xs text-gray-500">Grow your referral team</div>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl">
            <TrendingUp className="w-5 h-5 text-emerald-600 mb-2" />
            <div className="text-sm font-medium text-gray-800">Passive Income</div>
            <div className="text-xs text-gray-500">Earn from downline activity</div>
          </div>
        </div>
      </div>
    </motion.div>
  )

  if (embedded) {
    return content
  }

  return (
    <AnimatePresence>
      <div className={containerClass}>
        {content}
      </div>
    </AnimatePresence>
  )
}
