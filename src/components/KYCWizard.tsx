import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Shield, 
  Smartphone, 
  Mail, 
  CreditCard, 
  Camera, 
  MapPin, 
  Building2, 
  CheckCircle2, 
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Upload,
  FileCheck,
  X
} from 'lucide-react'
import { KYCDocumentUpload } from './KYCDocumentUpload'
import { KYCStatusBadge } from './KYCStatusBadge'

interface KYCWizardProps {
  onComplete?: () => void
  onCancel?: () => void
  initialLevel?: number
  targetLevel?: number
}

interface KYCStatus {
  currentLevel: number
  targetLevel: number
  status: string
  levelStatus: {
    level1: {
      phoneVerified: boolean
      emailVerified: boolean
    }
    level2: {
      nrcVerified: boolean
      selfieVerified: boolean
    }
    level3: {
      addressVerified: boolean
      bankVerified: boolean
    }
    level4: {
      businessRegistrationVerified: boolean
      tinVerified: boolean
    }
  }
}

interface Step {
  id: string
  title: string
  description: string
  icon: React.ElementType
  level: number
}

const STEPS: Step[] = [
  {
    id: 'phone',
    title: 'Phone Verification',
    description: 'Verify your Myanmar mobile number',
    icon: Smartphone,
    level: 1,
  },
  {
    id: 'email',
    title: 'Email Verification',
    description: 'Confirm your email address',
    icon: Mail,
    level: 1,
  },
  {
    id: 'nrc',
    title: 'NRC Upload',
    description: 'Upload your National Registration Card',
    icon: CreditCard,
    level: 2,
  },
  {
    id: 'selfie',
    title: 'Selfie Verification',
    description: 'Take a photo to verify your identity',
    icon: Camera,
    level: 2,
  },
  {
    id: 'address',
    title: 'Address Verification',
    description: 'Provide your current address in Myanmar',
    icon: MapPin,
    level: 3,
  },
  {
    id: 'bank',
    title: 'Bank Account',
    description: 'Add your Myanmar bank account details',
    icon: Building2,
    level: 3,
  },
  {
    id: 'business',
    title: 'Business Registration',
    description: 'For corporate accounts - upload business docs',
    icon: Shield,
    level: 4,
  },
]

const LEVEL_NAMES: Record<number, string> = {
  0: 'Not Verified',
  1: 'Basic',
  2: 'Verified',
  3: 'Advanced',
  4: 'Business',
}

const LEVEL_DESCRIPTIONS: Record<number, string> = {
  0: 'Complete verification to unlock features',
  1: 'Phone and email verified - Basic trust level',
  2: 'ID verified - Can receive referral payments',
  3: 'Address and bank verified - Higher payment limits',
  4: 'Business verified - Full corporate access',
}

