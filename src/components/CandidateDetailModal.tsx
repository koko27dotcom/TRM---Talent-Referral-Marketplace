import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Star,
  Send,
  Sparkles,
  MessageSquare,
  Clock,
  CheckCircle,
  TrendingUp,
  Award,
  Target,
  Calendar,
  Trash2,
  Edit3,
  Loader2,
} from 'lucide-react'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

interface Candidate {
  _id: string
  name: string
  email?: string
  phone?: string
  currentTitle?: string
  currentCompany?: string
  experienceYears?: number
  skills: string[]
  location?: {
    city?: string
    region?: string
  }
  source: string
  contactStatus: string
  hireProbabilityScore?: number
  enrichedData?: {
    estimatedSalary?: {
      min: number
      max: number
      currency: string
    }
    extractedSkills?: Array<{
      skill: string
      confidence: number
    }>
    aiInsights?: {
      strengths: string[]
      potentialRoles: string[]
      careerTrajectory: string
      availabilityLikelihood: number
    }
  }
  contactHistory?: Array<{
    channel: string
    type: string
    status: string
    sentAt: string
    messageContent?: string
  }>
  createdAt: string
}

interface CandidateDetailModalProps {
  candidate: Candidate
  onClose: () => void
  onEnriched: () => void
}

export default function CandidateDetailModal({ candidate, onClose, onEnriched }: CandidateDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'enrichment' | 'history' | 'actions'>('overview')
  const [enriching, setEnriching] = useState(false)
  const [sendingMessage, setSendingMessage] = useState(false)
  const [messageText, setMessageText] = useState('')
  const [generatedMessage, setGeneratedMessage] = useState('')
  const [generatingMessage, setGeneratingMessage] = useState(false)

  const handleEnrich = async () => {
    try {
      setEnriching(true)
      const token = localStorage.getItem('token')
      const response = await fetch(
        `${API_BASE_URL}/talent-pool/candidates/${candidate._id}/enrich`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }
      )

      if (!response.ok) throw new Error('Failed to enrich')

      onEnriched()
    } catch (err) {
      console.error('Error enriching:', err)
    } finally {
      setEnriching(false)
    }
  }

  const handleGenerateMessage = async () => {
    try {
      setGeneratingMessage(true)
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_BASE_URL}/outreach/generate-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ candidateId: candidate._id }),
      })

      if (!response.ok) throw new Error('Failed to generate message')

      const data = await response.json()
      setGeneratedMessage(data.data.message)
      setMessageText(data.data.message)
    } catch (err) {
      console.error('Error generating message:', err)
    } finally {
      setGeneratingMessage(false)
    }
  }

  const handleSendMessage = async (channel: 'whatsapp' | 'email') => {
    try {
      setSendingMessage(true)
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_BASE_URL}/outreach/send-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          candidateId: candidate._id,
          channel,
          message: messageText,
          subject: channel === 'email' ? `Opportunity for ${candidate.currentTitle || 'you'}` : undefined,
        }),
      })

      if (!response.ok) throw new Error('Failed to send message')

      setMessageText('')
      setGeneratedMessage('')
      onEnriched()
    } catch (err) {
      console.error('Error sending message:', err)
    } finally {
      setSendingMessage(false)
    }
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      not_contacted: 'bg-gray-100 text-gray-700',
      contacted: 'bg-blue-100 text-blue-700',
      responded: 'bg-green-100 text-green-700',
      engaged: 'bg-purple-100 text-purple-700',
      not_interested: 'bg-red-100 text-red-700',
      hired: 'bg-emerald-100 text-emerald-700',
    }
    return colors[status] || 'bg-gray-100 text-gray-700'
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-600 to-purple-600">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-blue-600 font-bold text-xl">
              {candidate.name.charAt(0)}
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">{candidate.name}</h3>
              <p className="text-blue-100">
                {candidate.currentTitle || 'No title'} {candidate.currentCompany && `at ${candidate.currentCompany}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(candidate.contactStatus)}`}>
              {candidate.contactStatus.replace('_', ' ')}
            </span>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          {[
            { id: 'overview', label: 'Overview', icon: Target },
            { id: 'enrichment', label: 'AI Enrichment', icon: Sparkles },
            { id: 'history', label: 'Contact History', icon: Clock },
            { id: 'actions', label: 'Actions', icon: Send },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Contact Info */}
              <div className="grid grid-cols-2 gap-4">
                {candidate.email && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="text-gray-900">{candidate.email}</p>
                    </div>
                  </div>
                )}
                {candidate.phone && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Phone className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Phone</p>
                      <p className="text-gray-900">{candidate.phone}</p>
                    </div>
                  </div>
                )}
                {candidate.location?.city && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <MapPin className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Location</p>
                      <p className="text-gray-900">{candidate.location.city}</p>
                    </div>
                  </div>
                )}
                {candidate.experienceYears !== undefined && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Briefcase className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Experience</p>
                      <p className="text-gray-900">{candidate.experienceYears} years</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Skills */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Skills</h4>
                <div className="flex flex-wrap gap-2">
                  {candidate.skills.map((skill, i) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Source & Dates */}
              <div className="flex items-center gap-6 text-sm text-gray-500 pt-4 border-t border-gray-100">
                <span className="capitalize">Source: {candidate.source}</span>
                <span>Added: {new Date(candidate.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          )}

          {activeTab === 'enrichment' && (
            <div className="space-y-6">
              {candidate.hireProbabilityScore ? (
                <>
                  {/* Hire Score */}
                  <div className="flex items-center justify-center py-6">
                    <div className="text-center">
                      <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full text-3xl font-bold ${
                        candidate.hireProbabilityScore >= 80 ? 'bg-green-100 text-green-600' :
                        candidate.hireProbabilityScore >= 60 ? 'bg-yellow-100 text-yellow-600' :
                        'bg-red-100 text-red-600'
                      }`}>
                        {candidate.hireProbabilityScore}%
                      </div>
                      <p className="mt-3 text-lg font-medium text-gray-900">Hire Probability Score</p>
                    </div>
                  </div>

                  {/* Enrichment Data */}
                  {candidate.enrichedData && (
                    <div className="space-y-6">
                      {/* Salary Estimate */}
                      {candidate.enrichedData.estimatedSalary && (
                        <div className="p-4 bg-green-50 rounded-xl">
                          <div className="flex items-center gap-3 mb-2">
                            <TrendingUp className="w-5 h-5 text-green-600" />
                            <h4 className="font-medium text-green-900">Estimated Salary Expectation</h4>
                          </div>
                          <p className="text-2xl font-bold text-green-700">
                            {candidate.enrichedData.estimatedSalary.min.toLocaleString()} - {''}
                            {candidate.enrichedData.estimatedSalary.max.toLocaleString()}{' '}
                            {candidate.enrichedData.estimatedSalary.currency}
                          </p>
                        </div>
                      )}

                      {/* Extracted Skills */}
                      {candidate.enrichedData.extractedSkills && (
                        <div>
                          <h4 className="font-medium text-gray-900 mb-3">AI-Extracted Skills</h4>
                          <div className="flex flex-wrap gap-2">
                            {candidate.enrichedData.extractedSkills.map((skill, i) => (
                              <span
                                key={i}
                                className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-sm flex items-center gap-2"
                              >
                                {skill.skill}
                                <span className="text-xs text-purple-500">
                                  {Math.round(skill.confidence * 100)}%
                                </span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* AI Insights */}
                      {candidate.enrichedData.aiInsights && (
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                              <Award className="w-4 h-4 text-amber-500" />
                              Key Strengths
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {candidate.enrichedData.aiInsights.strengths.map((strength, i) => (
                                <span
                                  key={i}
                                  className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-full text-sm"
                                >
                                  {strength}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div>
                            <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                              <Target className="w-4 h-4 text-blue-500" />
                              Potential Roles
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {candidate.enrichedData.aiInsights.potentialRoles.map((role, i) => (
                                <span
                                  key={i}
                                  className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm"
                                >
                                  {role}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="p-4 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Career Trajectory:</span>{' '}
                              {candidate.enrichedData.aiInsights.careerTrajectory}
                            </p>
                            <p className="text-sm text-gray-600 mt-2">
                              <span className="font-medium">Availability Likelihood:</span>{' '}
                              {candidate.enrichedData.aiInsights.availabilityLikelihood}%
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12">
                  <Sparkles className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500 mb-4">This candidate has not been enriched yet</p>
                  <button
                    onClick={handleEnrich}
                    disabled={enriching}
                    className="flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 mx-auto"
                  >
                    {enriching ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Enriching...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Enrich with AI
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              {candidate.contactHistory && candidate.contactHistory.length > 0 ? (
                candidate.contactHistory.map((contact, i) => (
                  <div key={i} className="flex gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      contact.channel === 'whatsapp' ? 'bg-green-100 text-green-600' :
                      contact.channel === 'email' ? 'bg-blue-100 text-blue-600' :
                      'bg-gray-200 text-gray-600'
                    }`}>
                      {contact.channel === 'whatsapp' ? <MessageSquare className="w-5 h-5" /> :
                       contact.channel === 'email' ? <Mail className="w-5 h-5" /> :
                       <Send className="w-5 h-5" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-gray-900 capitalize">{contact.type.replace('_', ' ')}</p>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          contact.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                          contact.status === 'replied' ? 'bg-green-100 text-green-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {contact.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        {new Date(contact.sentAt).toLocaleString()}
                      </p>
                      {contact.messageContent && (
                        <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                          {contact.messageContent}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No contact history yet</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'actions' && (
            <div className="space-y-6">
              {/* Generate AI Message */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Generate AI-Powered Message</h4>
                <button
                  onClick={handleGenerateMessage}
                  disabled={generatingMessage}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 disabled:opacity-50"
                >
                  {generatingMessage ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate Personalized Message
                    </>
                  )}
                </button>

                {generatedMessage && (
                  <div className="mt-4">
                    <textarea
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      rows={5}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>

              {/* Send Options */}
              {messageText && (
                <div className="flex gap-3">
                  {candidate.phone && (
                    <button
                      onClick={() => handleSendMessage('whatsapp')}
                      disabled={sendingMessage}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Send via WhatsApp
                    </button>
                  )}
                  {candidate.email && (
                    <button
                      onClick={() => handleSendMessage('email')}
                      disabled={sendingMessage}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Mail className="w-4 h-4" />
                      Send via Email
                    </button>
                  )}
                </div>
              )}

              {/* Other Actions */}
              <div className="pt-6 border-t border-gray-200">
                <h4 className="font-medium text-gray-900 mb-3">Other Actions</h4>
                <div className="flex flex-wrap gap-3">
                  <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                    <Target className="w-4 h-4" />
                    Match to Jobs
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-red-600">
                    <Trash2 className="w-4 h-4" />
                    Delete Candidate
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
