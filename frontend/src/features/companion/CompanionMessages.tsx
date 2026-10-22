import React, { useState } from 'react';
import { toast } from 'sonner';
import {
  AlertTriangle, ArrowUpRight, BadgeCheck, Check, CheckCircle2, Copy, FileText, MapPin, PenLine, RotateCcw, Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { CompanionStrings } from './companionI18n';
import type { CompanionJobCard, CompanionMessage, CompanionPage, CvReview, ProposalDraft } from './types';

export interface CompanionCardHandlers {
  onViewApply: (card: CompanionJobCard) => void;
  onSelect: (card: CompanionJobCard) => void;
  onProposal: (card: CompanionJobCard) => void;
  onTailorCv: (card: CompanionJobCard) => void;
  onUseProposal: (card: CompanionJobCard | undefined, draft: ProposalDraft, text: string) => void;
  onOpenPage: (page: CompanionPage) => void;
  onRetry: (message: CompanionMessage) => void;
  selectedJobId: string | null;
}

async function copyText(text: string, t: CompanionStrings) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(t.copied);
  } catch {
    toast.error(t.copyFailed);
  }
}

function CopyButton({ text, t, label }: { text: string; t: CompanionStrings; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={async () => {
        await copyText(text, t);
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
    >
      {done ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
      {label || (done ? t.copied : t.copy)}
    </Button>
  );
}

// Minimal, safe formatting for model text: paragraphs, "-" lists and **bold**.
// Everything renders as React text nodes; no HTML and no links.
function inline(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : <React.Fragment key={i}>{part}</React.Fragment>
  );
}

export function RichText({ text }: { text: string }) {
  const blocks: React.ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  const flush = () => {
    if (!list) return;
    const Tag = list.ordered ? 'ol' : 'ul';
    blocks.push(
      <Tag key={blocks.length} className={cn('my-1 space-y-1 ps-5', list.ordered ? 'list-decimal' : 'list-disc')}>
        {list.items.map((item, i) => <li key={i} dir="auto">{inline(item)}</li>)}
      </Tag>
    );
    list = null;
  };
  text.split('\n').forEach((raw) => {
    const line = raw.trim();
    const bullet = line.match(/^[-*•]\s+(.*)$/);
    const numbered = line.match(/^\d+[.)]\s+(.*)$/);
    if (bullet || numbered) {
      const ordered = Boolean(numbered);
      if (!list || list.ordered !== ordered) {
        flush();
        list = { ordered, items: [] };
      }
      list.items.push((bullet || numbered)![1]);
      return;
    }
    flush();
    if (!line) return;
    const heading = line.match(/^#{1,4}\s+(.*)$/);
    blocks.push(
      <p key={blocks.length} dir="auto" className={cn('my-1 text-[13.5px] leading-6 text-inherit', heading && 'font-semibold')}>
        {inline(heading ? heading[1] : line)}
      </p>
    );
  });
  flush();
  return <div className="space-y-1">{blocks}</div>;
}

function budgetLabel(card: CompanionJobCard, t: CompanionStrings) {
  const b = card.budget;
  if (!b) return t.card.notPublished;
  if (b.unpaid) return t.card.unpaid;
  if (b.text) return b.text;
  const fmt = (n: number) => n.toLocaleString('en-EG');
  if (b.min != null && b.max != null) return b.min === b.max ? `${fmt(b.min)} ${b.currency}` : `${fmt(b.min)}–${fmt(b.max)} ${b.currency}`;
  if (b.min != null) return `${fmt(b.min)}+ ${b.currency}`;
  if (b.max != null) return `≤ ${fmt(b.max)} ${b.currency}`;
  return t.card.notPublished;
}

export function JobCardView({ card, t, handlers }: { card: CompanionJobCard; t: CompanionStrings; handlers: CompanionCardHandlers }) {
  const isExternal = card.sourceType === 'external';
  const reasons = card.reasons.map(t.reason).filter(Boolean);
  const cautions = card.cautions.map(t.caution).filter(Boolean);
  const selected = handlers.selectedJobId === card.id;
  const where = [card.workMode ? t.card[card.workMode] : null, card.location].filter(Boolean).join(' · ');
  const titleId = `shaghol-card-${card.id}`;

  return (
    <article
      aria-labelledby={titleId}
      className={cn(
        'rounded-xl border bg-white p-3 text-start shadow-soft dark:bg-white/[0.04]',
        selected ? 'border-brand-400 ring-1 ring-brand-400/40 dark:border-brand-500/60' : 'border-ink-200 dark:border-ink-dark-border'
      )}
    >
      <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
        <span className={cn('rounded-full px-2 py-0.5', isExternal ? 'bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300' : 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300')}>
          {isExternal ? `${t.card.external}${card.sourceName ? ` · ${card.sourceName}` : ''}` : t.card.internal}
        </span>
        {card.type && <span className="rounded-full bg-ink-100 px-2 py-0.5 text-ink-700 dark:bg-white/10 dark:text-ink-200">{t.card[card.type]}</span>}
        {card.alreadyApplied && <span className="rounded-full bg-accent-50 px-2 py-0.5 text-accent-700 dark:bg-accent-500/15 dark:text-accent-300">{t.card.applied}</span>}
      </div>
      <h4 id={titleId} className="mt-1.5 text-[14px] font-semibold leading-5 text-ink-900 [overflow-wrap:anywhere] dark:text-ink-dark-text">{card.title}</h4>
      {card.company && (
        <p className="mt-0.5 flex items-center gap-1 text-[12.5px] leading-5 text-ink-600 dark:text-ink-400">
          {card.company}
          {card.companyVerified && <BadgeCheck className="h-3.5 w-3.5 text-brand-600 dark:text-brand-300" aria-label={t.card.verifiedCompany} />}
        </p>
      )}
      <dl className="mt-2 grid gap-1 text-[12.5px] text-ink-700 dark:text-ink-300">
        <div className="flex items-start gap-1.5">
          <Wallet className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-400" aria-hidden />
          <dt className="sr-only">{t.card.budget}</dt>
          <dd className="[overflow-wrap:anywhere]">{budgetLabel(card, t)}</dd>
        </div>
        {where && (
          <div className="flex items-start gap-1.5">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-400" aria-hidden />
            <dt className="sr-only">{t.card.location}</dt>
            <dd className="[overflow-wrap:anywhere]">{where}</dd>
          </div>
        )}
      </dl>
      {card.requiredSkills.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1" aria-label="Skills">
          {card.requiredSkills.slice(0, 8).map((s) => (
            <li key={s.name} className={cn('inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px]', s.verified ? 'border-accent-200 bg-accent-50 text-accent-800 dark:border-accent-500/30 dark:bg-accent-500/10 dark:text-accent-300' : 'border-ink-200 text-ink-600 dark:border-ink-dark-border dark:text-ink-300')}>
              {s.verified && <CheckCircle2 className="h-3 w-3" aria-hidden />}
              {s.name}
            </li>
          ))}
        </ul>
      )}
      {reasons.length > 0 && (
        <div className="mt-2">
          <p className="text-[11px] font-bold uppercase tracking-wide text-accent-700 dark:text-accent-300">{t.card.why}</p>
          <ul className="mt-0.5 space-y-0.5 text-[12.5px] text-ink-700 dark:text-ink-300">
            {reasons.map((r) => <li key={r}>• {r}</li>)}
          </ul>
        </div>
      )}
      {cautions.length > 0 && (
        <div className="mt-2">
          <p className="text-[11px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">{t.card.watch}</p>
          <ul className="mt-0.5 space-y-0.5 text-[12.5px] text-ink-700 dark:text-ink-300">
            {cautions.map((c) => <li key={c} className="flex gap-1"><AlertTriangle className="mt-1 h-3 w-3 shrink-0 text-amber-600" aria-hidden />{c}</li>)}
          </ul>
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {isExternal ? (
          card.applyUrl && (
            <Button asChild size="sm">
              <a href={card.applyUrl} target="_blank" rel="noopener noreferrer nofollow" className="text-white hover:text-white" aria-label={`${t.card.openListing}: ${card.title}`}>
                {t.card.openListing}
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
              </a>
            </Button>
          )
        ) : (
          <Button size="sm" onClick={() => handlers.onViewApply(card)}>
            {card.canApply ? t.card.viewApply : t.card.viewJob}
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={() => handlers.onSelect(card)} aria-pressed={selected}>
          {selected ? t.card.selected : t.card.select}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => handlers.onProposal(card)}>
          <PenLine className="h-3.5 w-3.5" aria-hidden />
          {t.card.proposal}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => handlers.onTailorCv(card)}>
          <FileText className="h-3.5 w-3.5" aria-hidden />
          {t.card.tailorCv}
        </Button>
      </div>
      {isExternal && <p className="mt-2 text-[11.5px] leading-5 text-ink-500 dark:text-ink-400">{t.card.applyThere(card.sourceName || 'the original site')}</p>}
    </article>
  );
}

function CvReviewView({ review, t }: { review: CvReview; t: CompanionStrings }) {
  const improvements = review.rewrites
    .filter((r) => !review.example)
    .map((r) => `${r.section ? `${r.section}\n` : ''}${r.after}`)
    .join('\n\n');
  return (
    <section className="space-y-3 rounded-xl border border-ink-200 bg-white p-3 text-[13px] dark:border-ink-dark-border dark:bg-white/[0.04]">
      {review.example && <p className="rounded-md bg-amber-50 px-2 py-1 text-[11.5px] font-semibold text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">{t.cv.exampleLabel}</p>}
      {review.summary && <div><h4 className="text-[12px] font-bold text-ink-900 dark:text-ink-dark-text">{t.cv.summary}</h4><p dir="auto" className="text-[13px] leading-6">{review.summary}</p></div>}
      {review.strengths.length > 0 && (
        <div>
          <h4 className="text-[12px] font-bold text-accent-700 dark:text-accent-300">{t.cv.strengths}</h4>
          <ul className="mt-1 list-disc space-y-0.5 ps-5">{review.strengths.map((s, i) => <li key={i} dir="auto">{s}</li>)}</ul>
        </div>
      )}
      {review.issues.length > 0 && (
        <div>
          <h4 className="text-[12px] font-bold text-amber-700 dark:text-amber-300">{t.cv.issues}</h4>
          <ul className="mt-1 list-disc space-y-0.5 ps-5">
            {review.issues.map((s, i) => <li key={i} dir="auto">{s.section && <strong>{s.section}: </strong>}{s.problem}</li>)}
          </ul>
        </div>
      )}
      {review.rewrites.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-[12px] font-bold text-ink-900 dark:text-ink-dark-text">{t.cv.rewrites}</h4>
          {review.rewrites.map((r, i) => (
            <div key={i} className="rounded-lg border border-ink-200 p-2 dark:border-ink-dark-border">
              <p className="text-[11.5px] font-semibold text-ink-600 dark:text-ink-300">
                {r.section}{review.example && ` · ${t.cv.exampleRewrite}`}
              </p>
              {r.before && (
                <div className="mt-1 rounded-md bg-rose-50/70 p-2 dark:bg-rose-500/10">
                  <p className="text-[10.5px] font-bold uppercase tracking-wide text-rose-700 dark:text-rose-300">{t.cv.before}</p>
                  <p dir="auto" className="whitespace-pre-wrap text-[12.5px] leading-5">{r.before}</p>
                </div>
              )}
              <div className="mt-1 rounded-md bg-accent-50/70 p-2 dark:bg-accent-500/10">
                <p className="text-[10.5px] font-bold uppercase tracking-wide text-accent-700 dark:text-accent-300">{t.cv.after}</p>
                <p dir="auto" className="whitespace-pre-wrap text-[12.5px] leading-5">{r.after}</p>
              </div>
              {r.note && <p className="mt-1 text-[11.5px] text-ink-500 dark:text-ink-400">{r.note}</p>}
              {!review.example && <div className="mt-1.5"><CopyButton text={r.after} t={t} /></div>}
            </div>
          ))}
        </div>
      )}
      {review.missingFacts.length > 0 && (
        <div>
          <h4 className="text-[12px] font-bold text-ink-900 dark:text-ink-dark-text">{t.cv.missingFacts}</h4>
          <ul className="mt-1 list-disc space-y-0.5 ps-5">{review.missingFacts.map((s, i) => <li key={i} dir="auto">{s}</li>)}</ul>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {improvements && <CopyButton text={improvements} t={t} label={t.cv.copyAll} />}
        <span className="text-[11.5px] text-ink-500 dark:text-ink-400">{t.cv.notSaved}</span>
      </div>
    </section>
  );
}

function ProposalView({ draft, card, t, handlers, messageId }: { draft: ProposalDraft; card?: CompanionJobCard; t: CompanionStrings; handlers: CompanionCardHandlers; messageId: string }) {
  const [text, setText] = useState(draft.text);
  const fieldId = `shaghol-proposal-${messageId}`;
  const hasPlaceholders = /\[[^\]]+\]/.test(text);
  return (
    <section className="space-y-2 rounded-xl border border-ink-200 bg-white p-3 dark:border-ink-dark-border dark:bg-white/[0.04]">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={fieldId} className="text-[12px] font-bold text-ink-900 dark:text-ink-dark-text">{t.proposal.title}</label>
        {card && <span className="truncate text-[11.5px] text-ink-500 dark:text-ink-400">{card.title}</span>}
      </div>
      {draft.example && <p className="rounded-md bg-amber-50 px-2 py-1 text-[11.5px] font-semibold text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">{t.proposal.exampleLabel}</p>}
      <textarea
        dir="auto"
        id={fieldId}
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={9}
        aria-label={t.proposal.editLabel}
        className="w-full resize-y rounded-lg border border-ink-200 bg-ink-50 p-2 text-[13px] leading-6 text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-ink-dark-border dark:bg-white/[0.04] dark:text-ink-dark-text"
      />
      {hasPlaceholders && <p className="text-[11.5px] text-amber-700 dark:text-amber-300">{t.proposal.placeholders}</p>}
      <div className="flex flex-wrap gap-1.5">
        <CopyButton text={text} t={t} />
        {card?.sourceType === 'internal' && card.canApply && (
          <Button size="sm" onClick={() => handlers.onUseProposal(card, draft, text)}>{t.proposal.useInApplication}</Button>
        )}
        {card?.sourceType === 'external' && card.applyUrl && (
          <Button asChild size="sm">
            <a href={card.applyUrl} target="_blank" rel="noopener noreferrer nofollow" className="text-white hover:text-white">
              {t.card.openListing}<ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            </a>
          </Button>
        )}
      </div>
      <p className="text-[11.5px] text-ink-500 dark:text-ink-400">
        {card?.sourceType === 'internal' && !card.canApply && !card.alreadyApplied ? t.proposal.cantApply : card?.sourceType === 'external' ? t.card.applyThere(card.sourceName || 'the original site') : t.proposal.notSent}
      </p>
    </section>
  );
}

export function MessageView({ message, t, handlers, isLast }: { message: CompanionMessage; t: CompanionStrings; handlers: CompanionCardHandlers; isLast: boolean }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <p dir="auto" className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-ee-md bg-brand-600 px-3 py-2 text-[13.5px] leading-6 text-white [overflow-wrap:anywhere]">{message.content}</p>
      </div>
    );
  }

  if (message.error) {
    return (
      <div role="alert" className="rounded-2xl rounded-ss-md border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
        <p className="text-inherit">{message.error.message}</p>
        {message.error.retryable && isLast && (
          <Button size="sm" variant="outline" className="mt-2" onClick={() => handlers.onRetry(message)}>
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />{t.retry}
          </Button>
        )}
      </div>
    );
  }

  const r = message.response;
  const proposalCard = r?.proposal ? r.cards.find((c) => c.id === r.proposal!.jobId) : undefined;
  const cards = r?.proposal ? r.cards.filter((c) => c.id !== r.proposal!.jobId) : r?.cards || [];

  return (
    <div className="space-y-2">
      {r?.mode === 'demo' && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11.5px] text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          <span className="font-bold">{t.demoBadge}</span>
          <span className="flex-1">{t.demoNotice[r.notice || 'not_configured']}</span>
          {isLast && message.request && (
            <Button size="sm" variant="outline" className="min-h-7 px-2" onClick={() => handlers.onRetry(message)}>
              <RotateCcw className="h-3 w-3" aria-hidden />{t.retry}
            </Button>
          )}
        </div>
      )}
      {message.content && (
        <div className="max-w-[95%] rounded-2xl rounded-ss-md bg-ink-100 px-3 py-2 text-ink-900 [overflow-wrap:anywhere] dark:bg-white/[0.07] dark:text-ink-dark-text">
          <RichText text={message.content} />
        </div>
      )}
      {r?.cvReview && <CvReviewView review={r.cvReview} t={t} />}
      {r?.proposal && <ProposalView draft={r.proposal} card={proposalCard} t={t} handlers={handlers} messageId={message.id} />}
      {cards.length > 0 && (
        <div className="space-y-2">
          {cards.map((card) => <JobCardView key={card.id} card={card} t={t} handlers={handlers} />)}
        </div>
      )}
      {r?.actions && r.actions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {r.actions.map((page) => (
            <Button key={page} size="sm" variant="soft" onClick={() => handlers.onOpenPage(page)}>
              {t.openPage} {t.pages[page]}
              <ArrowUpRight className="h-3.5 w-3.5 rtl:-scale-x-100" aria-hidden />
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
