import React from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import jsPDF from 'jspdf';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';

import type { InterviewResultResponse } from '../types/interview.types';

interface InterviewResultProps {
  result: InterviewResultResponse;
}

const recommendationVariant = (value: string | null) => {
  if (value === 'pass') return 'success';
  if (value === 'fail') return 'danger';
  return 'warning';
};

export const InterviewResult: React.FC<InterviewResultProps> = ({ result }) => {
  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    let y = 20;

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('SKILL VERIFICATION REPORT', 20, y);
    y += 15;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Skill: ${result.skill}`, 20, y); y += 8;
    doc.text(`Status: ${result.status}`, 20, y); y += 8;
    doc.text(`Final Score: ${result.finalScore ?? 'Pending'}`, 20, y); y += 8;
    doc.text(`Recommendation: ${result.recommendation || 'Pending'}`, 20, y); y += 8;
    doc.text(`Admin Review: ${result.reviewStatus}`, 20, y); y += 15;

    result.answers.forEach((answer, index) => {
      if (y > 250) { doc.addPage(); y = 20; }
      doc.setFont('helvetica', 'bold');
      doc.text(`Q${index + 1}: ${answer.question}`, 20, y, { maxWidth: 170 });
      y += 12;
      doc.setFont('helvetica', 'normal');
      doc.text(`Score: ${answer.score ?? 'Pending'}`, 20, y); y += 8;
      doc.text(`Recommendation: ${answer.recommendation}`, 20, y); y += 8;
      doc.text(`Feedback: ${answer.feedback}`, 20, y, { maxWidth: 170 }); y += 12;
      doc.text(`Strengths: ${answer.strengths.join(', ') || 'None'}`, 20, y, { maxWidth: 170 }); y += 12;
      doc.text(`Weaknesses: ${answer.weaknesses.join(', ') || 'None'}`, 20, y, { maxWidth: 170 }); y += 15;
    });

    doc.save(`${result.skill}-verification-report.pdf`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Interview result"
        title={`${result.skill} verification`}
        description="Your result summary combines the AI evaluation and any manual review outcome."
        actions={
  <div className="flex items-center gap-3">
    <Badge variant={recommendationVariant(result.recommendation)}>{result.recommendation || 'pending'}</Badge>
    <Button type="button" variant="outline" size="sm" onClick={handleDownloadPDF}>
      <Download size={16} />
      Download Report
    </Button>
  </div>
}
      />

      <div className="grid gap-4 md:grid-cols-3">
        {[
          ['Status', result.status],
          ['Final score', result.finalScore ?? 'Pending manual review'],
          ['Admin review', result.reviewStatus],
        ].map(([label, value]) => (
          <Card key={label}>
            <CardContent className="p-5">
              <p className="label-muted">{label}</p>
              <p className="mt-3 text-2xl font-semibold text-ink-900 dark:text-white">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-4">
        {result.answers.map((answer, index) => (
          <Card key={answer.answerId}>
            <CardContent className="space-y-5 p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-2xl font-semibold">Q{index + 1}. {answer.question}</h2>
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant={recommendationVariant(answer.recommendation)}>{answer.recommendation}</Badge>
                  <span className="text-sm text-ink-600 dark:text-ink-200">Score: {answer.score ?? 'Pending manual review'}</span>
                </div>
              </div>

              <div className="rounded-2xl border border-dashed border-ink-200 bg-ink-50/80 p-4 text-sm text-ink-700 dark:border-white/10 dark:bg-white/5 dark:text-ink-200">
                {answer.feedback}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-ink-900 dark:text-white">Strengths</p>
                  <ul className="space-y-2 text-sm text-ink-600 dark:text-ink-200">
                    {(answer.strengths.length ? answer.strengths : ['None captured.']).map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-ink-900 dark:text-white">Weaknesses</p>
                  <ul className="space-y-2 text-sm text-ink-600 dark:text-ink-200">
                    {(answer.weaknesses.length ? answer.weaknesses : ['None captured.']).map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold text-ink-900 dark:text-white">Transcript</p>
                <p className="rounded-2xl border border-dashed border-ink-200 bg-ink-50/80 p-4 text-sm text-ink-700 dark:border-white/10 dark:bg-white/5 dark:text-ink-200">
                  {answer.transcript || 'Transcript unavailable. Manual review may still be required.'}
                </p>
              </div>

              {answer.processingError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                  {answer.processingError}
                </div>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
