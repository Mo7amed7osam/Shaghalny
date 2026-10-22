import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, Briefcase, Eye, EyeOff, GraduationCap, Loader2, Lock, Mail, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

import useAuth from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { AuthShell, authButtonClass, authInputClass } from './AuthShell';
import { useI18n } from '@/lib/i18n';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

// Presentation shortcuts fill the email only; passwords are always typed.
const demoAccounts = import.meta.env.VITE_DEMO_MODE === 'true'
  ? [
      { label: 'Student', email: 'student@shaghalny.test', icon: GraduationCap },
      { label: 'Client', email: 'client@shaghalny.test', icon: Briefcase },
      { label: 'Admin', email: 'admin@shaghalny.test', icon: ShieldCheck },
    ]
  : [];

const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    setFocus,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });
  const currentEmail = watch('email');

  const onSubmit = async (values: LoginFormValues) => {
    try {
      const user = await login(values.email, values.password);
      toast.success(t('Welcome back!'));
      if (user?.role === 'Admin') navigate('/admin/dashboard');
      else if (user?.role === 'Client') navigate('/client/dashboard');
      else navigate('/student/dashboard');
    } catch {
      toast.error(t('Invalid email or password'));
    }
  };

  const pickDemoAccount = (email: string) => {
    setValue('email', email, { shouldValidate: true });
    setFocus('password');
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to continue to your workspace"
      footer={<>{t('New to Shaghalny?')} <Link className="font-semibold text-brand-600 hover:underline dark:text-brand-300" to="/register">{t('Create an account')}</Link></>}
    >
      {demoAccounts.length ? (
        <div className="mb-6 flex rounded-2xl border border-ink-200/70 bg-white/50 p-1 dark:border-white/10 dark:bg-white/[0.04]" role="group" aria-label={t('Demo accounts')}>
          {demoAccounts.map((account) => {
            const active = currentEmail === account.email;
            return (
              <button
                key={account.label}
                type="button"
                onClick={() => pickDemoAccount(account.email)}
                aria-pressed={active}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
                  active
                    ? 'bg-white text-brand-700 shadow-sm dark:bg-white/15 dark:text-white'
                    : 'text-ink-500 hover:text-ink-800 dark:text-ink-300 dark:hover:text-white'
                )}
              >
                <account.icon size={14} />
                {t(account.label)}
              </button>
            );
          })}
        </div>
      ) : null}

      <form className="space-y-4" noValidate aria-busy={isSubmitting} onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-1.5">
          <Label htmlFor="email" className="sr-only">{t('Email')}</Label>
          <div className="relative">
            <Mail size={17} className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-ink-400" aria-hidden="true" />
            <Input
              id="email"
              type="email"
              placeholder={t('Email address')}
              autoComplete="email"
              className={authInputClass}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'email-error' : undefined}
              {...register('email')}
            />
          </div>
          {errors.email ? <p id="email-error" role="alert" className="ps-1 text-xs text-rose-600 dark:text-rose-400">{t(errors.email.message || '')}</p> : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password" className="sr-only">{t('Password')}</Label>
          <div className="relative">
            <Lock size={17} className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-ink-400" aria-hidden="true" />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder={t('Password')}
              autoComplete="current-password"
              className={cn(authInputClass, 'pe-12')}
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? 'password-error' : undefined}
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute end-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-ink-400 transition hover:bg-ink-100/70 hover:text-ink-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:hover:bg-white/10 dark:hover:text-white"
              aria-label={t(showPassword ? 'Hide password' : 'Show password')}
              aria-pressed={showPassword}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password ? <p id="password-error" role="alert" className="ps-1 text-xs text-rose-600 dark:text-rose-400">{t(errors.password.message || '')}</p> : null}
        </div>

        <Button type="submit" size="lg" disabled={isSubmitting} className={cn(authButtonClass, 'mt-2')}>
          {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : null}
          {t(isSubmitting ? 'Signing in…' : 'Sign in')}
          {!isSubmitting ? <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" /> : null}
        </Button>
      </form>
    </AuthShell>
  );
};

export default Login;
