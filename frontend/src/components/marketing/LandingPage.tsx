import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  CheckCircle2,
  CreditCard,
  GraduationCap,
  ShieldCheck,
  Sparkles,
  Star,
  Video,
  Zap,
  Clock,
  FileText,
  Moon,
  Sun,
  Wallet,
} from 'lucide-react';

import wordmark from '@/assets/shaghalny-wordmark.svg';
import useAuth from '@/hooks/useAuth';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { getTheme, setTheme } from '@/lib/theme';

const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];
const EASE_IN_OUT: [number, number, number, number] = [0.77, 0, 0.175, 1];

const dashboardPathByRole = {
  Student: '/student/dashboard',
  Client: '/client/dashboard',
  Admin: '/admin/dashboard',
} as const;

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: EASE_OUT, delay },
  }),
};

const fadeIn = {
  hidden: { opacity: 0, scale: 0.97 },
  visible: (delay = 0) => ({
    opacity: 1,
    scale: 1,
    transition: { duration: 0.45, ease: EASE_OUT, delay },
  }),
};

function useScrollInView(margin = '-60px') {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: margin as Parameters<typeof useInView>[1]['margin'] });
  return { ref, inView };
}

// ── Product Preview Component ─────────────────────────────────────────────────

const ProductPreview: React.FC = () => {
  const shouldReduce = useReducedMotion();

  const items = [
    {
      id: 'profile',
      delay: 0.05,
      content: (
        <div className="flex items-start gap-3">
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarFallback className="text-xs font-bold">SK</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-ink-900 dark:text-ink-dark-text">Sara Khalil</span>
              <Badge variant="success" className="text-[10px]">
                <BadgeCheck size={9} />
                Verified
              </Badge>
            </div>
            <p className="mt-0.5 text-xs text-ink-500 dark:text-ink-dark-muted">React Developer · Score 94/100</p>
          </div>
          <div className="flex items-center gap-0.5 text-amber-500">
            <Star size={11} className="fill-amber-400" />
            <span className="text-[11px] font-semibold text-ink-700 dark:text-ink-300">4.9</span>
          </div>
        </div>
      ),
      label: 'Student Profile',
      accent: 'bg-brand-50 dark:bg-brand-900/20',
      dot: 'bg-brand-400',
    },
    {
      id: 'job',
      delay: 0.12,
      content: (
        <div className="space-y-1.5">
          <p className="text-sm font-semibold text-ink-900 dark:text-ink-dark-text leading-snug">
            Build e-commerce landing page
          </p>
          <div className="flex items-center gap-3 text-xs text-ink-500 dark:text-ink-dark-muted">
            <span className="flex items-center gap-1"><Wallet size={10} />300 EGP budget</span>
            <span className="flex items-center gap-1"><Clock size={10} />Posted 2h ago</span>
          </div>
          <Badge variant="brand" className="text-[10px]">React · Tailwind · TypeScript</Badge>
        </div>
      ),
      label: 'Job Post',
      accent: 'bg-ink-50 dark:bg-ink-dark-surface',
      dot: 'bg-ink-300 dark:bg-ink-600',
    },
    {
      id: 'proposal',
      delay: 0.19,
      content: (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-ink-900 dark:text-ink-dark-text">Proposal received</p>
            <Badge variant="warning" className="text-[10px]">New</Badge>
          </div>
          <p className="text-xs text-ink-500 dark:text-ink-dark-muted leading-relaxed">
            "I can deliver in 5 days with full responsive design." — Sara K.
          </p>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-accent-600 dark:text-accent-400">280 EGP</span>
            <span className="text-xs text-ink-400">· 5 day delivery</span>
          </div>
        </div>
      ),
      label: 'Proposal',
      accent: 'bg-amber-50 dark:bg-amber-900/10',
      dot: 'bg-amber-400',
    },
    {
      id: 'ai',
      delay: 0.26,
      content: (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Zap size={13} className="text-brand-500" />
            <p className="text-sm font-semibold text-ink-900 dark:text-ink-dark-text">Gravis AI — Interview Complete</p>
          </div>
          <div className="flex gap-2">
            {[
              { skill: 'React', score: 94 },
              { skill: 'CSS', score: 88 },
            ].map((s) => (
              <div key={s.skill} className="flex-1 rounded-lg bg-brand-50 px-2 py-1.5 dark:bg-brand-900/20">
                <p className="text-[10px] font-semibold text-brand-600 dark:text-brand-300">{s.skill}</p>
                <p className="text-sm font-bold text-brand-700 dark:text-brand-200">{s.score}<span className="text-[10px] font-normal text-brand-500">/100</span></p>
              </div>
            ))}
          </div>
        </div>
      ),
      label: 'AI Verified',
      accent: 'bg-brand-50 dark:bg-brand-900/15',
      dot: 'bg-brand-500',
    },
    {
      id: 'contract',
      delay: 0.33,
      content: (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-100 dark:bg-accent-900/30">
            <CheckCircle2 size={16} className="text-accent-600 dark:text-accent-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink-900 dark:text-ink-dark-text">Contract Active</p>
            <p className="text-xs text-ink-500 dark:text-ink-dark-muted">280 EGP in escrow · Day 2 of 5</p>
          </div>
          <Badge variant="success" className="text-[10px] shrink-0">Live</Badge>
        </div>
      ),
      label: 'Contract',
      accent: 'bg-accent-50 dark:bg-accent-900/10',
      dot: 'bg-accent-500',
    },
  ];

  return (
    <div className="relative">
      {/* Ambient glow behind card */}
      <div
        className="pointer-events-none absolute -inset-6 rounded-3xl opacity-30 blur-2xl dark:opacity-20"
        style={{ background: 'radial-gradient(circle, rgb(59 130 246 / 0.25) 0%, transparent 70%)' }}
      />
      <Card className="relative w-full max-w-sm overflow-hidden border-ink-200 bg-white shadow-elevated dark:border-ink-dark-border dark:bg-ink-dark-surface">
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-ink-100 px-4 py-3 dark:border-ink-dark-border">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-accent-400" />
          </div>
          <span className="mx-auto text-xs font-medium text-ink-400 dark:text-ink-dark-muted">shaghalny.app</span>
        </div>

        {/* Workflow items */}
        <div className="divide-y divide-ink-100 dark:divide-ink-dark-border">
          {items.map((item) => (
            <motion.div
              key={item.id}
              initial={shouldReduce ? false : { opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, ease: EASE_OUT, delay: item.delay }}
              className={`px-4 py-3 ${item.accent}`}
            >
              <div className="mb-1.5 flex items-center gap-1.5">
                <span className={`h-1.5 w-1.5 rounded-full ${item.dot}`} />
                <span className="text-[10px] font-semibold uppercase tracking-widest text-ink-400 dark:text-ink-dark-muted">
                  {item.label}
                </span>
              </div>
              {item.content}
            </motion.div>
          ))}
        </div>
      </Card>
    </div>
  );
};

// ── Feature cards data ─────────────────────────────────────────────────────────

const features = [
  {
    icon: GraduationCap,
    title: 'Built for student talent',
    description: 'A marketplace where early-career work gets structure: verified profiles, clear proposals, and contracts that hold.',
    accent: 'bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400',
  },
  {
    icon: Video,
    title: 'AI verification with Gravis',
    description: 'Students complete structured interviews before proposals move forward. Clients see evidence, not claims.',
    accent: 'bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400',
  },
  {
    icon: CreditCard,
    title: 'End-to-end workflow',
    description: 'Jobs, proposals, contracts, and wallet top-ups stay connected. Nothing lives in a separate tool.',
    accent: 'bg-accent-50 text-accent-600 dark:bg-accent-900/30 dark:text-accent-400',
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
    accent: 'from-brand-50 to-sky-50 dark:from-brand-900/20 dark:to-sky-900/20',
    iconAccent: 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300',
  },
  {
    icon: BriefcaseBusiness,
    label: 'Clients',
    heading: 'Hire with fewer trust gaps.',
    body: 'Post roles, review proposals ranked by verified skill scores, and move straight to contracts without the usual back-and-forth.',
    cta: 'Post your first job',
    to: '/register',
    accent: 'from-accent-50 to-emerald-50 dark:from-accent-900/20 dark:to-emerald-900/20',
    iconAccent: 'bg-accent-100 text-accent-700 dark:bg-accent-900/40 dark:text-accent-300',
  },
];

const steps = [
  {
    n: '01',
    title: 'Create a profile',
    body: 'Students list their skills, experience, and portfolio. Clients set up their hiring workspace.',
    icon: FileText,
  },
  {
    n: '02',
    title: 'Verify capability',
    body: 'Gravis runs a structured AI interview. Scores are attached to the profile before any proposal is sent.',
    icon: BadgeCheck,
  },
  {
    n: '03',
    title: 'Review and shortlist',
    body: 'Clients compare budgets, verified skill data, and proposal history in one view.',
    icon: Star,
  },
  {
    n: '04',
    title: 'Close confidently',
    body: 'Contracts and wallet flows carry the deal through delivery without leaving the platform.',
    icon: CheckCircle2,
  },
];

