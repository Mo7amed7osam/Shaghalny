import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  CreditCard,
  GraduationCap,
  ShieldCheck,
  Sparkles,
  Video,
} from 'lucide-react';

import logo from '@/assets/shaghalny-logo-premium.svg';
import useAuth from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';

const dashboardPathByRole = {
  Student: '/student/dashboard',
  Client: '/client/dashboard',
  Admin: '/admin/dashboard',
} as const;

const features = [
  {
    icon: GraduationCap,
    title: 'Built for student talent',
    description: 'A marketplace where early-career work gets structure: verified profiles, clear proposals, and contracts that hold.',
  },
  {
    icon: Video,
    title: 'AI verification with Gravis',
    description: 'Students complete structured interviews before proposals move forward. Clients see evidence, not claims.',
  },
  {
    icon: CreditCard,
    title: 'End-to-end workflow',
    description: 'Jobs, proposals, contracts, and wallet top-ups stay connected. Nothing lives in a separate tool.',
  },
];

const roles = [
  {
    icon: GraduationCap,
    label: 'Students',
    heading: 'Turn coursework into paid work.',
    body: 'Build a verifiable profile, pass a structured AI interview, and apply to jobs with a proposal that stands on evidence.',
    cta: 'Create student account',
    to: '/register',
  },
  {
    icon: BriefcaseBusiness,
    label: 'Clients',
    heading: 'Hire with fewer trust gaps.',
    body: 'Post roles, review proposals ranked by verified skill scores, and move straight to contracts without the usual back-and-forth.',
    cta: 'Post your first job',
    to: '/register',
  },
];

const steps = [
  { n: '01', title: 'Create a profile', body: 'Students list their skills, experience, and portfolio. Clients set up their hiring workspace.' },
  { n: '02', title: 'Verify capability', body: 'Gravis runs a structured AI interview. Scores are attached to the profile before any proposal is sent.' },
  { n: '03', title: 'Review and shortlist', body: 'Clients compare budgets, verified skill data, and proposal history in one view.' },
  { n: '04', title: 'Close confidently', body: 'Contracts and wallet flows carry the deal through delivery without leaving the platform.' },
];

