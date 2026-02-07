import * as React from "react"

interface DialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

function Dialog({ open = false, onOpenChange, children }: DialogProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/50"
        onClick={() => onOpenChange?.(false)}
      />
      <div className="relative z-50 bg-white rounded-lg shadow-lg max-w-lg w-full mx-4 max-h-[85vh] overflow-y-auto">
        {children}
      </div>
    </div>
  )
}

function DialogContent({
  children,
  className = "",
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={`p-6 ${className}`}>{children}</div>
}

function DialogHeader({
  children,
  className = "",
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`flex flex-col space-y-1.5 text-center sm:text-left ${className}`}>
      {children}
    </div>
  )
}

function DialogTitle({
  children,
  className = "",
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <h2 className={`text-lg font-semibold leading-none tracking-tight ${className}`}>
      {children}
    </h2>
  )
}

function DialogDescription({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <p className={`text-sm text-gray-500 ${className}`}>{children}</p>
}

function DialogFooter({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-6 ${className}`}>
      {children}
    </div>
  )
}

export { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter }
