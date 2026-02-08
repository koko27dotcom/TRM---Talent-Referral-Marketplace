import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * TRM Referral Skeleton Loading Components
 * 
 * A comprehensive set of skeleton loading components for various use cases.
 * Provides smooth shimmer animations and supports multiple shapes and sizes.
 * 
 * @example
 * ```tsx
 * <Skeleton className="h-4 w-[250px]" />
 * <SkeletonCard />
 * <SkeletonText lines={3} />
 * ```
 */

// Base Skeleton component
const skeletonVariants = cva(
  [
    "animate-pulse",
    "rounded-md",
    "bg-neutral-200 dark:bg-slate-700",
  ],
  {
    variants: {
      variant: {
        default: "",
        shimmer: [
          "relative",
          "overflow-hidden",
          "bg-neutral-200 dark:bg-slate-800",
          "before:absolute before:inset-0",
          "before:-translate-x-full",
          "before:animate-shimmer",
          "before:bg-gradient-to-r",
          "before:from-transparent before:via-white/20 before:to-transparent",
          "dark:before:via-white/5",
        ],
        circle: "rounded-full",
        rounded: "rounded-xl",
      },
      size: {
        default: "",
        sm: "h-3",
        md: "h-4",
        lg: "h-6",
        xl: "h-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface SkeletonProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof skeletonVariants> {}

function Skeleton({ className, variant, size, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(skeletonVariants({ variant, size }), className)}
      {...props}
    />
  )
}

// Text Skeleton - Multiple lines
interface SkeletonTextProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Number of lines to render */
  lines?: number
  /** Width of last line (percentage or px) */
  lastLineWidth?: string
  /** Gap between lines */
  gap?: number
  /** Line height */
  lineHeight?: number
}

function SkeletonText({
  lines = 3,
  lastLineWidth = "60%",
  gap = 2,
  lineHeight = 4,
  className,
  ...props
}: SkeletonTextProps) {
  return (
    <div className={cn("space-y-2", className)} {...props}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            "w-full",
            i === lines - 1 && lastLineWidth !== "100%" && `w-[${lastLineWidth}]`
          )}
          style={{
            height: `${lineHeight * 0.25}rem`,
            marginBottom: i < lines - 1 ? `${gap * 0.25}rem` : 0,
          }}
        />
      ))}
    </div>
  )
}

// Avatar Skeleton
interface SkeletonAvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "xs" | "sm" | "md" | "lg" | "xl" | number
}

function SkeletonAvatar({
  size = "md",
  className,
  ...props
}: SkeletonAvatarProps) {
  const sizeClasses = {
    xs: "h-6 w-6",
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
    xl: "h-16 w-16",
  }

  const sizeValue = typeof size === "number" ? size : null

  return (
    <Skeleton
      variant="circle"
      className={cn(
        typeof size === "string" && sizeClasses[size],
        className
      )}
      style={sizeValue ? { width: sizeValue, height: sizeValue } : undefined}
      {...props}
    />
  )
}

// Card Skeleton
interface SkeletonCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Show image placeholder */
  hasImage?: boolean
  /** Show avatar placeholder */
  hasAvatar?: boolean
  /** Number of content lines */
  contentLines?: number
  /** Show footer with buttons */
  hasFooter?: boolean
  /** Image aspect ratio */
  imageAspect?: "video" | "square" | "wide"
}

function SkeletonCard({
  hasImage = false,
  hasAvatar = false,
  contentLines = 2,
  hasFooter = false,
  imageAspect = "video",
  className,
  ...props
}: SkeletonCardProps) {
  const aspectClasses = {
    video: "aspect-video",
    square: "aspect-square",
    wide: "aspect-[21/9]",
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-neutral-200 bg-white p-6",
        "dark:border-slate-700 dark:bg-slate-800",
        className
      )}
      {...props}
    >
      {/* Image */}
      {hasImage && (
        <Skeleton
          className={cn("w-full rounded-lg mb-4", aspectClasses[imageAspect])}
        />
      )}

      {/* Header with avatar */}
      <div className="flex items-start gap-4 mb-4">
        {hasAvatar && <SkeletonAvatar size="lg" />}
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>

      {/* Content */}
      <SkeletonText lines={contentLines} className="mb-4" />

      {/* Footer */}
      {hasFooter && (
        <div className="flex items-center gap-3 pt-4 border-t border-neutral-100 dark:border-slate-700">
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
      )}
    </div>
  )
}

