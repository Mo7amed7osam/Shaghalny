import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import {
  createSkill,
  deleteAdminJob,
  deleteAdminUser,
  deleteSkill,
  getAdminJobs,
  getAdminUsers,
  getInterviews,
  getSkills,
} from '@/services/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/ui/stat-card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/components/ui/table';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [status, setStatus] = useState('SUBMITTED');
  const [skillName, setSkillName] = useState('');
  const [skillDescription, setSkillDescription] = useState('');

  const { data: interviews, isLoading: interviewsLoading } = useQuery({
    queryKey: ['admin', 'interviews', status],
    queryFn: () => getInterviews(status),
  });

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: getAdminUsers,
  });

  const { data: jobs, isLoading: jobsLoading } = useQuery({
    queryKey: ['admin', 'jobs'],
    queryFn: getAdminJobs,
  });

  const { data: skills, isLoading: skillsLoading } = useQuery({
    queryKey: ['skills'],
    queryFn: getSkills,
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId: string) => deleteAdminUser(userId),
    onSuccess: () => {
      toast.success('User deleted.');
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });

  const deleteJobMutation = useMutation({
    mutationFn: (jobId: string) => deleteAdminJob(jobId),
    onSuccess: () => {
      toast.success('Job deleted.');
      queryClient.invalidateQueries({ queryKey: ['admin', 'jobs'] });
    },
  });

  const createSkillMutation = useMutation({
    mutationFn: (payload: { name: string; description: string }) => createSkill(payload),
    onSuccess: () => {
      toast.success('Skill created.');
      setSkillName('');
      setSkillDescription('');
      queryClient.invalidateQueries({ queryKey: ['skills'] });
    },
  });
const deleteSkillMutation = useMutation({
  mutationFn: (skillId: string) => deleteSkill(skillId),
  onSuccess: () => {
    toast.success('Skill deleted.');
    queryClient.invalidateQueries({ queryKey: ['skills'] });
  },
});

  const sortedSkills = useMemo(() => {
    return (skills || []).slice().sort((a: any, b: any) => a.name.localeCompare(b.name));
  }, [skills]);
