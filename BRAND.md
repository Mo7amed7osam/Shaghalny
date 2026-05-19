# Shaghalny Brand Identity System
> Reference for developers — reflects actual codebase (React + TypeScript + Vite + Tailwind CSS)

---

## 1. Brand Overview

**Name:** shaghalny (شغّلني)
**Meaning:** "Employ me" / "Keep me busy with work" in Arabic
**Platform:** Student-freelancing platform — university students + clients, verified projects, contracts, skill tests, interviews, payments.
**Market:** MENA-first, globally-minded

### Brand Positioning
> Professional + ambitious + student-friendly. Not a side hustle — a career start.

**Personality axes:**
- Modern, not trendy
- Trustworthy, not corporate
- Ambitious, not intimidating
- Digital-native, not sterile
- Youthful energy, not immature

### Tagline options
- "shaghalny — where students get to work"
- "Your first real project starts here"
- "Verified. Hired. Launched."

---

## 2. Color System

Colors live in `tailwind.config.ts` and are consumed via Tailwind utility classes. Dark mode uses `class` strategy — toggle `dark` on `<html>`.

### Tailwind Config (`tailwind.config.ts`)
```ts
colors: {
  brand: {
    50:  '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',   // primary — CTAs, active states, links
    600: '#2563eb',   // hover on primary
    700: '#1d4ed8',   // dark mode primary
    800: '#1e40af',
    900: '#1e3a8a',
  },
  accent: {
    50:  '#ecfdf5',
    100: '#d1fae5',
    200: '#a7f3d0',
    300: '#6ee7b7',
    400: '#34d399',
    500: '#10b981',   // success, verified badges
    600: '#059669',
    700: '#047857',
    800: '#065f46',
    900: '#064e3b',
  },
  ink: {
    50:  '#f8fafc',   // page background (light)
    100: '#f1f5f9',
    200: '#e2e8f0',   // borders (light)
    300: '#cbd5e1',
    400: '#94a3b8',   // muted text
    500: '#64748b',
    600: '#475569',   // secondary text
    700: '#334155',
    800: '#1e293b',   // primary text
    900: '#0f172a',   // headings
    950: '#020617',   // hero/dark sections
    dark: {
      bg:      '#0b0a14',  // dark page background
      surface: '#13111f',  // dark card background
      border:  '#2a2547',  // dark borders
      text:    '#ece9f8',  // dark primary text
      muted:   '#8b88b0',  // dark muted text
    },
  },
}
```

### Color Usage Rules
| Token | Tailwind class | Use |
|-------|---------------|-----|
| `brand-500` `#3b82f6` | `bg-brand-500` / `text-brand-600` | CTAs, active states, links |
| `brand-600` `#2563eb` | `hover:bg-brand-600` | Hover on primary |
| `accent-500` `#10b981` | `text-accent-500` | Success, verified, growth |
| `ink-900` `#0f172a` | `text-ink-900` | Headings |
| `ink-600` `#475569` | `text-ink-600` | Body text |
| `ink-50` `#f8fafc` | `bg-ink-50` | Page background |
| `ink-950` `#020617` | `bg-ink-950` | Hero / dark sections |
| `ink.dark.bg` `#0b0a14` | `dark:bg-ink-dark-bg` | Dark mode page bg |
| `ink.dark.surface` `#13111f` | `dark:bg-ink-dark-surface` | Dark mode cards |

---

## 3. Typography

Single font: **Inter** — loaded via Google Fonts in `src/styles.css`.

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,400;0,14..32,500;0,14..32,600;0,14..32,700;0,14..32,800;1,14..32,400&display=swap');
```

```ts
// tailwind.config.ts
fontFamily: {
  sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
}
```

### Usage
- **Headings:** `font-semibold` or `font-bold`, `tracking-tight`
- **Body:** `font-normal`, `leading-7`
- **Labels/eyebrows:** `text-xs font-semibold uppercase tracking-[0.14em]`
- **UI elements:** `font-medium` (buttons, badges)

### Type Scale (Tailwind defaults)
| Class | Size | Use |
|-------|------|-----|
| `text-xs` | 12px | Labels, captions, eyebrows |
| `text-sm` | 14px | Small UI, meta |
| `text-base` | 16px | Body |
| `text-lg` | 18px | Lead text |
| `text-xl` | 20px | Card titles |
| `text-2xl` | 24px | Section headers |
| `text-3xl` | 30px | Page titles |
| `text-4xl` | 36px | Hero headline |

---

## 4. Spacing, Radius & Shadows

Standard Tailwind spacing scale. Custom additions:

```ts
// tailwind.config.ts
borderRadius: {
  '4xl': '2rem',
}

