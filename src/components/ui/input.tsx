import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Eye, EyeOff, AlertCircle, CheckCircle2, X } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * TRM Referral Input Component
 * 
 * A comprehensive input component with validation states, icons, and accessibility features.
 * Optimized for mobile with proper touch targets and multi-language support.
 * 
 * @example
 * ```tsx
 * <Input label="Email" type="email" placeholder="you@example.com" />
 * <Input label="Password" type="password" showPasswordToggle />
 * <Input error="Invalid email format" helperText="We'll never share your email" />
 * ```
 */

const inputVariants = cva(
  // Base styles
  [
    "flex w-full",
    "rounded-lg border border-neutral-300",
    "bg-white",
    "px-4 py-3",
    "text-base text-neutral-900",
    "placeholder:text-neutral-400",
    "transition-all duration-200",
    // Focus states
    "focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500",
    // Disabled state
    "disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-500",
    // Mobile optimization - prevent zoom on iOS
    "text-base md:text-sm",
  ],
  {
    variants: {
      variant: {
        default: "",
        error: [
          "border-error",
          "focus:border-error focus:ring-error/20",
          "pr-10",
        ],
        success: [
          "border-success",
          "focus:border-success focus:ring-success/20",
          "pr-10",
        ],
        filled: [
          "bg-neutral-50 border-transparent",
          "focus:bg-white focus:border-primary-500",
        ],
      },
      size: {
        default: "h-12 px-4 py-3",
        sm: "h-9 px-3 py-2 text-sm",
        lg: "h-14 px-5 py-4 text-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
    VariantProps<typeof inputVariants> {
  /** Label text */
  label?: string
  /** Helper text displayed below input */
  helperText?: string
  /** Error message - triggers error styling when provided */
  error?: string
  /** Success message - triggers success styling when provided */
  success?: string
  /** Show required indicator */
  required?: boolean
  /** Icon to display on the left */
  leftIcon?: React.ReactNode
  /** Icon to display on the right */
  rightIcon?: React.ReactNode
  /** Show password visibility toggle (for password inputs) */
  showPasswordToggle?: boolean
  /** Clear button functionality */
  clearable?: boolean
  /** Callback when clear button is clicked */
  onClear?: () => void
  /** Character counter max length */
  maxLength?: number
  /** Container className */
  containerClassName?: string
  /** Label className */
  labelClassName?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      variant,
      size,
      label,
      helperText,
      error,
      success,
      required,
      leftIcon,
      rightIcon,
      showPasswordToggle,
      clearable,
      onClear,
      maxLength,
      containerClassName,
      labelClassName,
      type = "text",
      value,
      onChange,
      disabled,
      id,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = React.useState(false)
    const [characterCount, setCharacterCount] = React.useState(0)
    
    const inputId = id || React.useId()
    const errorId = `${inputId}-error`
    const helperId = `${inputId}-helper`
    const successId = `${inputId}-success`
    
    // Determine actual input type (for password toggle)
    const inputType = showPasswordToggle
      ? showPassword
        ? "text"
        : "password"
      : type
    
    // Determine variant based on error/success state
    const inputVariant = error ? "error" : success ? "success" : variant
    
    // Handle character count
    React.useEffect(() => {
      if (maxLength && typeof value === "string") {
        setCharacterCount(value.length)
      }
    }, [value, maxLength])
    
    // Handle clear
    const handleClear = () => {
      onClear?.()
      // Trigger onChange with empty value
      const event = {
        target: { value: "" },
      } as React.ChangeEvent<HTMLInputElement>
      onChange?.(event)
    }
    
    return (
      <div className={cn("w-full space-y-1.5", containerClassName)}>
        {/* Label */}
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              "block text-sm font-medium text-neutral-700 dark:text-neutral-300",
              labelClassName
            )}
          >
            {label}
            {required && (
              <span className="ml-1 text-error" aria-hidden="true">
                *
              </span>
            )}
          </label>
        )}
        
        {/* Input wrapper */}
        <div className="relative">
          {/* Left icon */}
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
              {leftIcon}
            </div>
          )}
          
          {/* Input element */}
          <input
            id={inputId}
            type={inputType}
            className={cn(
              inputVariants({ variant: inputVariant, size }),
              leftIcon && "pl-10",
              (rightIcon || showPasswordToggle || clearable || error || success) && "pr-10",
              className
            )}
            ref={ref}
            value={value}
            onChange={onChange}
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={
              error
                ? errorId
                : success
                ? successId
                : helperText
                ? helperId
                : undefined
            }
            aria-required={required}
            maxLength={maxLength}
            {...props}
          />
          
          {/* Right side icons */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            {/* Clear button */}
            {clearable && value && !disabled && (
              <button
                type="button"
                onClick={handleClear}
                className="p-0.5 rounded-full text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
                aria-label="Clear input"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            
            {/* Password toggle */}
            {showPasswordToggle && (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="p-1 rounded text-neutral-400 hover:text-neutral-600 transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            )}
            
            {/* Status icons */}
            {error && !showPasswordToggle && (
              <AlertCircle className="h-5 w-5 text-error" aria-hidden="true" />
            )}
            {success && !error && !showPasswordToggle && (
              <CheckCircle2 className="h-5 w-5 text-success" aria-hidden="true" />
            )}
            
            {/* Custom right icon */}
            {rightIcon && !error && !success && !showPasswordToggle && (
              <span className="text-neutral-400">{rightIcon}</span>
            )}
          </div>
        </div>
        
        {/* Helper text / Error / Success messages */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            {error && (
              <p
                id={errorId}
                className="text-sm text-error flex items-center gap-1"
                role="alert"
              >
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                {error}
              </p>
            )}
            {success && !error && (
              <p
                id={successId}
                className="text-sm text-success flex items-center gap-1"
              >
                <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
                {success}
              </p>
            )}
            {helperText && !error && !success && (
              <p id={helperId} className="text-sm text-neutral-500">
                {helperText}
              </p>
            )}
          </div>
          
          {/* Character counter */}
          {maxLength && (
            <span
              className={cn(
                "text-xs text-neutral-400 flex-shrink-0",
                characterCount > maxLength * 0.9 && "text-warning",
                characterCount >= maxLength && "text-error"
              )}
              aria-live="polite"
            >
              {characterCount}/{maxLength}
            </span>
          )}
        </div>
      </div>
    )
  }
)

Input.displayName = "Input"

export { Input, inputVariants }

// Textarea component with similar styling
export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  helperText?: string
  error?: string
  required?: boolean
  maxLength?: number
  containerClassName?: string
  labelClassName?: string
  rows?: number
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      label,
      helperText,
      error,
      required,
      maxLength,
      containerClassName,
      labelClassName,
      rows = 4,
      value,
      onChange,
      id,
      ...props
    },
    ref
  ) => {
    const [characterCount, setCharacterCount] = React.useState(0)
    const textareaId = id || React.useId()
    const errorId = `${textareaId}-error`
    const helperId = `${textareaId}-helper`
    
    React.useEffect(() => {
      if (maxLength && typeof value === "string") {
        setCharacterCount(value.length)
      }
    }, [value, maxLength])
    
    return (
      <div className={cn("w-full space-y-1.5", containerClassName)}>
        {label && (
          <label
            htmlFor={textareaId}
            className={cn(
              "block text-sm font-medium text-neutral-700 dark:text-neutral-300",
              labelClassName
            )}
          >
            {label}
            {required && (
              <span className="ml-1 text-error" aria-hidden="true">
                *
              </span>
            )}
          </label>
        )}
        
        <textarea
          id={textareaId}
          rows={rows}
          className={cn(
            "flex w-full rounded-lg border bg-white px-4 py-3",
            "text-base text-neutral-900 placeholder:text-neutral-400",
            "transition-all duration-200",
            "focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500",
            "disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-500",
            "resize-y min-h-[100px]",
            error
              ? "border-error focus:border-error focus:ring-error/20"
              : "border-neutral-300",
            className
          )}
          ref={ref}
          value={value}
          onChange={onChange}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          maxLength={maxLength}
          {...props}
        />
        
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            {error && (
              <p id={errorId} className="text-sm text-error" role="alert">
                {error}
              </p>
            )}
            {helperText && !error && (
              <p id={helperId} className="text-sm text-neutral-500">
                {helperText}
              </p>
            )}
          </div>
          {maxLength && (
            <span
              className={cn(
                "text-xs text-neutral-400 flex-shrink-0",
                characterCount > maxLength * 0.9 && "text-warning",
                characterCount >= maxLength && "text-error"
              )}
            >
              {characterCount}/{maxLength}
            </span>
          )}
        </div>
      </div>
    )
  }
)

Textarea.displayName = "Textarea"

export { Textarea }
