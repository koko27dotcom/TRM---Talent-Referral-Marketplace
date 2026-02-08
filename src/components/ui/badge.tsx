import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/**
 * TRM Referral Badge Component
 * 
 * A versatile badge component for status indicators, labels, and counts.
 * Supports multiple variants, sizes, and interactive states.
 * 
 * @example
 * ```tsx
 * <Badge>Default</Badge>
 * <Badge variant="success">Active</Badge>
 * <Badge variant="outline" size="lg">Premium</Badge>
 * <Badge dot color="green">Online</Badge>
 * ```
 */

const badgeVariants = cva(
  [
    "inline-flex items-center justify-center",
    "rounded-full",
    "font-medium",
    "transition-colors",
    "focus:outline-none focus:ring-2 focus:ring-offset-1",
  ],
  {
    variants: {
      variant: {
        // Filled variants
        default: [
          "bg-primary-100 text-primary-700",
          "dark:bg-primary-900/30 dark:text-primary-300",
          "focus:ring-primary-500",
        ],
        primary: [
          "bg-primary-600 text-white",
          "dark:bg-primary-500",
          "focus:ring-primary-500",
        ],
        secondary: [
          "bg-neutral-100 text-neutral-700",
          "dark:bg-slate-700 dark:text-slate-300",
          "focus:ring-neutral-500",
        ],
        success: [
          "bg-green-100 text-green-700",
          "dark:bg-green-900/30 dark:text-green-300",
          "focus:ring-green-500",
        ],
        warning: [
          "bg-amber-100 text-amber-700",
          "dark:bg-amber-900/30 dark:text-amber-300",
          "focus:ring-amber-500",
        ],
        error: [
          "bg-red-100 text-red-700",
          "dark:bg-red-900/30 dark:text-red-300",
          "focus:ring-red-500",
        ],
        info: [
          "bg-blue-100 text-blue-700",
          "dark:bg-blue-900/30 dark:text-blue-300",
          "focus:ring-blue-500",
        ],
        // Outline variants
        outline: [
          "border-2 border-current bg-transparent",
          "text-neutral-600 dark:text-slate-400",
          "focus:ring-neutral-500",
        ],
        "outline-primary": [
          "border-2 border-primary-500 bg-transparent",
          "text-primary-600 dark:text-primary-400",
          "focus:ring-primary-500",
        ],
        "outline-success": [
          "border-2 border-green-500 bg-transparent",
          "text-green-600 dark:text-green-400",
          "focus:ring-green-500",
        ],
        "outline-warning": [
          "border-2 border-amber-500 bg-transparent",
          "text-amber-600 dark:text-amber-400",
          "focus:ring-amber-500",
        ],
        "outline-error": [
          "border-2 border-red-500 bg-transparent",
          "text-red-600 dark:text-red-400",
          "focus:ring-red-500",
        ],
        // Soft variants
        soft: [
          "bg-neutral-50 text-neutral-600",
          "dark:bg-slate-800 dark:text-slate-400",
          "focus:ring-neutral-500",
        ],
      },
      size: {
        xs: "px-2 py-0.5 text-[10px]",
        sm: "px-2.5 py-0.5 text-xs",
        md: "px-3 py-1 text-sm",
        lg: "px-4 py-1.5 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "sm",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  /** Dot indicator color */
  dot?: boolean
  dotColor?: "green" | "red" | "amber" | "blue" | "gray" | "purple"
  /** Pulse animation for the dot */
  pulse?: boolean
  /** Remove button */
  onRemove?: () => void
  /** Make badge clickable */
  clickable?: boolean
}

function Badge({
  className,
  variant,
  size,
  dot,
  dotColor = "green",
  pulse = false,
  onRemove,
  clickable,
  children,
  ...props
}: BadgeProps) {
  const dotColors = {
    green: "bg-green-500",
    red: "bg-red-500",
    amber: "bg-amber-500",
    blue: "bg-blue-500",
    gray: "bg-gray-500",
    purple: "bg-purple-500",
  }

  const Comp = clickable ? "button" : "span"

  return (
    <Comp
      className={cn(
        badgeVariants({ variant, size }),
        clickable && "cursor-pointer hover:opacity-80 active:scale-95",
        className
      )}
      {...(clickable && { type: "button" })}
      {...props}
    >
      {dot && (
        <span
          className={cn(
            "mr-1.5 h-2 w-2 rounded-full",
            dotColors[dotColor],
            pulse && "animate-pulse"
          )}
        />
      )}
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className={cn(
            "ml-1.5 -mr-1 rounded-full p-0.5",
            "hover:bg-black/10 dark:hover:bg-white/10",
            "focus:outline-none focus:ring-1 focus:ring-current"
          )}
        >
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </Comp>
  )
}

// Status Badge - Specialized for status indicators
interface StatusBadgeProps extends Omit<BadgeProps, "variant" | "dot"> {
  status: "active" | "inactive" | "pending" | "error" | "warning" | "success"
  showDot?: boolean
}

function StatusBadge({ status, showDot = true, ...props }: StatusBadgeProps) {
  const statusConfig = {
    active: { variant: "success" as const, dotColor: "green" as const, label: "Active" },
    inactive: { variant: "secondary" as const, dotColor: "gray" as const, label: "Inactive" },
    pending: { variant: "warning" as const, dotColor: "amber" as const, label: "Pending" },
    error: { variant: "error" as const, dotColor: "red" as const, label: "Error" },
    warning: { variant: "warning" as const, dotColor: "amber" as const, label: "Warning" },
    success: { variant: "success" as const, dotColor: "green" as const, label: "Success" },
  }

  const config = statusConfig[status]

  return (
    <Badge
      variant={config.variant}
      dot={showDot}
      dotColor={config.dotColor}
      {...props}
    >
      {props.children || config.label}
    </Badge>
  )
}

// Count Badge - For notification counts
interface CountBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  count: number
  max?: number
  size?: "sm" | "md" | "lg"
  variant?: "default" | "primary" | "error"
  showZero?: boolean
}

function CountBadge({
  count,
  max = 99,
  size = "sm",
  variant = "error",
  showZero = false,
  className,
  ...props
}: CountBadgeProps) {
  if (count === 0 && !showZero) return null

  const displayCount = count > max ? `${max}+` : count

  const sizeClasses = {
    sm: "min-w-[18px] h-[18px] text-[10px] px-1",
    md: "min-w-[20px] h-[20px] text-xs px-1.5",
    lg: "min-w-[24px] h-[24px] text-sm px-2",
  }

  const variantClasses = {
    default: "bg-neutral-500 text-white",
    primary: "bg-primary-600 text-white",
    error: "bg-red-500 text-white",
  }

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full font-semibold",
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {displayCount}
    </span>
  )
}

// Job Type Badge - Specialized for job listings
interface JobTypeBadgeProps extends Omit<BadgeProps, "variant"> {
  type: "full-time" | "part-time" | "contract" | "freelance" | "internship" | "remote"
}

function JobTypeBadge({ type, ...props }: JobTypeBadgeProps) {
  const typeConfig = {
    "full-time": { variant: "primary" as const, label: "Full-time" },
    "part-time": { variant: "info" as const, label: "Part-time" },
    "contract": { variant: "warning" as const, label: "Contract" },
    "freelance": { variant: "secondary" as const, label: "Freelance" },
    "internship": { variant: "outline" as const, label: "Internship" },
    "remote": { variant: "success" as const, label: "Remote" },
  }

  const config = typeConfig[type]

  return (
    <Badge variant={config.variant} {...props}>
      {props.children || config.label}
    </Badge>
  )
}

// Skill Badge - For displaying skills/tags
interface SkillBadgeProps extends Omit<BadgeProps, "variant"> {
  skill: string
  onRemove?: () => void
}

function SkillBadge({ skill, onRemove, ...props }: SkillBadgeProps) {
  return (
    <Badge
      variant="soft"
      size="sm"
      onRemove={onRemove}
      {...props}
    >
      {skill}
    </Badge>
  )
}

export {
  Badge,
  badgeVariants,
  StatusBadge,
  CountBadge,
  JobTypeBadge,
  SkillBadge,
}