boxShadow: {
  soft:     '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
  card:     '0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -1px rgba(0,0,0,0.05)',
  elevated: '0 10px 25px -5px rgba(0,0,0,0.1), 0 4px 10px -3px rgba(0,0,0,0.07)',
  glass:    '0 8px 24px rgba(37, 99, 235, 0.12)',
}
```

### Preferred radius values
| Token | Value | Use |
|-------|-------|-----|
| `rounded-lg` | 8px | Inputs, small cards |
| `rounded-xl` | 12px | Cards, panels, dropdowns |
| `rounded-2xl` | 16px | Feature blocks |
| `rounded-full` | 9999px | Badges, avatars, pills |

---

## 5. Logo & Icon SVG Code

### 5a. Logo Mark (icon only)
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <rect width="48" height="48" rx="12" fill="#2563eb"/>
  <path d="M12 36 C12 26 36 22 36 12" stroke="white" stroke-width="3" stroke-linecap="round" fill="none"/>
  <circle cx="36" cy="12" r="5" fill="#60a5fa"/>
</svg>
```

### 5b. Wordmark — Light background
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 40" width="200" height="40">
  <rect width="36" height="36" x="0" y="2" rx="9" fill="#2563eb"/>
  <path d="M9 29 C9 21 27 18 27 10" stroke="white" stroke-width="2.4" stroke-linecap="round" fill="none"/>
  <circle cx="27" cy="10" r="3.8" fill="#60a5fa"/>
  <text x="46" y="26" font-family="'Inter', sans-serif" font-size="18" font-weight="600" letter-spacing="-0.5" fill="#1e293b">shaghalny</text>
</svg>
```

### 5c. Wordmark — Dark background
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 40" width="200" height="40">
  <rect width="36" height="36" x="0" y="2" rx="9" fill="#2563eb"/>
  <path d="M9 29 C9 21 27 18 27 10" stroke="white" stroke-width="2.4" stroke-linecap="round" fill="none"/>
  <circle cx="27" cy="10" r="3.8" fill="#60a5fa"/>
  <text x="46" y="26" font-family="'Inter', sans-serif" font-size="18" font-weight="600" letter-spacing="-0.5" fill="#ffffff">shaghalny</text>
</svg>
```

### 5d. Bilingual Wordmark (Latin + Arabic)
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 210 48" width="210" height="48">
  <rect width="40" height="40" x="0" y="4" rx="10" fill="#2563eb"/>
  <path d="M10 34 C10 24 30 21 30 11" stroke="white" stroke-width="2.4" stroke-linecap="round" fill="none"/>
  <circle cx="30" cy="11" r="4" fill="#60a5fa"/>
  <text x="50" y="22" font-family="'Inter', sans-serif" font-size="17" font-weight="600" letter-spacing="-0.4" fill="#1e293b">shaghalny</text>
  <text x="208" y="38" font-family="system-ui, sans-serif" font-size="13" font-weight="600" fill="#2563eb" text-anchor="end" direction="rtl">شغّلني</text>
</svg>
```

### 5e. Favicon (32×32)
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <rect width="32" height="32" rx="7" fill="#2563eb"/>
  <path d="M8 24 C8 17 24 15 24 8" stroke="white" stroke-width="2.5" stroke-linecap="round" fill="none"/>
  <circle cx="24" cy="8" r="3.5" fill="#60a5fa"/>
</svg>
```

---

## 6. UI Icon Set (SVG, 24×24, stroke-based)

All icons: `stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"`

Set color via `className="text-brand-500"` (or any Tailwind text color) on parent.

