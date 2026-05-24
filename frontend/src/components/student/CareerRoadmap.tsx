import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  BriefcaseBusiness,
  Compass,
  Lightbulb,
  Rocket,
  Sparkles,
  Target,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { API_BASE_URL } from '@/utils/constants';

type RoadmapBlock = {
  heading?: string;
  items: string[];
};

type RoadmapSection = {
  title: string;
  blocks: RoadmapBlock[];
};

type RoadmapContent = {
  heroTitle: string;
  sections: RoadmapSection[];
};

const cleanLine = (line: string) =>
  line
    .replace(/^[\s•*\-–—]+/, '')
    .replace(/^\d+\)\s*/, '')
    .replace(/^\d+\.\s*/, '')
    .trim();

const parseBlocks = (body: string): RoadmapBlock[] => {
  const lines = body
    .split('\n')
    .map((line) => cleanLine(line))
    .filter(Boolean);

  const blocks: RoadmapBlock[] = [];
  let current: RoadmapBlock | null = null;

  for (const line of lines) {
    if (/^or$/i.test(line)) {
      continue;
    }

    if (/:$/.test(line) && line.length < 90) {
      if (current && (current.heading || current.items.length > 0)) {
        blocks.push(current);
      }
      current = {
        heading: line.replace(/:$/, ''),
        items: [],
      };
      continue;
    }

    if (!current) {
      current = { items: [] };
    }

    current.items.push(line);
  }

  if (current && (current.heading || current.items.length > 0)) {
    blocks.push(current);
  }

  return blocks;
};

const parseRoadmap = (roadmap: string): RoadmapContent | null => {
  const normalized = roadmap.replace(/\r\n/g, '\n').trim();
  if (!normalized) return null;

  const sectionRegex = /(?:^|\n)(\d+)\.\s+([^\n]+)\n?([\s\S]*?)(?=(?:\n\d+\.\s+)|$)/g;
  const matches = Array.from(normalized.matchAll(sectionRegex));

  let heroTitle = 'Your personalized roadmap';
  let body = normalized;

  if (matches.length > 0) {
    const firstSectionIndex = normalized.search(/\n?\d+\.\s+/);
    const intro = normalized.slice(0, firstSectionIndex).trim();
    if (intro) {
      heroTitle = intro.split('\n')[0].trim();
    }
  } else {
    const lines = normalized.split('\n').filter(Boolean);
    if (lines.length > 0) {
      heroTitle = lines[0];
      body = lines.slice(1).join('\n').trim();
    }
  }

  const sections =
    matches.length > 0
      ? matches.map(([, , title, content]) => ({
          title: cleanLine(title),
          blocks: parseBlocks(content),
        }))
      : [
          {
            title: 'Roadmap',
            blocks: parseBlocks(body || normalized),
          },
        ];

  return {
    heroTitle,
    sections,
  };
};

const getSectionMeta = (title: string) => {
  const normalized = title.toLowerCase();

  if (normalized.includes('skill')) {
    return {
      icon: Target,
      badge: 'Core skills',
      tone: 'brand' as const,
    };
  }

  if (normalized.includes('learning') || normalized.includes('plan')) {
    return {
      icon: BookOpen,
      badge: 'Study plan',
      tone: 'warning' as const,
    };
  }

  if (normalized.includes('project')) {
    return {
      icon: Rocket,
      badge: 'Portfolio',
      tone: 'success' as const,
    };
  }

  if (normalized.includes('job') || normalized.includes('freelance')) {
    return {
      icon: BriefcaseBusiness,
      badge: 'Getting hired',
      tone: 'success' as const,
    };
  }

  return {
    icon: Compass,
    badge: 'Roadmap step',
    tone: 'subtle' as const,
  };
};

