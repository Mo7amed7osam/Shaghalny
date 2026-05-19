import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, BadgeCheck, Eye, EyeOff, ShieldCheck, Sparkles, Video } from 'lucide-react';
import { toast } from 'sonner';

import wordmark from '@/assets/shaghalny-wordmark.svg';
import useAuth from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const highlights = [
  { icon: BadgeCheck, text: 'Verified student talent and trusted profiles' },
  { icon: Video, text: 'AI interview verification with Gravis' },
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
      <div className="hidden w-[42%] shrink-0 flex-col justify-between bg-brand-700 p-10 lg:flex">
        <Link to="/" className="flex items-center text-white no-underline">
          <img src={wordmark} alt="Shaghalny" className="h-8 w-auto object-contain brightness-0 invert" />
        </Link>

        <div className="space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-100">
              <Sparkles size={12} />
              Student marketplace
            </div>
            <h1 className="text-balance text-4xl font-semibold text-white">
              Freelancing infrastructure built for students.
            </h1>
            <p className="text-base leading-7 text-brand-100">
              Manage proposals, verified interviews, contracts, and hiring workflows from one workspace.
            </p>
          </div>

          <div className="space-y-3">
            {highlights.map((item) => (
              <div key={item.text} className="flex items-center gap-3 rounded-lg border border-white/20 bg-white/15 px-4 py-3">
                <item.icon size={16} className="shrink-0 text-brand-200" />
                <p className="text-sm text-white">{item.text}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-brand-200">© {new Date().getFullYear()} Shaghalny</p>
      </div>

      {/* Right: form */}
      <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Link to="/" className="flex items-center text-ink-900 no-underline dark:text-ink-dark-text">
              <img src={wordmark} alt="Shaghalny" className="h-8 w-auto object-contain dark:brightness-[1.08] dark:contrast-[0.98]" />
            </Link>
          </div>

          <Card>
            <CardHeader>
              <div className="page-eyebrow mb-1">Sign in</div>
              <CardTitle className="text-2xl">Welcome back</CardTitle>
              <CardDescription>
                Access your proposals, interviews, and contracts.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
              <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="you@example.com" {...register('email')} />
                  {errors.email ? <p className="text-xs text-rose-600 dark:text-rose-400">{errors.email.message}</p> : null}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      className="pr-10"
                      {...register('password')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600 dark:text-ink-dark-muted dark:hover:text-white"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.password ? <p className="text-xs text-rose-600 dark:text-rose-400">{errors.password.message}</p> : null}
                </div>

                <Button type="submit" size="lg" disabled={isSubmitting} className="w-full">
                  {isSubmitting ? 'Signing in...' : 'Sign in'}
                  {!isSubmitting ? <ArrowRight size={16} /> : null}
                </Button>
              </form>

              <div className="rounded-lg border border-ink-100 bg-ink-50 px-4 py-3 dark:border-ink-dark-border dark:bg-white/5">
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
      </div>
    </div>
  );
};

export default Login;
