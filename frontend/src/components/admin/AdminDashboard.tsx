import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { MoreHorizontal, PlusCircle,  Trash2 } from 'lucide-react';
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
import { DayPicker } from 'react-day-picker';
import type { DateRange } from 'react-day-picker';
import 'react-day-picker/style.css';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/ui/stat-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow,
} from '@/components/ui/table';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.23, 1, 0.32, 1] as [number, number, number, number] } },
} as const;

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
const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const { data: interviews, isLoading: interviewsLoading } = useQuery({
    queryKey: ['admin', 'interviews', status],
    queryFn: () => getInterviews(status),
  });
  const { data: allInterviews, isLoading: allInterviewsLoading } = useQuery({
    queryKey: ['admin', 'interviews', 'ALL'],
    queryFn: () => getInterviews(),
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
  

const filteredInterviews = useMemo(() => {
  if (!allInterviews) return [];

  if (!dateRange?.from || !dateRange?.to) {
  return [];
}

const start = new Date(dateRange.from);
const end = new Date(dateRange.to);
  end.setHours(23, 59, 59, 999);

  return allInterviews.filter((i: any) => {
    const date = new Date(i.createdAt);

    return date >= start && date <= end;
  });
}, [allInterviews, dateRange]);
const filteredStats = useMemo(() => [
  { name: 'Submitted', value: filteredInterviews.filter((i: any) => i.reviewStatus === 'pending').length, color: '#f59e0b' },
  { name: 'Passed', value: filteredInterviews.filter((i: any) => i.reviewStatus === 'pass').length, color: '#10b981' },
  { name: 'Failed', value: filteredInterviews.filter((i: any) => i.reviewStatus === 'fail').length, color: '#ef4444' },
], [filteredInterviews]);
  const skillsData = useMemo(() => {
    if (!allInterviews) return sortedSkills.slice(0, 6).map((s: any) => ({ name: s.name, value: 1 }));
    const skillCount: Record<string, number> = {};
    filteredInterviews.forEach((i: any) => {
      const skillName = i.skillRef?.name || i.skill;
      if (skillName) skillCount[skillName] = (skillCount[skillName] || 0) + 1;
    });
    return Object.entries(skillCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value]) => ({ name, value }));
  }, [filteredInterviews, sortedSkills]);

  const passRate = useMemo(() => {
    if (!filteredInterviews.length) return 0;
    const passed = filteredInterviews.filter((i: any) => i.reviewStatus === 'pass').length;
    return Math.round((passed / filteredInterviews.length) * 100);
  }, [filteredInterviews]);

  const topSkills = useMemo(() => {
    if (!filteredInterviews) return [];

  const skillCount: Record<string, { total: number; passed: number }> = {};

  filteredInterviews.forEach((i: any) => {
      const skillName = i.skillRef?.name || i.skill;
      if (skillName) {
        if (!skillCount[skillName]) skillCount[skillName] = { total: 0, passed: 0 };
        skillCount[skillName].total++;
        if (i.reviewStatus === 'pass') skillCount[skillName].passed++;
      }
    });
    return Object.entries(skillCount)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 5)
      .map(([name, data]) => ({
        name,
        total: data.total,
        passRate: Math.round((data.passed / data.total) * 100),
      }));
  }, [filteredInterviews]);
  const hasSelectedRange =
  !!dateRange?.from &&
  !!dateRange?.to;
  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
  <PageHeader
    eyebrow="Admin dashboard"
    title="Platform control center"
    description="Review AI interview outcomes, maintain the skill library, and keep jobs and accounts tidy."
  />

  <div className="rounded-xl border p-3 bg-white dark:bg-ink-dark-surface">
  <DayPicker
    mode="range"
    selected={dateRange}
    onSelect={setDateRange}
  />
