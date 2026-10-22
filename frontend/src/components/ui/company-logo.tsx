import React, { useMemo, useState } from 'react';

import { cn } from '@/lib/utils';

const knownCompanyDomains: Array<[RegExp, string]> = [
  [/amazon/i, 'amazon.com'],
  [/apple/i, 'apple.com'],
  [/vodafone/i, 'vodafone.com'],
  [/fawry/i, 'fawry.com'],
  [/talabat/i, 'talabat.com'],
  [/instabug/i, 'instabug.com'],
  [/microsoft/i, 'microsoft.com'],
  [/google/i, 'google.com'],
  [/meta|facebook/i, 'meta.com'],
  [/orange/i, 'orange.com'],
  [/swvl/i, 'swvl.com'],
  [/valeo/i, 'valeo.com'],
];

function companyFaviconUrl(domain: string) {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;
}

function normalizeLogoUrl(value: string) {
  if (!value.includes('logo.clearbit.com')) return value;

  try {
    const domain = new URL(value).pathname.replace(/^\/+/, '');
    return domain ? companyFaviconUrl(domain) : value;
  } catch {
    return value;
  }
}

export function getCompanyName(job: any) {
  return job?.employer?.name || job?.clientId?.name || job?.client?.name || job?.sourceCompanyName || job?.company || 'Client';
}

export function getCompanyLogoUrl(job: any) {
  const explicit =
    job?.employer?.companyLogoUrl ||
    job?.employer?.logoUrl ||
    job?.clientId?.companyLogoUrl ||
    job?.clientId?.logoUrl ||
    job?.client?.companyLogoUrl ||
    job?.client?.logoUrl ||
    job?.companyLogoUrl;

  if (explicit) return normalizeLogoUrl(explicit);

  const website = job?.employer?.website || job?.clientId?.website || job?.client?.website || job?.companyWebsite;
  if (website) {
    try {
      return companyFaviconUrl(new URL(website).hostname.replace(/^www\./, ''));
    } catch {
      return null;
    }
  }

  const name = getCompanyName(job);
  const match = knownCompanyDomains.find(([pattern]) => pattern.test(name));
  return match ? companyFaviconUrl(match[1]) : null;
}

export function isCompanyVerified(job: any) {
  return Boolean(
    job?.employer?.isVerified ||
    job?.employer?.verified ||
    job?.clientId?.isVerified ||
    job?.clientId?.verified ||
    job?.client?.isVerified ||
    job?.client?.verified ||
    job?.verifiedClient ||
    job?.clientVerified
  );
}

function initials(value?: string) {
  if (!value) return 'C';
  return value.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
}

interface CompanyLogoProps {
  job: any;
  className?: string;
}

export const CompanyLogo: React.FC<CompanyLogoProps> = ({ job, className }) => {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const name = getCompanyName(job);
  const src = useMemo(() => getCompanyLogoUrl(job), [job]);
  const canShowImage = src && src !== failedSrc;

  return (
    <span
      className={cn(
        'flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-ink-200 bg-white text-sm font-bold text-ink-700 shadow-soft dark:border-ink-dark-border dark:bg-white/[0.08] dark:text-white',
        className
      )}
      title={name}
      aria-label={`${name} logo`}
    >
      {canShowImage ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          className="h-full w-full object-contain p-1.5"
          onError={() => setFailedSrc(src)}
        />
      ) : (
        <span>{initials(name)}</span>
      )}
    </span>
  );
};
