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

type PdfColor = [number, number, number];

const APP_BRAND_NAME = 'Shaghalny';
const PAGE_MARGIN = 16;
const FOOTER_HEIGHT = 12;
const CONTENT_WIDTH = 210 - PAGE_MARGIN * 2;
const CONTENT_BOTTOM_MARGIN = PAGE_MARGIN + FOOTER_HEIGHT;
const BODY_TEXT_COLOR: PdfColor = [31, 41, 55];
const MUTED_TEXT_COLOR: PdfColor = [107, 114, 128];
const BORDER_COLOR: PdfColor = [229, 231, 235];
const CARD_BACKGROUND: PdfColor = [249, 250, 251];
const PAGE_BACKGROUND: PdfColor = [255, 255, 255];
const BRAND_COLOR: PdfColor = [15, 23, 42];
const INFO_BADGE_BG: PdfColor = [239, 246, 255];
const INFO_BADGE_TEXT: PdfColor = [30, 64, 175];
const WARNING_BADGE_BG: PdfColor = [254, 249, 195];
const WARNING_BADGE_TEXT: PdfColor = [161, 98, 7];
const SUCCESS_BADGE_BG: PdfColor = [220, 252, 231];
const SUCCESS_BADGE_TEXT: PdfColor = [21, 128, 61];
const DANGER_BADGE_BG: PdfColor = [254, 226, 226];
const DANGER_BADGE_TEXT: PdfColor = [185, 28, 28];

const recommendationVariant = (value: string | null) => {
  if (value === 'pass') return 'success';
  if (value === 'fail') return 'danger';
  return 'warning';
};