</div>
</div>
      <div className="grid gap-5 md:grid-cols-2">

        <div className="glass-panel p-6 space-y-4">
          <h2 className="text-xl font-semibold">Interview Results</h2>
        
  

          {allInterviewsLoading ? (
  <Skeleton className="h-[220px] w-full rounded-xl" />
) : !hasSelectedRange ? (
  <div className="flex flex-col items-center justify-center h-[220px] text-center gap-2">
    <div className="text-5xl">📅</div>
    <p className="text-sm font-medium text-ink-600 dark:text-ink-300">
      Select a date range to view analytics
    </p>
  </div>
) : filteredInterviews.length === 0 ? (
  <div className="flex flex-col items-center justify-center h-[220px] text-center gap-2">
    <div className="text-5xl">📅</div>
    <p className="text-sm font-medium text-ink-600 dark:text-ink-300">
      No interviews found in selected date range
    </p>
  </div>
) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={filteredStats}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={85}
                  innerRadius={40}
                >
                  {filteredStats.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any, name: any) => [value, name]} />
              </PieChart>
            </ResponsiveContainer>
          )}

          <div className="flex justify-center gap-6">
            {filteredStats.map((s) => (
              <div key={s.name} className="flex items-center gap-2 text-xs">
                <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                <span className="text-ink-500 dark:text-ink-400">{s.name}:</span>
                <span className="font-bold text-ink-900 dark:text-white">{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel p-6 space-y-4">
          <h2 className="text-xl font-semibold">Skills by Interviews</h2>
          {allInterviewsLoading ? (
  <Skeleton className="h-[220px] w-full rounded-xl" />
) : !hasSelectedRange ? (
  <div className="flex flex-col items-center justify-center h-[220px] text-center gap-2">
    <div className="text-5xl">📅</div>
    <p className="text-sm font-medium text-ink-600 dark:text-ink-300">
      Select a date range to view analytics
    </p>
  </div>
) : filteredInterviews.length === 0 ? (
  <div className="flex flex-col items-center justify-center h-[220px] text-center gap-2">
    <div className="text-5xl">📊</div>
    <p className="text-sm font-medium text-ink-600 dark:text-ink-300">
      No skills found in selected date range
    </p>
  </div>
) : (
  <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={[...skillsData].sort((a, b) => b.value - a.value)}
                margin={{ top: 4, right: 8, left: 8, bottom: 4 }}
              >
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide />
                <Tooltip formatter={(value: any) => [value, 'Interviews']} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={40}>
                  {[...skillsData].sort((a, b) => b.value - a.value).map((_entry, index) => {
                    const colors = ['#f87171', '#fb923c', '#fbbf24', '#34d399', '#60a5fa', '#a78bfa'];
                    return <Cell key={index} fill={colors[index % colors.length]} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
          {skillsData.length > 1 && (
            <div className="flex justify-between text-xs pt-1 border-t border-ink-100 dark:border-ink-800">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-green-500 inline-block" />
                <span className="text-ink-500">Most popular:</span>
                <span className="font-semibold text-ink-800 dark:text-white">
                  {skillsData[0].name} ({skillsData[0].value})
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-red-400 inline-block" />
                <span className="text-ink-500">Least:</span>
                <span className="font-semibold text-ink-800 dark:text-white">
                  {skillsData[skillsData.length - 1].name} ({skillsData[skillsData.length - 1].value})
                </span>
              </div>
            </div>
          )}
        </div>

      </div>
      {/* Analytics Stats */}
      <motion.div variants={fadeUp} className="grid gap-4 md:grid-cols-4">
        <div className="glass-panel p-5 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Total Interviews</p>
          <p className="text-3xl font-bold text-ink-900 dark:text-white">{(allInterviews || []).length}</p>
          <p className="text-xs text-ink-500">All time</p>
        </div>
        <div className="glass-panel p-5 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Pass Rate</p>
          <p className="text-3xl font-bold text-emerald-600">{passRate}%</p>
          <p className="text-xs text-ink-500">Selected period</p>
        </div>
        <div className="glass-panel p-5 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Passed</p>
          <p className="text-3xl font-bold text-emerald-600">{filteredStats[1].value}</p>
          <p className="text-xs text-ink-500">Selected period</p>
        </div>
        <div className="glass-panel p-5 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Failed</p>
          <p className="text-3xl font-bold text-rose-500">{filteredStats[2].value}</p>
          <p className="text-xs text-ink-500">Selected period</p>
        </div>
      </motion.div>

      {/* Top Skills */}
      <motion.div variants={fadeUp} className="glass-panel p-6 space-y-4">
        <h2 className="text-xl font-semibold">🏆 Top Skills</h2>
        <div className="space-y-3">
          {topSkills.map((skill, index) => (
            <div key={skill.name} className="flex items-center gap-4">
              <span className="text-xs font-bold text-ink-400 w-4">{index + 1}</span>
              <span className="text-sm font-semibold text-ink-900 dark:text-white w-32">{skill.name}</span>
              <div className="flex-1 h-2 bg-ink-100 dark:bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-500 rounded-full transition-all duration-500"
                  style={{ width: `${(skill.total / (topSkills[0]?.total || 1)) * 100}%` }}
                />
              </div>
              <span className="text-xs text-ink-500 w-16">{skill.total} interviews</span>
              <span className={`text-xs font-semibold w-16 ${skill.passRate >= 70 ? 'text-emerald-600' : skill.passRate >= 50 ? 'text-amber-500' : 'text-rose-500'}`}>
                {skill.passRate}% pass
              </span>
            </div>
          ))}
          {topSkills.length === 0 && <p className="text-sm text-ink-400">No data yet</p>}
        </div>
      </motion.div>
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
