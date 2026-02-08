import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import {
  User,
  Briefcase,
  Users,
  Wallet,
  LogOut,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  Building2
} from 'lucide-react'
import ReferralCard from './ReferralCard'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1'

interface UserData {
  id: string
  name: string
  email: string
  type: 'jobseeker' | 'recruiter'
  company?: string
}

interface Application {
  id: string
  jobTitle: string
  company: string
  status: 'pending' | 'approved' | 'rejected'
  appliedDate: string
}

interface PostedJob {
  _id: string
  title: string
  company: string
  applicants: number
  status: 'active' | 'closed'
  createdAt: string  
}

type ActiveTab = 'overview' | 'applications' | 'posted-jobs' | 'referrals'

export default function Dashboard() {
  const navigate = useNavigate()
  const [user, setUser] = useState<UserData | null>(null)
  const [applications, setApplications] = useState<Application[]>([])
  const [postedJobs, setPostedJobs] = useState<PostedJob[]>([])
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview')
  const [loading, setLoading] = useState(true)

  // Check if user is recruiter or job seeker
  const isRecruiter = user?.type === 'recruiter'
  const isJobSeeker = user?.type === 'jobseeker'

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData && userData !== 'undefined' && userData !== 'null') {
      try {
        const parsedUser = JSON.parse(userData)
        setUser(parsedUser)
      } catch (e) {
        console.error('Invalid user data:', e)
        localStorage.removeItem('user')
        navigate('/login')
      }
    } else {
      navigate('/login')
    }

    fetchUserData()
  }, [navigate])

  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem('token')
      const userData = JSON.parse(localStorage.getItem('user') || '{}')
      
      if (userData.type === 'recruiter') {
        // Fetch real posted jobs from backend
        const response = await fetch(`${API_BASE_URL}/jobs/my-posted`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        const data = await response.json()
        if (data.success) {
          setPostedJobs(data.data)
        }
      } else {
        // Fetch real applications for job seekers
        const response = await fetch(`${API_BASE_URL}/applications/my`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        const data = await response.json()
        if (data.success) {
          setApplications(data.data)
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': 
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'rejected': 
        return <XCircle className="w-5 h-5 text-red-500" />
      default: 
        return <Clock className="w-5 h-5 text-yellow-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': 
        return 'bg-green-100 text-green-700'
      case 'rejected': 
        return 'bg-red-100 text-red-700'
      case 'active':
        return 'bg-green-100 text-green-700'
      case 'closed':
        return 'bg-gray-100 text-gray-700'
      default: 
        return 'bg-yellow-100 text-yellow-700'
    }
  }

  const handleEdit = (jobId: string) => {
    console.log('Edit job:', jobId)
    navigate(`/edit-job/${jobId}`)
  }

  // Handle Close Job
  const handleCloseJob = async (jobId: string) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_BASE_URL}/jobs/${jobId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'closed' })
      })
      
      if (response.ok) {
        alert('Job closed successfully')
        window.location.reload()
      }
    } catch (error) {
      console.error('Error closing job:', error)
    }
  }

  // Handle Delete Job
  const handleDelete = async (jobId: string) => {
    if (!confirm('Are you sure you want to delete this job?')) return
    
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_BASE_URL}/jobs/${jobId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        alert('Job deleted successfully')
        window.location.reload()
      }
    } catch (error) {
      console.error('Error deleting job:', error)
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Dashboard</h1>
              <p className="text-blue-100 mt-1">
                Welcome back, {user.name}! 
                <span className="ml-2 text-sm bg-blue-700 px-2 py-1 rounded-full">
                  {isRecruiter ? 'Recruiter' : 'Job Seeker'}
                </span>
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {isRecruiter && (
                <Link
                  to="/post-job"
                  className="flex items-center space-x-2 bg-green-500 hover:bg-green-600 px-4 py-2 rounded-lg transition"
                >
                  <Plus className="w-5 h-5" />
                  <span>Post a Job</span>
                </Link>
              )}
              <button 
                onClick={handleLogout}
                className="flex items-center space-x-2 bg-blue-700 hover:bg-blue-800 px-4 py-2 rounded-lg transition"
              >
                <LogOut className="w-5 h-5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards - Different for Recruiter vs Job Seeker */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {isRecruiter ? (
            // RECRUITER STATS
            <>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl shadow-sm p-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">Posted Jobs</p>
                    <p className="text-3xl font-bold text-gray-900">{postedJobs.length}</p>
                  </div>
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <Briefcase className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-xl shadow-sm p-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">Total Applicants</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {postedJobs.reduce((sum, job) => sum + (job.applicants || 0), 0)}
                    </p>
                  </div>
                  <div className="bg-green-100 p-3 rounded-lg">
                    <Users className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-xl shadow-sm p-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">Active Jobs</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {postedJobs.filter(job => job.status === 'active').length}
                    </p>
                  </div>
                  <div className="bg-purple-100 p-3 rounded-lg">
                    <Building2 className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </motion.div>
            </>
          ) : (
            // JOB SEEKER STATS
            <>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl shadow-sm p-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">Total Applications</p>
                    <p className="text-3xl font-bold text-gray-900">{applications.length}</p>
                  </div>
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <Briefcase className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-xl shadow-sm p-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">Referral Codes</p>
                    <p className="text-3xl font-bold text-gray-900">0</p>
                  </div>
                  <div className="bg-green-100 p-3 rounded-lg">
                    <Users className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-xl shadow-sm p-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">Total Earnings</p>
                    <p className="text-3xl font-bold text-gray-900">400,000 MMK</p>
                  </div>
                  <div className="bg-purple-100 p-3 rounded-lg">
                    <Wallet className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-xl shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'overview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Overview
              </button>
              
              {isJobSeeker && (
                <button
                  onClick={() => setActiveTab('applications')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'applications'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  My Applications
                </button>
              )}

              {isRecruiter && (
                <button
                  onClick={() => setActiveTab('posted-jobs')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'posted-jobs'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Posted Jobs
                </button>
              )}

              {isRecruiter && (
                <button
                  onClick={() => setActiveTab('referrals')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'referrals'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Referral Codes
                </button>
              )}
            </nav>
          </div>

          <div className="p-6">
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div>
                <h3 className="text-lg font-semibold mb-4">
                  {isRecruiter ? 'Company Profile' : 'Profile Information'}
                </h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Full Name</span>
                    <span className="font-medium">{user.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Email</span>
                    <span className="font-medium">{user.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Account Type</span>
                    <span className="font-medium capitalize">{user.type}</span>
                  </div>
                  {isRecruiter && user.company && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Company</span>
                      <span className="font-medium">{user.company}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* JOB SEEKER - MY APPLICATIONS TAB */}
            {activeTab === 'applications' && isJobSeeker && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Recent Applications</h3>
                <div className="space-y-4">
                  {applications.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No applications yet</p>
                  ) : (
                    applications.map((app) => (
                      <div key={app.id} className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{app.jobTitle}</h4>
                          <p className="text-sm text-gray-600">{app.company}</p>
                          <p className="text-xs text-gray-400 mt-1">Applied: {app.appliedDate}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(app.status)}`}>
                          {app.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* RECRUITER - POSTED JOBS TAB */}
            {activeTab === 'posted-jobs' && isRecruiter && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Posted Jobs</h3>
                <div className="space-y-4">
                  {postedJobs.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No jobs posted yet</p>
                  ) : (
                    postedJobs.map((job) => (
                      <div key={job._id} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h4 className="font-medium">{job.title}</h4>
                            <p className="text-sm text-gray-600">{job.company}</p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(job.status)}`}>
                            {job.status}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm text-gray-500">
                          <span>{job.applicants || 0} applicants</span>
                          <span>Posted: {new Date(job.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}</span>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <button 
                            onClick={() => handleEdit(job._id)}
                            className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => handleCloseJob(job._id)}
                            className="px-3 py-1 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600"
                          >
                            Close
                          </button>
                          <button 
                            onClick={() => handleDelete(job._id)}
                            className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* REFERRAL CODES TAB - For recruiters */}
            {activeTab === 'referrals' && isRecruiter && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold mb-4">Your Referral Codes</h2>
                {postedJobs.length === 0 ? (
                  <p className="text-gray-500">No jobs posted yet. Post a job to generate referral codes!</p>
                ) : (
                  postedJobs.map((job) => (
                    <ReferralCard key={job._id} job={job} />
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
