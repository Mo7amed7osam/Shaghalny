import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, BriefcaseBusiness, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { getSkills, getJobDetails, getWalletBalance, postJob, updateJob, type JobBriefDraft } from '@/services/api';
import { AiJobBriefCard } from './AiJobBriefCard';
import { groupSkillsByCategory } from '@/lib/skillCategories';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';

const formSchema = z.object({
    title: z.string().min(3, 'Title must be at least 3 characters.').max(80, 'Title must be at most 80 characters.'),
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
  const [searchParams] = useSearchParams();
  const editJobId = searchParams.get('edit');
  const isEditMode = Boolean(editJobId);
  const queryClient = useQueryClient();

  const { data: walletInfo } = useQuery({ queryKey: ['wallet', 'balance', 'post-job'], queryFn: getWalletBalance });
  const paymentsUnavailable = Boolean(walletInfo) && walletInfo.demoMode !== true && walletInfo.paymentsEnabled !== true;
  const { data: skills, isLoading } = useQuery({
    queryKey: ['skills'],
    queryFn: getSkills,
  });
  const { data: jobToEdit, isLoading: jobLoading } = useQuery({
    queryKey: ['job', editJobId],
    queryFn: () => getJobDetails(editJobId!),
    enabled: isEditMode,
  });
  const {
        register,
    handleSubmit,
    watch,
    setValue,
    reset,
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
    if (!jobToEdit) return;

    const job = jobToEdit.job || jobToEdit;

    reset({
      title: job.title || '',
      description: job.description || '',
      requiredSkills: (job.requiredSkills || []).map(
        (skill: any) =>
          typeof skill === 'string' ? skill : skill._id
      ),
      minBudget:
        job.budgetMin != null ? String(job.budgetMin) : '',
      maxBudget:
        job.budgetMax != null ? String(job.budgetMax) : '',
      duration: job.duration || '',
      type: job.type === 'internship' ? 'internship' : 'freelance',
      unpaid: Boolean(job.isUnpaid),
      workMode: job.workMode || undefined,
      positions: String(job.positions || 1),
    });
  }, [jobToEdit, reset]);
  useEffect(() => {
    register('requiredSkills');
  }, [register]);

      const { mutateAsync: saveJob } = useMutation({
    mutationFn: (payload: any) =>
      isEditMode
        ? updateJob(editJobId!, payload)
        : postJob(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client', 'jobs'] });
      if (isEditMode) {
        queryClient.invalidateQueries({ queryKey: ['job', editJobId] });
      }
      toast.success(
        isEditMode
          ? 'Job updated successfully.'
          : isInternship
            ? 'Internship posted successfully.'
            : 'Job posted successfully.'
      );
      navigate('/client/dashboard');
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message ||
        (isEditMode ? 'Failed to update job.' : 'Failed to post job.')
      );
    },
  });
  const applyDraft = (draft: JobBriefDraft) => {
    const opts = { shouldValidate: true, shouldDirty: true };
    // Without a payment provider only unpaid internships can be posted.
    const type = paymentsUnavailable ? 'internship' : draft.type;
    setValue('title', draft.title, opts);
    setValue('description', draft.description, opts);
    setValue('requiredSkills', draft.skills.map((skill) => String(skill._id)), opts);
    setValue('type', type, opts);
    setValue('unpaid', paymentsUnavailable || (type === 'internship' && draft.budgetMin === null && draft.budgetMax === null), opts);
    setValue('minBudget', draft.budgetMin != null ? String(draft.budgetMin) : '', opts);
    setValue('maxBudget', draft.budgetMax != null ? String(draft.budgetMax) : '', opts);
    setValue('duration', draft.duration, opts);
  };

  const toggleSkill = (skillId: string) => {
    const next = selectedSkills.includes(skillId) ? selectedSkills.filter((id) => id !== skillId) : [...selectedSkills, skillId];
    setValue('requiredSkills', next, { shouldValidate: true });
  };

  const onSubmit = async (values: FormValues) => {
      await saveJob({
      title: values.title,
      description: values.description,
      requiredSkills: values.requiredSkills,
               budgetMin: (values.type === 'internship' && values.unpaid) ? undefined : (values.minBudget ? Number(values.minBudget) : undefined),
      budgetMax: (values.type === 'internship' && values.unpaid) ? undefined : (values.maxBudget ? Number(values.maxBudget) : undefined),
            duration: values.duration || undefined,
           type: values.type,
    isUnpaid: values.type === 'internship' && values.unpaid,
      workMode: values.workMode ?? (isEditMode ? null : undefined),
      positions: values.type === 'internship' ? (values.positions ? Number(values.positions) : 1) : undefined,
    });
  };
  return (
    <div className="space-y-5">
      {isEditMode && jobLoading ? (
        <Skeleton className="h-96 w-full rounded-xl" />
      ) : (
        <>
          <PageHeader
            eyebrow="Client workspace"
            title={isEditMode ? 'Edit job' : 'Post a new job'}
            description="Create a brief that looks professional, sets expectations clearly, and attracts stronger student proposals."
          />
          {paymentsUnavailable ? (
            <p role="status" className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
              Payments are not available yet: no payment provider is configured. Only unpaid internships can be posted until payments are set up.
            </p>
          ) : null}

          {!isEditMode ? <AiJobBriefCard onDraft={applyDraft} /> : null}

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
                <label htmlFor="postjob-job-title" className="text-sm font-semibold text-ink-700 dark:text-ink-200">{isInternship ? 'Internship title' : 'Job title'}</label>
                <Input id="postjob-job-title" placeholder="UI designer for a student marketplace redesign" aria-invalid={!!errors.title} aria-describedby={errors.title ? "job-title-error" : undefined} {...register('title')} />
                {errors.title ? <p id="job-title-error" role="alert" className="text-sm text-rose-600 dark:text-rose-300">{errors.title.message}</p> : null}
              </div>

              <div className="space-y-2">
                <label htmlFor="postjob-project-description" className="text-sm font-semibold text-ink-700 dark:text-ink-200">{isInternship ? 'Internship description' : 'Project description'}</label>
                <Textarea id="postjob-project-description" rows={6} placeholder="Describe the scope, deliverables, goals, and what a great outcome looks like." aria-invalid={!!errors.description} aria-describedby={errors.description ? "job-description-error" : undefined} {...register('description')} />
                {errors.description ? <p id="job-description-error" role="alert" className="text-sm text-rose-600 dark:text-rose-300">{errors.description.message}</p> : null}
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {!(isInternship && isUnpaid) ? (
                  <>
                    <div className="space-y-2">
                      <label htmlFor="postjob-min-budget-egp" className="text-sm font-semibold text-ink-700 dark:text-ink-200">{isInternship ? 'Min stipend (EGP)' : 'Min budget (EGP)'}</label>
                      <Input id="postjob-min-budget-egp" type="number" min={0} placeholder="12000" {...register('minBudget')} />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="postjob-max-budget-egp" className="text-sm font-semibold text-ink-700 dark:text-ink-200">{isInternship ? 'Max stipend (EGP)' : 'Max budget (EGP)'}</label>
                      <Input id="postjob-max-budget-egp" type="number" min={0} placeholder="22000" {...register('maxBudget')} />
                    </div>
                  </>
                ) : null}
                <div className="space-y-2">
                  <label htmlFor="postjob-duration" className="text-sm font-semibold text-ink-700 dark:text-ink-200">Duration</label>
                  <Input id="postjob-duration" placeholder="2 weeks" {...register('duration')} />
                </div>
              </div>

              <div role="group" aria-labelledby="required-skills-label" aria-describedby={errors.requiredSkills ? "required-skills-error" : undefined} className="space-y-3">
                <p id="required-skills-label" className="text-sm font-semibold text-ink-700 dark:text-ink-200">Required skills</p>
                {isLoading ? (
                  <Skeleton className="h-24 w-full rounded-xl" />
                ) : (skills || []).length === 0 ? (
                  <p className="text-sm text-ink-500 dark:text-ink-300">No skills available. Contact admin to add skills.</p>
                ) : (
                                    <div className="space-y-4">
                    {groupSkillsByCategory(skills || []).map(({ meta, skills: groupSkills }) => {
                      const selectedInGroup = groupSkills.filter((skill: any) => selectedSkills.includes(skill._id)).length;
                      return (
                        <div key={meta.key} className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex h-6 w-6 items-center justify-center rounded-md border ${meta.badge}`}>
                              <meta.icon size={13} />
                            </span>
                            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-500 dark:text-ink-400">{meta.label}</span>
                            {selectedInGroup > 0 ? (
                              <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700 dark:bg-brand-400/10 dark:text-brand-200">
                                {selectedInGroup} selected
                              </span>
                            ) : null}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {groupSkills.map((skill: any) => {
                              const active = selectedSkills.includes(skill._id);
                              return (
                                <button
                                  key={skill._id}
                                  type="button"
                                  aria-pressed={active}
                                  onClick={() => toggleSkill(skill._id)}
                                  className={[
                                    'rounded-full border px-4 py-2 text-sm font-semibold transition',
                                    active
                                      ? 'border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-400/25 dark:bg-brand-400/10 dark:text-brand-200'
                                      : 'border-ink-300 bg-white/90 text-ink-700 hover:border-ink-400 dark:hover:border-white/20 hover:bg-ink-50 dark:border-ink-dark-border dark:bg-white/10 dark:text-ink-200 dark:hover:bg-white/15',
                                  ].join(' ')}
                                >
                                  {skill.name}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {errors.requiredSkills ? <p id="required-skills-error" role="alert" className="text-sm text-rose-600 dark:text-rose-300">Select at least one skill.</p> : null}

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
{isSubmitting
  ? (isEditMode ? 'Saving changes...' : 'Publishing...')
  : isEditMode
    ? 'Save changes'
    : isInternship
      ? 'Publish internship'
      : 'Publish job'}
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
    </>
  )}
</div>
  );
};

export default PostJob;