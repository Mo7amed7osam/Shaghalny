import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, BriefcaseBusiness, Eye, EyeOff, GraduationCap, Loader2, Lock, Mail, User } from 'lucide-react';
import { toast } from 'sonner';

import useAuth from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { AuthShell, authButtonClass, authInputClass } from './AuthShell';

const registerSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['Student', 'Client']),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

const roles = [
  { value: 'Student' as const, icon: GraduationCap, title: 'Student', body: 'Find work' },
  { value: 'Client' as const, icon: BriefcaseBusiness, title: 'Client', body: 'Hire talent' },
];

const Register: React.FC = () => {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: 'Student' },
  });
  const role = watch('role');

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

  const field = (
    id: 'name' | 'email',
    Icon: typeof User,
    placeholder: string,
    autoComplete: string,
    type = 'text',
  ) => (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="sr-only">{placeholder}</Label>
      <div className="relative">
        <Icon size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-400" aria-hidden="true" />
        <Input
          id={id}
          type={type}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={authInputClass}
          aria-invalid={!!errors[id]}
          aria-describedby={errors[id] ? `${id}-error` : undefined}
          {...register(id)}
        />
      </div>
      {errors[id] ? <p id={`${id}-error`} role="alert" className="pl-1 text-xs text-rose-600 dark:text-rose-400">{errors[id]?.message}</p> : null}
    </div>
  );

  return (
    <AuthShell
      title="Create your account"
      subtitle="Join as a student or a client"
      footer={<>Already have an account? <Link className="font-semibold text-brand-600 hover:underline dark:text-brand-300" to="/login">Sign in</Link></>}
    >
      <form className="space-y-4" noValidate aria-busy={isSubmitting} onSubmit={handleSubmit(onSubmit)}>
        <fieldset>
          <legend className="sr-only">Account type</legend>
          <div className="grid grid-cols-2 gap-2.5">
            {roles.map((item) => {
              const active = role === item.value;
              return (
                <label
                  key={item.value}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-2xl border p-3 transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-500',
                    active
                      ? 'border-brand-400 bg-white shadow-[0_8px_24px_-12px_rgba(79,70,229,0.6)] dark:border-brand-400/60 dark:bg-white/[0.1]'
                      : 'border-ink-200/80 bg-white/50 hover:border-ink-300 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/20'
                  )}
                >
                  <input type="radio" value={item.value} className="sr-only" {...register('role')} />
                  <span className={cn('flex h-9 w-9 items-center justify-center rounded-xl', active ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-500 dark:bg-white/10 dark:text-ink-300')}>
                    <item.icon size={17} />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-ink-900 dark:text-white">{item.title}</span>
                    <span className="block text-xs text-ink-500 dark:text-ink-dark-muted">{item.body}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        {field('name', User, 'Full name', 'name')}
        {field('email', Mail, 'Email address', 'email', 'email')}

        <div className="space-y-1.5">
          <Label htmlFor="password" className="sr-only">Password</Label>
          <div className="relative">
            <Lock size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-400" aria-hidden="true" />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Password (6+ characters)"
              autoComplete="new-password"
              className={cn(authInputClass, 'pr-12')}
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? 'password-error' : undefined}
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-ink-400 transition hover:bg-ink-100/70 hover:text-ink-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:hover:bg-white/10 dark:hover:text-white"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password ? <p id="password-error" role="alert" className="pl-1 text-xs text-rose-600 dark:text-rose-400">{errors.password.message}</p> : null}
        </div>

        <Button type="submit" size="lg" disabled={isSubmitting} className={cn(authButtonClass, 'mt-2')}>
          {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : null}
          {isSubmitting ? 'Creating account…' : 'Create account'}
          {!isSubmitting ? <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" /> : null}
        </Button>
      </form>
    </AuthShell>
  );
};

export default Register;
