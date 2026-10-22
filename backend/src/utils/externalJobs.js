// Normalizers for authorized public job feeds. Every imported field comes from the
// source record; unknown facts (pay, eligibility, employer accounts) stay unset.

const SOURCES = {
  Arbeitnow: {
    host: "www.arbeitnow.com", pathPrefix: "/jobs/", homepage: "https://www.arbeitnow.com",
    terms: "https://www.arbeitnow.com/blog/job-board-api",
  },
  Himalayas: {
    host: "himalayas.app", pathPrefix: "/companies/", homepage: "https://himalayas.app",
    terms: "https://himalayas.app/api",
  },
  Jobicy: {
    host: "jobicy.com", pathPrefix: "/jobs/", homepage: "https://jobicy.com",
    terms: "https://jobicy.com/jobs-rss-feed",
  },
  "Remote OK": {
    host: "remoteok.com", pathPrefix: "/remote-jobs/", homepage: "https://remoteok.com",
    terms: "https://remoteok.com/api",
  },
};
const SOURCE_NAMES = Object.keys(SOURCES);

// Legacy single-source exports (Arbeitnow).
const SOURCE_NAME = "Arbeitnow";
const SOURCE_HOST = SOURCES.Arbeitnow.host;

const JOB_CATEGORIES = ["Programming", "Design", "Business", "Engineering", "Media", "Translation", "Other"];

const decodeEntity = (entity) => {
  const named = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
  if (Object.hasOwn(named, entity)) return named[entity];
  if (!entity.startsWith("#")) return `&${entity};`;
  const code = entity[1]?.toLowerCase() === "x"
    ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
  return Number.isInteger(code) && code > 0 && code <= 0x10ffff
    ? String.fromCodePoint(code) : " ";
};

const plainText = (value) => String(value || "")
  .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
  .replace(/<[^>]*>/g, " ")
  .replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (_, entity) => decodeEntity(entity))
  .replace(/\s+/g, " ").trim();

const safeHttpsUrl = (value) => {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
    return url;
  } catch { return null; }
};

// The listing page must live on the named source's own host.
const isSourceUrl = (value, sourceName = SOURCE_NAME) => {
  const source = SOURCES[sourceName];
  const url = safeHttpsUrl(value);
  return Boolean(source && url && url.hostname.toLowerCase() === source.host
    && url.pathname.startsWith(source.pathPrefix));
};

// Apply links may point at an employer ATS, but must be plain HTTPS.
const isApplyUrl = (value) => Boolean(safeHttpsUrl(value));

// Do not relabel permanent/senior employment as freelance work.
const classifyJob = (title) => {
  if (/\b(freelanc\w*|freiberuf\w*)\b/i.test(title)) return "freelance";
  if (/\b(intern(?:ship)?s?|praktik\w*|werkstudent\w*|working student)\b/i.test(title)) return "internship";
  return null;
};

// Map the source's own employment-type labels. Only explicit labels count.
const classifyEmploymentType = (labels) => {
  const text = (Array.isArray(labels) ? labels : [labels]).map((v) => String(v || "")).join(" | ");
  if (/\b(freelanc\w*|freiberuf\w*|self-employed|auto-entrepreneur|indépendant|contractor|contract)\b/i.test(text)
    && !/\b(befristeter|fixed-term|unbefristeter|cdi|permanent)\b/i.test(text)) return "freelance";
  if (/\b(intern(ship)?|praktik\w*|werkstudent|working student|convention de stage|duales studium|dual studies|student)\b/i.test(text)) return "internship";
  return null;
};

const CATEGORY_RULES = [
  ["Translation", /\b(translat\w*|interpret(er|ing)|locali[sz]\w*|übersetz\w*|dolmetsch\w*|traduct\w*|linguist\w*|subtitl\w*)\b/i],
  ["Engineering", /\b(mechanical|electrical|civil|structural|chemical|hardware|manufactur\w*|maschinenbau|elektro\w*|bauingenieur\w*|construction|autocad|solidworks|cad|mechatroni\w*|stem expert)\b/i],
  ["Programming", /\b(software|developer|entwickler\w*|programm\w*|frontend|front-end|backend|back-end|full[- ]?stack|devops|data scien\w*|data engineer\w*|machine learning|ml|ai engineer|python|java(script)?|typescript|react|node|php|golang|qa|test automation|cyber\w*|security engineer|cloud|it[- ]support|sre|web dev\w*|mobile|ios|android|informati\w*)\b/i],
  ["Design", /\b(design\w*|ui|ux|graphic|illustrat\w*|figma|creative|art director|gestalt\w*)\b/i],
  ["Media", /\b(video|content|copywrit\w*|writer|writing|editor\w*|editorial|journalis\w*|social media|communications?|photograph\w*|media|podcast|redakt\w*|youtube)\b/i],
  ["Business", /\b(market\w*|sales|vertrieb|financ\w*|account\w*|business|hr|human resources|recruit\w*|operations|product manag\w*|project manag\w*|program manag\w*|consult\w*|legal|compliance|customer|support|analyst|controlling|einkauf|buchhalt\w*|steuer\w*|research)\b/i],
];

