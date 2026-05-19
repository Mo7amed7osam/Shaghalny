import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { MoreHorizontal, PlusCircle, Shield, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import {
  createSkill, deleteAdminJob, deleteAdminUser,
  deleteSkill, getAdminJobs, getAdminUsers, getInterviews, getSkills,
} from '@/services/api';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { Select } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/ui/stat-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow,
} from '@/components/ui/table';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.23, 1, 0.32, 1] } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};

function getInitials(name?: string) {
  if (!name) return '?';
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [status, setStatus] = useState('SUBMITTED');
  const [skillName, setSkillName] = useState('');
  const [skillDescription, setSkillDescription] = useState('');
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<{ id: string; name: string } | null>(null);
  const [confirmDeleteJob, setConfirmDeleteJob] = useState<{ id: string; title: string } | null>(null);
  const [confirmDeleteSkill, setConfirmDeleteSkill] = useState<{ id: string; name: string } | null>(null);

  const { data: interviews, isLoading: interviewsLoading } = useQuery({
    queryKey: ['admin', 'interviews', status],
    queryFn: () => getInterviews(status),
  });
  const { data: users, isLoading: usersLoading } = useQuery({ queryKey: ['admin', 'users'], queryFn: getAdminUsers });
  const { data: jobs, isLoading: jobsLoading } = useQuery({ queryKey: ['admin', 'jobs'], queryFn: getAdminJobs });
  const { data: skills, isLoading: skillsLoading } = useQuery({ queryKey: ['skills'], queryFn: getSkills });

  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => deleteAdminUser(id),
    onSuccess: () => { toast.success('User deleted.'); queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }); },
  });
  const deleteJobMutation = useMutation({
    mutationFn: (id: string) => deleteAdminJob(id),
    onSuccess: () => { toast.success('Job deleted.'); queryClient.invalidateQueries({ queryKey: ['admin', 'jobs'] }); },
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
    mutationFn: (id: string) => deleteSkill(id),
    onSuccess: () => { toast.success('Skill deleted.'); queryClient.invalidateQueries({ queryKey: ['skills'] }); },
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

      {/* Tabs */}
      <motion.div variants={fadeUp}>
        <Tabs defaultValue="interviews">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="interviews">Interviews</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="jobs">Jobs</TabsTrigger>
            <TabsTrigger value="skills">Skills</TabsTrigger>
          </TabsList>

          {/* Interviews tab */}
          <TabsContent value="interviews" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-ink-900 dark:text-white">Interview review queue</h2>
                <p className="text-sm text-ink-500 dark:text-ink-400">Review pending AI interview sessions.</p>
              </div>
              <div className="w-full max-w-[200px]">
                <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="SUBMITTED">Submitted</option>
                  <option value="PASSED">Passed</option>
                  <option value="FAILED">Failed</option>
                </Select>
              </div>
            </div>
            {interviewsLoading ? (
              <Skeleton className="h-44 w-full rounded-xl" />
            ) : (interviews || []).length === 0 ? (
              <EmptyState title="No interviews found" description="Try another filter to reveal more interviews." />
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
                  {(interviews || []).map((iv: any) => (
                    <TableRow key={iv.sessionId}>
                      <TableCell className="font-semibold">{iv.user?.name || '-'}</TableCell>
                      <TableCell>{iv.skillRef?.name || iv.skill}</TableCell>
                      <TableCell>
                        <Badge variant={iv.finalRecommendation === 'pass' ? 'success' : iv.finalRecommendation === 'fail' ? 'danger' : 'warning'}>
                          {iv.finalRecommendation || 'review'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={iv.reviewStatus === 'pass' ? 'success' : iv.reviewStatus === 'fail' ? 'danger' : 'warning'}>
                          {iv.reviewStatus || 'pending'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" onClick={() => navigate(`/admin/review-interview/${iv.sessionId}`)}>
                          Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          {/* Users tab */}
          <TabsContent value="users" className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-ink-900 dark:text-white">Users</h2>
              <p className="text-sm text-ink-500 dark:text-ink-400">All registered accounts on the platform.</p>
            </div>
            {usersLoading ? (
              <Skeleton className="h-44 w-full rounded-xl" />
            ) : (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Name</TableHeaderCell>
                    <TableHeaderCell>Role</TableHeaderCell>
                    <TableHeaderCell>Email</TableHeaderCell>
                    <TableHeaderCell className="w-12" />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(users || []).map((u: any) => (
                    <TableRow key={u._id}>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className="text-[10px]">{getInitials(u.name)}</AvatarFallback>
                          </Avatar>
                          <span className="font-semibold">{u.name}</span>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="subtle">{u.role}</Badge></TableCell>
                      <TableCell className="text-ink-500 dark:text-ink-400">{u.email}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreHorizontal size={14} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem destructive onClick={() => setConfirmDeleteUser({ id: u._id, name: u.name })}>
                              <Trash2 size={13} /> Delete user
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          {/* Jobs tab */}
          <TabsContent value="jobs" className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-ink-900 dark:text-white">Jobs</h2>
              <p className="text-sm text-ink-500 dark:text-ink-400">All marketplace listings.</p>
            </div>
            {jobsLoading ? (
              <Skeleton className="h-44 w-full rounded-xl" />
            ) : (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Title</TableHeaderCell>
                    <TableHeaderCell>Status</TableHeaderCell>
                    <TableHeaderCell>Employer</TableHeaderCell>
                    <TableHeaderCell className="w-12" />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(jobs || []).map((job: any) => (
                    <TableRow key={job._id}>
                      <TableCell className="font-semibold">{job.title}</TableCell>
                      <TableCell><Badge variant="subtle">{job.status}</Badge></TableCell>
                      <TableCell>{job.employer?.name || '-'}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreHorizontal size={14} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem destructive onClick={() => setConfirmDeleteJob({ id: job._id, title: job.title })}>
                              <Trash2 size={13} /> Delete job
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          {/* Skills tab */}
          <TabsContent value="skills" className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
              <Card>
                <CardHeader className="mb-0">
                  <CardTitle className="flex items-center gap-2">
                    <PlusCircle size={15} className="text-brand-500" />
                    Add skill track
                  </CardTitle>
                </CardHeader>
                <CardContent className="mt-4 space-y-3">
                  <Input
                    placeholder="Skill name (e.g. React)"
                    value={skillName}
                    onChange={(e) => setSkillName(e.target.value)}
                  />
                  <Input
                    placeholder="Short description"
                    value={skillDescription}
                    onChange={(e) => setSkillDescription(e.target.value)}
                  />
                  <Button
                    className="w-full"
                    onClick={() => createSkillMutation.mutate({ name: skillName, description: skillDescription })}
                    disabled={createSkillMutation.isPending || !skillName.trim()}
                  >
                    {createSkillMutation.isPending ? 'Adding...' : 'Add skill'}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="mb-0">
                  <CardTitle>Skill library ({sortedSkills.length})</CardTitle>
                </CardHeader>
                <CardContent className="mt-4">
                  {skillsLoading ? (
                    <Skeleton className="h-20 w-full rounded-lg" />
                  ) : sortedSkills.length === 0 ? (
                    <EmptyState title="No skills yet" description="Add the first skill track above." />
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {sortedSkills.map((skill: any) => (
                        <div key={skill._id} className="flex items-center gap-1">
                          <Badge variant="subtle">{skill.name}</Badge>
                          <button
                            onClick={() => setConfirmDeleteSkill({ id: skill._id, name: skill.name })}
                            className="flex h-5 w-5 items-center justify-center rounded text-ink-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
                            disabled={deleteSkillMutation.isPending}
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Delete user confirmation */}
      <AlertDialog open={!!confirmDeleteUser} onOpenChange={() => setConfirmDeleteUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{confirmDeleteUser?.name}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { deleteUserMutation.mutate(confirmDeleteUser!.id); setConfirmDeleteUser(null); }}
            >
              Delete user
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete job confirmation */}
      <AlertDialog open={!!confirmDeleteJob} onOpenChange={() => setConfirmDeleteJob(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete job</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{confirmDeleteJob?.title}</strong>? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { deleteJobMutation.mutate(confirmDeleteJob!.id); setConfirmDeleteJob(null); }}
            >
              Delete job
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete skill confirmation */}
      <AlertDialog open={!!confirmDeleteSkill} onOpenChange={() => setConfirmDeleteSkill(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove skill track</AlertDialogTitle>
            <AlertDialogDescription>
              Remove <strong>{confirmDeleteSkill?.name}</strong> from the skill library? Students will no longer be able to verify this skill.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { deleteSkillMutation.mutate(confirmDeleteSkill!.id); setConfirmDeleteSkill(null); }}
            >
              Remove skill
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminDashboard;