const LandingPage: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const dashboardPath = user ? dashboardPathByRole[user.role as keyof typeof dashboardPathByRole] : null;
  const ctaPath = isAuthenticated && dashboardPath ? dashboardPath : '/register';
  const ctaLabel = isAuthenticated ? 'Go to workspace' : 'Create account';

  return (
    <div className="min-h-screen bg-white dark:bg-ink-dark-bg">
      {/* ── Nav ── */}
      <header className="sticky top-0 z-20 border-b border-ink-100 bg-white/95 backdrop-blur-sm dark:border-ink-dark-border dark:bg-ink-dark-bg/95">
        <div className="page-container flex h-16 items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5 text-ink-900 no-underline dark:text-ink-dark-text">
            <img src={logo} alt="Shaghalny" className="h-8 w-8 rounded-lg object-contain" />
            <span className="text-sm font-semibold">Shaghalny</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link to={ctaPath}>{ctaLabel}</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="bg-ink-950 text-white">
        <div className="page-container py-24 sm:py-32">
          <div className="mx-auto max-w-3xl space-y-8 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white/60">
              <Sparkles size={12} />
              Student freelancing marketplace
            </div>
            <h1 className="text-balance text-5xl font-semibold leading-tight text-white sm:text-6xl">
              Hire verified student talent.<br />
              <span className="text-brand-400">Without the trust gap.</span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg leading-7 text-white/64">
              Shaghalny connects clients with early-career freelancers who have completed structured AI interviews. Real verification, clean workflows, one platform.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Button asChild size="xl">
                <Link to={ctaPath}>
                  {ctaLabel}
                  <ArrowRight size={18} />
                </Link>
              </Button>
              <Button asChild variant="outline" size="xl" className="border-white/15 bg-white/8 text-white hover:bg-white/12 hover:border-white/25 dark:border-white/15 dark:bg-white/8 dark:text-white dark:hover:bg-white/12">
                <Link to="/login">Sign in</Link>
              </Button>
            </div>
          </div>

          <div className="mx-auto mt-16 grid max-w-2xl grid-cols-3 gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10">
            {[
              { label: 'Verification', value: 'AI-backed' },
              { label: 'Workflow', value: 'End-to-end' },
              { label: 'Audience', value: 'Students first' },
            ].map((stat) => (
              <div key={stat.label} className="flex flex-col items-center gap-1 bg-ink-950 px-6 py-5 text-center">
                <p className="text-lg font-semibold text-white">{stat.value}</p>
                <p className="text-xs uppercase tracking-[0.14em] text-white/44">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="bg-ink-50 dark:bg-ink-dark-surface">
        <div className="page-container py-20">
          <div className="mb-12 text-center">
            <p className="page-eyebrow mb-3">Platform</p>
            <h2 className="text-3xl font-semibold text-ink-900 dark:text-ink-dark-text sm:text-4xl">
              What makes Shaghalny different
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="rounded-xl border border-ink-200 bg-white p-6 dark:border-ink-dark-border dark:bg-ink-dark-bg">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400">
                  <f.icon size={20} />
                </div>
                <h3 className="mb-2 text-base font-semibold text-ink-900 dark:text-ink-dark-text">{f.title}</h3>
                <p className="text-sm leading-6 text-ink-500 dark:text-ink-dark-muted">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Roles ── */}
      <section className="bg-white dark:bg-ink-dark-bg">
        <div className="page-container py-20">
          <div className="mb-12 text-center">
            <p className="page-eyebrow mb-3">For every role</p>
            <h2 className="text-3xl font-semibold text-ink-900 dark:text-ink-dark-text sm:text-4xl">
              One platform, two sides of hiring
            </h2>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            {roles.map((role) => (
              <div key={role.label} className="flex flex-col justify-between gap-8 rounded-xl border border-ink-200 p-8 dark:border-ink-dark-border">
                <div className="space-y-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400">
                    <role.icon size={20} />
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-ink-400 dark:text-ink-dark-muted">{role.label}</p>
                    <h3 className="mb-3 text-2xl font-semibold text-ink-900 dark:text-ink-dark-text">{role.heading}</h3>
                    <p className="text-sm leading-6 text-ink-500 dark:text-ink-dark-muted">{role.body}</p>
                  </div>
                </div>
                <Button asChild variant="outline" size="sm" className="w-fit">
                  <Link to={role.to}>{role.cta}</Link>
                </Button>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-xl border border-ink-200 p-8 dark:border-ink-dark-border">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-50 text-accent-600 dark:bg-accent-900/30 dark:text-accent-400">
                <ShieldCheck size={20} />
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-ink-400 dark:text-ink-dark-muted">Admins</p>
                <h3 className="mb-2 text-xl font-semibold text-ink-900 dark:text-ink-dark-text">Manage the whole marketplace from one control center.</h3>
                <p className="text-sm leading-6 text-ink-500 dark:text-ink-dark-muted">
                  Review payment approvals, manage events, and oversee verification status without switching tools.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="border-y border-ink-100 bg-ink-50 dark:border-ink-dark-border dark:bg-ink-dark-surface">
        <div className="page-container py-20">
          <div className="mb-12">
            <p className="page-eyebrow mb-3">How it works</p>
            <h2 className="text-3xl font-semibold text-ink-900 dark:text-ink-dark-text sm:text-4xl">
              Structured hiring, start to finish.
            </h2>
          </div>
          <div className="grid gap-px overflow-hidden rounded-xl border border-ink-200 bg-ink-200 sm:grid-cols-2 lg:grid-cols-4 dark:border-ink-dark-border dark:bg-ink-dark-border">
            {steps.map((step) => (
              <div key={step.n} className="space-y-3 bg-white p-6 dark:bg-ink-dark-bg">
                <p className="text-2xl font-semibold text-brand-200 dark:text-brand-800">{step.n}</p>
                <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-dark-text">{step.title}</h3>
                <p className="text-sm leading-5 text-ink-500 dark:text-ink-dark-muted">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI Section ── */}
      <section className="bg-brand-700 text-white">
        <div className="page-container py-20">
          <div className="grid gap-10 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white/70">
                <BadgeCheck size={12} />
                Gravis AI verification
              </div>
              <h2 className="text-3xl font-semibold text-white sm:text-4xl">
                Skills that are proven, not promised.
              </h2>
              <p className="max-w-xl text-base leading-7 text-white/70">
                Every student on Shaghalny has completed a structured AI interview with Gravis before their proposals reach clients. No unverified claims, no noise in your candidate shortlist.
              </p>
              <div className="flex flex-wrap gap-4 pt-2">
                {[
                  'Structured question sets per skill',
                  'Scores attached to the profile',
                  'Visible before clients review proposals',
                ].map((point) => (
                  <div key={point} className="flex items-center gap-2 text-sm text-white/80">
                    <BadgeCheck size={14} className="shrink-0 text-brand-200" />
                    {point}
                  </div>
                ))}
              </div>
            </div>
            <div className="hidden lg:block">
              <div className="rounded-xl border border-white/15 bg-white/10 p-6">
                <Video size={48} className="text-brand-200" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-white dark:bg-ink-dark-bg">
        <div className="page-container py-20">
          <div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
            <div className="space-y-3">
              <h2 className="text-3xl font-semibold text-ink-900 dark:text-ink-dark-text sm:text-4xl">
                Ready to get started?
              </h2>
              <p className="max-w-lg text-base text-ink-500 dark:text-ink-dark-muted">
                Join students and clients already using Shaghalny for verified, structured freelancing.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to={ctaPath}>
                  {ctaLabel}
                  <ArrowRight size={18} />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/login">Sign in</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-ink-100 dark:border-ink-dark-border">
        <div className="page-container flex flex-col items-center justify-between gap-4 py-8 text-sm text-ink-400 md:flex-row dark:text-ink-dark-muted">
          <div className="flex items-center gap-2.5">
            <img src={logo} alt="Shaghalny" className="h-6 w-6 rounded object-contain" />
            <p>© {new Date().getFullYear()} Shaghalny. Verified student talent.</p>
          </div>
          <div className="flex items-center gap-5">
            <Link to="/login" className="hover:text-ink-600 dark:hover:text-ink-dark-text">Sign in</Link>
            <Link to="/register" className="hover:text-ink-600 dark:hover:text-ink-dark-text">Create account</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
