import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowLeft, 
  MapPin, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  Send, 
  Gift, 
  Upload, 
  X, 
  Copy, 
  Check, 
  Loader2, 
  Linkedin, 
  Facebook, 
  Twitter, 
  MessageCircle, 
  Send as SendIcon, 
  Share2,
  User,
  Mail,
  Phone,
  Building2,
  Briefcase,
  FileText
} from 'lucide-react'
import type { Job } from '../App'
import { useState, useEffect, useRef, useCallback } from 'react'

interface JobDetailProps {
  jobs: Job[]
}

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1'

export default function JobDetail({ jobs }: JobDetailProps) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [showApply, setShowApply] = useState(false)
  const [showRefer, setShowRefer] = useState(false)
  const [copied, setCopied] = useState(false)
  const [fileName, setFileName] = useState('')
  const [referralCode, setReferralCode] = useState('')
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState(false)
  
  // Referral form state
  const [referralFormData, setReferralFormData] = useState({
    referredName: '',
    referredEmail: '',
    referredPhone: '',
    referredCurrentCompany: '',
    referredCurrentPosition: '',
    referredLinkedInUrl: '',
    referredResumeUrl: '',
    referrerNotes: ''
  })
  
  const applyBtnRef = useRef<HTMLButtonElement>(null)
  const referBtnRef = useRef<HTMLButtonElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const job = jobs.find(j => j.id === Number(id))
  
  if (!job) return <div className="pt-20 text-center">Job not found</div>

  // Get auth token from localStorage
  const getAuthToken = () => {
    return localStorage.getItem('token') || localStorage.getItem('authToken')
  }

  // Create headers with authentication
  const createAuthHeaders = (contentType = true) => {
    const headers: Record<string, string> = {}
    if (contentType) {
      headers['Content-Type'] = 'application/json'
    }
    const token = getAuthToken()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    return headers
  }

  useEffect(() => {
    if (showRefer) {
      const newCode = `TRM-${Date.now().toString(36).toUpperCase()}`
      setReferralCode(newCode)
    }
  }, [showRefer, job.id, job.title, job.referralBonus])

  const createReferral = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/referrals`, {
        method: 'POST',
        headers: createAuthHeaders(),
        body: JSON.stringify({
          jobId: job.id.toString(),
          referredPerson: {
            name: referralFormData.referredName,
            email: referralFormData.referredEmail,
            phone: referralFormData.referredPhone || undefined,
            currentCompany: referralFormData.referredCurrentCompany || undefined,
            currentPosition: referralFormData.referredCurrentPosition || undefined,
            linkedInUrl: referralFormData.referredLinkedInUrl || undefined,
            resumeUrl: referralFormData.referredResumeUrl || undefined
          },
          referrerNotes: referralFormData.referrerNotes || undefined,
          source: 'web'
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Failed to create referral: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Failed to create referral:', error)
      throw error
    }
  }

  const handleReferralSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitError('')

    try {
      // Validate required fields
      if (!referralFormData.referredName.trim()) {
        throw new Error('Please enter the referred person\'s name')
      }
      if (!referralFormData.referredEmail.trim()) {
        throw new Error('Please enter the referred person\'s email')
      }

      // Create the referral
      await createReferral()
      
      setSubmitSuccess(true)
      
      // Reset form after success
      setTimeout(() => {
        setShowRefer(false)
        setSubmitSuccess(false)
        setReferralFormData({
          referredName: '',
          referredEmail: '',
          referredPhone: '',
          referredCurrentCompany: '',
          referredCurrentPosition: '',
          referredLinkedInUrl: '',
          referredResumeUrl: '',
          referrerNotes: ''
        })
      }, 2000)
    } catch (error) {
      console.error('Referral submit error:', error)
      setSubmitError(error instanceof Error ? error.message : 'Failed to create referral. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReferralInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setReferralFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // Social share functions
  const shareToLinkedIn = (jobTitle: string, refCode: string) => {
    const text = `Check out this ${jobTitle} position! Use my referral code ${refCode} to apply.`
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}&summary=${encodeURIComponent(text)}`
    window.open(url, '_blank', 'width=600,height=400')
  }

  const shareToFacebook = (jobTitle: string, refCode: string) => {
    const text = `Check out this ${jobTitle} position! Use my referral code ${refCode} to apply.`
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}&quote=${encodeURIComponent(text)}`
    window.open(url, '_blank', 'width=600,height=400')
  }

  const shareToTwitter = (jobTitle: string, refCode: string) => {
    const text = `Check out this ${jobTitle} position! Use my referral code ${refCode} to apply.`
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(window.location.href)}`
    window.open(url, '_blank', 'width=600,height=400')
  }

  const shareToWhatsApp = (jobTitle: string, refCode: string) => {
    const text = `Check out this ${jobTitle} position! Use my referral code ${refCode} to apply: ${window.location.href}`
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`
    window.open(url, '_blank')
  }

  const shareToTelegram = (jobTitle: string, refCode: string) => {
    const text = `Check out this ${jobTitle} position! Use my referral code ${refCode} to apply.`
    const url = `https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(text)}`
    window.open(url, '_blank')
  }

  const nativeShare = async (jobTitle: string, refCode: string) => {
    const shareData = {
      title: `${jobTitle} - TRM Referral`,
      text: `Check out this ${jobTitle} position! Use my referral code ${refCode} to apply and earn rewards.`,
      url: window.location.href
    }

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData)
      } catch (err) {
        console.log('Share cancelled:', err)
      }
    } else {
      navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`)
      alert('Link copied to clipboard!')
    }
  }

  useEffect(() => {
    const applyBtn = applyBtnRef.current
    const referBtn = referBtnRef.current

    const handleApplyClick = (e: Event) => {
      e.preventDefault()
      e.stopPropagation()
      setShowApply(true)
      setSubmitError('')
      setSubmitSuccess(false)
    }

    const handleReferClick = (e: Event) => {
      e.preventDefault()
      e.stopPropagation()
      setShowRefer(true)
      setSubmitError('')
      setSubmitSuccess(false)
    }

    if (applyBtn) applyBtn.addEventListener('click', handleApplyClick, true)
    if (referBtn) referBtn.addEventListener('click', handleReferClick, true)

    return () => {
      if (applyBtn) applyBtn.removeEventListener('click', handleApplyClick, true)
      if (referBtn) referBtn.removeEventListener('click', handleReferClick, true)
    }
  }, [])

  const copyCode = useCallback(async () => {
    if (!referralCode) return
    
    try {
      await navigator.clipboard.writeText(referralCode)
      setCopied(true)
      
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Copy failed:', error)
    }
  }, [referralCode])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB')
        e.target.value = ''
        return
      }
      setFileName(file.name)
    }
  }

  const handleApplySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitError('')

    const form = e.currentTarget
    const formData = new FormData(form)
    
    formData.append('jobId', job.id.toString())
    formData.append('jobTitle', job.title)
    formData.append('company', job.company)
    formData.append('appliedAt', new Date().toISOString())

    try {
      const response = await fetch(`${API_BASE_URL}/applications`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Failed to submit: ${response.status}`)
      }

      setSubmitSuccess(true)
      setTimeout(() => {
        setShowApply(false)
        setSubmitSuccess(false)
        form.reset()
        setFileName('')
      }, 2000)
      
    } catch (error) {
      console.error('Submit error:', error)
      setSubmitError('Failed to submit application. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCopyAndShare = async () => {
    await copyCode()
    setShowRefer(false)
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-20 pb-24 relative">
      <div className="max-w-4xl mx-auto px-4">
        <button 
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors"
          type="button"
        >
          <ArrowLeft size={20} />
          Back
        </button>

        <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8 mb-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold">
              {job.company[0]}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-bold text-slate-800 mb-2">{job.title}</h1>
              <p className="text-lg text-slate-600 mb-4">{job.company}</p>
              <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                <span className="flex items-center gap-1"><MapPin size={16} /> {job.location}</span>
                <span className="flex items-center gap-1"><DollarSign size={16} className="text-green-600" /> <span className="font-semibold text-green-600">{job.salary}</span></span>
                <span className="flex items-center gap-1"><Clock size={16} /> {job.type}</span>
              </div>
            </div>
            <button 
              ref={applyBtnRef}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              type="button"
              style={{ pointerEvents: 'auto', position: 'relative', zIndex: 50 }}
            >
              <Send size={18} /> Apply Now
            </button>
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-6 text-white mb-6 shadow-lg" style={{ position: 'relative', zIndex: 40 }}>
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Gift size={24} />
              </div>
              <div>
                <h3 className="font-bold text-lg">Referral Bonus: {job.referralBonus}</h3>
                <p className="text-green-100 text-sm">Refer a friend and earn when they get hired!</p>
              </div>
            </div>
            <button 
              ref={referBtnRef}
              className="px-6 py-3 bg-white text-green-600 rounded-xl font-semibold hover:shadow-lg transition-all active:scale-95 cursor-pointer"
              type="button"
              style={{ pointerEvents: 'auto', position: 'relative', zIndex: 50 }}
            >
              Refer Now
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-slate-800 mb-4">Description</h2>
              <p className="text-slate-600 leading-relaxed">{job.description}</p>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-slate-800 mb-4">Requirements</h2>
              <ul className="space-y-3">
                {job.requirements.map((req, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-slate-600">
                    <CheckCircle size={20} className="text-blue-500 mt-0.5 flex-shrink-0" />
                    {req}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6 h-fit">
            <h3 className="font-bold text-slate-800 mb-4">Benefits</h3>
            <ul className="space-y-3">
              {job.benefits.map((benefit, idx) => (
                <li key={idx} className="flex items-center gap-2 text-slate-600">
                  <span className="w-2 h-2 bg-green-500 rounded-full" />
                  {benefit}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showApply && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center p-4"
            style={{ zIndex: 9999 }}
            onClick={() => !isSubmitting && setShowApply(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white rounded-3xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-slate-800">Apply for {job.title}</h2>
                {!isSubmitting && (
                  <button 
                    onClick={() => setShowApply(false)}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                    type="button"
                  >
                    <X size={20} />
                  </button>
                )}
              </div>

              {submitSuccess ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle size={32} className="text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">Application Submitted!</h3>
                  <p className="text-slate-600">We'll review your application and get back to you soon.</p>
                </div>
              ) : (
                <form className="space-y-4" onSubmit={handleApplySubmit}>
                  {submitError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                      {submitError}
                    </div>
                  )}

                  <input 
                    required 
                    name="fullName"
                    type="text" 
                    placeholder="Full Name" 
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none focus:ring-2 focus:ring-blue-200 transition-all"
                  />
                  <input 
                    required 
                    name="email"
                    type="email" 
                    placeholder="Email" 
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none focus:ring-2 focus:ring-blue-200 transition-all"
                  />
                  <input 
                    required 
                    name="phone"
                    type="tel" 
                    placeholder="Phone" 
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none focus:ring-2 focus:ring-blue-200 transition-all"
                  />
                  
                  <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center hover:border-blue-500 hover:bg-blue-50 transition-all">
                    <input 
                      ref={fileInputRef}
                      type="file" 
                      name="resume"
                      id="resume" 
                      className="hidden" 
                      accept=".pdf,.doc,.docx" 
                      onChange={handleFileChange}
                    />
                    <label htmlFor="resume" className="cursor-pointer flex flex-col items-center gap-2">
                      {isSubmitting ? (
                        <Loader2 size={24} className="text-slate-400 animate-spin" />
                      ) : (
                        <Upload size={24} className="text-slate-400" />
                      )}
                      <span className="text-sm text-slate-600">
                        {fileName || 'Click to upload Resume/CV (PDF, DOC, max 5MB)'}
                      </span>
                    </label>
                  </div>

                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      'Submit Application'
                    )}
                  </button>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showRefer && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center p-4"
            style={{ zIndex: 9999 }}
            onClick={() => !isSubmitting && setShowRefer(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white rounded-3xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-slate-800">Refer a Friend</h2>
                {!isSubmitting && (
                  <button 
                    onClick={() => setShowRefer(false)}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                    type="button"
                  >
                    <X size={20} />
                  </button>
                )}
              </div>
              
              {submitSuccess ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle size={32} className="text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">Referral Created!</h3>
                  <p className="text-slate-600">Your referral has been submitted successfully. We'll notify you when there's an update.</p>
                </div>
              ) : (
                <>
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Gift size={32} className="text-green-600" />
                    </div>
                    <p className="text-slate-600">
                      Refer someone for <span className="font-bold text-slate-800">{job.title}</span> at {job.company}. 
                      When they get hired, you earn <span className="font-bold text-green-600">{job.referralBonus}</span>!
                    </p>
                  </div>

                  {submitError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm mb-4">
                      {submitError}
                    </div>
                  )}

                  <form onSubmit={handleReferralSubmit} className="space-y-4">
                    {/* Referred Person Name */}
                    <div className="relative">
                      <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        required 
                        name="referredName"
                        type="text" 
                        placeholder="Referred Person's Full Name *" 
                        value={referralFormData.referredName}
                        onChange={handleReferralInputChange}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none focus:ring-2 focus:ring-blue-200 transition-all"
                      />
                    </div>

                    {/* Referred Person Email */}
                    <div className="relative">
                      <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        required 
                        name="referredEmail"
                        type="email" 
                        placeholder="Referred Person's Email *" 
                        value={referralFormData.referredEmail}
                        onChange={handleReferralInputChange}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none focus:ring-2 focus:ring-blue-200 transition-all"
                      />
                    </div>

                    {/* Referred Person Phone */}
                    <div className="relative">
                      <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        name="referredPhone"
                        type="tel" 
                        placeholder="Referred Person's Phone (optional)" 
                        value={referralFormData.referredPhone}
                        onChange={handleReferralInputChange}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none focus:ring-2 focus:ring-blue-200 transition-all"
                      />
                    </div>

                    {/* Current Company */}
                    <div className="relative">
                      <Building2 size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        name="referredCurrentCompany"
                        type="text" 
                        placeholder="Current Company (optional)" 
                        value={referralFormData.referredCurrentCompany}
                        onChange={handleReferralInputChange}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none focus:ring-2 focus:ring-blue-200 transition-all"
                      />
                    </div>

                    {/* Current Position */}
                    <div className="relative">
                      <Briefcase size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        name="referredCurrentPosition"
                        type="text" 
                        placeholder="Current Position (optional)" 
                        value={referralFormData.referredCurrentPosition}
                        onChange={handleReferralInputChange}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none focus:ring-2 focus:ring-blue-200 transition-all"
                      />
                    </div>

                    {/* LinkedIn URL */}
                    <div className="relative">
                      <Linkedin size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        name="referredLinkedInUrl"
                        type="url" 
                        placeholder="LinkedIn Profile URL (optional)" 
                        value={referralFormData.referredLinkedInUrl}
                        onChange={handleReferralInputChange}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none focus:ring-2 focus:ring-blue-200 transition-all"
                      />
                    </div>

                    {/* Notes */}
                    <div className="relative">
                      <FileText size={18} className="absolute left-3 top-3 text-slate-400" />
                      <textarea 
                        name="referrerNotes"
                        placeholder="Additional notes about the candidate (optional)" 
                        value={referralFormData.referrerNotes}
                        onChange={handleReferralInputChange}
                        rows={3}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none focus:ring-2 focus:ring-blue-200 transition-all resize-none"
                      />
                    </div>

                    {/* Referral Code Display */}
                    <div className="bg-slate-100 rounded-xl p-4">
                      <p className="text-xs text-slate-500 mb-1">Your Referral Code</p>
                      <div className="flex items-center justify-between">
                        <code className="text-lg font-mono font-bold text-slate-800">{referralCode}</code>
                        <button 
                          onClick={copyCode}
                          type="button"
                          className="p-2 bg-white rounded-lg shadow-sm hover:shadow-md transition-all active:scale-95"
                        >
                          {copied ? <Check size={20} className="text-green-600" /> : <Copy size={20} className="text-slate-600" />}
                        </button>
                      </div>
                    </div>

                    {/* Social Share */}
                    <div>
                      <p className="text-sm text-slate-600 mb-3 text-center">Or share via</p>
                      <div className="flex justify-center gap-2 flex-wrap">
                        <button
                          onClick={() => shareToLinkedIn(job.title, referralCode)}
                          type="button"
                          className="p-3 bg-blue-700 text-white rounded-xl hover:bg-blue-800 transition-all active:scale-95"
                          title="LinkedIn"
                        >
                          <Linkedin size={20} />
                        </button>
                        
                        <button
                          onClick={() => shareToFacebook(job.title, referralCode)}
                          type="button"
                          className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all active:scale-95"
                          title="Facebook"
                        >
                          <Facebook size={20} />
                        </button>
                        
                        <button
                          onClick={() => shareToTwitter(job.title, referralCode)}
                          type="button"
                          className="p-3 bg-sky-500 text-white rounded-xl hover:bg-sky-600 transition-all active:scale-95"
                          title="Twitter"
                        >
                          <Twitter size={20} />
                        </button>
                        
                        <button
                          onClick={() => shareToWhatsApp(job.title, referralCode)}
                          type="button"
                          className="p-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-all active:scale-95"
                          title="WhatsApp"
                        >
                          <MessageCircle size={20} />
                        </button>
                        
                        <button
                          onClick={() => shareToTelegram(job.title, referralCode)}
                          type="button"
                          className="p-3 bg-sky-600 text-white rounded-xl hover:bg-sky-700 transition-all active:scale-95"
                          title="Telegram"
                        >
                          <SendIcon size={20} />
                        </button>
                        
                        <button
                          onClick={() => nativeShare(job.title, referralCode)}
                          type="button"
                          className="p-3 bg-slate-700 text-white rounded-xl hover:bg-slate-800 transition-all active:scale-95"
                          title="More Options"
                        >
                          <Share2 size={20} />
                        </button>
                      </div>
                    </div>

                    <button 
                      type="submit" 
                      disabled={isSubmitting}
                      className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          Submitting Referral...
                        </>
                      ) : (
                        'Submit Referral'
                      )}
                    </button>
                  </form>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
