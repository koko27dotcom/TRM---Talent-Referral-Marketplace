import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "./button"
import { Avatar, AvatarFallback, AvatarImage } from "./avatar"
import { Badge } from "./badge"

/**
 * TRM Referral AppShell Component
 * 
 * Main application layout wrapper with sidebar navigation and header.
 * Provides responsive design with mobile drawer support.
 * 
 * @example
 * ```tsx
 * <AppShell
 *   sidebar={<SidebarNavigation />}
 *   header={<Header user={user} />}
 * >
 *   <main>Page content</main>
 * </AppShell>
 * ```
 */

// AppShell Container
interface AppShellProps {
  children: React.ReactNode
  sidebar?: React.ReactNode
  header?: React.ReactNode
  footer?: React.ReactNode
  /** Fixed sidebar on desktop */
  fixedSidebar?: boolean
  /** Hide sidebar on mobile */
  hideSidebarOnMobile?: boolean
  className?: string
}

function AppShell({
  children,
  sidebar,
  header,
  footer,
  fixedSidebar = true,
  hideSidebarOnMobile = true,
  className,
}: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false)

  return (
    <div className={cn("min-h-screen bg-neutral-50 dark:bg-slate-900", className)}>
      {/* Header */}
      {header && (
        <header className="sticky top-0 z-sticky bg-white dark:bg-slate-800 border-b border-neutral-200 dark:border-slate-700">
          {header}
        </header>
      )}

      <div className="flex">
        {/* Sidebar - Desktop */}
        {sidebar && (
          <aside
            className={cn(
              "hidden lg:block",
              fixedSidebar && "fixed left-0 top-16 bottom-0 w-64",
              !fixedSidebar && "w-64 flex-shrink-0"
            )}
          >
            <div className="h-full overflow-y-auto py-4 px-3">
              {sidebar}
            </div>
          </aside>
        )}

        {/* Sidebar - Mobile Drawer */}
        {sidebar && (
          <>
            {/* Overlay */}
            {sidebarOpen && (
              <div
                className="fixed inset-0 z-modal-backdrop bg-black/50 lg:hidden"
                onClick={() => setSidebarOpen(false)}
              />
            )}
            {/* Drawer */}
            <aside
              className={cn(
                "fixed inset-y-0 left-0 z-modal w-64 bg-white dark:bg-slate-800 shadow-xl transform transition-transform duration-300 lg:hidden",
                sidebarOpen ? "translate-x-0" : "-translate-x-full"
              )}
            >
              <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-slate-700">
                <span className="text-lg font-semibold">TRM Referral</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSidebarOpen(false)}
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </Button>
              </div>
              <div className="p-4 overflow-y-auto">
                {sidebar}
              </div>
            </aside>
          </>
        )}

        {/* Main Content */}
        <main
          className={cn(
            "flex-1 min-w-0",
            fixedSidebar && sidebar && "lg:ml-64",
            "p-4 sm:p-6 lg:p-8"
          )}
        >
          {children}
        </main>
      </div>

      {/* Footer */}
      {footer && (
        <footer className="bg-white dark:bg-slate-800 border-t border-neutral-200 dark:border-slate-700">
          {footer}
        </footer>
      )}
    </div>
  )
}

// Header Component
interface HeaderProps {
  /** Logo or brand element */
  logo?: React.ReactNode
  /** Navigation items */
  navigation?: React.ReactNode
  /** User menu component */
  userMenu?: React.ReactNode
  /** Search component */
  search?: React.ReactNode
  /** Mobile menu toggle handler */
  onMenuToggle?: () => void
  /** Show mobile menu button */
  showMenuButton?: boolean
  className?: string
}

function Header({
  logo,
  navigation,
  userMenu,
  search,
  onMenuToggle,
  showMenuButton = true,
  className,
}: HeaderProps) {
  return (
    <div className={cn("flex items-center justify-between h-16 px-4 sm:px-6", className)}>
      <div className="flex items-center gap-4">
        {showMenuButton && (
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onMenuToggle}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </Button>
        )}
        {logo && <div className="flex-shrink-0">{logo}</div>}
      </div>

      {search && (
        <div className="hidden md:flex flex-1 max-w-lg mx-8">
          {search}
        </div>
      )}

      <div className="flex items-center gap-2 sm:gap-4">
        {navigation && (
          <nav className="hidden lg:flex items-center gap-1">
            {navigation}
          </nav>
        )}
        {userMenu && <div className="flex-shrink-0">{userMenu}</div>}
      </div>
    </div>
  )
}

// Sidebar Navigation Component
interface SidebarProps {
  items: SidebarItem[]
  activeItem?: string
  onItemClick?: (item: SidebarItem) => void
  className?: string
}

interface SidebarItem {
  id: string
  label: string
  icon?: React.ReactNode
  href?: string
  badge?: string | number
  children?: SidebarItem[]
  disabled?: boolean
}

