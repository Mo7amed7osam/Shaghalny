import React, { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link2, Upload } from 'lucide-react';
import { toast } from 'sonner';

import useAuth from '@/hooks/useAuth';
import {
  getStudentProfile,
  updateStudentProfile,
  uploadStudentCV,
  uploadStudentPhoto,
} from '@/services/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';

type Review = {
  clientName: string;
  rating: number;
  comment?: string;
  jobTitle?: string;
};

const StudentProfile: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?._id || user?.id;
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  const [formValues, setFormValues] = useState({
    name: '',
    description: '',
    profilePhotoUrl: '',
    university: '',
    portfolioLinks: '',
  });
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
    onSuccess: () => {
      toast.success('Profile updated successfully');
      queryClient.invalidateQueries({ queryKey: ['student', 'profile', userId] });
    },
    onError: () => toast.error('Failed to update profile'),
  });

  const { mutateAsync: uploadCv, isPending: isUploadingCv } = useMutation({
    mutationFn: (file: File) => uploadStudentCV(userId, file),
    onSuccess: () => {
      toast.success('CV uploaded successfully');
      queryClient.invalidateQueries({ queryKey: ['student', 'profile', userId] });
    },
    onError: () => toast.error('Failed to upload CV'),
  });

  const { mutateAsync: uploadPhoto, isPending: isUploadingPhoto } = useMutation({
    mutationFn: (file: File) => uploadStudentPhoto(userId, file),
    onSuccess: (data) => {
      if (data?.profilePhotoUrl) {
        setFormValues((p) => ({ ...p, profilePhotoUrl: data.profilePhotoUrl }));
      }
      queryClient.invalidateQueries({ queryKey: ['student', 'profile', userId] });
    },
  });

  if (!user || isLoading) return <Skeleton className="h-80 w-full rounded-xl" />;
  if (isError || !profile) return <EmptyState title="Unable to load profile" description="Refresh the page and try again. Your profile data could not be loaded." />;

  const apiBase = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
  const origin = apiBase.endsWith('/api') ? apiBase.slice(0, -4) : apiBase;
  const asset = (v?: string) => (v?.startsWith('http') ? v : v ? `${origin}${v}` : '');
  const photoUrl = asset(formValues.profilePhotoUrl || profile.profilePhotoUrl);
  const cvUrl = asset(profile.cvUrl);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Student profile"
        title="Profile and credibility"
        description="Keep your public profile, verified skills, portfolio links, and proof of work polished for clients."
      />

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="glass-panel space-y-6 p-6">
          <div className="flex items-center gap-4">
            <div className="h-24 w-24 overflow-hidden rounded-xl border border-ink-200 bg-ink-50 dark:border-white/10 dark:bg-white/6">
              {photoUrl ? (
                <img src={photoUrl} alt={profile.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-ink-500 dark:text-ink-300">No photo</div>
              )}
            </div>
            <div className="space-y-3">
              <div>
                <h2 className="text-2xl font-semibold">{profile.name}</h2>
                <p className="text-sm text-ink-500 dark:text-ink-300">{profile.email}</p>
              </div>
              <input ref={photoInputRef} type="file" accept="image/*" onChange={(e) => e.target.files && uploadPhoto(e.target.files[0])} className="hidden" />
              <Button size="sm" variant="outline" disabled={isUploadingPhoto} onClick={() => photoInputRef.current?.click()}>
                <Upload size={16} />
                {isUploadingPhoto ? 'Uploading...' : 'Upload photo'}
              </Button>
            </div>
          </div>

          <div className="grid gap-3">
            <div className="muted-panel rounded-lg p-4">
              <p className="label-muted">Verified skills</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {profile.verifiedSkills?.length ? (
                  profile.verifiedSkills.map((s: any) => (
                    <Badge key={s._id} variant="brand">
                      {s.skill?.name} ({s.score})
                    </Badge>
                  ))
                ) : (
                  <Badge variant="subtle">No verified skills yet</Badge>
                )}
              </div>
            </div>

            <div className="muted-panel rounded-lg p-4">
              <p className="label-muted">Curriculum vitae</p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                {cvUrl ? (
                  <a href={cvUrl} target="_blank" rel="noreferrer" className="text-sm font-semibold text-brand-600 dark:text-brand-200">
                    View current CV
                  </a>
                ) : (
                  <span className="text-sm text-ink-500 dark:text-ink-300">No CV uploaded</span>
                )}
                <label>
                  <input type="file" hidden onChange={(e) => e.target.files && uploadCv(e.target.files[0])} />
                  <Button size="sm" variant="outline" disabled={isUploadingCv}>
                    {isUploadingCv ? 'Uploading...' : 'Upload CV'}
                  </Button>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-panel space-y-5 p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={formValues.name} onChange={(e) => setFormValues((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>University</Label>
              <Input value={formValues.university} onChange={(e) => setFormValues((p) => ({ ...p, university: e.target.value }))} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea rows={5} value={formValues.description} onChange={(e) => setFormValues((p) => ({ ...p, description: e.target.value }))} />
          </div>

          <div className="space-y-2">
            <Label>Portfolio links</Label>
            <Textarea rows={4} value={formValues.portfolioLinks} onChange={(e) => setFormValues((p) => ({ ...p, portfolioLinks: e.target.value }))} />
            <p className="flex items-center gap-2 text-sm text-ink-500 dark:text-ink-300">
              <Link2 size={16} />
              Put one link per line for a cleaner public profile.
            </p>
          </div>

          <Button
            onClick={() =>
              saveProfile({
                ...formValues,
                portfolioLinks: formValues.portfolioLinks,
              })
            }
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save profile'}
          </Button>
        </div>
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Client reviews</h2>
        {reviews.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {reviews.map((r, i) => (
              <div key={i} className="glass-panel p-5">
                <p className="font-semibold text-ink-900 dark:text-white">{r.clientName}</p>
                <p className="text-sm text-ink-500 dark:text-ink-300">
                  {r.jobTitle} • Rating {r.rating}/5
                </p>
                {r.comment ? <p className="mt-3 text-sm text-ink-600 dark:text-ink-300">{r.comment}</p> : null}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No reviews yet" description="Completed client engagements and submitted reviews will appear here." />
        )}
      </section>
    </div>
  );
};

export default StudentProfile;
