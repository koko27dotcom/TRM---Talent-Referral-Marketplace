import * as React from "react"

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "destructive"
}

function Alert({ className = "", variant = "default", ...props }: AlertProps) {
  const variants: Record<string, string> = {
    default: "bg-gray-50 text-gray-900 border-gray-200",
    destructive: "bg-red-50 text-red-900 border-red-200",
  }

  return (
    <div
      role="alert"
      className={`relative w-full rounded-lg border p-4 ${variants[variant]} ${className}`}
      {...props}
    />
  )
}

function AlertDescription({ className = "", ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={`text-sm [&_p]:leading-relaxed ${className}`} {...props} />
}

export { Alert, AlertDescription }
