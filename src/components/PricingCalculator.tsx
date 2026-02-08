import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Calculator, 
  Zap, 
  Calendar, 
  Tag, 
  TrendingDown, 
  AlertCircle, 
  CheckCircle2, 
  XCircle,
  Sparkles,
  Clock,
  Building2,
  Percent
} from 'lucide-react'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1'

// Types
interface PricingBreakdown {
  basePrice: number
  baseAdjustments: Array<{
    type: string
    description: string
    amount: number
    multiplier?: number
  }>
  quantity: number
  subtotal: number
  surgePricing: {
    applied: boolean
    multipliers: Array<{
      type: string
      description: string
      multiplier: number
    }>
    totalMultiplier: number
    amount: number
  }
  volumeDiscount: {
    tier: string
    discount: number
    amount: number
  }
  dynamicRules: Array<{
    name: string
    type: string
    amount: number
  }>
  promotionalCode: {
    code: string
    valid: boolean
    discountType: string
    discountValue: number
    discountAmount: number
  } | null
  finalPrice: number
  currency: string
}

interface VolumeDiscountTier {
  minJobs: number
  maxJobs: number | null
  discount: number
  label: string
}

interface PricingCalculatorProps {
  category?: string
  isFeatured?: boolean
  isUrgent?: boolean
  quantity?: number
  onPriceChange?: (price: number, breakdown: PricingBreakdown | null) => void
  showPreview?: boolean
}

