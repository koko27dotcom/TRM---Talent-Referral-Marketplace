"use client"

import * as React from "react"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { cva, type VariantProps } from "class-variance-authority"
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

import { cn } from "@/lib/utils"

/**
 * TRM Referral Toast Notification System
 * 
 * A comprehensive toast notification system with multiple variants,
 * positions, and animations. Built on Radix UI Toast primitives.
 * 
 * @example
 * ```tsx
 * // Using the hook
 * const { toast } = useToast()
 * toast({
 *   title: "Success!",
 *   description: "Your profile has been updated.",
 *   variant: "success",
 * })
 * ```
 */

const ToastProvider = ToastPrimitives.Provider

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      "fixed z-toast flex flex-col gap-2",
      "p-4",
      "max-w-[420px] w-full",
      "sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]",
      "data-[state=open]:animate-in data-[state=closed]:animate-out",
      "data-[swipe=end]:animate-out",
      className
    )}
    {...props}
  />
))
ToastViewport.displayName = ToastPrimitives.Viewport.displayName

const toastVariants = cva(
  [
    "group relative flex w-full items-center justify-between",
    "gap-4 overflow-hidden rounded-xl border p-4 pr-8",
    "shadow-lg transition-all",
    "data-[swipe=cancel]:translate-x-0",
    "data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)]",
    "data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)]",
    "data-[swipe=move]:transition-none",
    "data-[state=open]:animate-in data-[state=closed]:animate-out",
    "data-[swipe=end]:animate-out",
    "data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full",
    "data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full",
  ],
  {
    variants: {
      variant: {
        default: [
          "border-neutral-200 bg-white text-neutral-900",
          "dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100",
        ],
        success: [
          "border-green-200 bg-green-50 text-green-900",
          "dark:border-green-800 dark:bg-green-900/20 dark:text-green-100",
        ],
        error: [
          "border-red-200 bg-red-50 text-red-900",
          "dark:border-red-800 dark:bg-red-900/20 dark:text-red-100",
        ],
        warning: [
          "border-amber-200 bg-amber-50 text-amber-900",
          "dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-100",
        ],
        info: [
          "border-blue-200 bg-blue-50 text-blue-900",
          "dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-100",
        ],
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> &
    VariantProps<typeof toastVariants>
>(({ className, variant, ...props }, ref) => {
  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    />
  )
})
Toast.displayName = ToastPrimitives.Root.displayName

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-md",
      "border bg-transparent px-3 text-sm font-medium",
      "ring-offset-white transition-colors",
      "hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-400",
      "focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
      "group-[.destructive]:border-red-100 group-[.destructive]:hover:border-red-200",
      "group-[.destructive]:hover:bg-red-100 group-[.destructive]:hover:text-red-900",
      "group-[.destructive]:focus:ring-red-400 group-[.destructive]:focus:ring-offset-red-600",
      "dark:ring-offset-slate-800 dark:focus:ring-slate-800",
      "dark:group-[.destructive]:border-slate-800",
      "dark:group-[.destructive]:hover:border-slate-800",
      "dark:group-[.destructive]:hover:bg-slate-800",
      "dark:group-[.destructive]:hover:text-slate-50",
      "dark:group-[.destructive]:focus:ring-red-900",
      "dark:group-[.destructive]:focus:ring-offset-red-900",
      className
    )}
    {...props}
  />
))
ToastAction.displayName = ToastPrimitives.Action.displayName

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      "absolute right-2 top-2 rounded-md p-1",
      "text-neutral-500/50 opacity-0 transition-opacity",
      "hover:text-neutral-500 focus:opacity-100 focus:outline-none",
      "focus:ring-2 group-hover:opacity-100",
      "group-[.destructive]:text-red-300 group-[.destructive]:hover:text-red-50",
      "group-[.destructive]:focus:ring-red-400 group-[.destructive]:focus:ring-offset-red-600",
      "dark:text-slate-400/50 dark:hover:text-slate-400",
      className
    )}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitives.Close>
))
ToastClose.displayName = ToastPrimitives.Close.displayName

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn("text-sm font-semibold", className)}
    {...props}
  />
))
ToastTitle.displayName = ToastPrimitives.Title.displayName

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn("text-sm opacity-90", className)}
    {...props}
  />
))
ToastDescription.displayName = ToastPrimitives.Description.displayName

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>

