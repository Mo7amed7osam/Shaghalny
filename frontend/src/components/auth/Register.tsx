import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, BriefcaseBusiness, GraduationCap, Shield, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import logo from '@/assets/shaghalny-logo-premium.svg';
import useAuth from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
      const user = await registerUser(values);
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
      <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <Link to="/" className="flex items-center gap-2.5 text-ink-900 no-underline dark:text-ink-dark-text">
              <img src={logo} alt="Shaghalny" className="h-8 w-8 rounded-lg object-contain" />
              <span className="text-sm font-semibold">Shaghalny</span>
            </Link>
          </div>

          <Card>
            <CardHeader>
              <div className="page-eyebrow mb-1">Create account</div>
              <CardTitle className="text-2xl">Join Shaghalny</CardTitle>
              <CardDescription>
                Create a student or client account. Your dashboard adapts to your role.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
              <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
                <div className="space-y-1.5">
                  <Label htmlFor="name">Full name</Label>
                  <Input id="name" placeholder="Alex Johnson" {...register('name')} />
                  {errors.name ? <p className="text-xs text-rose-600 dark:text-rose-400">{errors.name.message}</p> : null}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="alex@example.com" {...register('email')} />
                  {errors.email ? <p className="text-xs text-rose-600 dark:text-rose-400">{errors.email.message}</p> : null}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" type="password" placeholder="Choose a password" {...register('password')} />
                    {errors.password ? <p className="text-xs text-rose-600 dark:text-rose-400">{errors.password.message}</p> : null}
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
      </div>

      {/* Right: feature panel */}
      <div className="hidden w-[42%] shrink-0 flex-col justify-between bg-ink-950 p-10 lg:flex">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-ink-300">
          <Sparkles size={12} />
          Why Shaghalny
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <h2 className="text-balance text-4xl font-semibold text-white">
              A cleaner path from student potential to paid work.
            </h2>
            <p className="text-base leading-7 text-ink-200">
              Students can prove capability, and clients can hire with clearer signals. No guessing on either side.
            </p>
          </div>
          <div className="space-y-3">
            {roleCards.map((item) => (
              <div key={item.title} className="flex items-start gap-3 rounded-lg border border-white/15 bg-white/10 px-4 py-3">
                <item.icon size={16} className="mt-0.5 shrink-0 text-brand-300" />
                <div>
                  <p className="text-sm font-semibold text-white">{item.title}</p>
                  <p className="mt-0.5 text-xs leading-5 text-ink-300">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-ink-400">© {new Date().getFullYear()} Shaghalny</p>
      </div>
    </div>
  );
};

export default Register;
