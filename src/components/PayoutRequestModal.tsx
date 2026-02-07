import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, Wallet, ChevronRight, AlertCircle, Check, 
  Smartphone, Building2, CreditCard, ArrowRight,
  Info, Shield, Clock
} from 'lucide-react'

interface PayoutMethod {
  id: string
  type: 'kbzpay' | 'wavepay' | 'bank_transfer'
  name: string
  accountNumber: string
  accountName: string
  isDefault: boolean
  bankName?: string
}

interface EligibleReferral {
  id: string
  jobTitle: string
  company: string
  hiredAt: string
  bonusAmount: number
  payoutAmount: number
}

interface PayoutRequestModalProps {
  isOpen: boolean
  onClose: () => void
  availableAmount: number
  selectedReferrals: EligibleReferral[]
  payoutMethods: PayoutMethod[]
}

export default function PayoutRequestModal({ 
  isOpen, 
  onClose, 
  availableAmount,
  selectedReferrals,
  payoutMethods 
}: PayoutRequestModalProps) {
  const [step, setStep] = useState<'amount' | 'method' | 'confirm' | 'success'>('amount')
  const [selectedAmount, setSelectedAmount] = useState<number>(0)
  const [selectedMethodId, setSelectedMethodId] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  const MIN_PAYOUT = 50000
  const PLATFORM_FEE_PERCENT = 15
  const REFERRER_SHARE_PERCENT = 85

  // Calculate total from selected referrals or use custom amount
  const totalSelectedAmount = selectedReferrals.reduce((sum, r) => sum + r.payoutAmount, 0)
  const payoutAmount = selectedReferrals.length > 0 ? totalSelectedAmount : selectedAmount
  const platformFee = Math.round(payoutAmount * (PLATFORM_FEE_PERCENT / 100))
  const referrerAmount = payoutAmount

  const selectedMethod = payoutMethods.find(m => m.id === selectedMethodId)
  const defaultMethod = payoutMethods.find(m => m.isDefault)

  const handleAmountSubmit = () => {
    if (payoutAmount >= MIN_PAYOUT) {
      setStep('method')
    }
  }

  const handleMethodSubmit = () => {
    if (selectedMethodId || defaultMethod) {
      setStep('confirm')
    }
  }

  const handleConfirm = async () => {
    setIsSubmitting(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000))
    setIsSubmitting(false)
    setStep('success')
  }

  const handleClose = () => {
    setStep('amount')
    setSelectedAmount(0)
    setSelectedMethodId('')
    setAgreedToTerms(false)
    onClose()
  }

  const getMethodIcon = (type: string) => {
    switch (type) {
      case 'kbzpay': return <Smartphone className="w-6 h-6" />
      case 'wavepay': return <Smartphone className="w-6 h-6" />
      case 'bank_transfer': return <Building2 className="w-6 h-6" />
      default: return <CreditCard className="w-6 h-6" />
    }
  }

  const getMethodColor = (type: string) => {
    switch (type) {
      case 'kbzpay': return 'from-yellow-400 to-orange-500'
      case 'wavepay': return 'from-blue-400 to-cyan-500'
      case 'bank_transfer': return 'from-emerald-400 to-green-500'
      default: return 'from-slate-400 to-slate-500'
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                  <Wallet className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Request Payout</h2>
                  <p className="text-blue-100 text-sm">Step {step === 'amount' ? '1' : step === 'method' ? '2' : step === 'confirm' ? '3' : '4'} of 4</p>
                </div>
              </div>
              <button 
                onClick={handleClose}
                className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="flex h-1 bg-slate-100">
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
              style={{ 
                width: step === 'amount' ? '25%' : step === 'method' ? '50%' : step === 'confirm' ? '75%' : '100%' 
              }}
            />
          </div>

          {/* Content */}
          <div className="p-6">
            {step === 'amount' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                {selectedReferrals.length > 0 ? (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-slate-800">Selected Referrals</h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {selectedReferrals.map((referral) => (
                        <div key={referral.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                          <div>
                            <p className="font-medium text-slate-800">{referral.jobTitle}</p>
                            <p className="text-sm text-slate-500">{referral.company}</p>
                          </div>
                          <p className="font-semibold text-emerald-600">{referral.payoutAmount.toLocaleString()} MMK</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-100">
                      <span className="font-semibold text-slate-800">Total Payout Amount</span>
                      <span className="text-2xl font-bold text-blue-600">{payoutAmount.toLocaleString()} MMK</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Enter Payout Amount
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={selectedAmount || ''}
                          onChange={(e) => setSelectedAmount(Number(e.target.value))}
                          placeholder="0"
                          min={MIN_PAYOUT}
                          max={availableAmount}
                          className="w-full px-4 py-4 text-3xl font-bold text-slate-800 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">MMK</span>
                      </div>
                    </div>

                    {/* Quick Amount Buttons */}
                    <div className="flex flex-wrap gap-2">
                      {[50000, 100000, 200000, 500000].map((amount) => (
                        <button
                          key={amount}
                          onClick={() => setSelectedAmount(amount)}
                          disabled={amount > availableAmount}
                          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium text-slate-700 transition-colors"
                        >
                          {amount.toLocaleString()}
                        </button>
                      ))}
                    </div>

                    {/* Available Balance */}
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                      <span className="text-slate-600">Available Balance</span>
                      <span className="font-semibold text-slate-800">{availableAmount.toLocaleString()} MMK</span>
                    </div>
                  </div>
                )}

                {/* Minimum Threshold Warning */}
                {payoutAmount > 0 && payoutAmount < MIN_PAYOUT && (
                  <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                    <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                    <p className="text-sm text-amber-700">
                      Minimum payout amount is {MIN_PAYOUT.toLocaleString()} MMK
                    </p>
                  </div>
                )}

                {/* Fee Breakdown */}
                {payoutAmount >= MIN_PAYOUT && (
                  <div className="space-y-2 p-4 bg-slate-50 rounded-xl">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Gross Amount</span>
                      <span className="font-medium">{Math.round(payoutAmount / (REFERRER_SHARE_PERCENT / 100)).toLocaleString()} MMK</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Platform Fee ({PLATFORM_FEE_PERCENT}%)</span>
                      <span className="font-medium text-red-500">-{platformFee.toLocaleString()} MMK</span>
                    </div>
                    <div className="border-t border-slate-200 pt-2 flex items-center justify-between">
                      <span className="font-semibold text-slate-800">You Receive</span>
                      <span className="text-xl font-bold text-emerald-600">{referrerAmount.toLocaleString()} MMK</span>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleAmountSubmit}
                  disabled={payoutAmount < MIN_PAYOUT || payoutAmount > availableAmount}
                  className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-blue-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  Continue
                  <ChevronRight className="w-5 h-5" />
                </button>
              </motion.div>
            )}

            {step === 'method' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <h3 className="font-semibold text-slate-800 mb-4">Select Payment Method</h3>
                
                <div className="space-y-3">
                  {payoutMethods.map((method) => (
                    <button
                      key={method.id}
                      onClick={() => setSelectedMethodId(method.id)}
                      className={`w-full p-4 rounded-xl border-2 transition-all text-left flex items-center gap-4 ${
                        (selectedMethodId === method.id || (!selectedMethodId && method.isDefault))
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getMethodColor(method.type)} flex items-center justify-center text-white`}>
                        {getMethodIcon(method.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-800">{method.name}</span>
                          {method.isDefault && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-500">{method.accountNumber}</p>
                        <p className="text-sm text-slate-400">{method.accountName}</p>
                      </div>
                      {(selectedMethodId === method.id || (!selectedMethodId && method.isDefault)) && (
                        <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setStep('amount')}
                    className="flex-1 py-3 border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleMethodSubmit}
                    className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-blue-500/25 transition-all flex items-center justify-center gap-2"
                  >
                    Continue
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            )}

            {step === 'confirm' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center mx-auto mb-4">
                    <Shield className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800">Confirm Payout Request</h3>
                  <p className="text-slate-500 mt-1">Please review your payout details</p>
                </div>

                <div className="space-y-3 p-4 bg-slate-50 rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Amount</span>
                    <span className="font-semibold text-slate-800">{payoutAmount.toLocaleString()} MMK</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Payment Method</span>
                    <span className="font-semibold text-slate-800">{(selectedMethod || defaultMethod)?.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Account</span>
                    <span className="font-semibold text-slate-800">{(selectedMethod || defaultMethod)?.accountNumber}</span>
                  </div>
                  <div className="border-t border-slate-200 pt-3 flex items-center justify-between">
                    <span className="font-semibold text-slate-800">You Will Receive</span>
                    <span className="text-xl font-bold text-emerald-600">{referrerAmount.toLocaleString()} MMK</span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl">
                  <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-700">
                    <p className="font-medium mb-1">Processing Time</p>
                    <p>Payouts are typically processed within 1-3 business days. You will receive a notification once your payout is complete.</p>
                  </div>
                </div>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 mt-0.5"
                  />
                  <span className="text-sm text-slate-600">
                    I confirm that the payment details are correct and agree to the platform's payout terms and conditions.
                  </span>
                </label>

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep('method')}
                    className="flex-1 py-3 border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={!agreedToTerms || isSubmitting}
                    className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-blue-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Clock className="w-5 h-5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        Confirm Request
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {step === 'success' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center mx-auto mb-6"
                >
                  <Check className="w-10 h-10 text-white" />
                </motion.div>
                
                <h3 className="text-2xl font-bold text-slate-800 mb-2">Payout Requested!</h3>
                <p className="text-slate-500 mb-6">
                  Your payout request for <span className="font-semibold text-slate-800">{referrerAmount.toLocaleString()} MMK</span> has been submitted successfully.
                </p>

                <div className="p-4 bg-slate-50 rounded-xl mb-6 text-left">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-500">Request Number</span>
                    <span className="font-mono font-semibold text-slate-800">PYO-202401-0004</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Status</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">
                      <Clock className="w-3 h-3" />
                      Pending
                    </span>
                  </div>
                </div>

                <p className="text-sm text-slate-500 mb-6">
                  You will receive a notification once your payout is processed.
                </p>

                <button
                  onClick={handleClose}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-blue-500/25 transition-all"
                >
                  Done
                </button>
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
