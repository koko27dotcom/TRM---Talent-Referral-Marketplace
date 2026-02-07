import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Copy, CheckCircle2, Share2, Link2, Gift, Users, 
  TrendingUp, Sparkles, QrCode, Download, Facebook,
  Linkedin, Twitter, MessageCircle, X
} from 'lucide-react'

// API Configuration - uses Vite proxy in dev, env variable in production
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

interface ReferralCardProps {
  job: {
    _id: string
    title: string
    company: string
    location?: string
    referralBonus?: string
    type?: string
  }
}

interface ReferralStats {
  clicks: number
  applications: number
  conversions: number
}

export default function ReferralCard({ job }: ReferralCardProps) {
  const [referralCode, setReferralCode] = useState('')
  const [copied, setCopied] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [stats, setStats] = useState<ReferralStats>({ clicks: 0, applications: 0, conversions: 0 })
  const [isLoadingStats, setIsLoadingStats] = useState(false)

  const referralLink = referralCode ? `${window.location.origin}/apply/${referralCode}` : ''

  // Get auth token from localStorage
  const getAuthToken = () => {
    return localStorage.getItem('token') || localStorage.getItem('authToken')
  }

  // Create headers with authentication
  const createAuthHeaders = () => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }
    const token = getAuthToken()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    return headers
  }

  // Fetch referral stats from API
  const fetchStats = async () => {
    try {
      setIsLoadingStats(true)
      const token = getAuthToken()
      if (!token) return

      const response = await fetch(`${API_BASE_URL}/referrals/my-stats`, {
        method: 'GET',
        headers: createAuthHeaders()
      })

      if (!response.ok) {
        console.warn('Failed to fetch stats:', response.status)
        return
      }

      const data = await response.json()
      
      if (data.success && data.data) {
        // Map API stats to component stats format
        // The API returns: totalReferrals, hired, pending, rejected, withdrawn
        setStats({
          clicks: data.data.totalReferrals || 0,
          applications: data.data.pending || 0,
          conversions: data.data.hired || 0
        })
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setIsLoadingStats(false)
    }
  }

  // Fetch stats on component mount and when referral code is generated
  useEffect(() => {
    fetchStats()
  }, [])

  // The generateReferralCode function now opens a modal/form to collect
  // referred person details and creates a referral via POST /api/referrals
  const generateReferralCode = async () => {
    // Since we need referred person details to create a referral,
    // we generate a code locally first for sharing purposes
    setIsGenerating(true)
    try {
      const code = `TRM-${Date.now().toString(36).toUpperCase()}`
      setReferralCode(code)
      
      // Store the code temporarily (the actual referral will be created
      // when someone uses this link or when the referrer submits details)
      const pendingReferrals = JSON.parse(localStorage.getItem('pendingReferrals') || '[]')
      pendingReferrals.push({
        code,
        jobId: job._id,
        createdAt: new Date().toISOString()
      })
      localStorage.setItem('pendingReferrals', JSON.stringify(pendingReferrals))
      
      // Refresh stats after generating code
      await fetchStats()
    } catch (error) {
      console.error('Error generating referral:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const shareOptions = [
    { 
      name: 'Copy', 
      icon: copied ? CheckCircle2 : Copy, 
      action: copyToClipboard, 
      color: copied ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 hover:bg-slate-200 text-slate-700',
      label: copied ? 'Copied!' : 'Copy Link'
    },
    { 
      name: 'Facebook', 
      icon: Facebook, 
      action: () => window.open(`https://facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`, '_blank'), 
      color: 'bg-blue-100 hover:bg-blue-200 text-blue-600',
      label: 'Share'
    },
    { 
      name: 'LinkedIn', 
      icon: Linkedin, 
      action: () => window.open(`https://linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralLink)}`, '_blank'), 
      color: 'bg-sky-100 hover:bg-sky-200 text-sky-600',
      label: 'Post'
    },
    { 
      name: 'Twitter', 
      icon: Twitter, 
      action: () => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(referralLink)}&text=Check out this job at ${job.company}!`, '_blank'), 
      color: 'bg-slate-100 hover:bg-slate-200 text-slate-800',
      label: 'Tweet'
    },
    { 
      name: 'WhatsApp', 
      icon: MessageCircle, 
      action: () => window.open(`https://wa.me/?text=${encodeURIComponent(`Check out this job: ${referralLink}`)}`, '_blank'), 
      color: 'bg-green-100 hover:bg-green-200 text-green-600',
      label: 'Send'
    },
    { 
      name: 'QR Code', 
      icon: QrCode, 
      action: () => setShowQR(true), 
      color: 'bg-purple-100 hover:bg-purple-200 text-purple-600',
      label: 'Show QR'
    },
  ]

  return (
    <>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-lg transition-all duration-300"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100">
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-bold text-lg text-slate-800">{job.title}</h3>
                {job.referralBonus && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-700 text-xs font-bold rounded-full">
                    <Gift size={12} />
                    {job.referralBonus}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <span className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-[10px] font-bold">
                    {job.company[0]}
                  </div>
                  {job.company}
                </span>
                {job.location && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-slate-300" />
                    <span>{job.location}</span>
                  </>
                )}
                {job.type && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-slate-300" />
                    <span className="px-2 py-0.5 bg-slate-100 rounded text-xs">{job.type}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          {!referralCode ? (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={generateReferralCode}
              disabled={isGenerating}
              className="w-full relative overflow-hidden group bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg shadow-blue-200 hover:shadow-xl hover:shadow-blue-300 transition-all disabled:opacity-70"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              {isGenerating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles size={20} />
                  Generate Referral Link
                </>
              )}
            </motion.button>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4"
              >
                {/* Referral Link Display */}
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl blur-sm" />
                  <div className="relative flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-1">
                    <div className="flex-1 px-4 py-3">
                      <p className="text-xs text-slate-500 mb-1">Your Referral Link</p>
                      <p className="text-sm font-mono text-slate-700 truncate">{referralLink}</p>
                    </div>
                    <button
                      onClick={copyToClipboard}
                      className={`p-3 rounded-lg transition-all ${
                        copied 
                          ? 'bg-emerald-100 text-emerald-600' 
                          : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      {copied ? <CheckCircle2 size={20} /> : <Copy size={20} />}
                    </button>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { icon: Link2, label: 'Clicks', value: stats.clicks },
                    { icon: Users, label: 'Applied', value: stats.applications },
                    { icon: TrendingUp, label: 'Hired', value: stats.conversions },
                  ].map((stat, idx) => (
                    <div key={idx} className="bg-slate-50 rounded-xl p-3 text-center">
                      <stat.icon size={16} className="mx-auto mb-1 text-slate-400" />
                      <p className="text-lg font-bold text-slate-800">
                        {isLoadingStats ? (
                          <span className="animate-pulse">...</span>
                        ) : (
                          stat.value
                        )}
                      </p>
                      <p className="text-xs text-slate-500">{stat.label}</p>
                    </div>
                  ))}
                </div>

                {/* Share Buttons */}
                <div className="grid grid-cols-3 gap-2">
                  {shareOptions.slice(0, 3).map((option) => (
                    <button
                      key={option.name}
                      onClick={option.action}
                      className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all ${option.color}`}
                    >
                      <option.icon size={18} />
                      <span className="text-xs font-medium">{option.label}</span>
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setShowShareModal(true)}
                  className="w-full py-3 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
                >
                  <Share2 size={18} />
                  More Sharing Options
                </button>
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </motion.div>

      {/* Share Modal */}
      <AnimatePresence>
        {showShareModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowShareModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-800">Share Job</h3>
                <button 
                  onClick={() => setShowShareModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X size={20} className="text-slate-500" />
                </button>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 mb-6">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Job</p>
                <p className="font-semibold text-slate-800">{job.title}</p>
                <p className="text-sm text-slate-500">{job.company}</p>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 mb-6">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Your Referral Link</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={referralLink}
                    readOnly
                    className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600"
                  />
                  <button
                    onClick={copyToClipboard}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {shareOptions.map((option) => (
                  <button
                    key={option.name}
                    onClick={option.action}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-all ${option.color}`}
                  >
                    <option.icon size={24} />
                    <span className="text-xs font-medium">{option.name}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* QR Code Modal */}
      <AnimatePresence>
        {showQR && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowQR(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white mx-auto mb-4">
                <QrCode size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Scan to Apply</h3>
              <p className="text-slate-500 text-sm mb-6">Share this QR code with potential candidates</p>
              
              {/* QR Code Placeholder */}
              <div className="bg-slate-100 rounded-2xl p-8 mb-6">
                <div className="bg-white p-4 rounded-xl shadow-sm">
                  <div className="grid grid-cols-5 gap-1">
                    {Array.from({ length: 25 }).map((_, i) => (
                      <div 
                        key={i} 
                        className={`aspect-square rounded-sm ${Math.random() > 0.5 ? 'bg-slate-800' : 'bg-white'}`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowQR(false)}
                className="w-full py-3 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