type ToastActionElement = React.ReactElement<typeof ToastAction>

// Toast Icon component
function ToastIcon({ variant }: { variant: ToastProps["variant"] }) {
  const icons = {
    default: Info,
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
  }

  const Icon = icons[variant || "default"]
  
  const iconColors = {
    default: "text-neutral-500",
    success: "text-green-500",
    error: "text-red-500",
    warning: "text-amber-500",
    info: "text-blue-500",
  }

  return <Icon className={cn("h-5 w-5 flex-shrink-0", iconColors[variant || "default"])} />
}

// Toast Context
interface ToastContextType {
  toast: (props: ToastType) => void
  dismiss: (id: string) => void
  toasts: ToastType[]
}

interface ToastType {
  id?: string
  title?: string
  description?: string
  variant?: "default" | "success" | "error" | "warning" | "info"
  duration?: number
  action?: ToastActionElement
  onDismiss?: () => void
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined)

// Toast Provider Component
function ToastProviderComponent({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastType[]>([])

  const toast = React.useCallback((props: ToastType) => {
    const id = props.id || Math.random().toString(36).substring(2, 9)
    const newToast = { ...props, id }
    
    setToasts((prev) => [...prev, newToast])

    // Auto dismiss
    if (props.duration !== Infinity) {
      setTimeout(() => {
        dismiss(id)
        props.onDismiss?.()
      }, props.duration || 5000)
    }

    return id
  }, [])

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toast, dismiss, toasts }}>
      <ToastProvider>
        {children}
        <ToastViewport className="fixed bottom-0 right-0 flex flex-col gap-2 p-4 w-full max-w-sm z-toast" />
        {toasts.map((t) => (
          <Toast
            key={t.id}
            variant={t.variant}
            onOpenChange={(open) => {
              if (!open) dismiss(t.id!)
            }}
          >
            <div className="flex items-start gap-3">
              <ToastIcon variant={t.variant} />
              <div className="flex-1 grid gap-1">
                {t.title && <ToastTitle>{t.title}</ToastTitle>}
                {t.description && (
                  <ToastDescription>{t.description}</ToastDescription>
                )}
              </div>
            </div>
            {t.action}
            <ToastClose />
          </Toast>
        ))}
      </ToastProvider>
    </ToastContext.Provider>
  )
}

// useToast hook
function useToast() {
  const context = React.useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  return context
}

// Simplified toast hook for standalone usage
function useSimpleToast() {
  const [toasts, setToasts] = React.useState<ToastType[]>([])

  const toast = React.useCallback((props: ToastType) => {
    const id = props.id || Math.random().toString(36).substring(2, 9)
    const newToast = { ...props, id }
    
    setToasts((prev) => [...prev, newToast])

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
      props.onDismiss?.()
    }, props.duration || 5000)

    return id
  }, [])

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return { toast, toasts, dismiss }
}

// Toast Container for standalone usage
function ToastContainer({ toasts, dismiss }: { toasts: ToastType[]; dismiss: (id: string) => void }) {
  return (
    <div className="fixed bottom-0 right-0 flex flex-col gap-2 p-4 w-full max-w-sm z-toast">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={cn(
              "relative flex items-start gap-3 p-4 pr-8 rounded-xl shadow-lg border",
              toast.variant === "success" && "bg-green-50 border-green-200 text-green-900",
              toast.variant === "error" && "bg-red-50 border-red-200 text-red-900",
              toast.variant === "warning" && "bg-amber-50 border-amber-200 text-amber-900",
              toast.variant === "info" && "bg-blue-50 border-blue-200 text-blue-900",
              !toast.variant && "bg-white border-neutral-200 text-neutral-900"
            )}
          >
            <ToastIcon variant={toast.variant} />
            <div className="flex-1">
              {toast.title && (
                <h4 className="text-sm font-semibold">{toast.title}</h4>
              )}
              {toast.description && (
                <p className="text-sm opacity-90 mt-0.5">{toast.description}</p>
              )}
            </div>
            <button
              onClick={() => dismiss(toast.id!)}
              className="absolute right-2 top-2 p-1 rounded hover:bg-black/5 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

export {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
  ToastProviderComponent,
  ToastContainer,
  ToastIcon,
  useToast,
  useSimpleToast,
}

export type { ToastProps, ToastActionElement, ToastType }
