import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Crown,
  Award,
  Medal,
  Star,
  Zap,
  Gift,
  Clock,
  CheckCircle2,
  Lock,
  ChevronRight,
  Loader2,
  AlertCircle,
  Sparkles,
  TrendingUp,
  Target,
  Users,
  DollarSign,
  ArrowRight
} from 'lucide-react'

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

interface TierBenefit {
  type: string
  name: string
  description: string
  icon: string
  numericValue?: number
  unlocked: boolean
}

interface TierInfo {
  current: {
    tier: string
    name: string
    level: number
    color: string
    gradient: { from: string; to: string }
    icon: string
    benefits: TierBenefit[]
    commission: {
      basePercent: number
      networkPercent: {
        level1: number
        level2: number
        level3: number
        level4Plus: number
      }
    }
    payout: {
      minPayoutAmount: number
      processingDays: number
      maxPayoutAmount: number
    }
  }
  next: {
    tier: string
    name: string
    requirements: {
      minDirectReferrals: number
      minNetworkSize: number
      minEarnings: number
      minSuccessfulHires: number
    }
  } | null
  progress: number
  stats: {
    directReferrals: number
    networkSize: number
    totalEarnings: number
    successfulHires: number
  }
}

interface TierProgressProps {
  embedded?: boolean
  compact?: boolean
}

