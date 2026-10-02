import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, BriefcaseBusiness, Wallet } from 'lucide-react';
import { toast } from 'sonner';

import { getSkills, postJob } from '@/services/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';

const formSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters.'),
  description: z.string().min(20, 'Description should be at least 20 characters.'),
  requiredSkills: z.array(z.string()).min(1, 'Select at least one skill.'),
  minBudget: z.string().optional(),
  maxBudget: z.string().optional(),
    duration: z.string().optional(),
   type: z.enum(['freelance', 'internship']).default('freelance'),
    unpaid: z.boolean().default(false),
  workMode: z.enum(['online', 'onsite', 'hybrid']).optional(),
  positions: z.string().optional(),
});
type FormValues = z.infer<typeof formSchema>;

const PostJob: React.FC = () => {
  const navigate = useNavigate();

  const { data: skills, isLoading } = useQuery({
    queryKey: ['skills'],
    queryFn: getSkills,
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      requiredSkills: [],
      minBudget: '',
      maxBudget: '',
           duration: '',
            type: 'freelance',
      unpaid: false,
      workMode: undefined,
      positions: '1',
    },
  });

  const selectedSkills = watch('requiredSkills');
  const selectedType = watch('type');
       const isInternship = selectedType === 'internship';
  const isUnpaid = watch('unpaid');
    const selectedWorkMode = watch('workMode');
  useEffect(() => {
    register('requiredSkills');
  }, [register]);

    const { mutateAsync: createJob } = useMutation({
    mutationFn: postJob,
    onSuccess: () => {
      toast.success(isInternship ? 'Internship posted successfully.' : 'Job posted successfully.');
      navigate('/client/dashboard');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to post job.');
    },
  });

  const toggleSkill = (skillId: string) => {
    const next = selectedSkills.includes(skillId) ? selectedSkills.filter((id) => id !== skillId) : [...selectedSkills, skillId];
    setValue('requiredSkills', next, { shouldValidate: true });
  };

  const onSubmit = async (values: FormValues) => {
    await createJob({
      title: values.title,
      description: values.description,
      requiredSkills: values.requiredSkills,
               budgetMin: (values.type === 'internship' && values.unpaid) ? undefined : (values.minBudget ? Number(values.minBudget) : undefined),
      budgetMax: (values.type === 'internship' && values.unpaid) ? undefined : (values.maxBudget ? Number(values.maxBudget) : undefined),
            duration: values.duration || undefined,
           type: values.type,
    isUnpaid: values.type === 'internship' && values.unpaid,
      workMode: values.workMode,
      positions: values.type === 'internship' ? (values.positions ? Number(values.positions) : 1) : undefined,
    });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Client workspace"
        title="Post a new job"
        description="Create a brief that looks professional, sets expectations clearly, and attracts stronger student proposals."
      />

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardContent className="space-y-4 p-4">
            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
                          <div className="space-y-2">
                <label className="text-sm font-semibold text-ink-700 dark:text-ink-200">Post type</label>
                <div className="flex gap-2">
                  {(['freelance', 'internship'] as const).map((option) => {
                    const active = selectedType === option;
                    return (
                      <button
                        key={option}
                        type="button"
                                               onClick={() => {
                          setValue('type', option, { shouldValidate: true });
                          if (option === 'freelance') setValue('unpaid', false);
                        }}
                        className={[
                          'flex-1 rounded-xl border px-4 py-2.5 text-sm font-semibold transition',
                          active
                            ? 'border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-400/25 dark:bg-brand-400/10 dark:text-brand-200'
                            : 'border-ink-300 bg-white/90 text-ink-700 hover:border-ink-400 hover:bg-ink-50 dark:border-ink-dark-border dark:bg-white/10 dark:text-ink-200 dark:hover:bg-white/15',
                        ].join(' ')}
                      >
                        {option === 'freelance' ? 'Freelance job' : 'Internship'}
                      </button>
                    );
                  })}
                </div>
              </div>
                            {isInternship ? (
                <label className="flex items-center gap-2 text-sm font-medium text-ink-600 dark:text-ink-300">
                  <input
                    type="checkbox"
                    checked={isUnpaid}
                    onChange={(e) => setValue('unpaid', e.target.checked, { shouldValidate: true })}
                    className="h-4 w-4 rounded border-ink-300"
                  />
                  This is an unpaid internship
                </label>
              ) : null}
                            {isInternship ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-ink-700 dark:text-ink-200">Work mode</label>
                    <div className="flex gap-2">
                      {(['online', 'onsite', 'hybrid'] as const).map((mode) => {
                        const active = selectedWorkMode === mode;
                        return (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => setValue('workMode', active ? undefined : mode, { shouldValidate: true })}
                            className={[
                              'flex-1 rounded-xl border px-3 py-2 text-sm font-semibold transition',
                              active
                                ? 'border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-400/25 dark:bg-brand-400/10 dark:text-brand-200'
                                : 'border-ink-300 bg-white/90 text-ink-700 hover:border-ink-400 hover:bg-ink-50 dark:border-ink-dark-border dark:bg-white/10 dark:text-ink-200 dark:hover:bg-white/15',
                            ].join(' ')}
                          >
                            {mode === 'onsite' ? 'On-site' : mode === 'online' ? 'Online' : 'Hybrid'}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-ink-700 dark:text-ink-200">Number of positions</label>
                    <Input type="number" min={1} placeholder="e.g. 50" {...register('positions')} />
                  </div>
                </div>
              ) : null}
              <div className="space-y-2">
                                <label className="text-sm font-semibold text-ink-700 dark:text-ink-200">{isInternship ? 'Internship title' : 'Job title'}</label>
                <Input placeholder="UI designer for a student marketplace redesign" {...register('title')} />
                {errors.title ? <p className="text-sm text-rose-600 dark:text-rose-300">{errors.title.message}</p> : null}
              </div>

              <div className="space-y-2">
                                <label className="text-sm font-semibold text-ink-700 dark:text-ink-200">{isInternship ? 'Internship description' : 'Project description'}</label>
                <Textarea rows={6} placeholder="Describe the scope, deliverables, goals, and what a great outcome looks like." {...register('description')} />
                {errors.description ? <p className="text-sm text-rose-600 dark:text-rose-300">{errors.description.message}</p> : null}
              </div>

                            <div className="grid gap-4 md:grid-cols-3">
               {!(isInternship && isUnpaid) ? (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-ink-700 dark:text-ink-200">{isInternship ? 'Min stipend (EGP)' : 'Min budget (EGP)'}</label>
                      <Input type="number" min={0} placeholder="12000" {...register('minBudget')} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-ink-700 dark:text-ink-200">{isInternship ? 'Max stipend (EGP)' : 'Max budget (EGP)'}</label>
                      <Input type="number" min={0} placeholder="22000" {...register('maxBudget')} />
                    </div>
                  </>
                ) : null}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-ink-700 dark:text-ink-200">Duration</label>
                  <Input placeholder="2 weeks" {...register('duration')} />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-semibold text-ink-700 dark:text-ink-200">Required skills</label>
                {isLoading ? (
                  <Skeleton className="h-24 w-full rounded-xl" />
                ) : (skills || []).length === 0 ? (
                  <p className="text-sm text-ink-500 dark:text-ink-300">No skills available. Contact admin to add skills.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {(skills || []).map((skill: any) => {
                      const active = selectedSkills.includes(skill._id);
                      return (
                        <button
                          key={skill._id}
                          type="button"
                          onClick={() => toggleSkill(skill._id)}
                          className={[
                            'rounded-full border px-4 py-2 text-sm font-semibold transition',
                            active
                              ? 'border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-400/25 dark:bg-brand-400/10 dark:text-brand-200'
                              : 'border-ink-300 bg-white/90 text-ink-700 hover:border-ink-400 hover:bg-ink-50 dark:border-ink-dark-border dark:bg-white/10 dark:text-ink-200 dark:hover:bg-white/15',
                          ].join(' ')}
                        >
                          {skill.name}
                        </button>
                      );
                    })}
                  </div>
                )}

                {errors.requiredSkills ? <p className="text-sm text-rose-600 dark:text-rose-300">Select at least one skill.</p> : null}

                {selectedSkills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedSkills.map((id) => {
                      const skill = (skills || []).find((s: any) => s._id === id);
                      return (
                        <Badge key={id} variant="brand">
                          {skill?.name || id}
                        </Badge>
                      );
                    })}
                  </div>
                ) : null}
              </div>

              <Button type="submit" size="lg" disabled={isSubmitting}>
                                {isSubmitting ? 'Publishing...' : isInternship ? 'Publish internship' : 'Publish job'}
                {!isSubmitting ? <ArrowRight size={18} /> : null}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="overflow-hidden bg-ink-950 p-0 text-white dark:bg-ink-950">
            <CardContent className="space-y-3 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/10">
                <BriefcaseBusiness size={20} />
              </div>
              <h2 className="text-2xl font-semibold text-white">What strong job posts do well</h2>
              <ul className="space-y-3 text-sm leading-6 text-white/85">
                <li>Explain the goal, not just the task list.</li>
                <li>Set a clear budget range and timeline up front.</li>
                <li>Ask for the skills that actually determine success.</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-400/10 dark:text-brand-200">
                <Wallet size={20} />
              </div>
              <h2 className="text-2xl font-semibold">Before you publish</h2>
              <p className="text-sm text-ink-500 dark:text-ink-300">
                Students see this brief before they spend time tailoring a proposal. A clearer post usually produces better applications.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PostJob;
