import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * TRM Referral Card Component
 * 
 * A versatile card component with multiple variants and composable sub-components.
 * Supports hover effects, different elevations, and dark mode.
 * 
 * @example
 * ```tsx
 * <Card>
 *   <CardHeader>
 *     <CardTitle>Job Title</CardTitle>
 *     <CardDescription>Company Name</CardDescription>
 *   </CardHeader>
 *   <CardContent>
 *     <p>Job description...</p>
 *   </CardContent>
 *   <CardFooter>
 *     <Button>Apply Now</Button>
 *   </CardFooter>
 * </Card>
 * ```
 */

const cardVariants = cva(
  // Base styles
  [
    "rounded-xl bg-white",
    "border border-neutral-200",
    "transition-all duration-300",
    "dark:bg-slate-800 dark:border-slate-700",
  ],
  {
    variants: {
      variant: {
        default: [
          "shadow-sm",
          "hover:shadow-md",
        ],
        flat: [
          "shadow-none",
          "border-neutral-200",
        ],
        elevated: [
          "shadow-lg",
          "hover:shadow-xl",
        ],
        outlined: [
          "shadow-none",
          "border-2 border-neutral-300",
          "dark:border-slate-600",
        ],
        interactive: [
          "shadow-sm",
          "cursor-pointer",
          "hover:shadow-lg hover:-translate-y-1",
          "active:scale-[0.99]",
        ],
        ghost: [
          "shadow-none border-transparent",
          "bg-transparent",
          "hover:bg-neutral-50 dark:hover:bg-slate-800/50",
        ],
      },
      padding: {
        none: "",
        sm: "p-4",
        default: "p-6",
        lg: "p-8",
      },
    },
    defaultVariants: {
      variant: "default",
      padding: "default",
    },
  }
)

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  /** Make the entire card clickable */
  asChild?: boolean
  /** Add hover lift effect */
  hoverable?: boolean
  /** Loading state with skeleton */
  loading?: boolean
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    { className, variant, padding, hoverable, loading, children, ...props },
    ref
  ) => {
    if (loading) {
      return <CardSkeleton className={className} />
    }

    return (
      <div
        ref={ref}
        className={cn(
          cardVariants({ variant, padding }),
          hoverable && "hover:-translate-y-1 hover:shadow-lg",
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
Card.displayName = "Card"

// Card Header
const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex flex-col space-y-1.5",
      "p-6 pb-0",
      className
    )}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

// Card Title
const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-xl font-semibold leading-tight tracking-tight",
      "text-neutral-900 dark:text-neutral-100",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

// Card Description
const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn(
      "text-sm text-neutral-500 dark:text-neutral-400",
      className
    )}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

// Card Content
const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "p-6 pt-0",
      "text-neutral-700 dark:text-neutral-300",
      className
    )}
    {...props}
  />
))
CardContent.displayName = "CardContent"

// Card Footer
const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex items-center",
      "p-6 pt-0",
      "gap-2",
      className
    )}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

// Card Image
const CardImage = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    src?: string
    alt?: string
    aspectRatio?: "video" | "square" | "wide" | "auto"
    overlay?: React.ReactNode
  }
>(({ className, src, alt, aspectRatio = "video", overlay, ...props }, ref) => {
  const aspectClasses = {
    video: "aspect-video",
    square: "aspect-square",
    wide: "aspect-[21/9]",
    auto: "",
  }

  return (
    <div
      ref={ref}
      className={cn(
        "relative overflow-hidden",
        "rounded-t-xl",
        aspectClasses[aspectRatio],
        className
      )}
      {...props}
    >
      {src && (
        <img
          src={src}
          alt={alt || ""}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      )}
      {overlay && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
          {overlay}
        </div>
      )}
    </div>
  )
})
CardImage.displayName = "CardImage"

// Card Badge
const CardBadge = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    variant?: "default" | "success" | "warning" | "error" | "info"
  }
>(({ className, variant = "default", ...props }, ref) => {
  const variantClasses = {
    default: "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300",
    success: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    warning: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    error: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    info: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  }

  return (
    <div
      ref={ref}
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full",
        "text-xs font-medium",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  )
})
CardBadge.displayName = "CardBadge"

// Card Skeleton for loading states
function CardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-xl bg-white border border-neutral-200 p-6",
        "animate-pulse",
        className
      )}
    >
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-lg bg-neutral-200" />
        <div className="flex-1 space-y-3">
          <div className="h-5 w-3/4 rounded bg-neutral-200" />
          <div className="h-4 w-1/2 rounded bg-neutral-200" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-4 w-full rounded bg-neutral-200" />
        <div className="h-4 w-5/6 rounded bg-neutral-200" />
      </div>
    </div>
  )
}

// Stats Card - Specialized card for displaying metrics
interface StatsCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  value: string | number
  description?: string
  trend?: {
    value: number
    isPositive: boolean
  }
  icon?: React.ReactNode
  variant?: "default" | "success" | "warning" | "error"
}

const StatsCard = React.forwardRef<HTMLDivElement, StatsCardProps>(
  (
    { className, title, value, description, trend, icon, variant = "default", ...props },
    ref
  ) => {
    const variantStyles = {
      default: "bg-white dark:bg-slate-800",
      success: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
      warning: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800",
      error: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
    }

    return (
      <Card
        ref={ref}
        className={cn(variantStyles[variant], className)}
        {...props}
      >
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                {title}
              </p>
              <p className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
                {value}
              </p>
              {description && (
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  {description}
                </p>
              )}
              {trend && (
                <div className="flex items-center gap-1 text-sm">
                  <span
                    className={cn(
                      trend.isPositive ? "text-success" : "text-error"
                    )}
                  >
                    {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}%
                  </span>
                  <span className="text-neutral-400">vs last month</span>
                </div>
              )}
            </div>
            {icon && (
              <div className="p-3 rounded-lg bg-neutral-100 dark:bg-slate-700">
                {icon}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }
)
StatsCard.displayName = "StatsCard"

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardImage,
  CardBadge,
  CardSkeleton,
  StatsCard,
}