export default function TierProgress({ embedded = false, compact = false }: TierProgressProps) {
  const [tierInfo, setTierInfo] = useState<TierInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [checkingUpgrade, setCheckingUpgrade] = useState(false)
  const [upgradeResult, setUpgradeResult] = useState<any>(null)
  const [showAllTiers, setShowAllTiers] = useState(false)

  const getAuthToken = () => localStorage.getItem('token')

  useEffect(() => {
    fetchTierInfo()
  }, [])

  const fetchTierInfo = async () => {
    try {
      setLoading(true)
      setError(null)

      const token = getAuthToken()
      if (!token) {
        throw new Error('Please log in to view tier information')
      }

      const response = await fetch(`${API_BASE_URL}/referrals/tiers/my-tier`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch tier information')
      }

      const data = await response.json()
      if (data.success && data.data) {
        setTierInfo(data.data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tier information')
    } finally {
      setLoading(false)
    }
  }

  const checkUpgrade = async () => {
    try {
      setCheckingUpgrade(true)
      const token = getAuthToken()
      
      const response = await fetch(`${API_BASE_URL}/referrals/tiers/check-upgrade`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setUpgradeResult(data.data)
        
        // Refresh tier info if upgraded
        if (data.data?.upgraded) {
          await fetchTierInfo()
        }
        
        // Clear result after 5 seconds
        setTimeout(() => setUpgradeResult(null), 5000)
      }
    } catch (err) {
      console.error('Error checking upgrade:', err)
    } finally {
      setCheckingUpgrade(false)
    }
  }

  const getTierIcon = (tier: string, className = "w-6 h-6") => {
    switch (tier) {
      case 'platinum': return <Crown className={className} />
      case 'gold': return <Award className={className} />
      case 'silver': return <Medal className={className} />
      default: return <Star className={className} />
    }
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'platinum':
        return {
          bg: 'bg-gradient-to-br from-gray-100 to-gray-200',
          text: 'text-gray-800',
          border: 'border-gray-300',
          accent: 'text-gray-600',
          progress: 'bg-gray-500'
        }
      case 'gold':
        return {
          bg: 'bg-gradient-to-br from-amber-100 to-yellow-100',
          text: 'text-amber-800',
          border: 'border-amber-300',
          accent: 'text-amber-600',
          progress: 'bg-amber-500'
        }
      case 'silver':
        return {
          bg: 'bg-gradient-to-br from-slate-100 to-gray-100',
          text: 'text-slate-800',
          border: 'border-slate-300',
          accent: 'text-slate-600',
          progress: 'bg-slate-500'
        }
      default:
        return {
          bg: 'bg-gradient-to-br from-orange-100 to-amber-50',
          text: 'text-orange-800',
          border: 'border-orange-300',
          accent: 'text-orange-600',
          progress: 'bg-orange-500'
        }
    }
  }

  const getBenefitIcon = (type: string) => {
    switch (type) {
      case 'commission_boost': return <TrendingUp className="w-4 h-4" />
      case 'payout_speed': return <Zap className="w-4 h-4" />
      case 'bonus_amount': return <Gift className="w-4 h-4" />
      case 'exclusive_jobs': return <Star className="w-4 h-4" />
      case 'priority_support': return <Clock className="w-4 h-4" />
      case 'dedicated_manager': return <Users className="w-4 h-4" />
      case 'custom_branding': return <Award className="w-4 h-4" />
      case 'early_access': return <Sparkles className="w-4 h-4" />
      default: return <CheckCircle2 className="w-4 h-4" />
    }
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
          onClick={fetchTierInfo}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    )
  }

  if (!tierInfo) return null

  const colors = getTierColor(tierInfo.current.tier)
  const isMaxTier = !tierInfo.next

  if (compact) {
    return (
      <div className={`${colors.bg} rounded-xl p-4 ${colors.border} border`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 bg-white/50 rounded-lg ${colors.accent}`}>
              {getTierIcon(tierInfo.current.tier)}
            </div>
            <div>
              <div className={`font-semibold ${colors.text}`}>
                {tierInfo.current.name}
              </div>
              <div className="text-xs text-gray-500">
                {isMaxTier ? 'Maximum tier reached!' : `${tierInfo.progress}% to next tier`}
              </div>
            </div>
          </div>
          {!isMaxTier && (
            <div className="w-16">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${tierInfo.progress}%` }}
                  className={`h-full rounded-full ${colors.progress}`}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className={`${colors.bg} p-6`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-4 bg-white/50 rounded-2xl ${colors.accent}`}>
              {getTierIcon(tierInfo.current.tier, "w-8 h-8")}
            </div>
            <div>
              <h2 className={`text-2xl font-bold ${colors.text}`}>
                {tierInfo.current.name}
              </h2>
              <p className={`text-sm ${colors.accent}`}>
                Level {tierInfo.current.level} Tier
              </p>
            </div>
          </div>
          
          {/* Upgrade Button */}
          {!isMaxTier && (
            <button
              onClick={checkUpgrade}
              disabled={checkingUpgrade}
              className="px-4 py-2 bg-white rounded-xl font-medium text-gray-800 shadow-sm hover:shadow-md transition-all disabled:opacity-50"
            >
              {checkingUpgrade ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <span className="flex items-center gap-2">
                  Check Upgrade
                  <ChevronRight className="w-4 h-4" />
                </span>
              )}
            </button>
          )}
        </div>

        {/* Upgrade Result Notification */}
        <AnimatePresence>
          {upgradeResult && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`mt-4 p-4 rounded-xl ${
                upgradeResult.upgraded 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-blue-100 text-blue-800'
              }`}
            >
              {upgradeResult.upgraded ? (
                <div className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5" />
                  <div>
                    <p className="font-semibold">
                      🎉 Upgraded to {upgradeResult.newTierName}!
                    </p>
                    {upgradeResult.bonus > 0 && (
                      <p className="text-sm">
                        Bonus: {upgradeResult.bonus.toLocaleString()} Ks added to your balance
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Target className="w-5 h-5" />
                  <p>Keep going! You're {100 - tierInfo.progress}% away from the next tier</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="p-6 space-y-6">
        {/* Progress to Next Tier */}
        {!isMaxTier && tierInfo.next && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Progress to {tierInfo.next.name}
              </span>
              <span className="text-sm font-bold text-blue-600">
                {tierInfo.progress}%
              </span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${tierInfo.progress}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className={`h-full rounded-full ${colors.progress}`}
              />
            </div>
          </div>
        )}

        {isMaxTier && (
          <div className="bg-gradient-to-r from-amber-100 to-yellow-100 rounded-xl p-4 flex items-center gap-3">
            <Crown className="w-6 h-6 text-amber-600" />
            <div>
              <p className="font-semibold text-amber-800">Maximum Tier Achieved!</p>
              <p className="text-sm text-amber-700">
                You're at the top! Enjoy all Platinum benefits.
              </p>
            </div>
          </div>
        )}

        {/* Current Benefits */}
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Your Benefits</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {tierInfo.current.benefits.map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl"
              >
                <div className={`p-2 rounded-lg ${colors.bg} ${colors.accent}`}>
                  {getBenefitIcon(benefit.type)}
                </div>
                <div>
                  <p className="font-medium text-gray-800 text-sm">{benefit.name}</p>
                  <p className="text-xs text-gray-500">{benefit.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Commission Info */}
        <div className="bg-blue-50 rounded-xl p-4">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-blue-600" />
            Commission Structure
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Base Commission</p>
              <p className="text-xl font-bold text-blue-600">
                {tierInfo.current.commission.basePercent}%
              </p>
              <p className="text-xs text-gray-500">of referral bonus</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Payout Speed</p>
              <p className="text-xl font-bold text-blue-600">
                {tierInfo.current.payout.processingDays} days
              </p>
              <p className="text-xs text-gray-500">processing time</p>
            </div>
          </div>
        </div>

        {/* Requirements for Next Tier */}
        {!isMaxTier && tierInfo.next && (
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Requirements for {tierInfo.next.name}
            </h3>
            <div className="space-y-3">
              {tierInfo.next.requirements.minDirectReferrals > 0 && (
                <RequirementRow
                  icon={<Users className="w-4 h-4" />}
                  label="Direct Referrals"
                  current={tierInfo.stats.directReferrals}
                  required={tierInfo.next.requirements.minDirectReferrals}
                />
              )}
              {tierInfo.next.requirements.minNetworkSize > 0 && (
                <RequirementRow
                  icon={<TrendingUp className="w-4 h-4" />}
                  label="Network Size"
                  current={tierInfo.stats.networkSize}
                  required={tierInfo.next.requirements.minNetworkSize}
                />
              )}
              {tierInfo.next.requirements.minEarnings > 0 && (
                <RequirementRow
                  icon={<DollarSign className="w-4 h-4" />}
                  label="Total Earnings"
                  current={tierInfo.stats.totalEarnings}
                  required={tierInfo.next.requirements.minEarnings}
                  format="currency"
                />
              )}
              {tierInfo.next.requirements.minSuccessfulHires > 0 && (
                <RequirementRow
                  icon={<CheckCircle2 className="w-4 h-4" />}
                  label="Successful Hires"
                  current={tierInfo.stats.successfulHires}
                  required={tierInfo.next.requirements.minSuccessfulHires}
                />
              )}
            </div>
          </div>
        )}

        {/* View All Tiers Toggle */}
        <button
          onClick={() => setShowAllTiers(!showAllTiers)}
          className="w-full py-3 text-center text-blue-600 font-medium hover:bg-blue-50 rounded-xl transition-colors"
        >
          {showAllTiers ? 'Hide' : 'View'} All Tiers
        </button>

        {/* All Tiers Overview */}
        <AnimatePresence>
          {showAllTiers && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="space-y-3 pt-4 border-t">
                {['bronze', 'silver', 'gold', 'platinum'].map((tier, index) => {
                  const isCurrent = tier === tierInfo.current.tier
                  const isLocked = index + 1 > tierInfo.current.level
                  
                  return (
                    <div
                      key={tier}
                      className={`flex items-center gap-4 p-4 rounded-xl border ${
                        isCurrent 
                          ? 'border-blue-500 bg-blue-50' 
                          : isLocked 
                            ? 'border-gray-200 bg-gray-50 opacity-60'
                            : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div className={`p-2 rounded-lg ${getTierColor(tier).bg}`}>
                        {getTierIcon(tier)}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium capitalize">{tier} Referrer</p>
                        <p className="text-xs text-gray-500">
                          Level {index + 1}
                        </p>
                      </div>
                      {isCurrent && (
                        <span className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded-full">
                          Current
                        </span>
                      )}
                      {isLocked && (
                        <Lock className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// Helper component for requirement rows
function RequirementRow({ 
  icon, 
  label, 
  current, 
  required, 
  format = 'number' 
}: { 
  icon: React.ReactNode
  label: string
  current: number
  required: number
  format?: 'number' | 'currency'
}) {
  const percentage = Math.min((current / required) * 100, 100)
  const isComplete = current >= required
  
  const formatValue = (value: number) => {
    if (format === 'currency') {
      return `${value.toLocaleString()} Ks`
    }
    return value.toLocaleString()
  }
  
  return (
    <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
      <div className={`p-2 rounded-lg ${isComplete ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-600'}`}>
        {isComplete ? <CheckCircle2 className="w-4 h-4" /> : icon}
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-gray-700">{label}</span>
          <span className={`text-sm font-bold ${isComplete ? 'text-green-600' : 'text-gray-600'}`}>
            {formatValue(current)} / {formatValue(required)}
          </span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            className={`h-full rounded-full ${isComplete ? 'bg-green-500' : 'bg-blue-500'}`}
          />
        </div>
      </div>
    </div>
  )
}