export default function PricingCalculator({
  category: initialCategory = '',
  isFeatured: initialFeatured = false,
  isUrgent: initialUrgent = false,
  quantity: initialQuantity = 1,
  onPriceChange,
  showPreview = true,
}: PricingCalculatorProps) {
  // State
  const [category, setCategory] = useState(initialCategory)
  const [isFeatured, setIsFeatured] = useState(initialFeatured)
  const [isUrgent, setIsUrgent] = useState(initialUrgent)
  const [quantity, setQuantity] = useState(initialQuantity)
  const [promoCode, setPromoCode] = useState('')
  const [validatedPromoCode, setValidatedPromoCode] = useState<string | null>(null)
  
  const [pricing, setPricing] = useState<PricingBreakdown | null>(null)
  const [volumeTiers, setVolumeTiers] = useState<VolumeDiscountTier[]>([])
  const [loading, setLoading] = useState(false)
  const [promoLoading, setPromoLoading] = useState(false)
  const [error, setError] = useState('')
  const [promoError, setPromoError] = useState('')
  const [promoSuccess, setPromoSuccess] = useState('')
  
  // Categories with pricing tiers
  const categories = [
    { value: '', label: 'Standard', multiplier: 1.0 },
    { value: 'Technology', label: 'Technology', multiplier: 1.3 },
    { value: 'IT', label: 'IT', multiplier: 1.3 },
    { value: 'Software', label: 'Software', multiplier: 1.3 },
    { value: 'Executive', label: 'Executive', multiplier: 1.3 },
    { value: 'Management', label: 'Management', multiplier: 1.2 },
    { value: 'Finance', label: 'Finance', multiplier: 1.2 },
    { value: 'Healthcare', label: 'Healthcare', multiplier: 1.15 },
    { value: 'Engineering', label: 'Engineering', multiplier: 1.15 },
    { value: 'Sales', label: 'Sales', multiplier: 1.0 },
    { value: 'Marketing', label: 'Marketing', multiplier: 1.0 },
    { value: 'Customer Service', label: 'Customer Service', multiplier: 0.9 },
    { value: 'Administrative', label: 'Administrative', multiplier: 0.9 },
  ]

  // Fetch pricing calculation
  const fetchPricing = useCallback(async () => {
    setLoading(true)
    setError('')
    
    try {
      const params = new URLSearchParams({
        category: category || '',
        isFeatured: isFeatured.toString(),
        isUrgent: isUrgent.toString(),
        quantity: quantity.toString(),
        ...(validatedPromoCode && { promoCode: validatedPromoCode }),
      })
      
      const response = await fetch(`${API_BASE_URL}/pricing/calculate?${params}`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to calculate pricing')
      }
      
      setPricing(data.data.breakdown)
      onPriceChange?.(data.data.finalPrice, data.data.breakdown)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to calculate pricing'
      setError(errorMessage)
      console.error('Pricing calculation error:', err)
    } finally {
      setLoading(false)
    }
  }, [category, isFeatured, isUrgent, quantity, validatedPromoCode, onPriceChange])

  // Fetch volume discount tiers
  const fetchVolumeTiers = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/pricing/volume-discounts`)
      const data = await response.json()
      
      if (data.success) {
        setVolumeTiers(data.data.allTiers)
      }
    } catch (err) {
      console.error('Failed to fetch volume tiers:', err)
    }
  }, [])

  // Validate promo code
  const validatePromoCode = async () => {
    if (!promoCode.trim()) {
      setPromoError('Please enter a promotional code')
      return
    }
    
    setPromoLoading(true)
    setPromoError('')
    setPromoSuccess('')
    
    try {
      // Calculate current amount for validation
      const currentAmount = pricing?.subtotal || 50000
      
      const response = await fetch(`${API_BASE_URL}/pricing/promo-codes/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: promoCode.trim().toUpperCase(),
          amount: currentAmount,
          serviceType: 'job_posting',
          category,
        }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.message || 'Invalid promotional code')
      }
      
      setValidatedPromoCode(promoCode.trim().toUpperCase())
      setPromoSuccess(`Code applied! You save ${formatCurrency(data.data.discountAmount)}`)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to validate code'
      setPromoError(errorMessage)
      setValidatedPromoCode(null)
    } finally {
      setPromoLoading(false)
    }
  }

  // Remove promo code
  const removePromoCode = () => {
    setPromoCode('')
    setValidatedPromoCode(null)
    setPromoError('')
    setPromoSuccess('')
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: pricing?.currency || 'MMK',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // Format percentage
  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(0)}%`
  }

  // Get category label
  const getCategoryLabel = (value: string) => {
    return categories.find(c => c.value === value)?.label || 'Standard'
  }

  // Effects
  useEffect(() => {
    fetchVolumeTiers()
  }, [fetchVolumeTiers])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchPricing()
    }, 300) // Debounce
    
    return () => clearTimeout(timeoutId)
  }, [category, isFeatured, isUrgent, quantity, validatedPromoCode, fetchPricing])

  // Update local state when props change
  useEffect(() => {
    setCategory(initialCategory)
    setIsFeatured(initialFeatured)
    setIsUrgent(initialUrgent)
    setQuantity(initialQuantity)
  }, [initialCategory, initialFeatured, initialUrgent, initialQuantity])

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
        <div className="flex items-center gap-3">
          <Calculator className="w-6 h-6 text-white" />
          <h3 className="text-lg font-semibold text-white">Pricing Calculator</h3>
        </div>
        <p className="text-blue-100 text-sm mt-1">
          Calculate your job posting cost in real-time
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* Category Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Job Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          >
            {categories.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label} {cat.multiplier !== 1.0 && `(${cat.multiplier}x)`}
              </option>
            ))}
          </select>
          {category && categories.find(c => c.value === category)?.multiplier !== 1.0 && (
            <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              High-demand category pricing applies
            </p>
          )}
        </div>

        {/* Toggles */}
        <div className="space-y-3">
          {/* Featured Toggle */}
          <label className="flex items-center justify-between p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <div>
                <span className="font-medium text-gray-900">Featured Listing</span>
                <p className="text-xs text-gray-500">Highlight your job on homepage</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={isFeatured}
              onChange={(e) => setIsFeatured(e.target.checked)}
              className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
            />
          </label>

          {/* Urgent Toggle */}
          <label className="flex items-center justify-between p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-red-500" />
              <div>
                <span className="font-medium text-gray-900">Urgent (48hr fill)</span>
                <p className="text-xs text-gray-500">Priority placement + 2x pricing</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={isUrgent}
              onChange={(e) => setIsUrgent(e.target.checked)}
              className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
            />
          </label>
        </div>

        {/* Quantity */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Number of Jobs
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={1}
              max={100}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-24 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <span className="text-sm text-gray-500">jobs</span>
          </div>
          
          {/* Volume Discount Indicator */}
          {pricing?.volumeDiscount && pricing.volumeDiscount.discount > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg"
            >
              <p className="text-sm text-green-700 flex items-center gap-2">
                <TrendingDown className="w-4 h-4" />
                <span className="font-medium">{pricing.volumeDiscount.tier}</span>
                <span className="text-green-600">
                  (Save {formatPercentage(pricing.volumeDiscount.discount)})
                </span>
              </p>
            </motion.div>
          )}
        </div>

        {/* Promo Code */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Promotional Code
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                disabled={!!validatedPromoCode}
                placeholder="Enter code"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed uppercase"
              />
            </div>
            {validatedPromoCode ? (
              <button
                onClick={removePromoCode}
                className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={validatePromoCode}
                disabled={promoLoading || !promoCode.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {promoLoading ? (
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                ) : (
                  'Apply'
                )}
              </button>
            )}
          </div>
          
          {/* Promo Code Messages */}
          <AnimatePresence>
            {promoError && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 text-sm text-red-600 flex items-center gap-1"
              >
                <XCircle className="w-4 h-4" />
                {promoError}
              </motion.p>
            )}
            {promoSuccess && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 text-sm text-green-600 flex items-center gap-1"
              >
                <CheckCircle2 className="w-4 h-4" />
                {promoSuccess}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Pricing Breakdown */}
        {showPreview && pricing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="border-t border-gray-200 pt-4"
          >
            <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <Calculator className="w-4 h-4" />
              Pricing Breakdown
            </h4>
            
            <div className="space-y-2 text-sm">
              {/* Base Price */}
              <div className="flex justify-between text-gray-600">
                <span>Base Price</span>
                <span>{formatCurrency(pricing.basePrice)}</span>
              </div>
              
              {/* Base Adjustments */}
              <AnimatePresence>
                {pricing.baseAdjustments.map((adjustment, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="flex justify-between text-gray-600 pl-4"
                  >
                    <span className="flex items-center gap-1">
                      {adjustment.type === 'category' && <Building2 className="w-3 h-3" />}
                      {adjustment.type === 'featured' && <Sparkles className="w-3 h-3" />}
                      {adjustment.type === 'urgent' && <Zap className="w-3 h-3" />}
                      {adjustment.description}
                    </span>
                    <span className="text-amber-600">+{formatCurrency(adjustment.amount)}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {/* Subtotal */}
              <div className="flex justify-between font-medium text-gray-700 pt-2 border-t border-gray-100">
                <span>Subtotal ({pricing.quantity} job{pricing.quantity > 1 ? 's' : ''})</span>
                <span>{formatCurrency(pricing.subtotal)}</span>
              </div>
              
              {/* Surge Pricing */}
              {pricing.surgePricing.applied && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="pt-2"
                >
                  {pricing.surgePricing.multipliers.map((multiplier, index) => (
                    <div key={index} className="flex justify-between text-amber-600 pl-4">
                      <span className="flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        {multiplier.description}
                      </span>
                      <span>x{multiplier.multiplier}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-amber-700 font-medium pl-4">
                    <span>Surge Pricing Subtotal</span>
                    <span>+{formatCurrency(pricing.surgePricing.amount)}</span>
                  </div>
                </motion.div>
              )}
              
              {/* Volume Discount */}
              {pricing.volumeDiscount.discount > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-between text-green-600 pl-4"
                >
                  <span className="flex items-center gap-1">
                    <TrendingDown className="w-3 h-3" />
                    Volume Discount ({pricing.volumeDiscount.tier})
                  </span>
                  <span>-{formatCurrency(pricing.volumeDiscount.amount)}</span>
                </motion.div>
              )}
              
              {/* Dynamic Rules */}
              {pricing.dynamicRules.map((rule, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-between text-blue-600 pl-4"
                >
                  <span>{rule.name}</span>
                  <span>{rule.amount >= 0 ? '+' : '-'}{formatCurrency(Math.abs(rule.amount))}</span>
                </motion.div>
              ))}
              
              {/* Promotional Code */}
              {pricing.promotionalCode && pricing.promotionalCode.valid && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-between text-purple-600 pl-4"
                >
                  <span className="flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    Promo Code ({pricing.promotionalCode.code})
                  </span>
                  <span>-{formatCurrency(pricing.promotionalCode.discountAmount)}</span>
                </motion.div>
              )}
              
              {/* Final Price */}
              <div className="flex justify-between items-center pt-3 border-t-2 border-gray-200">
                <span className="text-lg font-semibold text-gray-900">Total</span>
                <div className="text-right">
                  <span className="text-2xl font-bold text-blue-600">
                    {formatCurrency(pricing.finalPrice)}
                  </span>
                  <span className="text-xs text-gray-500 block">{pricing.currency}</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-4">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="ml-2 text-sm text-gray-600">Calculating...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </p>
          </div>
        )}

        {/* Volume Discount Tiers Info */}
        {volumeTiers.length > 0 && (
          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-2">
              <Percent className="w-3 h-3" />
              Volume Discount Tiers
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {volumeTiers.map((tier, index) => (
                <div
                  key={index}
                  className={`text-xs p-2 rounded ${
                    pricing?.volumeDiscount?.tier === tier.label
                      ? 'bg-green-100 text-green-700 border border-green-200'
                      : 'bg-gray-50 text-gray-600'
                  }`}
                >
                  <span className="font-medium">{tier.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Weekend/Holiday Warning */}
        {(pricing?.surgePricing?.multipliers?.some(m => m.type === 'weekend' || m.type === 'holiday')) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 bg-amber-50 border border-amber-200 rounded-lg"
          >
            <p className="text-sm text-amber-700 flex items-start gap-2">
              <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>
                Weekend/holiday surge pricing is currently active. Post during weekdays for standard rates.
              </span>
            </p>
          </motion.div>
        )}
      </div>
    </div>
  )
}

// Export types for use in other components
export type { PricingBreakdown, VolumeDiscountTier, PricingCalculatorProps }
