import React, { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Camera, FileText, Link2, Star, Upload } from 'lucide-react';
import { toast } from 'sonner';

import useAuth from '@/hooks/useAuth';
import {
  getStudentProfile, updateStudentProfile, uploadStudentCV, uploadStudentPhoto,
} from '@/services/api';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/ui/page-header';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';

type Review = { clientName: string; rating: number; comment?: string; jobTitle?: string };

function getInitials(name?: string) {
  if (!name) return '?';
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function getCompletionPct(profile: any): number {
  const checks = [!!profile?.description, !!profile?.university, !!profile?.profilePhotoUrl, !!(profile?.verifiedSkills?.length), !!(profile?.portfolioLinks?.length)];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.23, 1, 0.32, 1] } },
};

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };

const StudentProfile: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?._id || user?.id;
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  const [formValues, setFormValues] = useState({ name: '', description: '', profilePhotoUrl: '', university: '', portfolioLinks: '' });
  const [reviews, setReviews] = useState<Review[]>([]);

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
      university: profile.university || '',
      portfolioLinks: (profile.portfolioLinks || []).join('\n'),
    });
    setReviews(profile.reviews || []);
  }, [profile]);

  const { mutateAsync: saveProfile, isPending: isSaving } = useMutation({
    mutationFn: (payload: any) => updateStudentProfile(userId, payload),
    onSuccess: () => { toast.success('Profile updated'); queryClient.invalidateQueries({ queryKey: ['student', 'profile', userId] }); },
    onError: () => toast.error('Failed to update profile'),
  });

  const { mutateAsync: uploadCv, isPending: isUploadingCv } = useMutation({
    mutationFn: (file: File) => uploadStudentCV(userId, file),
    onSuccess: () => { toast.success('CV uploaded'); queryClient.invalidateQueries({ queryKey: ['student', 'profile', userId] }); },
    onError: () => toast.error('Failed to upload CV'),
  });

  const { mutateAsync: uploadPhoto, isPending: isUploadingPhoto } = useMutation({
    mutationFn: (file: File) => uploadStudentPhoto(userId, file),
    onSuccess: (data) => {
      if (data?.profilePhotoUrl) setFormValues((p) => ({ ...p, profilePhotoUrl: data.profilePhotoUrl }));
      queryClient.invalidateQueries({ queryKey: ['student', 'profile', userId] });
    },
  });

  if (!user || isLoading) return (
    <div className="space-y-6">
      <Skeleton className="h-16 w-64" />
      <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
        <Skeleton className="h-80 w-full rounded-xl" />
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
    </div>
  );

  if (isError || !profile) return (
    <EmptyState title="Unable to load profile" description="Refresh the page and try again." />
  );

  const apiBase = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
  const origin = apiBase.endsWith('/api') ? apiBase.slice(0, -4) : apiBase;
  const asset = (v?: string) => (v?.startsWith('http') ? v : v ? `${origin}${v}` : '');
  const photoUrl = asset(formValues.profilePhotoUrl || profile.profilePhotoUrl);
  const cvUrl = asset(profile.cvUrl);
  const completionPct = getCompletionPct(profile);

  return (
    <motion.div className="space-y-8" initial="hidden" animate="visible" variants={stagger}>
      <motion.div variants={fadeUp}>
        <PageHeader
          eyebrow="Student profile"
          title="Profile and credibility"
          description="Keep your public profile, verified skills, and portfolio polished for clients."
        />
      </motion.div>

      <motion.div variants={fadeUp} className="grid gap-6 xl:grid-cols-[340px_1fr]">
        {/* Left column: profile card */}
        <div className="space-y-4">
          <Card>
            <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
              <div className="relative">
                <Avatar className="h-24 w-24 ring-4 ring-brand-100 dark:ring-brand-900/40">
                  {photoUrl ? <AvatarImage src={photoUrl} alt={profile.name} /> : null}
                  <AvatarFallback className="text-2xl">{getInitials(profile.name)}</AvatarFallback>
                </Avatar>
                <button
                  onClick={() => photoInputRef.current?.click()}
                  disabled={isUploadingPhoto}
                  className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-brand-600 text-white transition-colors hover:bg-brand-700 dark:border-ink-dark-surface"
                >
                  <Camera size={12} />
                </button>
                <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files && uploadPhoto(e.target.files[0])} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-ink-900 dark:text-white">{profile.name}</h2>
                <p className="text-sm text-ink-500 dark:text-ink-400">{profile.email}</p>
                {profile.university && <p className="mt-1 text-sm font-medium text-brand-600 dark:text-brand-400">{profile.university}</p>}
              </div>

              <div className="w-full space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-ink-500 dark:text-ink-400">Profile completion</span>
                  <span className="font-bold text-brand-600 dark:text-brand-400">{completionPct}%</span>
                </div>
                <Progress value={completionPct} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="mb-0">
              <CardTitle className="text-sm">Verified skills</CardTitle>
            </CardHeader>
            <CardContent className="mt-3">
              {profile.verifiedSkills?.length ? (
                <div className="flex flex-wrap gap-2">
                  {profile.verifiedSkills.map((s: any) => (
                    <Badge key={s._id} variant="brand">
                      {s.skill?.name} {s.score != null ? `· ${s.score}` : ''}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-ink-500 dark:text-ink-400">No verified skills yet. Pass an AI interview to add them.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="mb-0">
              <CardTitle className="flex items-center gap-2 text-sm">
                <FileText size={14} className="text-brand-500" />
                Curriculum vitae
              </CardTitle>
            </CardHeader>
            <CardContent className="mt-3 flex items-center gap-3">
              {cvUrl ? (
                <a href={cvUrl} target="_blank" rel="noreferrer" className="text-sm font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400">
                  View current CV
                </a>
              ) : (
                <span className="text-sm text-ink-500 dark:text-ink-400">No CV uploaded</span>
              )}
              <label>
                <input type="file" hidden onChange={(e) => e.target.files && uploadCv(e.target.files[0])} />
                <Button size="sm" variant="outline" disabled={isUploadingCv} asChild={false}>
                  <span>{isUploadingCv ? 'Uploading...' : 'Upload CV'}</span>
                </Button>
              </label>
            </CardContent>
          </Card>
        </div>

        {/* Right column: edit form */}
        <Card>
          <CardHeader className="mb-0">
            <CardTitle>Edit profile</CardTitle>
          </CardHeader>
          <CardContent className="mt-4 space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Full name</Label>
                <Input value={formValues.name} onChange={(e) => setFormValues((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>University</Label>
                <Input value={formValues.university} onChange={(e) => setFormValues((p) => ({ ...p, university: e.target.value }))} placeholder="e.g. Cairo University" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Bio</Label>
              <Textarea
                rows={5}
                placeholder="Describe your skills, experience, and what you're looking for..."
                value={formValues.description}
                onChange={(e) => setFormValues((p) => ({ ...p, description: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Portfolio links</Label>
              <Textarea
                rows={4}
                placeholder="https://github.com/you&#10;https://portfolio.com&#10;..."
                value={formValues.portfolioLinks}
                onChange={(e) => setFormValues((p) => ({ ...p, portfolioLinks: e.target.value }))}
              />
              <p className="flex items-center gap-2 text-xs text-ink-500 dark:text-ink-400">
                <Link2 size={12} />
                One link per line
              </p>
            </div>

            <Separator />

            <Button
              className="w-full sm:w-auto"
              onClick={() => saveProfile({ ...formValues, portfolioLinks: formValues.portfolioLinks })}
              disabled={isSaving}
            >
              <Upload size={14} />
              {isSaving ? 'Saving...' : 'Save changes'}
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Reviews */}
      <motion.div variants={fadeUp} className="space-y-4">
        <h2 className="text-xl font-semibold text-ink-900 dark:text-white">Client reviews</h2>
        {reviews.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {reviews.map((r, i) => (
              <Card key={i} className="space-y-3 p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-ink-900 dark:text-white">{r.clientName}</p>
                    {r.jobTitle && <p className="text-xs text-ink-500 dark:text-ink-400">{r.jobTitle}</p>}
                  </div>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, si) => (
                      <Star key={si} size={12} className={si < r.rating ? 'fill-amber-400 text-amber-400' : 'text-ink-300 dark:text-ink-600'} />
                    ))}
                  </div>
                </div>
                {r.comment && <p className="text-sm text-ink-600 dark:text-ink-300">{r.comment}</p>}
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState title="No reviews yet" description="Completed engagements and submitted reviews will appear here." />
        )}
      </motion.div>
    </motion.div>
  );
};

export default StudentProfile;
