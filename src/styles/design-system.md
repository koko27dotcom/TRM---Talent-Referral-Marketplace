# MyanJobs Design System

A comprehensive, professional UI/UX design system optimized for the Myanmar market. Built with accessibility, mobile-first responsiveness, and cultural considerations in mind.

---

## Table of Contents

1. [Design Principles](#design-principles)
2. [Color Palette](#color-palette)
3. [Typography](#typography)
4. [Spacing System](#spacing-system)
5. [Components](#components)
6. [Accessibility](#accessibility)
7. [Dark Mode](#dark-mode)
8. [Animations](#animations)

---

## Design Principles

### 1. Trust & Professionalism
- Clean, modern aesthetic inspired by LinkedIn and Indeed
- Professional color palette with blues conveying trust
- Consistent spacing and alignment throughout

### 2. Mobile-First
- Optimized for Myanmar's mobile-first market
- Touch-friendly targets (minimum 48px)
- Responsive layouts that work on all devices

### 3. Cultural Sensitivity
- Myanmar language support with proper fonts
- Right-to-left considerations for mixed content
- Culturally appropriate imagery and colors

### 4. Accessibility
- WCAG 2.1 AA compliance
- Keyboard navigation support
- Screen reader compatibility
- High contrast ratios

---

## Color Palette

### Primary Colors

```
Primary Blue (Trust & Professionalism)
├── 50: #f0f9ff   (Lightest - backgrounds)
├── 100: #e0f2fe  (Light hover states)
├── 200: #bae6fd  (Borders, dividers)
├── 300: #7dd3fc  (Disabled states)
├── 400: #38bdf8  (Light accents)
├── 500: #0ea5e9  (Primary brand)
├── 600: #0284c7  (Primary hover)
├── 700: #0369a1  (Active states)
├── 800: #075985  (Text on light)
├── 900: #0c4a6e  (Headings)
└── 950: #082f49  (Darkest)
```

### Secondary Colors (Success & Growth)

```
Green
├── 50-950: Success states, positive indicators
├── 500: #22c55e (Main success)
└── 600: #16a34a (Success hover)
```

### Accent Colors (Myanmar Gold)

```
Gold/Amber
├── 50-950: Premium features, highlights
├── 500: #f59e0b (Main accent)
└── 600: #d97706 (Accent hover)
```

### Semantic Colors

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| Success | #22c55e | #4ade80 | Success messages, confirmations |
| Warning | #f59e0b | #fbbf24 | Warnings, attention needed |
| Error | #ef4444 | #f87171 | Errors, destructive actions |
| Info | #3b82f6 | #60a5fa | Information, neutral notices |

### Neutral Scale

```
Gray Scale
├── 50: #fafafa   (Page backgrounds)
├── 100: #f5f5f5  (Card backgrounds)
├── 200: #e5e5e5  (Borders)
├── 300: #d4d4d4  (Disabled borders)
├── 400: #a3a3a3  (Placeholder text)
├── 500: #737373  (Secondary text)
├── 600: #525252  (Body text)
├── 700: #404040  (Strong text)
├── 800: #262626  (Headings)
├── 900: #171717  (Primary text)
└── 950: #0a0a0a  (Deep black)
```

---

## Typography

### Font Stack

```css
/* Primary Font - Myanmar Support */
font-family: 'Inter', 'Noto Sans Myanmar', 'Pyidaungsu', 'Myanmar3', 
             'system-ui', '-apple-system', sans-serif;

/* Myanmar-specific */
font-family: 'Noto Sans Myanmar', 'Pyidaungsu', 'Myanmar3', 
             'Myanmar Text', 'Padauk', sans-serif;

/* Monospace */
font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
```

### Type Scale

| Token | Size | Line Height | Usage |
|-------|------|-------------|-------|
| 2xs | 10px | 14px | Captions, timestamps |
| xs | 12px | 16px | Small labels, badges |
| sm | 14px | 20px | Secondary text |
| base | 16px | 24px | Body text |
| lg | 18px | 28px | Lead paragraphs |
| xl | 20px | 28px | Section headers |
| 2xl | 24px | 32px | Page titles |
| 3xl | 30px | 36px | Major headings |
| 4xl | 36px | 40px | Hero text |
| 5xl | 48px | 1.1 | Display text |

### Font Weights

| Weight | Value | Usage |
|--------|-------|-------|
| Regular | 400 | Body text |
| Medium | 500 | Emphasis, labels |
| Semibold | 600 | Subheadings, buttons |
| Bold | 700 | Headings, strong |

---

## Spacing System

### 4px Grid Base

All spacing values are multiples of 4px:

```
1  = 4px    (micro)
2  = 8px    (xs)
3  = 12px   (sm)
4  = 16px   (md)
6  = 24px   (lg)
8  = 32px   (xl)
12 = 48px   (2xl)
16 = 64px   (3xl)
24 = 96px   (4xl)
```

### Common Patterns

```
Component Padding:
- Small (buttons, inputs): 8px 16px
- Medium (cards): 16px 24px
- Large (sections): 24px 32px

Component Gap:
- Tight: 8px
- Normal: 16px
- Loose: 24px
- Section: 32px
```

---

## Components

### Button

**Variants:**
- `primary` - Main actions, filled blue
- `secondary` - Alternative actions, gray
- `outline` - Low emphasis, bordered
- `ghost` - Minimal, hover background
- `danger` - Destructive actions, red
- `link` - Text-only, underlined on hover

**Sizes:**
- `sm` - 32px height
- `md` - 40px height (default)
- `lg` - 48px height
- `icon` - Square, 40px

**States:**
- Default, Hover, Active, Focus, Disabled, Loading

### Input

**Features:**
- Label support with required indicator
- Helper text and error messages
- Icon prefix/suffix support
- Validation states (valid, invalid, pending)
- Character counter

**States:**
- Default, Focus, Error, Success, Disabled, Read-only

### Card

**Variants:**
- `default` - Standard card with shadow
- `flat` - No shadow, border only
- `elevated` - Higher shadow
- `interactive` - Hover lift effect

**Sections:**
- Header (title, actions)
- Content (main body)
- Footer (actions, metadata)

### Modal/Dialog

**Features:**
- Overlay with backdrop blur
- Focus trap
- Escape key close
- Click outside to close (optional)
- Size variants (sm, md, lg, xl, full)

**Accessibility:**
- ARIA labels
- Focus management
- Screen reader announcements

### Toast Notifications

**Types:**
- Success, Error, Warning, Info

**Positioning:**
- Top-right, Top-center, Top-left
- Bottom-right, Bottom-center, Bottom-left

**Behavior:**
- Auto-dismiss (5s default)
- Progress indicator
- Stacking support
- Swipe to dismiss (mobile)

### Avatar

**Sizes:**
- xs (24px), sm (32px), md (40px), lg (48px), xl (64px), 2xl (96px)

**Variants:**
- Image, Initials, Icon fallback
- Status indicator (online, away, busy, offline)
- Group stacking

### Badge

**Variants:**
- Default (primary color)
- Secondary (gray)
- Success (green)
- Warning (amber)
- Error (red)
- Outline (bordered)

**Shapes:**
- Default (rounded)
- Pill (fully rounded)
- Dot (small indicator)

### Loading Skeleton

**Types:**
- Text (single/multiple lines)
- Card
- Avatar
- Image
- Custom shapes

**Animation:**
- Shimmer effect
- Pulse animation

---

## Accessibility

### WCAG 2.1 AA Compliance

1. **Color Contrast**
   - Normal text: 4.5:1 minimum
   - Large text: 3:1 minimum
   - UI components: 3:1 minimum

2. **Focus Indicators**
   - Visible focus ring on all interactive elements
   - 2px solid outline with 2px offset
   - High contrast focus color

3. **Keyboard Navigation**
   - All interactive elements reachable via Tab
   - Logical tab order
   - Escape key closes modals/dropdowns
   - Enter/Space activates buttons

4. **Screen Readers**
   - Semantic HTML elements
   - ARIA labels where needed
   - Role attributes for custom components
   - Live regions for dynamic content

5. **Motion**
   - Respect `prefers-reduced-motion`
   - No auto-playing animations
   - Essential animations only

### Implementation Checklist

- [ ] All images have alt text
- [ ] Form inputs have associated labels
- [ ] Color is not the only indicator of state
- [ ] Focus order is logical
- [ ] Error messages are associated with inputs
- [ ] Skip links provided for navigation
- [ ] Language attribute set correctly

---

## Dark Mode

### Color Mapping

```
Light → Dark
- Background: white → slate-900
- Surface: gray-50 → slate-800
- Text Primary: gray-900 → gray-100
- Text Secondary: gray-600 → gray-400
- Border: gray-200 → slate-700
```

### Implementation

```css
/* Using Tailwind dark mode */
.dark body {
  @apply bg-slate-900 text-gray-100;
}

/* Component example */
.card {
  @apply bg-white dark:bg-slate-800
         border-gray-200 dark:border-slate-700
         text-gray-900 dark:text-gray-100;
}
```

---

## Animations

### Timing

| Duration | Usage |
|----------|-------|
| 100ms | Micro-interactions (button presses) |
| 200ms | State changes (hover, focus) |
| 300ms | Component transitions |
| 400ms | Page transitions |
| 500ms+ | Emphasis animations |

### Easing

| Name | Curve | Usage |
|------|-------|-------|
| ease-out | cubic-bezier(0,0,0.2,1) | Entering elements |
| ease-in | cubic-bezier(0.4,0,1,1) | Leaving elements |
| spring | cubic-bezier(0.34,1.56,0.64,1) | Playful interactions |

### Available Animations

- `fade-in` / `fade-out`
- `slide-up` / `slide-down`
- `slide-in-right` / `slide-out-right`
- `scale-in` / `scale-out`
- `shimmer` (loading)
- `skeleton` (loading)
- `float` (subtle emphasis)

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Usage Examples

### Button

```tsx
import { Button } from '@/components/ui/button'

// Primary action
<Button variant="primary" size="lg">
  Post Job
</Button>

// Destructive
<Button variant="danger" size="sm">
  Delete
</Button>

// With icon
<Button variant="outline">
  <PlusIcon className="w-4 h-4 mr-2" />
  Add New
</Button>
```

### Input with Validation

```tsx
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

<div className="space-y-2">
  <Label htmlFor="email" required>
    Email Address
  </Label>
  <Input
    id="email"
    type="email"
    placeholder="you@example.com"
    error={errors.email}
    helperText="We'll never share your email"
  />
</div>
```

### Card

```tsx
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

<Card variant="elevated" className="max-w-md">
  <CardHeader>
    <CardTitle>Job Application</CardTitle>
  </CardHeader>
  <CardContent>
    <p>Your application has been submitted successfully.</p>
  </CardContent>
</Card>
```

---

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- iOS Safari 14+
- Chrome Android 90+

---

## Resources

- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Noto Sans Myanmar](https://fonts.google.com/noto/specimen/Noto+Sans+Myanmar)
- [Radix UI Primitives](https://www.radix-ui.com/)

---

## Changelog

### v1.0.0 (2024-02-07)
- Initial design system release
- Complete component library
- Myanmar typography support
- Dark mode foundation
- Accessibility compliance