const interviewStats = useMemo(() => [
    { name: 'Submitted', value: (interviews || []).filter((i: any) => i.reviewStatus === 'pending').length, color: '#f59e0b' },
    { name: 'Passed', value: (interviews || []).filter((i: any) => i.reviewStatus === 'pass').length, color: '#10b981' },
    { name: 'Failed', value: (interviews || []).filter((i: any) => i.reviewStatus === 'fail').length, color: '#ef4444' },
  ], [interviews]);

  const skillsData = useMemo(() => 
    sortedSkills.slice(0, 6).map((s: any) => ({ name: s.name, value: 1 })),
  [sortedSkills]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin dashboard"
        title="Platform control center"
        description="Review AI interview outcomes, maintain the skill library, and keep jobs and accounts tidy."
      />
<div className="grid gap-5 md:grid-cols-2">
  <div className="glass-panel p-6 space-y-4">
    <h2 className="text-xl font-semibold">Interview Results</h2>
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie data={interviewStats} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
          {interviewStats.map((entry, index) => (
            <Cell key={index} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
    <div className="flex gap-4 justify-center">
      {interviewStats.map((s) => (
        <div key={s.name} className="flex items-center gap-1 text-xs">
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: s.color }} />
          {s.name}: {s.value}
        </div>
      ))}
    </div>
  </div>

  <div className="glass-panel p-6 space-y-4">
    <h2 className="text-xl font-semibold">Skills Library</h2>
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={skillsData}>
        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
        <YAxis hide />
        <Tooltip />
        <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  </div>
</div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Interview queue" value={interviewsLoading ? <Skeleton className="h-10 w-24" /> : (interviews || []).length} caption="Items in the selected review state." />
        <StatCard label="Users" value={usersLoading ? <Skeleton className="h-10 w-24" /> : (users || []).length} caption="Accounts currently on the platform." />
        <StatCard label="Jobs" value={jobsLoading ? <Skeleton className="h-10 w-24" /> : (jobs || []).length} caption="Live and historical marketplace listings." />
        <StatCard label="Skills" value={skillsLoading ? <Skeleton className="h-10 w-24" /> : sortedSkills.length} caption="Interview tracks available to students." tone="brand" />
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">Interview review queue</h2>
            <p className="text-sm text-ink-500 dark:text-ink-300">Move through pending AI interview sessions with a clearer review surface.</p>
          </div>
          <div className="w-full max-w-xs">
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="SUBMITTED">Submitted</option>
              <option value="PASSED">Passed</option>
              <option value="FAILED">Failed</option>
            </Select>
          </div>
        </div>

        {interviewsLoading ? (
          <Skeleton className="h-44 w-full rounded-3xl" />
        ) : (interviews || []).length === 0 ? (
          <EmptyState title="No interviews found" description="Try another filter to review a different slice of the interview queue." />
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Student</TableHeaderCell>
                <TableHeaderCell>Skill</TableHeaderCell>
                <TableHeaderCell>AI result</TableHeaderCell>
                <TableHeaderCell>Review</TableHeaderCell>
                <TableHeaderCell>Action</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(interviews || []).map((interview: any) => (
                <TableRow key={interview.sessionId}>
                  <TableCell className="font-semibold">{interview.user?.name || '-'}</TableCell>
                  <TableCell>{interview.skillRef?.name || interview.skill}</TableCell>
                  <TableCell>
                    <Badge variant={interview.finalRecommendation === 'pass' ? 'success' : interview.finalRecommendation === 'fail' ? 'danger' : 'warning'}>
                      {interview.finalRecommendation || 'needs_review'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={interview.reviewStatus === 'pass' ? 'success' : interview.reviewStatus === 'fail' ? 'danger' : 'warning'}>
                      {interview.reviewStatus || 'pending'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button size="sm" onClick={() => navigate(`/admin/review-interview/${interview.sessionId}`)}>
                      Review
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Skill library</h2>
          <div className="glass-panel space-y-4 p-6">
            <Input placeholder="Skill name" value={skillName} onChange={(e) => setSkillName(e.target.value)} />
            <Input placeholder="Description" value={skillDescription} onChange={(e) => setSkillDescription(e.target.value)} />
            <Button
              onClick={() => createSkillMutation.mutate({ name: skillName, description: skillDescription })}
              disabled={createSkillMutation.isPending}
            >
              {createSkillMutation.isPending ? 'Adding...' : 'Add skill'}
            </Button>
          </div>
         <div className="flex flex-wrap gap-2">
  {sortedSkills.map((skill: any) => (
    <div key={skill._id} className="flex items-center gap-1">
      <Badge variant="subtle">{skill.name}</Badge>
      <button
        type="button"
        onClick={() => deleteSkillMutation.mutate(skill._id)}
        className="text-xs text-rose-500 hover:text-rose-700"
        disabled={deleteSkillMutation.isPending}
      >
        ✕
      </button>
    </div>
  ))}
</div>
        </div>
        <div className="space-y-5">
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Users</h2>
            {usersLoading ? (
              <Skeleton className="h-44 w-full rounded-3xl" />
            ) : (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Name</TableHeaderCell>
                    <TableHeaderCell>Role</TableHeaderCell>
                    <TableHeaderCell>Email</TableHeaderCell>
                    <TableHeaderCell>Action</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(users || []).map((user: any) => (
                    <TableRow key={user._id}>
                      <TableCell className="font-semibold">{user.name}</TableCell>
                      <TableCell><Badge variant="subtle">{user.role}</Badge></TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => deleteUserMutation.mutate(user._id)}>
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Jobs</h2>
            {jobsLoading ? (
              <Skeleton className="h-44 w-full rounded-3xl" />
            ) : (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Title</TableHeaderCell>
                    <TableHeaderCell>Status</TableHeaderCell>
                    <TableHeaderCell>Employer</TableHeaderCell>
                    <TableHeaderCell>Action</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(jobs || []).map((job: any) => (
                    <TableRow key={job._id}>
                      <TableCell className="font-semibold">{job.title}</TableCell>
                      <TableCell><Badge variant="subtle">{job.status}</Badge></TableCell>
                      <TableCell>{job.employer?.name}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => deleteJobMutation.mutate(job._id)}>
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
