import * as React from "react"
import { 
  Button, 
  PrimaryButton, 
  SecondaryButton, 
  DangerButton,
  GhostButton 
} from "@/components/ui/button"
import { Input, Textarea } from "@/components/ui/input"
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter,
  CardBadge,
  StatsCard 
} from "@/components/ui/card"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter,
  ConfirmDialog 
} from "@/components/ui/dialog"
import { 
  Badge, 
  StatusBadge, 
  CountBadge, 
  JobTypeBadge,
  SkillBadge 
} from "@/components/ui/badge"
import { 
  Avatar, 
  AvatarImage, 
  AvatarFallback, 
  AvatarGroup,
  CompanyAvatar 
} from "@/components/ui/avatar"
import { 
  Skeleton, 
  SkeletonText, 
  SkeletonCard, 
  SkeletonJobCard,
  SkeletonAvatar,
  SkeletonStatsCard 
} from "@/components/ui/skeleton"
import { 
  ToastContainer, 
  useSimpleToast 
} from "@/components/ui/toast"
import { 
  AppShell, 
  Header, 
  Sidebar, 
  UserMenu,
  PageHeader,
  type SidebarItem 
} from "@/components/ui/appshell"
import { 
  Bell, 
  Search, 
  Home, 
  Briefcase, 
  Users, 
  Settings,
  FileText,
  MessageSquare,
  Plus,
  Loader2,
  CheckCircle,
  AlertCircle,
  Info,
  Mail,
  Lock,
  User
} from "lucide-react"

/**
 * TRM Referral Design System Showcase Page
 * 
 * A comprehensive demonstration of all UI components in the design system.
 * This page serves as both documentation and a testing ground for components.
 */

const sidebarItems: SidebarItem[] = [
  { id: "overview", label: "Overview", icon: <Home className="h-5 w-5" />, href: "#overview" },
  { id: "buttons", label: "Buttons", icon: <Plus className="h-5 w-5" />, href: "#buttons" },
  { id: "inputs", label: "Inputs", icon: <FileText className="h-5 w-5" />, href: "#inputs" },
  { id: "cards", label: "Cards", icon: <Briefcase className="h-5 w-5" />, href: "#cards" },
  { id: "dialogs", label: "Dialogs", icon: <MessageSquare className="h-5 w-5" />, href: "#dialogs" },
  { id: "badges", label: "Badges", icon: <Bell className="h-5 w-5" />, href: "#badges" },
  { id: "avatars", label: "Avatars", icon: <Users className="h-5 w-5" />, href: "#avatars" },
  { id: "skeletons", label: "Skeletons", icon: <Loader2 className="h-5 w-5" />, href: "#skeletons" },
  { id: "toasts", label: "Toasts", icon: <Info className="h-5 w-5" />, href: "#toasts" },
]

