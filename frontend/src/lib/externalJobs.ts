// Original listing pages must live on the named source's own host.
const SOURCE_HOSTS: Record<string, { host: string; pathPrefix: string }> = {
  Arbeitnow: { host: 'www.arbeitnow.com', pathPrefix: '/jobs/' },
  Himalayas: { host: 'himalayas.app', pathPrefix: '/companies/' },
  Jobicy: { host: 'jobicy.com', pathPrefix: '/jobs/' },
  'Remote OK': { host: 'remoteok.com', pathPrefix: '/remote-jobs/' },
};

const safeHttps = (value?: string) => {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && !url.port ? url : null;
  } catch { return null; }
};

type ExternalJob = { sourceType?: string; sourceName?: string; sourceUrl?: string; sourceApplyUrl?: string };

/** The listing page on the source site, used for attribution. */
export function getExternalJobUrl(job: ExternalJob): string | null {
  if (job?.sourceType !== 'external') return null;
  const source = SOURCE_HOSTS[job.sourceName || ''];
  const url = safeHttps(job.sourceUrl);
  return source && url && url.hostname === source.host && url.pathname.startsWith(source.pathPrefix) ? url.href : null;
}

/** Where applications go: the source-provided apply link, else the original listing. */
export function getExternalApplyUrl(job: ExternalJob): string | null {
  const listing = getExternalJobUrl(job);
  if (!listing) return null;
  return safeHttps(job.sourceApplyUrl)?.href || listing;
}