// Job Card Skeleton (specialized for job listings)
function SkeletonJobCard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-neutral-200 bg-white p-5",
        "dark:border-slate-700 dark:bg-slate-800",
        className
      )}
      {...props}
    >
      <div className="flex items-start gap-4">
        {/* Company logo placeholder */}
        <Skeleton className="h-12 w-12 rounded-lg flex-shrink-0" />
        
        <div className="flex-1 min-w-0">
          {/* Job title */}
          <Skeleton className="h-5 w-3/4 mb-2" />
          {/* Company name */}
          <Skeleton className="h-4 w-1/2 mb-3" />
          
          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-3">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          
          {/* Footer info */}
          <div className="flex items-center gap-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
      </div>
    </div>
  )
}

// Table Skeleton
interface SkeletonTableProps extends React.HTMLAttributes<HTMLDivElement> {
  rows?: number
  columns?: number
  showHeader?: boolean
}

function SkeletonTable({
  rows = 5,
  columns = 4,
  showHeader = true,
  className,
  ...props
}: SkeletonTableProps) {
  return (
    <div className={cn("w-full", className)} {...props}>
      {/* Header */}
      {showHeader && (
        <div className="flex gap-4 pb-4 border-b border-neutral-200 dark:border-slate-700">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton
              key={`header-${i}`}
              className="h-5 flex-1"
              style={{ flex: i === 0 ? 2 : 1 }}
            />
          ))}
        </div>
      )}

      {/* Rows */}
      <div className="space-y-4 pt-4">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            key={`row-${rowIndex}`}
            className="flex gap-4 items-center"
          >
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton
                key={`cell-${rowIndex}-${colIndex}`}
                className="h-4"
                style={{
                  flex: colIndex === 0 ? 2 : 1,
                  width: colIndex === columns - 1 ? "80px" : undefined,
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// Stats Card Skeleton
function SkeletonStatsCard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-neutral-200 bg-white p-6",
        "dark:border-slate-700 dark:bg-slate-800",
        className
      )}
      {...props}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-3 flex-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-12 w-12 rounded-lg" />
      </div>
    </div>
  )
}

// List Skeleton
interface SkeletonListProps extends React.HTMLAttributes<HTMLDivElement> {
  items?: number
  showAvatar?: boolean
  lines?: number
}

function SkeletonList({
  items = 5,
  showAvatar = true,
  lines = 2,
  className,
  ...props
}: SkeletonListProps) {
  return (
    <div className={cn("space-y-4", className)} {...props}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-start gap-4">
          {showAvatar && <SkeletonAvatar size="md" />}
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            {lines > 1 && <Skeleton className="h-3 w-3/4" />}
            {lines > 2 && <Skeleton className="h-3 w-1/2" />}
          </div>
        </div>
      ))}
    </div>
  )
}

// Dashboard Stats Row Skeleton
function SkeletonDashboardStats({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonStatsCard key={i} />
      ))}
    </div>
  )
}

// Form Skeleton
function SkeletonForm({ fields = 4 }: { fields?: number }) {
  return (
    <div className="space-y-6">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
      ))}
      <Skeleton className="h-12 w-32 rounded-lg" />
    </div>
  )
}

// Profile Header Skeleton
function SkeletonProfileHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-neutral-200 bg-white overflow-hidden",
        "dark:border-slate-700 dark:bg-slate-800",
        className
      )}
      {...props}
    >
      {/* Cover image */}
      <Skeleton className="h-32 w-full" />
      
      <div className="px-6 pb-6">
        <div className="relative flex justify-between items-end -mt-12 mb-4">
          {/* Avatar */}
          <SkeletonAvatar size={96} className="border-4 border-white dark:border-slate-800" />
          
          {/* Action buttons */}
          <div className="flex gap-2 mb-2">
            <Skeleton className="h-10 w-24 rounded-lg" />
            <Skeleton className="h-10 w-10 rounded-lg" />
          </div>
        </div>
        
        {/* Info */}
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
          <SkeletonText lines={2} className="mt-4" />
        </div>
      </div>
    </div>
  )
}

export {
  Skeleton,
  SkeletonText,
  SkeletonAvatar,
  SkeletonCard,
  SkeletonJobCard,
  SkeletonTable,
  SkeletonStatsCard,
  SkeletonList,
  SkeletonDashboardStats,
  SkeletonForm,
  SkeletonProfileHeader,
}
