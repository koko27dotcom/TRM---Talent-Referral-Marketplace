import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Home, Briefcase, Users, User, Plus, Wallet, Building2, BarChart3, Sparkles } from 'lucide-react'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function MobileNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const [userType, setUserType] = useState<'referrer' | 'recruiter' | 'admin'>('referrer')
  const [showQuickActions, setShowQuickActions] = useState(false)

  useEffect(() => {
    const user = localStorage.getItem('user')
    if (user) {
      try {
        const parsed = JSON.parse(user)
        if (parsed.type === 'recruiter') setUserType('recruiter')
        else if (parsed.email?.includes('admin')) setUserType('admin')
      } catch {}
    }
  }, [location])

  const isActive = (path: string) => location.pathname === path

  const quickActions = [
    { icon: Briefcase, label: 'Browse Jobs', path: '/jobs', color: 'bg-blue-500' },
    { icon: Plus, label: 'Post Job', path: '/post-job', color: 'bg-green-500' },
    { icon: Wallet, label: 'My Referrals', path: '/referral-tracking', color: 'bg-purple-500' },
    { icon: Building2, label: 'Corporate', path: '/corporate', color: 'bg-amber-500' },
    { icon: BarChart3, label: 'Analytics', path: '/referrals', color: 'bg-pink-500' },
    { icon: Sparkles, label: 'AI Resume', path: '/resume-optimizer', color: 'bg-indigo-500' },
  ]

  return (
    <>
      {/* Quick Actions Overlay */}
      <AnimatePresence>
        {showQuickActions && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setShowQuickActions(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="absolute bottom-24 left-4 right-4 bg-white rounded-3xl p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-slate-900 mb-4 text-center">Quick Actions</h3>
              <div className="grid grid-cols-3 gap-4">
                {quickActions.map((action, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      navigate(action.path)
                      setShowQuickActions(false)
                    }}
                    className="flex flex-col items-center gap-2 p-4 rounded-2xl hover:bg-slate-50 active:scale-95 transition-all"
                  >
                    <div className={`w-14 h-14 ${action.color} rounded-2xl flex items-center justify-center text-white shadow-lg`}>
                      <action.icon size={24} />
                    </div>
                    <span className="text-xs font-medium text-slate-700">{action.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Mobile Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-slate-200 z-50 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
        <div className="flex justify-around items-center px-2 py-2">
          <NavButton 
            to="/" 
            icon={Home} 
            label="Home" 
            isActive={isActive('/')} 
          />
          <NavButton 
            to="/jobs" 
            icon={Briefcase} 
            label="Jobs" 
            isActive={isActive('/jobs')} 
          />
          
          {/* Center Action Button */}
          <button 
            onClick={() => setShowQuickActions(true)}
            className="relative -top-6 group"
          >
            <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-blue-500/30 group-active:scale-95 transition-transform">
              <Plus size={32} className={`transition-transform duration-300 ${showQuickActions ? 'rotate-45' : ''}`} />
            </div>
          </button>
          
          <NavButton 
            to="/referrals" 
            icon={Wallet} 
            label="Earn" 
            isActive={isActive('/referrals') || isActive('/referral-tracking')} 
          />
          <NavButton 
            to="/dashboard" 
            icon={User} 
            label="Profile" 
            isActive={isActive('/dashboard') || isActive('/profile')} 
          />
        </div>
        {/* Safe area spacer for notched phones */}
        <div className="h-safe-area-inset-bottom bg-white" />
      </div>
    </>
  )
}

function NavButton({ to, icon: Icon, label, isActive }: { 
  to: string
  icon: any
  label: string
  isActive: boolean
}) {
  return (
    <Link 
      to={to}
      className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all active:scale-95 ${
        isActive ? 'text-blue-600' : 'text-slate-400'
      }`}
    >
      <div className={`relative ${isActive ? 'scale-110' : ''} transition-transform`}>
        <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
        {isActive && (
          <motion.div
            layoutId="navIndicator"
            className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-600 rounded-full"
          />
        )}
      </div>
      <span className={`text-[10px] font-medium ${isActive ? 'text-blue-600' : 'text-slate-400'}`}>
        {label}
      </span>
    </Link>
  )
}