// Shaghalny taxonomy assigned from the listing title first, then the source's own
// category labels. This is a filing decision, not a claim made by the source.
const categorize = (title, ...sourceLabels) => {
  for (const text of [String(title || ""), sourceLabels.flat().filter(Boolean).map(String).join(" | ")]) {
    for (const [category, pattern] of CATEGORY_RULES) if (pattern.test(text)) return category;
  }
  return "Other";
};

const formatCompensation = (min, max, currency, period) => {
  const lo = Number(min); const hi = Number(max);
  const hasLo = Number.isFinite(lo) && lo > 0; const hasHi = Number.isFinite(hi) && hi > 0;
  if (!hasLo && !hasHi) return undefined;
  const fmt = (n) => n.toLocaleString("en-US");
  const range = hasLo && hasHi && lo !== hi ? `${fmt(lo)}–${fmt(hi)}` : fmt(hasLo ? lo : hi);
  const unit = { annual: "per year", yearly: "per year", year: "per year", monthly: "per month", month: "per month",
    hourly: "per hour", hour: "per hour", weekly: "per week", daily: "per day" }[String(period || "").toLowerCase()];
  return [String(currency || "").trim(), range, unit].filter(Boolean).join(" ").slice(0, 120);
};

const validDate = (value, fetchedAt) => {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) && date <= fetchedAt ? date : null;
};

