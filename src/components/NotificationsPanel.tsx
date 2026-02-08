import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Bell, X, Check, CheckCheck, Filter, Trash2, 
  UserPlus, DollarSign, AlertCircle, Info, Calendar,
  Briefcase, CreditCard, MessageSquare, ChevronRight,
  Settings, RefreshCw
} from 'lucide-react'

interface Notification {
  id: string
  type: 'referral_submitted' | 'referral_hired' | 'referral_paid' | 
        'payout_requested' | 'payout_paid' | 'payout_rejected' | 
        'subscription_expiring' | 'subscription_expired' | 'job_posted' | 
        'application_received' | 'system' | 'message'
  title: string
  message: string
  isRead: boolean
  createdAt: string
  data?: {
    referralId?: string
    jobTitle?: string
    amount?: number
    company?: string
    daysLeft?: number
  }
}

interface NotificationsPanelProps {
  isOpen: boolean
  onClose: () => void
}

const notificationIcons: Record<string, typeof Bell> = {
  referral_submitted: UserPlus,
  referral_hired: Briefcase,
  referral_paid: DollarSign,
  payout_requested: CreditCard,
  payout_paid: DollarSign,
  payout_rejected: AlertCircle,
  subscription_expiring: Calendar,
  subscription_expired: AlertCircle,
  job_posted: Briefcase,
  application_received: UserPlus,
  system: Info,
  message: MessageSquare
}

const notificationColors: Record<string, string> = {
  referral_submitted: 'bg-blue-500',
  referral_hired: 'bg-emerald-500',
  referral_paid: 'bg-green-500',
  payout_requested: 'bg-purple-500',
  payout_paid: 'bg-emerald-500',
  payout_rejected: 'bg-red-500',
  subscription_expiring: 'bg-amber-500',
  subscription_expired: 'bg-red-500',
  job_posted: 'bg-blue-500',
  application_received: 'bg-cyan-500',
  system: 'bg-slate-500',
  message: 'bg-indigo-500'
}

const notificationLabels: Record<string, string> = {
  referral_submitted: 'Referral',
  referral_hired: 'Referral Hired',
  referral_paid: 'Bonus Paid',
  payout_requested: 'Payout',
  payout_paid: 'Payout Complete',
  payout_rejected: 'Payout Rejected',
  subscription_expiring: 'Subscription',
  subscription_expired: 'Subscription Expired',
  job_posted: 'New Job',
  application_received: 'Application',
  system: 'System',
  message: 'Message'
}

