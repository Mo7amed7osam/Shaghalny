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
          <div className="flex gap-3">
            <Input
              placeholder="e.g. I want to become a Backend Developer"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              disabled={isLoading}
            />
            <Button onClick={generateRoadmap} disabled={isLoading || !goal.trim()}>
              <Sparkles size={16} />
              {isLoading ? 'Generating...' : 'Generate'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {roadmap && (
        <Card>
          <CardContent className="p-6">
            <pre className="whitespace-pre-wrap text-sm text-ink-700 dark:text-ink-200 font-sans leading-7">
              {roadmap}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CareerRoadmap;