const finalize = (base, fetchedAt) => {
  const title = plainText(base.title).slice(0, 240);
  const company = plainText(base.sourceCompanyName).slice(0, 240);
  if (!title || !company || !base.type || !base.sourcePublishedAt) return null;
  // Employers sometimes publish placeholder postings such as "TEST ...".
  if (/^\s*\[?test\b/i.test(title)) return null;
  if (!isSourceUrl(base.sourceUrl, base.sourceName)) return null;
  if (base.sourceApplyUrl && !isApplyUrl(base.sourceApplyUrl)) return null;
  const job = {
    title,
    description: plainText(base.description).slice(0, 1800) || "Read the full requirements at the original listing.",
    type: base.type,
    category: base.category,
    workMode: base.remote === true ? "online" : undefined,
    sourceType: "external",
    sourceName: base.sourceName,
    sourceId: String(base.sourceId).slice(0, 300),
    sourceUrl: base.sourceUrl,
    sourceCompanyName: company,
    sourceLocation: plainText(base.sourceLocation).slice(0, 240) || "See original listing",
    sourceTags: (base.sourceTags || []).map(plainText).filter(Boolean).slice(0, 20),
    sourceEmploymentType: plainText(base.sourceEmploymentType).slice(0, 120) || undefined,
    sourcePublishedAt: base.sourcePublishedAt,
    sourceLastSeenAt: fetchedAt,
    status: "open",
    // Unknown pay is deliberately left unset. Never invent amounts or convert currencies.
  };
  if (base.sourceApplyUrl) job.sourceApplyUrl = base.sourceApplyUrl;
  if (base.sourceCompensation) job.sourceCompensation = base.sourceCompensation;
  if (base.sourceExpiresAt) job.sourceExpiresAt = base.sourceExpiresAt;
  for (const key of Object.keys(job)) if (job[key] === undefined) delete job[key];
  return job;
};

const normalizeArbeitnow = (record, fetchedAt = new Date()) => {
  const title = plainText(record?.title);
  const type = classifyJob(title) || classifyEmploymentType(record?.job_types);
  const tags = Array.isArray(record?.tags) ? record.tags : [];
  return finalize({
    title, type, sourceName: "Arbeitnow", sourceId: record?.slug, sourceUrl: record?.url,
    sourceCompanyName: record?.company_name, description: record?.description,
    sourceLocation: record?.location, sourceTags: tags, remote: record?.remote === true,
    sourceEmploymentType: Array.isArray(record?.job_types) ? record.job_types.join(", ") : undefined,
    sourcePublishedAt: validDate(Number(record?.created_at) * 1000, fetchedAt),
    category: categorize(title, tags),
  }, fetchedAt);
};

const normalizeHimalayas = (record, fetchedAt = new Date()) => {
  const title = plainText(record?.title);
  const type = classifyEmploymentType(record?.employmentType);
  const expires = new Date(Number(record?.expiryDate) * 1000);
  if (Number.isFinite(expires.getTime()) && expires <= fetchedAt) return null;
  const locations = Array.isArray(record?.locationRestrictions) ? record.locationRestrictions : [];
  return finalize({
    title, type, sourceName: "Himalayas", sourceId: record?.guid, sourceUrl: record?.guid,
    sourceApplyUrl: record?.applicationLink, sourceCompanyName: record?.companyName,
    description: record?.description || record?.excerpt,
    sourceLocation: locations.length ? `Remote · ${locations.map(plainText).join(", ")}` : "Remote · see listing for eligibility",
    sourceTags: [...(record?.parentCategories || []), ...(record?.categories || []).map((c) => String(c).replace(/-/g, " "))],
    remote: true, sourceEmploymentType: record?.employmentType,
    sourceCompensation: formatCompensation(record?.minSalary, record?.maxSalary, record?.currency, record?.salaryPeriod),
    sourcePublishedAt: validDate(Number(record?.pubDate) * 1000, fetchedAt),
    sourceExpiresAt: Number.isFinite(expires.getTime()) ? expires : undefined,
    category: categorize(title, record?.parentCategories, record?.categories),
  }, fetchedAt);
};

const normalizeJobicy = (record, fetchedAt = new Date()) => {
  const title = plainText(record?.jobTitle);
  const type = classifyEmploymentType(record?.jobType);
  const industries = [].concat(record?.jobIndustry || []).map(plainText);
  return finalize({
    title, type, sourceName: "Jobicy", sourceId: record?.id, sourceUrl: record?.url,
    sourceCompanyName: record?.companyName, description: record?.jobDescription || record?.jobExcerpt,
    sourceLocation: record?.jobGeo ? `Remote · ${plainText(record.jobGeo)}` : undefined,
    sourceTags: industries, remote: true, sourceEmploymentType: [].concat(record?.jobType || []).join(", "),
    sourceCompensation: formatCompensation(record?.salaryMin, record?.salaryMax, record?.salaryCurrency, record?.salaryPeriod),
    sourcePublishedAt: validDate(record?.pubDate, fetchedAt),
    category: categorize(title, industries),
  }, fetchedAt);
};

const normalizeRemoteOk = (record, fetchedAt = new Date()) => {
  const title = plainText(record?.position);
  // Remote OK tags are broad marketing tags; only the title decides the type.
  const type = classifyJob(title) || classifyEmploymentType(title);
  const url = String(record?.url || "").replace(/^https:\/\/remoteOK\.com\//, "https://remoteok.com/");
  const tags = Array.isArray(record?.tags) ? record.tags : [];
  return finalize({
    title, type, sourceName: "Remote OK", sourceId: record?.id, sourceUrl: url,
    sourceCompanyName: record?.company, description: record?.description,
    sourceLocation: record?.location ? `Remote · ${plainText(record.location)}` : undefined,
    sourceTags: tags, remote: true,
    sourcePublishedAt: validDate(record?.date, fetchedAt),
    category: categorize(title),
  }, fetchedAt);
};

const NORMALIZERS = {
  Arbeitnow: normalizeArbeitnow,
  Himalayas: normalizeHimalayas,
  Jobicy: normalizeJobicy,
  "Remote OK": normalizeRemoteOk,
};

const dedupeKey = (job) => `${plainText(job.sourceCompanyName).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()}|${plainText(job.title).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()}`;

// Keeps the first occurrence per source ID, listing URL and (company, title).
const dedupeJobs = (jobs) => {
  const seen = new Set(); const kept = []; const dropped = [];
  for (const job of jobs) {
    const keys = [`${job.sourceName}#${job.sourceId}`, `url#${job.sourceUrl.toLowerCase()}`, `ct#${dedupeKey(job)}`];
    if (keys.some((k) => seen.has(k))) { dropped.push(job); continue; }
    keys.forEach((k) => seen.add(k)); kept.push(job);
  }
  return { kept, dropped };
};

module.exports = {
  SOURCES, SOURCE_NAMES, SOURCE_NAME, SOURCE_HOST, JOB_CATEGORIES, NORMALIZERS,
  plainText, isSourceUrl, isApplyUrl, classifyJob, classifyEmploymentType, categorize, formatCompensation,
  normalizeExternalJob: normalizeArbeitnow, normalizeArbeitnow, normalizeHimalayas, normalizeJobicy, normalizeRemoteOk,
  dedupeJobs,
};
