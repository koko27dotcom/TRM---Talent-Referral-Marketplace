import * as React from "react"

interface SwitchProps extends React.InputHTMLAttributes<HTMLInputElement> {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className = "", checked, onCheckedChange, ...props }, ref) => {
    return (
      <label
        className={`relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full transition-colors ${
          checked ? "bg-blue-600" : "bg-gray-200"
        } ${className}`}
      >
        <input
          type="checkbox"
          className="sr-only"
          ref={ref}
          checked={checked}
          onChange={(e) => onCheckedChange?.(e.target.checked)}
          {...props}
        />
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </label>
    )
  }
)
Switch.displayName = "Switch"

export { Switch }