### Briefcase (projects)
```svg
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
  <rect x="2" y="7" width="20" height="14" rx="3"/>
  <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
  <line x1="12" y1="12" x2="12" y2="12.01"/>
  <path d="M2 12h20"/>
</svg>
```

### Verified / Shield check
```svg
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
  <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.25C17.25 22.15 21 17.25 21 12V7L12 2z"/>
  <polyline points="9 12 11 14 15 10"/>
</svg>
```

### Student / Graduation cap
```svg
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
  <polygon points="12 2 22 8.5 12 15 2 8.5 12 2"/>
  <path d="M6 11v5a6 6 0 0 0 12 0v-5"/>
  <line x1="22" y1="8.5" x2="22" y2="14"/>
</svg>
```

### Contract / File sign
```svg
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
  <polyline points="14 2 14 8 20 8"/>
  <line x1="8" y1="13" x2="16" y2="13"/>
  <line x1="8" y1="17" x2="13" y2="17"/>
</svg>
```

### Payment / Card
```svg
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
  <rect x="1" y="4" width="22" height="16" rx="3"/>
  <line x1="1" y1="10" x2="23" y2="10"/>
  <line x1="6" y1="15" x2="10" y2="15"/>
</svg>
```

### Interview / Video call
```svg
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
  <polygon points="23 7 16 12 23 17 23 7"/>
  <rect x="1" y="5" width="15" height="14" rx="3"/>
</svg>
```

### Growth / Trending up
```svg
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
  <polyline points="17 6 23 6 23 12"/>
</svg>
```

### Star / Rating
```svg
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
</svg>
```

### Search / Find talent
```svg
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="11" cy="11" r="8"/>
  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
</svg>
```

### User profile
```svg
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
  <circle cx="12" cy="7" r="4"/>
</svg>
```

### Notification / Bell
```svg
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
</svg>
```

### Chat / Message
```svg
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
</svg>
```

---

## 7. Component Tokens

Components use Tailwind classes + Radix UI primitives. See `src/components/ui/` for implementations.

### Component classes (`src/styles.css`)

```css
/* Cards / Panels */
.glass-panel   /* rounded-xl border bg-white shadow-soft + dark variants */
.card-surface  /* same as glass-panel */
.muted-panel   /* rounded-lg border bg-ink-50 + dark variants */
.kpi-card      /* rounded-xl border bg-white p-6 shadow-soft + dark variants */

/* Hero surfaces */
.feature-highlight  /* rounded-2xl bg-brand-700 text-white + radial overlay */

/* Interactive */
.interactive-card   /* transition-all; hover: -translate-y-0.5 + shadow-elevated */

/* Layout */
.page-shell      /* min-h-screen bg-ink-50 dark:bg-ink-dark-bg */
.page-container  /* mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 */
.page-copy       /* max-w-2xl text-base text-ink-600 */
.page-eyebrow    /* text-xs font-semibold uppercase tracking-[0.14em] text-brand-600 */

/* Text utilities */
.text-ui-primary    /* text-ink-900 dark:text-ink-dark-text */
.text-ui-secondary  /* text-ink-600 dark:text-ink-400 */
.text-ui-muted      /* text-ink-500 dark:text-ink-dark-muted */
.label-muted        /* text-xs font-semibold uppercase tracking-[0.12em] */
```

### Buttons (Tailwind classes — use `src/components/ui/Button.tsx`)
```tsx
// Primary
<Button className="bg-brand-600 text-white hover:bg-brand-700 font-semibold rounded-xl px-5 py-2.5" />

// Secondary (outline)
<Button variant="outline" className="border-brand-600 text-brand-600 hover:bg-ink-50 rounded-xl" />

// Ghost
<Button variant="ghost" className="text-ink-600 hover:text-ink-900 hover:bg-ink-100 rounded-xl" />
```

### Badges (use `src/components/ui/Badge.tsx`)
```tsx
<Badge className="bg-accent-50 text-accent-700 font-semibold" />   // verified / success
<Badge className="bg-brand-50 text-brand-700 font-semibold" />     // active / skill
<Badge className="bg-amber-50 text-amber-700 font-semibold" />     // pending
<Badge className="bg-ink-100 text-ink-700 font-semibold" />        // neutral / tag
```