const aiPoints = [
  'Structured question sets per skill',
  'Scores attached to the profile',
  'Visible before clients review proposals',
];

// ── Main Component ─────────────────────────────────────────────────────────────

const LandingPage: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const [theme, setThemeState] = useState<'light' | 'dark'>(getTheme());
  const dashboardPath = user ? dashboardPathByRole[user.role as keyof typeof dashboardPathByRole] : null;
  const ctaPath = isAuthenticated && dashboardPath ? dashboardPath : '/register';
  const ctaLabel = isAuthenticated ? 'Go to workspace' : 'Create account';
  const shouldReduce = useReducedMotion();

  const featuresSection = useScrollInView('-80px');
  const rolesSection = useScrollInView('-80px');
  const stepsSection = useScrollInView('-80px');

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setThemeState(next);
    setTheme(next);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-ink-dark-bg">
      {/* ── Nav ── */}
      <header className="sticky top-0 z-20 border-b border-ink-100 bg-white/95 backdrop-blur-sm dark:border-ink-dark-border dark:bg-ink-dark-bg/95">
        <div className="page-container flex h-16 items-center justify-between gap-4">
          <Link to="/" className="flex items-center text-ink-900 no-underline dark:text-ink-dark-text">
            <img src={wordmark} alt="Shaghalny" className="h-8 w-auto object-contain dark:brightness-[1.08] dark:contrast-[0.98]" />
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </Button>
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
      <section
        className="relative overflow-hidden text-ink-950 dark:text-white"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% -10%, #dbeafe 0%, #eff6ff 30%, #ffffff 70%)',
        }}
      >
        {/* Dark mode gradient */}
        <div className="pointer-events-none absolute inset-0 hidden dark:block"
          style={{ background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgb(30 58 138 / 0.2) 0%, #0b0a14 60%)' }}
        />

        <div className="page-container relative py-20 sm:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-[1fr_auto] lg:gap-16">
            {/* Left: text */}
            <div className="mx-auto max-w-2xl space-y-7 text-center lg:mx-0 lg:text-left">
              <motion.div
                custom={0}
                variants={fadeIn}
                initial="hidden"
                animate="visible"
                className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-600 dark:border-white/20 dark:bg-white/10 dark:text-brand-200"
              >
                <Sparkles size={12} />
                Student freelancing marketplace
              </motion.div>

              <motion.h1
                custom={0.1}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                className="text-balance text-5xl font-semibold leading-tight text-ink-950 dark:text-white sm:text-6xl"
              >
                Hire verified student talent.{' '}
                <span className="bg-gradient-to-r from-brand-500 to-sky-500 bg-clip-text text-transparent">
                  Without the trust gap.
                </span>
              </motion.h1>

              <motion.p
                custom={0.2}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                className="max-w-xl text-lg leading-7 text-ink-600 dark:text-ink-300 lg:max-w-none"
              >
                Shaghalny connects clients with early-career freelancers who have completed structured AI interviews.
                Real verification, clean workflows, one platform.
              </motion.p>

              <motion.div
                custom={0.3}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                className="flex flex-wrap items-center justify-center gap-3 lg:justify-start"
              >
                <motion.div whileTap={shouldReduce ? {} : { scale: 0.97 }} transition={{ duration: 0.1 }}>
                  <Button asChild size="xl">
                    <Link to={ctaPath}>
                      {ctaLabel}
                      <ArrowRight size={18} />
                    </Link>
                  </Button>
                </motion.div>
                <motion.div whileTap={shouldReduce ? {} : { scale: 0.97 }} transition={{ duration: 0.1 }}>
                  <Link
                    to="/login"
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-ink-200 bg-white px-6 text-base font-semibold text-ink-900 transition-colors duration-150 hover:border-brand-300 hover:bg-brand-50 active:scale-[0.97] dark:border-white/25 dark:bg-white/10 dark:text-white dark:hover:border-white/40 dark:hover:bg-white/20"
                  >
                    Sign in
                  </Link>
                </motion.div>
              </motion.div>

              {/* Mini trust stats */}
              <motion.div
                custom={0.4}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                className="flex flex-wrap items-center justify-center gap-6 pt-2 lg:justify-start"
              >
                {[
                  { icon: BadgeCheck, label: 'AI-verified profiles' },
                  { icon: ShieldCheck, label: 'Structured contracts' },
                  { icon: Zap, label: 'One platform, end-to-end' },
                ].map(({ icon: Icon, label }) => (
                  <span key={label} className="flex items-center gap-1.5 text-sm text-ink-500 dark:text-ink-400">
                    <Icon size={15} className="text-brand-500" />
                    {label}
                  </span>
                ))}
              </motion.div>
            </div>

            {/* Right: product preview */}
            <motion.div
              initial={shouldReduce ? false : { opacity: 0, x: 32 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.35 }}
              className="mx-auto lg:mx-0"
            >
              <ProductPreview />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section ref={featuresSection.ref} className="bg-ink-50 dark:bg-ink-dark-surface">
        <div className="page-container py-20">
          <motion.div
            variants={fadeUp}
            custom={0}
            initial="hidden"
            animate={featuresSection.inView ? 'visible' : 'hidden'}
            className="mb-12 text-center"
          >
            <p className="page-eyebrow mb-3">Platform</p>
            <h2 className="text-3xl font-semibold text-ink-900 dark:text-ink-dark-text sm:text-4xl">
              What makes Shaghalny different
            </h2>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-3">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                variants={fadeIn}
                custom={i * 0.08}
                initial="hidden"
                animate={featuresSection.inView ? 'visible' : 'hidden'}
                whileHover={shouldReduce ? {} : { y: -4, transition: { duration: 0.2, ease: EASE_OUT } }}
                className="group cursor-default rounded-xl border border-ink-200 bg-white p-6 shadow-soft transition-shadow duration-200 hover:shadow-card dark:border-ink-dark-border dark:bg-ink-dark-bg"
              >
                <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-lg ${f.accent}`}>
                  <f.icon size={20} />
                </div>
                <h3 className="mb-2 text-base font-semibold text-ink-900 dark:text-ink-dark-text">{f.title}</h3>
                <p className="text-sm leading-6 text-ink-500 dark:text-ink-dark-muted">{f.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Roles ── */}
      <section ref={rolesSection.ref} className="bg-white dark:bg-ink-dark-bg">
        <div className="page-container py-20">
          <motion.div
            variants={fadeUp}
            custom={0}
            initial="hidden"
            animate={rolesSection.inView ? 'visible' : 'hidden'}
            className="mb-12 text-center"
          >
            <p className="page-eyebrow mb-3">For every role</p>
            <h2 className="text-3xl font-semibold text-ink-900 dark:text-ink-dark-text sm:text-4xl">
              One platform, two sides of hiring
            </h2>
          </motion.div>

          <div className="grid gap-6 lg:grid-cols-2">
            {roles.map((role, i) => (
              <motion.div
                key={role.label}
                variants={fadeIn}
                custom={i * 0.1}
                initial="hidden"
                animate={rolesSection.inView ? 'visible' : 'hidden'}
                whileHover={shouldReduce ? {} : { y: -4, transition: { duration: 0.2, ease: EASE_OUT } }}
                className={`flex flex-col justify-between gap-8 rounded-xl border border-ink-200 bg-gradient-to-br p-8 transition-shadow duration-200 hover:shadow-card dark:border-ink-dark-border ${role.accent}`}
              >
                <div className="space-y-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${role.iconAccent}`}>
                    <role.icon size={20} />
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-ink-400 dark:text-ink-dark-muted">
                      {role.label}
                    </p>
                    <h3 className="mb-3 text-2xl font-semibold text-ink-900 dark:text-ink-dark-text">
                      {role.heading}
                    </h3>
                    <p className="text-sm leading-6 text-ink-600 dark:text-ink-dark-muted">{role.body}</p>
                  </div>
                </div>
                <Button asChild variant="outline" size="sm" className="w-fit bg-white/80 dark:bg-ink-dark-bg/60">
                  <Link to={role.to}>{role.cta}</Link>
                </Button>
              </motion.div>
            ))}
          </div>

          <motion.div
            variants={fadeIn}
            custom={0.2}
            initial="hidden"
            animate={rolesSection.inView ? 'visible' : 'hidden'}
            className="mt-6 rounded-xl border border-ink-200 p-8 dark:border-ink-dark-border"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-50 text-accent-600 dark:bg-accent-900/30 dark:text-accent-400">
                <ShieldCheck size={20} />
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-ink-400 dark:text-ink-dark-muted">
                  Admins
                </p>
                <h3 className="mb-2 text-xl font-semibold text-ink-900 dark:text-ink-dark-text">
                  Manage the whole marketplace from one control center.
                </h3>
                <p className="text-sm leading-6 text-ink-500 dark:text-ink-dark-muted">
                  Review payment approvals, manage events, and oversee verification status without switching tools.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section
        ref={stepsSection.ref}
        className="border-y border-ink-100 bg-ink-50 dark:border-ink-dark-border dark:bg-ink-dark-surface"
      >
        <div className="page-container py-20">
          <motion.div
            variants={fadeUp}
            custom={0}
            initial="hidden"
            animate={stepsSection.inView ? 'visible' : 'hidden'}
            className="mb-12"
          >
            <p className="page-eyebrow mb-3">How it works</p>
            <h2 className="text-3xl font-semibold text-ink-900 dark:text-ink-dark-text sm:text-4xl">
              Structured hiring, start to finish.
            </h2>
          </motion.div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, i) => (
              <motion.div
                key={step.n}
                variants={fadeIn}
                custom={i * 0.08}
                initial="hidden"
                animate={stepsSection.inView ? 'visible' : 'hidden'}
                className="rounded-xl border border-ink-200 bg-white p-6 dark:border-ink-dark-border dark:bg-ink-dark-bg"
              >
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-3xl font-bold text-brand-200 dark:text-brand-800">{step.n}</p>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-50 text-ink-400 dark:bg-ink-dark-surface dark:text-ink-500">
                    <step.icon size={15} />
                  </div>
                </div>
                <h3 className="mb-2 text-sm font-semibold text-ink-900 dark:text-ink-dark-text">{step.title}</h3>
                <p className="text-sm leading-5 text-ink-500 dark:text-ink-dark-muted">{step.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI Section ── */}
      <section className="relative overflow-hidden bg-brand-700 text-white">
        {/* Subtle pattern overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'radial-gradient(circle at 20% 50%, rgb(96 165 250 / 0.55) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgb(37 99 235 / 0.45) 0%, transparent 40%)',
          }}
        />
        <div className="page-container relative py-20">
          <div className="grid gap-12 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-100">
                <BadgeCheck size={12} />
                Gravis AI verification
              </div>
              <h2 className="text-3xl font-semibold text-white sm:text-4xl">
                Skills that are proven, not promised.
              </h2>
              <p className="max-w-xl text-base leading-7 text-brand-100">
                Every student on Shaghalny has completed a structured AI interview with Gravis before their proposals
                reach clients. No unverified claims, no noise in your candidate shortlist.
              </p>
              <div className="flex flex-col gap-3 pt-1">
                {aiPoints.map((point, i) => (
                  <div key={point} className="flex items-center gap-3 text-sm text-white">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20">
                      <CheckCircle2 size={12} className="text-brand-100" />
                    </div>
                    {point}
                  </div>
                ))}
              </div>
            </div>

            {/* AI score card */}
            <div className="hidden lg:block">
              <div className="w-64 rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur-sm">
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
                    <Zap size={16} className="text-brand-100" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-brand-100">Gravis Score</p>
                    <p className="text-[10px] text-brand-200">AI-powered assessment</p>
                  </div>
                </div>
                <Separator className="mb-4 bg-white/20" />
                {[
                  { skill: 'React.js', score: 94, bar: 94 },
                  { skill: 'TypeScript', score: 88, bar: 88 },
                  { skill: 'CSS / Tailwind', score: 91, bar: 91 },
                ].map((s) => (
                  <div key={s.skill} className="mb-3 last:mb-0">
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-brand-100">{s.skill}</span>
                      <span className="font-bold text-white">{s.score}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/20">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${s.bar}%` }}
                        transition={{ duration: 0.8, ease: EASE_IN_OUT, delay: 0.6 + s.bar * 0.002 }}
                        className="h-full rounded-full bg-white"
                      />
                    </div>
                  </div>
                ))}
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-white/15 px-3 py-2">
                  <BadgeCheck size={14} className="text-accent-300" />
                  <span className="text-xs font-semibold text-white">Verified — Ready to hire</span>
                </div>
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
              <motion.div whileTap={shouldReduce ? {} : { scale: 0.97 }} transition={{ duration: 0.1 }}>
                <Button asChild size="lg">
                  <Link to={ctaPath}>
                    {ctaLabel}
                    <ArrowRight size={18} />
                  </Link>
                </Button>
              </motion.div>
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
            <img src={wordmark} alt="Shaghalny" className="h-6 w-auto object-contain opacity-90 dark:brightness-[1.06]" />
            <p>© {new Date().getFullYear()} Verified student talent.</p>
          </div>
          <div className="flex items-center gap-5">
            <Link to="/login" className="hover:text-ink-600 dark:hover:text-ink-dark-text">
              Sign in
            </Link>
            <Link to="/register" className="hover:text-ink-600 dark:hover:text-ink-dark-text">
              Create account
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
