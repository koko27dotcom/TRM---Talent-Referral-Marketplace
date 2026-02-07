import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  Zap,
  Crown,
  Target,
  DollarSign,
  Clock,
  ChevronRight,
  X,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Info
} from 'lucide-react'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

interface BoostJobButtonProps {
  jobId: string
  jobTitle: string
  companyId: string
  variant?: 'primary' | 'secondary' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  onBoostSuccess?: () => void
}

interface SlotOption {
  position: number
  isAvailable: boolean
  currentBid: number
  minimumBid: number
  minimumNextBid: number
}

export default function BoostJobButton({
  jobId,
  jobTitle,
  companyId,
  variant = 'primary',
  size = 'md',
  className = '',
  onBoostSuccess,
}: BoostJobButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [step, setStep] = useState<'slots' | 'bid' | 'confirm' | 'success'>('slots')
  const [slots, setSlots] = useState<SlotOption[]>([])
  const [selectedSlot, setSelectedSlot] = useState<SlotOption | null>(null)
  const [bidAmount, setBidAmount] = useState('')
  const [durationDays, setDurationDays] = useState(7)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchAvailableSlots = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_BASE_URL}/v1/featured-jobs/slots`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      const data = await response.json()
      
      if (data.success) {
        setSlots(data.data.slots)
      }
    } catch (err) {
      setError('Failed to load available slots')
    } finally {
      setLoading(false)
    }
  }

  const openModal = () => {
    setIsModalOpen(true)
    setStep('slots')
    setSelectedSlot(null)
    setBidAmount('')
    setError('')
    fetchAvailableSlots()
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setStep('slots')
    setSelectedSlot(null)
    setBidAmount('')
    setError('')
  }

  const selectSlot = (slot: SlotOption) => {
    setSelectedSlot(slot)
    setBidAmount(slot.isAvailable ? slot.minimumBid.toString() : slot.minimumNextBid.toString())
    setStep('bid')
  }

  const handleBidSubmit = () => {
    if (!selectedSlot || !bidAmount) return
    setStep('confirm')
  }

  const placeBid = async () => {
    if (!selectedSlot || !bidAmount) return
    
    try {
      setLoading(true)
      setError('')
      
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_BASE_URL}/v1/featured-jobs/bid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          jobId,
          slotPosition: selectedSlot.position,
          bidAmount: parseInt(bidAmount),
          durationDays,
        }),
      })
      
      const data = await response.json()
      
      if (data.success) {
        setStep('success')
        onBoostSuccess?.()
      } else {
        setError(data.message || 'Failed to place bid')
      }
    } catch (err) {
      setError('Failed to place bid. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const getButtonStyles = () => {
    const baseStyles = 'inline-flex items-center gap-2 font-semibold rounded-lg transition-all duration-200'
    
    const sizeStyles = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base',
    }
    
    const variantStyles = {
      primary: 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white hover:from-yellow-500 hover:to-orange-600 shadow-lg shadow-yellow-500/25',
      secondary: 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 shadow-lg shadow-blue-500/25',
      outline: 'border-2 border-yellow-400 text-yellow-600 hover:bg-yellow-50',
    }
    
    return `${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`
  }

  const getPositionIcon = (position: number) => {
    if (position === 1) return <Crown className="w-5 h-5" />
    if (position <= 3) return <Zap className="w-5 h-5" />
    return <Target className="w-5 h-5" />
  }

  const getPositionColor = (position: number) => {
    if (position === 1) return 'from-yellow-400 to-orange-500'
    if (position === 2) return 'from-blue-400 to-blue-600'
    if (position === 3) return 'from-purple-400 to-purple-600'
    return 'from-slate-400 to-slate-600'
  }

  return (
    <>
      <button
        onClick={openModal}
        className={getButtonStyles()}
      >
        <Sparkles className="w-4 h-4" />
        Boost Job
      </button>

      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={closeModal}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-800">
                        {step === 'success' ? 'Success!' : 'Boost Your Job'}
                      </h3>
                      <p className="text-sm text-slate-500">
                        {jobTitle}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={closeModal}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-600 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}

                {step === 'slots' && (
                  <div className="space-y-4">
                    <p className="text-slate-600 text-sm">
                      Select a position to feature your job. Higher positions get more visibility.
                    </p>
                    
                    {loading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        {slots.map((slot) => (
                          <motion.button
                            key={slot.position}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => selectSlot(slot)}
                            className={`p-4 rounded-xl border-2 text-left transition-all ${
                              slot.isAvailable
                                ? 'border-slate-200 hover:border-blue-300 bg-white'
                                : 'border-orange-200 bg-orange-50'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <div className={`w-8 h-8 bg-gradient-to-br ${getPositionColor(slot.position)} rounded-lg flex items-center justify-center`}>
                                {getPositionIcon(slot.position)}
                              </div>
                              <span className="font-bold text-slate-800">Position {slot.position}</span>
                            </div>
                            <p className="text-sm text-slate-500">
                              Min: {slot.minimumBid.toLocaleString()} MMK
                            </p>
                            {!slot.isAvailable && (
                              <p className="text-xs text-orange-600 mt-1">
                                Current: {slot.currentBid.toLocaleString()} MMK
                              </p>
                            )}
                            <span className={`inline-block mt-2 text-xs font-medium px-2 py-1 rounded-full ${
                              slot.isAvailable
                                ? 'bg-green-100 text-green-600'
                                : 'bg-orange-100 text-orange-600'
                            }`}>
                              {slot.isAvailable ? 'Available' : 'Outbid to win'}
                            </span>
                          </motion.button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {step === 'bid' && selectedSlot && (
                  <div className="space-y-6">
                    <div className="p-4 bg-slate-50 rounded-xl">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-10 h-10 bg-gradient-to-br ${getPositionColor(selectedSlot.position)} rounded-lg flex items-center justify-center`}>
                          {getPositionIcon(selectedSlot.position)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">Position {selectedSlot.position}</p>
                          <p className="text-sm text-slate-500">
                            {selectedSlot.isAvailable ? 'Available' : 'Current bid to beat'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Your Bid Amount (MMK)
                      </label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                          type="number"
                          value={bidAmount}
                          onChange={(e) => setBidAmount(e.target.value)}
                          min={selectedSlot.isAvailable ? selectedSlot.minimumBid : selectedSlot.minimumNextBid}
                          className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter bid amount"
                        />
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Minimum bid: {(selectedSlot.isAvailable ? selectedSlot.minimumBid : selectedSlot.minimumNextBid).toLocaleString()} MMK
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Duration
                      </label>
                      <div className="flex items-center gap-4">
                        <input
                          type="range"
                          min="3"
                          max="14"
                          value={durationDays}
                          onChange={(e) => setDurationDays(parseInt(e.target.value))}
                          className="flex-1"
                        />
                        <span className="text-sm font-medium text-slate-700 w-20">
                          {durationDays} days
                        </span>
                      </div>
                    </div>

                    <div className="p-4 bg-blue-50 rounded-xl">
                      <div className="flex items-start gap-2">
                        <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-blue-700">
                          Your job will be featured prominently on the homepage carousel, 
                          increasing visibility by up to 500%.
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={handleBidSubmit}
                      disabled={!bidAmount || parseInt(bidAmount) < (selectedSlot.isAvailable ? selectedSlot.minimumBid : selectedSlot.minimumNextBid)}
                      className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Continue
                    </button>
                  </div>
                )}

                {step === 'confirm' && selectedSlot && (
                  <div className="space-y-6">
                    <div className="p-4 bg-slate-50 rounded-xl space-y-3">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Position</span>
                        <span className="font-semibold text-slate-800">#{selectedSlot.position}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Bid Amount</span>
                        <span className="font-semibold text-slate-800">{parseInt(bidAmount).toLocaleString()} MMK</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Duration</span>
                        <span className="font-semibold text-slate-800">{durationDays} days</span>
                      </div>
                      <div className="border-t border-slate-200 pt-3 flex justify-between">
                        <span className="font-semibold text-slate-800">Total</span>
                        <span className="font-bold text-slate-800">{parseInt(bidAmount).toLocaleString()} MMK</span>
                      </div>
                    </div>

                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-yellow-700">
                          You will be redirected to payment after confirmation. 
                          Your featured slot will be activated once payment is complete.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => setStep('bid')}
                        className="flex-1 py-3 border border-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        Back
                      </button>
                      <button
                        onClick={placeBid}
                        disabled={loading}
                        className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all disabled:opacity-50"
                      >
                        {loading ? (
                          <span className="flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Processing...
                          </span>
                        ) : (
                          'Confirm & Pay'
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {step === 'success' && (
                  <div className="text-center py-8">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-20 h-20 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center"
                    >
                      <CheckCircle className="w-10 h-10 text-green-500" />
                    </motion.div>
                    <h4 className="text-xl font-bold text-slate-800 mb-2">
                      Bid Placed Successfully!
                    </h4>
                    <p className="text-slate-600 mb-6">
                      Your job has been submitted for featuring. Complete the payment to activate your featured slot.
                    </p>
                    <button
                      onClick={closeModal}
                      className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all"
                    >
                      Done
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