### Inputs (use `src/components/ui/Input.tsx`)
```tsx
<Input className="border-ink-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 rounded-lg" />
```

### Animation (framer-motion)
```ts
const fadeUp = {
  hidden:  { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.23, 1, 0.32, 1] } }
};
const stagger = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.06 } }
};
```

### Shimmer skeleton
```tsx
<div className="relative overflow-hidden bg-ink-100 rounded-lg">
  <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent" />
</div>
```

---

## 8. Navigation Bar (React)

Navbar lives in `src/components/layout/`. Reference structure:

```tsx
<nav className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-ink-200 bg-white px-8 dark:border-ink-dark-border dark:bg-ink-dark-surface">
  {/* Logo */}
  <a href="/" className="flex items-center gap-2.5 no-underline">
    {/* Wordmark SVG — see section 5b */}
  </a>

  {/* Links */}
  <div className="flex gap-8">
    <a href="/projects" className="text-sm text-ink-600 hover:text-ink-900 dark:text-ink-400">Projects</a>
    <a href="/students" className="text-sm text-ink-600 hover:text-ink-900 dark:text-ink-400">Students</a>
    <a href="/how-it-works" className="text-sm text-ink-600 hover:text-ink-900 dark:text-ink-400">How it works</a>
  </div>

  {/* CTA + Avatar/DropdownMenu when authed */}
  <div className="flex items-center gap-2.5">
    <a href="/login" className="text-sm text-ink-600 px-4 py-2">Log in</a>
    <a href="/signup" className="rounded-xl bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700">Get started</a>
  </div>
</nav>
```

Authenticated state: replace CTA with `<Avatar>` + `<DropdownMenu>` (Radix) — see Topbar component.

---

## 9. Hero Section Starter

```tsx
<section className="bg-ink-950 px-8 py-24 text-center text-white">
  <div className="mx-auto max-w-2xl">
    {/* Eyebrow pill */}
    <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-700/40 bg-brand-900/30 px-4 py-1.5">
      {/* Growth icon */}
      <span className="text-xs text-brand-300">Over 500 students already hired</span>
    </div>

    <h1 className="mb-5 text-4xl font-bold tracking-tight text-balance">
      Your first real project<br />starts here
    </h1>

    <p className="mb-10 text-lg leading-7 text-ink-400">
      shaghalny connects university students with clients for verified, paid projects —
      with contracts, skill tests, and real career momentum.
    </p>

    <div className="flex flex-wrap justify-center gap-3">
      <a href="/signup?role=student"
         className="rounded-xl bg-brand-600 px-7 py-3 text-sm font-semibold text-white hover:bg-brand-700">
        I'm a student →
      </a>
      <a href="/signup?role=client"
         className="rounded-xl border border-white/15 bg-white/8 px-7 py-3 text-sm font-semibold text-ink-200 hover:bg-white/12">
        I'm hiring →
      </a>
    </div>
  </div>
</section>
```

---

## 10. Dos and Don'ts

### Do
- Use lowercase `shaghalny` always (never Shaghalny or SHAGHALNY in logo)
- Pair Arabic "شغّلني" when targeting MENA users
- Use `brand-*` tokens for all primary interactive elements
- Use `accent-*` (green) for success, verified, and growth states
- Use `ink-*` tokens for all neutrals — never raw hex in components
- Use `dark:` prefix for all dark mode variants
- Use Radix UI primitives for accessible components (Dialog, DropdownMenu, Tabs, etc.)
- Wrap lists of cards in framer-motion stagger containers

### Don't
- Don't hardcode hex values — use Tailwind tokens
- Don't use `rounded-3xl` or larger on cards (max `rounded-2xl` for feature blocks, `rounded-xl` for cards)
- Don't add glassmorphism (`backdrop-blur`) — use clean white/surface cards
- Don't use `window.confirm` / `window.alert` — use `<AlertDialog>` (Radix)
- Don't mix font weights heavier than `font-bold` (700)
- Don't add inline `style` props for colors or spacing — Tailwind classes only

---

*End of Shaghalny Brand Identity System v1.1 — synced to codebase 2026-05-19*
