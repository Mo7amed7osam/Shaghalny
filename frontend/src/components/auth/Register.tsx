import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, BriefcaseBusiness, Eye, EyeOff, GraduationCap, Shield, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import { Logo } from '@/components/brand/Logo';
import useAuth from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';

const registerSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['Student', 'Client']),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

const roleCards = [
  {
    icon: GraduationCap,
    title: 'Students',
    body: 'Show verified skills, apply to roles, and manage contracts in one place.',
  },
  {
    icon: BriefcaseBusiness,
    title: 'Clients',
    body: 'Post jobs, review proposals, and shortlist verified student talent faster.',
  },
  {
    icon: Shield,
    title: 'Trusted workflow',
    body: 'Verification, contracts, and payment steps stay structured from the start.',
  },
];

const Register: React.FC = () => {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: 'Student' },
  });

  const onSubmit = async (values: RegisterFormValues) => {
    try {
      const user = await registerUser(values as { name: string; email: string; password: string; role: string });
      toast.success('Account created successfully');
      if (user?.role === 'Client') navigate('/client/dashboard');
      else navigate('/student/dashboard');
    } catch {
      toast.error('Registration failed. Please try again.');
    }
  };

  return (
    <div className="flex min-h-screen bg-ink-50 dark:bg-ink-dark-bg">
      {/* Left: form */}
      <main id="main-content" tabIndex={-1} className="flex flex-1 items-center justify-center px-4 py-8 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-6">
            <Link to="/" className="flex items-center text-ink-900 no-underline dark:text-ink-dark-text">
              <Logo />
            </Link>
          </div>

          <Card>
            <CardHeader>
              <div className="page-eyebrow mb-1">Create account</div>
              <h1 className="text-2xl font-semibold">Join Shaghalny</h1>
              <CardDescription>
                Create a student or client account. Your dashboard adapts to your role.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
              <form className="space-y-3" noValidate aria-busy={isSubmitting} onSubmit={handleSubmit(onSubmit)}>
                <div className="space-y-1.5">
                  <Label htmlFor="name">Full name</Label>
                  <Input id="name" autoComplete="name" aria-invalid={!!errors.name} aria-describedby={errors.name ? "name-error" : undefined} placeholder="Full name" {...register('name')} />
                  {errors.name ? <p id="name-error" role="alert" className="text-xs text-rose-600 dark:text-rose-400">{errors.name.message}</p> : null}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" autoComplete="email" aria-invalid={!!errors.email} aria-describedby={errors.email ? "email-error" : undefined} type="email" placeholder="name@example.com" {...register('email')} />
                  {errors.email ? <p id="email-error" role="alert" className="text-xs text-rose-600 dark:text-rose-400">{errors.email.message}</p> : null}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                        id="password" autoComplete="new-password" aria-invalid={!!errors.password} aria-describedby={errors.password ? "password-error" : undefined}
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Choose a password"
                        className="pr-14"
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

                  <div className="space-y-1.5">
                    <Label htmlFor="role">Role</Label>
                    <Select id="role" {...register('role')}>
                      <option value="Student">Student</option>
                      <option value="Client">Client</option>
                    </Select>
                  </div>
                </div>

                <Button className="w-full" size="lg" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating account...' : 'Create account'}
                  {!isSubmitting ? <ArrowRight size={16} /> : null}
                </Button>
              </form>

              <div className="rounded-lg border border-ink-100 bg-ink-50 px-4 py-3 dark:border-ink-dark-border dark:bg-white/5">
                <p className="text-xs text-ink-500 dark:text-ink-dark-muted">
                  Already have an account?{' '}
                  <Link className="font-semibold text-brand-600 dark:text-brand-400" to="/login">
                    Sign in
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Right: feature panel */}
      <div className="hidden w-[42%] shrink-0 flex-col justify-between bg-[radial-gradient(circle_at_top,_#eef5ff_0%,_#f6f9ff_45%,_#ffffff_100%)] p-8 text-ink-950 lg:flex dark:bg-none dark:bg-ink-dark-surface dark:text-white">
        <div className="inline-flex self-start items-center gap-2 rounded-full border border-brand-200 bg-white/85 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-500 dark:border-white/20 dark:bg-white/10 dark:text-ink-300">
          <Sparkles size={12} />
          Why Shaghalny
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <h2 className="text-balance text-3xl font-semibold text-ink-950 dark:text-white">
              A cleaner path from student potential to paid work.
            </h2>
            <p className="text-sm leading-6 text-ink-600 dark:text-ink-200">
              Students can prove capability, and clients can hire with clearer signals. No guessing on either side.
            </p>
          </div>
          <div className="space-y-3">
            {roleCards.map((item) => (
              <div key={item.title} className="flex items-start gap-3 rounded-xl border border-ink-200 bg-white/90 px-3 py-2.5 shadow-soft dark:border-white/15 dark:bg-white/10 dark:shadow-none">
                <item.icon size={16} className="mt-0.5 shrink-0 text-brand-500 dark:text-brand-300" />
                <div>
                  <p className="text-sm font-semibold text-ink-950 dark:text-white">{item.title}</p>
                  <p className="mt-0.5 text-xs leading-5 text-ink-600 dark:text-ink-300">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-ink-500 dark:text-ink-400">© {new Date().getFullYear()} Shaghalny</p>
      </div>
    </div>
  );
};

export default Register;