const CareerRoadmap: React.FC = () => {
  const [goal, setGoal] = useState('');
  const [roadmap, setRoadmap] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const parsedRoadmap = useMemo(() => parseRoadmap(roadmap), [roadmap]);

  const generateRoadmap = async () => {
    if (!goal.trim()) return;
    setIsLoading(true);
    setRoadmap('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/ai/career-roadmap`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ goal }),
      });
      const data = await response.json();
      setRoadmap(data.roadmap || 'Could not generate roadmap.');
    } catch {
      setRoadmap('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="AI Career Assistant"
        title="Career Roadmap"
        description="Tell us your career goal and our AI will generate a personalized roadmap for you."
        actions={goal ? <Badge variant="brand">Goal: {goal}</Badge> : undefined}
      />

      <Card className="overflow-hidden p-0">
        <CardContent className="relative space-y-5 p-6 lg:p-8">
          <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-brand-50 via-transparent to-accent-50 dark:from-brand-900/20 dark:to-accent-900/10" />

          <div className="relative flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300">
              <Sparkles size={22} />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-semibold">Generate a focused roadmap</h2>
              <p className="max-w-2xl text-sm leading-6 text-ink-500 dark:text-ink-dark-muted">
                Use a specific role or niche like &quot;backend developer&quot;, &quot;UI/UX designer&quot;, or
                &quot;data analyst&quot; to get a stronger plan.
              </p>
            </div>
          </div>

          <div className="relative flex flex-col gap-3 lg:flex-row">
            <Input
              placeholder="e.g. I want to become a Backend Developer"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isLoading && goal.trim()) {
                  generateRoadmap();
                }
              }}
              disabled={isLoading}
              className="h-12 rounded-xl border-ink-200 bg-white/90 px-4 text-sm shadow-none dark:bg-ink-dark-surface"
            />

            <Button
              onClick={generateRoadmap}
              disabled={isLoading || !goal.trim()}
              size="xl"
              className="min-w-[160px] rounded-xl"
            >
              <Sparkles size={16} className={isLoading ? 'animate-pulse' : ''} />
              {isLoading ? 'Generating...' : 'Generate'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-5">
          <Card className="overflow-hidden border-0 bg-gradient-to-br from-brand-600 to-brand-700 p-0 text-white shadow-soft">
            <CardContent className="space-y-4 p-8">
              <div className="h-3 w-28 animate-pulse rounded-full bg-white/20" />
              <div className="h-8 w-2/3 animate-pulse rounded-full bg-white/15" />
              <div className="grid gap-3 md:grid-cols-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="h-20 animate-pulse rounded-2xl bg-white/10" />
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-5 xl:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Card key={index}>
                <CardContent className="space-y-4 p-6">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 animate-pulse rounded-2xl bg-muted" />
                    <div className="space-y-2">
                      <div className="h-4 w-28 animate-pulse rounded bg-muted" />
                      <div className="h-6 w-48 animate-pulse rounded bg-muted" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    {Array.from({ length: 4 }).map((__, itemIndex) => (
                      <div key={itemIndex} className="h-14 animate-pulse rounded-2xl bg-muted" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : parsedRoadmap ? (
        <div className="space-y-6">
          <Card className="feature-highlight border-0 p-0 shadow-soft">
            <CardContent className="grid gap-5 p-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.9fr)] lg:p-10">
              <div className="space-y-4">
                <Badge className="border-white/15 bg-white/10 text-white hover:bg-white/10" variant="default">
                  Personalized AI roadmap
                </Badge>
                <div className="space-y-3">
                  <h2 className="max-w-3xl text-2xl font-semibold leading-tight text-white sm:text-3xl">
                    {parsedRoadmap.heroTitle}
                  </h2>
                  <p className="max-w-2xl text-sm leading-6 text-white/78">
                    A structured plan built around your goal, with a learning path, portfolio suggestions, and
                    practical freelance steps.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/65">Goal</p>
                  <p className="mt-2 text-sm font-medium text-white">{goal}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/65">Sections</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{parsedRoadmap.sections.length}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/65">Focus</p>
                  <p className="mt-2 text-sm font-medium text-white">Skills, projects, and first-job readiness</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-5 xl:grid-cols-2">
            {parsedRoadmap.sections.map((section, index) => {
              const meta = getSectionMeta(section.title);
              const Icon = meta.icon;

              return (
                <Card key={section.title + index} className="interactive-card overflow-hidden border-ink-200/80 p-0">
                  <CardContent className="space-y-5 p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300">
                          <Icon size={22} />
                        </div>
                        <div className="space-y-2">
                          <Badge variant={meta.tone}>{meta.badge}</Badge>
                          <div className="space-y-1">
                            <h3 className="text-xl font-semibold">{section.title}</h3>
                            <p className="text-sm text-ink-500 dark:text-ink-dark-muted">
                              Step {String(index + 1).padStart(2, '0')}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink-100 text-ink-500 dark:bg-white/5 dark:text-ink-dark-muted sm:flex">
                        <span className="text-sm font-semibold">{index + 1}</span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {section.blocks.map((block, blockIndex) => (
                        <div key={`${section.title}-${blockIndex}`} className="space-y-3">
                          {block.heading ? (
                            <div className="flex items-center gap-2">
                              <Lightbulb size={15} className="text-brand-500" />
                              <h4 className="text-sm font-semibold text-ink-900 dark:text-ink-dark-text">
                                {block.heading}
                              </h4>
                            </div>
                          ) : null}

                          <div className="space-y-2">
                            {block.items.map((item, itemIndex) => (
                              <div
                                key={`${section.title}-${blockIndex}-${itemIndex}`}
                                className="muted-panel flex items-start gap-3 rounded-2xl px-4 py-3"
                              >
                                <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[11px] font-semibold text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
                                  {itemIndex + 1}
                                </div>
                                <p className="text-sm leading-6 text-ink-700 dark:text-ink-300">{item}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ) : (
        <EmptyState
          icon={Compass}
          title="No roadmap yet"
          description="Enter a career goal above and generate a roadmap to see a polished learning plan here."
        />
      )}
    </div>
  );
};

export default CareerRoadmap;