function DesignSystemContent() {
  const { toast, toasts, dismiss } = useSimpleToast()
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [activeSection, setActiveSection] = React.useState("overview")
  const [loading, setLoading] = React.useState(false)

  const showToast = (variant: "success" | "error" | "warning" | "info") => {
    const messages = {
      success: { title: "Success!", description: "Your changes have been saved." },
      error: { title: "Error!", description: "Something went wrong. Please try again." },
      warning: { title: "Warning!", description: "Please review your information." },
      info: { title: "Info", description: "New updates are available." },
    }
    toast({
      ...messages[variant],
      variant,
    })
  }

  const handleLoadingClick = () => {
    setLoading(true)
    setTimeout(() => setLoading(false), 2000)
  }

  return (
    <div className="space-y-12 pb-20">
      <ToastContainer toasts={toasts} dismiss={dismiss} />

      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-neutral-900 dark:text-white">
          TRM Referral Design System
        </h1>
        <p className="text-lg text-neutral-600 dark:text-slate-400 max-w-2xl mx-auto">
          A comprehensive, professional UI/UX design system optimized for the referral market.
          Built with accessibility, mobile-first responsiveness, and modern design principles in mind.
        </p>
        <div className="flex items-center justify-center gap-2 text-sm text-neutral-500">
          <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full">v1.0.0</span>
          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full">WCAG 2.1 AA</span>
          <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full">Mobile First</span>
        </div>
      </div>

      {/* Overview Section */}
      <section id="overview" className="space-y-6">
        <PageHeader 
          title="Overview" 
          description="Key design principles and color palette"
        />
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <div className="h-20 bg-primary-500 rounded-lg" />
            <p className="text-sm font-medium">Primary</p>
            <p className="text-xs text-neutral-500">#0ea5e9</p>
          </div>
          <div className="space-y-2">
            <div className="h-20 bg-secondary-500 rounded-lg" />
            <p className="text-sm font-medium">Secondary</p>
            <p className="text-xs text-neutral-500">#22c55e</p>
          </div>
          <div className="space-y-2">
            <div className="h-20 bg-accent-500 rounded-lg" />
            <p className="text-sm font-medium">Accent</p>
            <p className="text-xs text-neutral-500">#f59e0b</p>
          </div>
          <div className="space-y-2">
            <div className="h-20 bg-neutral-800 rounded-lg" />
            <p className="text-sm font-medium">Neutral</p>
            <p className="text-xs text-neutral-500">#262626</p>
          </div>
        </div>

        {/* Typography */}
        <Card>
          <CardHeader>
            <CardTitle>Typography</CardTitle>
            <CardDescription>Font stack with multi-language support</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-xs text-neutral-500">Heading 1</p>
              <h1 className="text-4xl font-bold">The quick brown fox jumps</h1>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-neutral-500">Heading 2</p>
              <h2 className="text-3xl font-semibold">The quick brown fox jumps</h2>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-neutral-500">Body Text</p>
              <p className="text-base">The quick brown fox jumps over the lazy dog. This is sample body text.</p>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-neutral-500">Multi-language Support</p>
              <p className="text-base font-myanmar">Welcome to TRM Referral Platform</p>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Buttons Section */}
      <section id="buttons" className="space-y-6">
        <PageHeader 
          title="Buttons" 
          description="Various button styles and states"
        />
        
        <Card>
          <CardHeader>
            <CardTitle>Button Variants</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-wrap gap-3">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Danger</Button>
              <Button variant="success">Success</Button>
              <Button variant="warning">Warning</Button>
              <Button variant="link">Link</Button>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button size="xs">Extra Small</Button>
              <Button size="sm">Small</Button>
              <Button size="default">Default</Button>
              <Button size="lg">Large</Button>
              <Button size="xl">Extra Large</Button>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button loading>Loading</Button>
              <Button disabled>Disabled</Button>
              <Button leftIcon={<Plus className="h-4 w-4" />}>With Icon</Button>
              <Button rightIcon={<CheckCircle className="h-4 w-4" />}>Success</Button>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button size="icon" variant="outline">
                <Plus className="h-4 w-4" />
              </Button>
              <Button size="icon-sm" variant="ghost">
                <Settings className="h-4 w-4" />
              </Button>
              <Button size="icon-lg" variant="primary">
                <Search className="h-5 w-5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Inputs Section */}
      <section id="inputs" className="space-y-6">
        <PageHeader 
          title="Inputs" 
          description="Form inputs with validation states"
        />
        
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Inputs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input 
                label="Email Address" 
                type="email" 
                placeholder="you@example.com"
                helperText="We'll never share your email"
                leftIcon={<Mail className="h-4 w-4" />}
              />
              <Input 
                label="Password" 
                type="password" 
                placeholder="Enter password"
                showPasswordToggle
                leftIcon={<Lock className="h-4 w-4" />}
              />
              <Input 
                label="Username" 
                placeholder="johndoe"
                leftIcon={<User className="h-4 w-4" />}
                clearable
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Validation States</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input 
                label="Success State" 
                value="valid@email.com"
                success="Email is available"
              />
              <Input 
                label="Error State" 
                value="invalid-email"
                error="Please enter a valid email address"
              />
              <Input 
                label="With Character Count" 
                placeholder="Enter description"
                maxLength={100}
              />
              <Textarea 
                label="Textarea" 
                placeholder="Enter longer text here..."
                helperText="Supports multi-line input"
              />
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Cards Section */}
      <section id="cards" className="space-y-6">
        <PageHeader 
          title="Cards" 
          description="Various card layouts and styles"
        />
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Default Card</CardTitle>
              <CardDescription>Standard card with shadow</CardDescription>
            </CardHeader>
            <CardContent>
              <p>This is a basic card component with header, content, and optional footer.</p>
            </CardContent>
            <CardFooter>
              <Button variant="outline" size="sm">Cancel</Button>
              <Button size="sm">Save</Button>
            </CardFooter>
          </Card>

          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Elevated Card</CardTitle>
              <CardDescription>With increased shadow</CardDescription>
            </CardHeader>
            <CardContent>
              <p>This card has more elevation and a stronger shadow effect.</p>
            </CardContent>
          </Card>

          <Card variant="interactive" className="cursor-pointer">
            <CardHeader>
              <CardTitle>Interactive Card</CardTitle>
              <CardDescription>Hover to see effect</CardDescription>
            </CardHeader>
            <CardContent>
              <p>This card lifts up on hover, indicating it's clickable.</p>
            </CardContent>
          </Card>

          <StatsCard
            title="Total Jobs"
            value="1,234"
            description="Active job postings"
            trend={{ value: 12.5, isPositive: true }}
            icon={<Briefcase className="h-6 w-6 text-primary-600" />}
          />

          <StatsCard
            title="Applications"
            value="5,678"
            description="Total applications received"
            trend={{ value: 8.2, isPositive: true }}
            variant="success"
            icon={<Users className="h-6 w-6 text-green-600" />}
          />

          <StatsCard
            title="Pending Review"
            value="42"
            description="Applications awaiting review"
            trend={{ value: 3.1, isPositive: false }}
            variant="warning"
            icon={<AlertCircle className="h-6 w-6 text-amber-600" />}
          />
        </div>
      </section>

      {/* Dialogs Section */}
      <section id="dialogs" className="space-y-6">
        <PageHeader 
          title="Dialogs" 
          description="Modal dialogs and confirmations"
        />
        
        <Card>
          <CardHeader>
            <CardTitle>Dialog Examples</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button onClick={() => setDialogOpen(true)}>Open Dialog</Button>
            <Button variant="outline" onClick={() => setConfirmOpen(true)}>
              Open Confirm Dialog
            </Button>
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Dialog Title</DialogTitle>
              <DialogDescription>
                This is a standard dialog with a title, description, and action buttons.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-neutral-600">
                Dialog content goes here. You can include any components or content within the dialog.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setDialogOpen(false)}>Confirm</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          onConfirm={() => {
            setConfirmOpen(false)
            showToast("success")
          }}
          title="Are you sure?"
          description="This action cannot be undone. This will permanently delete the item."
          confirmText="Delete"
          confirmVariant="danger"
        />
      </section>

      {/* Badges Section */}
      <section id="badges" className="space-y-6">
        <PageHeader 
          title="Badges" 
          description="Status indicators and labels"
        />
        
        <Card>
          <CardHeader>
            <CardTitle>Badge Variants</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-wrap gap-3">
              <Badge>Default</Badge>
              <Badge variant="primary">Primary</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="success">Success</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="error">Error</Badge>
              <Badge variant="info">Info</Badge>
            </div>

            <div className="flex flex-wrap gap-3">
              <Badge variant="outline">Outline</Badge>
              <Badge variant="outline-primary">Outline Primary</Badge>
              <Badge variant="outline-success">Outline Success</Badge>
              <Badge variant="soft">Soft</Badge>
            </div>

            <div className="flex flex-wrap gap-3">
              <StatusBadge status="active" />
              <StatusBadge status="inactive" />
              <StatusBadge status="pending" />
              <StatusBadge status="error" />
            </div>

            <div className="flex flex-wrap gap-3 items-center">
              <JobTypeBadge type="full-time" />
              <JobTypeBadge type="part-time" />
              <JobTypeBadge type="remote" />
              <JobTypeBadge type="contract" />
              <JobTypeBadge type="internship" />
            </div>

            <div className="flex flex-wrap gap-3 items-center">
              <Badge dot dotColor="green">Online</Badge>
              <Badge dot dotColor="red" pulse>Recording</Badge>
              <CountBadge count={5} />
              <CountBadge count={100} max={99} />
              <SkillBadge skill="React" onRemove={() => {}} />
              <SkillBadge skill="TypeScript" />
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Avatars Section */}
      <section id="avatars" className="space-y-6">
        <PageHeader 
          title="Avatars" 
          description="User and company avatars"
        />
        
        <Card>
          <CardHeader>
            <CardTitle>Avatar Sizes</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-4">
            <Avatar size="xs">
              <AvatarFallback name="John Doe" />
            </Avatar>
            <Avatar size="sm">
              <AvatarFallback name="John Doe" />
            </Avatar>
            <Avatar size="md">
              <AvatarFallback name="John Doe" />
            </Avatar>
            <Avatar size="lg">
              <AvatarFallback name="John Doe" />
            </Avatar>
            <Avatar size="xl">
              <AvatarFallback name="John Doe" />
            </Avatar>
            <Avatar size="2xl">
              <AvatarFallback name="John Doe" />
            </Avatar>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status Indicators</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-4">
            <Avatar size="md" status="online">
              <AvatarFallback name="User 1" />
            </Avatar>
            <Avatar size="md" status="away">
              <AvatarFallback name="User 2" />
            </Avatar>
            <Avatar size="md" status="busy">
              <AvatarFallback name="User 3" />
            </Avatar>
            <Avatar size="md" status="offline">
              <AvatarFallback name="User 4" />
            </Avatar>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Avatar Group</CardTitle>
          </CardHeader>
          <CardContent>
            <AvatarGroup max={4}>
              <Avatar><AvatarFallback name="A" /></Avatar>
              <Avatar><AvatarFallback name="B" /></Avatar>
              <Avatar><AvatarFallback name="C" /></Avatar>
              <Avatar><AvatarFallback name="D" /></Avatar>
              <Avatar><AvatarFallback name="E" /></Avatar>
              <Avatar><AvatarFallback name="F" /></Avatar>
            </AvatarGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Company Avatars</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-4">
            <CompanyAvatar name="Tech Corp" size="md" />
            <CompanyAvatar name="Myanmar Jobs" size="lg" />
            <CompanyAvatar name="Global Solutions" size="xl" />
          </CardContent>
        </Card>
      </section>

      {/* Skeletons Section */}
      <section id="skeletons" className="space-y-6">
        <PageHeader 
          title="Skeletons" 
          description="Loading states and placeholders"
        />
        
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Text Skeletons</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-3/5" />
              <SkeletonText lines={3} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Card Skeleton</CardTitle>
            </CardHeader>
            <CardContent>
              <SkeletonCard hasAvatar hasImage contentLines={2} hasFooter />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Job Card Skeleton</CardTitle>
            </CardHeader>
            <CardContent>
              <SkeletonJobCard />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Stats Skeleton</CardTitle>
            </CardHeader>
            <CardContent>
              <SkeletonStatsCard />
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Toasts Section */}
      <section id="toasts" className="space-y-6">
        <PageHeader 
          title="Toast Notifications" 
          description="Temporary notification messages"
        />
        
        <Card>
          <CardHeader>
            <CardTitle>Toast Variants</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button onClick={() => showToast("success")} variant="success">
              Success Toast
            </Button>
            <Button onClick={() => showToast("error")} variant="danger">
              Error Toast
            </Button>
            <Button onClick={() => showToast("warning")} variant="warning">
              Warning Toast
            </Button>
            <Button onClick={() => showToast("info")} variant="secondary">
              Info Toast
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

export default function DesignSystem() {
  const [sidebarOpen, setSidebarOpen] = React.useState(false)

  return (
    <AppShell
      header={
        <Header
          logo={<span className="text-xl font-bold text-primary-600">TRM Referral</span>}
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
          userMenu={
            <UserMenu
              user={{
                name: "John Doe",
                email: "john@example.com",
                role: "Admin",
              }}
              onProfile={() => {}}
              onSettings={() => {}}
              onLogout={() => {}}
            />
          }
        />
      }
      sidebar={
        <Sidebar
          items={sidebarItems}
          onItemClick={(item) => {
            const element = document.querySelector(item.href || "")
            element?.scrollIntoView({ behavior: "smooth" })
          }}
        />
      }
    >
      <DesignSystemContent />
    </AppShell>
  )
}