const formatBadgeLabel = (value: string | null | undefined, fallback = 'Pending') => {
  if (!value) return fallback;

  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const getStatusColors = (value: string | null | undefined): { background: PdfColor; text: PdfColor } => {
  const normalized = value?.toLowerCase().replace(/\s+/g, '_');

  if (['pass', 'completed', 'approved'].includes(normalized ?? '')) {
    return { background: SUCCESS_BADGE_BG, text: SUCCESS_BADGE_TEXT };
  }

  if (['fail', 'failed', 'rejected'].includes(normalized ?? '')) {
    return { background: DANGER_BADGE_BG, text: DANGER_BADGE_TEXT };
  }

  if (['pending', 'needs_review', 'started', 'in_progress'].includes(normalized ?? '')) {
    return { background: WARNING_BADGE_BG, text: WARNING_BADGE_TEXT };
  }

  return { background: INFO_BADGE_BG, text: INFO_BADGE_TEXT };
};

export const InterviewResult: React.FC<InterviewResultProps> = ({ result }) => {
  const handleDownloadPDF = () => {
    const doc = new jsPDF({ format: 'a4', orientation: 'portrait', unit: 'mm' });
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    const CONTENT_LINE_HEIGHT = 4.2;
    const QUESTION_CARD_SPACING = 3;
    const CONTENT_LIMIT_Y = pageHeight - FOOTER_HEIGHT - 4;
    const generatedDate = new Date().toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    let cursorY = PAGE_MARGIN;

    const toLines = (text: string, width: number) => doc.splitTextToSize(text.trim(), width) as string[];
    const getTextHeight = (lines: string[], lineHeight: number) => lines.length * lineHeight;
    const getAvailableHeight = () => CONTENT_LIMIT_Y - cursorY;

    const drawTextLines = (
      lines: string[],
      x: number,
      y: number,
      options?: {
        fontSize?: number;
        fontStyle?: 'normal' | 'bold';
        color?: PdfColor;
        lineHeight?: number;
        align?: 'left' | 'right' | 'center';
      }
    ) => {
      const lineHeight = options?.lineHeight ?? CONTENT_LINE_HEIGHT;

      doc.setFont('helvetica', options?.fontStyle ?? 'normal');
      doc.setFontSize(options?.fontSize ?? 10);
      doc.setTextColor(...(options?.color ?? BODY_TEXT_COLOR));
      doc.text(lines, x, y, options?.align ? { align: options.align } : undefined);

      return y + getTextHeight(lines, lineHeight);
    };

    const getHeaderLayout = (compact = false) => {
      const titleY = compact ? 18 : 18;
      const titleLineHeight = compact ? 5 : 6;
      const skillLineHeight = compact ? 4 : 4.8;
      const descriptionLineHeight = 4;
      const skillLines = toLines(result.skill, compact ? CONTENT_WIDTH - 40 : CONTENT_WIDTH - 20);
      const descriptionLines = compact
        ? []
        : toLines('Structured verification summary generated from the current interview evaluation.', CONTENT_WIDTH);
      const skillY = titleY + titleLineHeight + (compact ? 2.5 : 3.5);
      const skillBottomY = skillY + getTextHeight(skillLines, skillLineHeight);
      const descriptionY = skillBottomY + (compact ? 0 : 4);
      const descriptionBottomY = compact
        ? skillBottomY
        : descriptionY + getTextHeight(descriptionLines, descriptionLineHeight);
      const dividerY = descriptionBottomY + (compact ? 4 : 5);

      return {
        compact,
        titleY,
        skillY,
        descriptionY,
        dividerY,
        skillLines,
        descriptionLines,
        titleLineHeight,
        skillLineHeight,
        descriptionLineHeight,
        startY: dividerY + 6,
      };
    };

    const drawHeader = (compact = false) => {
      const layout = getHeaderLayout(compact);

      doc.setFillColor(...PAGE_BACKGROUND);
      doc.rect(0, 0, pageWidth, layout.startY, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(compact ? 15 : 21);
      doc.setTextColor(...BRAND_COLOR);
      doc.text('SKILL VERIFICATION REPORT', PAGE_MARGIN, layout.titleY);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(compact ? 8.5 : 10);
      doc.setTextColor(...MUTED_TEXT_COLOR);
      doc.text(APP_BRAND_NAME, pageWidth - PAGE_MARGIN, compact ? 13 : 13, { align: 'right' });
      doc.text(`Generated ${generatedDate}`, pageWidth - PAGE_MARGIN, compact ? 17.5 : 18, { align: 'right' });

      drawTextLines(layout.skillLines, PAGE_MARGIN, layout.skillY, {
        fontSize: compact ? 10 : 13,
        fontStyle: 'bold',
        color: BODY_TEXT_COLOR,
        lineHeight: layout.skillLineHeight,
      });

      if (!compact) {
        drawTextLines(layout.descriptionLines, PAGE_MARGIN, layout.descriptionY, {
          fontSize: 9.5,
          fontStyle: 'normal',
          color: MUTED_TEXT_COLOR,
          lineHeight: layout.descriptionLineHeight,
        });
      }

      doc.setDrawColor(...BORDER_COLOR);
      doc.setLineWidth(0.35);
      doc.line(PAGE_MARGIN, layout.dividerY, pageWidth - PAGE_MARGIN, layout.dividerY);

      return layout.startY;
    };

    const drawFooter = (pageNumber: number, totalPages: number) => {
      const footerY = pageHeight - 7;

      doc.setDrawColor(...BORDER_COLOR);
      doc.setLineWidth(0.3);
      doc.line(PAGE_MARGIN, pageHeight - FOOTER_HEIGHT, pageWidth - PAGE_MARGIN, pageHeight - FOOTER_HEIGHT);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...MUTED_TEXT_COLOR);
      doc.text(`${APP_BRAND_NAME} • Skill Verification Report`, PAGE_MARGIN, footerY);
      doc.text(`Page ${pageNumber} of ${totalPages}`, pageWidth - PAGE_MARGIN, footerY, { align: 'right' });
    };

    const startNewPage = () => {
      doc.addPage();
      cursorY = drawHeader(true);
    };

    const ensureSpace = (requiredHeight: number) => {
      if (cursorY + requiredHeight <= CONTENT_LIMIT_Y) {
        return cursorY;
      }

      startNewPage();
      return cursorY;
    };

    const drawBadge = (
      label: string,
      x: number,
      currentY: number,
      kind: 'info' | 'success' | 'warning' | 'danger' | 'status' = 'info'
    ) => {
      const colors =
        kind === 'success'
          ? { background: SUCCESS_BADGE_BG, text: SUCCESS_BADGE_TEXT }
          : kind === 'warning'
            ? { background: WARNING_BADGE_BG, text: WARNING_BADGE_TEXT }
            : kind === 'danger'
              ? { background: DANGER_BADGE_BG, text: DANGER_BADGE_TEXT }
              : kind === 'status'
                ? getStatusColors(label)
                : { background: INFO_BADGE_BG, text: INFO_BADGE_TEXT };

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);

      const horizontalPadding = 4;
      const badgeHeight = 8;
      const badgeWidth = doc.getTextWidth(label) + horizontalPadding * 2;

      doc.setFillColor(...colors.background);
      doc.roundedRect(x, currentY, badgeWidth, badgeHeight, 3, 3, 'F');
      doc.setTextColor(...colors.text);
      doc.text(label, x + horizontalPadding, currentY + 5.3);

      return badgeWidth;
    };

    const drawLabeledBadge = (
      label: string,
      value: string,
      x: number,
      currentY: number,
      kind: 'info' | 'success' | 'warning' | 'danger' | 'status' = 'info'
    ) => {
      const colors =
        kind === 'success'
          ? { background: SUCCESS_BADGE_BG, text: SUCCESS_BADGE_TEXT }
          : kind === 'warning'
            ? { background: WARNING_BADGE_BG, text: WARNING_BADGE_TEXT }
            : kind === 'danger'
              ? { background: DANGER_BADGE_BG, text: DANGER_BADGE_TEXT }
              : kind === 'status'
                ? getStatusColors(value)
                : { background: INFO_BADGE_BG, text: INFO_BADGE_TEXT };

      const badgeHeight = 10;
      const labelPadding = 2.8;
      const valuePadding = 3.4;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      const labelWidth = doc.getTextWidth(label.toUpperCase()) + labelPadding * 2;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      const valueWidth = doc.getTextWidth(value) + valuePadding * 2;
      const totalWidth = labelWidth + valueWidth + 1.4;

      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(...BORDER_COLOR);
      doc.setLineWidth(0.25);
      doc.roundedRect(x, currentY, totalWidth, badgeHeight, 3, 3, 'FD');

      doc.setFillColor(255, 255, 255);
      doc.roundedRect(x + 1, currentY + 1, labelWidth - 1.3, badgeHeight - 2, 2.5, 2.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...MUTED_TEXT_COLOR);
      doc.text(label.toUpperCase(), x + labelPadding + 1, currentY + 6.4);

      const valueX = x + labelWidth + 0.6;
      doc.setFillColor(...colors.background);
      doc.roundedRect(valueX, currentY + 1, valueWidth, badgeHeight - 2, 2.5, 2.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...colors.text);
      doc.text(value, valueX + valuePadding, currentY + 6.7);

      return totalWidth;
    };

    const getBulletLines = (items: string[], width: number) => {
      const list = items.length ? items : ['None captured.'];

      return list.flatMap((item) => {
        const wrapped = doc.splitTextToSize(item, width - 4) as string[];
        return wrapped.map((line, lineIndex) => `${lineIndex === 0 ? '• ' : '  '}${line}`);
      });
    };

    const drawMetricCard = (label: string, value: string, x: number, y: number, width: number, height: number) => {
      const colors = getStatusColors(value);
      const valueLines = toLines(value, width - 8);

      doc.setFillColor(...colors.background);
      doc.setDrawColor(...BORDER_COLOR);
      doc.setLineWidth(0.35);
      doc.roundedRect(x, y, width, height, 4, 4, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(...MUTED_TEXT_COLOR);
      doc.text(label.toUpperCase(), x + 4, y + 6);

      drawTextLines(valueLines, x + 4, y + 12.5, {
        fontSize: 11,
        fontStyle: 'bold',
        color: colors.text,
        lineHeight: 4.4,
      });
    };

    const drawSummarySection = () => {
      const sectionTitleHeight = 4.5;
      const sectionGap = 4;
      const scoreCardWidth = 64;
      const metricGap = 4;
      const metricCardWidth = (CONTENT_WIDTH - scoreCardWidth - metricGap * 2) / 3;
      const scoreCardHeight = 34;
      const metricCardHeight = 24;
      const sectionHeight = sectionTitleHeight + sectionGap + scoreCardHeight + 4;

      ensureSpace(sectionHeight);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...BODY_TEXT_COLOR);
      doc.text('Overall Summary', PAGE_MARGIN, cursorY + sectionTitleHeight);

      const cardY = cursorY + sectionTitleHeight + sectionGap;

      doc.setFillColor(...CARD_BACKGROUND);
      doc.setDrawColor(...BORDER_COLOR);
      doc.setLineWidth(0.4);
      doc.roundedRect(PAGE_MARGIN, cardY, scoreCardWidth, scoreCardHeight, 4, 4, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(...MUTED_TEXT_COLOR);
      doc.text('FINAL SCORE', PAGE_MARGIN + 6, cardY + 7);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(26);
      doc.setTextColor(...BRAND_COLOR);
      doc.text(result.finalScore !== null ? String(result.finalScore) : '--', PAGE_MARGIN + 6, cardY + 20);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...MUTED_TEXT_COLOR);
      doc.text('/100', PAGE_MARGIN + 28, cardY + 20);

      const progressX = PAGE_MARGIN + 6;
      const progressY = cardY + 26;
      const progressWidth = scoreCardWidth - 12;
      const scoreValue = Math.max(0, Math.min(100, result.finalScore ?? 0));
      const progressFillWidth = result.finalScore !== null ? (progressWidth * scoreValue) / 100 : progressWidth * 0.35;
      const progressColors = getStatusColors(result.recommendation ?? result.status);

      doc.setFillColor(...BORDER_COLOR);
      doc.roundedRect(progressX, progressY, progressWidth, 3.5, 2, 2, 'F');
      doc.setFillColor(...progressColors.background);
      doc.roundedRect(progressX, progressY, progressFillWidth, 3.5, 2, 2, 'F');

      const metricsX = PAGE_MARGIN + scoreCardWidth + metricGap;
      drawMetricCard('Status', formatBadgeLabel(result.status), metricsX, cardY, metricCardWidth, metricCardHeight);
      drawMetricCard(
        'Recommendation',
        formatBadgeLabel(result.recommendation),
        metricsX + metricCardWidth + metricGap,
        cardY,
        metricCardWidth,
        metricCardHeight
      );
      drawMetricCard(
        'Admin Review',
        formatBadgeLabel(result.reviewStatus),
        metricsX + (metricCardWidth + metricGap) * 2,
        cardY,
        metricCardWidth,
        metricCardHeight
      );

      cursorY = cardY + scoreCardHeight + 4;
    };

    const buildQuestionLayout = (answer: InterviewResultResponse['answers'][number], index: number) => {
      const cardWidth = CONTENT_WIDTH;
      const cardPadding = 8;
      const innerWidth = cardWidth - cardPadding * 2;
      const questionTitle = `Question ${index + 1}: ${answer.question}`;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12.5);
      const titleLines = doc.splitTextToSize(questionTitle, innerWidth) as string[];

      const feedbackLines = toLines(answer.feedback?.trim() || 'Not provided.', innerWidth);
      const strengthsLines = getBulletLines(answer.strengths, innerWidth);
      const weaknessesLines = getBulletLines(answer.weaknesses, innerWidth);
      const paddingTop = 6;
      const paddingBottom = 6;
      const titleLineHeight = 4.8;
      const badgeHeight = 10;
      const afterTitleGap = 3;
      const afterBadgeGap = 4;
      const sectionGap = 3;
      const sectionLabelHeight = 4.2;
      const sectionTextGap = 3.2;
      const continuationHeight = 6;

      const sections = [
        { label: 'Feedback', lines: feedbackLines },
        { label: 'Strengths', lines: strengthsLines },
        { label: 'Weaknesses', lines: weaknessesLines },
      ];
      const headerHeight =
        getTextHeight(titleLines, titleLineHeight) +
        afterTitleGap +
        badgeHeight +
        afterBadgeGap;
      const contentHeight = sections.reduce((total, section, sectionIndex) => {
        const gap = sectionIndex > 0 ? sectionGap : 0;
        return total + gap + sectionLabelHeight + sectionTextGap + getTextHeight(section.lines, CONTENT_LINE_HEIGHT);
      }, 0);

      return {
        titleLines,
        scoreValue: `${answer.score ?? 'Pending'}`,
        recommendationValue: formatBadgeLabel(answer.recommendation),
        sections,
        innerWidth,
        paddingTop,
        paddingBottom,
        titleLineHeight,
        badgeHeight,
        afterTitleGap,
        afterBadgeGap,
        sectionGap,
        sectionLabelHeight,
        sectionTextGap,
        continuationHeight,
        totalHeight: paddingTop + headerHeight + contentHeight + paddingBottom,
      };
    };

    const drawQuestionCard = (answer: InterviewResultResponse['answers'][number], index: number) => {
      const layout = buildQuestionLayout(answer, index);
      const freshPageCapacity = CONTENT_LIMIT_Y - getHeaderLayout(true).startY;

      if (layout.totalHeight <= getAvailableHeight()) {
        // full card fits on current page
      } else if (layout.totalHeight <= freshPageCapacity && getAvailableHeight() < layout.totalHeight * 0.7) {
        startNewPage();
      }

      let sectionIndex = 0;
      let lineIndex = 0;
      let firstSegment = true;

      while (sectionIndex < layout.sections.length) {
        const headerHeight = firstSegment
          ? getTextHeight(layout.titleLines, layout.titleLineHeight) +
            layout.afterTitleGap +
            layout.badgeHeight +
            layout.afterBadgeGap
          : layout.continuationHeight;
        const minimumHeight =
          layout.paddingTop +
          headerHeight +
          layout.sectionLabelHeight +
          layout.sectionTextGap +
          CONTENT_LINE_HEIGHT +
          layout.paddingBottom;

        if (getAvailableHeight() < minimumHeight) {
          startNewPage();
        }

        const availableInnerHeight = getAvailableHeight() - layout.paddingTop - layout.paddingBottom - headerHeight;
        let usedInnerHeight = 0;
        const plannedSections: Array<{ label: string; lines: string[]; continued: boolean }> = [];

        while (sectionIndex < layout.sections.length) {
          const section = layout.sections[sectionIndex];
          const remainingLines = section.lines.slice(lineIndex);
          const gap = plannedSections.length > 0 ? layout.sectionGap : 0;
          const fixedHeight = gap + layout.sectionLabelHeight + layout.sectionTextGap;
          const remainingHeight = availableInnerHeight - usedInnerHeight - fixedHeight;

          if (remainingHeight < CONTENT_LINE_HEIGHT) {
            break;
          }

          const maxLines = Math.max(1, Math.floor(remainingHeight / CONTENT_LINE_HEIGHT));
          const linesToRender = remainingLines.slice(0, maxLines);

          plannedSections.push({
            label: section.label,
            lines: linesToRender,
            continued: lineIndex > 0,
          });

          usedInnerHeight += fixedHeight + getTextHeight(linesToRender, CONTENT_LINE_HEIGHT);

          if (linesToRender.length === remainingLines.length) {
            sectionIndex += 1;
            lineIndex = 0;
          } else {
            lineIndex += linesToRender.length;
            break;
          }
        }

        if (!plannedSections.length) {
          startNewPage();
          continue;
        }

        const cardHeight = layout.paddingTop + headerHeight + usedInnerHeight + layout.paddingBottom;
        const cardX = PAGE_MARGIN;
        const cardY = cursorY;
        const innerX = cardX + 8;
        let currentY = cardY + layout.paddingTop;

        doc.setFillColor(...CARD_BACKGROUND);
        doc.setDrawColor(...BORDER_COLOR);
        doc.setLineWidth(0.35);
        doc.roundedRect(cardX, cardY, CONTENT_WIDTH, cardHeight, 4, 4, 'FD');

        if (firstSegment) {
          currentY = drawTextLines(layout.titleLines, innerX, currentY, {
            fontSize: 12.5,
            fontStyle: 'bold',
            color: BRAND_COLOR,
            lineHeight: layout.titleLineHeight,
          });
          currentY += layout.afterTitleGap;

          const scoreWidth = drawLabeledBadge('Score', layout.scoreValue, innerX, currentY, 'info');
          drawLabeledBadge('Recommendation', layout.recommendationValue, innerX + scoreWidth + 4, currentY, 'status');
          currentY += layout.badgeHeight + layout.afterBadgeGap;
        } else {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9.5);
          doc.setTextColor(...MUTED_TEXT_COLOR);
          doc.text(`Question ${index + 1} (continued)`, innerX, currentY);
          currentY += layout.continuationHeight;
        }

        plannedSections.forEach((section, sectionOrder) => {
          if (sectionOrder > 0) {
            currentY += layout.sectionGap;
          }

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          doc.setTextColor(...BODY_TEXT_COLOR);
          doc.text(section.continued ? `${section.label} (continued)` : section.label, innerX, currentY);
          currentY += layout.sectionLabelHeight;

          currentY = drawTextLines(section.lines, innerX, currentY + layout.sectionTextGap, {
            fontSize: 10,
            fontStyle: 'normal',
            color: BODY_TEXT_COLOR,
            lineHeight: CONTENT_LINE_HEIGHT,
          });
        });

        cursorY = cardY + cardHeight + QUESTION_CARD_SPACING;
        firstSegment = false;
      }
    };

    const drawFinalDecisionBox = () => {
      const titleHeight = 4.5;
      const noteLines = toLines(
        'This report was generated based on the skill verification evaluation.',
        CONTENT_WIDTH - 10
      );
      const noteHeight = getTextHeight(noteLines, 3.8);
      const metricGap = 4;
      const metricWidth = (CONTENT_WIDTH - metricGap * 2) / 3;
      const metricHeight = 17;
      const boxHeight = 6 + titleHeight + 4 + metricHeight + 5 + noteHeight + 6;

      ensureSpace(boxHeight);

      const boxY = cursorY;

      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(...BORDER_COLOR);
      doc.setLineWidth(0.35);
      doc.roundedRect(PAGE_MARGIN, boxY, CONTENT_WIDTH, boxHeight, 4, 4, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...BRAND_COLOR);
      doc.text('Final Decision', PAGE_MARGIN + 5, boxY + 6 + titleHeight);

      const metricY = boxY + 6 + titleHeight + 4;
      drawMetricCard(
        'Final Score',
        result.finalScore !== null ? `${result.finalScore}/100` : 'Pending',
        PAGE_MARGIN + 5,
        metricY,
        metricWidth,
        metricHeight
      );
      drawMetricCard(
        'Recommendation',
        formatBadgeLabel(result.recommendation),
        PAGE_MARGIN + 5 + metricWidth + 4,
        metricY,
        metricWidth,
        metricHeight
      );
      drawMetricCard(
        'Admin Review',
        formatBadgeLabel(result.reviewStatus),
        PAGE_MARGIN + 5 + (metricWidth + 4) * 2,
        metricY,
        metricWidth,
        metricHeight
      );

      cursorY = drawTextLines(noteLines, PAGE_MARGIN + 5, metricY + metricHeight + 5, {
        fontSize: 8.5,
        fontStyle: 'normal',
        color: MUTED_TEXT_COLOR,
        lineHeight: 3.8,
      }) + 2;
    };

    cursorY = drawHeader(false);
    drawSummarySection();

    result.answers.forEach((answer, index) => {
      drawQuestionCard(answer, index);
    });

    drawFinalDecisionBox();

    const totalPages = doc.getNumberOfPages();

    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
      doc.setPage(pageNumber);
      drawFooter(pageNumber, totalPages);
    }

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
