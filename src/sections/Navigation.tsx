import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'  

interface User {
  _id: string
  name: string
  email: string
  type: 'jobseeker' | 'recruiter'
  company?: string
}

export default function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)

    const userData = localStorage.getItem('user')
    if (userData) {
      try {
        setUser(JSON.parse(userData))
      } catch (e) {
        console.error('Invalid user data')
      }
    }

    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
    navigate('/')
  }

  const navigateToDashboard = () => {
    if (user?.type === 'recruiter') {
      navigate('/corporate-dashboard')
    } else {
      navigate('/referral-dashboard')
    }
  }

  return (
    <nav
      className={`fixed w-full z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-white shadow-lg py-3'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <span className="text-white text-xl font-bold">R</span>
            </div>
            <span className={`text-xl font-bold ${isScrolled ? 'text-gray-900' : 'text-white'}`}>
              Saramart
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            <Link
              to="/jobs"
              className={`font-medium hover:opacity-80 transition-opacity ${
                isScrolled ? 'text-gray-700' : 'text-white'
              }`}
            >
              Browse Jobs
            </Link>
            
            <Link
              to="/for-recruiters"
              className={`font-medium hover:opacity-80 transition-opacity ${
                isScrolled ? 'text-gray-700' : 'text-white'
              }`}
            >
              For Recruiters
            </Link>
            
            <Link
              to="/resume-optimizer"
              className={`font-medium hover:opacity-80 transition-opacity ${
                isScrolled ? 'text-gray-700' : 'text-white'
              }`}
            >
              AI Resume
            </Link>
            
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all"
                >
                  <span>{user.name}</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl py-2 z-50">
                    <div className="px-4 py-2 border-b">
                      <p className="text-sm font-medium text-gray-900">{user.name}</p>
                      <p className="text-xs text-gray-500">{user.type === 'recruiter' ? 'Corporate Account' : 'Job Seeker'}</p>
                    </div>
                    <button
                      onClick={() => {
                        setShowDropdown(false)
                        navigateToDashboard()
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Dashboard
                    </button>
                    <button
                      onClick={() => {
                        setShowDropdown(false)
                        navigate('/profile')
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Profile Settings
                    </button>
                    <hr className="my-1" />
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigate('/login')}
                  className={`font-medium hover:opacity-80 transition-opacity ${
                    isScrolled ? 'text-gray-700' : 'text-white'
                  }`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => navigate('/register')}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-2 rounded-full font-medium hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
                >
                  Get Started
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => {}}
          >
            <div className="space-y-1.5">
              <div className={`w-6 h-0.5 ${isScrolled ? 'bg-gray-700' : 'bg-white'}`} />
              <div className={`w-6 h-0.5 ${isScrolled ? 'bg-gray-700' : 'bg-white'}`} />
              <div className={`w-6 h-0.5 ${isScrolled ? 'bg-gray-700' : 'bg-white'}`} />
            </div>
          </button>
        </div>
      </div>
    </nav>
  )
}
