import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';

const CareerRoadmap: React.FC = () => {
  const [goal, setGoal] = useState('');
  const [roadmap, setRoadmap] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const generateRoadmap = async () => {
    if (!goal.trim()) return;
    setIsLoading(true);
    setRoadmap('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/ai/career-roadmap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ goal })
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
      />

      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="e.g. I want to become a Backend Developer"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              disabled={isLoading}
            />
            
            <Button
  onClick={generateRoadmap}
  disabled={isLoading || !goal.trim()}
  className="min-w-[140px]"
>
              <Sparkles size={16} className={isLoading ? 'animate-pulse' : ''} />
              {isLoading ? 'Generating...' : 'Generate'}
            </Button>
          </div>
        </CardContent>
      </Card>
{isLoading && (
  <Card>
    <CardContent className="p-6">
      <div className="space-y-3 animate-pulse">
        <div className="h-4 w-1/3 rounded bg-muted"></div>
        <div className="h-3 w-full rounded bg-muted"></div>
        <div className="h-3 w-5/6 rounded bg-muted"></div>
        <div className="h-3 w-2/3 rounded bg-muted"></div>
      </div>
    </CardContent>
  </Card>
)}

{!isLoading && roadmap && (
  <div className="space-y-6">
    {roadmap.split(/\d+\.\s+/).filter(Boolean).map((section, index) => {
      const lines = section.split('\n').filter(Boolean);
      const title = lines[0];
      const content = lines.slice(1);

      return (
        <Card key={index} className="border shadow-sm">
          <CardContent className="p-6 space-y-4">
            <h2 className="text-xl font-bold text-primary">
              {title}
            </h2>

            <div className="space-y-2">
              {content.map((line, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 text-sm leading-6 text-ink-700 dark:text-ink-200"
                >
                  <span className="mt-1 text-primary">•</span>
                  <p className="break-words">
  {line.replace(/^- /, '')}
</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      );
    })}
  </div>
)}
    </div>
  );
};

export default CareerRoadmap;