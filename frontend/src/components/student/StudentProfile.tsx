import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  BadgeCheck,
  BriefcaseBusiness,
  Camera,
    CheckCircle2,
  Download,
  ExternalLink,
  Eye,
  FileText,
  GraduationCap,
  Globe2,
  ImageOff,
  Link2,
  Loader2,
  Mail,
  PencilLine,
  Plus,
  Trash2,
  Upload,
  UserRound,
} from 'lucide-react';
import { toast } from 'sonner';

import useAuth from '@/hooks/useAuth';
import { downloadInternshipCertificate } from '@/lib/certificate';
import {
  getStudentProfile,
  updateStudentProfile,
  uploadStudentCV,
  uploadStudentCover,
  uploadStudentPhoto,
} from '@/services/api';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { buildAssetUrl } from '@/lib/assets';
type Review = { clientName: string; rating: number; comment?: string; jobTitle?: string; jobType?: 'freelance' | 'internship'; createdAt?: string };
type ViewMode = 'edit' | 'public';

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.23, 1, 0.32, 1] as [number, number, number, number] } },
};

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };

function getInitials(name?: string) {
  if (!name) return '?';
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function getCompletionPct(profile: any): number {
  const checks = [
    !!profile?.description,
    !!profile?.university,
    !!profile?.profilePhotoUrl,
    !!profile?.coverPhotoUrl,
    !!(profile?.verifiedSkills?.length),
    !!(profile?.portfolioLinks?.length),
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function getDomain(link: string) {
  try {
    return new URL(link).hostname.replace(/^www\./, '');
  } catch {
    return link.replace(/^https?:\/\//, '').split('/')[0] || 'portfolio link';
  }
}

function getProfileTitle(profile: any, verifiedSkills: any[]) {
  const primarySkill = verifiedSkills[0]?.skill?.name;
  if (primarySkill) return `${primarySkill} freelancer`;
  if (profile?.university) return `${profile.university} student freelancer`;
  return 'Student freelancer';
}

const EditSection = ({
  title,
  description,
  icon,
  children,
  action,
  className = '',
}: {
  title: string;
  description?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) => (
  <Card className={`min-w-0 overflow-hidden p-0 ${className}`}>
    <CardHeader className="mb-0 border-b border-ink-100/80 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.025] sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 sm:gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-brand-100 dark:bg-brand-900/25 dark:text-brand-300 dark:ring-brand-500/20 sm:h-10 sm:w-10">
            {icon}
          </span>
          <div className="min-w-0">
            <CardTitle className="text-base tracking-tight sm:text-lg">{title}</CardTitle>
            {description ? <p className="mt-1 text-sm leading-6 text-ink-500 dark:text-ink-dark-muted">{description}</p> : null}
          </div>
        </div>
        {action ? <div className="flex w-full sm:w-auto sm:justify-end [&>button]:w-full [&>button]:sm:w-auto">{action}</div> : null}
      </div>
    </CardHeader>
    <CardContent className="p-4 sm:p-6">{children}</CardContent>
  </Card>
);

const ProfileStat = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="min-w-0 rounded-xl border border-ink-200/75 bg-ink-50/70 px-2 py-2.5 text-center shadow-soft dark:border-white/10 dark:bg-white/[0.045] sm:rounded-2xl sm:px-4 sm:py-3">
    <p className="text-lg font-semibold tracking-tight text-ink-950 dark:text-white sm:text-2xl">{value}</p>
    <p className="mt-0.5 whitespace-normal break-words text-[10px] font-semibold uppercase tracking-[0.06em] text-ink-500 dark:text-ink-dark-muted sm:mt-1 sm:text-[11px] sm:tracking-[0.12em]">{label}</p>
  </div>
);

const StudentProfile: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?._id || user?.id;
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const cvInputRef = useRef<HTMLInputElement | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>('edit');
  const [formValues, setFormValues] = useState({
    name: '',
    description: '',
    profilePhotoUrl: '',
    coverPhotoUrl: '',
    university: '',
    portfolioLinks: '',
  });
  const [reviews, setReviews] = useState<Review[]>([]);
  const [localPhotoPreview, setLocalPhotoPreview] = useState('');
  const [localCoverPreview, setLocalCoverPreview] = useState('');
  const [photoLoadError, setPhotoLoadError] = useState(false);

  const { data: profile, isLoading, isError } = useQuery({
    queryKey: ['student', 'profile', userId],
    queryFn: () => getStudentProfile(userId),
    enabled: !!userId,
  });

  useEffect(() => {
    if (!profile) return;
    setFormValues({
      name: profile.name || '',
      description: profile.description || '',
      profilePhotoUrl: profile.profilePhotoUrl || '',
      coverPhotoUrl: profile.coverPhotoUrl || '',
      university: profile.university || '',
      portfolioLinks: (profile.portfolioLinks || []).join('\n'),
    });
    setReviews(profile.reviews || []);
    setPhotoLoadError(false);
  }, [profile]);

  useEffect(() => {
    return () => {
      if (localPhotoPreview) URL.revokeObjectURL(localPhotoPreview);
      if (localCoverPreview) URL.revokeObjectURL(localCoverPreview);
    };
  }, [localPhotoPreview, localCoverPreview]);

  const { mutateAsync: saveProfile, isPending: isSaving } = useMutation({
    mutationFn: (payload: any) => updateStudentProfile(userId, payload),
    onSuccess: () => {
      toast.success('Profile updated');
      queryClient.invalidateQueries({ queryKey: ['student', 'profile', userId] });
    },
    onError: () => toast.error('Failed to update profile'),
  });

  const { mutateAsync: uploadCv, isPending: isUploadingCv } = useMutation({
    mutationFn: (file: File) => uploadStudentCV(userId, file),
    onSuccess: () => {
      toast.success('CV uploaded');
      queryClient.invalidateQueries({ queryKey: ['student', 'profile', userId] });
      if (cvInputRef.current) cvInputRef.current.value = '';
    },
    onError: () => toast.error('Failed to upload CV'),
  });

  const { mutateAsync: uploadPhoto, isPending: isUploadingPhoto } = useMutation({
    mutationFn: (file: File) => uploadStudentPhoto(userId, file),
    onSuccess: (data) => {
      if (data?.profilePhotoUrl) {
        setFormValues((p) => ({ ...p, profilePhotoUrl: data.profilePhotoUrl }));
        setLocalPhotoPreview('');
        queryClient.setQueryData(['student', 'profile', userId], (old: any) => old ? { ...old, profilePhotoUrl: data.profilePhotoUrl } : old);
        queryClient.setQueryData(['auth', 'me'], (old: any) => old?.user ? { ...old, user: { ...old.user, profilePhotoUrl: data.profilePhotoUrl } } : old);
      }
      setPhotoLoadError(false);
      toast.success('Profile photo updated');
      queryClient.invalidateQueries({ queryKey: ['student', 'profile', userId] });
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      if (photoInputRef.current) photoInputRef.current.value = '';
    },
    onError: () => {
      setLocalPhotoPreview('');
      toast.error('Failed to upload profile photo');
    },
  });

  const { mutateAsync: uploadCover, isPending: isUploadingCover } = useMutation({
    mutationFn: (file: File) => uploadStudentCover(userId, file),
    onSuccess: (data) => {
      if (data?.coverPhotoUrl) {
        setFormValues((p) => ({ ...p, coverPhotoUrl: data.coverPhotoUrl }));
        setLocalCoverPreview('');
        queryClient.setQueryData(['student', 'profile', userId], (old: any) => old ? { ...old, coverPhotoUrl: data.coverPhotoUrl } : old);
        queryClient.setQueryData(['auth', 'me'], (old: any) => old?.user ? { ...old, user: { ...old.user, coverPhotoUrl: data.coverPhotoUrl } } : old);
      }
      toast.success('Cover updated');
      queryClient.invalidateQueries({ queryKey: ['student', 'profile', userId] });
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      if (coverInputRef.current) coverInputRef.current.value = '';
    },
    onError: () => {
      setLocalCoverPreview('');
      toast.error('Failed to upload cover');
    },
  });

  const photoUrl = localPhotoPreview || buildAssetUrl(formValues.profilePhotoUrl || profile?.profilePhotoUrl);
  const coverUrl = localCoverPreview || buildAssetUrl(formValues.coverPhotoUrl || profile?.coverPhotoUrl);
  const cvUrl = buildAssetUrl(profile?.cvUrl);
  const completionPct = profile ? getCompletionPct({ ...profile, ...formValues, portfolioLinks: formValues.portfolioLinks.split('\n').filter(Boolean) }) : 0;
  const verifiedSkills = profile?.verifiedSkills || [];
  const portfolioLinks = useMemo(
    () => formValues.portfolioLinks.split('\n').map((link) => link.trim()).filter(Boolean),
    [formValues.portfolioLinks]
  );
  const portfolioLinkFields = useMemo(() => {
    const rawLinks = formValues.portfolioLinks.split('\n');
    return rawLinks.some((link) => link.length > 0) ? rawLinks : [''];
  }, [formValues.portfolioLinks]);
  const completionChecks = [
    { label: 'Bio', done: Boolean(formValues.description.trim()) },
    { label: 'University', done: Boolean(formValues.university.trim()) },
    { label: 'Photo', done: Boolean(formValues.profilePhotoUrl || profile?.profilePhotoUrl || localPhotoPreview) },
    { label: 'Cover', done: Boolean(formValues.coverPhotoUrl || profile?.coverPhotoUrl || localCoverPreview) },
    { label: 'Verified skill', done: verifiedSkills.length > 0 },
    { label: 'Portfolio', done: portfolioLinks.length > 0 },
  ];
  const nextCompletionItem = completionChecks.find((item) => !item.done)?.label;

  const handlePhotoSelect = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Upload an image file.');
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    setLocalPhotoPreview((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return previewUrl;
    });
    setPhotoLoadError(false);
    await uploadPhoto(file);
  };

  const handleCoverSelect = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Upload an image file.');
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    setLocalCoverPreview((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return previewUrl;
    });
    await uploadCover(file);
  };

  const handleCvSelect = async (file?: File) => {
    if (!file) return;
    await uploadCv(file);
  };

  const updatePortfolioLink = (index: number, value: string) => {
    const nextLinks = [...portfolioLinkFields];
    nextLinks[index] = value;
    setFormValues((p) => ({ ...p, portfolioLinks: nextLinks.join('\n') }));
  };

  const removePortfolioLink = (index: number) => {
    const nextLinks = portfolioLinkFields.filter((_, linkIndex) => linkIndex !== index);
    setFormValues((p) => ({ ...p, portfolioLinks: nextLinks.length ? nextLinks.join('\n') : '' }));
  };

  const addPortfolioLink = () => {
    setFormValues((p) => ({ ...p, portfolioLinks: p.portfolioLinks ? `${p.portfolioLinks}\n` : '\n' }));
  };

  const handleSave = () => {
    saveProfile({
      ...formValues,
      portfolioLinks: formValues.portfolioLinks,
    });
  };

  if (!user || isLoading) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-5">
        <Skeleton className="h-72 w-full rounded-3xl" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-56 w-full rounded-2xl" />
          <Skeleton className="h-56 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (isError || !profile) {
    return <EmptyState title="Unable to load profile" description="Refresh the page and try again." />;
  }

  const profileTitle = getProfileTitle(profile, verifiedSkills);
  const coverStyle = coverUrl
    ? {
        backgroundImage: `linear-gradient(135deg, rgba(79,70,229,0.18), rgba(15,15,20,0.26)), url("${coverUrl.replace(/"/g, '\\"')}")`,
      }
    : undefined;

  return (
    <motion.div className="mx-auto w-full max-w-[1080px] space-y-5" initial="hidden" animate="visible" variants={stagger}>
      <motion.div variants={fadeUp} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="page-eyebrow">Profile workspace</p>
          <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight text-ink-950 dark:text-white">Portfolio profile</h1>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
          <div className="inline-flex w-full rounded-full border border-ink-200/80 bg-white/80 p-1 shadow-soft dark:border-white/10 dark:bg-white/[0.05] sm:w-auto">
            <Button type="button" size="sm" variant={viewMode === 'edit' ? 'default' : 'ghost'} className="flex-1 rounded-full sm:flex-none" onClick={() => setViewMode('edit')}>
              <PencilLine size={14} />
              Edit
            </Button>
            <Button type="button" size="sm" variant={viewMode === 'public' ? 'default' : 'ghost'} className="flex-1 rounded-full sm:flex-none" onClick={() => setViewMode('public')}>
              <Eye size={14} />
              View as
            </Button>
          </div>
          {viewMode === 'edit' ? (
            <Button type="button" onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto">
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              {isSaving ? 'Saving...' : 'Save changes'}
            </Button>
          ) : (
            <Button type="button" variant="outline" className="w-full sm:w-auto" asChild>
              <a href={`/students/${userId}`} target="_blank" rel="noreferrer">
                Open public page <ExternalLink size={14} />
              </a>
            </Button>
          )}
        </div>
      </motion.div>

      <motion.section variants={fadeUp} className="sh-panel min-w-0 overflow-hidden rounded-[20px]">
        <div
          className="relative h-[170px] bg-[linear-gradient(120deg,#4f46e5,#6366f1_55%,#a78bfa)] bg-cover bg-center"
          style={coverStyle}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(255,255,255,0.18),transparent_40%),radial-gradient(circle_at_80%_60%,rgba(255,255,255,0.12),transparent_40%)]" />
          {viewMode === 'edit' ? (
            <div className="absolute right-3 top-3 flex items-center gap-2 sm:right-4 sm:top-4">
              <Button type="button" size="sm" variant="secondary" className="h-8 border border-white/20 bg-ink-950/35 px-3 text-xs text-white shadow-soft backdrop-blur hover:bg-ink-950/45 hover:text-white sm:h-9 sm:text-sm" disabled={isUploadingCover} onClick={() => coverInputRef.current?.click()}>
                {isUploadingCover ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                {isUploadingCover ? 'Uploading...' : coverUrl ? 'Change cover' : 'Add cover'}
              </Button>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => void handleCoverSelect(e.target.files?.[0])}
              />
            </div>
          ) : null}
        </div>

        <div className="relative grid min-w-0 gap-5 px-5 pb-6 pt-16 sm:px-7 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="absolute left-4 top-0 -translate-y-1/2 sm:left-6 lg:left-7">
            <Avatar className="h-[104px] w-[104px] rounded-[26px] border-4 border-white bg-white shadow-elevated ring-1 ring-ink-200 dark:border-ink-dark-surface dark:bg-ink-dark-surface dark:ring-white/10">
              {photoUrl && !photoLoadError ? (
                <AvatarImage src={photoUrl} alt={profile.name} onError={() => setPhotoLoadError(true)} />
              ) : null}
              <AvatarFallback className="text-3xl">
                {photoLoadError ? <ImageOff size={26} /> : getInitials(formValues.name || profile.name)}
              </AvatarFallback>
            </Avatar>
            {viewMode === 'edit' ? (
              <>
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  disabled={isUploadingPhoto}
                  className="absolute bottom-1 right-1 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-brand-600 text-white shadow-card transition-colors hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-60 dark:border-ink-dark-surface"
                  aria-label="Upload profile photo"
                >
                  {isUploadingPhoto ? <Loader2 size={15} className="animate-spin" /> : <Camera size={15} />}
                </button>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => void handlePhotoSelect(e.target.files?.[0])}
                />
              </>
            ) : null}
          </div>

          <div className="min-w-0 sm:pl-36">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="min-w-0 max-w-full break-words text-2xl font-semibold tracking-tight text-ink-950 dark:text-white sm:text-3xl">{formValues.name || profile.name}</h2>
              {verifiedSkills.length ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:border-brand-700/40 dark:bg-brand-900/30 dark:text-brand-300">
                  <BadgeCheck size={13} />
                  Verified
                </span>
              ) : null}
            </div>
            <p className="mt-1 break-words text-sm font-medium text-ink-700 dark:text-ink-200 sm:text-base">{profileTitle}</p>
            <div className="mt-3 flex min-w-0 flex-col gap-1.5 text-sm text-ink-500 dark:text-ink-400 sm:flex-row sm:flex-wrap sm:gap-x-5 sm:gap-y-2">
              <span className="inline-flex min-w-0 items-center gap-1.5"><Mail size={14} className="shrink-0" /><span className="min-w-0 break-all">{profile.email}</span></span>
              {formValues.university ? <span className="inline-flex min-w-0 items-center gap-1.5"><GraduationCap size={14} className="shrink-0" /><span className="min-w-0 break-words">{formValues.university}</span></span> : null}
            </div>
          </div>

          <div className="grid min-w-0 grid-cols-3 gap-3 self-end">
            <ProfileStat label="Skills" value={verifiedSkills.length} />
            <ProfileStat label="Projects" value={portfolioLinks.length} />
            <ProfileStat label="Reviews" value={reviews.length} />
          </div>
        </div>
      </motion.section>

      {viewMode === 'public' ? (
        <motion.div variants={fadeUp}>
          <PublicProfileView
            profile={profile}
            description={formValues.description}
            university={formValues.university}
            verifiedSkills={verifiedSkills}
            portfolioLinks={portfolioLinks}
            reviews={reviews}
            cvUrl={cvUrl}
          />
        </motion.div>
      ) : (
        <motion.div variants={fadeUp} className="space-y-4">
          <Card className="overflow-hidden p-0">
            <CardContent className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center sm:p-5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <div className="min-w-0">
                    <p className="page-eyebrow">Profile strength</p>
                    <h2 className="mt-1 text-xl font-semibold tracking-tight text-ink-950 dark:text-white">{completionPct}% complete</h2>
                  </div>
                  <span className="w-fit rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:border-brand-500/20 dark:bg-brand-900/20 dark:text-brand-300 sm:text-sm">
                    {nextCompletionItem ? `Next: ${nextCompletionItem}` : 'Client-ready profile'}
                  </span>
                </div>
                <Progress value={completionPct} className="mt-4" />
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {completionChecks.map((item) => (
                    <span
                      key={item.label}
                      className={`inline-flex min-w-0 items-center gap-2 rounded-xl border px-2.5 py-2 text-xs font-semibold ${
                        item.done
                          ? 'border-accent-200 bg-accent-50 text-accent-700 dark:border-accent-500/20 dark:bg-accent-500/10 dark:text-accent-300'
                          : 'border-ink-200 bg-ink-50 text-ink-500 dark:border-white/10 dark:bg-white/[0.045] dark:text-ink-dark-muted'
                      }`}
                    >
                      <CheckCircle2 size={13} className={item.done ? 'text-accent-500' : 'text-ink-300 dark:text-ink-600'} />
                      <span className="truncate">{item.label}</span>
                    </span>
                  ))}
                </div>
              </div>
              <Button type="button" onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto">
                {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                {isSaving ? 'Saving...' : 'Save changes'}
              </Button>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <EditSection
              title="Personal information"
              description="This is the identity block clients see first."
              icon={<UserRound size={18} />}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="profile-name">Full name</Label>
                  <Input
                    id="profile-name"
                    value={formValues.name}
                    onChange={(e) => setFormValues((p) => ({ ...p, name: e.target.value }))}
                    autoComplete="name"
                    placeholder="Your full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-email">Email</Label>
                  <Input id="profile-email" value={profile.email || ''} disabled />
                </div>
              </div>
            </EditSection>

            <EditSection
              title="Education"
              description="Use the university name clients will recognize."
              icon={<GraduationCap size={18} />}
            >
              <div className="space-y-2">
                <Label htmlFor="profile-university">University</Label>
                <Input
                  id="profile-university"
                  value={formValues.university}
                  onChange={(e) => setFormValues((p) => ({ ...p, university: e.target.value }))}
                  placeholder="e.g. Cairo University"
                />
              </div>
            </EditSection>

            <EditSection
              title="Professional bio"
              description="Lead with skills, proof, and the kind of projects you want."
              icon={<BadgeCheck size={18} />}
              className="lg:col-span-2"
            >
              <div className="space-y-2">
                <Label htmlFor="profile-bio">Bio</Label>
                <Textarea
                  id="profile-bio"
                  rows={5}
                  placeholder="Frontend-focused computer science student building clean React interfaces for early-stage products."
                  value={formValues.description}
                  onChange={(e) => setFormValues((p) => ({ ...p, description: e.target.value }))}
                  className="min-h-36 resize-y text-base leading-7"
                />
                <p className="text-sm text-ink-500 dark:text-ink-dark-muted">Keep it specific, evidence-based, and easy to scan.</p>
              </div>
            </EditSection>

            <EditSection
              title="Portfolio links"
              description="Add each project link separately so clients can scan your work quickly."
              icon={<Link2 size={18} />}
              className="lg:col-span-2"
              action={
                <Button type="button" size="sm" variant="outline" onClick={addPortfolioLink}>
                  <Plus size={14} />
                  Add link
                </Button>
              }
            >
              <div className="space-y-3">
                {portfolioLinkFields.map((link, index) => (
                  <div key={`portfolio-link-${index}`} className="flex gap-2">
                    <div className="min-w-0 flex-1 space-y-2">
                      <Label htmlFor={`portfolio-link-${index}`} className="sr-only">Portfolio link {index + 1}</Label>
                      <Input
                        id={`portfolio-link-${index}`}
                        value={link}
                        placeholder="https://your-work.com/project"
                        onChange={(e) => updatePortfolioLink(index, e.target.value)}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-ink-400 hover:text-red-600"
                      onClick={() => removePortfolioLink(index)}
                      disabled={portfolioLinkFields.length === 1 && !portfolioLinkFields[0]}
                      aria-label={`Remove portfolio link ${index + 1}`}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                ))}
                <p className="flex items-start gap-2 text-sm leading-6 text-ink-500 dark:text-ink-400">
                  <Link2 size={14} className="mt-1 shrink-0" />
                  <span className="min-w-0">GitHub, Behance, live demos, LinkedIn, and case studies work best.</span>
                </p>
              </div>
            </EditSection>

            <EditSection
              title="CV"
              description="Attach a current document for clients who need formal screening."
              icon={<FileText size={18} />}
              className="lg:col-span-2"
              action={
                <Button type="button" size="sm" variant="outline" disabled={isUploadingCv} onClick={() => cvInputRef.current?.click()}>
                  {isUploadingCv ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                  {isUploadingCv ? 'Uploading...' : cvUrl ? 'Replace CV' : 'Upload CV'}
                </Button>
              }
            >
              <input
                ref={cvInputRef}
                type="file"
                hidden
                onChange={(e) => void handleCvSelect(e.target.files?.[0])}
              />
              <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-ink-200/80 bg-ink-50/70 p-4 dark:border-white/10 dark:bg-white/[0.04] sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-ink-900 dark:text-white">{cvUrl ? 'CV uploaded' : 'No CV uploaded'}</p>
                  <p className="mt-1 text-sm text-ink-500 dark:text-ink-dark-muted">
                    PDF or document uploads are saved to your profile.
                  </p>
                </div>
                {cvUrl ? (
                  <Button type="button" variant="ghost" size="sm" asChild>
                    <a href={cvUrl} target="_blank" rel="noreferrer">
                      View CV <ExternalLink size={13} />
                    </a>
                  </Button>
                ) : null}
              </div>
            </EditSection>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

function PublicProfileView({
  profile,
  description,
  university,
  verifiedSkills,
  portfolioLinks,
  reviews,
  cvUrl,
}: {
  profile: any;
  description: string;
  university: string;
  verifiedSkills: any[];
  portfolioLinks: string[];
  reviews: Review[];
  cvUrl: string;
}) {
  const featuredLinks = portfolioLinks.slice(0, 6);

  return (
    <div className="grid min-w-0 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <main className="min-w-0 space-y-4">
        <Card className="min-w-0 p-0">
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="page-eyebrow">Overview</p>
                <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-ink-950 dark:text-white">What clients should know</h2>
              </div>
              <BriefcaseBusiness size={20} className="mt-1 text-brand-500" />
            </div>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-ink-600 dark:text-ink-300">
              {description || 'Add a focused overview that explains what you help clients achieve, your strongest skills, and the kind of work you want to do.'}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {verifiedSkills.length ? verifiedSkills.map((s: any) => (
                <Badge key={s._id || s.skill?._id || s.skill?.name} variant="brand" className="normal-case tracking-normal">
                  {s.skill?.name || 'Skill'} {s.score != null ? `- ${s.score}` : ''}
                </Badge>
              )) : (
                <Badge variant="subtle" className="normal-case tracking-normal">No verified skills yet</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-0 p-0">
          <CardHeader className="mb-0 border-b border-ink-100/80 p-5 dark:border-white/10">
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg">Portfolio showcase</CardTitle>
                <p className="mt-1 text-sm text-ink-500 dark:text-ink-dark-muted">Client-facing links presented as work samples.</p>
              </div>
              <Globe2 size={19} className="text-brand-500" />
            </div>
          </CardHeader>
          <CardContent className="p-5">
            {featuredLinks.length ? (
              <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {featuredLinks.map((link, index) => (
                  <a
                    key={`${link}-${index}`}
                    href={link}
                    target="_blank"
                    rel="noreferrer"
                    className="group min-w-0 rounded-2xl border border-ink-200/80 bg-white/75 p-4 text-ink-800 no-underline shadow-soft transition hover:-translate-y-0.5 hover:border-brand-200 hover:bg-brand-50/60 hover:text-brand-700 hover:shadow-card dark:border-white/10 dark:bg-white/[0.04] dark:text-ink-200 dark:hover:border-brand-500/30 dark:hover:bg-brand-900/20 dark:hover:text-brand-300"
                  >
                    <div className="mb-3 flex h-16 items-end rounded-xl border border-ink-200/70 bg-[linear-gradient(135deg,rgba(37,99,235,0.12),rgba(15,23,42,0.04))] p-2 dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(59,130,246,0.18),rgba(255,255,255,0.04))]">
                      <span className="rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-600 shadow-soft dark:bg-ink-dark-surface/90 dark:text-ink-300">
                        Project {index + 1}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <ExternalLink size={15} className="mt-0.5 shrink-0 text-ink-400 transition-colors group-hover:text-brand-500" />
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{getDomain(link)}</p>
                        <p className="mt-1 truncate text-xs text-ink-500 dark:text-ink-dark-muted">{link}</p>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-ink-200/80 bg-ink-50/70 p-6 text-center dark:border-white/10 dark:bg-white/[0.04]">
                <Globe2 size={22} className="mx-auto text-brand-500" />
                <p className="mt-3 font-semibold text-ink-900 dark:text-white">No portfolio links yet</p>
                <p className="mx-auto mt-1 max-w-sm text-sm text-ink-500 dark:text-ink-dark-muted">
                  Add GitHub, case studies, LinkedIn, Behance, or live project links in edit mode.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
        <section className="space-y-3">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold text-ink-900 dark:text-white">Client reviews</h2>
            <p className="text-sm text-ink-500 dark:text-ink-400">Completed engagements and client feedback.</p>
          </div>
          {reviews.length ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {reviews.map((r, i) => (
                                <Card key={`${r.clientName}-${i}`} className="min-w-0 space-y-3 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-ink-900 dark:text-white">{r.clientName}</p>
                      {r.jobTitle ? <p className="text-xs text-ink-500 dark:text-ink-400">{r.jobTitle}</p> : null}
                    </div>
                    <Badge variant="subtle">{r.rating}/5</Badge>
                  </div>
                                                   {r.comment ? <p className="break-words text-sm text-ink-600 dark:text-ink-300">{r.comment}</p> : null}
                  {r.jobType === 'internship' ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        downloadInternshipCertificate({
                          studentName: profile?.name || 'Student',
                          internshipTitle: r.jobTitle || 'Internship',
                          clientName: r.clientName,
                          completedDate: r.createdAt
                            ? new Date(r.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
                            : undefined,
                        })
                      }
                    >
                      <Download size={14} /> Download certificate
                    </Button>
                  ) : null}
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState title="No reviews yet" description="Completed engagements and submitted reviews will appear here." />
          )}
        </section>
      </main>

      <aside className="min-w-0 space-y-4 lg:sticky lg:top-20">
        <Card className="min-w-0 p-0">
          <CardHeader className="mb-0 border-b border-ink-100/80 p-5 dark:border-white/10">
            <CardTitle className="text-lg">Proof and credentials</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-5">
            <div className="rounded-2xl border border-ink-200/80 bg-ink-50/70 p-4 dark:border-white/10 dark:bg-white/[0.04]">
              <p className="flex items-center gap-2 text-sm font-semibold text-ink-900 dark:text-white"><GraduationCap size={15} className="text-brand-500" />Education</p>
              <p className="mt-2 text-sm text-ink-500 dark:text-ink-dark-muted">{university || 'University not added yet.'}</p>
            </div>
            <div className="rounded-2xl border border-ink-200/80 bg-ink-50/70 p-4 dark:border-white/10 dark:bg-white/[0.04]">
              <p className="flex items-center gap-2 text-sm font-semibold text-ink-900 dark:text-white"><CheckCircle2 size={15} className="text-brand-500" />Completed jobs</p>
              <p className="mt-2 text-sm text-ink-500 dark:text-ink-dark-muted">{profile.jobsCompleted || 0} completed engagements</p>
            </div>
            <div className="rounded-2xl border border-ink-200/80 bg-ink-50/70 p-4 dark:border-white/10 dark:bg-white/[0.04]">
              <p className="flex items-center gap-2 text-sm font-semibold text-ink-900 dark:text-white"><FileText size={15} className="text-brand-500" />CV</p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="text-sm text-ink-500 dark:text-ink-dark-muted">{cvUrl ? 'Current CV uploaded.' : 'No CV uploaded yet.'}</p>
                {cvUrl ? (
                  <a href={cvUrl} target="_blank" rel="noreferrer" className="text-sm font-semibold">
                    View
                  </a>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

export default StudentProfile;