function Sidebar({ items, activeItem, onItemClick, className }: SidebarProps) {
  const [expandedItems, setExpandedItems] = React.useState<string[]>([])

  const toggleExpand = (id: string) => {
    setExpandedItems((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  const renderItem = (item: SidebarItem, depth = 0) => {
    const isActive = activeItem === item.id
    const isExpanded = expandedItems.includes(item.id)
    const hasChildren = item.children && item.children.length > 0

    return (
      <li key={item.id}>
        <button
          onClick={() => {
            if (hasChildren) {
              toggleExpand(item.id)
            } else {
              onItemClick?.(item)
            }
          }}
          disabled={item.disabled}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
            "hover:bg-neutral-100 dark:hover:bg-slate-700",
            isActive && "bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300",
            !isActive && "text-neutral-700 dark:text-slate-300",
            item.disabled && "opacity-50 cursor-not-allowed",
            depth > 0 && "ml-4"
          )}
        >
          {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
          <span className="flex-1 text-left">{item.label}</span>
          {item.badge && (
            <Badge variant="primary" size="xs">
              {item.badge}
            </Badge>
          )}
          {hasChildren && (
            <svg
              className={cn(
                "h-4 w-4 transition-transform",
                isExpanded && "rotate-180"
              )}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </button>
        {hasChildren && isExpanded && (
          <ul className="mt-1 space-y-0.5">
            {item.children!.map((child) => renderItem(child, depth + 1))}
          </ul>
        )}
      </li>
    )
  }

  return (
    <nav className={cn("space-y-1", className)}>
      <ul className="space-y-1">
        {items.map((item) => renderItem(item))}
      </ul>
    </nav>
  )
}

// User Menu Component
interface UserMenuProps {
  user: {
    name: string
    email?: string
    avatar?: string
    role?: string
  }
  onProfile?: () => void
  onSettings?: () => void
  onLogout?: () => void
  className?: string
}

function UserMenu({ user, onProfile, onSettings, onLogout, className }: UserMenuProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const menuRef = React.useRef<HTMLDivElement>(null)

  // Close on click outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div ref={menuRef} className={cn("relative", className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-slate-700 transition-colors"
      >
        <Avatar size="sm">
          {user.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
          <AvatarFallback name={user.name} />
        </Avatar>
        <div className="hidden sm:block text-left">
          <p className="text-sm font-medium text-neutral-900 dark:text-white">
            {user.name}
          </p>
          {user.role && (
            <p className="text-xs text-neutral-500 dark:text-slate-400">
              {user.role}
            </p>
          )}
        </div>
        <svg
          className={cn(
            "hidden sm:block h-4 w-4 text-neutral-400 transition-transform",
            isOpen && "rotate-180"
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white dark:bg-slate-800 shadow-lg border border-neutral-200 dark:border-slate-700 py-1 z-dropdown">
          <div className="px-4 py-3 border-b border-neutral-100 dark:border-slate-700">
            <p className="text-sm font-medium text-neutral-900 dark:text-white">
              {user.name}
            </p>
            {user.email && (
              <p className="text-xs text-neutral-500 dark:text-slate-400 truncate">
                {user.email}
              </p>
            )}
          </div>
          <div className="py-1">
            {onProfile && (
              <button
                onClick={() => {
                  onProfile()
                  setIsOpen(false)
                }}
                className="w-full px-4 py-2 text-sm text-neutral-700 dark:text-slate-300 hover:bg-neutral-100 dark:hover:bg-slate-700 text-left flex items-center gap-2"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Profile
              </button>
            )}
            {onSettings && (
              <button
                onClick={() => {
                  onSettings()
                  setIsOpen(false)
                }}
                className="w-full px-4 py-2 text-sm text-neutral-700 dark:text-slate-300 hover:bg-neutral-100 dark:hover:bg-slate-700 text-left flex items-center gap-2"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Settings
              </button>
            )}
          </div>
          {onLogout && (
            <div className="py-1 border-t border-neutral-100 dark:border-slate-700">
              <button
                onClick={() => {
                  onLogout()
                  setIsOpen(false)
                }}
                className="w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-left flex items-center gap-2"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Page Header Component
interface PageHeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
  breadcrumbs?: { label: string; href?: string }[]
  className?: string
}

function PageHeader({ title, description, actions, breadcrumbs, className }: PageHeaderProps) {
  return (
    <div className={cn("mb-6", className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-2 text-sm text-neutral-500 dark:text-slate-400 mb-3">
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={index}>
              {index > 0 && <span>/</span>}
              {crumb.href ? (
                <a href={crumb.href} className="hover:text-neutral-700 dark:hover:text-slate-300">
                  {crumb.label}
                </a>
              ) : (
                <span className="text-neutral-900 dark:text-white">{crumb.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-sm text-neutral-500 dark:text-slate-400">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  )
}

export {
  AppShell,
  Header,
  Sidebar,
  UserMenu,
  PageHeader,
}

export type { SidebarItem, SidebarProps, UserMenuProps, PageHeaderProps }