export function KYCWizard({ 
  onComplete, 
  onCancel, 
  initialLevel = 0,
  targetLevel = 2 
}: KYCWizardProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [kycStatus, setKycStatus] = useState<KYCStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form states
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [email, setEmail] = useState('')
  const [nrcNumber, setNrcNumber] = useState('')
  const [address, setAddress] = useState({
    street: '',
    township: '',
    city: '',
    state: '',
    postalCode: '',
  })
  const [bankDetails, setBankDetails] = useState({
    bankName: '',
    accountNumber: '',
    accountHolderName: '',
    branch: '',
  })
  const [businessDetails, setBusinessDetails] = useState({
    businessType: '',
    companyName: '',
    registrationNumber: '',
    tinNumber: '',
  })

  // Document states
  const [nrcFrontDoc, setNrcFrontDoc] = useState<File | null>(null)
  const [nrcBackDoc, setNrcBackDoc] = useState<File | null>(null)
  const [selfieDoc, setSelfieDoc] = useState<File | null>(null)

  const fetchKYCStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/kyc/status', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      })
      
      if (!response.ok) throw new Error('Failed to fetch KYC status')
      
      const data = await response.json()
      setKycStatus(data.data)
    } catch (err) {
      setError('Failed to load KYC status')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchKYCStatus()
  }, [fetchKYCStatus])

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const handlePhoneVerify = async () => {
    setIsSubmitting(true)
    setError(null)
    
    try {
      const response = await fetch('/api/v1/kyc/verify/phone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ phone, otp }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Phone verification failed')
      }
      
      handleNext()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEmailVerify = async () => {
    setIsSubmitting(true)
    setError(null)
    
    try {
      const response = await fetch('/api/v1/kyc/verify/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ email }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Email verification failed')
      }
      
      handleNext()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddressSubmit = async () => {
    setIsSubmitting(true)
    setError(null)
    
    try {
      const response = await fetch('/api/v1/kyc/verify/address', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(address),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Address verification failed')
      }
      
      handleNext()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBankSubmit = async () => {
    setIsSubmitting(true)
    setError(null)
    
    try {
      const response = await fetch('/api/v1/kyc/verify/bank', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(bankDetails),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Bank verification failed')
      }
      
      handleNext()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBusinessSubmit = async () => {
    setIsSubmitting(true)
    setError(null)
    
    try {
      const response = await fetch('/api/v1/kyc/verify/business', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(businessDetails),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Business verification failed')
      }
      
      handleSubmitForReview()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmitForReview = async () => {
    setIsSubmitting(true)
    setError(null)
    
    try {
      const response = await fetch('/api/v1/kyc/submit', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to submit for review')
      }
      
      onComplete?.()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSkipLevel = () => {
    // Skip to next level's first step
    const currentLevel = STEPS[currentStep].level
    const nextLevelStep = STEPS.findIndex(step => step.level > currentLevel)
    if (nextLevelStep !== -1) {
      setCurrentStep(nextLevelStep)
    }
  }

  const renderStepContent = () => {
    const step = STEPS[currentStep]

    switch (step.id) {
      case 'phone':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Myanmar Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+95 9XX XXX XXXX"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="mt-2 text-sm text-gray-500">
                Enter your Myanmar mobile number starting with +95 or 09
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                OTP Code
              </label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Enter 6-digit OTP"
                maxLength={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="mt-2 text-sm text-gray-500">
                Demo: Use OTP "123456"
              </p>
            </div>

            <button
              onClick={handlePhoneVerify}
              disabled={!phone || otp.length !== 6 || isSubmitting}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Verify Phone <ChevronRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        )

      case 'email':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    Email Verification
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    We'll send a verification link to your email. Click the link to verify.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={handleEmailVerify}
              disabled={!email || isSubmitting}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Verify Email <ChevronRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        )

      case 'nrc':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                NRC Number (Optional)
              </label>
              <input
                type="text"
                value={nrcNumber}
                onChange={(e) => setNrcNumber(e.target.value)}
                placeholder="12/ABC(N)123456"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="mt-2 text-sm text-gray-500">
                Format: 12/ABC(N)123456 or Burmese equivalent
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <KYCDocumentUpload
                label="NRC Front"
                description="Upload the front side of your NRC"
                documentType="nrc_front"
                onUpload={(file) => setNrcFrontDoc(file)}
                preview={nrcFrontDoc}
              />
              <KYCDocumentUpload
                label="NRC Back"
                description="Upload the back side of your NRC"
                documentType="nrc_back"
                onUpload={(file) => setNrcBackDoc(file)}
                preview={nrcBackDoc}
              />
            </div>

            <button
              onClick={handleNext}
              disabled={!nrcFrontDoc || !nrcBackDoc}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              Continue <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )

      case 'selfie':
        return (
          <div className="space-y-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-900">
                    Selfie Guidelines
                  </p>
                  <ul className="text-sm text-yellow-700 mt-1 list-disc list-inside">
                    <li>Ensure good lighting on your face</li>
                    <li>Remove glasses, hats, or masks</li>
                    <li>Look directly at the camera</li>
                    <li>Keep a neutral expression</li>
                  </ul>
                </div>
              </div>
            </div>

            <KYCDocumentUpload
              label="Selfie Photo"
              description="Take a clear photo of your face"
              documentType="selfie"
              onUpload={(file) => setSelfieDoc(file)}
              preview={selfieDoc}
              capture="user"
            />

            <button
              onClick={handleNext}
              disabled={!selfieDoc}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              Continue <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )

      case 'address':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Street Address
              </label>
              <input
                type="text"
                value={address.street}
                onChange={(e) => setAddress({ ...address, street: e.target.value })}
                placeholder="123 Main Street"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Township
                </label>
                <input
                  type="text"
                  value={address.township}
                  onChange={(e) => setAddress({ ...address, township: e.target.value })}
                  placeholder="e.g., Kamayut"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City
                </label>
                <input
                  type="text"
                  value={address.city}
                  onChange={(e) => setAddress({ ...address, city: e.target.value })}
                  placeholder="e.g., Yangon"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  State/Region
                </label>
                <select
                  value={address.state}
                  onChange={(e) => setAddress({ ...address, state: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select State</option>
                  <option value="Yangon">Yangon</option>
                  <option value="Mandalay">Mandalay</option>
                  <option value="Naypyitaw">Naypyitaw</option>
                  <option value="Bago">Bago</option>
                  <option value="Sagaing">Sagaing</option>
                  <option value="Magway">Magway</option>
                  <option value="Ayeyarwady">Ayeyarwady</option>
                  <option value="Tanintharyi">Tanintharyi</option>
                  <option value="Kachin">Kachin</option>
                  <option value="Kayah">Kayah</option>
                  <option value="Kayin">Kayin</option>
                  <option value="Chin">Chin</option>
                  <option value="Mon">Mon</option>
                  <option value="Rakhine">Rakhine</option>
                  <option value="Shan">Shan</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Postal Code
                </label>
                <input
                  type="text"
                  value={address.postalCode}
                  onChange={(e) => setAddress({ ...address, postalCode: e.target.value })}
                  placeholder="e.g., 11041"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <button
              onClick={handleAddressSubmit}
              disabled={!address.street || !address.township || !address.city || !address.state || isSubmitting}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Save Address <ChevronRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        )

      case 'bank':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bank Name
              </label>
              <select
                value={bankDetails.bankName}
                onChange={(e) => setBankDetails({ ...bankDetails, bankName: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Bank</option>
                <option value="KBZ Bank">KBZ Bank</option>
                <option value="CB Bank">CB Bank</option>
                <option value="AYA Bank">AYA Bank</option>
                <option value="MAB Bank">MAB Bank</option>
                <option value="Yoma Bank">Yoma Bank</option>
                <option value="UAB Bank">UAB Bank</option>
                <option value="AGD Bank">AGD Bank</option>
                <option value="Myanmar Apex Bank">Myanmar Apex Bank</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Account Holder Name
              </label>
              <input
                type="text"
                value={bankDetails.accountHolderName}
                onChange={(e) => setBankDetails({ ...bankDetails, accountHolderName: e.target.value })}
                placeholder="As shown on bank documents"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Account Number
              </label>
              <input
                type="text"
                value={bankDetails.accountNumber}
                onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value })}
                placeholder="Your bank account number"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Branch (Optional)
              </label>
              <input
                type="text"
                value={bankDetails.branch}
                onChange={(e) => setBankDetails({ ...bankDetails, branch: e.target.value })}
                placeholder="e.g., Hledan Branch"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <button
              onClick={handleBankSubmit}
              disabled={!bankDetails.bankName || !bankDetails.accountHolderName || !bankDetails.accountNumber || isSubmitting}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Save Bank Details <ChevronRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        )

      case 'business':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Type
              </label>
              <select
                value={businessDetails.businessType}
                onChange={(e) => setBusinessDetails({ ...businessDetails, businessType: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Type</option>
                <option value="sole_proprietorship">Sole Proprietorship</option>
                <option value="partnership">Partnership</option>
                <option value="private_limited">Private Limited</option>
                <option value="public_limited">Public Limited</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Name
              </label>
              <input
                type="text"
                value={businessDetails.companyName}
                onChange={(e) => setBusinessDetails({ ...businessDetails, companyName: e.target.value })}
                placeholder="Registered company name"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Registration Number
              </label>
              <input
                type="text"
                value={businessDetails.registrationNumber}
                onChange={(e) => setBusinessDetails({ ...businessDetails, registrationNumber: e.target.value })}
                placeholder="DICA registration number"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                TIN Number
              </label>
              <input
                type="text"
                value={businessDetails.tinNumber}
                onChange={(e) => setBusinessDetails({ ...businessDetails, tinNumber: e.target.value })}
                placeholder="Tax Identification Number"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <button
              onClick={handleBusinessSubmit}
              disabled={!businessDetails.businessType || !businessDetails.companyName || !businessDetails.registrationNumber || !businessDetails.tinNumber || isSubmitting}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Submit for Review <CheckCircle2 className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        )

      default:
        return null
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  const currentLevel = kycStatus?.currentLevel || initialLevel
  const step = STEPS[currentStep]

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">KYC Verification</h2>
          <KYCStatusBadge level={currentLevel} showLabel />
        </div>
        
        <p className="text-gray-600">
          {LEVEL_DESCRIPTIONS[currentLevel]}
        </p>

        {/* Progress Bar */}
        <div className="mt-6">
          <div className="flex justify-between text-sm text-gray-500 mb-2">
            <span>Progress</span>
            <span>Step {currentStep + 1} of {STEPS.length}</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-blue-600"
              initial={{ width: 0 }}
              animate={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3"
        >
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </motion.div>
      )}

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-xl border border-gray-200 p-6"
        >
          {/* Step Header */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <step.icon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{step.title}</h3>
              <p className="text-sm text-gray-500">{step.description}</p>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 mt-1">
                Level {step.level}
              </span>
            </div>
          </div>

          {/* Step Form */}
          {renderStepContent()}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6">
        <button
          onClick={handleBack}
          disabled={currentStep === 0}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-5 h-5" />
          Back
        </button>

        <div className="flex items-center gap-4">
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-600 hover:text-gray-900"
            >
              Cancel
            </button>
          )}

          {step.level < targetLevel && (
            <button
              onClick={handleSkipLevel}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Skip to Level {step.level + 1}
            </button>
          )}
        </div>
      </div>

      {/* Level Info */}
      <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={`p-4 rounded-lg border text-center ${
              currentLevel >= level
                ? 'bg-green-50 border-green-200'
                : currentLevel + 1 === level
                ? 'bg-blue-50 border-blue-200'
                : 'bg-gray-50 border-gray-200'
            }`}
          >
            <div className={`w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center ${
              currentLevel >= level
                ? 'bg-green-500 text-white'
                : currentLevel + 1 === level
                ? 'bg-blue-500 text-white'
                : 'bg-gray-300 text-white'
            }`}>
              {currentLevel >= level ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <span className="text-sm font-bold">{level}</span>
              )}
            </div>
            <p className="text-xs font-medium text-gray-700">{LEVEL_NAMES[level]}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
