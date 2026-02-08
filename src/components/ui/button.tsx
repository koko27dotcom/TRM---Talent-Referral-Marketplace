import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * TRM Referral Button Component
 * 
 * A comprehensive button component with multiple variants, sizes, and states.
 * Built with accessibility and mobile-first design in mind.
 * 
 * @example
 * ```tsx
 * <Button variant="primary" size="lg">Post Job</Button>
 * <Button variant="outline" loading>Loading...</Button>
 * <Button variant="danger" size="sm">Delete</Button>
 * ```
 */

const buttonVariants = cva(
  // Base styles - mobile-first with touch-friendly sizing
  [
    "inline-flex items-center justify-center",
    "whitespace-nowrap",
    "rounded-lg", // Slightly more rounded for modern look
    "text-sm font-medium",
    "ring-offset-white transition-all duration-200",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
    "active:scale-[0.98]", // Subtle press feedback
    "select-none",
    // Touch-friendly minimum size (48px for accessibility)
    "min-h-[40px] min-w-[40px]",
    "px-4 py-2",
  ],
  {
    variants: {
      variant: {
        // Primary - Main call-to-action
        primary: [
          "bg-primary-600 text-white",
          "hover:bg-primary-700",
          "active:bg-primary-800",
          "shadow-md hover:shadow-lg",
          "dark:bg-primary-500 dark:hover:bg-primary-600",
        ],
        // Secondary - Alternative actions
        secondary: [
          "bg-neutral-100 text-neutral-900",
          "hover:bg-neutral-200",
          "active:bg-neutral-300",
          "border border-neutral-200",
          "dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700",
          "dark:hover:bg-neutral-700",
        ],
        // Outline - Low emphasis, bordered
        outline: [
          "border-2 border-primary-600 text-primary-600",
          "bg-transparent",
          "hover:bg-primary-50",
          "active:bg-primary-100",
          "dark:border-primary-400 dark:text-primary-400",
          "dark:hover:bg-primary-950",
        ],
        // Ghost - Minimal, hover background only
        ghost: [
          "bg-transparent text-neutral-700",
          "hover:bg-neutral-100",
          "active:bg-neutral-200",
          "dark:text-neutral-300 dark:hover:bg-neutral-800",
        ],
        // Danger - Destructive actions
        danger: [
          "bg-error text-white",
          "hover:bg-error-dark",
          "active:bg-red-800",
          "shadow-md hover:shadow-lg",
        ],
        // Warning - Cautionary actions
        warning: [
          "bg-warning text-white",
          "hover:bg-warning-dark",
          "active:bg-amber-700",
          "shadow-md hover:shadow-lg",
        ],
        // Success - Positive actions
        success: [
          "bg-success text-white",
          "hover:bg-success-dark",
          "active:bg-green-800",
          "shadow-md hover:shadow-lg",
        ],
        // Link - Text-only button
        link: [
          "text-primary-600 underline-offset-4",
          "hover:underline",
          "bg-transparent",
          "dark:text-primary-400",
        ],
        // White - For dark backgrounds
        white: [
          "bg-white text-neutral-900",
          "hover:bg-neutral-50",
          "active:bg-neutral-100",
          "shadow-md",
          "border border-neutral-200",
        ],
      },
      size: {
        xs: ["h-7", "px-2.5", "py-1", "text-xs", "rounded-md", "min-h-[28px]"],
        sm: ["h-8", "px-3", "py-1.5", "text-sm", "rounded-md", "min-h-[32px]"],
        default: ["h-10", "px-4", "py-2", "min-h-[40px]"],
        lg: ["h-12", "px-6", "py-3", "text-base", "rounded-xl", "min-h-[48px]"],
        xl: ["h-14", "px-8", "py-4", "text-lg", "rounded-xl", "min-h-[56px]"],
        icon: ["h-10 w-10", "p-2", "min-h-[40px]", "min-w-[40px]"],
        "icon-sm": ["h-8 w-8", "p-1.5", "min-h-[32px]", "min-w-[32px]"],
        "icon-lg": ["h-12 w-12", "p-3", "min-h-[48px]", "min-w-[48px]"],
      },
      fullWidth: {
        true: "w-full",
        false: "",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
      fullWidth: false,
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Render as child component (for React Router links, etc.) */
  asChild?: boolean
  /** Show loading spinner and disable button */
  loading?: boolean
  /** Loading text to display (defaults to children) */
  loadingText?: string
  /** Position of loading spinner */
  loadingPosition?: "left" | "right"
  /** Icon to display before text */
  leftIcon?: React.ReactNode
  /** Icon to display after text */
  rightIcon?: React.ReactNode
  /** Full width button */
  fullWidth?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      asChild = false,
      loading = false,
      loadingText,
      loadingPosition = "left",
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button"

    // Determine if we should show loading state
    const isLoading = loading
    const isDisabled = disabled || isLoading

    // Loading spinner component
    const LoadingSpinner = (
      <Loader2
        className={cn(
          "h-4 w-4 animate-spin",
          size === "xs" && "h-3 w-3",
          size === "lg" && "h-5 w-5",
          size === "xl" && "h-6 w-6"
        )}
      />
    )

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, fullWidth, className }))}
        ref={ref}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        aria-busy={isLoading}
        {...props}
      >
        {isLoading && loadingPosition === "left" && (
          <span className="mr-2 flex items-center">{LoadingSpinner}</span>
        )}
        
        {!isLoading && leftIcon && (
          <span className="mr-2 flex items-center">{leftIcon}</span>
        )}
        
        <span className="flex items-center">
          {isLoading && loadingText ? loadingText : children}
        </span>
        
        {!isLoading && rightIcon && (
          <span className="ml-2 flex items-center">{rightIcon}</span>
        )}
        
        {isLoading && loadingPosition === "right" && (
          <span className="ml-2 flex items-center">{LoadingSpinner}</span>
        )}
      </Comp>
    )
  }
)

Button.displayName = "Button"

export { Button, buttonVariants }

// Convenience exports for common button combinations
export const PrimaryButton = React.forwardRef<
  HTMLButtonElement,
  Omit<ButtonProps, "variant">
>((props, ref) => <Button variant="primary" ref={ref} {...props} />)
PrimaryButton.displayName = "PrimaryButton"

export const SecondaryButton = React.forwardRef<
  HTMLButtonElement,
  Omit<ButtonProps, "variant">
>((props, ref) => <Button variant="secondary" ref={ref} {...props} />)
SecondaryButton.displayName = "SecondaryButton"

export const DangerButton = React.forwardRef<
  HTMLButtonElement,
  Omit<ButtonProps, "variant">
>((props, ref) => <Button variant="danger" ref={ref} {...props} />)
DangerButton.displayName = "DangerButton"

export const GhostButton = React.forwardRef<
  HTMLButtonElement,
  Omit<ButtonProps, "variant">
>((props, ref) => <Button variant="ghost" ref={ref} {...props} />)
GhostButton.displayName = "GhostButton"

export const IconButton = React.forwardRef<
  HTMLButtonElement,
  Omit<ButtonProps, "variant" | "size">
>((props, ref) => <Button variant="ghost" size="icon" ref={ref} {...props} />)
IconButton.displayName = "IconButton"
