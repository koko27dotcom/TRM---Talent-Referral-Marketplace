import { 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  ShieldX,
  Clock,
  AlertCircle,
  CheckCircle2
} from 'lucide-react'

interface KYCStatusBadgeProps {
  level: number
  status?: 'not_started' | 'in_progress' | 'pending_review' | 'verified' | 'rejected'
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const LEVEL_CONFIG: Record<number, {
  label: string
  color: string
  bgColor: string
  borderColor: string
  icon: React.ElementType
}> = {
  0: {
    label: 'Not Verified',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-200',
    icon: Shield,
  },
  1: {
    label: 'Basic',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-200',
    icon: ShieldCheck,
  },
  2: {
    label: 'Verified',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    borderColor: 'border-green-200',
    icon: ShieldCheck,
  },
  3: {
    label: 'Advanced',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    borderColor: 'border-purple-200',
    icon: ShieldCheck,
  },
  4: {
    label: 'Business',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    borderColor: 'border-amber-200',
    icon: ShieldCheck,
  },
}

const STATUS_CONFIG: Record<string, {
  label: string
  color: string
  bgColor: string
  icon: React.ElementType
}> = {
  not_started: {
    label: 'Not Started',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    icon: Shield,
  },
  in_progress: {
    label: 'In Progress',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    icon: Clock,
  },
  pending_review: {
    label: 'Pending Review',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    icon: Clock,
  },
  verified: {
    label: 'Verified',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    icon: CheckCircle2,
  },
  rejected: {
    label: 'Rejected',
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    icon: ShieldX,
  },
}

const SIZE_CONFIG = {
  sm: {
    container: 'px-2 py-0.5 text-xs gap-1',
    icon: 'w-3 h-3',
  },
  md: {
    container: 'px-3 py-1 text-sm gap-1.5',
    icon: 'w-4 h-4',
  },
  lg: {
    container: 'px-4 py-2 text-base gap-2',
    icon: 'w-5 h-5',
  },
}

export function KYCStatusBadge({
  level,
  status,
  showLabel = true,
  size = 'md',
  className = '',
}: KYCStatusBadgeProps) {
  const levelConfig = LEVEL_CONFIG[level] || LEVEL_CONFIG[0]
  const statusConfig = status ? STATUS_CONFIG[status] : null
  const sizeConfig = SIZE_CONFIG[size]

  // Use status config if provided and status is not verified, otherwise use level config
  const config = (status && status !== 'verified') 
    ? statusConfig || levelConfig 
    : levelConfig

  const Icon = config.icon

  return (
    <div
      className={`
        inline-flex items-center rounded-full font-medium
        ${config.bgColor} ${config.color}
        ${sizeConfig.container}
        ${className}
      `}
    >
      <Icon className={sizeConfig.icon} />
      {showLabel && <span>{config.label}</span>}
    </div>
  )
}

// Extended version with tooltip and details
interface KYCStatusDetailProps extends KYCStatusBadgeProps {
  completedAt?: string
  expiresAt?: string
  onClick?: () => void
}

export function KYCStatusDetail({
  level,
  status,
  completedAt,
  expiresAt,
  onClick,
  showLabel = true,
  size = 'md',
  className = '',
}: KYCStatusDetailProps) {
  const levelConfig = LEVEL_CONFIG[level] || LEVEL_CONFIG[0]
  const statusConfig = status ? STATUS_CONFIG[status] : null
  const sizeConfig = SIZE_CONFIG[size]

  const config = (status && status !== 'verified') 
    ? statusConfig || levelConfig 
    : levelConfig

  const Icon = config.icon

  const getTooltipText = () => {
    if (status === 'rejected') {
      return 'Your verification was rejected. Please check your email for details.'
    }
    if (status === 'pending_review') {
      return 'Your documents are being reviewed. This usually takes 1-2 business days.'
    }
    if (expiresAt) {
      const daysUntilExpiry = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      if (daysUntilExpiry < 30) {
        return `Your verification expires in ${daysUntilExpiry} days. Please renew soon.`
      }
    }
    return null
  }

  const tooltipText = getTooltipText()

  return (
    <div className="group relative inline-block">
      <button
        onClick={onClick}
        className={`
          inline-flex items-center rounded-full font-medium transition-all
          ${config.bgColor} ${config.color}
          ${sizeConfig.container}
          ${onClick ? 'hover:opacity-80 cursor-pointer' : ''}
          ${className}
        `}
      >
        <Icon className={sizeConfig.icon} />
        {showLabel && <span>{config.label}</span>}
        {level > 0 && status === 'verified' && (
          <span className="ml-1 opacity-60">Lvl {level}</span>
        )}
      </button>

      {/* Tooltip */}
      {tooltipText && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
          {tooltipText}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </div>
      )}

      {/* Status Details */}
      {(completedAt || expiresAt) && (
        <div className="mt-1 text-xs text-gray-500 space-y-0.5">
          {completedAt && (
            <p>Verified: {new Date(completedAt).toLocaleDateString()}</p>
          )}
          {expiresAt && (
            <p className={new Date(expiresAt) < new Date() ? 'text-red-500' : ''}>
              Expires: {new Date(expiresAt).toLocaleDateString()}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// Compact version for tables and lists
interface KYCStatusCompactProps {
  level: number
  status?: string
  className?: string
}

export function KYCStatusCompact({ level, status, className = '' }: KYCStatusCompactProps) {
  const levelConfig = LEVEL_CONFIG[level] || LEVEL_CONFIG[0]
  const Icon = levelConfig.icon

  let statusColor = levelConfig.color
  if (status === 'rejected') statusColor = 'text-red-600'
  if (status === 'pending_review') statusColor = 'text-amber-600'
  if (status === 'in_progress') statusColor = 'text-blue-600'

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <Icon className={`w-4 h-4 ${statusColor}`} />
      <span className={`text-sm font-medium ${statusColor}`}>
        {level > 0 ? `Lvl ${level}` : 'Unverified'}
      </span>
    </div>
  )
}

// Progress indicator for KYC levels
interface KYCProgressProps {
  currentLevel: number
  targetLevel: number
  className?: string
}

export function KYCProgress({ currentLevel, targetLevel, className = '' }: KYCProgressProps) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {[1, 2, 3, 4].map((level) => (
        <div
          key={level}
          className={`
            w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
            ${currentLevel >= level 
              ? 'bg-green-500 text-white' 
              : currentLevel + 1 === level && targetLevel >= level
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-400'
            }
          `}
        >
          {currentLevel >= level ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            level
          )}
        </div>
      ))}
    </div>
  )
}
