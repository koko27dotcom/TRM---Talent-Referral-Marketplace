import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"
import { cva, type VariantProps } from "class-variance-authority"
import { User } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * TRM Referral Avatar Component
 * 
 * A versatile avatar component with fallback support, status indicators,
 * and group stacking capabilities.
 * 
 * @example
 * ```tsx
 * <Avatar>
 *   <AvatarImage src="https://example.com/avatar.jpg" />
 *   <AvatarFallback>JD</AvatarFallback>
 * </Avatar>
 * 
 * <Avatar size="lg" status="online">
 *   <AvatarImage src="..." />
 *   <AvatarFallback>John Doe</AvatarFallback>
 * </Avatar>
 * ```
 */

const avatarVariants = cva(
  "relative flex shrink-0 overflow-hidden rounded-full",
  {
    variants: {
      size: {
        xs: "h-6 w-6 text-xs",
        sm: "h-8 w-8 text-xs",
        md: "h-10 w-10 text-sm",
        lg: "h-12 w-12 text-base",
        xl: "h-16 w-16 text-lg",
        "2xl": "h-20 w-20 text-xl",
        "3xl": "h-24 w-24 text-2xl",
      },
      variant: {
        default: "",
        square: "rounded-lg",
        rounded: "rounded-xl",
      },
      border: {
        none: "",
        white: "ring-2 ring-white dark:ring-slate-800",
        primary: "ring-2 ring-primary-500",
      },
    },
    defaultVariants: {
      size: "md",
      variant: "default",
      border: "none",
    },
  }
)

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root> &
    VariantProps<typeof avatarVariants> & {
      status?: "online" | "offline" | "away" | "busy" | null
      statusPosition?: "bottom-right" | "top-right" | "bottom-left" | "top-left"
    }
>(({ className, size, variant, border, status, statusPosition = "bottom-right", ...props }, ref) => {
  const statusColors = {
    online: "bg-green-500",
    offline: "bg-neutral-400",
    away: "bg-amber-500",
    busy: "bg-red-500",
  }

  const statusPositionClasses = {
    "bottom-right": "-bottom-0.5 -right-0.5",
    "top-right": "-top-0.5 -right-0.5",
    "bottom-left": "-bottom-0.5 -left-0.5",
    "top-left": "-top-0.5 -left-0.5",
  }

  const statusSizeClasses = {
    xs: "w-2 h-2",
    sm: "w-2.5 h-2.5",
    md: "w-3 h-3",
    lg: "w-3.5 h-3.5",
    xl: "w-4 h-4",
    "2xl": "w-5 h-5",
    "3xl": "w-6 h-6",
  }

  return (
    <div className="relative inline-block">
      <AvatarPrimitive.Root
        ref={ref}
        className={cn(avatarVariants({ size, variant, border }), className)}
        {...props}
      />
      {status && (
        <span
          className={cn(
            "absolute block rounded-full ring-2 ring-white dark:ring-slate-800",
            statusColors[status],
            statusPositionClasses[statusPosition],
            statusSizeClasses[size || "md"]
          )}
          aria-label={`Status: ${status}`}
        />
      )}
    </div>
  )
})
Avatar.displayName = AvatarPrimitive.Root.displayName

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn("aspect-square h-full w-full object-cover", className)}
    {...props}
  />
))
AvatarImage.displayName = AvatarPrimitive.Image.displayName

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback> & {
    name?: string
  }
>(({ className, name, children, ...props }, ref) => {
  // Generate initials from name
  const initials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : children

  return (
    <AvatarPrimitive.Fallback
      ref={ref}
      className={cn(
        "flex h-full w-full items-center justify-center rounded-full",
        "bg-neutral-100 dark:bg-slate-700",
        "text-neutral-600 dark:text-slate-300",
        "font-medium",
        className
      )}
      {...props}
    >
      {initials || <User className="h-1/2 w-1/2" />}
    </AvatarPrimitive.Fallback>
  )
})
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

// Avatar Group Component
interface AvatarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  max?: number
  spacing?: "tight" | "normal" | "loose"
  size?: "xs" | "sm" | "md" | "lg" | "xl"
}

function AvatarGroup({
  children,
  max = 5,
  spacing = "normal",
  size = "md",
  className,
  ...props
}: AvatarGroupProps) {
  const childrenArray = React.Children.toArray(children)
  const totalChildren = childrenArray.length
  const displayChildren = childrenArray.slice(0, max)
  const remainingCount = totalChildren - max

  const spacingClasses = {
    tight: "-space-x-2",
    normal: "-space-x-3",
    loose: "-space-x-1",
  }

  const ringClasses = {
    xs: "ring-1",
    sm: "ring-2",
    md: "ring-2",
    lg: "ring-2",
    xl: "ring-2",
  }

  return (
    <div className={cn("flex items-center", spacingClasses[spacing], className)} {...props}>
      {displayChildren.map((child, index) => (
        <div
          key={index}
          className={cn(
            "relative inline-block rounded-full",
            ringClasses[size],
            "ring-white dark:ring-slate-800"
          )}
        >
          {child}
        </div>
      ))}
      {remainingCount > 0 && (
        <div
          className={cn(
            "relative inline-flex items-center justify-center rounded-full",
            "bg-neutral-200 dark:bg-slate-700",
            "text-neutral-600 dark:text-slate-300",
            "font-medium text-sm",
            ringClasses[size],
            "ring-white dark:ring-slate-800",
            avatarVariants({ size })
          )}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  )
}

// Company Logo Avatar (specialized for company logos)
interface CompanyAvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string
  name: string
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl"
  variant?: "default" | "square" | "rounded"
}

function CompanyAvatar({
  src,
  name,
  size = "md",
  variant = "square",
  className,
  ...props
}: CompanyAvatarProps) {
  // Generate background color from name
  const colors = [
    "bg-blue-100 text-blue-700",
    "bg-green-100 text-green-700",
    "bg-purple-100 text-purple-700",
    "bg-amber-100 text-amber-700",
    "bg-rose-100 text-rose-700",
    "bg-cyan-100 text-cyan-700",
  ]
  const colorIndex = name.charCodeAt(0) % colors.length
  const colorClass = colors[colorIndex]

  // Get first letter or first two letters
  const initials = name.slice(0, 2).toUpperCase()

  return (
    <AvatarPrimitive.Root
      className={cn(
        avatarVariants({ size, variant }),
        "bg-white dark:bg-slate-800",
        "border border-neutral-200 dark:border-slate-700",
        className
      )}
      {...props}
    >
      {src ? (
        <AvatarImage src={src} alt={name} />
      ) : (
        <div
          className={cn(
            "flex h-full w-full items-center justify-center",
            "rounded-lg",
            colorClass,
            "font-bold"
          )}
        >
          {initials}
        </div>
      )}
    </AvatarPrimitive.Root>
  )
}

export {
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarGroup,
  CompanyAvatar,
}