export default function NotificationsPanel({ isOpen, onClose }: NotificationsPanelProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [filter, setFilter] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const panelRef = useRef<HTMLDivElement>(null)

  // Mock data - in production, fetch from API
  useEffect(() => {
    const mockNotifications: Notification[] = [
      {
        id: '1',
        type: 'referral_hired',
        title: 'Congratulations! Your referral was hired',
        message: 'Your referral for Senior Software Engineer at Tech Corp has been hired. You will receive 500,000 MMK bonus.',
        isRead: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        data: { jobTitle: 'Senior Software Engineer', company: 'Tech Corp', amount: 500000 }
      },
      {
        id: '2',
        type: 'payout_paid',
        title: 'Payout Completed',
        message: 'Your payout of 425,000 MMK has been processed and sent to your KBZPay account.',
        isRead: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        data: { amount: 425000 }
      },
      {
        id: '3',
        type: 'referral_submitted',
        title: 'Referral Submitted Successfully',
        message: 'Your referral for John Doe has been submitted for Frontend Developer position.',
        isRead: true,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        data: { jobTitle: 'Frontend Developer' }
      },
      {
        id: '4',
        type: 'subscription_expiring',
        title: 'Subscription Expiring Soon',
        message: 'Your Premium subscription will expire in 5 days. Renew now to keep posting jobs.',
        isRead: true,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
        data: { daysLeft: 5 }
      },
      {
        id: '5',
        type: 'system',
        title: 'Welcome to TRM Referral Platform',
        message: 'Start referring candidates and earn bonuses when they get hired!',
        isRead: true,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString()
      }
    ]
    setNotifications(mockNotifications)
    setUnreadCount(mockNotifications.filter(n => !n.isRead).length)
  }, [])

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose()
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, onClose])

  const filteredNotifications = notifications.filter(n => 
    filter === 'all' ? true : 
    filter === 'unread' ? !n.isRead :
    n.type.includes(filter)
  )

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => 
      n.id === id ? { ...n, isRead: true } : n
    ))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    setUnreadCount(0)
  }

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
    const deleted = notifications.find(n => n.id === id)
    if (deleted && !deleted.isRead) {
      setUnreadCount(prev => Math.max(0, prev - 1))
    }
  }

  const clearAll = () => {
    setNotifications([])
    setUnreadCount(0)
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const refreshNotifications = () => {
    setIsLoading(true)
    setTimeout(() => setIsLoading(false), 1000)
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50"
        onClick={onClose}
      />
      <motion.div
        ref={panelRef}
        initial={{ opacity: 0, x: 400 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 400 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Bell className="w-6 h-6" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-xs flex items-center justify-center font-bold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold">Notifications</h2>
                <p className="text-blue-100 text-sm">
                  {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={refreshNotifications}
                className={`w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors ${isLoading ? 'animate-spin' : ''}`}
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              <button 
                onClick={onClose}
                className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="border-b border-slate-200">
          <div className="flex items-center gap-1 p-2 overflow-x-auto">
            {[
              { id: 'all', label: 'All', count: notifications.length },
              { id: 'unread', label: 'Unread', count: unreadCount },
              { id: 'referral', label: 'Referrals', count: notifications.filter(n => n.type.includes('referral')).length },
              { id: 'payout', label: 'Payouts', count: notifications.filter(n => n.type.includes('payout')).length },
              { id: 'system', label: 'System', count: notifications.filter(n => n.type === 'system' || n.type === 'subscription_expiring').length }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  filter === tab.id 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={`ml-2 px-1.5 py-0.5 rounded text-xs ${
                    filter === tab.id ? 'bg-blue-200 text-blue-800' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        {notifications.length > 0 && (
          <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 bg-slate-50">
            <button
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
              className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <CheckCheck className="w-4 h-4" />
              Mark all read
            </button>
            <button
              onClick={clearAll}
              className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-red-600 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Clear all
            </button>
          </div>
        )}

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto">
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <Bell className="w-10 h-10 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">
                {filter === 'all' ? 'No notifications yet' : 'No notifications in this category'}
              </h3>
              <p className="text-slate-500 text-sm">
                {filter === 'all' 
                  ? 'We will notify you when something important happens.' 
                  : 'Try selecting a different filter.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredNotifications.map((notification, index) => {
                const Icon = notificationIcons[notification.type] || Bell
                return (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`p-4 hover:bg-slate-50 transition-colors group ${
                      !notification.isRead ? 'bg-blue-50/50' : ''
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className={`w-10 h-10 rounded-xl ${notificationColors[notification.type]} flex items-center justify-center flex-shrink-0`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                              notificationColors[notification.type].replace('bg-', 'bg-opacity-20 text-').replace('500', '700')
                            }`}>
                              {notificationLabels[notification.type]}
                            </span>
                            <h4 className={`font-semibold text-slate-800 mt-1 ${!notification.isRead ? 'text-slate-900' : ''}`}>
                              {notification.title}
                            </h4>
                          </div>
                          <span className="text-xs text-slate-400 whitespace-nowrap">
                            {formatTime(notification.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        
                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!notification.isRead && (
                            <button
                              onClick={() => markAsRead(notification.id)}
                              className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                            >
                              <Check className="w-3 h-3" />
                              Mark as read
                            </button>
                          )}
                          <button
                            onClick={() => deleteNotification(notification.id)}
                            className="flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-red-600"
                          >
                            <Trash2 className="w-3 h-3" />
                            Delete
                          </button>
                        </div>
                      </div>
                      
                      {/* Unread Indicator */}
                      {!notification.isRead && (
                        <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-2" />
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 p-4 bg-slate-50">
          <button className="w-full flex items-center justify-center gap-2 py-3 text-slate-600 hover:text-slate-800 font-medium transition-colors">
            <Settings className="w-4 h-4" />
            Notification Settings
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

// Notification Badge Component for Navigation
export function NotificationBadge({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="relative p-2 text-slate-400 hover:text-white transition-colors"
    >
      <Bell className="w-5 h-5" />
      {count > 0 && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-0 right-0 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center font-bold text-white border-2 border-slate-900"
        >
          {count > 9 ? '9+' : count}
        </motion.span>
      )}
    </button>
  )
}
