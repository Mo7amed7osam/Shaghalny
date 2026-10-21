import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, BadgeCheck, Eye, EyeOff, Loader2, ShieldCheck, Sparkles, Video } from 'lucide-react';
import { toast } from 'sonner';

import { Logo } from '@/components/brand/Logo';
import useAuth from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const highlights = [
  { icon: BadgeCheck, text: 'Verified student talent and trusted profiles' },
  { icon: Video, text: 'AI interview verification with Shaghalny AI' },
  { icon: ShieldCheck, text: 'Structured proposals, contracts, and payments' },
];

const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (values: LoginFormValues) => {
    try {
      const user = await login(values.email, values.password);
      toast.success('Welcome back!');
      if (user?.role === 'Admin') navigate('/admin/dashboard');
      else if (user?.role === 'Client') navigate('/client/dashboard');
      else navigate('/student/dashboard');
    } catch {
      toast.error('Invalid email or password');
    }
  };

  return (
    <div className="flex min-h-screen bg-ink-50 dark:bg-ink-dark-bg">
      {/* Left: brand panel */}
      <div className="relative hidden w-[42%] shrink-0 flex-col justify-between overflow-hidden bg-brand-700 p-8 lg:flex">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_22%_8%,rgba(255,255,255,0.22),transparent_23rem),linear-gradient(180deg,rgba(255,255,255,0.08),transparent_48%)]" />
        <div className="pointer-events-none absolute inset-x-10 top-24 h-px bg-white/18" />
        <Link to="/" className="relative flex items-center text-white no-underline" aria-label="Shaghalny home">
          <Logo tone="inverted" />
        </Link>

        <div className="relative space-y-5">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-100">
              <Sparkles size={12} />
              Student marketplace
            </div>
            <h2 className="text-balance text-3xl font-semibold text-white">
              Freelancing infrastructure built for students.
            </h2>
            <p className="text-sm leading-6 text-brand-100">
              Manage proposals, verified interviews, contracts, and hiring workflows from one workspace.
            </p>
          </div>

          <div className="space-y-2.5">
            {highlights.map((item) => (
              <div key={item.text} className="flex items-center gap-3 rounded-2xl border border-white/18 bg-white/[0.12] px-3 py-2.5 shadow-[0_1px_0_rgba(255,255,255,0.12)_inset] backdrop-blur">
                <item.icon size={16} className="shrink-0 text-brand-100" />
                <p className="text-sm text-white">{item.text}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-brand-200">© {new Date().getFullYear()} Shaghalny</p>
      </div>

      {/* Right: form */}
      <main id="main-content" tabIndex={-1} className="flex flex-1 items-center justify-center px-4 py-8 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-6 lg:hidden">
            <Link to="/" className="flex items-center text-ink-900 no-underline dark:text-ink-dark-text" aria-label="Shaghalny home">
              <Logo />
            </Link>
          </div>

          <Card className="border-white/80 bg-white/90 shadow-elevated">
            <CardHeader>
              <div className="page-eyebrow mb-1">Sign in</div>
              <h1 className="text-2xl font-semibold">Welcome back</h1>
              <CardDescription>
                Access your proposals, interviews, and contracts.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
              <form className="space-y-4" noValidate aria-busy={isSubmitting} onSubmit={handleSubmit(onSubmit)}>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" aria-invalid={!!errors.email} aria-describedby={errors.email ? "email-error" : undefined} type="email" placeholder="you@example.com" autoComplete="email"  {...register('email')} />
                  {errors.email ? <p id="email-error" role="alert" className="text-xs text-rose-600 dark:text-rose-400">{errors.email.message}</p> : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password" aria-invalid={!!errors.password} aria-describedby={errors.password ? "password-error" : undefined}
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      className="pr-14"
                      autoComplete="current-password"

                      {...register('password')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-ink-600 dark:text-ink-300"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                        aria-pressed={showPassword}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.password ? <p id="password-error" role="alert" className="text-xs text-rose-600 dark:text-rose-400">{errors.password.message}</p> : null}
                </div>

                <Button type="submit" size="lg" disabled={isSubmitting} className="w-full">
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : null}
                  {isSubmitting ? 'Signing in...' : 'Sign in'}
                  {!isSubmitting ? <ArrowRight size={16} /> : null}
                </Button>
              </form>

              <div className="rounded-xl border border-ink-100 bg-ink-50/80 px-4 py-3 dark:border-white/10 dark:bg-white/5">
                <p className="text-xs text-ink-500 dark:text-ink-dark-muted">
                  New to the platform?{' '}
                  <Link className="font-semibold text-brand-600 dark:text-brand-400" to="/register">
                    Create an account
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Login;
